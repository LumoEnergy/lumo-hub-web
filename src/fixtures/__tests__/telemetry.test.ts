import { describe, it, expect } from 'vitest';
import {
  HH_RETENTION_DAYS,
  SLOTS_PER_DAY,
  WINDOWS,
  controlBands,
  siteSeries,
  totals,
} from '../telemetry';
import { siteFacts } from '../sites';
import { loadPersona } from '../index';
import { buildRows } from '../../selectors/customers';
import { liveRows } from '../../selectors/views';

const ASOF = '2026-09-10';

const series = (id = 'site-a', battery: number | null = 10, days = 1, controlled = true) =>
  siteSeries(id, battery, ASOF, days, controlled);

describe('the telemetry fixture', () => {
  it('returns one row per half hour of the window', () => {
    expect(series('site-a', 10, 1)).toHaveLength(SLOTS_PER_DAY);
    expect(series('site-a', 10, 7)).toHaveLength(SLOTS_PER_DAY * 7);
  });

  it('offers no window longer than Firestore keeps half-hourly rows', () => {
    // Seven days is a real retention limit. A month option would be a control the
    // product cannot honour, which is worse than not offering it.
    for (const window of WINDOWS) {
      expect(window.days, window.id).toBeLessThanOrEqual(HH_RETENTION_DAYS);
    }
  });

  it('is deterministic, so a site draws the same day every time it is opened', () => {
    expect(series('site-a')).toEqual(series('site-a'));
  });

  it('gives different sites different days', () => {
    // Otherwise the fleet is one household copied, and clicking a second site tells the
    // reader immediately that none of it is real.
    expect(series('site-a')).not.toEqual(series('site-b'));
  });

  it('scales with the battery, because that is the fact the charts are keyed to', () => {
    const small = totals(series('site-a', 5, 1));
    const large = totals(series('site-a', 20, 1));
    expect(large.chargeKwh).toBeGreaterThan(small.chargeKwh);
    expect(large.generationKwh).toBeGreaterThan(small.generationKwh);
  });

  it('derives state of charge from charge and discharge rather than inventing it', () => {
    // THE INVARIANT THAT MATTERS. A reader can compare the SoC line against the bars,
    // and an earlier version generated them independently: it looked plausible until you
    // did exactly that, at which point the demo argued against itself.
    const rows = series('site-a', 10, 1);
    for (let i = 1; i < rows.length; i += 1) {
      const previous = (rows[i - 1].batteryStateOfChargePercent / 100) * 10;
      const expected = previous + rows[i].chargeKwh - rows[i].dischargeKwh;
      const actual = (rows[i].batteryStateOfChargePercent / 100) * 10;
      // One percent of a 10 kWh battery is 0.1 kWh, so rounding to whole percent is
      // the whole tolerance.
      expect(Math.abs(actual - expected), `slot ${i}`).toBeLessThan(0.11);
    }
  });

  it('balances energy in every half hour', () => {
    // The other invariant a reader can catch. Solar plus import plus discharge has to
    // equal consumption plus export plus charge, or the three charts contradict each
    // other and someone adding up the totals bar finds it.
    for (const row of series('site-a', 10, 3)) {
      const into = row.generationKwh + row.importKwh + row.dischargeKwh;
      const outOf = row.consumptionKwh + row.exportKwh + row.chargeKwh;
      expect(Math.abs(into - outOf)).toBeLessThan(0.01);
    }
  });

  it('only buys from the grid to fill the battery when Lumo is driving it', () => {
    // Solar charging must not show up as import. That would make a self-sufficient
    // afternoon look like a grid-dependent one, which is the opposite of the argument.
    for (const row of series('site-a', 10, 1)) {
      if (row.deviceState === 'loadMatch' && row.generationKwh > row.consumptionKwh) {
        expect(row.importKwh).toBe(0);
      }
    }
  });

  it('never charges and discharges in the same half hour', () => {
    for (const row of series('site-a', 10, 3)) {
      expect(row.chargeKwh === 0 || row.dischargeKwh === 0).toBe(true);
    }
  });

  it('keeps state of charge inside the battery', () => {
    for (const row of series('site-a', 10, 7)) {
      expect(row.batteryStateOfChargePercent).toBeGreaterThanOrEqual(0);
      expect(row.batteryStateOfChargePercent).toBeLessThanOrEqual(100);
    }
  });

  it('stores charge and discharge positive, and lets the chart negate', () => {
    // Storing a negative would make every sum wrong in a different way.
    for (const row of series('site-a', 10, 3)) {
      expect(row.chargeKwh).toBeGreaterThanOrEqual(0);
      expect(row.dischargeKwh).toBeGreaterThanOrEqual(0);
      expect(row.importKwh).toBeGreaterThanOrEqual(0);
      expect(row.exportKwh).toBeGreaterThanOrEqual(0);
    }
  });

  it('generates no solar in the dark', () => {
    const rows = series('site-a', 10, 1);
    // Midnight to 03:00 and 22:00 to midnight. Any generation there is a broken curve.
    for (const slot of [0, 2, 4, 6, 45, 47]) {
      expect(rows[slot].generationKwh, `slot ${slot}`).toBe(0);
    }
    expect(rows[24].generationKwh).toBeGreaterThan(0);
  });

  it('charges when power is cheapest, not at the peak', () => {
    const rows = series('site-a', 10, 1);
    const charged = rows.filter((r) => r.chargeKwh > 0 && r.deviceState === 'forceImport');
    expect(charged.length).toBeGreaterThan(0);
    const peak = Math.max(...rows.map((r) => r.importRateIncVat));
    for (const row of charged) {
      expect(row.importRateIncVat).toBeLessThan(peak);
    }
  });

  it('shows Lumo driving the battery only where control is actually running', () => {
    // The one flatly dishonest thing this screen could do is draw Lumo driving a battery
    // Lumo cannot reach. It is also the better demo: open the broken site and the
    // shading is gone, which is what makes the shading on the working ones believable.
    expect(controlBands(series('site-a', 10, 1, true)).length).toBeGreaterThan(0);
    expect(controlBands(series('site-a', 10, 1, false))).toHaveLength(0);
  });

  it('still generates and still uses power when control is off', () => {
    // Control being off does not mean the meter stopped. An empty chart would read as a
    // rendering failure rather than as a battery Lumo cannot reach.
    const off = totals(series('site-a', 10, 1, false));
    expect(off.generationKwh).toBeGreaterThan(0);
    expect(off.consumptionKwh).toBeGreaterThan(0);
  });

  it('groups control into runs rather than one band per slot', () => {
    const bands = controlBands(series('site-a', 10, 1, true));
    for (const band of bands) {
      expect(band.to).toBeGreaterThan(band.from);
    }
    // A cheap window several hours long is one band, not twelve.
    expect(bands.some((b) => b.to - b.from > 1)).toBe(true);
  });

  it('falls back to a median battery rather than an empty chart', () => {
    const unknown = totals(series('site-a', null, 1));
    expect(unknown.generationKwh).toBeGreaterThan(0);
    expect(unknown.chargeKwh).toBeGreaterThan(0);
  });

  it('sums only energy, never money', () => {
    const keys = Object.keys(totals(series()));
    for (const key of keys) expect(key).toMatch(/Kwh$/);
  });
});

describe('the site facts fixture', () => {
  const first = () => {
    const { customers, asOf } = loadPersona('mid-campaign');
    return liveRows(buildRows(customers, asOf))[0].customer;
  };

  it('agrees with the imported row about the physical kit', () => {
    // Two different answers for one battery is the kind of detail that sinks a demo.
    const customer = first();
    const facts = siteFacts(customer, true);
    expect(facts.inverterMake).toBe(customer.inverterMake);
    expect(facts.batteryCapacityKwh).toBe(customer.batterySizeKwh);
  });

  it('is deterministic per household', () => {
    const customer = first();
    expect(siteFacts(customer, true)).toEqual(siteFacts(customer, true));
  });

  it('reports no control mode when control is not running', () => {
    const customer = first();
    expect(siteFacts(customer, false).controlMode).toBeNull();
    expect(siteFacts(customer, false).controlOn).toBe(false);
  });

  it('does not put every household on the same tariff', () => {
    // A household on a flat tariff has far less to gain from control, and that is a real
    // conversation an installer is better placed to have than Lumo. A demo where every
    // site is on Octopus Go hides it.
    const { customers, asOf } = loadPersona('mid-campaign');
    const names = new Set(
      liveRows(buildRows(customers, asOf)).map(
        (row) => siteFacts(row.customer, true).importTariffName,
      ),
    );
    expect(names.size).toBeGreaterThan(1);
  });

  it('says how the battery capacity was established', () => {
    // The household grid reward is banded by battery size, so an estimated capacity is a
    // number an installer may want to challenge. Hiding how it was arrived at is how that
    // becomes a complaint later.
    const { customers, asOf } = loadPersona('mid-campaign');
    const sources = new Set(
      liveRows(buildRows(customers, asOf)).map((row) => siteFacts(row.customer, true).batterySource),
    );
    expect(sources.has('enode')).toBe(true);
    expect(sources.size).toBeGreaterThan(1);
  });
});
