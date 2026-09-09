import { useState } from 'react';
import type { HubCompany } from '../fixtures';
import type { SendProgress } from '../selectors/journey';
import { pct } from '../selectors/journey';
import { Button, Field } from './ui';

/**
 * The send schedule.
 *
 * WHY THIS IS A FEATURE AND NOT A SETTING. Eight hundred emails leaving a young
 * sending domain at once is the fastest way to get every future campaign filtered,
 * for this firm and, at the shared rung, for every other firm on the domain. The
 * throttle is not a nicety, it is what keeps the channel alive. Saying so out loud
 * turns "why is this taking a fortnight" into "good, they know what they are doing",
 * which is the difference between the schedule reassuring an installer and annoying
 * one.
 *
 * DATES ARE A LIE BEFORE SIGN-OFF. Nothing sends until the email is approved, so an
 * unapproved campaign shows the shape, day 1, day 2, day 3, rather than dates that
 * will be wrong the moment they take a day to read it.
 */
const dayLabel = (date: string, index: number, awaitingApproval: boolean): string => {
  if (awaitingApproval) return `Day ${index + 1}`;
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
};

export function SendSchedule({
  company,
  progress,
  onChangeCap,
  compact,
}: {
  company: HubCompany;
  progress: SendProgress;
  onChangeCap?: (cap: number) => void;
  /** Dashboard mode: the next few days only, no editing. */
  compact?: boolean;
}) {
  const pending = company.schedule.filter((b) => b.status !== 'sent');
  const visible = compact
    ? [...company.schedule.filter((b) => b.status === 'sent').slice(-1), ...pending.slice(0, 3)]
    : company.schedule;

  return (
    <div>
      <ul className="space-y-1">
        {visible.map((batch) => {
          const index = pending.findIndex((b) => b.id === batch.id);
          const sent = batch.status === 'sent';
          return (
            <li
              key={batch.id}
              className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-0"
            >
              <div className="flex min-w-0 items-baseline gap-2">
                <span
                  className={[
                    'shrink-0 text-[13px] tabular-nums',
                    sent ? 'text-ink-mute' : 'font-semibold text-ink',
                  ].join(' ')}
                >
                  {dayLabel(batch.date, index === -1 ? 0 : index, progress.awaitingApproval)}
                </span>
                <span className="truncate text-[13px] text-ink-soft">
                  {batch.count.toLocaleString('en-GB')} households
                </span>
              </div>
              <span className="shrink-0 text-[12px] text-ink-mute">
                {sent
                  ? batch.opened !== null
                    ? `sent · ${pct(batch.opened / batch.count)} opened`
                    : 'sent'
                  : progress.awaitingApproval
                    ? 'after you approve'
                    : 'scheduled'}
              </span>
            </li>
          );
        })}
      </ul>

      {onChangeCap ? <CapControl company={company} onChangeCap={onChangeCap} /> : null}
    </div>
  );
}

/**
 * Changing the daily cap.
 *
 * The one lever worth giving them, because the reasons to move it are real and
 * specific: one engineer who wants to field the replies personally, a fortnight when
 * the firm is short-handed, or a book so old they would rather test the water with a
 * hundred before committing the rest. The upper bound is not arbitrary politeness,
 * it is the point past which a shared sending domain starts getting filtered.
 */
function CapControl({
  company,
  onChangeCap,
}: {
  company: HubCompany;
  onChangeCap: (cap: number) => void;
}) {
  const [value, setValue] = useState(String(company.dailySendCap));
  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed >= 10 && parsed <= 500;
  const changed = parsed !== company.dailySendCap;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[8rem]">
          <Field
            label="Emails a day"
            type="number"
            min={10}
            max={500}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          disabled={!valid || !changed}
          onClick={() => onChangeCap(parsed)}
        >
          Update schedule
        </Button>
      </div>
      <p className="mt-2 max-w-[62ch] text-[13px] text-ink-mute">
        Between 10 and 500. We keep it low on purpose: send too many at once and inbox
        providers start treating the rest of your list as spam.
      </p>
    </div>
  );
}
