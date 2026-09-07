import type { StateDefinition, StateTrack } from './types';
import { fullDaysBetween } from './age';

/**
 * Earnings state — the installer's £50 per household.
 *
 * TWO COMMERCIAL RULES ARE ENCODED HERE. Both were settled deliberately, and
 * changing either changes a commitment made to installers, so change them here and
 * nowhere else.
 *
 * 1. QUALIFICATION. 30 *consecutive* days in `Smart Control Active`, measured from
 *    first activation. Any drop resets the clock to zero. Expressed by
 *    `deriveEarningsState` below.
 *
 * 2. CLAWBACK. Confirmed is final. Once the 30 days are served the £50 is not
 *    reversed, even if control later drops — an installer cannot control a household
 *    unlinking six months after the job. Expressed structurally: `confirmed` has NO
 *    transition to `lapsed`. That single missing edge is the whole policy, and
 *    `earnings.test.ts` asserts it.
 *
 * The amount is flat and deliberately a single constant. The household-side grid
 * reward is banded by battery size, and whether the installer fee should band with it
 * is an open commercial question rather than a decided one — so it is one line to
 * change when that decision is taken.
 *
 * ON OWNERSHIP. Nobody "owns" `not_eligible`, `qualifying` or `lapsed`: they are
 * consequences, and the real owner is whoever owns the underlying activation blocker.
 * That is why the earnings screen joins the activation blocker onto every pending row
 * rather than restating a blocker of its own.
 */

export const REWARD_GBP = 50;
export const QUALIFYING_DAYS = 30;

export const EARNINGS_STATE_IDS = [
  'not_eligible',
  'qualifying',
  'lapsed',
  'confirmed',
  'paid',
] as const;

export type EarningsStateId = (typeof EARNINGS_STATE_IDS)[number];

const STATES: Record<EarningsStateId, StateDefinition<EarningsStateId>> = {
  not_eligible: {
    id: 'not_eligible',
    label: 'Not earning yet',
    blocker: `Smart Control has never been active. The ${QUALIFYING_DAYS}-day clock starts the first time it is.`,
    owner: 'depends_on_setup',
    action: 'Clear the blocker on their setup and the clock starts on its own.',
    disposition: 'blocked',
  },
  qualifying: {
    id: 'qualifying',
    label: 'Qualifying',
    blocker: `Smart Control has to stay active for ${QUALIFYING_DAYS} days in a row.`,
    owner: 'nobody',
    action: null,
    disposition: 'in_flight',
  },
  lapsed: {
    id: 'lapsed',
    label: 'Clock reset',
    blocker: `Control dropped before the ${QUALIFYING_DAYS} days were up, so the clock went back to zero.`,
    owner: 'depends_on_setup',
    action: `Fix the blocker on their setup. The ${QUALIFYING_DAYS} days restart from the day control comes back.`,
    disposition: 'blocked',
  },
  confirmed: {
    id: 'confirmed',
    label: 'Confirmed',
    blocker: null,
    owner: 'lumo',
    action: 'Yours. Lumo pays confirmed rewards in the next monthly run.',
    disposition: 'earning',
  },
  paid: {
    id: 'paid',
    label: 'Paid',
    blocker: null,
    owner: 'nobody',
    action: null,
    disposition: 'earning',
  },
};

/**
 * Note what is absent: `confirmed` cannot reach `lapsed`. See rule 2 above.
 */
const TRANSITIONS: Record<EarningsStateId, readonly EarningsStateId[]> = {
  not_eligible: ['qualifying'],
  qualifying: ['confirmed', 'lapsed'],
  lapsed: ['qualifying'],
  confirmed: ['paid'],
  paid: [],
};

export const EARNINGS: StateTrack<EarningsStateId> = {
  name: 'Earnings',
  description: `The installer's £${REWARD_GBP} per household, on ${QUALIFYING_DAYS} consecutive days of active control. Confirmed is final.`,
  states: STATES,
  order: EARNINGS_STATE_IDS,
  initial: ['not_eligible'],
  transitions: TRANSITIONS,
};

export const earningsState = (id: EarningsStateId): StateDefinition<EarningsStateId> =>
  STATES[id];

export interface QualificationInput {
  /** Has Smart Control ever been active for this household? */
  readonly everActive: boolean;
  /**
   * Start of the CURRENT unbroken run of `Smart Control Active`, as an ISO date.
   * `null` when control is not active right now. Any drop clears it, which is how
   * "consecutive" is enforced — there is no accumulator to game.
   */
  readonly controlActiveSince: string | null;
  /**
   * The date 30 consecutive days were first served. Sticky once set, and the reason
   * a later drop cannot take the reward away.
   */
  readonly qualifiedAt: string | null;
  readonly paidAt: string | null;
}

export interface Qualification {
  readonly state: EarningsStateId;
  readonly daysServed: number;
  readonly daysRemaining: number;
  /**
   * True when the reward is confirmed but control is no longer active. The earnings
   * screen has to say something in this case, which is exactly why the clawback
   * question could not be left open.
   */
  readonly confirmedButControlDropped: boolean;
}

/**
 * Derive the earnings state from the control history. Pure, and the only place the
 * 30-day rule is implemented.
 */
export function deriveEarningsState(
  input: QualificationInput,
  asOf: string,
): Qualification {
  const { everActive, controlActiveSince, qualifiedAt, paidAt } = input;

  const servedNow = controlActiveSince
    ? Math.min(fullDaysBetween(controlActiveSince, asOf), QUALIFYING_DAYS)
    : 0;

  if (paidAt) {
    return {
      state: 'paid',
      daysServed: QUALIFYING_DAYS,
      daysRemaining: 0,
      confirmedButControlDropped: controlActiveSince === null,
    };
  }

  // Sticky. Checked before the live clock so a drop after qualification cannot
  // reopen a settled reward.
  if (qualifiedAt) {
    return {
      state: 'confirmed',
      daysServed: QUALIFYING_DAYS,
      daysRemaining: 0,
      confirmedButControlDropped: controlActiveSince === null,
    };
  }

  if (controlActiveSince) {
    if (servedNow >= QUALIFYING_DAYS) {
      return {
        state: 'confirmed',
        daysServed: QUALIFYING_DAYS,
        daysRemaining: 0,
        confirmedButControlDropped: false,
      };
    }
    return {
      state: 'qualifying',
      daysServed: servedNow,
      daysRemaining: QUALIFYING_DAYS - servedNow,
      confirmedButControlDropped: false,
    };
  }

  return {
    state: everActive ? 'lapsed' : 'not_eligible',
    daysServed: 0,
    daysRemaining: QUALIFYING_DAYS,
    confirmedButControlDropped: false,
  };
}

/** "12 days to go" / "1 day to go". Used on qualifying rows. */
export function daysRemainingLabel(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'Confirmed';
  return daysRemaining === 1 ? '1 day to go' : `${daysRemaining} days to go`;
}
