import type { HubCustomer, HubSiteFacts } from './model';

/**
 * Site facts for the demo, derived from the household.
 *
 * Deterministic, so a site shows the same kit every time it is opened. The inverter make
 * and battery size come straight off the imported row where the list supplied them,
 * because those are the same physical facts and showing two different answers for one
 * battery would be the kind of detail that sinks a demo.
 *
 * WHAT IS MADE UP, PLAINLY. The model, the capacity source, the solar estimate, the
 * tariff names and the export rate are generated from the household id. They are drawn
 * from real suppliers and real tariff names so they read correctly, and no site here
 * corresponds to a real household.
 *
 * The tariff is not uniform, and that is the one piece of variation worth having. A
 * household on a flat tariff has much less to gain from control than one on a
 * time-of-use tariff, and that is a real conversation an installer is better placed to
 * have than Lumo is. A demo where every site is on Octopus Go hides it.
 */

const MODELS: Record<string, readonly string[]> = {
  GivEnergy: ['Gen 3 Hybrid 5.0', 'AC Coupled 3.0'],
  Solis: ['S6-EH1P 5K', 'RHI-3.6K-48ES'],
  Sunsynk: ['Ecco 5kW', 'Sunsynk 3.6kW'],
  SolarEdge: ['SE5000H', 'SE3680H'],
  Fox: ['H1-5.0-E', 'AC1-5.0'],
  Growatt: ['SPH 5000TL', 'MIN 3600TL-X'],
};

const IMPORT_TARIFFS: readonly { supplier: string; name: string }[] = [
  { supplier: 'Octopus Energy', name: 'Octopus Go' },
  { supplier: 'Octopus Energy', name: 'Intelligent Octopus Go' },
  { supplier: 'OVO Energy', name: 'Charge Anytime' },
  { supplier: 'EDF', name: 'GoElectric 35' },
  { supplier: 'British Gas', name: 'Standard Variable' },
  { supplier: 'E.ON Next', name: 'Next Drive' },
];

const EXPORT_SUPPLIERS: readonly string[] = ['Octopus Energy', 'OVO Energy', 'E.ON Next'];

const CONTROL_MODES: readonly string[] = ['Tariff optimised', 'Tariff optimised, grid events'];

/** Same stable hash as the telemetry fixture. Not cryptographic, does not need to be. */
function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function siteFacts(customer: HubCustomer, controlOn: boolean): HubSiteFacts {
  const h = hash(customer.id);
  const make = customer.inverterMake;
  const models = make ? MODELS[make] : undefined;

  const tariff = IMPORT_TARIFFS[h % IMPORT_TARIFFS.length];
  // A third of the fleet has no export arrangement at all, which is roughly true and
  // gives the card an honest empty state to render.
  const hasExport = h % 3 !== 0;

  const battery = customer.batterySizeKwh;

  return {
    inverterMake: make,
    inverterModel: models ? models[(h >> 3) % models.length] : null,
    batteryCapacityKwh: battery,
    // A capacity that came off the installer's list rather than off the device is an
    // estimate, and saying so is the point of the field.
    batterySource: battery === null ? 'manual' : h % 5 === 0 ? 'estimate' : 'enode',
    solarAnnualGenerationKwh: battery === null ? null : Math.round((battery / 10) * 3800),
    importSupplier: tariff.supplier,
    importTariffName: tariff.name,
    exportSupplier: hasExport ? EXPORT_SUPPLIERS[(h >> 5) % EXPORT_SUPPLIERS.length] : null,
    exportRateIncVat: hasExport ? 15 : null,
    controlOn,
    controlMode: controlOn ? CONTROL_MODES[(h >> 7) % CONTROL_MODES.length] : null,
    linkedSince: customer.activationSince,
  };
}
