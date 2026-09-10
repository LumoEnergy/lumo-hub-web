/**
 * Mocked half-hourly telemetry, in the shape the platform actually stores.
 *
 * THE FIELD NAMES ARE NOT INVENTED. They are `HalfHourlyRecord` from
 * lumo-app-web/src/types/index.ts, which is what Firestore holds at
 * `webapp_site_data/{siteId}` and what the ops console reads to draw its telemetry
 * card. Mirroring the real contract costs nothing here and means the prototype's data
 * shape is a design output rather than a throwaway: the real build wires a reader to
 * this shape instead of reconciling two vocabularies.
 *
 * WHAT IS REAL AND WHAT IS NOT. The shape, the units, the sign conventions and the
 * relationships between series are real. The numbers are generated. That is the honest
 * side of the trade, and it is worth being blunt about the limits:
 *
 *   - This is a plausible day, not a measured one. Nobody should read a figure off
 *     these charts and quote it.
 *   - Every site shares one profile, scaled by battery size. A real fleet has a
 *     north-facing roof, a household that runs a hot tub, and a battery that has been
 *     offline for a week.
 *
 * WHY GENERATE RATHER THAN PASTE A REAL DAY. A captured day would be one household's
 * personal energy data committed to a git repository, which is the wrong thing to do
 * regardless of how private the repository is, and it would still be a single day
 * copied 38 times. Generating from the battery size gets more variety and no personal
 * data at all.
 *
 * DETERMINISTIC BY SITE ID. No `Math.random`. The same site renders the same series on
 * every reload, because a demo where the charts reshuffle when you navigate back looks
 * broken, and a snapshot test over random data is worthless.
 */

/** Half-hour slots in a day. The resolution the platform stores. */
export const SLOTS_PER_DAY = 48;

/**
 * Firestore keeps seven days of half-hourly rows and no more.
 *
 * This is a real retention limit, not a scope cut, and it is the reason the window
 * control below stops at a week. Anyone who wants a month is asking for the daily
 * rollup, which is a different array on the same document.
 */
export const HH_RETENTION_DAYS = 7;

/**
 * What the device was told to do in a slot.
 *
 * The platform emits more values than this; these are the three the charts care about.
 * `forceImport` and `forceExport` are Lumo actively driving the battery, and shading
 * those slots is the only thing on the whole screen that shows Lumo doing something
 * rather than a battery that happens to be charging.
 */
export type DeviceState = 'forceImport' | 'forceExport' | 'loadMatch';

/**
 * One half-hour. A subset of the production record: the fields these charts read, and
 * nothing speculative.
 *
 * Energy fields are kWh in the period, not power. Rates are pence per kWh including
 * VAT. Charge and discharge are both positive here and the chart negates discharge at
 * render time, which matches how the ops console does it: storing a negative would
 * make every sum wrong in a different way.
 */
export interface HalfHour {
  readonly periodStartUtc: string;
  readonly periodStartLocal: string;
  readonly generationKwh: number;
  readonly consumptionKwh: number;
  readonly importKwh: number;
  readonly exportKwh: number;
  readonly chargeKwh: number;
  readonly dischargeKwh: number;
  readonly batteryStateOfChargePercent: number;
  readonly importRateIncVat: number;
  readonly exportRateIncVat: number;
  readonly deviceState: DeviceState;
}

/** Windows the UI offers, capped by what Firestore retains. */
export const WINDOWS = [
  { id: 'day', label: 'Day', days: 1 },
  { id: '3d', label: '3 days', days: 3 },
  { id: 'week', label: 'Week', days: HH_RETENTION_DAYS },
] as const;

export type WindowId = (typeof WINDOWS)[number]['id'];
export const DEFAULT_WINDOW: WindowId = 'day';

/* Tariff shape. A flat day rate with a cheap overnight window and an expensive peak,
   which is the Economy-7-with-a-peak shape most of the fleet is on. The cheap window
   is what makes the battery worth controlling, so it has to be in the mock or the
   Grid chart has nothing to explain. */
const CHEAP_RATE = 8.5;
const DAY_RATE = 24.8;
const PEAK_RATE = 38.2;
const EXPORT_RATE = 15.0;

/** Slots 02:00 to 05:00 inclusive of start, exclusive of end. */
const CHEAP_FROM = 4;
const CHEAP_TO = 10;
/** 16:00 to 19:00, the distribution peak. */
const PEAK_FROM = 32;
const PEAK_TO = 38;

function importRate(slot: number): number {
  if (slot >= CHEAP_FROM && slot < CHEAP_TO) return CHEAP_RATE;
  if (slot >= PEAK_FROM && slot < PEAK_TO) return PEAK_RATE;
  return DAY_RATE;
}

/**
 * A small deterministic hash, so each site gets its own variation.
 *
 * Not cryptographic and does not need to be. It needs to be stable across reloads and
 * to spread similar ids apart, so that `site-11` and `site-12` do not draw the same
 * curve one pixel offset.
 */
function seed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Rounds to the precision a meter actually reports, so sums do not carry noise. */
const kwh = (n: number): number => Math.max(0, Math.round(n * 1000) / 1000);

/**
 * A solar day, as a bell over daylight hours.
 *
 * Peaks at solar noon, zero outside daylight. September in the UK, so roughly 06:30 to
 * 19:30. A cosine bell rather than a triangle because a triangular solar curve is the
 * tell that a chart is fake.
 */
function generation(slot: number, peakKwh: number, cloud: number): number {
  const sunrise = 13;
  const sunset = 39;
  if (slot < sunrise || slot >= sunset) return 0;
  const progress = (slot - sunrise) / (sunset - sunrise);
  const bell = Math.sin(Math.PI * progress) ** 1.6;
  // A slow cloud term, so midday is not a perfectly smooth arc.
  const passing = 1 - cloud * 0.35 * (0.5 + 0.5 * Math.sin(slot * 0.9));
  return kwh(peakKwh * bell * passing);
}

/**
 * Household demand. Two humps, because people get up and then come home.
 *
 * The evening hump is the larger one and lands on the peak tariff window, which is the
 * whole reason discharging then is worth money.
 */
function consumption(slot: number, baseKwh: number, appetite: number): number {
  const morning = 0.9 * Math.exp(-((slot - 15) ** 2) / 12);
  const evening = 1.5 * Math.exp(-((slot - 37) ** 2) / 20);
  const standing = 0.32;
  return kwh(baseKwh * appetite * (standing + morning + evening));
}

/**
 * One day of half-hours for one site.
 *
 * The battery logic is the part that has to hold together, because the charts show the
 * same quantities three ways and a reader can check them against each other:
 *
 *   1. Charge only happens in the cheap window or from surplus solar. Charging at the
 *      peak rate would be Lumo losing the household money.
 *   2. Discharge only happens when demand exceeds solar, and preferentially at peak.
 *   3. State of charge is the running integral of charge minus discharge, clamped to
 *      the usable range, and every slot's charge and discharge are clipped to the
 *      headroom actually available. So the SoC line and the bars agree by
 *      construction rather than by coincidence.
 *   4. Import and export are whatever is left over: import covers unmet demand plus
 *      grid charging, export is surplus solar that did not fit in the battery.
 *
 * Point 3 is the one worth protecting. An earlier throwaway version generated SoC
 * independently and it looked plausible until you compared it with the charge bars,
 * at which point the demo was arguing against itself.
 */
function day(
  siteId: string,
  dayIndex: number,
  batteryKwh: number,
  date: Date,
  controlled: boolean,
): HalfHour[] {
  const s = seed(`${siteId}:${dayIndex}`);
  const cloud = s;
  const appetite = 0.75 + s * 0.6;

  /*
   * CALIBRATED TO REAL UK FIGURES, and the first cut was not.
   *
   * This audience is energy people. The first version scaled both solar and demand
   * linearly off the battery, which put a 5 kWh site on a 1.5 kWp array using 8,500 kWh a
   * year and importing 5,700 of it. Every number was internally consistent and the whole
   * picture was wrong: nobody with that consumption and that array is a Lumo customer,
   * and a reader who knows the market spots it before they read the labels.
   *
   * A home with storage has solar sized to the roof, not to the battery, so PV gets a
   * floor and a gentler slope: about 3.5 kWp at 5 kWh up to about 7 kWp at 20 kWh.
   * Consumption lands at roughly 3,500 to 4,900 kWh a year, which is the right band for a
   * solar-plus-battery household, usually one with an EV or a heat pump.
   *
   * SOLAR HAS TO EXCEED DEMAND on a good September day, or the battery never fills from
   * the roof, nothing is ever exported, and the demo argues that Lumo customers buy
   * everything from the grid.
   */
  const peakSolar = 0.75 + (batteryKwh / 10) * 0.45;
  const baseLoad = 0.24 + (batteryKwh / 10) * 0.07;

  // Usable window. Batteries do not run to empty, and the floor is what makes an
  // evening discharge stop before the household's demand does.
  const floorPct = 10;
  const maxChargeKwh = Math.min(2.0, batteryKwh * 0.22);

  let socKwh = batteryKwh * (0.16 + s * 0.1);

  const rows: HalfHour[] = [];

  for (let slot = 0; slot < SLOTS_PER_DAY; slot += 1) {
    const gen = generation(slot, peakSolar, cloud);
    const use = consumption(slot, baseLoad, appetite);
    const rate = importRate(slot);

    const surplus = Math.max(0, gen - use);
    const deficit = Math.max(0, use - gen);

    const headroom = Math.max(0, batteryKwh - socKwh);
    const available = Math.max(0, socKwh - batteryKwh * (floorPct / 100));

    let charge = 0;
    let discharge = 0;
    let state: DeviceState = 'loadMatch';

    if (controlled && rate === CHEAP_RATE && headroom > 0.05) {
      // Lumo driving the battery from the grid at the cheap rate. This is the slot
      // that earns the household money and the one the chart shades.
      //
      // ONLY WHEN CONTROL IS ACTUALLY RUNNING. A site whose battery has dropped off
      // still generates and still uses power, but nothing is charging it at 03:00 and
      // no band should suggest otherwise. Drawing Lumo driving a battery Lumo cannot
      // reach would be the one flatly dishonest thing on this screen, and it is also
      // the more interesting demo: open the broken site and the shading is gone.
      charge = Math.min(maxChargeKwh, headroom);
      state = 'forceImport';
    } else if (surplus > 0.01 && headroom > 0.05) {
      charge = Math.min(surplus, maxChargeKwh, headroom);
    } else if (deficit > 0.01 && available > 0.05) {
      discharge = Math.min(deficit, maxChargeKwh, available);
      if (controlled && rate === PEAK_RATE) state = 'forceExport';
    }

    charge = kwh(charge);
    discharge = kwh(discharge);
    socKwh = Math.min(batteryKwh, Math.max(0, socKwh + charge - discharge));

    // Where the charge came from decides the grid figures, so it is worth naming rather
    // than folding into one expression. Grid charging only happens when Lumo drives it;
    // every other charge is surplus solar that would otherwise have been exported.
    const fromGrid = state === 'forceImport' ? charge : 0;
    const fromSolar = charge - fromGrid;

    // What the house needed and neither the sun nor the battery supplied, plus anything
    // Lumo bought to fill the battery.
    const importKwh = kwh(Math.max(0, deficit - discharge) + fromGrid);
    // Surplus solar that did not fit in the battery.
    const exportKwh = kwh(surplus - fromSolar);

    const at = new Date(date.getTime() + slot * 30 * 60 * 1000);

    rows.push({
      periodStartUtc: at.toISOString(),
      periodStartLocal: at.toISOString().slice(0, 16).replace('T', ' '),
      generationKwh: gen,
      consumptionKwh: use,
      importKwh,
      exportKwh,
      chargeKwh: charge,
      dischargeKwh: discharge,
      batteryStateOfChargePercent: Math.round((socKwh / batteryKwh) * 100),
      importRateIncVat: rate,
      exportRateIncVat: EXPORT_RATE,
      deviceState: state,
    });
  }

  return rows;
}

/**
 * The series for one site, oldest slot first, ending at the last slot of `asOf`.
 *
 * `asOf` is the demo's today as an ISO date, taken from the store rather than the wall
 * clock, and it is a string because that is what every other date in this build is.
 * Reading the real clock here would put the charts a day out from every other date on
 * the screen the moment the fixture date and the real date diverge, which they do by
 * design.
 */
export function siteSeries(
  siteId: string,
  batterySizeKwh: number | null,
  asOf: string,
  days: number,
  controlled: boolean,
): readonly HalfHour[] {
  // A live household with no recorded battery size still has a battery; the list just
  // did not say how big. Ten is the fleet median and the alternative is an empty chart.
  const battery = batterySizeKwh ?? 10;

  const midnight = new Date(`${asOf}T00:00:00Z`).getTime();
  const rows: HalfHour[] = [];

  for (let d = days - 1; d >= 0; d -= 1) {
    const start = new Date(midnight - d * 24 * 60 * 60 * 1000);
    rows.push(...day(siteId, d, battery, start, controlled));
  }

  return rows;
}

export interface Totals {
  readonly generationKwh: number;
  readonly consumptionKwh: number;
  readonly importKwh: number;
  readonly exportKwh: number;
  readonly chargeKwh: number;
  readonly dischargeKwh: number;
}

/**
 * Sums over the visible window.
 *
 * kWh only. The ops console version of this bar headlines net cost or total savings,
 * and money is deliberately absent from this screen: what the installer is owed is a
 * fixed reward per household, and the household's bill is not the installer's to
 * quote. See the design spec's forbidden list.
 */
export function totals(rows: readonly HalfHour[]): Totals {
  const sum = (pick: (r: HalfHour) => number): number =>
    Math.round(rows.reduce((acc, r) => acc + pick(r), 0) * 10) / 10;

  return {
    generationKwh: sum((r) => r.generationKwh),
    consumptionKwh: sum((r) => r.consumptionKwh),
    importKwh: sum((r) => r.importKwh),
    exportKwh: sum((r) => r.exportKwh),
    chargeKwh: sum((r) => r.chargeKwh),
    dischargeKwh: sum((r) => r.dischargeKwh),
  };
}

/**
 * Contiguous runs of one device state, for the shaded bands behind the charts.
 *
 * Runs rather than per-slot marks: forty-eight separate rectangles for a six-slot
 * charge window is both slower and, because of the hairline gaps between adjacent
 * fills, visibly stripey.
 */
export interface Band {
  readonly state: DeviceState;
  readonly from: number;
  readonly to: number;
}

export function controlBands(rows: readonly HalfHour[]): readonly Band[] {
  const bands: Band[] = [];
  let start = -1;

  for (let i = 0; i <= rows.length; i += 1) {
    const state = i < rows.length ? rows[i].deviceState : 'loadMatch';
    const driven = state === 'forceImport' || state === 'forceExport';
    const same = start >= 0 && driven && rows[start].deviceState === state;

    if (driven && start < 0) {
      start = i;
    } else if (start >= 0 && !same) {
      bands.push({ state: rows[start].deviceState, from: start, to: i });
      start = driven ? i : -1;
    }
  }

  return bands;
}
