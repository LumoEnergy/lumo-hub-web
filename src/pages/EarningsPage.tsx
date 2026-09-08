import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OWNER_LABELS, QUALIFYING_DAYS, REWARD_GBP, daysRemainingLabel } from '../state';
import { displayName } from '../fixtures';
import { useDemoStore } from '../store/DemoStore';
import { buildRows, earningsSummary, gbp } from '../selectors/customers';
import type { CustomerRow } from '../selectors/customers';
import { CustomerDetail, ageIsMoot } from '../components/CustomerRow';
import { Sheet } from '../components/Sheet';
import {
  AgeChip,
  Button,
  Callout,
  Card,
  EmptyState,
  ScreenTitle,
  SectionHeading,
} from '../components/ui';

/**
 * Earnings, at company level.
 *
 * THE MONEY IS OWED TO THE FIRM. There is no per-person breakdown and no individual
 * leaderboard, because Lumo's customer is the company and Lumo pays the company. If a
 * firm wants to pass a bonus to the engineer who supplied a household that is entirely
 * their business, and the "supplied by" field on each record is there so they can work
 * it out — but it is their decision, made with their own data, not a Lumo scheme.
 *
 * Two rules govern this screen, both settled deliberately because a screen cannot be
 * honest without them:
 *
 *   - Every pending £50 is shown next to the thing holding it up. A pending amount
 *     with no reason attached is the "return we cannot show you" problem restated.
 *   - Confirmed is final. Where control has since dropped, the screen says the payment
 *     is not reversed, in words, rather than leaving a firm to wonder.
 *
 * And one rule about what is absent: no projection, no "you could earn", no annualised
 * figure. Only money that has been earned, is being earned, or has been lost. The live
 * Hub showed installers a growth chart while they had earned nothing, and that is the
 * fastest way to lose the room.
 *
 * ONLY HOUSEHOLDS WITH AN ACCOUNT APPEAR HERE. A back-book campaign has hundreds of
 * rows that have not signed up, and every one of them is technically "not earning".
 * Listing them would bury the twenty that are, and they are already on the customers
 * screen where something can actually be done about them.
 */
export function EarningsPage() {
  const { customers, asOf, company } = useDemoStore();
  const [open, setOpen] = useState<CustomerRow | null>(null);

  const allRows = useMemo(() => buildRows(customers, asOf), [customers, asOf]);
  const rows = useMemo(
    () => allRows.filter((row) => row.customer.contact === 'signed_up'),
    [allRows],
  );
  const summary = useMemo(() => earningsSummary(rows), [rows]);

  if (rows.length === 0) {
    return (
      <>
        <ScreenTitle>Earnings</ScreenTitle>
        <EmptyState
          title="Nothing yet, and no guesses"
          body={`${company.name} earns £${REWARD_GBP} for each household whose smart control runs for ${QUALIFYING_DAYS} days in a row. This screen will only ever show money that is real — the moment one of your customers signs up, they appear here.`}
          action={
            <Link to="/list">
              <Button>See what happened to your list</Button>
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <ScreenTitle sub={`Paid to ${company.name}. £${REWARD_GBP} per household, once.`}>
        Earnings
      </ScreenTitle>

      <div className="px-4 lg:px-0">
        <Card className="p-4">
          <p className="text-[13px] font-semibold text-ink-soft">Yours</p>
          <p className="tnum text-[40px] font-bold leading-none text-accent">
            {gbp(summary.earnedGbp)}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 border-t border-line pt-3">
            <Figure label="Paid" value={gbp(summary.paidGbp)} />
            <Figure label="Next pay run" value={gbp(summary.awaitingPayoutGbp)} />
            <Figure label="Clock running" value={gbp(summary.pendingGbp)} muted />
          </div>
        </Card>
      </div>

      {summary.atStakeGbp > 0 ? (
        <div className="mt-3 px-4 lg:px-0">
          <Callout
            tone="alarm"
            title={`${gbp(summary.atStakeGbp)} earned and credited to nobody`}
            body={`${
              summary.blockedByMatch.length === 1 ? 'A household' : 'Households'
            } on Lumo, running, with nothing tying them to you. Confirm they are yours and we will tie the account across.`}
            action={
              <Button variant="secondary" onClick={() => setOpen(summary.blockedByMatch[0])}>
                {summary.blockedByMatch.length === 1
                  ? 'Claim it'
                  : `Claim ${summary.blockedByMatch.length}`}
              </Button>
            }
          />
        </div>
      ) : null}

      {summary.confirmed.length > 0 ? (
        <MoneySection
          heading="Confirmed"
          note="Served the 30 days. Paid in the next monthly run."
          rows={summary.confirmed}
          onOpen={setOpen}
          detail={(row) =>
            row.resolved.confirmedButControlDropped
              ? 'Control has since dropped. This is not reversed.'
              : 'Yours.'
          }
        />
      ) : null}

      {summary.paid.length > 0 ? (
        <MoneySection
          heading="Paid"
          note="Already in a pay run."
          rows={summary.paid}
          onOpen={setOpen}
          detail={(row) =>
            row.resolved.confirmedButControlDropped
              ? 'Control has since dropped. This is not reversed.'
              : 'Paid.'
          }
        />
      ) : null}

      {summary.pending.length > 0 ? (
        <MoneySection
          heading="Clock running"
          note={`${QUALIFYING_DAYS} days of unbroken control. If it drops, the clock starts again.`}
          rows={summary.pending}
          onOpen={setOpen}
          detail={(row) => daysRemainingLabel(row.resolved.daysRemaining)}
        />
      ) : null}

      {summary.lapsed.length > 0 ? (
        <MoneySection
          heading="Clock reset"
          note="Control stopped before the 30 days were up. Not lost — it restarts when control comes back."
          rows={summary.lapsed}
          onOpen={setOpen}
          showBlocker
        />
      ) : null}

      {summary.notStarted.length > 0 ? (
        <MoneySection
          heading="Signed up, not earning yet"
          note="The 30 days begin the first time their control runs. Each of these is waiting on something."
          rows={summary.notStarted}
          onOpen={setOpen}
          showBlocker
        />
      ) : null}

      <p className="px-4 py-6 text-center text-[13px] text-ink-mute lg:px-0">
        £{REWARD_GBP} per household, once, paid to {company.name}. No forecasts on this
        screen — only what is real.
      </p>

      <Sheet
        open={open !== null}
        title={open ? displayName(open.customer) : ''}
        onClose={() => setOpen(null)}
      >
        {open ? <CustomerDetail row={open} /> : null}
      </Sheet>
    </>
  );
}

function Figure({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="min-w-[7rem] flex-1">
      <p className={`tnum text-[17px] font-bold ${muted ? 'text-ink-soft' : 'text-ink'}`}>
        {value}
      </p>
      <p className="text-[12px] font-semibold text-ink-mute">{label}</p>
    </div>
  );
}

/**
 * A money section. `showBlocker` is what ties a pending £50 to the reason it is
 * pending, and names who owns that reason — otherwise the firm is looking at money
 * they cannot act on.
 */
function MoneySection({
  heading,
  note,
  rows,
  onOpen,
  detail,
  showBlocker,
}: {
  heading: string;
  note: string;
  rows: readonly CustomerRow[];
  onOpen: (row: CustomerRow) => void;
  detail?: (row: CustomerRow) => string;
  showBlocker?: boolean;
}) {
  return (
    <section>
      <SectionHeading count={rows.length}>{heading}</SectionHeading>
      <p className="px-4 pb-2 text-[13px] text-ink-mute lg:px-0">{note}</p>
      <Card className="mx-4 overflow-hidden lg:mx-0">
        <ul>
          {rows.map((row) => (
            <li key={row.customer.id}>
              <button
                onClick={() => onOpen(row)}
                className="flex min-h-[56px] w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-sunk lg:min-h-[44px] lg:py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold text-ink lg:text-[15px]">
                    {displayName(row.customer)}
                  </span>
                  {showBlocker && row.resolved.state ? (
                    <span className="block truncate text-[14px] text-ink-soft lg:text-[13px]">
                      {row.resolved.state.label} · {OWNER_LABELS[row.resolved.owner]}
                    </span>
                  ) : detail ? (
                    <span className="block truncate text-[14px] text-ink-soft lg:text-[13px]">
                      {detail(row)}
                    </span>
                  ) : null}
                </span>
                {showBlocker && row.resolved.state ? (
                  <AgeChip
                    days={row.resolved.ageDays}
                    band={row.resolved.ageBand}
                    muted={ageIsMoot(row)}
                  />
                ) : null}
                <span className="tnum shrink-0 text-[15px] font-semibold text-ink">
                  £{REWARD_GBP}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
