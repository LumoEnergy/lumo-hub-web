import type { FleetHealth, Journey, StageId } from '../selectors/journey';
import { pct } from '../selectors/journey';

/**
 * The funnel, drawn as a funnel.
 *
 * The first version was left-aligned bars with a sentence under each one. It was
 * accurate and it read as a report. Centring the bars gives the shape people already
 * know from every funnel they have ever seen, which means it is understood before it
 * is read, and dropping the prose leaves a label, a count and a drop-off.
 *
 * COLOUR CARRIES THE STAGE. Grey for the list, blue once an email has gone, teal
 * once somebody has engaged, green once money is involved. The status chips in the
 * customer table use the same five, so a colour learned here is a colour recognised
 * there. Green stays reserved for money, which is why signing up is teal and earning
 * is green: signing up is not yet paid.
 */

const FILL: Record<StageId, string> = {
  list: 'bg-wait-fg',
  emailed: 'bg-sent-fg',
  opened: 'bg-open-fg',
  signed_up: 'bg-click-fg',
  earning: 'bg-accent',
};

export function Funnel({ journey }: { journey: Journey }) {
  return (
    <ol className="space-y-1.5">
      {journey.stages.map((stage) => {
        // Zero gets no bar at all. The floor width keeps a small number readable,
        // but applying it to an empty stage draws a green block next to "Earning 0",
        // which is the one thing a funnel must never imply.
        const width = stage.count === 0 ? 0 : Math.max(stage.ofList * 100, 14);

        return (
          <li key={stage.id} className="flex items-center gap-2 sm:gap-3">
            <span className="w-[5.5rem] shrink-0 text-right text-[13px] font-semibold text-ink-soft sm:w-28">
              {stage.label}
            </span>

            <span className="flex flex-1 justify-center" title={stage.hint}>
              {width === 0 ? (
                <span className="tnum text-[13px] text-ink-mute">none yet</span>
              ) : (
                <span
                  className={[
                    'flex h-8 min-w-[3.75rem] items-center justify-center rounded-md',
                    'text-[14px] font-bold text-white tabular-nums',
                    'transition-[width] duration-500',
                    FILL[stage.id],
                  ].join(' ')}
                  style={{ width: `${width}%` }}
                >
                  {stage.count.toLocaleString('en-GB')}
                </span>
              )}
            </span>

            <span className="w-11 shrink-0 text-right text-[12px] text-ink-mute tabular-nums">
              {stage.ofPrevious === null ? '' : pct(stage.ofPrevious)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Where the households that are not in the funnel went.
 *
 * A funnel that shows 808 at the top and 486 one row down owes the reader the other
 * 322. Two of these five are things the firm can fix, and those are marked, which is
 * the whole route from this screen to a piece of work.
 */
export function DropOuts({ journey }: { journey: Journey }) {
  if (journey.dropOuts.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {journey.dropOuts.map((drop) => (
        <li
          key={drop.id}
          className={[
            'rounded-chip border px-2.5 py-1.5',
            drop.actionable ? 'border-warn-fg/25 bg-warn-bg' : 'border-line bg-sunk',
          ].join(' ')}
        >
          <span
            className={[
              'tnum text-[15px] font-bold',
              drop.actionable ? 'text-warn-fg' : 'text-ink-soft',
            ].join(' ')}
          >
            {drop.count.toLocaleString('en-GB')}
          </span>
          <span
            className={[
              'ml-1.5 text-[12px]',
              drop.actionable ? 'text-warn-fg' : 'text-ink-mute',
            ].join(' ')}
          >
            {drop.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The live fleet. Proof that this screen becomes a monitoring surface.
 *
 * Three things only: is control running, is the reward clock ticking, and what kit
 * are they on. No energy, no state of charge, no savings. See `fleetHealth`.
 */
export function FleetStrip({ fleet }: { fleet: FleetHealth }) {
  if (fleet.signedUp === 0) return null;

  const bars = [
    { label: 'Control running', count: fleet.live, fill: 'bg-accent' },
    { label: 'Still setting up', count: fleet.settingUp, fill: 'bg-open-fg' },
    { label: 'Needs a look', count: fleet.needsLook, fill: 'bg-warn-fg' },
  ].filter((bar) => bar.count > 0);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-sunk">
          {bars.map((bar) => (
            <div
              key={bar.label}
              className={bar.fill}
              style={{ width: `${(bar.count / fleet.signedUp) * 100}%` }}
            />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {bars.map((bar) => (
            <li key={bar.label} className="flex items-center gap-1.5 text-[12px] text-ink-soft">
              <span className={`h-2 w-2 shrink-0 rounded-full ${bar.fill}`} aria-hidden="true" />
              <span className="tnum font-semibold text-ink">{bar.count}</span>
              {bar.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
        <div>
          <p className="tnum text-[22px] font-bold leading-none text-accent">{fleet.qualified}</p>
          <p className="mt-1 text-[12px] text-ink-soft">Past 30 days, reward earned</p>
        </div>
        <div>
          <p className="tnum text-[22px] font-bold leading-none text-open-fg">
            {fleet.onTheClock}
          </p>
          <p className="mt-1 text-[12px] text-ink-soft">Clock still running</p>
        </div>
      </div>

      {fleet.kit.length > 0 ? (
        <div className="border-t border-line pt-3">
          <p className="text-[12px] font-semibold text-ink-soft">Kit we are controlling</p>
          <ul className="mt-2 space-y-1.5">
            {fleet.kit.slice(0, 3).map((entry) => (
              <li key={entry.make} className="flex items-center gap-2">
                <span className="w-20 shrink-0 truncate text-[12px] text-ink-soft">
                  {entry.make}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
                  <span
                    className="block h-full rounded-full bg-click-fg"
                    style={{ width: `${(entry.count / fleet.kit[0].count) * 100}%` }}
                  />
                </span>
                <span className="tnum w-7 shrink-0 text-right text-[12px] font-semibold text-ink">
                  {entry.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
