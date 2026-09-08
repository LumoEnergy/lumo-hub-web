import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OWNER_GROUP_HEADINGS, REWARD_GBP } from '../state';
import { displayName } from '../fixtures';
import { useDemoStore } from '../store/DemoStore';
import {
  actionQueue,
  buildRows,
  dataQualityGroups,
  earningCount,
  earningsSummary,
  gbp,
  needsAttentionCount,
  silentCohort,
  sortRows,
  unmatchedRows,
} from '../selectors/customers';
import type { CustomerRow, SortDirection, SortKey } from '../selectors/customers';
import { CustomerDetail, CustomerCard } from '../components/CustomerRow';
import { CustomerTable } from '../components/CustomerTable';
import { Sheet } from '../components/Sheet';
import { HeldRowFixer, UnmatchedFixer } from '../components/Fixers';
import {
  Button,
  Callout,
  Card,
  EmptyState,
  ScreenTitle,
  SectionHeading,
  SegmentedToggle,
  SummaryStrip,
} from '../components/ui';

type View = 'queue' | 'all';

export function CustomersPage() {
  const { customers, asOf, company } = useDemoStore();
  const [view, setView] = useState<View>('queue');
  const [open, setOpen] = useState<CustomerRow | null>(null);
  const [sort, setSort] = useState<SortKey>('priority');
  const [direction, setDirection] = useState<SortDirection>('desc');

  const rows = useMemo(() => buildRows(customers, asOf), [customers, asOf]);
  const groups = useMemo(() => actionQueue(rows), [rows]);
  const unmatched = useMemo(() => unmatchedRows(rows), [rows]);
  const quality = useMemo(() => dataQualityGroups(rows), [rows]);
  const silent = useMemo(() => silentCohort(rows), [rows]);
  const summary = useMemo(() => earningsSummary(rows), [rows]);
  const attention = needsAttentionCount(rows);

  const queueRows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const tableRows = useMemo(
    () => sortRows(view === 'queue' ? queueRows : rows, sort, direction),
    [view, queueRows, rows, sort, direction],
  );

  const onSort = (key: SortKey) => {
    if (key === sort) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key);
      setDirection(key === 'household' || key === 'status' ? 'asc' : 'desc');
    }
  };

  if (customers.length === 0) {
    return (
      <>
        <ScreenTitle>Your customers</ScreenTitle>
        <EmptyState
          title="Nothing here yet"
          body="Send us your list of past battery customers and we will load it, clean it and show you exactly what happened to every one of them."
          action={
            <Link to="list">
              <Button>Get your customers on</Button>
            </Link>
          }
        />
        <p className="px-4 text-center text-[13px] text-ink-mute lg:px-0">
          Nothing here is a forecast. You will only ever see households on a list you have
          given us.
        </p>
      </>
    );
  }

  const nothingSent = !company.campaignEmail.approved;

  return (
    <>
      <ScreenTitle count={rows.length}>Your customers</ScreenTitle>

      {nothingSent ? (
        <div className="px-4 lg:px-0">
          <Callout
            title="Nothing has been sent yet"
            body={`Your list is loaded and cleaned. We are waiting on you to approve the email we send on your behalf — it is the only sign-off we will ask you for, and it covers all ${rows.length} households.`}
            action={
              <Link to="list">
                <Button>Read it and approve</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <SummaryStrip
          items={[
            { label: 'Need you', value: String(attention), tone: attention > 0 ? 'warn' : 'default' },
            { label: 'Earning', value: String(earningCount(rows)), tone: 'accent' },
            { label: 'Yours so far', value: gbp(summary.earnedGbp), tone: 'accent' },
          ]}
        />
      )}

      <div className="mt-4 space-y-3 px-4 lg:px-0">
        {unmatched.length > 0 ? (
          <Callout
            tone="alarm"
            title={`${gbp(unmatched.length * REWARD_GBP)} of yours is going to nobody`}
            money={undefined}
            body={`${
              unmatched.length === 1
                ? 'One household is'
                : `${unmatched.length} households are`
            } on Lumo and running, but came in on their own rather than through your campaign, so nothing ties them to you. It will not fix itself.`}
            action={
              <Button variant="secondary" onClick={() => setOpen(unmatched[0])}>
                {unmatched.length === 1 ? 'Claim it' : `Claim ${unmatched.length}`}
              </Button>
            }
          />
        ) : null}

        {/* No money figure on these, unlike the unmatched callout above. See the note
            in `dataQualityGroups`: multiplying the count by £50 would price a fix at
            a conversion rate nobody is going to hit. The rate is in the body copy,
            per household, where it is true. */}
        {quality.map((group) => (
          <Callout
            key={group.contact}
            title={`${group.rows.length} ${group.label.toLowerCase()}`}
            body={group.argument}
            action={
              <Button variant="secondary" onClick={() => setOpen(group.rows[0])}>
                Start on these
              </Button>
            }
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-4 lg:px-0">
        <SegmentedToggle<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'queue', label: 'Needs you', count: queueRows.length },
            { value: 'all', label: 'All', count: rows.length },
          ]}
        />
        {silent && view === 'all' ? (
          <p className="max-w-[52ch] text-[13px] text-ink-mute">
            <span className="tnum font-semibold text-ink-soft">{silent.count}</span> were
            delivered and never opened. We will not email those again — that is how a sending
            domain dies, and it would slow the rest of your list down.
          </p>
        ) : null}
      </div>

      {/* Desktop: one sortable table. */}
      <div className="mt-3 hidden lg:block">
        {tableRows.length === 0 ? (
          <NothingToDo total={rows.length} onShowAll={() => setView('all')} />
        ) : (
          <CustomerTable
            rows={tableRows}
            sort={sort}
            direction={direction}
            onSort={onSort}
            onOpen={setOpen}
          />
        )}
      </div>

      {/* Mobile: owner-grouped cards. No table, because a table at 390px is unreadable. */}
      <div className="lg:hidden">
        {view === 'queue' ? (
          groups.length === 0 ? (
            <NothingToDo total={rows.length} onShowAll={() => setView('all')} />
          ) : (
            groups.map((group) => (
              <section key={group.owner}>
                <SectionHeading count={group.rows.length}>
                  {OWNER_GROUP_HEADINGS[group.owner]}
                </SectionHeading>
                <Card className="mx-4 overflow-hidden">
                  <ul>
                    {group.rows.map((row) => (
                      <CustomerCard key={row.customer.id} row={row} onOpen={setOpen} />
                    ))}
                  </ul>
                </Card>
              </section>
            ))
          )
        ) : (
          <section>
            <SectionHeading count={rows.length}>Everyone on your list</SectionHeading>
            <Card className="mx-4 overflow-hidden">
              <ul>
                {sortRows(rows, 'priority', 'desc').map((row) => (
                  <CustomerCard key={row.customer.id} row={row} onOpen={setOpen} />
                ))}
              </ul>
            </Card>
          </section>
        )}
      </div>

      <Sheet
        open={open !== null}
        title={open ? displayName(open.customer) : ''}
        onClose={() => setOpen(null)}
      >
        {open ? (
          <>
            <Fixer row={open} onDone={() => setOpen(null)} />
            <CustomerDetail row={open} />
          </>
        ) : null}
      </Sheet>
    </>
  );
}

/**
 * The one place a row becomes editable, and only for the three things Lumo genuinely
 * cannot resolve without the firm. Everything else in this product is read-only,
 * which is the point.
 */
function Fixer({ row, onDone }: { row: CustomerRow; onDone: () => void }) {
  if (row.resolved.track === 'match' && row.customer.match === 'unmatched_different_email') {
    return <UnmatchedFixer row={row} onDone={onDone} />;
  }
  if (row.customer.contact === 'held_no_email' || row.customer.contact === 'held_unconfirmed') {
    return <HeldRowFixer row={row} onDone={onDone} />;
  }
  return null;
}

function NothingToDo({ total, onShowAll }: { total: number; onShowAll: () => void }) {
  return (
    <EmptyState
      title="Nothing needs you"
      body="Every household is either earning, waiting on something that resolves itself, or one we have stopped chasing. This is the good outcome."
      action={
        <Button variant="secondary" onClick={onShowAll}>
          See all {total.toLocaleString('en-GB')}
        </Button>
      }
    />
  );
}
