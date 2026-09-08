import { describe, it, expect } from 'vitest';
import { TRACKS } from '../index';
import type { StateTrack } from '../types';

/**
 * Structural guarantees that apply to every track. These are the tests that make the
 * "no state invented or removed" success criterion mechanical rather than a matter of
 * someone noticing.
 */

// The tracks are individually typed; for structural assertions they are all just
// records of string ids.
const tracks = TRACKS as readonly StateTrack<string>[];

describe.each(tracks.map((t) => [t.name, t] as const))('%s track', (_name, track) => {
  it('defines every state listed in its order, and lists every state it defines', () => {
    expect([...track.order].sort()).toEqual(Object.keys(track.states).sort());
  });

  it('keys each definition by its own id', () => {
    for (const id of track.order) {
      expect(track.states[id].id).toBe(id);
    }
  });

  it('gives every state a plain-English label that is not the raw id', () => {
    for (const id of track.order) {
      const { label } = track.states[id];
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toBe(id);
    }
  });

  it('gives every blocked state both a blocker and an action', () => {
    for (const id of track.order) {
      const state = track.states[id];
      if (state.disposition !== 'blocked') continue;
      // Three blocked states carry no action. Two are terminal facts about the
      // household rather than work — they opted out, or they reported the email — so
      // the correct response is to leave them alone. The third, `no_response`, is a
      // cohort rather than a task: it is the largest state in any campaign, and a
      // per-row action repeated a hundred times would bury the rows that need one
      // specific thing doing. All three still owe the installer an explanation, so a
      // blocker is required and only the action is waived.
      if (id === 'unsubscribed' || id === 'complained' || id === 'no_response') {
        expect(state.blocker, `${id} needs a blocker`).toBeTruthy();
        expect(state.action, `${id} must not recommend an action`).toBeNull();
        expect(state.owner, `${id} must be owned by nobody`).toBe('nobody');
        continue;
      }
      expect(state.blocker, `${id} needs a blocker`).toBeTruthy();
      expect(state.action, `${id} needs an action`).toBeTruthy();
    }
  });

  it('never pairs a recommended action with nobody to do it', () => {
    for (const id of track.order) {
      const state = track.states[id];
      if (state.action === null) continue;
      expect(state.owner, `${id} has an action but no owner`).not.toBe('nobody');
    }
  });

  it('declares at least one initial state, all of which it defines', () => {
    expect(track.initial.length).toBeGreaterThan(0);
    for (const id of track.initial) {
      expect(track.order).toContain(id);
    }
  });

  it('only transitions to states it defines', () => {
    for (const [from, targets] of Object.entries(track.transitions)) {
      expect(track.order, `${from} is not a defined state`).toContain(from);
      for (const to of targets) {
        expect(track.order, `${from} -> ${to} targets an unknown state`).toContain(to);
      }
    }
  });

  it('declares transitions for every state, terminal ones as an empty list', () => {
    expect(Object.keys(track.transitions).sort()).toEqual([...track.order].sort());
  });

  it('never transitions a state to itself', () => {
    for (const [from, targets] of Object.entries(track.transitions)) {
      expect(targets, `${from} transitions to itself`).not.toContain(from);
    }
  });

  it('leaves no state unreachable from an initial state', () => {
    const seen = new Set<string>(track.initial);
    const queue = [...track.initial];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const next of track.transitions[current] ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    const unreachable = track.order.filter((id) => !seen.has(id));
    expect(unreachable).toEqual([]);
  });
});

describe('the model as a whole', () => {
  it('has four tracks, because the UI has to make their combination legible', () => {
    expect(tracks.map((t) => t.name)).toEqual([
      'Contact',
      'Household activation',
      'Match',
      'Earnings',
    ]);
  });

  it('uses ids that are unique within a track', () => {
    for (const track of tracks) {
      expect(new Set(track.order).size).toBe(track.order.length);
    }
  });

  it('confines "depends_on_setup" to the earnings track', () => {
    // Earnings states are consequences of activation, so delegating is honest there.
    // Anywhere else it would be a refusal to answer "whose job is this?", which is
    // the one question the installer actually needs answered.
    const delegating = tracks
      .filter((t) => t.name !== 'Earnings')
      .flatMap((t) => t.order.filter((id) => t.states[id].owner === 'depends_on_setup'));
    expect(delegating).toEqual([]);
  });
});
