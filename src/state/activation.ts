import type { StateDefinition, StateTrack } from './types';

/**
 * Household activation state.
 *
 * These values are NOT invented for the prototype. Ten of the eleven are the real
 * enum the platform emits, and the copy here is a translation layer over them, not
 * a redefinition.
 *
 * SOURCE OF TRUTH, in priority order:
 *   1. `compute_account_state()` in
 *      `lumo-app-web/functions/utils/hubspot_payloads.py`
 *     , the derivation, including the precedence recorded below.
 *   2. The `lumo_app_account_state` picklist in
 *      `lumo-app-web/scripts/create_hubspot_fields.py`
 *     , the exact strings, including the comma in "Linked, No Tariff".
 *
 * If `activation.test.ts` fails, reconcile against the Python. Do NOT edit the
 * expectation to match this file: the whole value of the module is that it cannot
 * silently drift from what the platform actually produces.
 *
 * The eleventh value, `no_account`, is Hub-only and has no producer today, see
 * `producerGaps.ts`.
 */

export const ACTIVATION_STATE_IDS = [
  'no_account',
  'Not Linked',
  'Linked, No Tariff',
  'Setup Incomplete',
  'Smart Control Test Running',
  'Smart Control Test Failed',
  'Smart Control Check Incomplete',
  'Smart Control Inactive',
  'Smart Control Active',
  'Needs Relink',
  'Device Disconnected',
] as const;

export type ActivationStateId = (typeof ACTIVATION_STATE_IDS)[number];

/**
 * The ten platform-emitted values, verbatim. Held separately from the list above so
 * the parity test compares against the platform enum and nothing else.
 */
export const PLATFORM_ACCOUNT_STATES = [
  'Not Linked',
  'Linked, No Tariff',
  'Setup Incomplete',
  'Smart Control Test Running',
  'Smart Control Test Failed',
  'Smart Control Check Incomplete',
  'Smart Control Inactive',
  'Smart Control Active',
  'Needs Relink',
  'Device Disconnected',
] as const;

/** The one state the Hub owns and the platform knows nothing about. */
export const HUB_ONLY_ACTIVATION_STATES = ['no_account'] as const;

interface ActivationDefinition extends StateDefinition<ActivationStateId> {
  /**
   * Order in which `compute_account_state()` decides. Lower wins. `Device
   * Disconnected` and `Needs Relink` are checked before the five-state app-state
   * derivation and therefore shadow everything below them, a household can be
   * mid-way through setup AND offline, and the platform will report offline.
   *
   * `no_account` is 0 because it precedes the platform having an opinion at all.
   */
  readonly precedence: number;
  /**
   * Whether time spent in this state counts toward the 30 consecutive days of
   * sustained control. Exactly one state qualifies, and that is deliberate.
   */
  readonly countsTowardQualification: boolean;
}

const define = (d: ActivationDefinition): ActivationDefinition => d;

const STATES: Record<ActivationStateId, ActivationDefinition> = {
  no_account: define({
    id: 'no_account',
    label: "Hasn't signed up yet",
    blocker: "They haven't created a Lumo account.",
    owner: 'installer',
    action: 'Chase the invite. A call converts far better than a second email.',
    disposition: 'blocked',
    precedence: 0,
    countsTowardQualification: false,
  }),

  'Device Disconnected': define({
    id: 'Device Disconnected',
    label: 'Battery offline',
    blocker:
      "The battery or inverter isn't reachable. Usually power, home broadband, or a router that has been replaced.",
    owner: 'installer',
    action:
      "This is the one on this list you can actually fix. Check it's powered and back on the home network.",
    disposition: 'blocked',
    precedence: 1,
    countsTowardQualification: false,
  }),

  'Needs Relink': define({
    id: 'Needs Relink',
    label: 'Connection dropped',
    blocker:
      "Their inverter connection has expired and needs re-authorising. Lumo can't control the battery until it does.",
    owner: 'household',
    action:
      'They need to reconnect in the app. Two taps, but nothing happens until they do it.',
    disposition: 'blocked',
    precedence: 2,
    countsTowardQualification: false,
  }),

  'Not Linked': define({
    id: 'Not Linked',
    label: 'Battery not connected',
    blocker: "They have a Lumo account but haven't connected their inverter to it.",
    owner: 'household',
    action:
      'Walk them through connecting the inverter in the app. This is the step people stall on.',
    disposition: 'blocked',
    precedence: 3,
    countsTowardQualification: false,
  }),

  'Linked, No Tariff': define({
    id: 'Linked, No Tariff',
    label: 'No tariff set',
    blocker:
      "Their battery is connected, but Lumo doesn't know their energy tariff, so it can't work out when charging is cheap.",
    owner: 'household',
    action: 'They need to pick their tariff in the app. A minute, if they have a recent bill.',
    disposition: 'blocked',
    precedence: 4,
    countsTowardQualification: false,
  }),

  'Smart Control Test Running': define({
    id: 'Smart Control Test Running',
    label: 'Lumo is testing control',
    blocker: 'Lumo is checking it can actually control the battery.',
    owner: 'nobody',
    action: null,
    disposition: 'in_flight',
    precedence: 5,
    countsTowardQualification: false,
  }),

  'Smart Control Test Failed': define({
    id: 'Smart Control Test Failed',
    label: "Lumo couldn't control the battery",
    blocker:
      "Lumo sent commands and the battery didn't act on them. We're investigating.",
    owner: 'lumo',
    action: 'Nothing for you to do. Lumo will come back to you on this one.',
    disposition: 'blocked',
    precedence: 6,
    countsTowardQualification: false,
  }),

  'Smart Control Check Incomplete': define({
    id: 'Smart Control Check Incomplete',
    label: "Lumo's check didn't finish",
    blocker:
      "Lumo's control check couldn't be completed, so we can't confirm control either way yet. Nothing here says the system is broken.",
    owner: 'lumo',
    action: "Nothing for you to do. Lumo is looking at why the check didn't finish.",
    disposition: 'blocked',
    precedence: 7,
    countsTowardQualification: false,
  }),

  'Smart Control Active': define({
    id: 'Smart Control Active',
    label: 'Earning',
    blocker: null,
    owner: 'nobody',
    action: null,
    disposition: 'earning',
    precedence: 8,
    countsTowardQualification: true,
  }),

  'Smart Control Inactive': define({
    id: 'Smart Control Inactive',
    label: 'Switched off by the household',
    blocker: 'Control was working, then they turned Smart Control off.',
    owner: 'household',
    action:
      "Worth asking why. It is usually a worry about the battery being empty when they want it.",
    disposition: 'blocked',
    precedence: 8,
    countsTowardQualification: false,
  }),

  'Setup Incomplete': define({
    id: 'Setup Incomplete',
    label: 'Not switched on yet',
    blocker:
      "Connected and tariff set, but they have never turned Smart Control on, so it has never been tested.",
    owner: 'household',
    action: "One toggle in the app. Worth a call, they are one tap from earning.",
    disposition: 'blocked',
    precedence: 9,
    countsTowardQualification: false,
  }),
};

/**
 * Permitted transitions. Every state can be reached from `Device Disconnected` and
 * `Needs Relink` because both shadow the underlying setup progress rather than
 * replacing it: when the hardware comes back, the household resumes wherever it
 * actually was.
 */
const TRANSITIONS: Record<ActivationStateId, readonly ActivationStateId[]> = {
  no_account: ['Not Linked'],
  'Not Linked': ['Linked, No Tariff', 'Needs Relink', 'Device Disconnected'],
  'Linked, No Tariff': ['Setup Incomplete', 'Not Linked', 'Needs Relink', 'Device Disconnected'],
  'Setup Incomplete': ['Smart Control Test Running', 'Needs Relink', 'Device Disconnected'],
  'Smart Control Test Running': [
    'Smart Control Active',
    'Smart Control Test Failed',
    'Smart Control Check Incomplete',
    'Needs Relink',
    'Device Disconnected',
  ],
  'Smart Control Test Failed': [
    'Smart Control Test Running',
    'Needs Relink',
    'Device Disconnected',
  ],
  'Smart Control Check Incomplete': [
    'Smart Control Test Running',
    'Needs Relink',
    'Device Disconnected',
  ],
  'Smart Control Active': [
    'Smart Control Inactive',
    'Smart Control Test Failed',
    'Needs Relink',
    'Device Disconnected',
  ],
  'Smart Control Inactive': ['Smart Control Active', 'Needs Relink', 'Device Disconnected'],
  'Needs Relink': [
    'Smart Control Active',
    'Smart Control Inactive',
    'Not Linked',
    'Device Disconnected',
  ],
  'Device Disconnected': [
    'Smart Control Active',
    'Smart Control Inactive',
    'Not Linked',
    'Needs Relink',
  ],
};

export const ACTIVATION: StateTrack<ActivationStateId> & {
  readonly states: Record<ActivationStateId, ActivationDefinition>;
} = {
  name: 'Household activation',
  description:
    'Where the household has got to on the Lumo platform. Ten of these eleven values are the enum the platform already emits; only no_account is ours.',
  states: STATES,
  order: ACTIVATION_STATE_IDS,
  initial: ['no_account'],
  transitions: TRANSITIONS,
};

export const activationState = (id: ActivationStateId): ActivationDefinition => STATES[id];
