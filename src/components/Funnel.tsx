import type { Journey } from '../selectors/journey';
import { pct } from '../selectors/journey';

/**
 * The journey, as bars.
 *
 * Hand-rolled CSS bars rather than a charting library. A funnel is five rectangles
 * and five numbers; pulling in Recharts to draw it would add 400kB to a disposable
 * prototype and hand the type ramp and colour rules to someone else's defaults.
 *
 * BAR WIDTH IS SHARE OF THE LIST. DROP-OFF IS SHARE OF THE STAGE ABOVE. Those are
 * two different questions and conflating them is how funnels mislead: a bar drawn to
 * the conversion percentage makes a 9% bounce rate look like a cliff, and one drawn
 * to share of list hides where the loss actually happened. So the bar shows scale
 * and the label on the right shows conversion.
 *
 * The bars have a floor width. A stage at 3% of the list would otherwise render as a
 * sliver too thin to read a number against, and "too small to see" is not the same
 * information as "small".
 */
export function Funnel({ journey }: { journey: Journey }) {
  return (
    <ol className="space-y-2.5">
      {journey.stages.map((stage, i) => {
        const width = Math.max(stage.ofList * 100, 6);
        const last = i === journey.stages.length - 1;
        return (
          <li key={stage.id}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold text-ink">{stage.label}</p>
              <p className="flex shrink-0 items-baseline gap-2">
                <span className="tnum text-[15px] font-bold text-ink">
                  {stage.count.toLocaleString('en-GB')}
                </span>
                {stage.ofPrevious !== null ? (
                  <span className="tnum text-[12px] text-ink-mute">
                    {pct(stage.ofPrevious)}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-sunk">
              <div
                className={[
                  'h-full rounded-full transition-[width] duration-500',
                  // Green is reserved for money and for earning, per the design
                  // spec. Only the last stage is money, so only it gets the colour.
                  last ? 'bg-accent' : 'bg-ink-mute/45',
                ].join(' ')}
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="mt-1 text-[12px] leading-snug text-ink-mute">{stage.note}</p>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The three things the funnel does not explain on its own.
 *
 * A founder reading "808 on the list, 486 emailed" immediately asks where the other
 * 322 went. Leaving that to inference invites the worst assumption, which is that
 * the product lost them.
 */
export function FunnelAside({ journey }: { journey: Journey }) {
  const items = [
    {
      label: 'Queued to send',
      value: journey.waitingToSend,
      note: 'Cleaned and approved. Going out on the schedule.',
    },
    {
      label: 'No usable address',
      value: journey.unreachable,
      note: 'Only you can supply these.',
    },
    {
      label: 'Stopped chasing',
      value: journey.givenUp + journey.optedOut,
      note: 'Never opened it, or asked us not to write again.',
    },
  ].filter((item) => item.value > 0);

  if (items.length === 0) return null;

  return (
    <dl className="mt-4 grid gap-3 border-t border-line pt-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[12px] text-ink-soft">{item.label}</dt>
          <dd className="tnum mt-0.5 text-[17px] font-bold text-ink">
            {item.value.toLocaleString('en-GB')}
          </dd>
          <dd className="text-[12px] leading-snug text-ink-mute">{item.note}</dd>
        </div>
      ))}
    </dl>
  );
}
