import { DEFAULT_PERSONA, PERSONAS, PERSONA_IDS, materialise } from './personas';
import type { Persona, PersonaId } from './personas';
import type { HubCustomer } from './model';

export type { PersonaId, Persona } from './personas';
export type { HubCustomer, Provenance, ProvenanceSource } from './model';
export {
  CUSTOMER_FIELD_PROVENANCE,
  displayName,
  fieldsWithNoProducer,
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
 * a mobile address bar reads as noise.
 */
export function personaFromSearch(search: string): PersonaId {
  const value = new URLSearchParams(search).get('p');
  return isPersonaId(value) ? value : DEFAULT_PERSONA;
}

export function loadPersona(id: PersonaId, asOf: string = today()): {
  persona: Persona;
  customers: readonly HubCustomer[];
} {
  const persona = PERSONAS[id];
  return { persona, customers: materialise(persona, asOf) };
}
