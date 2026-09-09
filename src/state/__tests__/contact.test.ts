import { describe, it, expect } from 'vitest';
import { CONTACT, CONTACT_STATE_IDS, HELD_STATES, isPreSignup } from '../contact';

describe('contact track', () => {
  it('starts every household at import, however it arrived', () => {
    // A manual one-at-a-time add is a batch of one. Two entry points would mean two
    // data-quality code paths, and the ad-hoc path is where dubious rows come from.
    expect(CONTACT.initial).toEqual(['imported']);
  });

  it('treats every state except signed_up as pre-signup', () => {
    for (const id of CONTACT_STATE_IDS) {
      expect(isPreSignup(id)).toBe(id !== 'signed_up');
    }
  });

  it('ends at signed_up, where the activation track takes over', () => {
    expect(CONTACT.transitions.signed_up).toEqual([]);
    expect(CONTACT.states.signed_up.disposition).toBe('earning');
  });

  it('holds rows only for things the installer alone can resolve', () => {
    for (const id of HELD_STATES) {
      const state = CONTACT.states[id];
      expect(state.owner, `${id} is held so must be the installer's`).toBe('installer');
      expect(state.disposition).toBe('blocked');
    }
    // Held states must be reachable straight off the import, because that is when
    // the data-quality pass sorts them.
    for (const id of HELD_STATES) {
      expect(CONTACT.transitions.imported).toContain(id);
    }
  });

  it('lets a held row rejoin the send once the installer fills the gap', () => {
    expect(CONTACT.transitions.held_no_email).toContain('awaiting_approval');
    expect(CONTACT.transitions.held_unconfirmed).toContain('awaiting_approval');
  });

  it('asks for approval exactly once, before anything sends', () => {
    // Approval gates the queue, and nothing reaches the queue another way. If a
    // second path to `queued` ever appears, mail could go out unapproved.
    const toQueued = CONTACT_STATE_IDS.filter((id) =>
      CONTACT.transitions[id].includes('queued'),
    );
    expect(toQueued.sort()).toEqual(['awaiting_approval', 'bounced']);
  });

  it('returns a corrected bounce to the queue without re-approval', () => {
    // The installer approved the email, not each recipient. Asking again for a
    // corrected address would be the friction this rebuild exists to remove.
    expect(CONTACT.transitions.bounced).toContain('queued');
    expect(CONTACT.transitions.bounced).not.toContain('awaiting_approval');
  });

  it('never contacts an opted-out or complaining household again', () => {
    expect(CONTACT.transitions.unsubscribed).toEqual([]);
    expect(CONTACT.transitions.complained).toEqual([]);
  });

  it('lets a household sign up without a recorded open', () => {
    // Open tracking is a pixel: Apple Mail pre-fetches it and images-off clients
    // never load it. A model that required an open before a signup would strand
    // real conversions.
    expect(CONTACT.transitions.sent).toContain('signed_up');
  });

  /**
   * The copy rule from the module docstring, made mechanical. Installers have no
   * reason yet to do work on Lumo's behalf, so an action addressed to them has to
   * carry an argument, not just an instruction. A bare "Call them." is 11 characters;
   * a justification cannot be written in fewer than about sixty.
   */
  it('justifies every action it asks of the installer', () => {
    for (const id of CONTACT_STATE_IDS) {
      const state = CONTACT.states[id];
      if (state.owner !== 'installer') continue;
      expect(state.action, `${id} is the installer's, so needs an action`).toBeTruthy();
      expect(
        (state.action as string).length,
        `${id} action reads as a chore, not an argument: "${state.action}"`,
      ).toBeGreaterThan(60);
    }
  });

  it('never asks the installer to record work they did elsewhere', () => {
    // The failure of the previous model. No state may exist whose resolution is the
    // installer telling Lumo they sent something themselves.
    const selfReported = CONTACT_STATE_IDS.filter((id) =>
      /you (sent|invited|emailed)|mark as sent|confirm you/i.test(
        `${CONTACT.states[id].label} ${CONTACT.states[id].action ?? ''}`,
      ),
    );
    expect(selfReported).toEqual([]);
  });
});
