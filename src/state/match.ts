import type { StateDefinition, StateTrack } from './types';

/**
 * Match state — whether the household an installer added is the same household that
 * turned up on the platform.
 *
 * `unmatched_different_email` is the state that matters. It is the one that silently
 * eats an installer's £50: the household is on Lumo and earning, the installer did
 * the work, and the row sits there looking like a lead that never converted. It gets
 * a visible treatment rather than a row that quietly never progresses.
 *
 * No producer today. There is no join anywhere in the estate between an invited email
 * and a Lumo account, and the only installer-to-household link that exists at all is
 * `partnerTag` — a free-text `?partner=` URL parameter that a customer can set for
 * themselves. See `producerGaps.ts`.
 *
 * The track has four entry points rather than one: matching happens once, at the
 * moment the household signs up, so a record arrives already in its answer.
 */

export const MATCH_STATE_IDS = [
  'matched_email',
  'matched_link',
  'unmatched_different_email',
  'ambiguous',
] as const;

export type MatchStateId = (typeof MATCH_STATE_IDS)[number];

const STATES: Record<MatchStateId, StateDefinition<MatchStateId>> = {
  matched_email: {
    id: 'matched_email',
    label: 'Matched on email',
    blocker: null,
    owner: 'nobody',
    action: null,
    disposition: 'earning',
  },
  matched_link: {
    id: 'matched_link',
    label: 'Matched via your link',
    blocker: null,
    owner: 'nobody',
    action: null,
    disposition: 'earning',
  },
  unmatched_different_email: {
    id: 'unmatched_different_email',
    label: 'Signed up with a different email',
    blocker:
      "They are on Lumo, but under an address you didn't give us, so nothing ties them to you. Your £50 is not counted while this is open.",
    owner: 'installer',
    action:
      "Tell Lumo the address they actually used and we will tie it to you. Don't re-add them — that just creates a duplicate.",
    disposition: 'blocked',
  },
  ambiguous: {
    id: 'ambiguous',
    label: 'More than one possible match',
    blocker:
      "More than one Lumo account could be this household, and we won't guess and risk crediting the wrong installer.",
    owner: 'lumo',
    action: 'Lumo will confirm which account is theirs. We may ask you for a postcode.',
    disposition: 'blocked',
  },
};

const TRANSITIONS: Record<MatchStateId, readonly MatchStateId[]> = {
  matched_email: [],
  matched_link: [],
  unmatched_different_email: ['matched_email', 'matched_link'],
  ambiguous: ['matched_email', 'matched_link', 'unmatched_different_email'],
};

export const MATCH: StateTrack<MatchStateId> = {
  name: 'Match',
  description:
    'Whether the household who signed up can be tied to the installer who added them. No producer today.',
  states: STATES,
  order: MATCH_STATE_IDS,
  initial: MATCH_STATE_IDS,
  transitions: TRANSITIONS,
};

export const matchState = (id: MatchStateId): StateDefinition<MatchStateId> => STATES[id];

/** True when the match itself is what stands between the installer and their £50. */
export const isMatchBlocking = (id: MatchStateId): boolean =>
  STATES[id].disposition === 'blocked';
