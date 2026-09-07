import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OWNER_GROUP_HEADINGS, REWARD_GBP } from '../state';
import { displayName } from '../fixtures';
import { useDemoStore } from '../store/DemoStore';
import {
  actionQueue,
  buildRows,
  earningCount,
  earningsSummary,
  gbp,
  needsAttentionCount,
  unmatchedRows,
} from '../selectors/customers';
import type { CustomerRow } from '../selectors/customers';
import { CustomerDetail, CustomerRowItem } from '../components/CustomerRow';
import { Sheet } from '../components/Sheet';
import {
  Button,
  Card,
  EmptyState,
  ScreenTitle,
  SectionHeading,
  SegmentedToggle,
} from '../components/ui';

type View = 'queue' | 'all';

export function CustomersPage() {
  const { customers, asOf, dirty, reset, installer } = useDemoStore();
  const [view, setView] = useState<View>('queue');
  const [open, setOpen] = useState<CustomerRow | null>(null);

  const rows = useMemo(() => buildRows(customers, asOf), [customers, asOf]);
  const groups = useMemo(() => actionQueue(rows), [rows]);
  const unmatched = useMemo(() => unmatchedRows(rows), [rows]);
  const summary = useMemo(() => earningsSummary(rows), [rows]);
  const attention = needsAttentionCount(rows);

  if (customers.length === 0) {
    return (
      <>
        <ScreenTitle>Your customers</ScreenTitle>
        <EmptyState
          title="No customers yet"
          body={`Add a household you have fitted a battery for. When their smart control has run for 30 days in a row, you earn £${REWARD_GBP}. Lumo can do the chasing, or you can.`}
          action={
            <Link to="add">
              <Button>Add your first customer</Button>
            </Link>
          }
        />
        <p className="px-4 text-center text-[13px] text-ink-mute">
          Nothing here is a forecast. You will only ever see households you have actually
          added.
        </p>
      </>
    );
  }

  return (
    <>
      <ScreenTitle>Your customers</ScreenTitle>

      <div className="grid grid-cols-3 gap-2 px-4">
        <Stat value={attention} label="Need chasing" tone={attention > 0 ? 'alert' : 'plain'} />
        <Stat value={earningCount(rows)} label="Earning" tone="good" />
        <Stat value={gbp(summary.earnedGbp)} label="Yours so far" tone="good" />
      </div>

      {unmatched.length > 0 ? <UnmatchedCallout rows={unmatched} onOpen={setOpen} /> : null}

      <div className="mt-5">
        <SegmentedToggle<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'queue', label: 'Needs attention', count: attention },
            { value: 'all', label: 'All', count: rows.length },
          ]}
        />
      </div>

      {view === 'queue' ? (
        groups.length === 0 ? (
          <EmptyState
            title="Nothing needs chasing"
            body="Every household is either earning or waiting on something that resolves itself. This is the good outcome."
            action={
              <Button variant="secondary" onClick={() => setView('all')}>
                See all {rows.length}
              </Button>
            }
          />
        ) : (
          groups.map((group) => (
            <section key={group.owner}>
              <SectionHeading count={group.rows.length}>
                {OWNER_GROUP_HEADINGS[group.owner]}
              </SectionHeading>
              <Card className="mx-4 overflow-hidden">
                <ul>
                  {group.rows.map((row) => (
                    <CustomerRowItem key={row.customer.id} row={row} onOpen={setOpen} />
                  ))}
                </ul>
              </Card>
            </section>
          ))
        )
      ) : (
        <section>
          <SectionHeading count={rows.length}>Everyone you have added</SectionHeading>
          <Card className="mx-4 overflow-hidden">
            <ul>
              {rows.map((row) => (
                <CustomerRowItem key={row.customer.id} row={row} onOpen={setOpen} />
              ))}
            </ul>
          </Card>
        </section>
      )}

      <footer className="px-4 py-6 text-center">
        <p className="text-[13px] text-ink-mute">
          {installer.firstName} {installer.lastName} · {installer.company}
        </p>
        {dirty ? (
          <Button variant="quiet" className="mt-1 h-9 text-[13px]" onClick={reset}>
            Reset this demo
          </Button>
        ) : null}
      </footer>

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

function Stat({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone: 'plain' | 'good' | 'alert';
}) {
  const valueColour =
    tone === 'good' ? 'text-accent' : tone === 'alert' ? 'text-ink' : 'text-ink-mute';
  return (
    <Card className="px-3 py-2.5">
      <p className={`tnum text-[22px] font-bold leading-none ${valueColour}`}>{value}</p>
      <p className="mt-1 text-[12px] font-semibold text-ink-soft">{label}</p>
    </Card>
  );
}

/**
 * The one place the design breaks its own row pattern, deliberately.
 *
 * `unmatched_different_email` is the state that silently eats an installer's £50: the
 * household is on Lumo and earning, the installer did the work, and a row in a list
 * would look exactly like a lead that never converted. If a research participant has
 * to be pointed at this, it has failed.
 */
function UnmatchedCallout({
  rows,
  onOpen,
}: {
  rows: readonly CustomerRow[];
  onOpen: (row: CustomerRow) => void;
}) {
  const total = rows.length * REWARD_GBP;

  return (
    <section className="mx-4 mt-4 rounded-card border border-dead-fg/30 bg-dead-bg">
      <div className="px-3 pt-3">
        <p className="text-[15px] font-bold text-dead-fg">
          {gbp(total)} of yours is going to nobody
        </p>
        <p className="mt-1 text-[14px] text-dead-fg/90">
          {rows.length === 1 ? 'This household is' : `These ${rows.length} households are`} on
          Lumo and running, but nothing ties {rows.length === 1 ? 'them' : 'them'} to you. It
          will not fix itself.
        </p>
      </div>
      <ul className="mt-2">
        {rows.map((row) => (
          <li key={row.customer.id}>
            <button
              onClick={() => onOpen(row)}
              className="flex w-full items-center gap-3 border-t border-dead-fg/15 px-3 py-2.5 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-dead-fg">
                  {displayName(row.customer)}
                </span>
                <span className="block truncate text-[13px] text-dead-fg/80">
                  {row.resolved.state?.label}
                </span>
              </span>
              <span className="text-[13px] font-semibold text-dead-fg underline">Fix</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
