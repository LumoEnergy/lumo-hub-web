import type { ReactNode } from 'react';
import type { CustomerRow, SortDirection, SortKey } from '../selectors/customers';
import { moneyPosition } from '../selectors/customers';
import { actionFor, controlStatus, statusClass, statusFor } from '../selectors/status';
import type { ViewId } from '../selectors/views';
import { displayName } from '../fixtures';
import { REWARD_GBP } from '../state';
import { AgeChip, Missing } from './ui';

/**
 * The customer list, as one table with five column sets.
 *
 * This is the reason the product is desktop-first. A firm with several hundred
 * households wants to sort by what is oldest, find the ones that are earning, and
 * read the shape of the campaign in one screen. None of that is possible in a card
 * list, and a card list is all a phone can honestly show.
 *
 * COLUMNS FOLLOW THE VIEW, they are not a fixed set that gets filtered. Each tab
 * asks a different question, so each gets the columns that answer it: a scheduled
 * send date only means something on Not yet contacted, and battery kit only means
 * something on Active. One shared column set covering all five left most rows with
 * half their cells empty.
 *
 * NOTHING IS EVER HIDDEN AT NARROW WIDTHS. The first version dropped the age column
 * below 1280px, which took the heading with it and made the table look broken rather
 * than responsive. Now the table keeps its natural width and the container scrolls,
 * with the household column pinned so you never lose track of whose row you are on.
 *
 * THERE IS NO OWNER COLUMN, and removing it was the single biggest clarity win here.
 * It read "Whose" and showed "You", "The household" or "Lumo", which is a concept
 * from the state model rather than a fact about the customer. Ownership still decides
 * what lands in Needs you; it just is not a thing to read in a row.
 *
 * Sorting is a real `<table>` with `<th aria-sort>` rather than a grid of divs,
 * because a screen reader announcing "column 3 of 5, sorted ascending" is free here
 * and impossible to retrofit.
 */

export interface TableContext {
  /** Customer id to ISO send date, for the Not yet contacted view. */
  readonly scheduled: ReadonlyMap<string, string>;
}

interface Column {
  readonly id: string;
  readonly label: string;
  /** Omitted for columns with no meaningful order, e.g. free-text advice. */
  readonly sort?: SortKey;
  readonly align?: 'right';
  readonly width: string;
  readonly cell: (row: CustomerRow, context: TableContext) => ReactNode;
}

const HOUSEHOLD: Column = {
  id: 'household',
  label: 'Household',
  sort: 'household',
  width: 'min-w-[14rem]',
  // The postcode rides along with the name rather than taking a column of its own.
  // Two households called Marion Dunlop is normal in a back book, not an edge case,
  // and without it they are two identical rows.
  cell: (row) => (
    <>
      <span className="font-semibold text-ink">{displayName(row.customer)}</span>
      {row.customer.postcode ? (
        <span className="tnum ml-2 text-[12px] text-ink-mute">{row.customer.postcode}</span>
      ) : null}
    </>
  ),
};

const STATUS: Column = {
  id: 'status',
  label: 'Status',
  sort: 'status',
  width: 'min-w-[11rem]',
  cell: (row) => <StatusChip status={statusFor(row)} />,
};

const WAITING: Column = {
  id: 'age',
  label: 'Waiting',
  sort: 'age',
  width: 'min-w-[7rem]',
  cell: (row) => (
    <AgeChip band={row.resolved.ageBand} days={row.resolved.ageDays} muted={ageIsMoot(row)} />
  ),
};

const REWARD: Column = {
  id: 'money',
  label: 'Reward',
  sort: 'money',
  align: 'right',
  width: 'min-w-[8rem]',
  cell: (row) => <RewardCell row={row} />,
};

const COLUMNS: Record<ViewId, readonly Column[]> = {
  all: [HOUSEHOLD, STATUS, WAITING, REWARD],

  invited: [
    HOUSEHOLD,
    STATUS,
    {
      id: 'emailed',
      label: 'Emailed',
      sort: 'age',
      width: 'min-w-[8rem]',
      cell: (row) => <span className="text-ink-soft">{whenSent(row)}</span>,
    },
    REWARD,
  ],

  waiting: [
    HOUSEHOLD,
    STATUS,
    {
      id: 'scheduled',
      label: 'Scheduled send',
      width: 'min-w-[10rem]',
      cell: (row, { scheduled }) => {
        const date = scheduled.get(row.customer.id);
        if (date) {
          return <span className="font-medium text-sent-fg">{shortDate(date)}</span>;
        }
        // Held rows have no address, so there is no send to schedule. Putting a date
        // here would be a promise the product cannot keep.
        return <span className="text-ink-mute">Waiting on you</span>;
      },
    },
  ],

  attention: [
    HOUSEHOLD,
    STATUS,
    WAITING,
    {
      id: 'action',
      label: 'What to do',
      width: 'min-w-[16rem]',
      cell: (row) => <span className="text-ink">{actionFor(row)}</span>,
    },
  ],

  // Ops-console density, because this is the only view where the kit matters. An
  // installer looking at a live household is asking an engineering question.
  active: [
    HOUSEHOLD,
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
      id: 'control',
      label: 'Control',
      width: 'min-w-[12rem]',
      cell: (row) => <StatusChip status={controlStatus(row)} />,
    },
    {
      id: 'live',
      label: 'Live for',
      sort: 'age',
      width: 'min-w-[7rem]',
      cell: (row) => <span className="tnum text-ink-soft">{row.resolved.ageDays}d</span>,
    },
    REWARD,
  ],
};

function StatusChip({
  status,
}: {
  status: { label: string; tone: Parameters<typeof statusClass>[0] };
}) {
  return (
    <span
      className={[
        'inline-block rounded-chip px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap',
        statusClass(status.tone),
      ].join(' ')}
    >
      {status.label}
    </span>
  );
}

function SortMark({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <span aria-hidden="true" className="text-ink-mute/50">↕</span>;
  return <span aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>;
}

export function CustomerTable({
  rows,
  view,
  context,
  sort,
  direction,
  onSort,
  onOpen,
}: {
  rows: readonly CustomerRow[];
  view: ViewId;
  context: TableContext;
  sort: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  onOpen: (row: CustomerRow) => void;
}) {
  const columns = COLUMNS[view];

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          {view === 'attention'
            ? 'Households needing something only your firm can supply, and what to do about each.'
            : 'Your customers, in campaign order, with where each one has got to.'}
        </caption>
        <thead>
          <tr className="border-b border-line-strong bg-sunk">
            {columns.map((column, i) => {
              const active = column.sort !== undefined && sort === column.sort;
              const shared = [
                'px-3 py-2 text-[12px] font-semibold whitespace-nowrap text-ink-soft',
                column.align === 'right' ? 'text-right' : '',
                column.width,
                // The pinned column needs its own background, otherwise rows slide
                // underneath it and the name becomes unreadable mid-scroll.
                i === 0 ? 'sticky left-0 z-10 bg-sunk' : '',
              ].join(' ');

              if (column.sort === undefined) {
                return (
                  <th key={column.id} scope="col" className={shared}>
                    {column.label}
                  </th>
                );
              }

              return (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={shared}
                >
                  <button
                    type="button"
                    onClick={() => onSort(column.sort!)}
                    className={[
                      'inline-flex items-center gap-1 transition-colors duration-150 hover:text-ink',
                      active ? 'text-ink' : '',
                    ].join(' ')}
                  >
                    {column.label}
                    <SortMark active={active} direction={direction} />
                  </button>
                </th>
              );
            })}
            <th scope="col" className="w-8 px-3 py-2">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.customer.id}
              onClick={() => onOpen(row)}
              className="group cursor-pointer border-b border-line last:border-0 hover:bg-accent-soft/40"
            >
              {columns.map((column, i) => (
                <td
                  key={column.id}
                  className={[
                    'px-3 py-2.5 text-[13px] whitespace-nowrap',
                    column.align === 'right' ? 'text-right' : '',
                    i === 0
                      ? 'sticky left-0 z-10 bg-surface text-[15px] group-hover:bg-[#f0f8f1]'
                      : '',
                  ].join(' ')}
                >
                  {column.cell(row, context)}
                </td>
              ))}
              <td className="px-3 text-right text-ink-mute">
                <span aria-hidden="true">›</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Age is meaningless where nobody is waiting for anything.
 *
 * A household that is earning, or one we have stopped chasing, has an age, but
 * presenting it in the same amber as a three-week-old blocker would say "this is
 * going stale" about something that is either finished or fine.
 */
const ageIsMoot = (row: CustomerRow): boolean =>
  row.resolved.owner === 'nobody' || row.resolved.earnings === 'paid';

const shortDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/** How long ago the email went, in the words a person would use. */
function whenSent(row: CustomerRow): string {
  const days = row.resolved.ageDays;
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

/**
 * The money for one household, in the fewest words that are still true.
 *
 * `blocked_by_match` is the only one that gets a colour warning: the reward is real,
 * the clock has run, and it is going to nobody. Everything else is either settled,
 * in progress, or simply has not started, none of which is an alarm.
 */
function RewardCell({ row }: { row: CustomerRow }) {
  switch (moneyPosition(row)) {
    case 'paid':
      return <span className="tnum font-semibold text-accent">£{REWARD_GBP} paid</span>;
    case 'confirmed':
      return <span className="tnum font-semibold text-accent">£{REWARD_GBP} due</span>;
    case 'pending':
      return <span className="tnum text-ink-soft">{row.resolved.daysRemaining}d to go</span>;
    case 'blocked_by_match':
      return <span className="font-semibold text-dead-fg">Not credited</span>;
    case 'lapsed':
      return <span className="text-ink-mute">Clock reset</span>;
    default:
      return <Missing />;
  }
}
