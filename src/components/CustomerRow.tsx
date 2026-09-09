import { displayName } from '../fixtures';
import {
  ACTIVATION,
  CONTACT,
  MATCH,
  OWNER_LABELS,
  REWARD_GBP,
  daysRemainingLabel,
} from '../state';
import type { CustomerRow as Row } from '../selectors/customers';
import { moneyPosition } from '../selectors/customers';
import { actionFor, statusClass, statusFor } from '../selectors/status';
import type { ViewId } from '../selectors/views';
import { AgeChip, Missing, MoneyChip } from './ui';

/**
 * One household on a phone.
 *
 * A household is in a state on all four tracks at once, and the row shows one:
 * where the campaign has got to, in the same words and the same colour the funnel
 * and the desktop table use. The detail panel carries the rest.
 *
 * On Needs you it also carries the instruction, because a phone is exactly where
 * somebody works through a call list and the status alone does not say what to do.
 */

/** True when age should render neutral: nothing anyone does changes this row. */
const ageIsMoot = (row: Row) => row.resolved.owner === 'nobody';

export function CustomerCard({
  row,
  onOpen,
  view,
}: {
  row: Row;
  onOpen: (row: Row) => void;
  view?: ViewId;
}) {
  const { customer, resolved } = row;
  const position = moneyPosition(row);
  const status = statusFor(row);

  return (
    <li>
      <button
        onClick={() => onOpen(row)}
        className="flex min-h-[64px] w-full items-center gap-3 border-b border-line bg-surface px-4 py-3 text-left last:border-b-0"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold text-ink">
            {displayName(customer)}
          </span>
          <span
            className={[
              'mt-1 inline-block rounded-chip px-2 py-0.5 text-[12px] font-semibold',
              statusClass(status.tone),
            ].join(' ')}
          >
            {status.label}
          </span>
          {view === 'attention' ? (
            <span className="mt-1 block truncate text-[13px] text-ink-soft">{actionFor(row)}</span>
          ) : null}
        </span>

        {position === 'pending' ? (
          <MoneyChip>{daysRemainingLabel(resolved.daysRemaining)}</MoneyChip>
        ) : null}
        {position === 'paid' || position === 'confirmed' ? (
          <MoneyChip>£{REWARD_GBP}</MoneyChip>
        ) : null}
        {resolved.state ? (
          <AgeChip days={resolved.ageDays} band={resolved.ageBand} muted={ageIsMoot(row)} />
        ) : null}

        <ChevronIcon />
      </button>
    </li>
  );
}

/**
 * The detail. All four tracks, spelled out, because this is the only place the full
 * position is available and hiding it would make the row's single-state summary feel
 * like a guess. It also carries the audit fields, who supplied this household and on
 * which import, which is the firm's own management data rather than Lumo's.
 */
export function CustomerDetail({ row }: { row: Row }) {
  const { customer, resolved } = row;
  const position = moneyPosition(row);

  return (
    <div className="space-y-4">
      {resolved.state ? (
        <div className="rounded-card border border-line bg-sunk p-3">
          <p className="text-[13px] font-semibold text-ink-soft">What is holding this up</p>
          <p className="mt-1 text-[15px] text-ink">{resolved.state.blocker}</p>
          <p className="mt-3 text-[13px] font-semibold text-ink-soft">
            Down to {OWNER_LABELS[resolved.owner].toLowerCase()}
          </p>
          {resolved.state.action ? (
            <p className="mt-1 text-[15px] text-ink">{resolved.state.action}</p>
          ) : (
            <p className="mt-1 text-[15px] text-ink-soft">Nothing to do.</p>
          )}
        </div>
      ) : (
        <div className="rounded-card border border-line bg-accent-soft p-3">
          <p className="text-[15px] font-semibold text-accent">
            Earning. Nothing needs doing here.
          </p>
        </div>
      )}

      <MoneyLine row={row} position={position} />

      <dl className="divide-y divide-line rounded-card border border-line">
        <DetailRow label="Email" value={customer.email} fallback="Not on your list" />
        <DetailRow label="Postcode" value={customer.postcode} fallback="postcode" />
        <DetailRow label="Campaign" value={CONTACT.states[customer.contact].label} />
        <DetailRow label="Their setup" value={ACTIVATION.states[customer.activation].label} />
        <DetailRow
          label="Credited to you"
          value={customer.match === null ? 'No Lumo account yet' : MATCH.states[customer.match].label}
        />
        <DetailRow label="Inverter" value={customer.inverterMake} fallback="inverter make" />
        <DetailRow
          label="Battery"
          value={customer.batterySizeKwh === null ? null : `${customer.batterySizeKwh} kWh`}
          fallback="battery size"
        />
        <DetailRow label="Supplied by" value={customer.addedBy} />
        <DetailRow label="On your list since" value={customer.importedOn} />
      </dl>
    </div>
  );
}

function MoneyLine({ row, position }: { row: Row; position: ReturnType<typeof moneyPosition> }) {
  const { resolved } = row;

  if (position === 'blocked_by_match') {
    return (
      <p className="rounded-card border border-dead-fg/25 bg-dead-bg p-3 text-[15px] text-dead-fg">
        <strong className="font-semibold">£{REWARD_GBP} is not being credited to you.</strong>{' '}
        They are on Lumo and running. The reward is real, it is just attached to nobody.
      </p>
    );
  }

  if (position === 'paid' || position === 'confirmed') {
    return (
      <p className="rounded-card border border-line bg-accent-soft p-3 text-[15px] text-ink">
        <strong className="font-semibold text-accent">
          £{REWARD_GBP} {position === 'paid' ? 'paid' : 'confirmed'}.
        </strong>{' '}
        {resolved.confirmedButControlDropped
          ? 'Their control has since dropped. We do not take the payment back.'
          : position === 'paid'
            ? 'Already in a pay run.'
            : 'In the next monthly pay run.'}
      </p>
    );
  }

  if (position === 'pending') {
    return (
      <p className="rounded-card border border-line bg-surface p-3 text-[15px] text-ink">
        <strong className="font-semibold">£{REWARD_GBP} pending.</strong>{' '}
        {daysRemainingLabel(resolved.daysRemaining)} of unbroken control. If it drops, the 30
        days start again.
      </p>
    );
  }

  if (position === 'lapsed') {
    return (
      <p className="rounded-card border border-line bg-surface p-3 text-[15px] text-ink">
        <strong className="font-semibold">The 30-day clock reset.</strong> Control stopped
        before it was up, so it restarts from the day control comes back.
      </p>
    );
  }

  return (
    <p className="rounded-card border border-line bg-surface p-3 text-[15px] text-ink-soft">
      £{REWARD_GBP} once their control has run for 30 days in a row. The clock has not
      started.
    </p>
  );
}

function DetailRow({
  label,
  value,
  fallback,
}: {
  label: string;
  value: string | null;
  fallback?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
      <dt className="text-[13px] font-semibold text-ink-soft">{label}</dt>
      <dd className="text-right text-[14px] text-ink">
        {value ?? <Missing label={fallback ?? label.toLowerCase()} />}
      </dd>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-ink-mute"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export { ageIsMoot };
