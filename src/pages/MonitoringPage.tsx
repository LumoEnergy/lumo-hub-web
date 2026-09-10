import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemoStore } from '../store/DemoStore';
import { buildRows, sortRows } from '../selectors/customers';
import type { CustomerRow, SortDirection, SortKey } from '../selectors/customers';
import { liveRows } from '../selectors/views';
import { fleetHealth } from '../selectors/journey';
import { controlStatus } from '../selectors/status';
import { displayName } from '../fixtures';
import { DataTable, HOUSEHOLD, REWARD, StatusChip } from '../components/CustomerTable';
import type { Column } from '../components/CustomerTable';
import { FleetStrip } from '../components/Funnel';
import { Card, EmptyState, Missing, Panel, ScreenTitle } from '../components/ui';

/**
 * The live fleet.
 *
 * THIS USED TO BE A TAB ON THE CUSTOMERS SCREEN and it was in the wrong place. The
 * campaign and the fleet are different jobs: one is read weekly to see whether the back
 * book is converting, the other whenever a customer rings up to say something is wrong.
 * Sharing a screen meant sharing a column set, so campaign rows carried empty battery
 * cells and live rows carried a send date that stopped meaning anything the day they
 * signed up.
 *
 * THE BROKEN ONES ARE IN THE LIST, not filtered out and not pushed to the bottom. A
 * fleet view that leads with the healthy sites is a fleet view nobody opens twice. The
 * default sort is by control health, so a battery that has dropped off is the first
 * thing on the screen.
 *
 * NO AGGREGATE ENERGY FIGURE. The roll-up counts control states and reward clocks, both
 * of which are facts about the fleet. A fleet-wide kWh total would be a number nobody
 * makes a decision with, and summing generated fixture data would be the first genuinely
 * misleading figure in the build.
 */
export function MonitoringPage() {
  const { customers, asOf, company } = useDemoStore();
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortKey>('status');
  const [direction, setDirection] = useState<SortDirection>('asc');

  const rows = useMemo(() => buildRows(customers, asOf), [customers, asOf]);
  const live = useMemo(() => liveRows(rows), [rows]);
  const fleet = useMemo(() => fleetHealth(rows), [rows]);
  const sorted = useMemo(() => sortRows(live, sort, direction), [live, sort, direction]);

  const onSort = (key: SortKey) => {
    if (key === sort) setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setDirection(key === 'household' || key === 'status' ? 'asc' : 'desc');
    }
  };

  const open = (row: CustomerRow) => navigate(`/monitoring/${row.customer.id}`);

  if (live.length === 0) {
    return (
      <>
        <ScreenTitle sub={`Live systems ${company.name} is credited with.`}>
          Monitoring
        </ScreenTitle>
        <div className="mt-3">
          <EmptyState
            title="Nobody is live yet"
            body="Sites appear here once a household has signed up and connected their battery. Then you can see what it is doing."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenTitle count={live.length} sub={`Live systems ${company.name} is credited with.`}>
        Monitoring
      </ScreenTitle>

      <div className="mt-4 space-y-4 px-4 lg:px-0">
        <Panel title="Your fleet" meta={`${fleet.signedUp} on Lumo`}>
          <FleetStrip fleet={fleet} />
        </Panel>

        {/* Desktop: the table. Same shell as the campaign list, different columns. */}
        <div className="hidden lg:block">
          <DataTable
            rows={sorted}
            columns={SITE_COLUMNS}
            context={{ scheduled: new Map() }}
            sort={sort}
            direction={direction}
            onSort={onSort}
            onOpen={open}
            caption="Live sites, with their kit, whether Lumo is controlling them, and the reward."
          />
        </div>

        {/* Mobile: cards. Six columns at 390px is not a table. */}
        <div className="lg:hidden">
          <Card className="overflow-hidden">
            <ul>
              {sorted.map((row) => (
                <li key={row.customer.id}>
                  <Link
                    to={`/monitoring/${row.customer.id}`}
                    className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-ink">
                        {displayName(row.customer)}
                      </span>
                      <span className="mt-1 block">
                        <StatusChip status={controlStatus(row)} />
                      </span>
                    </span>
                    <span className="shrink-0 text-ink-mute" aria-hidden="true">
                      &rsaquo;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

/**
 * Ops-console density, because this is the screen where the kit matters.
 *
 * Control comes second, straight after the name. It is the only column that ever needs
 * acting on, and putting the battery size ahead of it made the reader scan past two
 * columns of trivia to find the one fact that decides whether they pick up the phone.
 */
const SITE_COLUMNS: readonly Column[] = [
  /**
   * The name is a real link, not just a clickable row.
   *
   * The campaign table's rows open a side sheet, so a click handler is the whole story
   * there. These rows go to a URL, and a row that navigates without an `<a>` cannot be
   * tabbed to, copied, opened in a new tab or read as a link by a screen reader. The row
   * handler stays for the rest of the row, and this stops propagation so a click on the
   * name does not also fire it and push the same path onto history twice.
   */
  {
    ...HOUSEHOLD,
    cell: (row, context) => (
      <Link
        to={`/monitoring/${row.customer.id}`}
        onClick={(event) => event.stopPropagation()}
        className="hover:underline"
      >
        {HOUSEHOLD.cell(row, context)}
      </Link>
    ),
  },
  {
    id: 'control',
    label: 'Control',
    sort: 'status',
    width: 'min-w-[12rem]',
    cell: (row) => <StatusChip status={controlStatus(row)} />,
  },
  {
    id: 'battery',
    label: 'Battery',
    width: 'min-w-[6rem]',
    cell: (row) =>
      row.customer.batterySizeKwh === null ? (
        <Missing />
      ) : (
        <span className="tnum text-ink-soft">{row.customer.batterySizeKwh} kWh</span>
      ),
  },
  {
    id: 'inverter',
    label: 'Inverter',
    width: 'min-w-[7rem]',
    cell: (row) =>
      row.customer.inverterMake ? (
        <span className="text-ink-soft">{row.customer.inverterMake}</span>
      ) : (
        <Missing />
      ),
  },
  {
    id: 'live',
    label: 'Live for',
    sort: 'age',
    width: 'min-w-[7rem]',
    cell: (row) => <span className="tnum text-ink-soft">{row.resolved.ageDays}d</span>,
  },
  REWARD,
];
