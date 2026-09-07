import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { HubCustomer, PersonaId } from '../fixtures';
import { PERSONAS, loadPersona, today } from '../fixtures';

/**
 * In-memory demo state.
 *
 * Nothing here persists and nothing leaves the tab. That is the point: the store
 * exists so the demo feels alive — add a customer and it appears in the list — while
 * remaining incapable of sending an email or writing anywhere.
 *
 * There is no localStorage either. A research session should start from a known
 * persona every time, and a half-finished previous session leaking into the next one
 * would quietly invalidate the observation.
 */

export interface CustomerDraft {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly inverterMake: string;
  readonly batterySizeKwh: number;
}

interface DemoStore {
  readonly personaId: PersonaId;
  readonly personaName: string;
  readonly personaPurpose: string;
  readonly installer: (typeof PERSONAS)[PersonaId]['installer'];
  readonly customers: readonly HubCustomer[];
  /** Today, as an ISO date. Fixed for the session so ages do not shift mid-demo. */
  readonly asOf: string;
  /** True once anything has been added or invited in this session. */
  readonly dirty: boolean;
  addCustomers: (drafts: readonly CustomerDraft[]) => readonly string[];
  /** Records the contact path. Both paths are recorded distinctly, deliberately. */
  markStagedForLumo: (ids: readonly string[]) => void;
  markSentByInstaller: (ids: readonly string[]) => void;
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
  const asOf = useMemo(() => today(), []);
  const initial = useMemo(() => loadPersona(personaId, asOf), [personaId, asOf]);

  const [customers, setCustomers] = useState<readonly HubCustomer[]>(initial.customers);
  const [dirty, setDirty] = useState(false);

  const addCustomers = useCallback(
    (drafts: readonly CustomerDraft[]) => {
      const created = drafts.map<HubCustomer>((draft) => ({
        id: nextId(),
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        email: draft.email.trim().toLowerCase(),
        inverterMake: draft.inverterMake,
        batterySizeKwh: draft.batterySizeKwh,
        addedOn: asOf,
        // Added, and no contact path chosen yet. The fork is the next screen.
        invite: 'added',
        inviteSince: asOf,
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
      }));
      setCustomers((current) => [...created, ...current]);
      setDirty(true);
      return created.map((c) => c.id);
    },
    [asOf],
  );

  const setInvite = useCallback(
    (ids: readonly string[], invite: HubCustomer['invite']) => {
      const wanted = new Set(ids);
      setCustomers((current) =>
        current.map((c) =>
          wanted.has(c.id) ? { ...c, invite, inviteSince: asOf } : c,
        ),
      );
      setDirty(true);
    },
    [asOf],
  );

  const markStagedForLumo = useCallback(
    (ids: readonly string[]) => setInvite(ids, 'staged_for_lumo'),
    [setInvite],
  );

  const markSentByInstaller = useCallback(
    (ids: readonly string[]) => setInvite(ids, 'sent_by_installer'),
    [setInvite],
  );

  const reset = useCallback(() => {
    setCustomers(loadPersona(personaId, asOf).customers);
    setDirty(false);
  }, [personaId, asOf]);

  const value = useMemo<DemoStore>(
    () => ({
      personaId,
      personaName: initial.persona.name,
      personaPurpose: initial.persona.purpose,
      installer: initial.persona.installer,
      customers,
      asOf,
      dirty,
      addCustomers,
      markStagedForLumo,
      markSentByInstaller,
      reset,
    }),
    [
      personaId,
      initial.persona,
      customers,
      asOf,
      dirty,
      addCustomers,
      markStagedForLumo,
      markSentByInstaller,
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
