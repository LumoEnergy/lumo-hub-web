import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { HubCustomer, MaterialisedPersona, PersonaId } from '../fixtures';
import { loadPersona } from '../fixtures';

/**
 * In-memory demo state.
 *
 * Nothing here persists and nothing leaves the tab. That is the point: the store
 * exists so the demo feels alive — approve the campaign and the list starts moving —
 * while remaining incapable of sending an email or writing anywhere.
 *
 * There is no localStorage either. A research session should start from a known
 * persona every time, and a half-finished previous session leaking into the next one
 * would quietly invalidate the observation.
 */

export interface CustomerDraft {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly postcode: string;
}

type Company = MaterialisedPersona['company'];

interface DemoStore {
  readonly personaId: PersonaId;
  readonly personaName: string;
  readonly personaPurpose: string;
  readonly company: Company;
  readonly customers: readonly HubCustomer[];
  /** Today, as an ISO date. Fixed for the session so ages do not shift mid-demo. */
  readonly asOf: string;
  /** True once anything has been changed in this session. */
  readonly dirty: boolean;
  /**
   * The one sign-off the product asks for. Approving moves every ready household
   * into the send queue at once, which is the whole promise: one action, whole list.
   */
  approveCampaign: () => void;
  /** Supplying a missing address releases a held row back into the queue. */
  supplyEmail: (id: string, email: string) => void;
  /** Confirming storage releases a row held for an unconfirmed battery. */
  confirmBattery: (id: string, hasBattery: boolean) => void;
  /** Claiming an unmatched household. Lumo ties it by hand. */
  claimHousehold: (id: string) => void;
  addCustomers: (drafts: readonly CustomerDraft[]) => readonly string[];
  /**
   * Handing over another list. It lands as `processing` with no outcome counts,
   * because that is what actually happens — the work is asynchronous and the demo
   * should not pretend a file is parsed by the time the button springs back.
   */
  addFile: (filename: string, rows: number) => void;
  /** Changing the daily send cap, which rebuilds the remaining batches. */
  setDailyCap: (cap: number) => void;
  reset: () => void;
}

const DemoStoreContext = createContext<DemoStore | null>(null);

let sequence = 0;
const nextId = (): string => {
  sequence += 1;
  return `new-${sequence.toString().padStart(2, '0')}`;
};

export function DemoStoreProvider({
  personaId,
  children,
}: {
  personaId: PersonaId;
  children: ReactNode;
}) {
  // One Date for the session, so every age and every clock agrees.
  const loaded = useMemo(() => loadPersona(personaId, new Date()), [personaId]);

  const [customers, setCustomers] = useState<readonly HubCustomer[]>(loaded.customers);
  const [company, setCompany] = useState<Company>(loaded.company);
  const [dirty, setDirty] = useState(false);
  const asOf = loaded.asOf;

  const patch = useCallback(
    (ids: readonly string[], change: (c: HubCustomer) => HubCustomer) => {
      const wanted = new Set(ids);
      setCustomers((current) => current.map((c) => (wanted.has(c.id) ? change(c) : c)));
      setDirty(true);
    },
    [],
  );

  const approveCampaign = useCallback(() => {
    setCompany((current) => ({
      ...current,
      campaignEmail: {
        ...current.campaignEmail,
        approved: true,
        approvedBy: current.seats.find((s) => s.isCurrentUser)?.name ?? null,
        approvedOn: asOf,
      },
    }));
    setCustomers((current) =>
      current.map((c) =>
        // Held rows stay held: approving the email does not conjure an address.
        c.contact === 'awaiting_approval'
          ? { ...c, contact: 'queued', contactSince: asOf }
          : c,
      ),
    );
    setDirty(true);
  }, [asOf]);

  const supplyEmail = useCallback(
    (id: string, email: string) =>
      patch([id], (c) => ({
        ...c,
        email: email.trim().toLowerCase(),
        // Straight to the queue, not back for approval. The firm signed off the
        // email, not each recipient.
        contact: company.campaignEmail.approved ? 'queued' : 'awaiting_approval',
        contactSince: asOf,
      })),
    [patch, asOf, company.campaignEmail.approved],
  );

  const confirmBattery = useCallback(
    (id: string, hasBattery: boolean) =>
      patch([id], (c) => ({
        ...c,
        // No battery means no household to contact. Held for a missing address is the
        // wrong answer, so it becomes an opted-out row rather than a phantom lead.
        contact: hasBattery
          ? company.campaignEmail.approved
            ? 'queued'
            : 'awaiting_approval'
          : 'unsubscribed',
        contactSince: asOf,
      })),
    [patch, asOf, company.campaignEmail.approved],
  );

  const claimHousehold = useCallback(
    (id: string) =>
      patch([id], (c) => ({ ...c, match: 'matched_manual', matchSince: asOf })),
    [patch, asOf],
  );

  const addCustomers = useCallback(
    (drafts: readonly CustomerDraft[]) => {
      const seat = company.seats.find((s) => s.isCurrentUser)?.name ?? 'Unknown';
      const created = drafts.map<HubCustomer>((draft) => {
        const email = draft.email.trim().toLowerCase();
        return {
          id: nextId(),
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          email: email === '' ? null : email,
          postcode: draft.postcode.trim().toUpperCase() || null,
          // A back-book row rarely carries kit detail, and an ad-hoc add is a
          // back-book row of one. Asking for it here would be asking for data the
          // person typing usually does not have to hand.
          inverterMake: null,
          batterySizeKwh: null,
          importedOn: asOf,
          importBatchId: company.imports[0]?.id ?? 'imp-1',
          addedBy: seat,
          contact:
            email === ''
              ? 'held_no_email'
              : company.campaignEmail.approved
                ? 'queued'
                : 'awaiting_approval',
          contactSince: asOf,
          activation: 'no_account',
          activationSince: asOf,
          match: null,
          matchSince: null,
          qualification: {
            everActive: false,
            controlActiveSince: null,
            qualifiedAt: null,
            paidAt: null,
          },
        };
      });
      setCustomers((current) => [...created, ...current]);
      setDirty(true);
      return created.map((c) => c.id);
    },
    [asOf, company.seats, company.imports, company.campaignEmail.approved],
  );

  const addFile = useCallback(
    (filename: string, rows: number) => {
      const seat = company.seats.find((s) => s.isCurrentUser)?.name ?? 'Unknown';
      setCompany((current) => ({
        ...current,
        imports: [
          ...current.imports,
          {
            id: `imp-${current.imports.length + 1}`,
            filename,
            arrivedBy: 'uploaded',
            status: 'processing',
            suppliedBy: seat,
            suppliedOn: asOf,
            source: 'Uploaded from the Hub',
            rowsSupplied: rows,
            rowsLoaded: null,
            rowsHeld: null,
            rowsRejected: null,
            rejectedReason: null,
          },
        ],
      }));
      setDirty(true);
    },
    [asOf, company.seats],
  );

  /**
   * Re-cut the remaining batches at a new daily cap.
   *
   * Only what has not gone yet: a sent batch is a historical fact and rewriting it
   * to fit a new cap would be inventing history. The dates restart from tomorrow,
   * because the cap that matters is the one applying to the next send.
   */
  const setDailyCap = useCallback(
    (cap: number) => {
      setCompany((current) => {
        const sent = current.schedule.filter((b) => b.status === 'sent');
        const remaining = current.schedule
          .filter((b) => b.status !== 'sent')
          .reduce((total, b) => total + b.count, 0);

        const batches = [];
        let left = remaining;
        let day = 1;
        while (left > 0) {
          const count = Math.min(cap, left);
          const date = new Date(`${asOf}T00:00:00Z`);
          date.setUTCDate(date.getUTCDate() + day);
          batches.push({
            id: `re-${day}`,
            date: date.toISOString().slice(0, 10),
            count,
            status: 'scheduled' as const,
            opened: null,
          });
          left -= count;
          day += 1;
        }

        return { ...current, dailySendCap: cap, schedule: [...sent, ...batches] };
      });
      setDirty(true);
    },
    [asOf],
  );

  const reset = useCallback(() => {
    const fresh = loadPersona(personaId, new Date());
    setCustomers(fresh.customers);
    setCompany(fresh.company);
    setDirty(false);
  }, [personaId]);

  const value = useMemo<DemoStore>(
    () => ({
      personaId,
      personaName: loaded.name,
      personaPurpose: loaded.purpose,
      company,
      customers,
      asOf,
      dirty,
      approveCampaign,
      supplyEmail,
      confirmBattery,
      claimHousehold,
      addCustomers,
      addFile,
      setDailyCap,
      reset,
    }),
    [
      personaId,
      loaded.name,
      loaded.purpose,
      company,
      customers,
      asOf,
      dirty,
      approveCampaign,
      supplyEmail,
      confirmBattery,
      claimHousehold,
      addCustomers,
      addFile,
      setDailyCap,
      reset,
    ],
  );

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore(): DemoStore {
  const store = useContext(DemoStoreContext);
  if (store === null) {
    throw new Error('useDemoStore must be used inside DemoStoreProvider');
  }
  return store;
}
