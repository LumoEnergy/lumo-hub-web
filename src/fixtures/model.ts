import type {
  ActivationStateId,
  InviteStateId,
  MatchStateId,
  QualificationInput,
} from '../state';

/**
 * THE DATA CONTRACT.
 *
 * This is the second durable output of the prototype. It is a UI view model, not a
 * storage shape: it says what a screen needs, and `CUSTOMER_FIELD_PROVENANCE` below
 * says where each field would have to come from.
 *
 * That split is deliberate. Shaping the fixtures as Firestore documents would
 * pre-commit the real build to Firestore plus callables, and the 2026-08-06 review
 * concluded the installer entity has to exist in Postgres with a verified household
 * association. A prototype should not quietly decide that. So the contract is the
 * view model plus the state enums, and the storage decision stays open.
 *
 * `CUSTOMER_FIELD_PROVENANCE` is typed as `Record<keyof HubCustomer, Provenance>`,
 * so a field added to the view model without saying where it comes from is a
 * compile error. That is the mechanism that makes this a contract rather than a
 * comment.
 */

export interface HubCustomer {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  /** `null` only when the invite was a link or QR share with no email captured. */
  readonly email: string | null;
  readonly inverterMake: string;
  readonly batterySizeKwh: number;
  /** ISO date the installer added them. */
  readonly addedOn: string;
  readonly invite: InviteStateId;
  /** ISO date the invite state was last entered. */
  readonly inviteSince: string;
  readonly activation: ActivationStateId;
  /** ISO date the activation state was last entered. This is the blocker age. */
  readonly activationSince: string;
  /** `null` until there is a Lumo account to match against. */
  readonly match: MatchStateId | null;
  /** ISO date the match state was determined. `null` when `match` is. */
  readonly matchSince: string | null;
  readonly qualification: QualificationInput;
}

export type ProvenanceSource =
  /** The installer types it. Exists the moment they add the customer. */
  | 'installer-input'
  /** Available today in the Firestore mirror / HubSpot contact properties. */
  | 'platform-today'
  /** The system of record. Would need an installer-aware read path. */
  | 'postgres'
  /** Nothing produces this. The real build has to create it. See producerGaps.ts. */
  | 'no-producer';

export interface Provenance {
  readonly source: ProvenanceSource;
  readonly note: string;
}

export const CUSTOMER_FIELD_PROVENANCE: Readonly<Record<keyof HubCustomer, Provenance>> = {
  id: {
    source: 'no-producer',
    note: 'A stable identifier for the installer-to-household relationship. There is no such record today; partnerTag is free text on a CRM contact, not an entity with an id.',
  },
  firstName: {
    source: 'installer-input',
    note: 'Typed on add. Also present on the platform once the household signs up, at which point the two may disagree — the platform value should win for display.',
  },
  lastName: {
    source: 'installer-input',
    note: 'Typed on add, and the only thing that makes two households called John distinguishable in a list. Also present on the platform after signup, where the platform value should win.',
  },
  email: {
    source: 'installer-input',
    note: 'Typed on add, and the only join key available. Null on a link or QR share, which is precisely why that share type is flagged as risky in the invite copy.',
  },
  inverterMake: {
    source: 'installer-input',
    note: 'Captured on add because the installer is standing there and knows it. Enode compatibility decides whether the household can ever be controlled, so knowing it before the invite goes out is worth more than knowing it after.',
  },
  batterySizeKwh: {
    source: 'installer-input',
    note: 'Captured on add for the same reason. Battery size sets the household reward band, so it is commercially load-bearing rather than descriptive.',
  },
  addedOn: {
    source: 'no-producer',
    note: 'Hub-side. Requires the installer-to-household record above to exist.',
  },
  invite: {
    source: 'no-producer',
    note: 'Nothing tracks an invite. The live Hub writes "Email pending" on create and nothing ever moves it. Needs a real send plus delivery, bounce and unsubscribe feedback.',
  },
  inviteSince: {
    source: 'no-producer',
    note: 'As invite. Age is not optional: three days and six weeks are different problems.',
  },
  activation: {
    source: 'platform-today',
    note: 'Exists now. lumo_app_account_state on the HubSpot contact, derived by compute_account_state() in lumo-app-web. Ten values, and the installer view must carry all ten.',
  },
  activationSince: {
    source: 'platform-today',
    note: 'Partially available: the mirror carries lumo_app_smart_control_activated_at and capability timestamps, but not a general "entered this state on" date. Deriving the age of an arbitrary activation state needs a state-change timestamp the mirror does not currently emit.',
  },
  match: {
    source: 'no-producer',
    note: 'No join exists between an invited email and a Lumo account, so an unmatched household is indistinguishable from a lead that never converted.',
  },
  matchSince: {
    source: 'no-producer',
    note: 'As match. An unmatched household that has been unmatched for two months is a different conversation from one that signed up yesterday.',
  },
  qualification: {
    source: 'postgres',
    note: 'Derivable in principle: 30 consecutive days of active control is a question about control history, which Postgres holds. Needs an installer-scoped read path and a sticky qualifiedAt so a later drop cannot reopen a settled reward.',
  },
};

export const displayName = (c: HubCustomer): string => `${c.firstName} ${c.lastName}`;

/** Which fields the real build has to invent rather than read. */
export const fieldsWithNoProducer = (): readonly (keyof HubCustomer)[] =>
  (Object.keys(CUSTOMER_FIELD_PROVENANCE) as (keyof HubCustomer)[]).filter(
    (k) => CUSTOMER_FIELD_PROVENANCE[k].source === 'no-producer',
  );
