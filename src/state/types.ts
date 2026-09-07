/**
 * Shared shape for every state track.
 *
 * This module and its siblings are the durable output of the prototype: they are
 * intended to survive into the real product largely unchanged, so they are written
 * as production code and carry no UI concerns at all.
 *
 * The four fields the design must produce for every state are `label`, `blocker`,
 * `owner` and `action`. `owner` matters more than it looks: without it installers
 * chase problems they cannot solve and stop trusting the list. "We couldn't control
 * their battery, we're investigating" is a Lumo problem. "Their inverter connection
 * has dropped" is a phone call they can make today.
 */

/**
 * Whose job it is to clear a blocker.
 *
 * `depends_on_setup` is not a fudge for "we don't know". It is the honest answer for
 * the earnings track, whose states are consequences rather than work: nobody acts on
 * "not earning yet", and the real owner is whoever owns the household's activation
 * blocker. Modelling it explicitly keeps the invariant that a state with a
 * recommended action always has somebody to do it — a row that shows an action with
 * nobody attached is how a list loses an installer's trust.
 */
export type Owner =
  | 'installer'
  | 'household'
  | 'lumo'
  | 'depends_on_setup'
  | 'nobody';

/**
 * How a state should read to an installer at a glance.
 *
 * `blocked` and `in_flight` are deliberately distinct even though both have work
 * outstanding: an in-flight state resolves on its own and must not be presented as
 * something to chase.
 */
export type Disposition = 'earning' | 'in_flight' | 'blocked';

export interface StateDefinition<Id extends string> {
  readonly id: Id;
  /** The plain-English label an installer sees. Never a system enum value. */
  readonly label: string;
  /** What is actually blocking this, in the installer's terms. `null` when nothing is. */
  readonly blocker: string | null;
  readonly owner: Owner;
  /** The recommended action. `null` when there is genuinely nothing to do. */
  readonly action: string | null;
  readonly disposition: Disposition;
}

/**
 * A state track: its definitions, its permitted transitions, and the states a
 * record can legitimately start in.
 *
 * Transitions are asserted in tests rather than enforced at runtime — the prototype
 * has no state machine driving it. Their job is to make illegal paths reviewable,
 * and to encode commercial rules that would otherwise live only in prose. The
 * clearest example is the earnings track, where `confirmed` has no edge to `lapsed`:
 * that single omission is the whole clawback policy.
 */
export interface StateTrack<Id extends string> {
  readonly name: string;
  readonly description: string;
  readonly states: Readonly<Record<Id, StateDefinition<Id>>>;
  readonly order: readonly Id[];
  readonly initial: readonly Id[];
  readonly transitions: Readonly<Record<Id, readonly Id[]>>;
}

export const OWNER_LABELS: Readonly<Record<Owner, string>> = {
  installer: 'You',
  household: 'The household',
  lumo: 'Lumo',
  depends_on_setup: 'Their setup',
  nobody: 'Nobody',
};

/**
 * Heading used above each group in the action queue. Phrased as the installer's
 * question ("what do I do about this?") rather than as a data field.
 */
export const OWNER_GROUP_HEADINGS: Readonly<Record<Owner, string>> = {
  installer: 'You can fix these',
  household: 'The household needs to act',
  lumo: "Lumo's problem",
  depends_on_setup: 'Waiting on their setup',
  nobody: 'Nothing to do',
};

/**
 * Order the action queue groups in. Installers see what they can act on first,
 * because a list that opens with somebody else's problem is a list they stop opening.
 */
export const OWNER_QUEUE_ORDER: readonly Owner[] = [
  'installer',
  'household',
  'lumo',
  'depends_on_setup',
  'nobody',
];
