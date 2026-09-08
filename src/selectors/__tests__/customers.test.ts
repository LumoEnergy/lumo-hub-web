import { describe, it, expect } from 'vitest';
import { loadPersona } from '../../fixtures';
import type { PersonaId } from '../../fixtures';
import { REWARD_GBP } from '../../state';
import {
  actionQueue,
  buildRows,
  dataQualityGroups,
  earningsSummary,
  gbp,
  moneyPosition,
  silentCohort,
  sortRows,
  unmatchedRows,
} from '../customers';

const TODAY = new Date('2026-09-08T00:00:00Z');

const rowsFor = (persona: PersonaId) => {
  const loaded = loadPersona(persona, TODAY);
  return buildRows(loaded.customers, loaded.asOf);
};

describe('the action queue', () => {
  const rows = rowsFor('messy-list');
  const groups = actionQueue(rows);

  it('shows the firm their own group first', () => {
    expect(groups[0].owner).toBe('installer');
  });

  it('sorts oldest blocker first within a group, because the oldest is nearly dead', () => {
    for (const group of groups) {
      const ages = group.rows.map((row) => row.resolved.ageDays);
      expect([...ages].sort((a, b) => b - a)).toEqual(ages);
    }
  });

  it('excludes anything nobody needs to act on', () => {
    for (const group of groups) {
      for (const row of group.rows) {
        expect(row.resolved.needsAttention, row.customer.id).toBe(true);
        expect(row.resolved.owner, row.customer.id).not.toBe('nobody');
      }
    }
  });

  it('never lists a household that is earning', () => {
    const queued = groups.flatMap((g) => g.rows);
    const earning = queued.filter(
      (row) => row.resolved.track === 'none' && row.customer.match !== null,
    );
    expect(earning).toEqual([]);
  });

  it('keeps unmatched households out of the queue, so they cannot hide in a group', () => {
    const queued = groups.flatMap((g) => g.rows.map((r) => r.customer.id));
    const unmatched = unmatchedRows(rows).map((r) => r.customer.id);
    expect(unmatched.length).toBeGreaterThan(0);
    for (const id of unmatched) {
      expect(queued).not.toContain(id);
    }
  });

  it('keeps data-quality rows out of the queue, because they are a batch job', () => {
    // Fifty missing addresses listed one at a time is wallpaper. They belong in the
    // aggregated callout with the money attached.
    const queued = groups.flatMap((g) => g.rows.map((r) => r.customer.contact));
    expect(queued).not.toContain('held_no_email');
    expect(queued).not.toContain('held_unconfirmed');
    expect(queued).not.toContain('bounced');
  });

  it('drops empty groups rather than rendering a heading with nothing under it', () => {
    for (const group of groups) {
      expect(group.rows.length).toBeGreaterThan(0);
    }
  });

  it('never queues a transient state a firm cannot influence', () => {
    const live = actionQueue(rowsFor('mid-campaign')).flatMap((g) => g.rows);
    const transient = live.filter(
      (row) =>
        row.customer.activation === 'Smart Control Test Running' ||
        row.customer.contact === 'sent' ||
        row.customer.contact === 'opened',
    );
    expect(transient).toEqual([]);
  });

  it('leaves the warm leads in the queue as named people', () => {
    // The one contact state that stays itemised. Twelve humans a firm would ring is
    // a call list; a number is not.
    const live = actionQueue(rowsFor('mid-campaign')).flatMap((g) => g.rows);
    const clicked = live.filter((row) => row.customer.contact === 'clicked');
    expect(clicked.length).toBeGreaterThan(9);
    for (const row of clicked) {
      expect(row.resolved.owner).toBe('installer');
    }
  });

  it('never queues the silent majority', () => {
    // The largest state in any campaign. If it ever enters the queue, the queue is
    // useless, so this is the assertion protecting the whole screen.
    const live = actionQueue(rowsFor('mid-campaign')).flatMap((g) => g.rows);
    expect(live.filter((row) => row.customer.contact === 'no_response')).toEqual([]);
  });
});

describe('the aggregated data-quality callouts', () => {
  const rows = rowsFor('messy-list');
  const groups = dataQualityGroups(rows);

  it('groups the three defects only a firm can resolve', () => {
    expect(groups.map((g) => g.contact)).toEqual([
      'held_no_email',
      'held_unconfirmed',
      'bounced',
    ]);
  });

  it('quotes the reward per household and never a multiplied total', () => {
    // 41 missing addresses is not "£2,050 we are losing" — that prices the fix at a
    // 100% conversion rate nobody will hit, and inventing money for an installer who
    // has not been paid yet is how this product loses its credibility. The per-
    // household rate is the only figure here that is true.
    for (const group of groups) {
      expect(group).not.toHaveProperty('atStakeGbp');
      const total = gbp(group.rows.length * REWARD_GBP);
      expect(group.argument, `${group.contact} states a fantasy total`).not.toContain(total);
    }
    const emails = groups.find((g) => g.contact === 'held_no_email');
    expect(emails!.argument).toContain(`£${REWARD_GBP}`);
  });

  it('makes an argument rather than issuing an instruction', () => {
    for (const group of groups) {
      expect(group.argument.length, group.contact).toBeGreaterThan(80);
    }
  });

  it('accounts for every affected row exactly once', () => {
    const counted = groups.flatMap((g) => g.rows.map((r) => r.customer.id));
    expect(new Set(counted).size).toBe(counted.length);
    const expected = rows.filter((row) =>
      ['held_no_email', 'held_unconfirmed', 'bounced'].includes(row.customer.contact),
    );
    expect(counted.length).toBe(expected.length);
  });

  it('drops a group with no rows rather than saying "0 bounced"', () => {
    const clean = dataQualityGroups(rowsFor('awaiting-approval'));
    expect(clean.map((g) => g.contact)).toEqual(['held_no_email', 'held_unconfirmed']);
  });
});

describe('the silent cohort', () => {
  it('counts the non-responders and puts no price on them', () => {
    const cohort = silentCohort(rowsFor('mid-campaign'));
    expect(cohort).not.toBeNull();
    expect(cohort!.count).toBeGreaterThan(80);
    // Same rule as the data-quality groups: 90 x £50 is not money anybody lost.
    expect(cohort).not.toHaveProperty('atStakeGbp');
  });

  it('is absent before anything has been sent', () => {
    expect(silentCohort(rowsFor('awaiting-approval'))).toBeNull();
  });
});

describe('table sorting', () => {
  const rows = rowsFor('mid-campaign');

  it('puts unmatched first, then anything needing the firm, by default', () => {
    const sorted = sortRows(rows, 'priority', 'desc');
    expect(sorted[0].resolved.track).toBe('match');
    const firstIgnorable = sorted.findIndex((row) => !row.resolved.needsAttention);
    const lastAttention = sorted.reduce(
      (last, row, i) => (row.resolved.needsAttention ? i : last),
      -1,
    );
    expect(firstIgnorable).toBeGreaterThan(lastAttention);
  });

  it('reverses exactly, even though the list has duplicate names', () => {
    // A two-hundred-row back book repeats names. Without a stable tiebreak the ties
    // keep their original order in both directions, so flipping the column shuffles
    // rows instead of reversing them.
    const asc = sortRows(rows, 'household', 'asc');
    const desc = sortRows(rows, 'household', 'desc');
    expect(asc.length).toBe(rows.length);
    expect(desc.length).toBe(rows.length);
    expect(asc.map((r) => r.customer.id)).toEqual([...desc].reverse().map((r) => r.customer.id));
  });

  it('sorts by age oldest first when descending', () => {
    const sorted = sortRows(rows, 'age', 'desc');
    const ages = sorted.map((row) => row.resolved.ageDays);
    expect([...ages].sort((a, b) => b - a)).toEqual(ages);
  });

  it('ranks money by how settled it is, not alphabetically', () => {
    const sorted = sortRows(rows, 'money', 'desc');
    expect(moneyPosition(sorted[0])).toBe('paid');
  });

  it('never mutates the array it was given', () => {
    const original = [...rows];
    sortRows(rows, 'age', 'asc');
    expect(rows).toEqual(original);
  });
});

describe('where the money actually stands', () => {
  it('never counts an unmatched household as confirmed, however long its clock has run', () => {
    const rows = rowsFor('messy-list');
    const unmatched = rows.filter((row) => row.customer.match === 'unmatched_different_email');
    expect(unmatched.length).toBeGreaterThan(0);
    for (const row of unmatched) {
      // Its earnings state IS confirmed: control is real and the 30 days have been
      // served. It is the attribution that is missing, so the money is not theirs.
      expect(row.resolved.earnings).toBe('confirmed');
      expect(moneyPosition(row)).toBe('blocked_by_match');
    }
  });

  it('keeps unmatched money out of the earned total and shows it separately', () => {
    const summary = earningsSummary(rowsFor('messy-list'));
    expect(summary.atStakeGbp).toBe(REWARD_GBP);
    expect(summary.blockedByMatch.length).toBe(1);
    for (const row of summary.blockedByMatch) {
      expect(summary.confirmed).not.toContain(row);
      expect(summary.paid).not.toContain(row);
    }
  });

  it('adds up the earned total from confirmed and paid only', () => {
    const summary = earningsSummary(rowsFor('mid-campaign'));
    expect(summary.earnedGbp).toBe(
      (summary.confirmed.length + summary.paid.length) * REWARD_GBP,
    );
    expect(summary.earnedGbp).toBe(summary.paidGbp + summary.awaitingPayoutGbp);
  });

  it('sorts the clock-running list by how close each one is', () => {
    const summary = earningsSummary(rowsFor('mid-campaign'));
    const remaining = summary.pending.map((row) => row.resolved.daysRemaining);
    expect([...remaining].sort((a, b) => a - b)).toEqual(remaining);
  });

  it('shows a lapsed clock rather than hiding it in "not started"', () => {
    const summary = earningsSummary(rowsFor('mid-campaign'));
    expect(summary.lapsed.length).toBeGreaterThan(0);
    for (const row of summary.lapsed) {
      expect(row.customer.qualification.everActive).toBe(true);
    }
    for (const row of summary.notStarted) {
      expect(row.customer.qualification.everActive).toBe(false);
    }
  });

  it('has at least one confirmed household whose control has since dropped', () => {
    // Without one, the screen would never have had to state the clawback rule.
    const summary = earningsSummary(rowsFor('mid-campaign'));
    const dropped = [...summary.confirmed, ...summary.paid].filter(
      (row) => row.resolved.confirmedButControlDropped,
    );
    expect(dropped.length).toBeGreaterThan(0);
  });

  it('shows no money at all before a campaign has sent', () => {
    const summary = earningsSummary(rowsFor('awaiting-approval'));
    expect(summary.earnedGbp).toBe(0);
    expect(summary.pendingGbp).toBe(0);
    expect(summary.atStakeGbp).toBe(0);
  });
});
