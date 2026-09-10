import { useMemo } from 'react';
import type { ChartData, ChartOptions } from 'chart.js';
import { Chart, chartTheme } from './Chart';
import type { ChartBand } from './Chart';
import { controlBands, totals } from '../fixtures/telemetry';
import type { Band, HalfHour } from '../fixtures/telemetry';
import { Panel } from './ui';

/**
 * The three telemetry charts, lifted from the ops console and cut down.
 *
 * The ops console draws four. The fourth is Costs, or Savings when toggled, and it is
 * deliberately absent: the installer is owed a fixed reward per household, so the
 * household's bill is not a number the installer needs, and it is the one figure on
 * that screen that would be genuinely sensitive to share. See the design spec.
 *
 * SERIES, UNITS AND SIGNS MATCH THE OPS CONSOLE so the two tools cannot disagree about
 * what a chart means. Discharge and export are drawn below the zero line, which is the
 * convention there: a bar chart where import and export both point up makes a
 * self-sufficient day and a grid-dependent day look identical.
 *
 * COLOURS ARE HUB TOKENS, NOT THE OPS CONSOLE HEXES. The ops console is an internal
 * tool with its own palette; this is installer-facing and has a journey palette that
 * means something. The one place that costs us is that the two tools draw import in
 * different reds, which matters less than a product screen looking like an admin page.
 */

const SOLAR = '#b4690e';
const DEMAND = '#1c5488';
const CHARGE = '#0c6560';
const DISCHARGE = '#9a4b0c';
const SOC = '#5b4bb8';
const IMPORT = '#b3261e';
const EXPORT = '#12703a';
const RATE = '#8a4a86';

/** Shading for the slots where Lumo is driving the battery. */
const BAND_FILL: Record<Band['state'], string> = {
  forceImport: 'rgba(12, 101, 96, 0.10)',
  forceExport: 'rgba(154, 75, 12, 0.10)',
  loadMatch: 'transparent',
};

const CHART_HEIGHT = 240;

/**
 * Tick labels.
 *
 * A week at half-hourly is 336 points, and 336 labels is a grey smear. Chart.js can
 * thin them, but only by count, which lands ticks at 03:20 and other times that never
 * existed. Labelling only midnight and midday and letting the rest render blank keeps
 * the ticks on times a person recognises.
 */
function labels(rows: readonly HalfHour[], days: number): string[] {
  return rows.map((row, i) => {
    const slot = i % 48;
    if (days === 1) return slot % 4 === 0 ? row.periodStartLocal.slice(11, 16) : '';
    if (slot === 0) {
      return new Date(row.periodStartUtc).toLocaleDateString('en-GB', {
        weekday: 'short',
        timeZone: 'UTC',
      });
    }
    return slot === 24 ? '12:00' : '';
  });
}

function baseOptions(rows: readonly HalfHour[], bands: readonly ChartBand[]): ChartOptions {
  const t = chartTheme();

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    hubBands: bands,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.ink,
        titleColor: t.surface,
        bodyColor: t.surface,
        padding: 8,
        cornerRadius: 8,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        callbacks: {
          title: (items: { dataIndex: number }[]) => {
            const row = rows[items[0].dataIndex];
            return row ? row.periodStartLocal : '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: t.mute, autoSkip: false, maxRotation: 0 },
        border: { color: t.line },
      },
      y: {
        grid: { color: t.line },
        ticks: { color: t.mute },
        border: { display: false },
      },
    },
  } as ChartOptions;
}

/** Right-hand axis, for the two series that are not in kWh. */
const rightAxis = (unit: string, min?: number, max?: number) => {
  const t = chartTheme();
  return {
    position: 'right' as const,
    min,
    max,
    grid: { display: false },
    ticks: { color: t.mute, callback: (v: string | number) => `${v}${unit}` },
    border: { display: false },
  };
};

export function SiteCharts({ rows, days }: { rows: readonly HalfHour[]; days: number }) {
  const x = useMemo(() => labels(rows, days), [rows, days]);

  const bands = useMemo<readonly ChartBand[]>(
    () =>
      controlBands(rows).map((band) => ({
        from: band.from,
        to: band.to,
        fill: BAND_FILL[band.state],
      })),
    [rows],
  );

  const energy = useMemo(() => {
    const data: ChartData = {
      labels: x,
      datasets: [
        {
          type: 'line',
          label: 'Solar generation',
          data: rows.map((r) => r.generationKwh),
          borderColor: SOLAR,
          backgroundColor: 'rgba(180, 105, 14, 0.12)',
          borderWidth: 1.75,
          pointRadius: 0,
          fill: true,
          tension: 0.35,
        },
        {
          type: 'line',
          label: 'Consumption',
          data: rows.map((r) => r.consumptionKwh),
          borderColor: DEMAND,
          borderWidth: 1.75,
          pointRadius: 0,
          fill: false,
          tension: 0.35,
        },
      ],
    };
    const options = {
      ...baseOptions(rows, bands),
      scales: {
        ...baseOptions(rows, bands).scales,
        y: {
          ...(baseOptions(rows, bands).scales as Record<string, unknown>).y as object,
          title: { display: true, text: 'kWh', color: chartTheme().mute },
        },
      },
    } as ChartOptions;
    return { data, options };
  }, [rows, x, bands]);

  const battery = useMemo(() => {
    const base = baseOptions(rows, bands);
    const data: ChartData = {
      labels: x,
      datasets: [
        {
          type: 'bar',
          label: 'Charge',
          data: rows.map((r) => r.chargeKwh),
          backgroundColor: CHARGE,
          borderWidth: 0,
          barPercentage: 1,
          categoryPercentage: 1,
        },
        {
          type: 'bar',
          label: 'Discharge',
          // Negated at render, stored positive. See the fixture comment.
          data: rows.map((r) => -r.dischargeKwh),
          backgroundColor: DISCHARGE,
          borderWidth: 0,
          barPercentage: 1,
          categoryPercentage: 1,
        },
        {
          type: 'line',
          label: 'State of charge',
          data: rows.map((r) => r.batteryStateOfChargePercent),
          borderColor: SOC,
          borderWidth: 1.75,
          pointRadius: 0,
          fill: false,
          yAxisID: 'y1',
          tension: 0.3,
        },
      ],
    };
    const options = {
      ...base,
      scales: {
        ...base.scales,
        y: {
          ...((base.scales as Record<string, unknown>).y as object),
          title: { display: true, text: 'kWh', color: chartTheme().mute },
        },
        y1: rightAxis('%', 0, 100),
      },
    } as ChartOptions;
    return { data, options };
  }, [rows, x, bands]);

  const grid = useMemo(() => {
    const base = baseOptions(rows, bands);
    const data: ChartData = {
      labels: x,
      datasets: [
        {
          type: 'bar',
          label: 'Import',
          data: rows.map((r) => r.importKwh),
          backgroundColor: IMPORT,
          borderWidth: 0,
          barPercentage: 1,
          categoryPercentage: 1,
        },
        {
          type: 'bar',
          label: 'Export',
          data: rows.map((r) => -r.exportKwh),
          backgroundColor: EXPORT,
          borderWidth: 0,
          barPercentage: 1,
          categoryPercentage: 1,
        },
        {
          type: 'line',
          label: 'Import rate',
          data: rows.map((r) => r.importRateIncVat),
          borderColor: RATE,
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          // Stepped, because a tariff rate is a stepped function and drawing it as a
          // smooth line implies the price glides between slots.
          stepped: true,
          yAxisID: 'y1',
        },
      ],
    };
    const options = {
      ...base,
      scales: {
        ...base.scales,
        y: {
          ...((base.scales as Record<string, unknown>).y as object),
          title: { display: true, text: 'kWh', color: chartTheme().mute },
        },
        y1: rightAxis('p'),
      },
    } as ChartOptions;
    return { data, options };
  }, [rows, x, bands]);

  const sums = useMemo(() => totals(rows), [rows]);
  const driven = bands.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Solar and demand" meta="kWh per half hour">
          <Legend
            items={[
              { label: 'Solar', colour: SOLAR },
              { label: 'Used in the home', colour: DEMAND },
            ]}
          />
          <Chart
            type="line"
            data={energy.data}
            options={energy.options}
            height={CHART_HEIGHT}
            label="Solar generation against household demand, per half hour."
          />
        </Panel>

        <Panel title="Battery" meta="Charge, discharge and state of charge">
          <Legend
            items={[
              { label: 'Charging', colour: CHARGE },
              { label: 'Discharging', colour: DISCHARGE },
              { label: 'State of charge', colour: SOC },
            ]}
          />
          <Chart
            type="bar"
            data={battery.data}
            options={battery.options}
            height={CHART_HEIGHT}
            label="Battery charge and discharge per half hour, with state of charge."
          />
        </Panel>
      </div>

      <Panel title="Grid and prices" meta="Import, export and the unit rate">
        <Legend
          items={[
            { label: 'Bought from the grid', colour: IMPORT },
            { label: 'Sold back', colour: EXPORT },
            { label: 'Unit rate', colour: RATE },
          ]}
        />
        <Chart
          type="bar"
          data={grid.data}
          options={grid.options}
          height={CHART_HEIGHT}
          label="Grid import and export per half hour, with the import unit rate."
        />
        {driven ? (
          <p className="mt-3 border-t border-line pt-3 text-[13px] text-ink-soft">
            <span
              className="mr-1.5 inline-block h-2.5 w-4 rounded-[2px] align-middle"
              style={{ background: 'rgba(12, 101, 96, 0.18)' }}
              aria-hidden="true"
            />
            Shaded hours are Lumo driving the battery, charging when power is cheapest
            and covering the evening peak.
          </p>
        ) : null}
      </Panel>

      <Panel title="Totals" meta="Across the window shown">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
          <Total label="Solar" value={sums.generationKwh} />
          <Total label="Used" value={sums.consumptionKwh} />
          <Total label="Bought" value={sums.importKwh} />
          <Total label="Sold" value={sums.exportKwh} />
          <Total label="Charged" value={sums.chargeKwh} />
          <Total label="Discharged" value={sums.dischargeKwh} />
        </dl>
      </Panel>
    </div>
  );
}

/**
 * The legend, in markup rather than Chart.js.
 *
 * Chart.js legends are canvas-drawn, so they do not inherit the type scale, cannot be
 * selected, and are invisible to a screen reader. These are also relabelled in plain
 * words: the series are "Import" and "Export" in the data because that is what the
 * platform calls them, and "Bought from the grid" on screen because that is what an
 * installer would say.
 */
function Legend({ items }: { items: readonly { label: string; colour: string }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[12px] text-ink-soft">
          <span
            className="inline-block h-2 w-2.5 rounded-[2px]"
            style={{ background: item.colour }}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-mute">{label}</dt>
      <dd className="tnum text-[17px] font-bold text-ink">
        {value.toLocaleString('en-GB', { maximumFractionDigits: 1 })}
        <span className="ml-1 text-[12px] font-semibold text-ink-mute">kWh</span>
      </dd>
    </div>
  );
}
