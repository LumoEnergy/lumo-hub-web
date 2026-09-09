import type { StateDefinition, StateTrack } from './types';

/**
 * Match state, whether the household on the installer's list is the same household
 * that turned up on the platform.
 *
 * THIS TRACK GOT SIMPLER WHEN THE PRODUCT BECAME A CAMPAIGN. Previously an installer
 * shared one generic link, so a household could only be tied to them by guessing from
 * an email address, and "signed up under a different address" was the normal case
 * rather than the exception. A bulk import mints a token per household, the campaign
 * email carries that token, and a household who signs up through it is matched with
 * certainty regardless of which address they use. Attribution stops being inference.
 *
 * That leaves a genuine residue, and it is worth keeping honest about it:
 *
 *   - The household ignores the email and signs up months later through a Lumo ad.
 *     Nothing connects them. This is `unmatched_different_email` and it is the state
 *     that silently eats a £50, the household is on Lumo and earning, the installer
 *     did the work, and the row looks like a lead that never converted.
 *   - Two rows on the installer's list are the same household, or two installers both
 *     claim one. This is `ambiguous`, and Lumo resolves it rather than guessing,
 *     because crediting the wrong firm is worse than a short delay.
 *
 * No producer today. There is no join anywhere in the estate between a contacted
 * household and a Lumo account, and the only installer-to-household link that exists
 * at all is `partnerTag`, a free-text `?partner=` URL parameter the customer can set
 * for themselves. See `producerGaps.ts`.
 */

export const MATCH_STATE_IDS = [
  'matched_import',
  'matched_manual',
  'unmatched_different_email',
  'ambiguous',
] as const;

export type MatchStateId = (typeof MATCH_STATE_IDS)[number];

const STATES: Record<MatchStateId, StateDefinition<MatchStateId>> = {
  matched_import: {
    id: 'matched_import',
    label: 'Tied to you',
    blocker: null,
    owner: 'nobody',
    action: null,
    disposition: 'earning',
  },
  matched_manual: {
    id: 'matched_manual',
    label: 'Tied to you by hand',
    blocker: null,
    owner: 'nobody',
    action: null,
    disposition: 'earning',
  },
  unmatched_different_email: {
    id: 'unmatched_different_email',
    label: 'On Lumo, not credited to you',
    blocker:
      "They are on Lumo and running, but they came in on their own rather than through your campaign, so nothing ties them to you. Your £50 is not counted while this is open.",
    owner: 'installer',
    action:
      'Confirm this is your customer and we will tie it to you. Do not re-add them, that just creates a duplicate and delays it further.',
    disposition: 'blocked',
  },
  ambiguous: {
    id: 'ambiguous',
    label: 'More than one possible match',
    blocker:
      "More than one Lumo account could be this household, and we will not guess and risk crediting the wrong firm.",
    owner: 'lumo',
    action: 'Lumo will confirm which account is theirs. We may come back to you for a postcode.',
    disposition: 'blocked',
  },
};

const TRANSITIONS: Record<MatchStateId, readonly MatchStateId[]> = {
  matched_import: [],
  matched_manual: [],
  unmatched_different_email: ['matched_manual'],
  ambiguous: ['matched_import', 'matched_manual', 'unmatched_different_email'],
};

export const MATCH: StateTrack<MatchStateId> = {
  name: 'Match',
  description:
    'Whether the household who signed up can be tied to the firm who installed their battery. No producer today.',
  states: STATES,
  order: MATCH_STATE_IDS,
  // Matching happens once, at signup, so a record arrives already in its answer.
  initial: MATCH_STATE_IDS,
  transitions: TRANSITIONS,
};

export const matchState = (id: MatchStateId): StateDefinition<MatchStateId> => STATES[id];

/** True when the match itself is what stands between the installer and their £50. */
export const isMatchBlocking = (id: MatchStateId): boolean =>
  STATES[id].disposition === 'blocked';
