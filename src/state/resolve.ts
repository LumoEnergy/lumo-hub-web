import type { ActivationStateId } from './activation';
import { ACTIVATION } from './activation';
import type { InviteStateId } from './invite';
import { INVITE } from './invite';
import type { MatchStateId } from './match';
import { MATCH } from './match';
import type { EarningsStateId, QualificationInput } from './earnings';
import { EARNINGS, deriveEarningsState } from './earnings';
import type { Owner, StateDefinition } from './types';
import type { AgeBand } from './age';
import { ageBand, fullDaysBetween } from './age';

/**
 * Resolving four tracks into one row.
 *
 * A household sits in a state on every track simultaneously, and the UI has to make
 * the combination legible. Showing four badges per row does not do that — it moves
 * the work onto the installer. So one state is nominated as the thing standing in
 * their way, and the detail sheet shows all four.
 *
 * This is a product decision, not a rendering detail, which is why it lives with the
 * state model rather than in a component.
 */

export interface TrackPosition {
  readonly invite: InviteStateId;
  readonly activation: ActivationStateId;
  /**
   * `null` until the household has an account. There is nothing to match before
   * then, and inventing a "pending" match state would put a row in the queue that
   * nobody can act on.
   */
  readonly match: MatchStateId | null;
  readonly qualification: QualificationInput;
  /**
   * ISO date each track's current state was entered. The age shown on a row is the
   * age of the *nominated* blocker, not of the record, because those differ and only
   * one of them tells the installer anything. A household invited six weeks ago whose
   * battery went offline yesterday has a one-day-old problem.
   */
  readonly inviteSince: string;
  readonly activationSince: string;
  /** `null` when there is no match state yet. */
  readonly matchSince: string | null;
}

export type BlockerTrack = 'invite' | 'activation' | 'match' | 'none';

export interface ResolvedState {
  /** Which track the nominated blocker came from. */
  readonly track: BlockerTrack;
  /** The nominated blocker, or `null` when nothing is in the way. */
  readonly state: StateDefinition<string> | null;
  readonly owner: Owner;
  readonly ageDays: number;
  readonly ageBand: AgeBand;
  readonly earnings: EarningsStateId;
  readonly daysRemaining: number;
  readonly confirmedButControlDropped: boolean;
  /**
   * True when this row belongs in the action queue. Earning and in-flight rows do
   * not: an installer who is shown a list including "Lumo is testing control" learns
   * to skim the list.
   */
  readonly needsAttention: boolean;
}

export function resolveCustomerState(position: TrackPosition, asOf: string): ResolvedState {
  const { invite, activation, match, qualification } = position;

  const qualified = deriveEarningsState(qualification, asOf);
  const money = {
    earnings: qualified.state,
    daysRemaining: qualified.daysRemaining,
    confirmedButControlDropped: qualified.confirmedButControlDropped,
  };

  const inviteDef = INVITE.states[invite];
  const activationDef = ACTIVATION.states[activation];
  const matchDef = match === null ? null : MATCH.states[match];

  const aged = (since: string) => {
    const days = fullDaysBetween(since, asOf);
    return { ageDays: days, ageBand: ageBand(days) };
  };

  // 1. A blocked match outranks everything. The household is on the platform and may
  //    be earning perfectly well, while the installer who put them there is credited
  //    with nothing. Left alone it never resolves: the row sits there looking like a
  //    lead that never converted, which is exactly how the £50 goes missing.
  if (matchDef && matchDef.disposition === 'blocked') {
    return {
      track: 'match',
      state: matchDef,
      owner: matchDef.owner,
      ...aged(position.matchSince ?? position.activationSince),
      ...money,
      needsAttention: true,
    };
  }

  // 2. Before there is an account the invite is the whole story, and it decides
  //    outright. All the platform can say here is "no account", which is true and
  //    useless: queued-for-Lumo-to-send and bounced-three-weeks-ago are the same
  //    activation state and completely different situations.
  //
  //    Deferring to the activation state instead would put every freshly added
  //    household straight into the installer's own queue telling them to chase an
  //    invite that has not been sent yet. Waiting a few days after a send is not a
  //    task, and a queue that says it is gets ignored.
  if (activation === 'no_account') {
    return {
      track: 'invite',
      state: inviteDef,
      owner: inviteDef.owner,
      ...aged(position.inviteSince),
      ...money,
      needsAttention: inviteDef.disposition === 'blocked' && inviteDef.owner !== 'nobody',
    };
  }

  // 3. Otherwise the household's own progress is the story.
  if (activationDef.disposition !== 'earning') {
    return {
      track: 'activation',
      state: activationDef,
      owner: activationDef.owner,
      ...aged(position.activationSince),
      ...money,
      // in_flight states resolve on their own; nothing to chase.
      needsAttention: activationDef.disposition === 'blocked',
    };
  }

  // 4. Earning, matched, nothing in the way.
  return {
    track: 'none',
    state: null,
    owner: 'nobody',
    ...aged(position.activationSince),
    ...money,
    needsAttention: false,
  };
}

/** Copy for the earnings position on a row, e.g. "£50 · 12 days to go". */
export const earningsDefinitionFor = (id: EarningsStateId) => EARNINGS.states[id];
