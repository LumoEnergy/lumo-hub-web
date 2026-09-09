import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDemoStore } from '../store/DemoStore';
import { buildRows, sortRows } from '../selectors/customers';
import type { CustomerRow, SortDirection, SortKey } from '../selectors/customers';
import { VIEWS, isViewId, rowsForView, scheduledSendDates } from '../selectors/views';
import type { ViewId } from '../selectors/views';
import { displayName } from '../fixtures';
import { CustomerCard, CustomerDetail } from '../components/CustomerRow';
import { CustomerTable } from '../components/CustomerTable';
import { Sheet } from '../components/Sheet';
import { HeldRowFixer, UnmatchedFixer } from '../components/Fixers';
import { Button, Card, EmptyState, ScreenTitle, SegmentedToggle } from '../components/ui';

/**
 * One list of customers, five ways of looking at it.
 *
 * There used to be two screens that both listed households, this one for progress
 * and an earnings screen for money, and the reader had to hold both in their head
 * and reconcile them. Money is now a column here and the earnings screen is gone.
 *
 * THE FIVE VIEWS ARE FIVE QUESTIONS, not one list filtered four times. See
 * `selectors/views.ts` for what each one is for and why it gets its own columns.
 *
 * NO CALLOUTS. There was a pinned banner saying "£100 of yours is going to nobody",
 * which was true and was also the loudest thing on the screen on every single visit,
 * including the visits where you came to look at something else. Unmatched
 * households are now four rows in Needs you with an instruction next to them, which
 * is where a job belongs.
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

  // The view lives in the URL so the dashboard can link straight to it, and so a
  // filtered view is a thing you can send to a colleague.
  const raw = params.get('view');
  const view: ViewId = isViewId(raw) ? raw : 'all';

  const rows = useMemo(() => buildRows(customers, asOf), [customers, asOf]);
  const context = useMemo(() => ({ scheduled: scheduledSendDates(rows, company) }), [rows, company]);
  const selected = useMemo(() => rowsForView(rows, view), [rows, view]);
  const sorted = useMemo(() => sortRows(selected, sort, direction), [selected, sort, direction]);
  const visible = useMemo(() => sorted.slice(0, limit), [sorted, limit]);

  const setView = (next: ViewId) => {
    setLimit(PAGE);
    if (next === 'all') params.delete('view');
    else params.set('view', next);
    setParams(params, { replace: true });
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
      Object.fromEntries(VIEWS.map((v) => [v.id, rowsForView(rows, v.id).length])) as Record<
        ViewId,
        number
      >,
    [rows],
  );

  const definition = VIEWS.find((v) => v.id === view)!;

  return (
    <>
      <ScreenTitle count={rows.length} sub={`Everyone ${company.name} handed over.`}>
        Customers
      </ScreenTitle>

      <div className="mt-4 px-4 lg:px-0">
        <SegmentedToggle<ViewId>
          label="Which customers"
          value={view}
          onChange={setView}
          options={VIEWS.map((v) => ({ value: v.id, label: v.label, count: counts[v.id] }))}
        />
        <p className="mt-2 text-[13px] text-ink-soft">{definition.blurb}</p>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-3">
          <EmptyForView view={view} onShowAll={() => setView('all')} />
        </div>
      ) : (
        <>
          {/* Desktop: one sortable table. */}
          <div className="mt-3 hidden lg:block">
            <CustomerTable
              rows={visible}
              view={view}
              context={context}
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
                  <CustomerCard key={row.customer.id} row={row} onOpen={setOpen} view={view} />
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
 * Which fixer appears is decided by ownership, the concept the dropped `Whose`
 * column was trying and failing to communicate. It works here because it arrives as
 * a specific question about one household rather than as a label to interpret.
 */
function Detail({ row, onDone }: { row: CustomerRow; onDone: () => void }) {
  const held =
    row.customer.contact === 'held_no_email' || row.customer.contact === 'held_unconfirmed';

  return (
    <>
      <CustomerDetail row={row} />
      {row.resolved.track === 'match' ? <UnmatchedFixer row={row} onDone={onDone} /> : null}
      {held ? <HeldRowFixer row={row} onDone={onDone} /> : null}
    </>
  );
}

function EmptyForView({ view, onShowAll }: { view: ViewId; onShowAll: () => void }) {
  const copy: Record<ViewId, { title: string; body: string }> = {
    all: {
      title: 'No customers yet',
      body: 'Hand over a list and every household lands here.',
    },
    invited: {
      title: 'Nothing sent yet',
      body: 'Approve the email on the Campaign tab and the first batch goes out.',
    },
    waiting: {
      title: 'Everyone has been emailed',
      body: 'Your whole list has had the campaign email. Nothing is queued.',
    },
    attention: {
      title: 'Nothing needs you',
      body: 'No bounces, no missing addresses, nobody stalled. This is the good outcome.',
    },
    active: {
      title: 'Nobody is live yet',
      body: 'Households appear here once they have signed up and connected a battery.',
    },
  };

  return (
    <EmptyState
      title={copy[view].title}
      body={copy[view].body}
      action={
        view === 'all' ? undefined : (
          <Button variant="secondary" onClick={onShowAll}>
            See all customers
          </Button>
        )
      }
    />
  );
}
