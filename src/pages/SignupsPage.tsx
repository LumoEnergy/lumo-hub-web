import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDemoStore } from '../store/DemoStore';
import { buildRows, sortRows } from '../selectors/customers';
import type { CustomerRow, SortDirection, SortKey } from '../selectors/customers';
import { DEFAULT_VIEW, VIEWS, isViewId, rowsForView, scheduledSendDates } from '../selectors/views';
import type { ViewId } from '../selectors/views';
import { displayName } from '../fixtures';
import { REWARD_GBP } from '../state';
import { CustomerCard, CustomerDetail } from '../components/CustomerRow';
import { CustomerTable } from '../components/CustomerTable';
import { Sheet } from '../components/Sheet';
import { HeldRowFixer, UnmatchedFixer } from '../components/Fixers';
import { Button, Card, EmptyState, ScreenTitle, SegmentedToggle } from '../components/ui';

/**
 * The campaign, household by household. Three ways of looking at one list.
 *
 * THIS SCREEN IS ONLY ABOUT THE CAMPAIGN. It used to be called Customers and carried a
 * fourth tab, Active, listing live households with their kit and control health. That
 * tab is now the Monitoring screen, and the split is the point: converting a back book
 * is a sales funnel read once a week off email events, and watching live batteries is
 * an operations job read whenever something looks wrong off telemetry. The households
 * overlap, the question does not, and one table trying to answer both gave every row
 * half a set of empty cells.
 *
 * THE THREE VIEWS ARE THREE QUESTIONS, not one list filtered three times. See
 * `selectors/views.ts` for what each one is for and why it gets its own columns.
 *
 * NO CALLOUTS. There was a pinned banner saying "£100 of yours is going to nobody",
 * which was true and was also the loudest thing on the screen on every single visit,
 * including the visits where you came to look at something else. Unmatched
 * households are now rows in Needs you with an instruction next to them, which is
 * where a job belongs, and the total is one line of the blurb in that view only.
 *
 * The total survives at all because this is the one place a multiplied figure is
 * honest: those households are live, the 30 days are served, and the money exists
 * and is going to nobody. Everywhere else a count times £50 prices the work at 100%
 * conversion, which is why it is on the forbidden list in the design spec.
 */

/**
 * How many rows to render before asking.
 *
 * An eight-hundred-row book is realistic and eight hundred table rows is not: it
 * makes the tab sluggish on the machine the demo gets shown on, for a list nobody
 * scrolls to the end of. The cap states itself rather than silently truncating.
 */
const PAGE = 150;

export function SignupsPage() {
  const { customers, asOf, company } = useDemoStore();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState<CustomerRow | null>(null);
  const [sort, setSort] = useState<SortKey>('priority');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [limit, setLimit] = useState(PAGE);

  // The view lives in the URL so the dashboard can link straight to it, and so a
  // filtered view is a thing you can send to a colleague.
  const raw = params.get('view');
  const view: ViewId = isViewId(raw) ? raw : DEFAULT_VIEW;

  const rows = useMemo(() => buildRows(customers, asOf), [customers, asOf]);
  const context = useMemo(() => ({ scheduled: scheduledSendDates(rows, company) }), [rows, company]);
  const selected = useMemo(() => rowsForView(rows, view), [rows, view]);
  const sorted = useMemo(() => sortRows(selected, sort, direction), [selected, sort, direction]);
  const visible = useMemo(() => sorted.slice(0, limit), [sorted, limit]);

  const setView = (next: ViewId) => {
    setLimit(PAGE);
    if (next === DEFAULT_VIEW) params.delete('view');
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

  // Money already earned that no firm is being paid for. Real, so it can be summed.
  const unmatchedGbp = useMemo(
    () => rows.filter((r) => r.resolved.track === 'match').length * REWARD_GBP,
    [rows],
  );

  return (
    <>
      <ScreenTitle count={rows.length} sub={`Everyone ${company.name} handed over.`}>
        Sign-ups
      </ScreenTitle>

      <div className="mt-4 px-4 lg:px-0">
        <SegmentedToggle<ViewId>
          label="Which customers"
          value={view}
          onChange={setView}
          options={VIEWS.map((v) => ({ value: v.id, label: v.label, count: counts[v.id] }))}
        />
        <p className="mt-2 text-[13px] text-ink-soft">
          {definition.blurb}
          {view === 'attention' && unmatchedGbp > 0 ? (
            <>
              {' '}
              <span className="font-semibold text-ink">
                £{unmatchedGbp} of it is already earned and going to nobody.
              </span>
            </>
          ) : null}
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-3">
          <EmptyForView view={view} onShowInvited={() => setView(DEFAULT_VIEW)} />
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

function EmptyForView({ view, onShowInvited }: { view: ViewId; onShowInvited: () => void }) {
  const copy: Record<ViewId, { title: string; body: string }> = {
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
  };

  return (
    <EmptyState
      title={copy[view].title}
      body={copy[view].body}
      action={
        // Invited is the default view, so offering a route to it from itself is a
        // button that appears to do nothing.
        view === 'invited' ? undefined : (
          <Button variant="secondary" onClick={onShowInvited}>
            See who we emailed
          </Button>
        )
      }
    />
  );
}
