/**
 * The state model.
 *
 * Four independent tracks. A household sits in one state on each at all times, and
 * the job of the UI is to make their combination legible — which is why the tracks
 * are defined separately here rather than flattened into a single funnel that would
 * have to invent states for every combination.
 */

export type { Owner, Disposition, StateDefinition, StateTrack } from './types';
export { OWNER_LABELS, OWNER_GROUP_HEADINGS, OWNER_QUEUE_ORDER } from './types';

export type { InviteStateId } from './invite';
export { INVITE, INVITE_STATE_IDS, inviteState } from './invite';

export type { ActivationStateId } from './activation';
export {
  ACTIVATION,
  ACTIVATION_STATE_IDS,
  PLATFORM_ACCOUNT_STATES,
  HUB_ONLY_ACTIVATION_STATES,
  activationState,
} from './activation';

export type { MatchStateId } from './match';
export { MATCH, MATCH_STATE_IDS, matchState, isMatchBlocking } from './match';

export type { EarningsStateId, Qualification, QualificationInput } from './earnings';
export {
  EARNINGS,
  EARNINGS_STATE_IDS,
  REWARD_GBP,
  QUALIFYING_DAYS,
  earningsState,
  deriveEarningsState,
  daysRemainingLabel,
} from './earnings';

export type { AgeBand } from './age';
export { fullDaysBetween, ageBand, ageLabel, AGE_BAND_LABELS, AGE_BAND_ORDER } from './age';

export type { ProducerGap } from './producerGaps';
export { PRODUCER_GAPS, producerGapsFor } from './producerGaps';

import { INVITE } from './invite';
import { ACTIVATION } from './activation';
import { MATCH } from './match';
import { EARNINGS } from './earnings';

/**
 * Every track, in the order they read on a row: how they heard, where they got to,
 * whether we can tie them to you, and what it is worth.
 */
export const TRACKS = [INVITE, ACTIVATION, MATCH, EARNINGS] as const;
