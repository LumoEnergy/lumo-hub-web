import { describe, it, expect } from 'vitest';
import { loadPersona } from '../../fixtures';
import { REWARD_GBP } from '../../state';
import {
  actionQueue,
  buildRows,
  earningsSummary,
  moneyPosition,
  unmatchedRows,
} from '../customers';

const ASOF = '2026-09-07';

const rowsFor = (persona: 'established' | 'first-run' | 'messy') => {
  const { customers } = loadPersona(persona, ASOF);
  return buildRows(customers, ASOF);
};

describe('the action queue', () => {
  const rows = rowsFor('messy');
  const groups = actionQueue(rows);

  it('shows the installer their own group first', () => {
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

  it('drops empty groups rather than rendering a heading with nothing under it', () => {
    for (const group of groups) {
      expect(group.rows.length).toBeGreaterThan(0);
    }
  });

  it('never queues a transient state an installer cannot influence', () => {
    const established = actionQueue(rowsFor('established')).flatMap((g) => g.rows);
    const transient = established.filter(
      (row) => row.customer.activation === 'Smart Control Test Running',
    );
    expect(transient).toEqual([]);
  });
});

describe('where the money actually stands', () => {
  it('never counts an unmatched household as confirmed, however long its clock has run', () => {
    const rows = rowsFor('messy');
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
    const summary = earningsSummary(rowsFor('messy'));
    expect(summary.atStakeGbp).toBe(REWARD_GBP);
    expect(summary.blockedByMatch.length).toBe(1);
    for (const row of summary.blockedByMatch) {
      expect(summary.confirmed).not.toContain(row);
      expect(summary.paid).not.toContain(row);
    }
  });

  it('adds up the earned total from confirmed and paid only', () => {
    const summary = earningsSummary(rowsFor('established'));
    expect(summary.earnedGbp).toBe(
      (summary.confirmed.length + summary.paid.length) * REWARD_GBP,
    );
    expect(summary.earnedGbp).toBe(summary.paidGbp + summary.awaitingPayoutGbp);
  });

  it('sorts the clock-running list by how close each one is', () => {
    const summary = earningsSummary(rowsFor('established'));
    const remaining = summary.pending.map((row) => row.resolved.daysRemaining);
    expect([...remaining].sort((a, b) => a - b)).toEqual(remaining);
  });

  it('shows a lapsed clock rather than hiding it in "not started"', () => {
    const summary = earningsSummary(rowsFor('established'));
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
    const summary = earningsSummary(rowsFor('established'));
    const dropped = [...summary.confirmed, ...summary.paid].filter(
      (row) => row.resolved.confirmedButControlDropped,
    );
    expect(dropped.length).toBeGreaterThan(0);
  });

  it('shows nothing at all for a first-run installer', () => {
    const summary = earningsSummary(rowsFor('first-run'));
    expect(summary.earnedGbp).toBe(0);
    expect(summary.pendingGbp).toBe(0);
    expect(summary.atStakeGbp).toBe(0);
    expect(summary.notStarted).toEqual([]);
  });
});
