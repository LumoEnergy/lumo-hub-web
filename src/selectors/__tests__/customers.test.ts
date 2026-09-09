import { describe, it, expect } from 'vitest';
import { loadPersona } from '../../fixtures';
import type { PersonaId } from '../../fixtures';
import { REWARD_GBP } from '../../state';
import {
  buildRows,
  dataQualityGroups,
  earningsSummary,
  filterRows,
  gbp,
  moneyPosition,
  needsAttentionCount,
  needsYouIndividually,
  sortRows,
  unmatchedRows,
} from '../customers';

const TODAY = new Date('2026-09-08T00:00:00Z');

const rowsFor = (persona: PersonaId) => {
  const loaded = loadPersona(persona, TODAY);
  return buildRows(loaded.customers, loaded.asOf);
};

describe('what needs the firm, one household at a time', () => {
  const rows = rowsFor('messy-list');
  const queued = filterRows(rows, 'attention');

  it('excludes anything nobody needs to act on', () => {
    for (const row of queued) {
      expect(row.resolved.needsAttention, row.customer.id).toBe(true);
      expect(row.resolved.owner, row.customer.id).not.toBe('nobody');
    }
  });

  it('keeps unmatched households out, so they cannot hide among ordinary rows', () => {
    // They are pinned above the list as a money callout instead. A row that looks
    // like every other row has already failed at the one job that matters.
    const ids = queued.map((r) => r.customer.id);
    const unmatched = unmatchedRows(rows).map((r) => r.customer.id);
    expect(unmatched.length).toBeGreaterThan(0);
    for (const id of unmatched) {
      expect(ids).not.toContain(id);
    }
  });

  it('does include the missing addresses, because each needs a different answer', () => {
    // These used to be excluded on the grounds that fifty of them is a batch job.
    // True of the old card queue, false of a filtered table — and it made the count
    // say nobody needed you on an account whose only work was 50 missing addresses.
    const states = queued.map((r) => r.customer.contact);
    expect(states).toContain('held_no_email');
    expect(states).toContain('held_unconfirmed');
  });

  it('never includes a transient state a firm cannot influence', () => {
    const live = filterRows(rowsFor('mid-campaign'), 'attention');
    const transient = live.filter(
      (row) =>
        row.customer.activation === 'Smart Control Test Running' ||
        row.customer.contact === 'sent' ||
        row.customer.contact === 'opened',
    );
    expect(transient).toEqual([]);
  });

  it('leaves the warm leads in as named people', () => {
    // Twelve humans a firm would ring is a call list; a number is not.
    const live = filterRows(rowsFor('mid-campaign'), 'attention');
    const clicked = live.filter((row) => row.customer.contact === 'clicked');
    expect(clicked.length).toBeGreaterThan(9);
    for (const row of clicked) {
      expect(row.resolved.owner).toBe('installer');
    }
  });

  it('never includes the silent majority', () => {
    // The largest state in any campaign. If it ever enters this set, the filter is
    // useless, so this is the assertion protecting the whole screen.
    const live = filterRows(rowsFor('mid-campaign'), 'attention');
    expect(live.filter((row) => row.customer.contact === 'no_response')).toEqual([]);
  });

  it('never asks for the same list-wide sign-off once per household', () => {
    // 118 rows all saying "approve the email" is one click described 118 times.
    const kestrel = rowsFor('awaiting-approval');
    const awaiting = kestrel.filter((row) => row.customer.contact === 'awaiting_approval');
    expect(awaiting.length).toBeGreaterThan(100);
    expect(awaiting.every((row) => !needsYouIndividually(row))).toBe(true);
  });

  it('counts exactly what the filter shows, because one links to the other', () => {
    // The dashboard states a number and links straight to this filter. Two different
    // answers a click apart is the screen contradicting itself.
    for (const persona of ['mid-campaign', 'awaiting-approval', 'messy-list'] as const) {
      const all = rowsFor(persona);
      expect(needsAttentionCount(all), persona).toBe(filterRows(all, 'attention').length);
    }
  });
});

describe('the data-quality arguments', () => {
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

describe('table sorting', () => {
  const rows = rowsFor('mid-campaign');

  it('puts unmatched first, then anything needing the firm, by default', () => {
    const sorted = sortRows(rows, 'priority', 'desc');
    expect(sorted[0].resolved.track).toBe('match');

    // Three blocks, in order: unmatched, then everything needing the firm, then the
    // rest. Unmatched is deliberately not part of `needsYouIndividually` — it is a
    // money callout rather than a task — so the block boundary is measured after
    // those rows rather than by that predicate.
    const afterUnmatched = sorted.filter((row) => row.resolved.track !== 'match');
    const firstIgnorable = afterUnmatched.findIndex((row) => !needsYouIndividually(row));
    const lastAttention = afterUnmatched.reduce(
      (last, row, i) => (needsYouIndividually(row) ? i : last),
      -1,
    );
    expect(firstIgnorable).toBeGreaterThan(lastAttention);
  });

  it('leads with the phone calls, not with the data entry', () => {
    // Ranking purely by age opened the screen on 26 identical "No email address"
    // rows, which is wallpaper: it buried the fourteen people who had actually
    // clicked through and made the whole list read as a chore. A warm lead is a call
    // worth making today; a missing address is an afternoon of admin.
    const sorted = sortRows(rows, 'priority', 'desc');
    const firstClicked = sorted.findIndex((row) => row.customer.contact === 'clicked');
    const firstHeld = sorted.findIndex((row) => row.customer.contact === 'held_no_email');
    expect(firstClicked).toBeGreaterThan(-1);
    expect(firstHeld).toBeGreaterThan(-1);
    expect(firstClicked).toBeLessThan(firstHeld);
  });

  it('still keeps every household that needs the firm above the ones that do not', () => {
    // Re-ranking within the attention block must not let an admin job fall below a
    // household nobody has to touch.
    const sorted = sortRows(rows, 'priority', 'desc');
    const lastHeld = sorted.reduce(
      (last, row, i) => (row.customer.contact === 'held_no_email' ? i : last),
      -1,
    );
    const firstSilent = sorted.findIndex((row) => row.customer.contact === 'no_response');
    expect(lastHeld).toBeLessThan(firstSilent);
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
