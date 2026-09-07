import type { ActivationStateId, InviteStateId, MatchStateId } from '../state';
import type { HubCustomer } from './model';

/**
 * The three personas.
 *
 * Research fidelity wins where the two audiences conflict. The aspirational demo
 * path is a subset of a complete state model, so a flattering persona can always
 * produce the good story — but a happy-path-only model cannot produce credible
 * research. So the model is complete and the persona chooses what you see.
 *
 * DATES ARE STORED AS DAY OFFSETS, NOT AS DATES. A hardcoded date would mean a
 * blocker designed to read "3 days old" quietly becomes "3 weeks old" next month and
 * the messy persona stops testing what it was built to test. Offsets are materialised
 * against today at load.
 */

export type PersonaId = 'established' | 'first-run' | 'messy';

export const PERSONA_IDS: readonly PersonaId[] = ['established', 'first-run', 'messy'];

export const DEFAULT_PERSONA: PersonaId = 'established';

export interface Persona {
  readonly id: PersonaId;
  readonly name: string;
  /** Who this persona is for, and what it is meant to settle. */
  readonly purpose: string;
  readonly installer: {
    readonly firstName: string;
    readonly lastName: string;
    readonly company: string;
    /**
     * Personal to the individual, never the company domain. The incentive only works
     * if you can pay the person who did the work, and today's partnerTag records an
     * email domain, so the same firm appears as several installers and four staff at
     * one company would share a single link.
     */
    readonly linkToken: string;
  };
  readonly customers: readonly CustomerSeed[];
}

interface CustomerSeed {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string | null;
  readonly inverterMake: string;
  readonly batterySizeKwh: number;
  readonly addedDaysAgo: number;
  readonly invite: InviteStateId;
  readonly inviteSinceDaysAgo: number;
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

/** An earning, long-standing, already-paid household. The bulk of a healthy list. */
const earningAndPaid = (
  id: string,
  firstName: string,
  lastName: string,
  inverterIndex: number,
  batterySizeKwh: number,
  activeDaysAgo: number,
  invite: InviteStateId = 'sent_by_lumo',
  match: MatchStateId = 'matched_email',
): CustomerSeed => ({
  id,
  firstName,
  lastName,
  email: `${firstName}.${lastName}@example.com`.toLowerCase(),
  inverterMake: INVERTERS[inverterIndex % INVERTERS.length],
  batterySizeKwh,
  addedDaysAgo: activeDaysAgo + 12,
  invite,
  inviteSinceDaysAgo: activeDaysAgo + 10,
  activation: 'Smart Control Active',
  activationSinceDaysAgo: activeDaysAgo,
  match,
  matchSinceDaysAgo: activeDaysAgo + 4,
  everActive: true,
  controlActiveSinceDaysAgo: activeDaysAgo,
  qualifiedDaysAgo: activeDaysAgo - 30,
  paidDaysAgo: Math.max(1, activeDaysAgo - 45),
});

/**
 * ESTABLISHED — the investor and internal demo.
 *
 * A 27-household portfolio: 16 earning with the money banked or confirmed, two
 * mid-clock, and a small tail of problems. Three of those are the installer's own,
 * which is what a healthy list looks like — most of what goes wrong is somebody
 * else's job, and the design has to say so rather than dumping it all on them.
 */
const ESTABLISHED_CUSTOMERS: readonly CustomerSeed[] = [
  earningAndPaid('est-01', 'Marion', 'Ashworth', 0, 9.5, 214),
  earningAndPaid('est-02', 'Devin', 'Blackwood', 1, 13.5, 198),
  earningAndPaid('est-03', 'Saoirse', 'Cavendish', 2, 10.4, 187, 'sent_by_installer'),
  earningAndPaid('est-04', 'Ranjit', 'Dunlop', 3, 13.5, 176),
  earningAndPaid('est-05', 'Elspeth', 'Fairbanks', 4, 5.2, 165, 'sent_by_lumo', 'matched_link'),
  earningAndPaid('est-06', 'Callum', 'Galbraith', 5, 9.5, 152),
  earningAndPaid('est-07', 'Yolanda', 'Ingham', 6, 16.0, 141, 'sent_by_installer'),
  earningAndPaid('est-08', 'Fergus', 'Jardine', 7, 10.4, 133),
  earningAndPaid('est-09', 'Imogen', 'Kettering', 0, 8.2, 121),
  earningAndPaid('est-10', 'Rowan', 'Langford', 1, 13.5, 110, 'sent_by_lumo', 'matched_link'),
  earningAndPaid('est-11', 'Malcolm', 'Northcote', 2, 20.8, 98),

  // Confirmed, awaiting the monthly pay run.
  {
    id: 'est-12',
    firstName: 'Verity',
    lastName: 'Ormerod',
    email: 'verity.ormerod@example.com',
    inverterMake: 'GivEnergy',
    batterySizeKwh: 9.5,
    addedDaysAgo: 58,
    invite: 'sent_by_lumo',
    inviteSinceDaysAgo: 56,
    activation: 'Smart Control Active',
    activationSinceDaysAgo: 44,
    match: 'matched_email',
    matchSinceDaysAgo: 50,
    everActive: true,
    controlActiveSinceDaysAgo: 44,
    qualifiedDaysAgo: 14,
    paidDaysAgo: null,
  },
  {
    id: 'est-13',
    firstName: 'Otis',
    lastName: 'Pemberton',
    email: 'otis.pemberton@example.com',
    inverterMake: 'Fox ESS',
    batterySizeKwh: 10.4,
    addedDaysAgo: 51,
    invite: 'sent_by_installer',
    inviteSinceDaysAgo: 50,
    activation: 'Smart Control Active',
    activationSinceDaysAgo: 39,
    match: 'matched_link',
    matchSinceDaysAgo: 45,
    everActive: true,
    controlActiveSinceDaysAgo: 39,
    qualifiedDaysAgo: 9,
    paidDaysAgo: null,
  },
  {
    id: 'est-14',
    firstName: 'Delphine',
    lastName: 'Ravenscroft',
    email: 'delphine.ravenscroft@example.com',
    inverterMake: 'Tesla',
    batterySizeKwh: 13.5,
    addedDaysAgo: 46,
    invite: 'sent_by_lumo',
    inviteSinceDaysAgo: 44,
    activation: 'Smart Control Active',
    activationSinceDaysAgo: 33,
    match: 'matched_email',
    matchSinceDaysAgo: 40,
    everActive: true,
    controlActiveSinceDaysAgo: 33,
    qualifiedDaysAgo: 3,
    paidDaysAgo: null,
  },

  // Mid-clock.
  {
    id: 'est-15',
    firstName: 'Barnaby',
    lastName: 'Sinclair',
    email: 'barnaby.sinclair@example.com',
    inverterMake: 'Sungrow',
    batterySizeKwh: 8.2,
    addedDaysAgo: 34,
    invite: 'sent_by_lumo',
    inviteSinceDaysAgo: 33,
    activation: 'Smart Control Active',
    activationSinceDaysAgo: 21,
    match: 'matched_email',
    matchSinceDaysAgo: 28,
    everActive: true,
    controlActiveSinceDaysAgo: 21,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },
  {
    id: 'est-16',
    firstName: 'Talia',
    lastName: 'Trelawney',
    email: 'talia.trelawney@example.com',
    inverterMake: 'SolaX',
    batterySizeKwh: 5.2,
    addedDaysAgo: 19,
    invite: 'sent_by_installer',
    inviteSinceDaysAgo: 18,
    activation: 'Smart Control Active',
    activationSinceDaysAgo: 6,
    match: 'matched_link',
    matchSinceDaysAgo: 13,
    everActive: true,
    controlActiveSinceDaysAgo: 6,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },

  // In flight — Lumo is testing control. Nothing to chase, and the list must not
  // present it as though there were.
  {
    id: 'est-17',
    firstName: 'Niall',
    lastName: 'Underhill',
    email: 'niall.underhill@example.com',
    inverterMake: 'Growatt',
    batterySizeKwh: 9.5,
    addedDaysAgo: 11,
    invite: 'sent_by_lumo',
    inviteSinceDaysAgo: 10,
    activation: 'Smart Control Test Running',
    activationSinceDaysAgo: 1,
    match: 'matched_email',
    matchSinceDaysAgo: 5,
    everActive: false,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },

  // Earning, but Lumo cannot safely say which account is theirs.
  {
    id: 'est-18',
    firstName: 'Priya',
    lastName: 'Whittaker',
    email: 'p.whittaker@example.com',
    inverterMake: 'GivEnergy',
    batterySizeKwh: 10.4,
    addedDaysAgo: 63,
    invite: 'sent_by_lumo',
    inviteSinceDaysAgo: 61,
    activation: 'Smart Control Active',
    activationSinceDaysAgo: 49,
    match: 'ambiguous',
    matchSinceDaysAgo: 55,
    everActive: true,
    controlActiveSinceDaysAgo: 49,
    qualifiedDaysAgo: 19,
    paidDaysAgo: null,
  },

  // Household turned it off at day 22. The clock is back to zero, and the earnings
  // screen has to be honest about that.
  {
    id: 'est-19',
    firstName: 'Hamish',
    lastName: 'Yardley',
    email: 'hamish.yardley@example.com',
    inverterMake: 'SolarEdge',
    batterySizeKwh: 13.5,
    addedDaysAgo: 71,
    invite: 'sent_by_lumo',
    inviteSinceDaysAgo: 69,
    activation: 'Smart Control Inactive',
    activationSinceDaysAgo: 26,
    match: 'matched_email',
    matchSinceDaysAgo: 63,
    everActive: true,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },
  {
    id: 'est-20',
    firstName: 'Cordelia',
    lastName: 'Zielinski',
    email: 'cordelia.zielinski@example.com',
    inverterMake: 'Huawei',
    batterySizeKwh: 8.2,
    addedDaysAgo: 88,
    invite: 'sent_by_installer',
    inviteSinceDaysAgo: 86,
    activation: 'Needs Relink',
    activationSinceDaysAgo: 9,
    match: 'matched_email',
    matchSinceDaysAgo: 80,
    everActive: true,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: 41,
    paidDaysAgo: null,
  },

  // Lumo's problems. Both must read as Lumo's, or installers waste calls on them.
  {
    id: 'est-21',
    firstName: 'Wesley',
    lastName: 'Abernathy',
    email: 'wesley.abernathy@example.com',
    inverterMake: 'Growatt',
    batterySizeKwh: 5.0,
    addedDaysAgo: 40,
    invite: 'sent_by_lumo',
    inviteSinceDaysAgo: 38,
    activation: 'Smart Control Test Failed',
    activationSinceDaysAgo: 24,
    match: 'matched_email',
    matchSinceDaysAgo: 32,
    everActive: false,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },
  {
    id: 'est-22',
    firstName: 'Georgia',
    lastName: 'Broadbent',
    email: 'georgia.broadbent@example.com',
    inverterMake: 'SolaX',
    batterySizeKwh: 9.5,
    addedDaysAgo: 30,
    invite: 'sent_by_lumo',
    inviteSinceDaysAgo: 28,
    activation: 'Smart Control Check Incomplete',
    activationSinceDaysAgo: 8,
    match: 'matched_email',
    matchSinceDaysAgo: 21,
    everActive: false,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },

  // The installer's own three.
  {
    id: 'est-23',
    firstName: 'Lorenzo',
    lastName: 'Chatterjee',
    email: 'lorenzo.chatterjee@example.com',
    inverterMake: 'Fox ESS',
    batterySizeKwh: 10.4,
    addedDaysAgo: 96,
    invite: 'sent_by_lumo',
    inviteSinceDaysAgo: 94,
    activation: 'Device Disconnected',
    activationSinceDaysAgo: 4,
    match: 'matched_email',
    matchSinceDaysAgo: 88,
    everActive: true,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: 52,
    paidDaysAgo: 22,
  },
  // The misspelled domain is deliberate: this is why the invite bounced, and the
  // recommended action ("check the address and re-add with the correction") only
  // makes sense if the data shows a plausible reason.
  {
    id: 'est-24',
    firstName: 'Millie',
    lastName: 'Delacroix',
    email: 'millie.delacroix@exmaple.com',
    inverterMake: 'GivEnergy',
    batterySizeKwh: 5.2,
    addedDaysAgo: 25,
    invite: 'bounced',
    inviteSinceDaysAgo: 24,
    activation: 'no_account',
    activationSinceDaysAgo: 25,
    match: null,
    matchSinceDaysAgo: null,
    everActive: false,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },
  {
    id: 'est-25',
    firstName: 'Jasper',
    lastName: 'Ellsworth',
    email: 'jasper.ellsworth@example.com',
    inverterMake: 'Tesla',
    batterySizeKwh: 13.5,
    addedDaysAgo: 3,
    invite: 'added',
    inviteSinceDaysAgo: 3,
    activation: 'no_account',
    activationSinceDaysAgo: 3,
    match: null,
    matchSinceDaysAgo: null,
    everActive: false,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },

  // Queued for Lumo to send. In flight, not a task.
  {
    id: 'est-26',
    firstName: 'Anya',
    lastName: 'Fitzgerald',
    email: 'anya.fitzgerald@example.com',
    inverterMake: 'Sungrow',
    batterySizeKwh: 9.5,
    addedDaysAgo: 1,
    invite: 'staged_for_lumo',
    inviteSinceDaysAgo: 1,
    activation: 'no_account',
    activationSinceDaysAgo: 1,
    match: null,
    matchSinceDaysAgo: null,
    everActive: false,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },

  // Opted out. Closed, and correctly absent from the queue.
  {
    id: 'est-27',
    firstName: 'Dexter',
    lastName: 'Holloway',
    email: 'dexter.holloway@example.com',
    inverterMake: 'SolarEdge',
    batterySizeKwh: 8.2,
    addedDaysAgo: 77,
    invite: 'unsubscribed',
    inviteSinceDaysAgo: 70,
    activation: 'no_account',
    activationSinceDaysAgo: 77,
    match: null,
    matchSinceDaysAgo: null,
    everActive: false,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },
];

/**
 * MESSY — the research conversation.
 *
 * Eight invited. One confirmed £50, one earning household whose £50 is being eaten
 * because they signed up with a different address, one mid-clock, and five stuck at
 * different stages with different owners. The ages are deliberately spread across
 * every band, including one dead lead, so an installer has to distinguish "chase
 * today" from "this is gone".
 */
const MESSY_CUSTOMERS: readonly CustomerSeed[] = [
  // The one that worked.
  {
    id: 'msy-01',
    firstName: 'Priya',
    lastName: 'Raval',
    email: 'priya.raval@example.com',
    inverterMake: 'GivEnergy',
    batterySizeKwh: 9.5,
    addedDaysAgo: 82,
    invite: 'sent_by_lumo',
    inviteSinceDaysAgo: 80,
    activation: 'Smart Control Active',
    activationSinceDaysAgo: 68,
    match: 'matched_email',
    matchSinceDaysAgo: 74,
    everActive: true,
    controlActiveSinceDaysAgo: 68,
    qualifiedDaysAgo: 38,
    paidDaysAgo: null,
  },

  // The one that quietly eats the £50: on Lumo, earning, credited to nobody.
  {
    id: 'msy-02',
    firstName: 'Dermot',
    lastName: 'Kelly',
    email: 'dermot.kelly@example.com',
    inverterMake: 'Fox ESS',
    batterySizeKwh: 13.5,
    addedDaysAgo: 57,
    invite: 'sent_by_installer',
    inviteSinceDaysAgo: 56,
    activation: 'Smart Control Active',
    activationSinceDaysAgo: 45,
    match: 'unmatched_different_email',
    matchSinceDaysAgo: 50,
    everActive: true,
    controlActiveSinceDaysAgo: 45,
    qualifiedDaysAgo: 15,
    paidDaysAgo: null,
  },

  // Mid-clock, nothing to do.
  {
    id: 'msy-03',
    firstName: 'Hamish',
    lastName: 'Doyle',
    email: 'hamish.doyle@example.com',
    inverterMake: 'Tesla',
    batterySizeKwh: 13.5,
    addedDaysAgo: 31,
    invite: 'sent_by_installer',
    inviteSinceDaysAgo: 30,
    activation: 'Smart Control Active',
    activationSinceDaysAgo: 18,
    match: 'matched_link',
    matchSinceDaysAgo: 24,
    everActive: true,
    controlActiveSinceDaysAgo: 18,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },

  // Dead lead. Invited seven weeks ago, never signed up. Must not look like the
  // three-day-old problems.
  {
    id: 'msy-04',
    firstName: 'Nadia',
    lastName: 'Osei',
    email: 'nadia.osei@example.com',
    inverterMake: 'SolarEdge',
    batterySizeKwh: 10.4,
    addedDaysAgo: 49,
    invite: 'no_response',
    inviteSinceDaysAgo: 47,
    activation: 'no_account',
    activationSinceDaysAgo: 49,
    match: null,
    matchSinceDaysAgo: null,
    everActive: false,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },

  // Signed up, never connected the inverter. The step people stall on.
  {
    id: 'msy-05',
    firstName: 'Callum',
    lastName: 'Frazier',
    email: 'callum.frazier@example.com',
    inverterMake: 'Sungrow',
    batterySizeKwh: 8.2,
    addedDaysAgo: 27,
    invite: 'sent_by_lumo',
    inviteSinceDaysAgo: 26,
    activation: 'Not Linked',
    activationSinceDaysAgo: 23,
    match: 'matched_email',
    matchSinceDaysAgo: 23,
    everActive: false,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },

  // Connected, no tariff.
  {
    id: 'msy-06',
    firstName: 'Bea',
    lastName: 'Whitlock',
    email: 'bea.whitlock@example.com',
    inverterMake: 'SolaX',
    batterySizeKwh: 5.2,
    addedDaysAgo: 16,
    invite: 'sent_by_lumo',
    inviteSinceDaysAgo: 15,
    activation: 'Linked, No Tariff',
    activationSinceDaysAgo: 11,
    match: 'matched_email',
    matchSinceDaysAgo: 12,
    everActive: false,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },

  // One toggle from earning.
  {
    id: 'msy-07',
    firstName: 'Tomas',
    lastName: 'Lindqvist',
    email: 'tomas.lindqvist@example.com',
    inverterMake: 'Huawei',
    batterySizeKwh: 16.0,
    addedDaysAgo: 12,
    invite: 'sent_by_installer',
    inviteSinceDaysAgo: 12,
    activation: 'Setup Incomplete',
    activationSinceDaysAgo: 7,
    match: 'matched_email',
    matchSinceDaysAgo: 8,
    everActive: false,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },

  // Shared by QR, so no email was ever captured — and now the battery is offline,
  // which is the one problem on the list the installer can actually fix.
  {
    id: 'msy-08',
    firstName: 'Orla',
    lastName: 'Byrne',
    email: null,
    inverterMake: 'Growatt',
    batterySizeKwh: 9.5,
    addedDaysAgo: 38,
    invite: 'link_only',
    inviteSinceDaysAgo: 38,
    activation: 'Device Disconnected',
    activationSinceDaysAgo: 2,
    match: 'matched_link',
    matchSinceDaysAgo: 33,
    everActive: true,
    controlActiveSinceDaysAgo: null,
    qualifiedDaysAgo: null,
    paidDaysAgo: null,
  },
];

export const PERSONAS: Readonly<Record<PersonaId, Persona>> = {
  established: {
    id: 'established',
    name: 'Established',
    purpose:
      'The investor and internal demo. A 27-household portfolio, most of it earning, with a realistic tail of problems — three of them the installer’s own and the rest somebody else’s.',
    installer: {
      firstName: 'Ade',
      lastName: 'Bankole',
      company: 'Northfield Renewables',
      linkToken: 'ade-b-4k2f',
    },
    customers: ESTABLISHED_CUSTOMERS,
  },
  'first-run': {
    id: 'first-run',
    name: 'First run',
    purpose:
      'Zero customers, nothing yet. Tests whether the empty product still explains itself — and whether the offer is legible before any money exists.',
    installer: {
      firstName: 'Sam',
      lastName: 'Okonjo',
      company: 'Bramble Energy Services',
      linkToken: 'sam-o-9x7d',
    },
    customers: [],
  },
  messy: {
    id: 'messy',
    name: 'Messy',
    purpose:
      'The research conversation. Eight invited, five stuck at different stages with different owners, one email that never matched, one confirmed £50.',
    installer: {
      firstName: 'Ade',
      lastName: 'Bankole',
      company: 'Northfield Renewables',
      linkToken: 'ade-b-4k2f',
    },
    customers: MESSY_CUSTOMERS,
  },
};

const isoDaysAgo = (today: string, daysAgo: number): string =>
  new Date(Date.parse(`${today}T00:00:00Z`) - daysAgo * 86_400_000).toISOString().slice(0, 10);

/** Turn a persona's day offsets into real dates relative to `today`. */
export function materialise(persona: Persona, today: string): readonly HubCustomer[] {
  const on = (daysAgo: number) => isoDaysAgo(today, daysAgo);
  const onOrNull = (daysAgo: number | null) => (daysAgo === null ? null : on(daysAgo));

  return persona.customers.map((seed) => ({
    id: seed.id,
    firstName: seed.firstName,
    lastName: seed.lastName,
    email: seed.email,
    inverterMake: seed.inverterMake,
    batterySizeKwh: seed.batterySizeKwh,
    addedOn: on(seed.addedDaysAgo),
    invite: seed.invite,
    inviteSince: on(seed.inviteSinceDaysAgo),
    activation: seed.activation,
    activationSince: on(seed.activationSinceDaysAgo),
    match: seed.match,
    matchSince: onOrNull(seed.matchSinceDaysAgo),
    qualification: {
      everActive: seed.everActive,
      controlActiveSince: onOrNull(seed.controlActiveSinceDaysAgo),
      qualifiedAt: onOrNull(seed.qualifiedDaysAgo),
      paidAt: onOrNull(seed.paidDaysAgo),
    },
  }));
}
