import type { ActivationStateId, ContactStateId, MatchStateId } from '../state';
import type { HubCompany, HubCustomer, HubSeat, SenderConfig } from './model';

/**
 * The three personas.
 *
 * Research fidelity wins where the two audiences conflict. The aspirational demo
 * path is a subset of a complete state model, so a flattering persona can always
 * produce the good story — but a happy-path-only model cannot produce credible
 * research. So the model is complete and the persona chooses what you see.
 *
 * THE PERSONAS ARE CAMPAIGN STAGES, NOT PORTFOLIO SIZES. An earlier set assumed a
 * firm growing a list by adding households one at a time, which is not the job:
 * survival depends on getting the EXISTING back-book connected, and installation
 * lead times are too long for new fits to matter inside the runway. So each persona
 * is a point in the life of one handed-over customer list.
 *
 * DATES ARE STORED AS DAY OFFSETS, NOT AS DATES. A hardcoded date would mean a
 * blocker designed to read "3 days old" quietly becomes "3 weeks old" next month and
 * the messy persona stops testing what it was built to test. Offsets are materialised
 * against today at load.
 *
 * ROW COUNTS ARE REALISTIC ON PURPOSE. A back-book campaign is mostly silence: the
 * large majority of any list never responds, and a demo that hides that would set an
 * expectation the real product cannot meet. The bulk states are generated from a name
 * pool; every state that needs specific copy is written by hand.
 */

export type PersonaId = 'mid-campaign' | 'awaiting-approval' | 'messy-list';

export const PERSONA_IDS: readonly PersonaId[] = [
  'mid-campaign',
  'awaiting-approval',
  'messy-list',
];

export const DEFAULT_PERSONA: PersonaId = 'mid-campaign';

interface AttestationSeed {
  readonly confirmedBy: string;
  readonly confirmedDaysAgo: number;
}

interface CampaignEmailSeed {
  readonly subject: string;
  readonly preheader: string;
  readonly body: readonly string[];
  readonly approvedBy: string | null;
  readonly approvedDaysAgo: number | null;
}

interface ImportSeed {
  readonly id: string;
  readonly filename: string | null;
  readonly arrivedBy: 'emailed' | 'uploaded' | 'by_hand';
  readonly status: 'processing' | 'loaded';
  readonly suppliedBy: string;
  readonly suppliedDaysAgo: number;
  readonly source: string;
  readonly rowsSupplied: number;
  readonly rowsLoaded: number | null;
  readonly rowsHeld: number | null;
  readonly rowsRejected: number | null;
  readonly rejectedReason: string | null;
}

interface SendBatchSeed {
  readonly id: string;
  /** Negative is the past. Positive is scheduled. */
  readonly dayOffset: number;
  readonly count: number;
  readonly status: 'sent' | 'sending' | 'scheduled';
  readonly opened: number | null;
}

interface CompanySeed {
  readonly id: string;
  readonly name: string;
  readonly seats: readonly HubSeat[];
  readonly sender: SenderConfig;
  readonly attestation: AttestationSeed | null;
  readonly campaignEmail: CampaignEmailSeed;
  readonly imports: readonly ImportSeed[];
  readonly schedule: readonly SendBatchSeed[];
  readonly dailySendCap: number;
  readonly selfServeLinkToken: string;
}

export interface Persona {
  readonly id: PersonaId;
  readonly name: string;
  /** Who this persona is for, and what it is meant to settle. */
  readonly purpose: string;
  readonly company: CompanySeed;
  readonly customers: readonly CustomerSeed[];
}

interface CustomerSeed {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string | null;
  readonly postcode: string | null;
  readonly inverterMake: string | null;
  readonly batterySizeKwh: number | null;
  readonly importedDaysAgo: number;
  readonly importBatchId: string;
  readonly addedBy: string;
  readonly contact: ContactStateId;
  readonly contactSinceDaysAgo: number;
  readonly activation: ActivationStateId;
  readonly activationSinceDaysAgo: number;
  readonly match: MatchStateId | null;
  readonly matchSinceDaysAgo: number | null;
  readonly everActive: boolean;
  readonly controlActiveSinceDaysAgo: number | null;
  readonly qualifiedDaysAgo: number | null;
  readonly paidDaysAgo: number | null;
}

const INVERTERS = [
  'GivEnergy',
  'SolarEdge',
  'Fox ESS',
  'Tesla',
  'Sungrow',
  'SolaX',
  'Growatt',
  'Huawei',
] as const;

const BATTERY_SIZES = [5.2, 8.2, 9.5, 10.4, 13.5, 16.0, 20.8] as const;

const FIRST_NAMES = [
  'Marion', 'Devin', 'Saoirse', 'Ranjit', 'Elspeth', 'Callum', 'Yolanda', 'Fergus',
  'Imogen', 'Rowan', 'Malcolm', 'Verity', 'Otis', 'Delphine', 'Cordelia', 'Hamish',
  'Millie', 'Lorenzo', 'Jasper', 'Priya', 'Nadia', 'Orla', 'Bea', 'Tomas',
  'Dermot', 'Ffion', 'Gareth', 'Harriet', 'Idris', 'Juno', 'Keir', 'Lena',
  'Moira', 'Niall', 'Ottoline', 'Piers', 'Quentin', 'Rhona', 'Sorcha', 'Torin',
  'Ualtar', 'Vita', 'Wilf', 'Xanthe', 'Yusuf', 'Zara', 'Aneurin', 'Bronwen',
  'Cormac', 'Dilys', 'Eamon', 'Freya', 'Gwilym', 'Hestia', 'Isolde', 'Jonty',
  'Kester', 'Lowri', 'Meredith', 'Nesta',
] as const;

const LAST_NAMES = [
  'Ashworth', 'Blackwood', 'Cavendish', 'Dunlop', 'Fairbanks', 'Galbraith',
  'Ingham', 'Jardine', 'Kettering', 'Langford', 'Northcote', 'Ormerod',
  'Pemberton', 'Ravenscroft', 'Zielinski', 'Yardley', 'Delacroix', 'Chatterjee',
  'Ellsworth', 'Whittaker', 'Osei', 'Byrne', 'Whitlock', 'Lindqvist',
  'Kelly', 'Prydderch', 'Meredith', 'Sandringham', 'Okonjo', 'Fitzwilliam',
  'Balfour', 'Thorne', 'Vasquez', 'Underhill', 'Rosenthal', 'Quainton',
  'Pargeter', 'Oyelaran', 'Nightingale', 'Mostyn', 'Larkham', 'Kirkbride',
  'Jephcott', 'Ivorson', 'Hollingworth', 'Grimsdale', 'Fotheringay', 'Enderby',
  'Dalgleish', 'Crowhurst', 'Bramwell', 'Aldridge', 'Wetherby', 'Vane',
  'Trenholme', 'Studholme', 'Rackham', 'Pilkington', 'Ombler', 'Naismith',
] as const;

const POSTCODE_AREAS = ['LS', 'BD', 'HX', 'WF', 'HD', 'YO', 'S', 'DN'] as const;

/** Deterministic, so a demo looks the same every time it is opened. */
const nameAt = (i: number) => ({
  firstName: FIRST_NAMES[i % FIRST_NAMES.length],
  lastName: LAST_NAMES[(i * 7 + 3) % LAST_NAMES.length],
});

const postcodeAt = (i: number) =>
  `${POSTCODE_AREAS[i % POSTCODE_AREAS.length]}${(i % 27) + 1} ${(i % 9) + 1}${
    'ABDEFGHJLNPQRSTUWXYZ'[i % 20]
  }${'ABDEFGHJLNPQRSTUWXYZ'[(i * 3) % 20]}`;

const emailFor = (firstName: string, lastName: string) =>
  `${firstName}.${lastName}@example.com`.toLowerCase();

/**
 * Base seed. Every archetype below is this with a few fields replaced, which keeps
 * the difference between two states visible instead of buried in duplication.
 */
const base = (i: number, batchId: string, addedBy: string): CustomerSeed => {
  const { firstName, lastName } = nameAt(i);
  return {
    id: `${batchId}-${String(i).padStart(3, '0')}`,
    firstName,
    lastName,
    email: emailFor(firstName, lastName),
    postcode: postcodeAt(i),
    inverterMake: INVERTERS[i % INVERTERS.length],
    batterySizeKwh: BATTERY_SIZES[i % BATTERY_SIZES.length],
    importedDaysAgo: 38,
    importBatchId: batchId,
    addedBy,
    contact: 'sent',
    contactSinceDaysAgo: 30,
    activation: 'no_account',
    activationSinceDaysAgo: 30,
    match: null,
    matchSinceDaysAgo: null,
    everActive: false,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  };
};

type Archetype = (seed: CustomerSeed, i: number) => CustomerSeed;

/** Signed up, control running, 30 days served, money already paid out. */
const earningPaid: Archetype = (s, i) => {
  const activeDaysAgo = 40 + (i % 90);
  return {
    ...s,
    contact: 'signed_up',
    contactSinceDaysAgo: activeDaysAgo + 6,
    activation: 'Smart Control Active',
    activationSinceDaysAgo: activeDaysAgo,
    match: 'matched_import',
    matchSinceDaysAgo: activeDaysAgo + 6,
    everActive: true,
    controlActiveSinceDaysAgo: activeDaysAgo,
    qualifiedDaysAgo: activeDaysAgo - 30,
    paidDaysAgo: Math.max(1, activeDaysAgo - 38),
  };
};

/** Served the 30 days, awaiting the next monthly pay run. */
const earningConfirmed: Archetype = (s, i) => {
  const activeDaysAgo = 33 + (i % 5);
  return {
    ...s,
    contact: 'signed_up',
    contactSinceDaysAgo: activeDaysAgo + 5,
    activation: 'Smart Control Active',
    activationSinceDaysAgo: activeDaysAgo,
    match: 'matched_import',
    matchSinceDaysAgo: activeDaysAgo + 5,
    everActive: true,
    controlActiveSinceDaysAgo: activeDaysAgo,
    qualifiedDaysAgo: activeDaysAgo - 30,
    paidDaysAgo: null,
  };
};

/** Mid-clock. Nothing to do but wait, which the queue must not present as a task. */
const qualifying: Archetype = (s, i) => {
  const activeDaysAgo = 4 + (i % 24);
  return {
    ...s,
    contact: 'signed_up',
    contactSinceDaysAgo: activeDaysAgo + 3,
    activation: 'Smart Control Active',
    activationSinceDaysAgo: activeDaysAgo,
    match: 'matched_import',
    matchSinceDaysAgo: activeDaysAgo + 3,
    everActive: true,
    controlActiveSinceDaysAgo: activeDaysAgo,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  };
};

/** Signed up but stuck somewhere in setup. The activation track owns the copy. */
const stuckAt =
  (activation: ActivationStateId, sinceDaysAgo: number, everActive = false): Archetype =>
  (s) => ({
    ...s,
    contact: 'signed_up',
    contactSinceDaysAgo: sinceDaysAgo + 4,
    activation,
    activationSinceDaysAgo: sinceDaysAgo,
    match: 'matched_import',
    matchSinceDaysAgo: sinceDaysAgo + 4,
    everActive,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  });

const inContactState =
  (contact: ContactStateId, sinceDaysAgo: number): Archetype =>
  (s) => ({ ...s, contact, contactSinceDaysAgo: sinceDaysAgo });

/** Loaded and cleaned, waiting its turn in the send schedule. */
const queued: Archetype = (s, i) => ({
  ...s,
  contact: 'queued',
  contactSinceDaysAgo: 30 - (i % 5),
});

/** Held for a missing address: the list simply had no email for them. */
const heldNoEmail: Archetype = (s) => ({
  ...s,
  email: null,
  contact: 'held_no_email',
  contactSinceDaysAgo: 38,
});

/** Held because the export does not say whether there is a battery at all. */
const heldUnconfirmed: Archetype = (s) => ({
  ...s,
  inverterMake: null,
  batterySizeKwh: null,
  contact: 'held_unconfirmed',
  contactSinceDaysAgo: 38,
});

const bulk = (
  archetype: Archetype,
  count: number,
  from: number,
  batchId: string,
  addedBy: string,
): CustomerSeed[] =>
  Array.from({ length: count }, (_, n) => {
    const i = from + n;
    return archetype(base(i, batchId, addedBy), i);
  });

/**
 * The campaign email itself, and a research artefact in its own right.
 *
 * Written to be sent BY the installer, not by Lumo: the firm has the relationship
 * and the permission, and the reply-to comes back to them. Note what is absent —
 * there is no savings figure and no annual estimate, because nothing in the estate
 * can currently substantiate a per-household number and a claim the product cannot
 * back is how a channel dies. If a defensible figure ever exists, this is the one
 * place to add it.
 */
const CAMPAIGN_EMAIL = {
  subject: 'Switching your battery over to smart control',
  preheader: "We've partnered with Lumo to get more out of the battery we fitted for you.",
  body: [
    'When we fitted your battery we set it up to store your solar. Since then we have partnered with Lumo, who can control it automatically against your electricity tariff — charging it when power is cheap and using it when it is not.',
    'There is nothing to install and nothing to pay. It connects to the inverter you already have, and you stay in charge: you can switch it off again whenever you like.',
    'It takes about five minutes to set up. If you would rather ask us first, just reply to this email and it comes straight back to us.',
  ],
} as const;

// -----------------------------------------------------------------------------
// MID-CAMPAIGN — the founder and investor demo.
//
// Northfield Renewables emailed over 840 past jobs five weeks ago. 808 loaded, and
// the campaign is genuinely mid-flight: 486 emailed so far, 288 still queued behind
// a 100-a-day cap, 34 held for things only the firm can answer.
//
// THE LIST IS THIS BIG ON PURPOSE, AND IT IS THE MOST IMPORTANT NUMBER IN THE DEMO.
// An earlier version had 237 households and 37 sign-ups, which is a 20% conversion
// on a cold-ish back-book email. Nobody who has run an email campaign believes that,
// and a funnel a founder can dismiss in one glance takes the rest of the product
// down with it. Eight hundred households and the same 37 sign-ups is 8% of those
// delivered — good, plausible, and defensible in the room. It is also simply a more
// honest picture of an installer with a decade of fits behind them.
// -----------------------------------------------------------------------------

const NORTHFIELD_SEATS: readonly HubSeat[] = [
  { id: 'seat-1', name: 'Ade Bankole', role: 'owner', isCurrentUser: true },
  { id: 'seat-2', name: 'Sean Docherty', role: 'member', isCurrentUser: false },
  { id: 'seat-3', name: 'Rita Mensah', role: 'member', isCurrentUser: false },
];

const MID_CAMPAIGN_CUSTOMERS: readonly CustomerSeed[] = [
  // The money. 14 paid, 6 confirmed and awaiting the pay run, 5 mid-clock.
  ...bulk(earningPaid, 13, 0, 'imp-1', 'Ade Bankole'),
  // Paid, and the customer has since turned control off. The whole point of writing
  // "confirmed is final" down: the firm did their job, the money stays theirs, and
  // nothing here may imply otherwise. Without a row in this state the clawback copy
  // is untested prose.
  {
    ...earningPaid(base(13, 'imp-1', 'Rita Mensah'), 13),
    activation: 'Smart Control Inactive',
    activationSinceDaysAgo: 9,
    controlActiveSinceDaysAgo: null,
  },
  ...bulk(earningConfirmed, 6, 14, 'imp-1', 'Ade Bankole'),
  ...bulk(qualifying, 5, 20, 'imp-1', 'Sean Docherty'),

  // Signed up and stuck. Every activation state that can block, so the ownership
  // grouping has something real to sort.
  stuckAt('Device Disconnected', 4)(base(25, 'imp-1', 'Sean Docherty'), 25),
  stuckAt('Needs Relink', 11)(base(26, 'imp-1', 'Ade Bankole'), 26),
  stuckAt('Smart Control Inactive', 22, true)(base(27, 'imp-1', 'Rita Mensah'), 27),
  stuckAt('Setup Incomplete', 9)(base(28, 'imp-1', 'Rita Mensah'), 28),
  stuckAt('Linked, No Tariff', 16)(base(29, 'imp-1', 'Ade Bankole'), 29),
  stuckAt('Not Linked', 6)(base(30, 'imp-1', 'Sean Docherty'), 30),
  stuckAt('Smart Control Test Running', 2)(base(31, 'imp-1', 'Ade Bankole'), 31),
  stuckAt('Smart Control Test Failed', 5)(base(32, 'imp-1', 'Rita Mensah'), 32),
  stuckAt('Smart Control Check Incomplete', 3)(base(33, 'imp-1', 'Ade Bankole'), 33),

  // Earning perfectly well, credited to nobody. The state that eats a £50 silently.
  {
    ...earningPaid(base(34, 'imp-1', 'Ade Bankole'), 34),
    contact: 'signed_up',
    match: 'unmatched_different_email',
    matchSinceDaysAgo: 21,
    paidDaysAgo: null,
    qualifiedDaysAgo: 12,
  },
  {
    ...qualifying(base(35, 'imp-1', 'Rita Mensah'), 35),
    match: 'ambiguous',
    matchSinceDaysAgo: 8,
  },
  // Was unmatched, queried, and tied to the firm by hand. Proves the unmatched row
  // above has an exit rather than being a dead end.
  {
    ...earningConfirmed(base(36, 'imp-1', 'Ade Bankole'), 36),
    match: 'matched_manual',
    matchSinceDaysAgo: 6,
  },

  // The warm leads: clicked through and stopped. The firm's actual reason to log in.
  ...bulk(inContactState('clicked', 9), 14, 37, 'imp-1', 'Sean Docherty'),

  // Opened and went no further.
  ...bulk(inContactState('opened', 17), 40, 51, 'imp-1', 'Ade Bankole'),

  // Delivered days ago and nothing has happened yet, which is not a problem and must
  // not be presented as one. A queue that chases a three-day-old email is a queue
  // that gets ignored.
  ...bulk(inContactState('sent', 3), 12, 91, 'imp-1', 'Rita Mensah'),

  // The silent majority. A back-book campaign is mostly this, and hiding it would
  // set an expectation the real product cannot meet.
  ...bulk(inContactState('no_response', 26), 320, 103, 'imp-1', 'Ade Bankole'),

  // Dead addresses. Routine on a book this old, and each one is a recoverable £50.
  // 45 of 486 is a 9% bounce rate, which is what a decade-old customer book does.
  ...bulk(inContactState('bounced', 24), 45, 423, 'imp-1', 'Sean Docherty'),

  ...bulk(inContactState('unsubscribed', 22), 15, 468, 'imp-1', 'Ade Bankole'),
  ...bulk(inContactState('complained', 20), 3, 483, 'imp-1', 'Ade Bankole'),

  // Cleaned, approved, and simply not their turn yet. This is the state the send
  // schedule is about, and without it the schedule screen is describing nothing.
  ...bulk(queued, 288, 486, 'imp-1', 'Ade Bankole'),

  // Held back. The only work the product asks of them, and where the £50s hide.
  ...bulk(heldNoEmail, 28, 774, 'imp-1', 'Rita Mensah'),
  ...bulk(heldUnconfirmed, 6, 802, 'imp-1', 'Rita Mensah'),
];

/**
 * Five sent, three to go, at a hundred a day.
 *
 * The opened counts per batch are not decoration: they are the only place a firm can
 * see that the channel is behaving consistently rather than degrading, which is the
 * early warning that a domain is going off.
 */
const NORTHFIELD_SCHEDULE: readonly SendBatchSeed[] = [
  { id: 'b1', dayOffset: -14, count: 100, status: 'sent', opened: 20 },
  { id: 'b2', dayOffset: -12, count: 100, status: 'sent', opened: 18 },
  { id: 'b3', dayOffset: -9, count: 100, status: 'sent', opened: 19 },
  { id: 'b4', dayOffset: -7, count: 100, status: 'sent', opened: 17 },
  { id: 'b5', dayOffset: -5, count: 86, status: 'sent', opened: 17 },
  { id: 'b6', dayOffset: 1, count: 100, status: 'scheduled', opened: null },
  { id: 'b7', dayOffset: 2, count: 100, status: 'scheduled', opened: null },
  { id: 'b8', dayOffset: 3, count: 88, status: 'scheduled', opened: null },
];

const MID_CAMPAIGN: Persona = {
  id: 'mid-campaign',
  name: 'Mid-campaign',
  purpose:
    'The investor and internal demo. A back-book campaign a month in: money landing, a dozen warm leads worth calling, and a short list only the firm can unblock.',
  company: {
    id: 'co-northfield',
    name: 'Northfield Renewables',
    seats: NORTHFIELD_SEATS,
    // ON THE LOWER RUNG DELIBERATELY, even though this is the flagship persona.
    // The demo has to show the state every firm starts in and can ship on today,
    // with the domain upgrade sitting next to it as a visible, optional step. A
    // flagship already on the top rung would demo a configuration nobody has yet.
    sender: {
      rung: 'lumo_domain',
      displayName: 'Northfield Renewables',
      replyTo: 'hello@northfieldrenewables.co.uk',
      sendingDomain: 'send.lumopartners.co.uk',
      delegationVerified: false,
    },
    attestation: { confirmedBy: 'Ade Bankole', confirmedDaysAgo: 40 },
    campaignEmail: {
      ...CAMPAIGN_EMAIL,
      approvedBy: 'Ade Bankole',
      approvedDaysAgo: 37,
    },
    imports: [
      {
        id: 'imp-1',
        filename: 'commusoft-battery-jobs-2021-2026.csv',
        arrivedBy: 'emailed',
        status: 'loaded',
        suppliedBy: 'Ade Bankole',
        suppliedDaysAgo: 39,
        source: 'Commusoft export, all jobs tagged battery since 2021',
        rowsSupplied: 840,
        rowsLoaded: 808,
        rowsHeld: 34,
        rowsRejected: 32,
        rejectedReason:
          'Thirty-two rows were exact duplicates of another row in the same file, same name and same address.',
      },
      // Still being worked through. The demo needs one of these visible: it is the
      // whole reason the screen has a status column, and it is what makes "we do
      // this in our own time and tell you when it is done" a promise rather than
      // an apology for a slow page.
      {
        id: 'imp-2',
        filename: 'new-fits-jan-to-aug.csv',
        arrivedBy: 'uploaded',
        status: 'processing',
        suppliedBy: 'Sean Docherty',
        suppliedDaysAgo: 1,
        source: 'Uploaded from the Hub',
        rowsSupplied: 96,
        rowsLoaded: null,
        rowsHeld: null,
        rowsRejected: null,
        rejectedReason: null,
      },
    ],
    schedule: NORTHFIELD_SCHEDULE,
    dailySendCap: 100,
    selfServeLinkToken: 'northfield',
  },
  customers: MID_CAMPAIGN_CUSTOMERS,
};

// -----------------------------------------------------------------------------
// AWAITING APPROVAL — the onboarding promise, tested.
//
// Kestrel Electrical signed up four days ago and emailed over a spreadsheet. Lumo
// has loaded and cleaned it. Nothing has been sent, because the one sign-off the
// product asks for has not happened yet.
//
// The question this persona exists to answer: does an installer who has done nothing
// but hand over a file understand what happens next, and does one approval feel like
// a fair ask? There is no money on this screen and there must be no forecast of any.
// -----------------------------------------------------------------------------

const KESTREL_SEATS: readonly HubSeat[] = [
  { id: 'seat-1', name: 'Joanne Pike', role: 'owner', isCurrentUser: true },
  { id: 'seat-2', name: 'Dev Raichura', role: 'member', isCurrentUser: false },
];

const AWAITING_APPROVAL_CUSTOMERS: readonly CustomerSeed[] = [
  ...bulk(inContactState('awaiting_approval', 2), 118, 0, 'imp-1', 'Joanne Pike'),
  ...bulk(heldNoEmail, 24, 118, 'imp-1', 'Joanne Pike'),
  ...bulk(heldUnconfirmed, 10, 142, 'imp-1', 'Joanne Pike'),
];

const AWAITING_APPROVAL: Persona = {
  id: 'awaiting-approval',
  name: 'Awaiting approval',
  purpose:
    'The onboarding promise. A firm four days in: list handed over, cleaned by Lumo, nothing sent. Tests whether one approval reads as a fair ask and what the held rows communicate.',
  company: {
    id: 'co-kestrel',
    name: 'Kestrel Electrical',
    seats: KESTREL_SEATS,
    sender: {
      rung: 'lumo_domain',
      displayName: 'Kestrel Electrical',
      replyTo: 'jo@kestrel-electrical.co.uk',
      sendingDomain: 'send.lumopartners.co.uk',
      delegationVerified: false,
    },
    attestation: { confirmedBy: 'Joanne Pike', confirmedDaysAgo: 4 },
    campaignEmail: {
      ...CAMPAIGN_EMAIL,
      approvedBy: null,
      approvedDaysAgo: null,
    },
    imports: [
      {
        id: 'imp-1',
        filename: 'kestrel-customers.xlsx',
        arrivedBy: 'emailed',
        status: 'loaded',
        suppliedBy: 'Joanne Pike',
        suppliedDaysAgo: 3,
        source: 'Spreadsheet emailed to Lumo, exported from Xero',
        rowsSupplied: 160,
        rowsLoaded: 152,
        rowsHeld: 34,
        rowsRejected: 8,
        rejectedReason:
          'Eight rows had no name and no address, so there was nothing to identify a household by.',
      },
    ],
    // Nothing has sent, so every batch is still ahead of them and the dates are
    // meaningless — the UI renders these as "day 1, day 2" until approval starts
    // the clock. 50 a day, because a domain with no sending history that opens with
    // 118 emails in a minute is a domain that gets filtered.
    schedule: [
      { id: 'b1', dayOffset: 1, count: 50, status: 'scheduled', opened: null },
      { id: 'b2', dayOffset: 2, count: 50, status: 'scheduled', opened: null },
      { id: 'b3', dayOffset: 3, count: 18, status: 'scheduled', opened: null },
    ],
    dailySendCap: 50,
    selfServeLinkToken: 'kestrel',
  },
  customers: AWAITING_APPROVAL_CUSTOMERS,
};

// -----------------------------------------------------------------------------
// MESSY LIST — the research conversation.
//
// Fenwick Solar handed over a genuinely bad export: nearly half the rows had no
// usable email, the addresses are old enough that a lot bounced, and two households
// reported the email as spam. Two are earning despite all of it.
//
// This is the persona for the hard questions. Whose fault is a filthy list, what
// will a firm actually do about 41 missing addresses, and does a complaint shown
// honestly cost trust or earn it?
// -----------------------------------------------------------------------------

const FENWICK_SEATS: readonly HubSeat[] = [
  { id: 'seat-1', name: 'Gordon Fenwick', role: 'owner', isCurrentUser: true },
];

const MESSY_CUSTOMERS: readonly CustomerSeed[] = [
  ...bulk(earningPaid, 1, 0, 'imp-1', 'Gordon Fenwick'),
  ...bulk(qualifying, 2, 1, 'imp-1', 'Gordon Fenwick'),

  stuckAt('Device Disconnected', 2)(base(3, 'imp-1', 'Gordon Fenwick'), 3),
  stuckAt('Not Linked', 7)(base(4, 'imp-1', 'Gordon Fenwick'), 4),
  stuckAt('Linked, No Tariff', 11)(base(5, 'imp-1', 'Gordon Fenwick'), 5),
  stuckAt('Smart Control Inactive', 24, true)(base(6, 'imp-1', 'Gordon Fenwick'), 6),

  // On Lumo, running, credited to nobody, and stale enough to be embarrassing.
  {
    ...earningConfirmed(base(7, 'imp-1', 'Gordon Fenwick'), 7),
    match: 'unmatched_different_email',
    matchSinceDaysAgo: 44,
    paidDaysAgo: null,
  },

  ...bulk(inContactState('clicked', 12), 3, 8, 'imp-1', 'Gordon Fenwick'),
  ...bulk(inContactState('opened', 19), 7, 11, 'imp-1', 'Gordon Fenwick'),
  ...bulk(inContactState('no_response', 28), 22, 18, 'imp-1', 'Gordon Fenwick'),

  // The bounce rate that damages a sending domain, and the two complaints that
  // prove why the attestation matters.
  ...bulk(inContactState('bounced', 27), 14, 40, 'imp-1', 'Gordon Fenwick'),
  ...bulk(inContactState('complained', 26), 2, 54, 'imp-1', 'Gordon Fenwick'),
  ...bulk(inContactState('unsubscribed', 25), 4, 56, 'imp-1', 'Gordon Fenwick'),

  // Nearly half the list, unusable, and only he can fix it.
  ...bulk(heldNoEmail, 41, 60, 'imp-1', 'Gordon Fenwick'),
  ...bulk(heldUnconfirmed, 9, 101, 'imp-1', 'Gordon Fenwick'),
];

const MESSY_LIST: Persona = {
  id: 'messy-list',
  name: 'Messy list',
  purpose:
    'The research conversation. A filthy export: nearly half the rows unusable, a bounce rate that hurts deliverability, two spam complaints, and two households earning anyway.',
  company: {
    id: 'co-fenwick',
    name: 'Fenwick Solar',
    seats: FENWICK_SEATS,
    // THE ONE PERSONA ON THE TOP RUNG, and it belongs here rather than on the
    // flagship. Gordon's web person published the records, so this list sends from
    // his own domain — and his list is the filthy one. That is a sharper research
    // conversation than the same config on a clean list: a 23% bounce rate and two
    // spam complaints are now damaging the reputation of fenwicksolar.co.uk, which
    // is his asset rather than ours, and it is the most concrete argument the
    // product has for why list quality is not somebody else's problem.
    sender: {
      rung: 'delegated_subdomain',
      displayName: 'Fenwick Solar',
      replyTo: 'gordon@fenwicksolar.co.uk',
      sendingDomain: 'lumo.fenwicksolar.co.uk',
      delegationVerified: true,
    },
    attestation: { confirmedBy: 'Gordon Fenwick', confirmedDaysAgo: 33 },
    campaignEmail: {
      ...CAMPAIGN_EMAIL,
      approvedBy: 'Gordon Fenwick',
      approvedDaysAgo: 31,
    },
    imports: [
      {
        id: 'imp-1',
        filename: 'fenwick-lists-merged.csv',
        arrivedBy: 'emailed',
        status: 'loaded',
        suppliedBy: 'Gordon Fenwick',
        suppliedDaysAgo: 32,
        source: 'Two spreadsheets and a CSV, merged by hand at Lumo',
        rowsSupplied: 138,
        rowsLoaded: 110,
        rowsHeld: 50,
        rowsRejected: 28,
        rejectedReason:
          'Twenty-eight rows were duplicated across the three files, or were commercial sites with no household to contact.',
      },
    ],
    schedule: [
      { id: 'b1', dayOffset: -30, count: 50, status: 'sent', opened: 15 },
      { id: 'b2', dayOffset: -28, count: 10, status: 'sent', opened: 3 },
    ],
    dailySendCap: 50,
    selfServeLinkToken: 'fenwick',
  },
  customers: MESSY_CUSTOMERS,
};

export const PERSONAS: Readonly<Record<PersonaId, Persona>> = {
  'mid-campaign': MID_CAMPAIGN,
  'awaiting-approval': AWAITING_APPROVAL,
  'messy-list': MESSY_LIST,
};

/** Day offsets to ISO dates, resolved against a single `today` for consistency. */
const isoDaysAgo = (today: Date, days: number): string => {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

export interface MaterialisedPersona {
  readonly id: PersonaId;
  readonly name: string;
  readonly purpose: string;
  /**
   * `HubCompany` itself, not a structural copy of it. The copy that used to live here
   * meant every field added to the contract had to be added in two places, and the
   * one that got missed failed as a type error somewhere unrelated.
   */
  readonly company: HubCompany;
  readonly customers: readonly HubCustomer[];
  /** The date everything was resolved against, so the UI ages blockers consistently. */
  readonly asOf: string;
}

export function materialise(persona: Persona, today = new Date()): MaterialisedPersona {
  const at = (days: number) => isoDaysAgo(today, days);
  const { company } = persona;

  return {
    id: persona.id,
    name: persona.name,
    purpose: persona.purpose,
    company: {
      id: company.id,
      name: company.name,
      seats: company.seats,
      sender: company.sender,
      attestation: company.attestation
        ? {
            confirmedBy: company.attestation.confirmedBy,
            confirmedOn: at(company.attestation.confirmedDaysAgo),
          }
        : null,
      campaignEmail: {
        subject: company.campaignEmail.subject,
        preheader: company.campaignEmail.preheader,
        body: company.campaignEmail.body,
        approved: company.campaignEmail.approvedDaysAgo !== null,
        approvedBy: company.campaignEmail.approvedBy,
        approvedOn:
          company.campaignEmail.approvedDaysAgo === null
            ? null
            : at(company.campaignEmail.approvedDaysAgo),
      },
      imports: company.imports.map((b) => ({
        id: b.id,
        filename: b.filename,
        arrivedBy: b.arrivedBy,
        status: b.status,
        suppliedBy: b.suppliedBy,
        suppliedOn: at(b.suppliedDaysAgo),
        source: b.source,
        rowsSupplied: b.rowsSupplied,
        rowsLoaded: b.rowsLoaded,
        rowsHeld: b.rowsHeld,
        rowsRejected: b.rowsRejected,
        rejectedReason: b.rejectedReason,
      })),
      schedule: company.schedule.map((b) => ({
        id: b.id,
        date: at(-b.dayOffset),
        count: b.count,
        status: b.status,
        opened: b.opened,
      })),
      dailySendCap: company.dailySendCap,
      selfServeLinkToken: company.selfServeLinkToken,
    },
    customers: persona.customers.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      postcode: c.postcode,
      inverterMake: c.inverterMake,
      batterySizeKwh: c.batterySizeKwh,
      importedOn: at(c.importedDaysAgo),
      importBatchId: c.importBatchId,
      addedBy: c.addedBy,
      contact: c.contact,
      contactSince: at(c.contactSinceDaysAgo),
      activation: c.activation,
      activationSince: at(c.activationSinceDaysAgo),
      match: c.match,
      matchSince: c.matchSinceDaysAgo === null ? null : at(c.matchSinceDaysAgo),
      qualification: {
        everActive: c.everActive,
        controlActiveSince:
          c.controlActiveSinceDaysAgo === null ? null : at(c.controlActiveSinceDaysAgo),
        qualifiedAt: c.qualifiedDaysAgo === null ? null : at(c.qualifiedDaysAgo),
        paidAt: c.paidDaysAgo === null ? null : at(c.paidDaysAgo),
      },
    })),
    asOf: at(0),
  };
}
