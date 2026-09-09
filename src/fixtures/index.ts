import { DEFAULT_PERSONA, PERSONAS, PERSONA_IDS, materialise } from './personas';
import type { MaterialisedPersona, PersonaId } from './personas';

export type { PersonaId, Persona, MaterialisedPersona } from './personas';
export type {
  HubCustomer,
  HubCompany,
  HubSeat,
  ImportBatch,
  CampaignEmail,
  SenderConfig,
  Attestation,
  Provenance,
  ProvenanceSource,
} from './model';
export {
  CUSTOMER_FIELD_PROVENANCE,
  COMPANY_FIELD_PROVENANCE,
  displayName,
  fieldsWithNoProducer,
  currentSeat,
  canSend,
} from './model';
export { PERSONAS, PERSONA_IDS, DEFAULT_PERSONA, materialise } from './personas';

/**
 * Today, as an ISO date, in Europe/London.
 *
 * Ages and the qualification clock are both derived from this. Using the local
 * calendar date rather than UTC matters at the edges: a blocker raised at 00:30 BST
 * should read as today, not yesterday.
 */
export function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
}

export const isPersonaId = (value: string | null): value is PersonaId =>
  value !== null && (PERSONA_IDS as readonly string[]).includes(value);

/**
 * Persona from the URL, so a specific scenario can be shared as a link.
 *
 * The parameter is short and unremarkable on purpose. In a research session the
 * installer should be looking at a product, not at a demo harness, and `?p=messy` in
 * an address bar reads as noise.
 */
export function personaFromSearch(search: string): PersonaId {
  const value = new URLSearchParams(search).get('p');
  return isPersonaId(value) ? value : DEFAULT_PERSONA;
}

export function loadPersona(id: PersonaId, today: Date = new Date()): MaterialisedPersona {
  return materialise(PERSONAS[id], today);
}
