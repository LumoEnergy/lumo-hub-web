import type { HubCustomer } from '../fixtures';
import type { Owner, ResolvedState } from '../state';
import {
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
        invite: customer.invite,
        activation: customer.activation,
        match: customer.match,
        qualification: customer.qualification,
        inviteSince: customer.inviteSince,
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
 * Grouped by owner so an installer can see at a glance what is theirs, and sorted
 * oldest-first within a group because the oldest blocker is the one closest to being
 * a dead lead. Rows that need no attention are excluded entirely: a queue that
 * includes "Lumo is testing control" trains people to skim it.
 *
 * Match blockers are excluded here because they get their own pinned treatment. A row
 * that looks like every other row has already failed at the one job that matters.
 */
export function actionQueue(rows: readonly CustomerRow[]): readonly OwnerGroup[] {
  const queued = rows.filter(
    (row) => row.resolved.needsAttention && row.resolved.track !== 'match',
  );

  return OWNER_QUEUE_ORDER.map((owner) => ({
    owner,
    rows: queued
      .filter((row) => row.resolved.owner === owner)
      .sort((a, b) => b.resolved.ageDays - a.resolved.ageDays),
  })).filter((group) => group.rows.length > 0);
}

/** Households on Lumo whose credit is going nowhere. Pinned above the queue. */
export function unmatchedRows(rows: readonly CustomerRow[]): readonly CustomerRow[] {
  return rows
    .filter((row) => row.resolved.track === 'match')
    .sort((a, b) => b.resolved.ageDays - a.resolved.ageDays);
}

export const needsAttentionCount = (rows: readonly CustomerRow[]): number =>
  rows.filter((row) => row.resolved.needsAttention).length;

export const earningCount = (rows: readonly CustomerRow[]): number =>
  rows.filter((row) => row.customer.activation === 'Smart Control Active').length;

/**
 * Where a household's £50 actually stands.
 *
 * `blocked_by_match` outranks the earnings state, and that is the honest answer
 * rather than a pessimistic one: the control is real and the clock has run, but with
 * nothing tying the household to the installer the money is not theirs yet. Counting
 * it as confirmed would put a number in front of an installer that Lumo could not
 * pay, which is the specific way this product previously lost their trust.
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
  /** Money that is the installer's, banked or awaiting the pay run. */
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

export const gbp = (amount: number): string => `£${amount.toLocaleString('en-GB')}`;
