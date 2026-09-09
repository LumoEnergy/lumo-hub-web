import type { HubCustomer } from '../fixtures';
import { displayName } from '../fixtures';
import type { ContactStateId, ResolvedState } from '../state';
import { REWARD_GBP, resolveCustomerState } from '../state';

/**
 * What each screen needs, derived from the fixtures and the state model.
 *
 * Kept out of the components so the ordering and grouping rules, which are product
 * decisions worth arguing about in a review, are readable in one place and testable
 * without rendering anything.
 */

export interface CustomerRow {
  readonly customer: HubCustomer;
  readonly resolved: ResolvedState;
}

export function buildRows(
  customers: readonly HubCustomer[],
  asOf: string,
): readonly CustomerRow[] {
  return customers.map((customer) => ({
    customer,
    resolved: resolveCustomerState(
      {
        contact: customer.contact,
        activation: customer.activation,
        match: customer.match,
        qualification: customer.qualification,
        contactSince: customer.contactSince,
        activationSince: customer.activationSince,
        matchSince: customer.matchSince,
      },
      asOf,
    ),
  }));
}

export const earningCount = (rows: readonly CustomerRow[]): number =>
  rows.filter((row) => row.customer.activation === 'Smart Control Active').length;

export const signedUpCount = (rows: readonly CustomerRow[]): number =>
  rows.filter((row) => row.customer.contact === 'signed_up').length;

/**
 * Where a household's £50 actually stands.
 *
 * `blocked_by_match` outranks the earnings state, and that is the honest answer
 * rather than a pessimistic one: the control is real and the clock has run, but with
 * nothing tying the household to the firm the money is not theirs yet. Counting it as
 * confirmed would put a number in front of an installer that Lumo could not pay,
 * which is the specific way this product previously lost their trust.
 */
export type MoneyPosition =
  | 'paid'
  | 'confirmed'
  | 'pending'
  | 'lapsed'
  | 'not_started'
  | 'blocked_by_match';

export function moneyPosition(row: CustomerRow): MoneyPosition {
  if (row.resolved.track === 'match') return 'blocked_by_match';
  switch (row.resolved.earnings) {
    case 'paid':
      return 'paid';
    case 'confirmed':
      return 'confirmed';
    case 'qualifying':
      return 'pending';
    case 'lapsed':
      return 'lapsed';
    default:
      return 'not_started';
  }
}

export interface EarningsSummary {
  readonly paid: readonly CustomerRow[];
  readonly confirmed: readonly CustomerRow[];
  readonly pending: readonly CustomerRow[];
  readonly lapsed: readonly CustomerRow[];
  readonly notStarted: readonly CustomerRow[];
  readonly blockedByMatch: readonly CustomerRow[];
  /** Money that is the firm's, banked or awaiting the pay run. */
  readonly earnedGbp: number;
  readonly paidGbp: number;
  readonly awaitingPayoutGbp: number;
  /** Money the clock is currently running on. Not promised. */
  readonly pendingGbp: number;
  /** Real control, real clock, no attribution. The number that should sting. */
  readonly atStakeGbp: number;
}

export function earningsSummary(rows: readonly CustomerRow[]): EarningsSummary {
  const by = (position: MoneyPosition) => rows.filter((row) => moneyPosition(row) === position);

  const paid = by('paid');
  const confirmed = by('confirmed');
  const pending = by('pending');
  const blockedByMatch = by('blocked_by_match');

  const oldestFirst = (list: readonly CustomerRow[]) =>
    [...list].sort((a, b) => b.resolved.ageDays - a.resolved.ageDays);

  return {
    paid,
    confirmed,
    pending: [...pending].sort((a, b) => a.resolved.daysRemaining - b.resolved.daysRemaining),
    lapsed: oldestFirst(by('lapsed')),
    notStarted: oldestFirst(by('not_started')),
    blockedByMatch: oldestFirst(blockedByMatch),
    earnedGbp: (paid.length + confirmed.length) * REWARD_GBP,
    paidGbp: paid.length * REWARD_GBP,
    awaitingPayoutGbp: confirmed.length * REWARD_GBP,
    pendingGbp: pending.length * REWARD_GBP,
    atStakeGbp: blockedByMatch.length * REWARD_GBP,
  };
}

/**
 * Table sorting, desktop only.
 *
 * `priority` is the default and is the only one that is a product opinion rather than
 * a mechanical sort. It runs the list backwards down the funnel: live households
 * first, then signed up, then the clicks, and so on down to the ones we have not
 * written to yet.
 *
 * THAT IS A CHANGE OF MIND. It used to put the firm's chores at the top, on the
 * theory that a queue is more useful than a scoreboard. It is, but not here: the
 * chores now have their own tab, and a default view that opens on twenty-six
 * identical "No email address" rows makes a working campaign look like a mess. Down
 * the funnel is also the only order in which the list reads as the same story the
 * dashboard just told.
 */
export type SortKey = 'priority' | 'household' | 'status' | 'age' | 'money';
export type SortDirection = 'asc' | 'desc';

/**
 * How far down the funnel a household has got. Higher is further.
 *
 * The opted-out and gone-quiet states sit below "not emailed yet" on purpose: they
 * are further through the campaign but they are over, and sorting them above live
 * prospects would fill the top of a reversed list with dead ends.
 */
const JOURNEY_RANK: Record<ContactStateId, number> = {
  signed_up: 8,
  clicked: 7,
  opened: 6,
  sent: 5,
  bounced: 4,
  held_no_email: 3,
  held_unconfirmed: 3,
  queued: 2,
  imported: 2,
  awaiting_approval: 2,
  no_response: 1,
  unsubscribed: 0,
  complained: 0,
};

/** Live control outranks a bare sign-up: it is the only state that pays. */
const journeyRank = (row: CustomerRow): number =>
  JOURNEY_RANK[row.customer.contact] +
  (row.customer.activation === 'Smart Control Active' ? 1 : 0);

const MONEY_RANK: Record<MoneyPosition, number> = {
  paid: 5,
  confirmed: 4,
  pending: 3,
  blocked_by_match: 2,
  lapsed: 1,
  not_started: 0,
};

export function sortRows(
  rows: readonly CustomerRow[],
  key: SortKey,
  direction: SortDirection,
): readonly CustomerRow[] {
  const sign = direction === 'asc' ? 1 : -1;

  /**
   * Every key falls through to the row id, and the sign multiplies the tiebreak too.
   *
   * Without this, two households called Marion Dunlop sort by whichever the import
   * happened to put first, so reversing the column does not reverse the list, rows
   * appear to shuffle. Duplicate names are normal in a two-hundred-row back book,
   * not an edge case.
   */
  const compare = (a: CustomerRow, b: CustomerRow): number => {
    const tie = a.customer.id.localeCompare(b.customer.id);

    switch (key) {
      case 'priority':
        return journeyRank(b) - journeyRank(a) || b.resolved.ageDays - a.resolved.ageDays || tie;
      case 'household':
        return (displayName(a.customer).localeCompare(displayName(b.customer)) || tie) * sign;
      case 'status':
        // Sorted by position in the funnel, not alphabetically by label. Nobody
        // wants "Clicked through" next to "Battery unconfirmed" because both start
        // with a letter near the front.
        return (journeyRank(a) - journeyRank(b) || tie) * sign;
      case 'age':
        return (a.resolved.ageDays - b.resolved.ageDays || tie) * sign;
      case 'money':
        return (
          (MONEY_RANK[moneyPosition(a)] - MONEY_RANK[moneyPosition(b)] ||
            displayName(a.customer).localeCompare(displayName(b.customer)) ||
            tie) * sign
        );
    }
  };

  return [...rows].sort(compare);
}

export const gbp = (amount: number): string => `£${amount.toLocaleString('en-GB')}`;
