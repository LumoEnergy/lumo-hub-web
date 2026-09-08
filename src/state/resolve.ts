import type { ActivationStateId } from './activation';
import { ACTIVATION } from './activation';
import type { ContactStateId } from './contact';
import { CONTACT } from './contact';
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
 * their way, and the detail view shows all four.
 *
 * This is a product decision, not a rendering detail, which is why it lives with the
 * state model rather than in a component.
 */

export interface TrackPosition {
  readonly contact: ContactStateId;
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
   * one of them tells the installer anything. A household emailed six weeks ago whose
   * battery went offline yesterday has a one-day-old problem.
   */
  readonly contactSince: string;
  readonly activationSince: string;
  /** `null` when there is no match state yet. */
  readonly matchSince: string | null;
}

export type BlockerTrack = 'contact' | 'activation' | 'match' | 'none';

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
  const { contact, activation, match, qualification } = position;

  const qualified = deriveEarningsState(qualification, asOf);
  const money = {
    earnings: qualified.state,
    daysRemaining: qualified.daysRemaining,
    confirmedButControlDropped: qualified.confirmedButControlDropped,
  };

  const contactDef = CONTACT.states[contact];
  const activationDef = ACTIVATION.states[activation];
  const matchDef = match === null ? null : MATCH.states[match];

  const aged = (since: string) => {
    const days = fullDaysBetween(since, asOf);
    return { ageDays: days, ageBand: ageBand(days) };
  };

  // 1. A blocked match outranks everything. The household is on the platform and may
  //    be earning perfectly well, while the firm who put them there is credited with
  //    nothing. Left alone it never resolves: the row sits there looking like a lead
  //    that never converted, which is exactly how the £50 goes missing.
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

  // 2. Before there is an account the campaign is the whole story, and it decides
  //    outright. All the platform can say here is "no account", which is true and
  //    useless: held-for-a-missing-address and bounced-three-weeks-ago are the same
  //    activation state and completely different situations.
  //
  //    Deferring to the activation state instead would put every freshly imported
  //    household into the installer's own queue telling them to chase an email that
  //    has not been sent yet. Waiting a few days after a send is not a task, and a
  //    queue that says it is gets ignored.
  if (activation === 'no_account') {
    return {
      track: 'contact',
      state: contactDef,
      owner: contactDef.owner,
      ...aged(position.contactSince),
      ...money,
      // `unsubscribed` and `complained` are blocked but owned by nobody: terminal
      // facts, not work. They must never enter the queue.
      needsAttention: contactDef.disposition === 'blocked' && contactDef.owner !== 'nobody',
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
