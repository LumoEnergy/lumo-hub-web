import type { HubCompany } from '../fixtures';
import type { ContactStateId } from '../state';
import type { CustomerRow } from './customers';

/**
 * THREE VIEWS OF ONE LIST, each answering a different question.
 *
 * The previous four filters were a workload cut: all, needs you, earning, not
 * emailed. That is one question asked four ways. These are separate questions a firm
 * actually arrives with, and because each has a different question it gets a
 * different set of columns rather than the same table filtered.
 *
 * THERE WAS A FOURTH VIEW, `active`, AND IT WAS ON THE WRONG SCREEN. It listed live
 * households with their battery, inverter and control health, which is not a campaign
 * question at all: it is read on a different schedule, by a different person, off
 * telemetry rather than email events. It is now the Monitoring screen. What is left
 * here is only the campaign, and `liveRows` below is the seam between the two.
 *
 * THERE IS NO "ALL", AND IT OPENS ON INVITED. An 808-row undifferentiated list is the
 * least useful thing this screen can show: it is the state of the whole book averaged
 * into one scroll, and it opened on 322 households nothing has happened to yet.
 * Invited is where the campaign actually is.
 *
 * Nothing becomes unreachable. `EMAILED_STATES` and `WAITING_STATES` partition all
 * thirteen contact states between Invited and Not yet contacted, with no overlap and
 * no gap, and `views.test.ts` asserts exactly that so a new contact state cannot
 * quietly strand a household in a view nobody can open.
 */

export type ViewId = 'invited' | 'waiting' | 'attention';

/** Opened when no view is named. Invited, not the whole book. */
export const DEFAULT_VIEW: ViewId = 'invited';

export interface ViewDefinition {
  readonly id: ViewId;
  readonly label: string;
  /** What this view is for, shown under the tabs. One short line. */
  readonly blurb: string;
}

export const VIEWS: readonly ViewDefinition[] = [
  { id: 'invited', label: 'Invited', blurb: 'Households we have emailed, and what they did.' },
  {
    id: 'waiting',
    label: 'Not yet contacted',
    blurb: 'Still to go out, and when we plan to send.',
  },
  { id: 'attention', label: 'Needs you', blurb: 'Four jobs only you can do.' },
];

/** Contact states that mean an email actually went. */
export const EMAILED_STATES: readonly ContactStateId[] = [
  'sent',
  'opened',
  'clicked',
  'signed_up',
  'no_response',
  'bounced',
  'unsubscribed',
  'complained',
];

/** Loaded but not sent to, for either reason. */
export const WAITING_STATES: readonly ContactStateId[] = [
  'imported',
  'awaiting_approval',
  'queued',
  'held_no_email',
  'held_unconfirmed',
];

/**
 * A click goes cold. How cold is a product decision, not a constant.
 *
 * Seven days: long enough that they have plainly not come back on their own, short
 * enough that the fitter who installed their battery is still a recent memory. A
 * fresher click needs no chasing, and putting it on a call list trains people to
 * ignore the call list.
 */
export const STALE_CLICK_DAYS = 7;

/**
 * The four jobs, and only these four.
 *
 * Deliberately a named list rather than "everything with a blocker". The old version
 * derived this from state dispositions, which quietly swept in activation problems a
 * firm can do nothing about, and the resulting list was too long to be a to-do.
 *
 * 1. No email address. Only they have it.
 * 2. Bounced. Same, with a newer address.
 * 3. Battery unconfirmed. Only they know.
 * 4. Clicked and went cold. Worth a phone call from the firm that fitted the kit.
 *
 * Plus unmatched, which is not a campaign state at all: the household is earning and
 * the firm is not being paid for it. That used to be a callout pinned above the
 * list, which made it the loudest thing on the screen on every visit.
 */
export function needsYou(rows: readonly CustomerRow[]): readonly CustomerRow[] {
  return rows.filter((row) => {
    if (row.resolved.track === 'match') return true;
    switch (row.customer.contact) {
      case 'held_no_email':
      case 'held_unconfirmed':
      case 'bounced':
        return true;
      case 'clicked':
        return row.resolved.ageDays >= STALE_CLICK_DAYS;
      default:
        return false;
    }
  });
}

export function rowsForView(
  rows: readonly CustomerRow[],
  view: ViewId,
): readonly CustomerRow[] {
  switch (view) {
    case 'waiting':
      return rows.filter((row) =>
        (WAITING_STATES as readonly string[]).includes(row.customer.contact),
      );
    case 'attention':
      return needsYou(rows);
    case 'invited':
    default:
      return rows.filter((row) =>
        (EMAILED_STATES as readonly string[]).includes(row.customer.contact),
      );
  }
}

/**
 * The households the Monitoring screen is about.
 *
 * NOT a fourth bucket in the Sign-ups partition. `signed_up` sits in `EMAILED_STATES`,
 * so these households are still on Invited, where they belong: we emailed them and
 * they joined. Monitoring is a second lens over a subset, not a slice taken out of the
 * campaign, and `views.test.ts` asserts the subset relation so the two screens cannot
 * end up disagreeing about who is live.
 *
 * INCLUDES THE BROKEN ONES. A monitoring view that quietly drops the households whose
 * battery is offline is the one view guaranteed to be useless, because those are the
 * only rows anyone opens it for.
 */
export function liveRows(rows: readonly CustomerRow[]): readonly CustomerRow[] {
  return rows.filter((row) => row.customer.contact === 'signed_up');
}

export const isViewId = (value: string | null): value is ViewId =>
  value !== null && VIEWS.some((v) => v.id === value);

/**
 * Which day each queued household is going out on.
 *
 * Fills the upcoming batches in list order until each is full. This is a real
 * derivation rather than a decorative date: the schedule says 100 a day, so the
 * hundred-and-first person genuinely goes tomorrow, and a firm can tell a customer
 * who rings up when to expect it.
 *
 * Held rows never appear here. There is no address, so there is no send to schedule,
 * and a date next to one would be a promise the product cannot keep.
 */
export function scheduledSendDates(
  rows: readonly CustomerRow[],
  company: HubCompany,
): ReadonlyMap<string, string> {
  const upcoming = company.schedule.filter((batch) => batch.status !== 'sent');
  const queued = rows
    .filter((row) => row.customer.contact === 'queued' || row.customer.contact === 'imported')
    .map((row) => row.customer.id)
    .sort();

  const dates = new Map<string, string>();
  let index = 0;
  for (const batch of upcoming) {
    for (let n = 0; n < batch.count && index < queued.length; n += 1, index += 1) {
      dates.set(queued[index], batch.date);
    }
  }
  return dates;
}
