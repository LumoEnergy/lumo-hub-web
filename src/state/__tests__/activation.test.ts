import { describe, it, expect } from 'vitest';
import {
  ACTIVATION,
  ACTIVATION_STATE_IDS,
  HUB_ONLY_ACTIVATION_STATES,
  PLATFORM_ACCOUNT_STATES,
} from '../activation';

/**
 * Enum parity.
 *
 * The expectation below is transcribed from the platform, not from the source file
 * next door. If this fails, reconcile against:
 *
 *   - compute_account_state() in lumo-app-web/functions/utils/hubspot_payloads.py
 *   - the lumo_app_account_state picklist in
 *     lumo-app-web/scripts/create_hubspot_fields.py
 *
 * Do NOT edit the expectation to make the test pass. The entire value of this module
 * is that it cannot silently drift from what the platform actually emits, and a
 * screen built on eight of ten states is the exact failure this exercise exists to
 * prevent.
 */
const PLATFORM_ENUM_AS_TRANSCRIBED = [
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
];

describe('activation enum parity with the platform', () => {
  it('carries all ten platform values, verbatim', () => {
    expect([...PLATFORM_ACCOUNT_STATES]).toEqual(PLATFORM_ENUM_AS_TRANSCRIBED);
  });

  it('spells "Linked, No Tariff" with the comma the platform uses', () => {
    expect(PLATFORM_ACCOUNT_STATES).toContain('Linked, No Tariff');
    expect(PLATFORM_ACCOUNT_STATES as readonly string[]).not.toContain('Linked No Tariff');
  });

  it('includes the two states most often left out of a hand-written list', () => {
    expect(PLATFORM_ACCOUNT_STATES).toContain('Device Disconnected');
    expect(PLATFORM_ACCOUNT_STATES).toContain('Smart Control Test Running');
  });

  it('is exactly the platform enum plus the Hub-only states, with no extras', () => {
    expect([...ACTIVATION_STATE_IDS].sort()).toEqual(
      [...PLATFORM_ACCOUNT_STATES, ...HUB_ONLY_ACTIVATION_STATES].sort(),
    );
  });

  it('keeps no_account as the only value the platform knows nothing about', () => {
    expect([...HUB_ONLY_ACTIVATION_STATES]).toEqual(['no_account']);
  });
});

describe('activation precedence mirrors compute_account_state', () => {
  it('puts Device Disconnected first, because it shadows every other state', () => {
    const byPrecedence = [...ACTIVATION_STATE_IDS].sort(
      (a, b) => ACTIVATION.states[a].precedence - ACTIVATION.states[b].precedence,
    );
    // no_account precedes the platform having an opinion at all.
    expect(byPrecedence[0]).toBe('no_account');
    expect(byPrecedence[1]).toBe('Device Disconnected');
    expect(byPrecedence[2]).toBe('Needs Relink');
  });
});

describe('activation ownership', () => {
  it('assigns Device Disconnected to the installer, as the one they can fix on site', () => {
    expect(ACTIVATION.states['Device Disconnected'].owner).toBe('installer');
  });

  it("assigns both Lumo-side control failures to Lumo, so installers don't chase them", () => {
    expect(ACTIVATION.states['Smart Control Test Failed'].owner).toBe('lumo');
    expect(ACTIVATION.states['Smart Control Check Incomplete'].owner).toBe('lumo');
  });

  it('gives every blocked state an owner who is not "nobody"', () => {
    const orphaned = ACTIVATION_STATE_IDS.filter(
      (id) =>
        ACTIVATION.states[id].disposition === 'blocked' &&
        ACTIVATION.states[id].owner === 'nobody',
    );
    expect(orphaned).toEqual([]);
  });

  it('asks nobody to act on the transient and the earning states', () => {
    expect(ACTIVATION.states['Smart Control Test Running'].owner).toBe('nobody');
    expect(ACTIVATION.states['Smart Control Test Running'].disposition).toBe('in_flight');
    expect(ACTIVATION.states['Smart Control Active'].owner).toBe('nobody');
    expect(ACTIVATION.states['Smart Control Active'].disposition).toBe('earning');
  });
});

describe('qualification link between tracks', () => {
  it('counts exactly one activation state toward the 30 days', () => {
    const counting = ACTIVATION_STATE_IDS.filter(
      (id) => ACTIVATION.states[id].countsTowardQualification,
    );
    expect(counting).toEqual(['Smart Control Active']);
  });
});
