import { useEffect, useRef } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { Chart as ChartInstance, ChartOptions, ChartData, ChartType } from 'chart.js';

/**
 * Chart.js, wrapped thinly and themed to the Hub.
 *
 * WHY A DEPENDENCY AT ALL, when lumo-app-web hand-rolls SVG and the Funnel on the
 * dashboard is a stack of divs. Those are single-purpose: one shape, one axis, fixed
 * data. This screen needs three charts with a secondary axis, bars below the zero
 * line, categorical time ticks and hover readout, and hand-rolling that came to over
 * 1100 lines in the consumer app for two charts. For a prototype whose job is to be
 * convincing next week, a well-maintained library is the right trade.
 *
 * WHY NOT `react-chartjs-2`. It is a thin wrapper over exactly this, and thin wrappers
 * over rendering libraries are where React major-version lag bites. This repo is on
 * React 19 and the wrapper adds an upgrade dependency for about forty lines of code.
 *
 * ONLY THE PIECES USED ARE REGISTERED. Chart.js ships radar, polar, doughnut and a
 * time-scale adapter, and `registerables` pulls in all of it. Registering seven
 * elements keeps roughly half of it out of the bundle.
 *
 * THEMED, NOT DEFAULT. Chart.js defaults are grey, Helvetica-ish and grid-heavy, which
 * would make an installer-facing product look like an internal admin tool. Fonts,
 * grids and tick colours come from the Hub tokens here so every chart matches without
 * each caller restating it.
 */

ChartJS.register(
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
);

/* Read from the stylesheet rather than duplicated, so a token change moves the charts
   too. Chart.js writes to a canvas and cannot resolve a CSS variable itself. */
const token = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

export const chartTheme = () => ({
  ink: token('--hub-text', '#12140f'),
  soft: token('--hub-text-soft', '#5c625b'),
  mute: token('--hub-text-mute', '#888e86'),
  line: token('--hub-line', '#e5e5e0'),
  surface: token('--hub-surface', '#ffffff'),
});

ChartJS.defaults.font.family =
  'Figtree, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
ChartJS.defaults.font.size = 11;
ChartJS.defaults.animation = false;

/**
 * A shaded band behind the plot, in slot coordinates.
 *
 * This is the element the whole screen turns on. It marks the half-hours where Lumo
 * was actively driving the battery, which is the difference between "this battery is
 * charging" and "we are doing something for you". Without it the charts show a
 * household's energy use; with it they show a service running.
 *
 * Drawn as a `beforeDatasetsDraw` plugin rather than as a dataset because a dataset
 * would appear in the legend, take part in the axis scale, and be togglable, none of
 * which is right for a background.
 */
export interface ChartBand {
  readonly from: number;
  readonly to: number;
  readonly fill: string;
}

const bandsPlugin = {
  id: 'hubBands',
  beforeDatasetsDraw(chart: ChartInstance) {
    const bands = (chart.options as { hubBands?: readonly ChartBand[] }).hubBands;
    if (!bands || bands.length === 0) return;

    const { ctx, chartArea, scales } = chart;
    const x = scales.x;
    if (!x) return;

    ctx.save();
    for (const band of bands) {
      const left = x.getPixelForValue(band.from);
      const right = x.getPixelForValue(band.to);
      ctx.fillStyle = band.fill;
      ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
    }
    ctx.restore();
  },
};

ChartJS.register(bandsPlugin);

/**
 * One canvas, kept in step with its config.
 *
 * The instance is destroyed and rebuilt when the data identity changes rather than
 * mutated in place. Mutating is faster and is the wrong default here: the window
 * toggle changes the number of categories, and Chart.js keeps stale tick state across
 * an in-place update, which showed as ghost gridlines at the old spacing.
 */
export function Chart({
  type,
  data,
  options,
  height,
  label,
}: {
  type: ChartType;
  data: ChartData;
  options: ChartOptions;
  height: number;
  /** Accessible summary. A canvas is opaque to a screen reader without one. */
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const chart = useRef<ChartInstance | null>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;

    chart.current = new ChartJS(element, { type, data, options });

    return () => {
      chart.current?.destroy();
      chart.current = null;
    };
  }, [type, data, options]);

  return (
    <div style={{ height }} className="relative">
      <canvas ref={canvas} role="img" aria-label={label} />
    </div>
  );
}
