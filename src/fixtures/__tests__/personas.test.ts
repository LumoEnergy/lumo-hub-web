import { describe, it, expect } from 'vitest';
import {
  ACTIVATION_STATE_IDS,
  CONTACT_STATE_IDS,
  MATCH_STATE_IDS,
  EARNINGS_STATE_IDS,
  HELD_STATES,
  resolveCustomerState,
} from '../../state';
import { PERSONAS, PERSONA_IDS, DEFAULT_PERSONA, materialise } from '../personas';
import { CUSTOMER_FIELD_PROVENANCE, COMPANY_FIELD_PROVENANCE, canSend } from '../model';

const TODAY = new Date('2026-09-08T00:00:00Z');
const all = PERSONA_IDS.map((id) => materialise(PERSONAS[id], TODAY));
const byId = (id: string) => all.find((p) => p.id === id)!;

describe('persona coverage', () => {
  it('exercises every contact state across the three personas', () => {
    const seen = new Set(all.flatMap((p) => p.customers.map((c) => c.contact)));
    const missing = CONTACT_STATE_IDS.filter((id) => !seen.has(id));
    // Only `imported` is genuinely transient — a row is in it for as long as Lumo is
    // mid-pass, and a fixture cannot sit there honestly.
    //
    // `queued` used to be excluded on the same reasoning and that was wrong. Once
    // sending is throttled to protect the domain, a household waits its turn for
    // days: Northfield has 288 of them. It is the most populous state on the screen
    // the send schedule describes, not a flicker between two others.
    expect(missing).toEqual(['imported']);
  });

  it('exercises every activation state', () => {
    const seen = new Set(all.flatMap((p) => p.customers.map((c) => c.activation)));
    expect(ACTIVATION_STATE_IDS.filter((id) => !seen.has(id))).toEqual([]);
  });

  it('exercises every match state', () => {
    const seen = new Set(
      all.flatMap((p) => p.customers.map((c) => c.match).filter((m) => m !== null)),
    );
    expect(MATCH_STATE_IDS.filter((id) => !seen.has(id))).toEqual([]);
  });

  it('exercises every earnings state', () => {
    const seen = new Set(
      all.flatMap((p) =>
        p.customers.map(
          (c) =>
            resolveCustomerState(
              {
                contact: c.contact,
                activation: c.activation,
                match: c.match,
                qualification: c.qualification,
                contactSince: c.contactSince,
                activationSince: c.activationSince,
                matchSince: c.matchSince,
              },
              p.asOf,
            ).earnings,
        ),
      ),
    );
    expect(EARNINGS_STATE_IDS.filter((id) => !seen.has(id))).toEqual([]);
  });
});

describe('fixture invariants', () => {
  it('gives every household a unique id within its persona', () => {
    for (const p of all) {
      const ids = p.customers.map((c) => c.id);
      expect(new Set(ids).size, `${p.id} has duplicate ids`).toBe(ids.length);
    }
  });

  it('only omits an email where the row is held for exactly that reason', () => {
    for (const p of all) {
      for (const c of p.customers) {
        if (c.email === null) {
          expect(c.contact, `${c.id} has no email but is not held for it`).toBe(
            'held_no_email',
          );
        }
      }
    }
  });

  it('never claims a match before the household has an account', () => {
    for (const p of all) {
      for (const c of p.customers) {
        if (c.activation === 'no_account') {
          expect(c.match, `${c.id} has no account but a match state`).toBeNull();
        } else {
          expect(c.match, `${c.id} has an account but no match state`).not.toBeNull();
        }
      }
    }
  });

  it('keeps contact and activation consistent', () => {
    // `signed_up` is the only contact state that implies an account, and every
    // account-bearing row must be in it. A row that is "no response" but somehow has
    // an activation state would make the resolver's precedence meaningless.
    for (const p of all) {
      for (const c of p.customers) {
        const hasAccount = c.activation !== 'no_account';
        expect(c.contact === 'signed_up', `${c.id} contact/activation mismatch`).toBe(
          hasAccount,
        );
      }
    }
  });

  it('only omits kit details where the row is held for an unconfirmed battery', () => {
    for (const p of all) {
      for (const c of p.customers) {
        if (c.inverterMake === null || c.batterySizeKwh === null) {
          expect(c.contact, `${c.id} is missing kit detail without being held`).toBe(
            'held_unconfirmed',
          );
        }
      }
    }
  });

  it('attributes every household to a real seat at the company', () => {
    for (const p of all) {
      const names = new Set(p.company.seats.map((s) => s.name));
      for (const c of p.customers) {
        expect(names, `${c.id} added by someone not on the account`).toContain(c.addedBy);
      }
    }
  });

  it('references a real import batch from every household', () => {
    for (const p of all) {
      const batches = new Set(p.company.imports.map((b) => b.id));
      for (const c of p.customers) {
        expect(batches, `${c.id} references an unknown batch`).toContain(c.importBatchId);
      }
    }
  });

  it('never sits a household in a held state without it being the installer’s to fix', () => {
    for (const p of all) {
      for (const c of p.customers) {
        if (!(HELD_STATES as readonly string[]).includes(c.contact)) continue;
        const resolved = resolveCustomerState(
          {
            contact: c.contact,
            activation: c.activation,
            match: c.match,
            qualification: c.qualification,
            contactSince: c.contactSince,
            activationSince: c.activationSince,
            matchSince: c.matchSince,
          },
          p.asOf,
        );
        expect(resolved.owner, `${c.id} is held but not owned by the installer`).toBe(
          'installer',
        );
        expect(resolved.needsAttention).toBe(true);
      }
    }
  });

  it('never sends before permission and approval are both recorded', () => {
    for (const p of all) {
      const sent = p.customers.some(
        (c) => !['imported', 'awaiting_approval', ...HELD_STATES].includes(c.contact),
      );
      if (sent) {
        expect(canSend(p.company), `${p.id} has sent mail it was not cleared to send`).toBe(
          true,
        );
      }
    }
  });

  it('reconciles each loaded import batch against the rows it produced', () => {
    for (const p of all) {
      for (const batch of p.company.imports) {
        // A batch still processing has produced no households and knows no outcomes.
        // That is the state the file screen exists to show, not a gap in the fixture.
        if (batch.status === 'processing') {
          expect(batch.rowsLoaded, `${batch.id} cannot know a loaded count yet`).toBeNull();
          expect(batch.rowsHeld, `${batch.id} cannot know a held count yet`).toBeNull();
          expect(batch.rowsRejected, `${batch.id} cannot know a rejected count yet`).toBeNull();
          expect(
            p.customers.filter((c) => c.importBatchId === batch.id),
            `${batch.id} must not have produced households yet`,
          ).toEqual([]);
          continue;
        }

        const rows = p.customers.filter((c) => c.importBatchId === batch.id);
        expect(rows.length, `${p.id}/${batch.id} row count`).toBe(batch.rowsLoaded);
        const held = rows.filter((c) => (HELD_STATES as readonly string[]).includes(c.contact));
        expect(held.length, `${p.id}/${batch.id} held count`).toBe(batch.rowsHeld);
        expect(
          (batch.rowsLoaded ?? 0) + (batch.rowsRejected ?? 0),
          `${p.id}/${batch.id} supplied should equal loaded plus rejected`,
        ).toBe(batch.rowsSupplied);
        if ((batch.rowsRejected ?? 0) > 0) {
          expect(batch.rejectedReason, `${batch.id} needs a reason`).toBeTruthy();
        }
      }
    }
  });

  it('schedules every sendable household exactly once', () => {
    // The schedule is the answer to "when will the rest go out". A schedule that
    // does not add up to the list is a promise the product cannot keep.
    for (const p of all) {
      const sendable = p.customers.filter(
        (c) => !(HELD_STATES as readonly string[]).includes(c.contact),
      );
      const scheduled = p.company.schedule.reduce((total, b) => total + b.count, 0);
      expect(scheduled, `${p.id} schedule should cover every sendable household`).toBe(
        sendable.length,
      );
    }
  });

  it('never reports opens on a batch that has not been sent', () => {
    for (const p of all) {
      for (const batch of p.company.schedule) {
        if (batch.status === 'sent') {
          expect(batch.opened, `${p.id}/${batch.id} sent batch needs an open count`).not.toBeNull();
          expect(batch.opened!).toBeLessThanOrEqual(batch.count);
        } else {
          expect(batch.opened, `${p.id}/${batch.id} has not sent yet`).toBeNull();
        }
      }
    }
  });

  it('holds nothing back on a company that has not approved the email', () => {
    const kestrel = all.find((p) => p.id === 'awaiting-approval')!;
    expect(kestrel.company.schedule.every((b) => b.status === 'scheduled')).toBe(true);
  });
});

describe('persona shape', () => {
  it('defaults to the demo persona', () => {
    expect(DEFAULT_PERSONA).toBe('mid-campaign');
  });

  it('gives every persona a stated purpose', () => {
    for (const p of all) {
      expect(p.purpose.length, `${p.id} needs a purpose`).toBeGreaterThan(40);
    }
  });

  it('has exactly one current-user seat per company', () => {
    for (const p of all) {
      expect(p.company.seats.filter((s) => s.isCurrentUser).length).toBe(1);
    }
  });

  it('holds the awaiting-approval persona back from sending anything', () => {
    const p = byId('awaiting-approval');
    expect(p.company.campaignEmail.approved).toBe(false);
    expect(canSend(p.company)).toBe(false);
    // Nothing may have progressed past the gate, and there can be no money.
    for (const c of p.customers) {
      expect(['awaiting_approval', ...HELD_STATES]).toContain(c.contact);
      expect(c.qualification.qualifiedAt).toBeNull();
      expect(c.qualification.paidAt).toBeNull();
    }
  });

  it('makes the messy persona genuinely messy', () => {
    const p = byId('messy-list');
    const held = p.customers.filter((c) => c.contact === 'held_no_email');
    // The research question is what a firm does about a big pile of missing
    // addresses. If this drops below a third of the list it stops asking it.
    expect(held.length / p.customers.length).toBeGreaterThan(0.33);
    expect(p.customers.some((c) => c.contact === 'complained')).toBe(true);
    expect(p.customers.some((c) => c.match === 'unmatched_different_email')).toBe(true);
  });

  it('gives the demo persona real money and real warm leads', () => {
    const p = byId('mid-campaign');
    expect(p.customers.filter((c) => c.qualification.paidAt !== null).length).toBeGreaterThan(
      9,
    );
    expect(p.customers.filter((c) => c.contact === 'clicked').length).toBeGreaterThan(9);
  });

  it('shows both rungs of the sender ladder across the personas', () => {
    // The rung installers will accept is an open research question, so the prototype
    // has to be able to show either.
    const rungs = new Set(all.map((p) => p.company.sender.rung));
    expect(rungs).toEqual(new Set(['lumo_domain', 'delegated_subdomain']));
  });

  it('never puts Lumo in the From line', () => {
    // The firm has the relationship and the permission. If the display name ever
    // becomes Lumo, the lawful basis for the whole campaign changes.
    for (const p of all) {
      expect(p.company.sender.displayName).toBe(p.company.name);
      expect(p.company.sender.replyTo).not.toMatch(/lumo/i);
    }
  });

  it('quotes no savings figure in the campaign email', () => {
    // Nothing in the estate can substantiate a per-household number yet.
    for (const p of all) {
      const text = [
        p.company.campaignEmail.subject,
        p.company.campaignEmail.preheader,
        ...p.company.campaignEmail.body,
      ].join(' ');
      expect(text).not.toMatch(/£\s?\d|\d+\s?%|per year|a year|annually/i);
    }
  });
});

describe('the data contract', () => {
  it('gives every household field a provenance note with substance', () => {
    for (const [field, provenance] of Object.entries(CUSTOMER_FIELD_PROVENANCE)) {
      expect(provenance.note.length, `${field} needs a real note`).toBeGreaterThan(40);
    }
  });

  it('gives every company field a provenance note with substance', () => {
    for (const [field, provenance] of Object.entries(COMPANY_FIELD_PROVENANCE)) {
      expect(provenance.note.length, `${field} needs a real note`).toBeGreaterThan(40);
    }
  });

  it('admits that the entire company entity has no producer', () => {
    // If any of this ever reads "platform-today", something has been assumed that
    // does not exist. There is no installer entity anywhere in the system of record.
    for (const [field, provenance] of Object.entries(COMPANY_FIELD_PROVENANCE)) {
      expect(provenance.source, `${field} should have no producer`).toBe('no-producer');
    }
  });
});
