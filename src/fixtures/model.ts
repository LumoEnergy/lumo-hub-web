import type {
  ActivationStateId,
  ContactStateId,
  MatchStateId,
  QualificationInput,
} from '../state';

/**
 * THE DATA CONTRACT.
 *
 * This is the second durable output of the prototype. It is a UI view model, not a
 * storage shape: it says what a screen needs, and the provenance tables below say
 * where each field would have to come from.
 *
 * That split is deliberate. Shaping the fixtures as Firestore documents would
 * pre-commit the real build to Firestore plus callables, and the 2026-08-06 review
 * concluded the installer entity has to exist in Postgres with a verified household
 * association. A prototype should not quietly decide that. So the contract is the
 * view model plus the state enums, and the storage decision stays open.
 *
 * The provenance tables are typed as `Record<keyof T, Provenance>`, so a field added
 * to a view model without saying where it comes from is a compile error. That is the
 * mechanism that makes this a contract rather than a comment.
 *
 * TWO THINGS CHANGED WHEN THIS BECAME A BACK-BOOK CAMPAIGN, and both cost fields
 * their non-null guarantee:
 *
 *   1. THE COMPANY IS THE CUSTOMER. There is no personal account and no per-person
 *      attribution link. `HubCompany` owns the households and the money; `addedBy`
 *      survives on each household purely as an audit column, so the firm can see
 *      which of its own people supplied what. Lumo pays the firm.
 *
 *   2. AN IMPORTED BACK-BOOK CARRIES LESS DATA THAN A FRESH INSTALL, not more. A
 *      point-of-install capture would have the inverter make and battery size to
 *      hand because an engineer is standing in front of the kit. A CSV out of
 *      Commusoft or a pile of Xero invoices has a name, probably an address and
 *      maybe an email. So `email`, `inverterMake`, `batterySizeKwh` and `postcode`
 *      are all nullable, and the UI has to be honest about incomplete rows rather
 *      than rendering "undefined kWh". Pretending otherwise would design a screen
 *      for data that will not arrive.
 */

export interface HubCustomer {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  /**
   * `null` when the supplied list had no usable address. That is the single most
   * common defect in a real back-book and it is why `held_no_email` exists.
   */
  readonly email: string | null;
  /** `null` when the list did not say. Common — a job record is not a kit record. */
  readonly postcode: string | null;
  readonly inverterMake: string | null;
  readonly batterySizeKwh: number | null;
  /** ISO date this household arrived in Lumo, via an import or an ad-hoc add. */
  readonly importedOn: string;
  /** Which batch it came in on. An ad-hoc add is a batch of one. */
  readonly importBatchId: string;
  /**
   * The person at the firm who supplied this row. An AUDIT FIELD, not an identity
   * to pay: "which of my crews actually registers customers" is the most useful
   * management view the Hub can offer, and it does not imply a personal account.
   */
  readonly addedBy: string;
  readonly contact: ContactStateId;
  /** ISO date the contact state was last entered. */
  readonly contactSince: string;
  readonly activation: ActivationStateId;
  /** ISO date the activation state was last entered. This is the blocker age. */
  readonly activationSince: string;
  /** `null` until there is a Lumo account to match against. */
  readonly match: MatchStateId | null;
  /** ISO date the match state was determined. `null` when `match` is. */
  readonly matchSince: string | null;
  readonly qualification: QualificationInput;
}

/**
 * How the campaign email is sent, and how far up the authentication ladder this
 * firm has chosen to climb.
 *
 * `lumo_domain` needs nothing from the installer: Lumo's own sending domain, their
 * display name, their reply-to. It ships immediately and is what most firms will
 * accept.
 *
 * `delegated_subdomain` is the installer publishing DKIM and SPF records for a
 * subdomain of their own domain. It is NOT spoofing — DMARC passes precisely because
 * the domain owner published the key, which is the same mechanism behind every
 * "sent via" email from every brand. It authenticates as them and keeps their main
 * domain's reputation insulated. Ten minutes for whoever runs their website, and a
 * non-starter for a two-van firm, which is why the ladder exists at all.
 *
 * Which rung installers will actually accept is an open research question. It is a
 * named probe in the prototype rather than a decision taken on a hunch.
 */
export interface SenderConfig {
  readonly rung: 'lumo_domain' | 'delegated_subdomain';
  /** What lands in the From line. Always the firm, never Lumo. */
  readonly displayName: string;
  readonly replyTo: string;
  /** The domain that actually authenticates the mail, and appears in a "via" note. */
  readonly sendingDomain: string;
  readonly delegationVerified: boolean;
}

/**
 * The recorded confirmation that the back-book agreed to be contacted about products
 * relating to their installation.
 *
 * This is the lawful basis for the entire campaign. Lumo sends as a processor on the
 * firm's instruction, relying on the firm's own relationship with the household — so
 * who confirmed it and when has to be an auditable record, not a checkbox whose
 * value is thrown away. It protects the sending domain as much as the company: a
 * list without real permission produces the complaints that get every installer's
 * campaign filtered.
 */
export interface Attestation {
  readonly confirmedBy: string;
  readonly confirmedOn: string;
}

export interface HubSeat {
  readonly id: string;
  readonly name: string;
  readonly role: 'owner' | 'member';
  readonly isCurrentUser: boolean;
}

/**
 * A batch of households the firm handed over.
 *
 * The first imports are done by hand by Lumo staff from a spreadsheet the installer
 * emails over. That is the right call for the first few firms — it converts far
 * better than asking them to learn an upload screen, and it is how you find out what
 * real lists look like. It is also exactly why the outcome per row needs a real home
 * rather than living in whichever spreadsheet the person doing it kept.
 */
export interface ImportBatch {
  readonly id: string;
  readonly suppliedBy: string;
  readonly suppliedOn: string;
  /** Free text, because the answer is genuinely "a Commusoft export" or "an email". */
  readonly source: string;
  readonly rowsSupplied: number;
  readonly rowsLoaded: number;
  /** Held back because only the installer can resolve them. */
  readonly rowsHeld: number;
  readonly rowsRejected: number;
  /** Why rows were dropped outright, e.g. exact duplicates. `null` when none were. */
  readonly rejectedReason: string | null;
}

/**
 * The campaign email, and the firm's one-time sign-off on it.
 *
 * One approval covers the whole list and every later addition. Asking per batch —
 * still less per household — would reintroduce the friction this rebuild exists to
 * remove.
 */
export interface CampaignEmail {
  readonly subject: string;
  readonly preheader: string;
  /** Paragraphs, so the preview renders as an email rather than a blob. */
  readonly body: readonly string[];
  readonly approved: boolean;
  readonly approvedBy: string | null;
  readonly approvedOn: string | null;
}

export interface HubCompany {
  readonly id: string;
  readonly name: string;
  readonly seats: readonly HubSeat[];
  readonly sender: SenderConfig;
  /** `null` before the firm has confirmed permission. Nothing may send until it is not. */
  readonly attestation: Attestation | null;
  readonly campaignEmail: CampaignEmail;
  readonly imports: readonly ImportBatch[];
  /**
   * A COMPANY link for the firm's own channels — a customer newsletter, a Facebook
   * group, the "check your battery" email they already send. Deliberately not a
   * personal link and not a route for adding an individual: it is content they drop
   * into something they were writing anyway, in their most trusted channel, with no
   * data transfer and no permission question.
   */
  readonly selfServeLinkToken: string;
}

export type ProvenanceSource =
  /** Comes off the installer's own list, or is typed on an ad-hoc add. */
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
    note: 'A stable identifier for the company-to-household relationship, and the token the campaign email carries so attribution is a fact rather than an inference. Nothing like it exists today; partnerTag is free text on a CRM contact.',
  },
  firstName: {
    source: 'installer-input',
    note: 'From the supplied list. Also present on the platform once the household signs up, at which point the two may disagree — the platform value should win for display.',
  },
  lastName: {
    source: 'installer-input',
    note: 'From the supplied list, and the only thing that makes two households called John distinguishable in a table. The platform value should win after signup.',
  },
  email: {
    source: 'installer-input',
    note: 'From the supplied list, and the only thing that makes a send possible at all. Missing on a real back-book far more often than anyone expects, which is the whole reason the held-for-no-address state exists.',
  },
  postcode: {
    source: 'installer-input',
    note: 'From the supplied list. Load-bearing for two jobs rather than for display: de-duplicating a messy export, and resolving an ambiguous match without guessing which household is which.',
  },
  inverterMake: {
    source: 'installer-input',
    note: 'Often absent from a back-book export, because a job record is not a kit record. Enode compatibility decides whether a household can ever be controlled, so an unknown make is a real risk rather than a cosmetic gap.',
  },
  batterySizeKwh: {
    source: 'installer-input',
    note: 'Often absent for the same reason. Battery size sets the household reward band, so a null here is commercially load-bearing and must not be rendered as a zero.',
  },
  importedOn: {
    source: 'no-producer',
    note: 'Hub-side. Requires the import batch entity and the company-to-household record above, neither of which exists.',
  },
  importBatchId: {
    source: 'no-producer',
    note: 'Hub-side. Needed so a firm can see what happened to a list they handed over, which is the only reassurance available before any signup arrives.',
  },
  addedBy: {
    source: 'no-producer',
    note: 'Hub-side, and an audit column rather than an identity. Lumo owes the money to the firm; this exists so the firm can manage its own people and see which crews actually register customers.',
  },
  contact: {
    source: 'no-producer',
    note: 'Nothing tracks an outbound send. The live Hub writes "Email pending" on create and nothing ever moves it. Needs a real send plus delivered, bounced, opened, clicked, unsubscribed and complained feedback from the mail provider.',
  },
  contactSince: {
    source: 'no-producer',
    note: 'As contact. Age is not optional: delivered three days ago and ignored for six weeks are different problems with different answers.',
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
    note: 'No join exists between a contacted household and a Lumo account, so an unmatched household is indistinguishable from a lead that never converted.',
  },
  matchSince: {
    source: 'no-producer',
    note: 'As match. A household that has been unmatched for two months is a different conversation from one that signed up yesterday.',
  },
  qualification: {
    source: 'postgres',
    note: 'Derivable in principle: 30 consecutive days of active control is a question about control history, which Postgres holds. Needs a company-scoped read path and a sticky qualifiedAt so a later drop cannot reopen a settled reward.',
  },
};

export const COMPANY_FIELD_PROVENANCE: Readonly<Record<keyof HubCompany, Provenance>> = {
  id: {
    source: 'no-producer',
    note: 'There is no installer entity anywhere in the system of record. This is the single biggest gap in the register and it gates everything else the Hub does.',
  },
  name: {
    source: 'no-producer',
    note: 'As id. Today the same firm appears as gbsolar.co.uk and GB_Solar_Ltd, because identity is a free-text field rather than an entity with one name.',
  },
  seats: {
    source: 'no-producer',
    note: 'Multiple users under one company account, so a firm can invite colleagues without Lumo issuing personal accounts that own households. Nothing like this exists.',
  },
  sender: {
    source: 'no-producer',
    note: 'All outbound mail today is Lumo-branded transactional email from one domain. Sending on another party behalf, and optionally from a subdomain they have delegated, is entirely new.',
  },
  attestation: {
    source: 'no-producer',
    note: 'No consent or permission artefact exists for installer-sourced households. It is the lawful basis for the campaign, so nothing may send before it is recorded and auditable.',
  },
  campaignEmail: {
    source: 'no-producer',
    note: 'The transactional email registry holds exactly one template, admin-auth-alert, which is installer auth. There is no campaign template and no approval concept.',
  },
  imports: {
    source: 'no-producer',
    note: 'There is no bulk ingestion path and no notion of a row received but held back as unusable. The first imports are done by hand, which is why the outcomes still need a real home.',
  },
  selfServeLinkToken: {
    source: 'no-producer',
    note: 'A company-scoped link for the firm own marketing channels. The nearest thing today is partnerTag, a URL parameter the customer can type for themselves, which is not an attribution mechanism.',
  },
};

export const displayName = (c: HubCustomer): string => `${c.firstName} ${c.lastName}`;

/** Which household fields the real build has to invent rather than read. */
export const fieldsWithNoProducer = (): readonly (keyof HubCustomer)[] =>
  (Object.keys(CUSTOMER_FIELD_PROVENANCE) as (keyof HubCustomer)[]).filter(
    (k) => CUSTOMER_FIELD_PROVENANCE[k].source === 'no-producer',
  );

/** The current user's seat. Every persona has exactly one. */
export const currentSeat = (company: HubCompany): HubSeat =>
  company.seats.find((s) => s.isCurrentUser) ?? company.seats[0];

/** True when nothing may be sent yet, for either of the two reasons that block it. */
export const canSend = (company: HubCompany): boolean =>
  company.attestation !== null && company.campaignEmail.approved;
