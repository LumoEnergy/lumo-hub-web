import type { FleetHealth, Journey, StageId } from '../selectors/journey';
import { pct } from '../selectors/journey';

/**
 * The funnel, as a left-aligned bar chart.
 *
 * Centred bars were tried, on the reasoning that a symmetrical taper is the shape
 * everybody recognises from a funnel diagram. In practice it cost more than it
 * bought: with a shared left edge the eye compares five bar ends against one datum,
 * and centring gives it two moving edges and no datum at all. The narrow stages at
 * the bottom, which are the interesting ones, became hardest to compare.
 *
 * The prose went at the same time as the centring. It was a label, a sentence and a
 * percentage per stage on a panel whose whole job is to be glanced at.
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

/**
 * Below this share of the list, the count will not fit inside its own bar.
 *
 * A 14% floor width was the first attempt, and it was wrong in a way that mattered:
 * opened, signed up and earning are 11%, 4.6% and 3.3% of Northfield's book, so all
 * three were clamped to the same width and three different numbers drew three
 * identical bars. The bottom half of the funnel is exactly where a founder is
 * looking. Width is share of the list, literally, all the way down, and a bar too
 * narrow to hold its own number puts the number outside itself instead.
 */
const LABEL_INSIDE = 0.16;

export function Funnel({ journey }: { journey: Journey }) {
  return (
    <ol className="space-y-1.5">
      {journey.stages.map((stage) => {
        // Zero gets no bar at all. A minimum keeps a sliver visible rather than
        // invisible, but applying one to an empty stage draws a green block next to
        // "Earning 0", which is the one thing a funnel must never imply.
        const empty = stage.count === 0;
        const inside = stage.ofList >= LABEL_INSIDE;
        const count = stage.count.toLocaleString('en-GB');

        return (
          <li key={stage.id} className="flex items-center gap-2 sm:gap-3">
            <span className="w-[5.5rem] shrink-0 text-right text-[13px] font-semibold text-ink-soft sm:w-28">
              {stage.label}
            </span>

            <span className="flex flex-1 items-center" title={stage.hint}>
              {empty ? (
                <span className="tnum text-[13px] text-ink-mute">none yet</span>
              ) : (
                // Absolutely positioned rather than a sibling in the flex row so the
                // bar's own width is unaffected by whether its count sits inside it.
                <span
                  className={[
                    'relative flex h-8 items-center justify-center rounded-md',
                    'text-[14px] font-bold text-white tabular-nums',
                    'transition-[width] duration-500',
                    FILL[stage.id],
                  ].join(' ')}
                  style={{ width: `${Math.max(stage.ofList * 100, 1.5)}%` }}
                >
                  {inside ? (
                    count
                  ) : (
                    <span className="tnum absolute left-full ml-2 font-bold text-ink">
                      {count}
                    </span>
                  )}
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
