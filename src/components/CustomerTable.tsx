import type { CustomerRow, SortDirection, SortKey } from '../selectors/customers';
import { moneyPosition } from '../selectors/customers';
import { displayName } from '../fixtures';
import { REWARD_GBP } from '../state';
import { AgeChip, Missing } from './ui';

/**
 * The customer list, as one table.
 *
 * This is the reason the product is desktop-first. A firm with several hundred
 * households wants to sort by what is oldest, find the ones that are earning, and
 * read the shape of the campaign in one screen. None of that is possible in a card
 * list, and a card list is all a phone can honestly show.
 *
 * THERE IS NO OWNER COLUMN, and removing it was the single biggest clarity win here.
 * It read "Whose" and showed "You", "The household" or "Lumo", which is a concept
 * from the state model rather than a fact about the customer — the first person to
 * look at it asked what it meant, which is the only review a column like that needs.
 * Ownership still decides what lands in the attention filter and what the detail
 * panel asks for; it just is not a thing to read in a row.
 *
 * REWARD AND STATUS SIT IN THE SAME TABLE for the same reason: two screens both
 * listing the same households, one for progress and one for money, made the reader
 * hold two lists in their head and reconcile them. Money is a column.
 *
 * Sorting is a real `<table>` with `<th aria-sort>` rather than a grid of divs,
 * because a screen reader announcing "column 3 of 5, sorted ascending" is free here
 * and impossible to retrofit.
 */

interface Column {
  readonly key: SortKey;
  readonly label: string;
  /** Hidden below xl, where 1200px starts to crowd. */
  readonly wide?: boolean;
  readonly align?: 'right';
}

const COLUMNS: readonly Column[] = [
  { key: 'household', label: 'Household' },
  { key: 'status', label: 'Status' },
  { key: 'age', label: 'Waiting', wide: true },
  { key: 'money', label: 'Reward', align: 'right' },
];

function SortMark({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <span aria-hidden="true" className="text-ink-mute/50">↕</span>;
  return <span aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>;
}

export function CustomerTable({
  rows,
  sort,
  direction,
  onSort,
  onOpen,
}: {
  rows: readonly CustomerRow[];
  sort: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  onOpen: (row: CustomerRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <table className="w-full border-collapse text-left">
        {/* The default order is not any single column, so no header can carry
            `aria-sort` for it. Saying so out loud is the difference between a
            considered order and an arbitrary one. */}
        <caption
          className={
            sort === 'priority'
              ? 'border-b border-line px-3 py-2 text-left text-[12px] text-ink-mute'
              : 'sr-only'
          }
        >
          {sort === 'priority'
            ? 'Sorted by what needs you first, then longest waiting. Pick a column to change it.'
            : 'Every household on your list, with where they have got to and what they are worth.'}
        </caption>
        <thead>
          <tr className="border-b border-line bg-sunk">
            {COLUMNS.map((column) => {
              const active = sort === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={[
                    'px-3 py-2 text-[12px] font-semibold text-ink-soft',
                    column.align === 'right' ? 'text-right' : '',
                    column.wide ? 'hidden xl:table-cell' : '',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
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
            <TableRow key={row.customer.id} row={row} onOpen={onOpen} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Age is meaningless where nobody is waiting for anything.
 *
 * A household that is earning, or one we have stopped chasing, has an age — but
 * presenting it in the same amber as a three-week-old blocker would say "this is
 * going stale" about something that is either finished or fine.
 */
const ageIsMoot = (row: CustomerRow): boolean =>
  row.resolved.owner === 'nobody' || row.resolved.earnings === 'paid';

function TableRow({
  row,
  onOpen,
}: {
  row: CustomerRow;
  onOpen: (row: CustomerRow) => void;
}) {
  const { customer, resolved } = row;

  return (
    <tr
      onClick={() => onOpen(row)}
      className="cursor-pointer border-b border-line last:border-0 hover:bg-sunk"
    >
      <td className="max-w-[18rem] truncate px-3 py-2.5 text-[15px] font-semibold text-ink">
        {displayName(customer)}
        {customer.postcode ? (
          <span className="ml-2 text-[13px] font-normal text-ink-mute">{customer.postcode}</span>
        ) : null}
      </td>
      <td className="max-w-[20rem] truncate px-3 text-[13px] text-ink-soft">
        {resolved.state?.label ?? '—'}
      </td>
      <td className="hidden px-3 xl:table-cell">
        <AgeChip band={resolved.ageBand} days={resolved.ageDays} muted={ageIsMoot(row)} />
      </td>
      <td className="px-3 text-right">
        <RewardCell row={row} />
      </td>
      <td className="px-3 text-right text-ink-mute">
        <span aria-hidden="true">›</span>
      </td>
    </tr>
  );
}

/**
 * The money for one household, in the fewest words that are still true.
 *
 * `blocked_by_match` is the only one that gets a colour warning: the reward is real,
 * the clock has run, and it is going to nobody. Everything else is either settled,
 * in progress, or simply has not started, none of which is an alarm.
 */
function RewardCell({ row }: { row: CustomerRow }) {
  const position = moneyPosition(row);

  switch (position) {
    case 'paid':
      return <span className="tnum text-[13px] font-semibold text-accent">£{REWARD_GBP} paid</span>;
    case 'confirmed':
      return (
        <span className="tnum text-[13px] font-semibold text-accent">£{REWARD_GBP} due</span>
      );
    case 'pending':
      return (
        <span className="tnum text-[13px] text-ink-soft">
          {row.resolved.daysRemaining}d to go
        </span>
      );
    case 'blocked_by_match':
      return <span className="text-[13px] font-semibold text-dead-fg">Not credited</span>;
    case 'lapsed':
      return <span className="text-[13px] text-ink-mute">Clock reset</span>;
    default:
      return <Missing />;
  }
}
