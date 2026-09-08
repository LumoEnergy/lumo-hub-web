import type { HubCustomer } from '../fixtures';
import { displayName } from '../fixtures';
import type { ContactStateId, Owner, ResolvedState } from '../state';
import {
  AGGREGATED_STATES,
  OWNER_QUEUE_ORDER,
  REWARD_GBP,
  resolveCustomerState,
} from '../state';

/**
 * What each screen needs, derived from the fixtures and the state model.
 *
 * Kept out of the components so the ordering and grouping rules — which are product
 * decisions worth arguing about in a review — are readable in one place and testable
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

export interface OwnerGroup {
  readonly owner: Owner;
  readonly rows: readonly CustomerRow[];
}

/**
 * The action queue.
 *
 * Grouped by owner so a firm can see at a glance what is theirs, and sorted
 * oldest-first within a group because the oldest blocker is the one closest to being
 * a dead lead. Rows that need no attention are excluded entirely: a queue that
 * includes "Lumo is testing control" trains people to skim it.
 *
 * Match blockers and anything in `AGGREGATED_STATES` are excluded here because they
 * get their own treatment above the list. A row that looks like every other row has
 * already failed at the one job that matters, and a hundred rows all saying "approve
 * the email" is not a queue.
 */
export function actionQueue(rows: readonly CustomerRow[]): readonly OwnerGroup[] {
  const queued = rows.filter(
    (row) =>
      row.resolved.needsAttention &&
      row.resolved.track !== 'match' &&
      !(AGGREGATED_STATES as readonly string[]).includes(row.customer.contact),
  );

  return OWNER_QUEUE_ORDER.map((owner) => ({
    owner,
    rows: queued
      .filter((row) => row.resolved.owner === owner)
      .sort((a, b) => b.resolved.ageDays - a.resolved.ageDays),
  })).filter((group) => group.rows.length > 0);
}

/** Households on Lumo whose credit is going nowhere. Pinned above the list. */
export function unmatchedRows(rows: readonly CustomerRow[]): readonly CustomerRow[] {
  return rows
    .filter((row) => row.resolved.track === 'match')
    .sort((a, b) => b.resolved.ageDays - a.resolved.ageDays);
}

/**
 * The three defects that are a batch job rather than a conversation.
 *
 * Aggregate the data problems, itemise the people. Twenty-eight missing addresses is
 * one number and one argument; twelve warm leads are twelve named humans someone
 * would ring, so those stay as rows — see `actionQueue`.
 *
 * NO MULTIPLIED TOTAL, DELIBERATELY. An earlier version of this said "28 households
 * missing an address — that is £1,400 we cannot go after". It reads well and it is
 * a lie: it assumes every one of the 28 would sign up and stay connected for 30 days,
 * when a realistic back-book conversion is a fraction of that. Presenting the
 * theoretical maximum as money being lost is precisely the growth fantasy the
 * September review called out, and doing it to installers who have not been paid yet
 * is how the last version of this product lost the room.
 *
 * So the rate is quoted per household — £50 each, which is true — and the count is
 * left as a count. `unmatchedRows` is the one place a multiplied total IS honest,
 * because that money has already been earned.
 */
type DataQualityState = 'held_no_email' | 'held_unconfirmed' | 'bounced';

const DATA_QUALITY_STATES: readonly DataQualityState[] = [
  'held_no_email',
  'held_unconfirmed',
  'bounced',
];

export interface DataQualityGroup {
  readonly contact: DataQualityState;
  readonly label: string;
  /** Why it is worth their time. Quotes the per-household rate, never a total. */
  readonly argument: string;
  readonly rows: readonly CustomerRow[];
}

export function dataQualityGroups(rows: readonly CustomerRow[]): readonly DataQualityGroup[] {
  const copy: Record<DataQualityState, { label: string; argument: (n: number) => string }> = {
    held_no_email: {
      label: 'Missing an email address',
      argument: (n) =>
        `Your list had no usable address for ${n === 1 ? 'this household' : `these ${n}`}, so there is nobody for us to write to. You are the only place an address can come from, and each one that signs up and stays connected for 30 days is £${REWARD_GBP}.`,
    },
    held_unconfirmed: {
      label: 'Battery not confirmed',
      argument: (n) =>
        `We cannot tell from your list whether ${n === 1 ? 'this household has' : `these ${n} have`} storage. You are the only one who knows. Sending to solar-only customers wastes the send and risks the spam complaints that slow the rest of your list down.`,
    },
    bounced: {
      label: 'Email bounced',
      argument: (n) =>
        `${n === 1 ? 'One address was' : `${n} addresses were`} dead, so they never saw it. Routine on a book this old. A better address puts them straight back in the queue, and fixing bounces protects delivery for everyone else on your list.`,
    },
  };

  return DATA_QUALITY_STATES.map((contact) => {
    const group = rows.filter((row) => row.customer.contact === contact);
    return {
      contact,
      label: copy[contact].label,
      argument: copy[contact].argument(group.length),
      rows: [...group].sort((a, b) => b.resolved.ageDays - a.resolved.ageDays),
    };
  }).filter((group) => group.rows.length > 0);
}

/**
 * The silent majority, stated once.
 *
 * Around half of any back-book campaign never opens the email. Showing that as a
 * hundred individual tasks would bury everything that matters, and hiding it would
 * misrepresent the channel. So it is a cohort with a number and an honest sentence —
 * and no money figure, for the reason given above.
 */
export interface SilentCohort {
  readonly count: number;
}

export function silentCohort(rows: readonly CustomerRow[]): SilentCohort | null {
  const count = rows.filter((row) => row.customer.contact === 'no_response').length;
  if (count === 0) return null;
  return { count };
}

export const needsAttentionCount = (rows: readonly CustomerRow[]): number =>
  rows.filter((row) => row.resolved.needsAttention).length;

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
 * a mechanical sort: rows needing the firm come first, then everything else, each
 * oldest-first. Someone who clicks a column header has a specific question and gets a
 * literal answer; someone who has just landed gets the useful order.
 */
export type SortKey = 'priority' | 'household' | 'status' | 'owner' | 'age' | 'money';
export type SortDirection = 'asc' | 'desc';

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
   * happened to put first, so reversing the column does not reverse the list — rows
   * appear to shuffle. Duplicate names are normal in a two-hundred-row back book,
   * not an edge case.
   */
  const compare = (a: CustomerRow, b: CustomerRow): number => {
    const tie = a.customer.id.localeCompare(b.customer.id);

    switch (key) {
      case 'priority': {
        const rank = (row: CustomerRow) =>
          row.resolved.track === 'match' ? 2 : row.resolved.needsAttention ? 1 : 0;
        return rank(b) - rank(a) || b.resolved.ageDays - a.resolved.ageDays || tie;
      }
      case 'household':
        return (displayName(a.customer).localeCompare(displayName(b.customer)) || tie) * sign;
      case 'status':
        return (
          ((a.resolved.state?.label ?? '').localeCompare(b.resolved.state?.label ?? '') || tie) *
          sign
        );
      case 'owner':
        return (
          (OWNER_QUEUE_ORDER.indexOf(a.resolved.owner) -
            OWNER_QUEUE_ORDER.indexOf(b.resolved.owner) || tie) * sign
        );
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
