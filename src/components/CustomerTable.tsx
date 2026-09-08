import { displayName } from '../fixtures';
import { OWNER_LABELS, REWARD_GBP, daysRemainingLabel } from '../state';
import type { CustomerRow as Row, SortDirection, SortKey } from '../selectors/customers';
import { moneyPosition } from '../selectors/customers';
import { AgeChip, Missing } from './ui';
import { ageIsMoot } from './CustomerRow';

/**
 * The desktop table.
 *
 * This is the reason the product is desktop-first. A firm with two hundred-odd
 * households wants to sort by what is oldest, see which of their crews supplied what,
 * and read the shape of the campaign in one screen. None of that is possible in a
 * card list, and a card list is all a phone can honestly show.
 *
 * Sorting is a real `<table>` with `<th aria-sort>` rather than a grid of divs,
 * because a screen reader announcing "column 3 of 6, sorted ascending" is free here
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
  { key: 'owner', label: 'Whose' },
  { key: 'age', label: 'Age' },
  { key: 'money', label: 'Reward', align: 'right' },
];

export function CustomerTable({
  rows,
  sort,
  direction,
  onSort,
  onOpen,
}: {
  rows: readonly Row[];
  sort: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  onOpen: (row: Row) => void;
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
            ? 'Sorted by what needs you first, then oldest. Pick a column to change it.'
            : 'Every household on your list, with what is holding each one up and what it is worth. Sortable by column.'}
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

function TableRow({ row, onOpen }: { row: Row; onOpen: (row: Row) => void }) {
  const { customer, resolved } = row;
  const position = moneyPosition(row);
  const mine = resolved.owner === 'installer';

  return (
    <tr
      onClick={() => onOpen(row)}
      className="h-11 cursor-pointer border-b border-line transition-colors duration-150 last:border-b-0 hover:bg-sunk"
    >
      <td className="max-w-[18rem] truncate px-3 text-[15px] font-semibold text-ink">
        {displayName(customer)}
        {customer.postcode ? (
          <span className="ml-2 text-[13px] font-normal text-ink-mute">
            {customer.postcode}
          </span>
        ) : null}
      </td>

      <td className="max-w-[16rem] truncate px-3 text-[13px] text-ink-soft">
        {resolved.state ? resolved.state.label : 'Earning'}
      </td>

      <td className="px-3 text-[13px]">
        <span className={mine ? 'font-semibold text-ink' : 'text-ink-mute'}>
          {mine ? 'You' : OWNER_LABELS[resolved.owner]}
        </span>
      </td>

      <td className="px-3">
        {resolved.state ? (
          <AgeChip days={resolved.ageDays} band={resolved.ageBand} muted={ageIsMoot(row)} />
        ) : (
          <span className="text-[13px] text-ink-mute">—</span>
        )}
      </td>

      <td className="px-3 text-right text-[13px]">
        <RewardCell row={row} position={position} />
      </td>

      <td className="px-3 text-right text-ink-mute" aria-hidden="true">
        ›
      </td>
    </tr>
  );
}

function RewardCell({
  row,
  position,
}: {
  row: Row;
  position: ReturnType<typeof moneyPosition>;
}) {
  switch (position) {
    case 'paid':
      return <span className="tnum font-semibold text-accent">£{REWARD_GBP} paid</span>;
    case 'confirmed':
      return <span className="tnum font-semibold text-accent">£{REWARD_GBP} due</span>;
    case 'pending':
      return (
        <span className="tnum text-ink-soft">
          {daysRemainingLabel(row.resolved.daysRemaining)}
        </span>
      );
    case 'blocked_by_match':
      return <span className="tnum font-semibold text-dead-fg">£{REWARD_GBP} at risk</span>;
    case 'lapsed':
      return <span className="text-ink-mute">Clock reset</span>;
    default:
      return <Missing label="not earning yet" />;
  }
}

function SortMark({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) {
    return (
      <span className="text-ink-mute opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        ↕
      </span>
    );
  }
  return <span aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>;
}
