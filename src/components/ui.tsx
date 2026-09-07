import { useId, useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import type { AgeBand, Owner } from '../state';
import { AGE_BAND_LABELS, ageLabel } from '../state';

/**
 * The primitives. Hand-rolled rather than pulled from a component library: the
 * surface is three screens, and a dependency in a repo whose whole point is being
 * disposable would outlive its usefulness.
 *
 * Everything here follows docs/visual-design-spec.md. The rule that matters:
 * age drives colour, owner drives grouping, one dimension per channel. Green is
 * reserved for money and earning and never appears on a blocker.
 */

const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ');

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'rounded-card border border-line bg-surface',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ScreenTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="px-4 pt-4 pb-3">
      <h1 className="text-[24px] font-bold leading-tight text-ink">{children}</h1>
      {sub ? <p className="mt-1 text-[15px] text-ink-soft">{sub}</p> : null}
    </header>
  );
}

export function SectionHeading({
  children,
  count,
}: {
  children: ReactNode;
  count?: number;
}) {
  return (
    <h2 className="flex items-baseline gap-2 px-4 pt-5 pb-2 text-[13px] font-semibold text-ink-soft">
      <span>{children}</span>
      {count === undefined ? null : (
        <span className="tnum text-ink-mute">{count}</span>
      )}
    </h2>
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
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  full?: boolean;
}) {
  return (
    <button
      {...rest}
      className={cx(
        // 48px, not the consumer app's 64px: a list-first tool cannot spend that
        // much vertical space per action.
        'inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-[16px] font-semibold transition-[background-color,filter,color] duration-150 disabled:opacity-40',
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
 */
export function AgeChip({ days, band }: { days: number; band: AgeBand }) {
  const spellItOut = band === 'stale' || band === 'dead';
  return (
    <span
      className={cx(
        'tnum shrink-0 rounded-chip px-2 py-0.5 text-[12px] font-semibold',
        AGE_STYLES[band],
      )}
      title={AGE_BAND_LABELS[band]}
    >
      {spellItOut ? `${AGE_BAND_LABELS[band]} · ${ageLabel(days)}` : ageLabel(days)}
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
  'h-12 w-full rounded-chip border border-line-strong bg-surface px-3 text-[16px] text-ink placeholder:text-ink-mute';

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

export function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="block">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={CONTROL_CLASS}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="mx-4 flex gap-1 rounded-full border border-line bg-surface p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'h-10 flex-1 rounded-full text-[14px] font-semibold transition-colors duration-150',
              active ? 'bg-ink text-white' : 'text-ink-soft',
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
    <div className="px-4 py-10 text-center">
      <h2 className="text-[20px] font-bold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-[36ch] text-[15px] text-ink-soft">{body}</p>
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
      <p
        className={cx(
          'text-[14px] text-ink',
          multiline ? 'whitespace-pre-wrap' : 'truncate',
        )}
      >
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
