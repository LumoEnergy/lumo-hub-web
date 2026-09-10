import { describe, it, expect } from 'vitest';
import { loadPersona, PERSONA_IDS } from '../../fixtures';
import type { PersonaId } from '../../fixtures';
import { CONTACT_STATE_IDS, REWARD_GBP } from '../../state';
import {
  buildRows,
  earningsSummary,
  moneyPosition,
  sortRows,
} from '../customers';
import {
  EMAILED_STATES,
  STALE_CLICK_DAYS,
  WAITING_STATES,
  liveRows,
  needsYou,
  rowsForView,
  scheduledSendDates,
} from '../views';

const TODAY = new Date('2026-09-08T00:00:00Z');

const rowsFor = (persona: PersonaId) => {
  const loaded = loadPersona(persona, TODAY);
  return buildRows(loaded.customers, loaded.asOf);
};

describe('what needs the firm, one household at a time', () => {
  const rows = rowsFor('messy-list');
  const queued = needsYou(rows);

  it('is only ever the four jobs, plus the money going nowhere', () => {
    // The previous version derived this from state dispositions, which quietly swept
    // in activation problems a firm can do nothing about. Naming the set is the point:
    // a to-do list is only a to-do list if everything on it is doable.
    for (const row of queued) {
      const allowed =
        row.resolved.track === 'match' ||
        ['held_no_email', 'held_unconfirmed', 'bounced', 'clicked'].includes(
          row.customer.contact,
        );
      expect(allowed, `${row.customer.id} is ${row.customer.contact}`).toBe(true);
    }
  });

  it('now includes the unmatched households, because the callout is gone', () => {
    // They used to be pinned above the list as a banner, which made "£100 of yours
    // is going to nobody" the loudest thing on the screen on every single visit.
    // A job belongs next to the other jobs.
    const unmatched = queued.filter((row) => row.resolved.track === 'match');
    expect(unmatched.length).toBeGreaterThan(0);
  });

  it('includes the missing addresses, because each needs a different answer', () => {
    const states = queued.map((r) => r.customer.contact);
    expect(states).toContain('held_no_email');
    expect(states).toContain('held_unconfirmed');
  });

  it('never includes a transient state a firm cannot influence', () => {
    const live = needsYou(rowsFor('mid-campaign'));
    const transient = live.filter(
      (row) =>
        row.customer.activation === 'Smart Control Test Running' ||
        row.customer.contact === 'sent' ||
        row.customer.contact === 'opened',
    );
    expect(transient).toEqual([]);
  });

  it('only chases a click once it has gone cold', () => {
    // A click from this morning is not a task, and putting it on a call list trains
    // people to ignore the call list.
    const live = needsYou(rowsFor('mid-campaign'));
    const clicked = live.filter((row) => row.customer.contact === 'clicked');
    expect(clicked.length).toBeGreaterThan(0);
    for (const row of clicked) {
      expect(row.resolved.ageDays, row.customer.id).toBeGreaterThanOrEqual(STALE_CLICK_DAYS);
    }
  });

  it('never includes the silent majority', () => {
    // The largest state in any campaign. If it ever enters this set the view is
    // useless, so this is the assertion protecting the whole screen.
    const live = needsYou(rowsFor('mid-campaign'));
    expect(live.filter((row) => row.customer.contact === 'no_response')).toEqual([]);
  });

  it('never asks for the same list-wide sign-off once per household', () => {
    // 118 rows all saying "approve the email" is one click described 118 times.
    const kestrel = rowsFor('awaiting-approval');
    const awaiting = kestrel.filter((row) => row.customer.contact === 'awaiting_approval');
    expect(awaiting.length).toBeGreaterThan(100);
    const needing = needsYou(kestrel).map((row) => row.customer.id);
    for (const row of awaiting) {
      expect(needing, row.customer.id).not.toContain(row.customer.id);
    }
  });

  it('is the same set the dashboard counts and the tab shows', () => {
    // The dashboard states a number and links straight to this view. Two different
    // answers a click apart is the screen contradicting itself.
    for (const persona of ['mid-campaign', 'awaiting-approval', 'messy-list'] as const) {
      const all = rowsFor(persona);
      expect(needsYou(all).length, persona).toBe(rowsForView(all, 'attention').length);
    }
  });
});

describe('the four views', () => {
  const rows = rowsFor('mid-campaign');

  /**
   * THE INVARIANT THAT REPLACED THE "ALL" TAB.
   *
   * Dropping All removed the one view guaranteed to contain everybody, so reachability
   * is now a property of the state partition rather than a safety net in the UI. If
   * somebody adds a fourteenth contact state and forgets to file it, this fails rather
   * than a household silently disappearing from every view on the screen.
   */
  it('files every contact state under exactly one of invited or not yet contacted', () => {
    const emailed = new Set<string>(EMAILED_STATES);
    const waiting = new Set<string>(WAITING_STATES);

    for (const state of CONTACT_STATE_IDS) {
      const membership = [emailed.has(state), waiting.has(state)].filter(Boolean).length;
      expect(membership, `${state} must be in exactly one`).toBe(1);
    }
    expect(emailed.size + waiting.size).toBe(CONTACT_STATE_IDS.length);
  });

  it('reaches every household through the two campaign views', () => {
    for (const persona of PERSONA_IDS) {
      const all = rowsFor(persona);
      const reachable = new Set([
        ...rowsForView(all, 'invited').map((r) => r.customer.id),
        ...rowsForView(all, 'waiting').map((r) => r.customer.id),
      ]);
      expect(reachable.size, persona).toBe(all.length);
    }
  });

  it('keeps every view a proper subset, now that none of them is everybody', () => {
    for (const view of ['invited', 'waiting', 'attention'] as const) {
      expect(rowsForView(rows, view).length, view).toBeLessThan(rows.length);
    }
  });

  it('never has a household both invited and not yet contacted', () => {
    const invited = new Set(rowsForView(rows, 'invited').map((r) => r.customer.id));
    for (const row of rowsForView(rows, 'waiting')) {
      expect(invited, row.customer.id).not.toContain(row.customer.id);
    }
  });

  it('shows the broken live households, not just the healthy ones', () => {
    // A monitoring view that hides the disconnected ones is a monitoring view nobody
    // can use, which is why the fleet is "on the platform" rather than "earning".
    const live = liveRows(rows);
    const running = live.filter((r) => r.customer.activation === 'Smart Control Active');
    expect(live.length).toBeGreaterThan(running.length);
  });

  it('keeps live households on Invited too, so the split strands nobody', () => {
    // Monitoring is a second lens over a subset of Invited, not a slice taken out of
    // the campaign. `signed_up` is in EMAILED_STATES, so these households are still
    // reachable from the campaign screen: we emailed them and they joined.
    const invited = new Set(rowsForView(rows, 'invited').map((r) => r.customer.id));
    const live = liveRows(rows);
    expect(live.length).toBeGreaterThan(0);
    for (const row of live) {
      expect(invited, row.customer.id).toContain(row.customer.id);
    }
  });

  it('gives every queued household a real send date and every held one none', () => {
    // The schedule says 100 a day, so the hundred-and-first person genuinely goes
    // tomorrow. A date next to a household with no address would be a promise the
    // product cannot keep.
    const loaded = loadPersona('mid-campaign', TODAY);
    const dates = scheduledSendDates(rows, loaded.company);

    const queued = rows.filter((r) => r.customer.contact === 'queued');
    expect(queued.length).toBeGreaterThan(0);
    for (const row of queued) {
      expect(dates.get(row.customer.id), row.customer.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const row of rows.filter((r) => r.customer.contact === 'held_no_email')) {
      expect(dates.has(row.customer.id), row.customer.id).toBe(false);
    }
  });

  it('spreads the queue across the batches rather than dumping it on day one', () => {
    const loaded = loadPersona('mid-campaign', TODAY);
    const dates = [...scheduledSendDates(rows, loaded.company).values()];
    expect(new Set(dates).size).toBeGreaterThan(1);
  });
});

describe('table sorting', () => {
  const rows = rowsFor('mid-campaign');

  it('runs the list backwards down the funnel by default', () => {
    // A CHANGE OF MIND. It used to put the firm's chores at the top, which is right
    // for a queue and wrong for a default view: opening on 26 identical "No email
    // address" rows makes a working campaign look like a mess. The chores have their
    // own tab now.
    const sorted = sortRows(rows, 'priority', 'desc');
    expect(sorted[0].customer.contact).toBe('signed_up');
    expect(sorted[0].customer.activation).toBe('Smart Control Active');

    const lastSignedUp = sorted.reduce(
      (last, row, i) => (row.customer.contact === 'signed_up' ? i : last),
      -1,
    );
    const firstQueued = sorted.findIndex((row) => row.customer.contact === 'queued');
    expect(lastSignedUp).toBeLessThan(firstQueued);
  });

  it('keeps the opted-out below the households still in play', () => {
    // Further through the campaign but over. Sorting them above live prospects would
    // fill the top of the list with dead ends.
    const sorted = sortRows(rows, 'priority', 'desc');
    const firstOptedOut = sorted.findIndex((row) => row.customer.contact === 'unsubscribed');
    const lastClicked = sorted.reduce(
      (last, row, i) => (row.customer.contact === 'clicked' ? i : last),
      -1,
    );
    expect(lastClicked).toBeLessThan(firstOptedOut);
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
