import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { REWARD_GBP, QUALIFYING_DAYS } from '../state';
import { Button } from './ui';

/**
 * The first-open walkthrough.
 *
 * WHY IT EXISTS. The September review's finding was not that Hub was confusing, it
 * was that Hub asked installers to do sustained work for a return it never showed
 * them, and 31 of 36 accounts were created and never used again. The new model asks
 * for almost nothing: send a file, tick a box, approve one email. That is only an
 * advantage if it is obvious in the first ten seconds, and "obvious" is not something
 * a dashboard can say about itself.
 *
 * WHEN IT SHOWS, and the distinction matters. Once per page load, not once per
 * navigation. `useState` in a component the shell mounts once gives exactly that:
 * moving between Dashboard and Customers leaves it mounted and closed, and a hard
 * refresh remounts and reopens it.
 *
 * DELIBERATELY NOT PERSISTED. No localStorage, no "do not show again". Every other
 * piece of state in this build is in memory and resettable, and a demo that hides its
 * own opening on the second run is a demo that cannot be shown twice. `?guide=off`
 * suppresses it for screenshots and for the deploy smoke check.
 *
 * The step index is deliberately not reset on reopen. The shell gives this component
 * a key that changes each time it is opened, so reopening is a fresh mount starting at
 * step one. Resetting in an effect instead means a render at the wrong step followed
 * immediately by a second render, which the lint rule for cascading renders catches
 * and is right to.
 */

interface Step {
  readonly id: string;
  readonly title: string;
  readonly body: ReactNode;
  /** Where in the app this step happens. Omitted on the welcome step. */
  readonly spot?: Spot;
}

function walkthroughSteps(companyName: string): readonly Step[] {
  return [
    {
      id: 'welcome',
      title: 'Welcome to Lumo',
      body: (
        <>
          <p>This short guide shows how to get your first customers live.</p>
          <p>
            {companyName} earns{' '}
            <strong className="font-bold text-accent">£{REWARD_GBP} per household</strong> that
            signs up and stays connected for {QUALIFYING_DAYS} days. There is no cap and
            nothing to install.
          </p>
        </>
      ),
    },
    {
      id: 'list',
      title: 'Send us your customer list',
      body: (
        <>
          <p>
            A CSV in any shape. Name and email are the minimum, and anything else you have
            helps us match them.
          </p>
          <p>
            Upload it on the Campaign tab, or email it to{' '}
            <strong className="font-semibold text-ink">partners@lumoenergy.co.uk</strong>. Both
            go to the same place.
          </p>
        </>
      ),
      spot: { nav: 2, block: 0, caption: 'Campaign, your customer lists' },
    },
    {
      id: 'load',
      title: 'We load it and check with you',
      body: (
        <>
          <p>
            We tidy it, match it against existing Lumo accounts and email you when it is
            ready. Nothing goes out until you have approved it.
          </p>
          <p>You can rewrite the email or change the sending schedule before it does.</p>
        </>
      ),
      spot: { nav: 2, block: 1, caption: 'Campaign, the email and the schedule' },
    },
    {
      id: 'watch',
      title: 'Watch it land',
      body: (
        <>
          <p>
            Opens, clicks and sign-ups appear as they happen. You do not have to tell us
            anything.
          </p>
          <p>
            If something needs you, a bad address or a bounce, we put it in one short list
            with what to do about it.
          </p>
        </>
      ),
      spot: { nav: 0, block: 0, caption: 'Dashboard, your campaign so far' },
    },
    {
      id: 'live',
      title: 'Then it keeps working',
      body: (
        <>
          <p>
            Once a household is live you can see their battery, their kit and whether Lumo is
            controlling it. If one drops off or needs relinking, we flag it to you.
          </p>
          <p>Rewards are paid to {companyName} monthly.</p>
        </>
      ),
      spot: { nav: 0, block: 1, caption: 'Dashboard, live customers' },
    },
  ];
}

export function Walkthrough({
  companyName,
  open,
  onClose,
}: {
  companyName: string;
  open: boolean;
  onClose: () => void;
}) {
  const steps = walkthroughSteps(companyName);
  const [index, setIndex] = useState(0);
  const last = index === steps.length - 1;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, steps.length]);

  if (!open) return null;

  const step = steps[index];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center lg:p-6">
      <button
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="hub-fade-in absolute inset-0 bg-black/45"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Getting started"
        className="hub-sheet-in relative flex max-h-[92vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-sheet border border-line bg-surface lg:max-h-[86vh] lg:max-w-[520px] lg:rounded-sheet lg:shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-mute">
            Getting started
          </p>
          <button
            onClick={onClose}
            className="rounded-chip px-2 py-1 text-[13px] font-semibold text-ink-mute transition-colors duration-150 hover:text-ink"
          >
            Skip
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-2 pt-3">
          {step.spot ? <MiniScreen spot={step.spot} /> : <Hero />}

          <h2 className="mt-4 text-[21px] font-bold leading-tight text-ink">{step.title}</h2>
          <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-ink-soft">
            {step.body}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-line px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Steps">
            {steps.map((s, n) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={n === index}
                aria-label={`Step ${n + 1}, ${s.title}`}
                onClick={() => setIndex(n)}
                className={[
                  'rounded-full transition-all duration-200',
                  n === index ? 'h-2 w-5 bg-accent' : 'h-2 w-2 bg-line-strong hover:bg-ink-mute',
                ].join(' ')}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {index > 0 ? (
              <Button variant="quiet" onClick={() => setIndex(index - 1)}>
                Back
              </Button>
            ) : null}
            <Button onClick={last ? onClose : () => setIndex(index + 1)}>
              {last ? 'Get started' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The welcome step's illustration.
 *
 * Three stages of the thing being described, not a stock graphic. It is the same
 * left-to-right progression the funnel uses, and the same journey palette, so the
 * colours mean the same thing here as they do on the screen behind.
 */
function Hero() {
  return (
    <div className="flex items-center gap-2 rounded-card bg-gradient-to-r from-accent-soft to-sunk px-4 py-5">
      {[
        { label: 'Your list', fill: 'bg-wait-fg' },
        { label: 'We email', fill: 'bg-sent-fg' },
        { label: 'They join', fill: 'bg-open-fg' },
        { label: `£${REWARD_GBP}`, fill: 'bg-accent' },
      ].map((stage, n) => (
        <div key={stage.label} className="flex flex-1 items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className={`h-2.5 rounded-full ${stage.fill}`} />
            <p className="mt-1.5 truncate text-[11px] font-semibold text-ink-soft">
              {stage.label}
            </p>
          </div>
          {n < 3 ? <Chevron /> : null}
        </div>
      ))}
    </div>
  );
}

interface Spot {
  /** Which nav item this step happens on. 0 Dashboard, 1 Customers, 2 Campaign. */
  readonly nav: 0 | 1 | 2;
  /** Which content panel to ring. 0 is top left, 1 is top right. */
  readonly block: 0 | 1;
  readonly caption: string;
}

/**
 * A schematic of the app with one thing ringed, in place of a screenshot.
 *
 * A screenshot would be sharper and is the wrong call twice over: it would go stale
 * the next time a panel moved, and it would be an image of fixture data presented as
 * an example of the product. A wireframe with a ring on it makes the same point,
 * survives a layout change, and cannot be mistaken for real customers.
 */
function MiniScreen({ spot }: { spot: Spot }) {
  const ring = 'ring-2 ring-accent ring-offset-2 ring-offset-surface';

  return (
    <figure>
      <div className="flex gap-2 rounded-card border border-line bg-sunk p-2.5">
        {/* Sidebar. */}
        <div className="hidden w-[52px] shrink-0 space-y-1.5 rounded-[6px] bg-surface p-1.5 sm:block">
          <div className="h-2 w-8 rounded-full bg-line-strong" />
          <div className="h-1.5 w-6 rounded-full bg-line" />
          <div className="pt-1.5" />
          {[0, 1, 2].map((n) => (
            <div
              key={n}
              className={[
                'h-2.5 rounded-[3px]',
                n === spot.nav ? `bg-accent ${ring}` : 'bg-line',
              ].join(' ')}
            />
          ))}
        </div>

        {/* Content. */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-24 rounded-full bg-line-strong" />
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map((n) => (
              <div
                key={n}
                className={[
                  'space-y-1.5 rounded-[6px] border border-line bg-surface p-2',
                  n === spot.block ? ring : '',
                ].join(' ')}
              >
                <div className="h-1.5 w-10 rounded-full bg-line-strong" />
                <div className="h-1.5 w-full rounded-full bg-line" />
                <div className="h-1.5 w-2/3 rounded-full bg-line" />
              </div>
            ))}
          </div>
          <div className="space-y-1.5 rounded-[6px] border border-line bg-surface p-2">
            <div className="h-1.5 w-full rounded-full bg-line" />
            <div className="h-1.5 w-5/6 rounded-full bg-line" />
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-[12px] font-semibold text-accent">
        {spot.caption}
      </figcaption>
    </figure>
  );
}

function Chevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-ink-mute"
    >
      <path
        d="m7.5 4.5 6 5.5-6 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
