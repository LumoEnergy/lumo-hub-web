import { useId, useState } from 'react';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';
import type { AgeBand, Owner } from '../state';
import { AGE_BAND_LABELS, ageLabel } from '../state';

/**
 * The primitives. Hand-rolled rather than pulled from a component library: the
 * surface is four screens, and a dependency in a repo whose whole point is being
 * disposable would outlive its usefulness.
 *
 * Everything here follows docs/visual-design-spec.md. The rules that matter:
 * age drives colour, owner drives grouping, one dimension per channel. Green is
 * reserved for money and earning and never appears on a blocker.
 *
 * ON PADDING. Mobile screens own their own 16px gutter (`px-4`); on desktop the
 * shell's container supplies 32px, so screen-level components drop their padding at
 * `lg`. Doing it the other way round, padding on the container at every width,
 * double-pads the phone layout.
 */

const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ');

export function Card({
  children,
  className,
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  /** `section` where the card is a landmark in its own right, see `Panel`. */
  as?: 'div' | 'section';
} & Pick<HTMLAttributes<HTMLElement>, 'aria-labelledby'>) {
  return (
    <Tag className={cx('rounded-card border border-line bg-surface', className)} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * A titled block. Used for everything on `Your list`, where each section is a
 * separate thing the firm might act on and needs its own frame.
 *
 * A real `<section>` with its heading wired up via `aria-labelledby`, so the page
 * navigates by landmark rather than being one undifferentiated slab of divs.
 */
export function Panel({
  title,
  meta,
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <Card as="section" aria-labelledby={id} className={cx('overflow-hidden', className)}>
      {/* A whisper of accent across the header. Enough that a stack of panels reads
          as a designed page rather than a run of grey bars, nowhere near enough to
          compete with the one green number on the screen that means money. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line bg-gradient-to-r from-accent-soft to-sunk px-4 py-3">
        <h2 id={id} className="text-[15px] font-bold text-ink">
          {title}
        </h2>
        {meta ? <p className="text-[13px] text-ink-mute">{meta}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

export function ScreenTitle({
  children,
  count,
  sub,
  action,
}: {
  children: ReactNode;
  count?: number;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3 lg:px-0 lg:pt-0 lg:pb-5">
      <div>
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-[24px] font-bold leading-tight text-ink lg:text-[28px]">
            {children}
          </h1>
          {count === undefined ? null : (
            <span className="tnum text-[16px] font-semibold text-ink-mute lg:text-[18px]">
              {count.toLocaleString('en-GB')}
            </span>
          )}
        </div>
        {sub ? <p className="mt-1 max-w-[68ch] text-[15px] text-ink-soft">{sub}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function SectionHeading({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="flex items-baseline gap-2 px-4 pt-5 pb-2 text-[13px] font-semibold text-ink-soft lg:px-0">
      <span>{children}</span>
      {count === undefined ? null : <span className="tnum text-ink-mute">{count}</span>}
    </h2>
  );
}

/**
 * The figures above the list. Deliberately counts and money, never a projection.
 */
export function SummaryStrip({
  items,
}: {
  items: readonly { label: string; value: string; tone?: 'default' | 'accent' | 'warn' }[];
}) {
  const tones = {
    default: 'text-ink',
    accent: 'text-accent',
    warn: 'text-stale-fg',
  } as const;

  return (
    <div className="grid grid-cols-3 gap-2 px-4 lg:px-0">
      {items.map((item) => (
        <Card key={item.label} className="px-3 py-2.5">
          <p
            className={cx(
              'tnum text-[20px] font-bold leading-tight lg:text-[22px]',
              tones[item.tone ?? 'default'],
            )}
          >
            {item.value}
          </p>
          <p className="mt-0.5 text-[12px] leading-tight text-ink-soft lg:text-[13px]">
            {item.label}
          </p>
        </Card>
      ))}
    </div>
  );
}

/**
 * A full-width block above the list, for the two things worth more than a row: a
 * household earning with nobody credited, and a batch of rows only the firm can
 * unblock. Both carry the money, because the money is the argument.
 */
export function Callout({
  title,
  body,
  money,
  action,
  tone = 'attention',
}: {
  title: string;
  body: string;
  money?: string;
  action?: ReactNode;
  tone?: 'attention' | 'alarm';
}) {
  const border = tone === 'alarm' ? 'border-dead-bg' : 'border-line';
  const bar = tone === 'alarm' ? 'bg-dead-fg' : 'bg-stale-fg';

  return (
    <Card className={cx('flex overflow-hidden', border)}>
      <span className={cx('w-1 shrink-0', bar)} aria-hidden="true" />
      <div className="flex flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-3 p-4">
        <div className="min-w-[16rem] flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-[15px] font-bold text-ink">{title}</h3>
            {money ? (
              <span className="tnum text-[15px] font-bold text-ink-soft">{money}</span>
            ) : null}
          </div>
          <p className="mt-1 max-w-[62ch] text-[14px] leading-snug text-ink-soft">{body}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </Card>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'quiet';

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:brightness-110',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunk',
  quiet: 'bg-transparent text-ink-soft hover:text-ink',
};

export function Button({
  variant = 'primary',
  full,
  small,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  full?: boolean;
  small?: boolean;
}) {
  return (
    <button
      {...rest}
      className={cx(
        // 48px on mobile for a thumb, 40px on desktop for a mouse. The consumer
        // app's 64px does not survive a list at either width.
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,filter,color] duration-150 disabled:opacity-40',
        small
          ? 'h-9 px-3.5 text-[13px]'
          : 'h-12 px-5 text-[16px] lg:h-10 lg:px-4 lg:text-[15px]',
        BUTTON_STYLES[variant],
        full && 'w-full',
        className,
      )}
    />
  );
}

export function StateChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-chip bg-sunk px-2 py-0.5 text-[12px] font-semibold text-ink-soft">
      {children}
    </span>
  );
}

const AGE_STYLES: Record<AgeBand, string> = {
  fresh: 'bg-sunk text-ink-mute',
  ageing: 'bg-ageing-bg text-ageing-fg',
  stale: 'bg-stale-bg text-stale-fg',
  dead: 'bg-dead-bg text-dead-fg',
};

/**
 * The only coloured element on a blocked row. Three days and six weeks must not look
 * the same, so the band drives both the colour and, from `stale` upward, an explicit
 * word for what the age means.
 *
 * `muted` forces the neutral treatment regardless of age, and exists for rows nobody
 * can act on. Around half of any campaign never opens the email; banding those by age
 * would paint most of the table orange for something nobody did wrong, and an alarm
 * that fires on the majority of rows is an alarm people stop reading.
 */
export function AgeChip({
  days,
  band,
  muted,
}: {
  days: number;
  band: AgeBand;
  muted?: boolean;
}) {
  const effective: AgeBand = muted ? 'fresh' : band;
  const spellItOut = effective === 'stale' || effective === 'dead';
  return (
    <span
      className={cx(
        'tnum shrink-0 rounded-chip px-2 py-0.5 text-[12px] font-semibold',
        AGE_STYLES[effective],
      )}
      title={AGE_BAND_LABELS[band]}
    >
      {spellItOut ? `${AGE_BAND_LABELS[effective]} · ${ageLabel(days)}` : ageLabel(days)}
    </span>
  );
}

export function MoneyChip({ children }: { children: ReactNode }) {
  return (
    <span className="tnum shrink-0 rounded-chip bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent">
      {children}
    </span>
  );
}

export function OwnerLine({ owner, label }: { owner: Owner; label: string }) {
  return (
    <p className="text-[13px] text-ink-mute">
      <span className={owner === 'installer' ? 'font-semibold text-ink-soft' : undefined}>
        {label}
      </span>
    </p>
  );
}

const LABEL_CLASS = 'mb-1 block text-[13px] font-semibold text-ink-soft';
const CONTROL_CLASS =
  'h-12 w-full rounded-chip border border-line-strong bg-surface px-3 text-[16px] text-ink placeholder:text-ink-mute lg:h-10 lg:text-[15px]';

/**
 * The hint is a sibling described by `aria-describedby` rather than a child of the
 * label. Inside the label it becomes part of the field's accessible name, so a screen
 * reader announces the whole sentence as the field's title.
 */
export function Field({
  label,
  hint,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = `${inputId}-hint`;

  return (
    <div className="block">
      <label htmlFor={inputId} className={LABEL_CLASS}>
        {label}
      </label>
      <input
        {...rest}
        id={inputId}
        aria-describedby={hint ? hintId : undefined}
        className={CONTROL_CLASS}
      />
      {hint ? (
        <p id={hintId} className="mt-1 text-[13px] text-ink-mute">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A row of filters over one list.
 *
 * NOT `role="tablist"`, which is what this used to claim. Tabs promise a panel per
 * tab, and a screen reader told "tab, 1 of 4" then given no `tabpanel` and no
 * `aria-controls` has been misled about the structure of the page. These press in
 * and out over a single list that stays put, which is exactly `aria-pressed`.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-1 rounded-full border border-line bg-surface p-1 lg:inline-flex"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'h-10 flex-1 rounded-full px-4 text-[14px] font-semibold transition-colors duration-150 lg:h-8 lg:flex-none lg:text-[13px]',
              active ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink',
            )}
          >
            {option.label}
            {option.count === undefined ? null : (
              <span className="tnum ml-1 opacity-70">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-4 py-10 text-center lg:px-0">
      <h2 className="text-[20px] font-bold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-[46ch] text-[15px] text-ink-soft">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function CopyBlock({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-chip border border-line bg-sunk p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink-soft">{label}</span>
        <CopyButton value={value} />
      </div>
      <p className={cx('text-[14px] text-ink', multiline ? 'whitespace-pre-wrap' : 'truncate')}>
        {value}
      </p>
    </div>
  );
}

export function CopyButton({ value }: { value: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      // No clipboard permission, or an insecure context. Selecting the text by hand
      // still works, and a failed copy must not read as a broken product mid-session.
      setState('failed');
    }
    setTimeout(() => setState('idle'), 1800);
  };

  return (
    <button
      onClick={copy}
      className={cx(
        'rounded-chip px-2 py-1 text-[13px] font-semibold',
        state === 'failed' ? 'text-ink-mute' : 'text-accent',
      )}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select to copy' : 'Copy'}
    </button>
  );
}

/**
 * Data an imported back-book genuinely does not carry.
 *
 * Words, not a dash. A dash is quieter, which is the argument for it, but it also
 * reads as a rendering failure to anyone who has not been told the convention, and
 * "not given" is two words that never need explaining.
 *
 * `label` is optional because this does two jobs: a missing field, where naming it
 * explains the gap, and a figure that does not exist yet, such as an outcome count
 * on a file still processing, where there is nothing to name.
 */
export function Missing({ label }: { label?: string }) {
  return (
    <span
      className="text-[13px] text-ink-mute italic"
      title={label ? `Not in the list you supplied: ${label}` : undefined}
    >
      not given
    </span>
  );
}
