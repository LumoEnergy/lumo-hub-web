import { useState } from 'react';
import { REWARD_GBP } from '../state';
import { useDemoStore } from '../store/DemoStore';
import type { CustomerDraft } from '../store/DemoStore';
import { Button } from './ui';

/**
 * Adding households by hand.
 *
 * DEMOTED, DELIBERATELY, and the paste grid is now the default form rather than a
 * disclosure. The main event is a list handed over in bulk; anyone typing here is
 * dealing with the odd one that arrived after the export, or pasting a dozen rows out
 * of a spreadsheet. A single-record form with one name in it is the rarer case and
 * would make the common one feel like an afterthought.
 *
 * WHAT IS NOT ASKED FOR. There is no inverter make and no battery size. An imported
 * back-book rarely carries either, a job record is not a kit record, and demanding
 * them here would either block the add or collect a guess. There is also no fork over
 * who makes contact: the firm has handed over their book, which is the answer.
 *
 * Three columns, in the order a spreadsheet almost always has them, so a paste lands
 * in the right places without anyone mapping anything.
 */

const COLUMNS = ['Name', 'Email', 'Postcode'] as const;
const ROWS = 5;

interface GridRow {
  name: string;
  email: string;
  postcode: string;
}

const emptyRow = (): GridRow => ({ name: '', email: '', postcode: '' });
const emptyGrid = () => Array.from({ length: ROWS }, emptyRow);

const splitName = (full: string): { firstName: string; lastName: string } => {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

export function AddCustomers() {
  const { addCustomers, company } = useDemoStore();
  const [grid, setGrid] = useState<GridRow[]>(emptyGrid);
  const [added, setAdded] = useState<number | null>(null);

  const filled = grid.filter((row) => row.name.trim() !== '');
  const withoutEmail = filled.filter((row) => row.email.trim() === '').length;

  const set = (index: number, key: keyof GridRow, value: string) =>
    setGrid((current) =>
      current.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );

  /**
   * Paste handling is the whole reason this is a grid. Someone copying rows out of
   * Excel gets tab-separated columns and newline-separated rows; without this they
   * would get the entire block dumped into one cell and would give up.
   */
  const onPaste = (index: number, key: keyof GridRow) => (event: React.ClipboardEvent) => {
    const text = event.clipboardData.getData('text');
    if (!/[\t\n]/.test(text)) return;
    event.preventDefault();

    const pasted = text
      .split(/\r?\n/)
      .map((line) => line.split('\t'))
      .filter((cells) => cells.some((cell) => cell.trim() !== ''));

    const startCol = COLUMNS.findIndex((c) => c.toLowerCase() === key);

    setGrid((current) => {
      const next = current.map((row) => ({ ...row }));
      pasted.forEach((cells, r) => {
        const target = index + r;
        while (next.length <= target) next.push(emptyRow());
        cells.forEach((cell, c) => {
          const column = COLUMNS[startCol + c];
          if (!column) return;
          const field = column.toLowerCase() as keyof GridRow;
          next[target][field] = cell.trim();
        });
      });
      return next;
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (filled.length === 0) return;

    const drafts: CustomerDraft[] = filled.map((row) => {
      const { firstName, lastName } = splitName(row.name);
      return { firstName, lastName, email: row.email, postcode: row.postcode };
    });

    addCustomers(drafts);
    setAdded(drafts.length);
    setGrid(emptyGrid);
  };

  if (added !== null) {
    return (
      <div className="rounded-card border border-accent bg-accent-soft p-3">
        <p className="text-[15px] font-semibold text-accent">
          {added === 1 ? 'One household added' : `${added} households added`}
        </p>
        <p className="mt-1 text-[14px] text-ink-soft">
          {company.campaignEmail.approved
            ? 'In the send queue. Nothing else for you to do.'
            : 'They go out with the rest once you approve the email above.'}
        </p>
        <div className="mt-3">
          <Button variant="secondary" small onClick={() => setAdded(null)}>
            Add some more
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <p className="text-[14px] text-ink-soft">
        Paste straight from a spreadsheet: name, email, postcode. No email is fine, they
        just wait until you have one.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-left">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="pb-1 text-[12px] font-semibold text-ink-soft"
                >
                  {column}
                  {column === 'Name' ? null : (
                    <span className="ml-1 font-normal text-ink-mute">optional</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, index) => (
              <tr key={index}>
                {COLUMNS.map((column) => {
                  const field = column.toLowerCase() as keyof GridRow;
                  return (
                    <td key={column} className="pb-1.5 pr-1.5 last:pr-0">
                      <input
                        value={row[field]}
                        onChange={(e) => set(index, field, e.target.value)}
                        onPaste={onPaste(index, field)}
                        aria-label={`${column}, row ${index + 1}`}
                        autoComplete="off"
                        className="h-10 w-full rounded-chip border border-line-strong bg-surface px-2.5 text-[14px] text-ink placeholder:text-ink-mute"
                        placeholder={
                          index === 0
                            ? column === 'Name'
                              ? 'Marion Ashworth'
                              : column === 'Email'
                                ? 'marion@example.com'
                                : 'LS7 3AB'
                            : ''
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={filled.length === 0}>
          {filled.length <= 1 ? 'Add to my list' : `Add ${filled.length} to my list`}
        </Button>
        {filled.length > 0 ? (
          <p className="text-[13px] text-ink-mute">
            <span className="tnum font-semibold text-ink-soft">
              £{filled.length * REWARD_GBP}
            </span>{' '}
            if they all stick
            {withoutEmail > 0
              ? ` · ${withoutEmail} without an email will be held back`
              : ''}
          </p>
        ) : null}
      </div>
    </form>
  );
}
