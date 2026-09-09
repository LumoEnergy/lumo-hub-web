import { useRef, useState } from 'react';
import type { HubCompany, ImportBatch } from '../fixtures';
import { Button, Missing, Panel } from './ui';

/**
 * What happened to every file the firm has handed over.
 *
 * THIS IS THE RECEIPT, and it is the only thing standing between "we sent them our
 * customer book" and silence. A firm that has emailed over a decade of jobs and
 * heard nothing back assumes it went in a bin. The file, the date, who sent it and
 * what became of every row is the cheapest trust the product can buy.
 *
 * PROCESSING IS SHOWN, NOT HIDDEN. Loading a book means matching against existing
 * accounts, de-duplicating within and across files, and deciding what is unusable.
 * That takes real time, so a row can honestly say "we are still working through
 * this" with a row count but no outcomes yet. Faking instant results would turn a
 * normal wait into a support ticket.
 */
const ARRIVAL_LABELS: Record<ImportBatch['arrivedBy'], string> = {
  emailed: 'Emailed to us',
  uploaded: 'Uploaded here',
  by_hand: 'Added by hand',
};

export function FileRecords({
  company,
  onUpload,
}: {
  company: HubCompany;
  onUpload: (filename: string, rows: number) => void;
}) {
  return (
    <Panel title="Your customer lists" meta={`${company.imports.length} handed over`}>
      <ul className="space-y-3">
        {company.imports.map((batch) => (
          <li key={batch.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
            <FileRow batch={batch} />
          </li>
        ))}
      </ul>
      <UploadControl onUpload={onUpload} />
    </Panel>
  );
}

function FileRow({ batch }: { batch: ImportBatch }) {
  const processing = batch.status === 'processing';

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[15px] font-semibold text-ink">
          {batch.filename ?? 'Typed in by hand'}
        </p>
        {processing ? (
          <span className="rounded-full bg-stale-bg px-2 py-0.5 text-[12px] font-semibold text-stale-fg">
            Still processing
          </span>
        ) : (
          <span className="text-[12px] text-ink-mute">Done</span>
        )}
      </div>
      <p className="mt-0.5 text-[13px] text-ink-mute">
        {ARRIVAL_LABELS[batch.arrivedBy]} by {batch.suppliedBy} on {batch.suppliedOn} ·{' '}
        {batch.source}
      </p>

      {/* A file still being matched has one honest number, the count they handed over.
          Rendering the other three as "not given" put the same placeholder on screen three
          times and made a normal wait look like a data fault. */}
      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Figure value={batch.rowsSupplied} label="You sent" />
        {processing ? null : (
          <>
            <Figure value={batch.rowsLoaded} label="We loaded" tone="accent" />
            <Figure value={batch.rowsHeld} label="Need you" tone="warn" />
            <Figure value={batch.rowsRejected} label="Duplicates" />
          </>
        )}
      </div>

      {/* The unusable rows keep their number and lose their explanation. It said
          "thirty-two rows were exact duplicates of another row in the same file, same
          name and same address", which is a sentence about our de-duplication rather
          than about their business, and it was the wordiest thing on the screen. The
          detail belongs in the email we send when a file finishes, not here. */}
      {processing ? (
        <p className="mt-2.5 text-[13px] text-ink-soft">
          Matching against existing Lumo accounts. We will email {batch.suppliedBy} in a few
          hours. Nothing sends until you have seen it.
        </p>
      ) : null}
    </>
  );
}

function Figure({
  value,
  label,
  tone = 'default',
}: {
  value: number | null;
  label: string;
  tone?: 'default' | 'accent' | 'warn';
}) {
  const tones = {
    default: 'text-ink',
    accent: 'text-accent',
    warn: 'text-stale-fg',
  } as const;

  return (
    <div>
      {value === null ? (
        <p className="text-[20px] font-bold leading-tight text-ink-mute">
          <Missing />
        </p>
      ) : (
        <p className={`tnum text-[20px] font-bold leading-tight ${tones[tone]}`}>
          {value.toLocaleString('en-GB')}
        </p>
      )}
      <p className="text-[12px] leading-tight text-ink-soft">{label}</p>
    </div>
  );
}

/**
 * Sending another list.
 *
 * BOTH ROUTES, AND EMAIL IS NOT THE FALLBACK. The upload exists because a firm that
 * has already done this once will reach for it, and asking them to compose an email
 * for their second batch is friction we put there ourselves. But the concierge path
 * stays equally prominent, because for a firm doing this for the first time "just
 * send us whatever comes out of your system" converts better than any upload UI, and
 * it is how we keep seeing what real exports look like.
 *
 * No column mapping, no header matching, no preview grid. Lumo does that work, that
 * is the entire promise, and an upload screen that makes them tidy their own CSV
 * would break it while looking like a feature.
 */
function UploadControl({ onUpload }: { onUpload: (filename: string, rows: number) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [added, setAdded] = useState<string | null>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    // A prototype with no backend cannot read a real row count, and guessing from
    // the file size would put a fabricated number on screen. A fixed plausible
    // count is honest about being a demo; a fake precise one is not.
    onUpload(file.name, 96);
    setAdded(file.name);
  };

  return (
    <div className="mt-4 border-t border-line pt-4">
      <input
        ref={input}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => input.current?.click()}>
          Add another list
        </Button>
        <p className="text-[13px] text-ink-mute">
          Or email it to <span className="font-semibold text-ink">partners@lumo.energy</span>.
        </p>
      </div>
      <p className="mt-2 max-w-[62ch] text-[13px] text-ink-mute">
        Any shape, columns in any order. We tidy it and tell you what we found.
      </p>
      {added ? (
        <p className="mt-2 text-[13px] font-semibold text-accent">
          {added} received. We will email you when it is loaded.
        </p>
      ) : null}
    </div>
  );
}
