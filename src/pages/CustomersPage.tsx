import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDemoStore } from '../store/DemoStore';
import {
  CUSTOMER_FILTERS,
  buildRows,
  dataQualityGroups,
  filterRows,
  isCustomerFilter,
  sortRows,
  unmatchedRows,
} from '../selectors/customers';
import type {
  CustomerFilter,
  CustomerRow,
  SortDirection,
  SortKey,
} from '../selectors/customers';
import { gbp } from '../selectors/customers';
import { displayName } from '../fixtures';
import { REWARD_GBP } from '../state';
import { CustomerCard, CustomerDetail } from '../components/CustomerRow';
import { CustomerTable } from '../components/CustomerTable';
import { Sheet } from '../components/Sheet';
import { HeldRowFixer, UnmatchedFixer } from '../components/Fixers';
import { Button, Callout, Card, EmptyState, ScreenTitle, SegmentedToggle } from '../components/ui';

/**
 * One list of customers, and only one.
 *
 * There used to be two screens that both listed households — this one for progress
 * and an earnings screen for money — and the reader had to hold both in their head
 * and reconcile them. Money is now a column here, and the earnings screen is gone.
 *
 * The attention queue that used to open the app is now the `Needs you` filter. Same
 * rows, same fixers, reachable in one click from the dashboard; it just no longer
 * greets a first-time visitor with a list of chores instead of their campaign.
 *
 * The unmatched callout survives, and it is the only one left. A household earning
 * with nothing tying it to the firm is money on the table that no amount of sorting
 * will surface, because the row looks like an ordinary lead that never converted.
 */

/**
 * How many rows to render before asking.
 *
 * An eight-hundred-row book is realistic and eight hundred table rows is not: it
 * makes the tab sluggish on the machine the demo gets shown on, for a list nobody
 * scrolls to the end of. The cap states itself rather than silently truncating.
 */
const PAGE = 150;

export function CustomersPage() {
  const { customers, asOf, company } = useDemoStore();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState<CustomerRow | null>(null);
  const [sort, setSort] = useState<SortKey>('priority');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [limit, setLimit] = useState(PAGE);

  // The filter lives in the URL so the dashboard can link straight to it, and so a
  // filtered view is a thing you can send to a colleague.
  const raw = params.get('filter');
  const filter: CustomerFilter = isCustomerFilter(raw) ? raw : 'all';

  const rows = useMemo(() => buildRows(customers, asOf), [customers, asOf]);
  const unmatched = useMemo(() => unmatchedRows(rows), [rows]);
  const quality = useMemo(() => dataQualityGroups(rows), [rows]);
  const filtered = useMemo(() => filterRows(rows, filter), [rows, filter]);
  const sorted = useMemo(() => sortRows(filtered, sort, direction), [filtered, sort, direction]);
  const visible = useMemo(() => sorted.slice(0, limit), [sorted, limit]);

  const setFilter = (next: CustomerFilter) => {
    setLimit(PAGE);
    if (next === 'all') {
      params.delete('filter');
      setParams(params, { replace: true });
    } else {
      params.set('filter', next);
      setParams(params, { replace: true });
    }
  };

  const onSort = (key: SortKey) => {
    if (key === sort) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key);
      setDirection(key === 'household' || key === 'status' ? 'asc' : 'desc');
    }
  };

  const counts = useMemo(
    () =>
      Object.fromEntries(
        CUSTOMER_FILTERS.map((f) => [f.id, filterRows(rows, f.id).length]),
      ) as Record<CustomerFilter, number>,
    [rows],
  );

  return (
    <>
      <ScreenTitle
        count={rows.length}
        sub={`Everyone ${company.name} handed over, where they have got to, and what they are worth.`}
      >
        Customers
      </ScreenTitle>

      {unmatched.length > 0 ? (
        <div className="px-4 lg:px-0">
          <Callout
            tone="alarm"
            title={`${gbp(unmatched.length * REWARD_GBP)} of yours is going to nobody`}
            body={`${
              unmatched.length === 1 ? 'One household is' : `${unmatched.length} households are`
            } on Lumo and running, but came in on their own rather than through your campaign, so nothing ties them to you. It will not fix itself.`}
            action={
              <Button variant="secondary" onClick={() => setOpen(unmatched[0])}>
                {unmatched.length === 1 ? 'Claim it' : `Claim ${unmatched.length}`}
              </Button>
            }
          />
        </div>
      ) : null}

      <div className="mt-4 px-4 lg:px-0">
        <SegmentedToggle<CustomerFilter>
          label="Filter customers"
          value={filter}
          onChange={setFilter}
          options={CUSTOMER_FILTERS.map((f) => ({
            value: f.id,
            label: f.label,
            count: counts[f.id],
          }))}
        />
      </div>

      {/* The argument for doing the work, on the filter that shows the work. Each of
          these rows genuinely needs its own address, so they stay as rows; what would
          be daft is repeating the reasoning on all thirty-four of them. */}
      {filter === 'attention' && quality.length > 0 ? (
        <div className="mt-3 px-4 lg:px-0">
          <Card className="p-4">
            <ul className="space-y-2.5">
              {quality.map((group) => (
                <li key={group.contact}>
                  <p className="text-[14px] font-semibold text-ink">
                    {group.rows.length} {group.label.toLowerCase()}
                  </p>
                  <p className="text-[13px] leading-snug text-ink-soft">{group.argument}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <div className="mt-3">
          <EmptyForFilter filter={filter} onShowAll={() => setFilter('all')} />
        </div>
      ) : (
        <>
          {/* Desktop: one sortable table. */}
          <div className="mt-3 hidden lg:block">
            <CustomerTable
              rows={visible}
              sort={sort}
              direction={direction}
              onSort={onSort}
              onOpen={setOpen}
            />
          </div>

          {/* Mobile: cards. A table at 390px is unreadable. */}
          <div className="mt-3 lg:hidden">
            <Card className="mx-4 overflow-hidden">
              <ul>
                {visible.map((row) => (
                  <CustomerCard key={row.customer.id} row={row} onOpen={setOpen} />
                ))}
              </ul>
            </Card>
          </div>

          {sorted.length > visible.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 px-4 lg:px-0">
              <Button variant="secondary" onClick={() => setLimit((n) => n + PAGE)}>
                Show {Math.min(PAGE, sorted.length - visible.length)} more
              </Button>
              <p className="text-[13px] text-ink-mute">
                Showing {visible.length.toLocaleString('en-GB')} of{' '}
                {sorted.length.toLocaleString('en-GB')}.
              </p>
            </div>
          ) : null}
        </>
      )}

      <Sheet
        open={open !== null}
        title={open ? displayName(open.customer) : 'Household'}
        onClose={() => setOpen(null)}
      >
        {open ? <Detail row={open} onDone={() => setOpen(null)} /> : null}
      </Sheet>
    </>
  );
}

/**
 * The detail panel, and the only place the product asks for anything.
 *
 * Which fixer appears is decided by ownership — the concept the dropped `Whose`
 * column was trying and failing to communicate. It works here because it arrives as
 * a specific question about one household rather than as a label to interpret.
 */
function Detail({ row, onDone }: { row: CustomerRow; onDone: () => void }) {
  const held = row.customer.contact === 'held_no_email' || row.customer.contact === 'held_unconfirmed';

  return (
    <>
      <CustomerDetail row={row} />
      {row.resolved.track === 'match' ? <UnmatchedFixer row={row} onDone={onDone} /> : null}
      {held ? <HeldRowFixer row={row} onDone={onDone} /> : null}
    </>
  );
}

function EmptyForFilter({
  filter,
  onShowAll,
}: {
  filter: CustomerFilter;
  onShowAll: () => void;
}) {
  const copy: Record<CustomerFilter, { title: string; body: string }> = {
    all: {
      title: 'No customers yet',
      body: 'Once you have handed over a list, every household lands here.',
    },
    attention: {
      title: 'Nothing needs you',
      body: 'Every household is either earning, waiting on something that resolves itself, or one we have stopped chasing. This is the good outcome.',
    },
    earning: {
      title: 'Nobody is earning yet',
      body: 'A household earns once it has signed up, connected its battery and run smart control for 30 consecutive days.',
    },
    not_emailed: {
      title: 'Everyone has been emailed',
      body: 'Your whole list has had the campaign email. Nothing is queued.',
    },
  };

  return (
    <EmptyState
      title={copy[filter].title}
      body={copy[filter].body}
      action={
        filter === 'all' ? undefined : (
          <Button variant="secondary" onClick={onShowAll}>
            See all customers
          </Button>
        )
      }
    />
  );
}
