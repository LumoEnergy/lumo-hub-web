import { displayName } from '../fixtures';
import {
  ACTIVATION,
  INVITE,
  MATCH,
  OWNER_LABELS,
  REWARD_GBP,
  daysRemainingLabel,
} from '../state';
import type { CustomerRow as Row } from '../selectors/customers';
import { moneyPosition } from '../selectors/customers';
import { AgeChip, MoneyChip } from './ui';

/**
 * One household, one line of why it matters.
 *
 * A household is in a state on all four tracks at once. Showing four badges moves
 * the work onto the installer, so the row shows the single nominated blocker and the
 * detail sheet shows everything. The age chip is the only coloured element, because
 * age is the dimension that decides whether this is a call today or a lost cause.
 */
export function CustomerRowItem({ row, onOpen }: { row: Row; onOpen: (row: Row) => void }) {
  const { customer, resolved } = row;
  const position = moneyPosition(row);

  return (
    <li>
      <button
        onClick={() => onOpen(row)}
        className="flex min-h-[56px] w-full items-center gap-3 border-b border-line bg-surface px-4 py-3 text-left last:border-b-0"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold text-ink">
            {displayName(customer)}
          </span>
          <span className="block truncate text-[14px] text-ink-soft">
            {resolved.state ? resolved.state.label : 'Earning'}
          </span>
        </span>

        {position === 'pending' ? (
          <MoneyChip>{daysRemainingLabel(resolved.daysRemaining)}</MoneyChip>
        ) : null}
        {position === 'paid' || position === 'confirmed' ? (
          <MoneyChip>£{REWARD_GBP}</MoneyChip>
        ) : null}
        {resolved.state ? <AgeChip days={resolved.ageDays} band={resolved.ageBand} /> : null}

        <ChevronIcon />
      </button>
    </li>
  );
}

/**
 * The detail sheet. All four tracks, spelled out, because this is the only place the
 * full position is available and hiding it would make the row's single-state summary
 * feel like a guess.
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
            Whose job — {OWNER_LABELS[resolved.owner]}
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
        <DetailRow label="Invite" value={detailLabel(row, 'invite')} />
        <DetailRow label="Their setup" value={detailLabel(row, 'activation')} />
        <DetailRow label="Matched to you" value={detailLabel(row, 'match')} />
        <DetailRow label="Inverter" value={customer.inverterMake} />
        <DetailRow label="Battery" value={`${customer.batterySizeKwh} kWh`} />
        <DetailRow label="Email" value={customer.email ?? 'Not captured'} />
        <DetailRow label="Added" value={customer.addedOn} />
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
        They are on Lumo and their control is running — the reward is real, it is just
        attached to nobody.
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
          ? 'Their control has since dropped. This payment is not reversed — that is not something you could have controlled.'
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

/**
 * Labels come from the state model rather than being restated here, so the sheet
 * cannot drift from the generated copy table.
 */
function detailLabel(row: Row, track: 'invite' | 'activation' | 'match'): string {
  const { customer } = row;
  if (track === 'invite') return INVITE.states[customer.invite].label;
  if (track === 'activation') return ACTIVATION.states[customer.activation].label;
  return customer.match === null
    ? 'No Lumo account yet'
    : MATCH.states[customer.match].label;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
      <dt className="text-[13px] font-semibold text-ink-soft">{label}</dt>
      <dd className="text-right text-[14px] text-ink">{value}</dd>
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
