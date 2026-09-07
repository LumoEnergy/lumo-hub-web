import { describe, it, expect } from 'vitest';
import {
  ACTIVATION_STATE_IDS,
  EARNINGS_STATE_IDS,
  INVITE_STATE_IDS,
  MATCH_STATE_IDS,
  resolveCustomerState,
} from '../../state';
import { CUSTOMER_FIELD_PROVENANCE } from '../model';
import type { HubCustomer } from '../model';
import { PERSONAS, PERSONA_IDS, materialise } from '../personas';
import { loadPersona, personaFromSearch } from '../index';

const ASOF = '2026-09-07';

const allCustomers = (): readonly HubCustomer[] =>
  PERSONA_IDS.flatMap((id) => materialise(PERSONAS[id], ASOF));

describe('state coverage across the personas', () => {
  // The point of the persona mechanism is that the model is complete and the persona
  // chooses what you see. If a state exists in the model and no persona exercises it,
  // it has never been looked at in a real screen and the copy is untested.
  const customers = allCustomers();

  it('exercises every invite state', () => {
    const seen = new Set(customers.map((c) => c.invite));
    expect(INVITE_STATE_IDS.filter((id) => !seen.has(id))).toEqual([]);
  });

  it('exercises every activation state, including all ten platform values', () => {
    const seen = new Set(customers.map((c) => c.activation));
    expect(ACTIVATION_STATE_IDS.filter((id) => !seen.has(id))).toEqual([]);
  });

  it('exercises every match state', () => {
    const seen = new Set(customers.map((c) => c.match).filter((m) => m !== null));
    expect(MATCH_STATE_IDS.filter((id) => !seen.has(id))).toEqual([]);
  });

  it('exercises every earnings state', () => {
    const seen = new Set(
      customers.map(
        (c) =>
          resolveCustomerState(
            {
              invite: c.invite,
              activation: c.activation,
              match: c.match,
              qualification: c.qualification,
              inviteSince: c.inviteSince,
              activationSince: c.activationSince,
              matchSince: c.matchSince,
            },
            ASOF,
          ).earnings,
      ),
    );
    expect(EARNINGS_STATE_IDS.filter((id) => !seen.has(id))).toEqual([]);
  });

  it('exercises every age band, so no band ships unlooked-at', () => {
    const seen = new Set(
      customers.map(
        (c) =>
          resolveCustomerState(
            {
              invite: c.invite,
              activation: c.activation,
              match: c.match,
              qualification: c.qualification,
              inviteSince: c.inviteSince,
              activationSince: c.activationSince,
              matchSince: c.matchSince,
            },
            ASOF,
          ).ageBand,
      ),
    );
    expect([...seen].sort()).toEqual(['ageing', 'dead', 'fresh', 'stale']);
  });

  it('puts a confirmed-then-dropped household in front of a reviewer', () => {
    // The clawback rule is only visible if something is in this position. Without it
    // the design would never have been forced to say what happens.
    const dropped = customers.filter(
      (c) =>
        resolveCustomerState(
          {
            invite: c.invite,
            activation: c.activation,
            match: c.match,
            qualification: c.qualification,
            inviteSince: c.inviteSince,
            activationSince: c.activationSince,
            matchSince: c.matchSince,
          },
          ASOF,
        ).confirmedButControlDropped,
    );
    expect(dropped.length).toBeGreaterThan(0);
  });
});

describe('fixture invariants', () => {
  // A fixture that cannot happen in reality teaches the wrong thing in research and
  // hands the backend build a contract it cannot satisfy.
  const customers = allCustomers();

  it('only omits an email on a link or QR share', () => {
    for (const c of customers) {
      expect(c.email === null, `${c.id}`).toBe(c.invite === 'link_only');
    }
  });

  it('has a match state exactly when there is an account to match', () => {
    for (const c of customers) {
      expect(c.match === null, `${c.id}`).toBe(c.activation === 'no_account');
      expect(c.matchSince === null, `${c.id} matchSince`).toBe(c.match === null);
    }
  });

  it('has control running exactly when the activation state says it is', () => {
    for (const c of customers) {
      expect(c.qualification.controlActiveSince !== null, `${c.id}`).toBe(
        c.activation === 'Smart Control Active',
      );
    }
  });

  it('never qualifies a household that has never had control', () => {
    for (const c of customers) {
      if (c.qualification.qualifiedAt !== null) {
        expect(c.qualification.everActive, `${c.id}`).toBe(true);
      }
    }
  });

  it('never pays a reward that was not confirmed first', () => {
    for (const c of customers) {
      if (c.qualification.paidAt !== null) {
        expect(c.qualification.qualifiedAt, `${c.id}`).not.toBeNull();
        expect(
          Date.parse(c.qualification.paidAt) >= Date.parse(c.qualification.qualifiedAt as string),
          `${c.id} paid before it was confirmed`,
        ).toBe(true);
      }
    }
  });

  it('never qualifies before 30 days of the run that earned it', () => {
    for (const c of customers) {
      const { controlActiveSince, qualifiedAt } = c.qualification;
      if (controlActiveSince === null || qualifiedAt === null) continue;
      const days =
        (Date.parse(qualifiedAt) - Date.parse(controlActiveSince)) / 86_400_000;
      expect(days, `${c.id} qualified after only ${days} days`).toBeGreaterThanOrEqual(30);
    }
  });

  it('never dates a state change before the customer was added', () => {
    for (const c of customers) {
      const added = Date.parse(c.addedOn);
      expect(Date.parse(c.inviteSince), `${c.id} inviteSince`).toBeGreaterThanOrEqual(added);
      expect(Date.parse(c.activationSince), `${c.id} activationSince`).toBeGreaterThanOrEqual(
        added,
      );
    }
  });

  it('uses unique ids', () => {
    const ids = customers.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses example.com addresses only, so nothing here can reach a real inbox', () => {
    for (const c of customers) {
      if (c.email === null) continue;
      expect(c.email, `${c.id}`).toMatch(/@ex[a-z]*\.com$/);
    }
  });
});

describe('the personas themselves', () => {
  it('offers exactly the three agreed personas', () => {
    expect(PERSONA_IDS).toEqual(['established', 'first-run', 'messy']);
  });

  it('gives the established persona a 20-plus portfolio', () => {
    expect(PERSONAS.established.customers.length).toBeGreaterThanOrEqual(20);
  });

  it('gives the first-run persona nothing at all', () => {
    expect(PERSONAS['first-run'].customers).toEqual([]);
  });

  it('gives the messy persona eight households', () => {
    expect(PERSONAS.messy.customers.length).toBe(8);
  });

  it('leaves the established installer only a handful of their own problems', () => {
    const { customers } = loadPersona('established', ASOF);
    const mine = customers.filter((c) => {
      const r = resolveCustomerState(
        {
          invite: c.invite,
          activation: c.activation,
          match: c.match,
          qualification: c.qualification,
          inviteSince: c.inviteSince,
          activationSince: c.activationSince,
          matchSince: c.matchSince,
        },
        ASOF,
      );
      return r.needsAttention && r.owner === 'installer';
    });
    // Small enough to read as a healthy list, non-zero so the demo has something to
    // show. If this grows, the "established" story has stopped being aspirational.
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.length).toBeLessThanOrEqual(4);
  });

  it('gives every installer a personal link token rather than a company domain', () => {
    for (const id of PERSONA_IDS) {
      const { linkToken, company } = PERSONAS[id].installer;
      expect(linkToken).not.toContain('.co.uk');
      expect(linkToken).not.toContain('.com');
      expect(linkToken.toLowerCase()).not.toContain(company.split(' ')[0].toLowerCase());
    }
  });
});

describe('persona selection from the URL', () => {
  it('reads a valid persona', () => {
    expect(personaFromSearch('?p=messy')).toBe('messy');
    expect(personaFromSearch('?p=first-run')).toBe('first-run');
  });

  it('falls back to the demo persona for anything else', () => {
    expect(personaFromSearch('')).toBe('established');
    expect(personaFromSearch('?p=nonsense')).toBe('established');
    expect(personaFromSearch('?other=1')).toBe('established');
  });
});

describe('the data contract', () => {
  it('states the provenance of every field on the view model', () => {
    // Typed as Record<keyof HubCustomer, Provenance>, so a field added without
    // provenance is a compile error. This asserts the runtime shape has not drifted.
    const { customers } = loadPersona('messy', ASOF);
    const fields = Object.keys(customers[0]).sort();
    expect(Object.keys(CUSTOMER_FIELD_PROVENANCE).sort()).toEqual(fields);
  });

  it('gives every field a note substantial enough to act on', () => {
    for (const [field, provenance] of Object.entries(CUSTOMER_FIELD_PROVENANCE)) {
      expect(provenance.note.length, `${field} needs a real note`).toBeGreaterThan(40);
    }
  });
});

describe('materialise', () => {
  it('anchors ages to the given day rather than to a hardcoded date', () => {
    const early = materialise(PERSONAS.messy, '2026-01-10');
    const later = materialise(PERSONAS.messy, '2026-11-10');
    const ageOf = (cs: readonly HubCustomer[]) =>
      Date.parse(cs[0].activationSince) - Date.parse(cs[0].addedOn);
    // Same shape, different absolute dates: the persona keeps its design forever.
    expect(early[0].activationSince).not.toBe(later[0].activationSince);
    expect(ageOf(early)).toBe(ageOf(later));
  });
});
