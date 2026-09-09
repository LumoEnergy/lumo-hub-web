import type { HubCompany } from '../fixtures';
import type { ContactStateId } from '../state';
import { REWARD_GBP } from '../state';
import type { CustomerRow } from './customers';
import { earningCount, signedUpCount } from './customers';

/**
 * THE FUNNEL. The one screen that has to survive a founder glancing at it.
 *
 * Everything else in the Hub answers "what should I do?". This answers "is this
 * working?", which is the only question being asked in the first sales conversation,
 * and it has to be answerable in about four seconds.
 *
 * TWO RULES, BOTH LEARNED THE HARD WAY.
 *
 * Percentages are of the stage above, not of the list. "8% of delivered signed up"
 * is a number an email marketer can compare against their own; "5% of the list" is a
 * number that quietly hides a bounce rate. Showing drop-off at the step where it
 * happens is the difference between a funnel and a bar chart.
 *
 * Nothing here is projected. Every figure is a count of something that has already
 * happened. There is no "at this rate you would earn", however tempting it is on a
 * screen whose job is to impress — see the forbidden list in the design spec.
 */

/** Contact states that mean an email actually left the building. */
const EMAILED: readonly ContactStateId[] = [
  'sent',
  'opened',
  'clicked',
  'signed_up',
  'no_response',
  'bounced',
  'unsubscribed',
  'complained',
];

/**
 * States that prove the household read it.
 *
 * `signed_up` counts, even though a household could in principle sign up from the
 * firm's newsletter link without ever opening the campaign email. Treating a
 * sign-up as un-opened would make the funnel widen at the bottom, which reads as a
 * bug. The overlap is small and the alternative is worse.
 */
const OPENED: readonly ContactStateId[] = ['opened', 'clicked', 'signed_up'];

/** Loaded and cleaned, but their turn has not come round yet. */
const WAITING: readonly ContactStateId[] = ['imported', 'awaiting_approval', 'queued'];

/** No usable address, so no amount of scheduling will reach them. */
const UNREACHABLE: readonly ContactStateId[] = ['held_no_email', 'held_unconfirmed'];

const countIn = (rows: readonly CustomerRow[], states: readonly ContactStateId[]): number =>
  rows.filter((row) => (states as readonly string[]).includes(row.customer.contact)).length;

export interface JourneyStage {
  readonly id: 'list' | 'emailed' | 'delivered' | 'opened' | 'signed_up' | 'earning';
  readonly label: string;
  readonly count: number;
  /** Share of the stage above, as a fraction. `null` for the first stage. */
  readonly ofPrevious: number | null;
  /** Share of the whole list, which drives the bar width. */
  readonly ofList: number;
  readonly note: string;
}

export interface Journey {
  readonly stages: readonly JourneyStage[];
  /** Cleaned and approved, simply not sent yet. Not a failure — a queue. */
  readonly waitingToSend: number;
  /** No usable address. Only the firm can change this number. */
  readonly unreachable: number;
  /** Delivered, never opened, and we have stopped emailing them. */
  readonly givenUp: number;
  /** Asked not to be contacted again, including the spam complaints. */
  readonly optedOut: number;
  readonly listSize: number;
}

export function journey(rows: readonly CustomerRow[]): Journey {
  const listSize = rows.length;
  const emailed = countIn(rows, EMAILED);
  const bounced = countIn(rows, ['bounced']);
  const delivered = emailed - bounced;
  const opened = countIn(rows, OPENED);
  const signedUp = signedUpCount(rows);
  const earning = earningCount(rows);

  const share = (n: number, of: number): number | null => (of === 0 ? null : n / of);

  const stages: JourneyStage[] = [
    {
      id: 'list',
      label: 'On your list',
      count: listSize,
      ofPrevious: null,
      ofList: 1,
      note: 'Households you handed over that we could turn into a record.',
    },
    {
      id: 'emailed',
      label: 'Emailed',
      count: emailed,
      ofPrevious: share(emailed, listSize),
      ofList: listSize === 0 ? 0 : emailed / listSize,
      note: 'Sent as you, on your instruction. The rest are queued or have no address.',
    },
    {
      id: 'delivered',
      label: 'Delivered',
      count: delivered,
      ofPrevious: share(delivered, emailed),
      ofList: listSize === 0 ? 0 : delivered / listSize,
      note: `${bounced} bounced. Normal on an older book, and each one is a recoverable £${REWARD_GBP}.`,
    },
    {
      id: 'opened',
      label: 'Opened',
      count: opened,
      ofPrevious: share(opened, delivered),
      ofList: listSize === 0 ? 0 : opened / listSize,
      note: 'The number that tells you whether the email is landing and being trusted.',
    },
    {
      id: 'signed_up',
      label: 'Signed up',
      count: signedUp,
      ofPrevious: share(signedUp, opened),
      ofList: listSize === 0 ? 0 : signedUp / listSize,
      note: 'Created a Lumo account and connected their battery.',
    },
    {
      id: 'earning',
      label: 'Earning',
      count: earning,
      ofPrevious: share(earning, signedUp),
      ofList: listSize === 0 ? 0 : earning / listSize,
      note: `Control running. Thirty consecutive days earns you £${REWARD_GBP}.`,
    },
  ];

  return {
    stages,
    waitingToSend: countIn(rows, WAITING),
    unreachable: countIn(rows, UNREACHABLE),
    givenUp: countIn(rows, ['no_response']),
    optedOut: countIn(rows, ['unsubscribed', 'complained']),
    listSize,
  };
}

/**
 * Where the send has got to, and what is next.
 *
 * Separate from the funnel on purpose: the funnel is about outcomes, this is about
 * time. "When will the rest go out" is the second question every installer asks and
 * the product has never had an answer to it.
 */
export interface SendProgress {
  readonly sent: number;
  readonly scheduled: number;
  readonly total: number;
  readonly nextBatch: HubCompany['schedule'][number] | null;
  /** Sending days left, which is the honest answer to "when is this finished". */
  readonly daysRemaining: number;
  /** Weighted open rate across everything sent so far. `null` before any send. */
  readonly openRate: number | null;
  /**
   * True when the dates are not real yet. Nothing sends before sign-off, so the
   * schedule is a shape rather than a set of dates until then.
   */
  readonly awaitingApproval: boolean;
}

export function sendProgress(company: HubCompany): SendProgress {
  const { schedule } = company;
  const sentBatches = schedule.filter((b) => b.status === 'sent');
  const sent = sentBatches.reduce((total, b) => total + b.count, 0);
  const pending = schedule.filter((b) => b.status !== 'sent');
  const scheduled = pending.reduce((total, b) => total + b.count, 0);
  const openedTotal = sentBatches.reduce((total, b) => total + (b.opened ?? 0), 0);

  return {
    sent,
    scheduled,
    total: sent + scheduled,
    nextBatch: pending[0] ?? null,
    daysRemaining: pending.length,
    openRate: sent === 0 ? null : openedTotal / sent,
    awaitingApproval: !company.campaignEmail.approved,
  };
}

export const pct = (fraction: number): string => `${Math.round(fraction * 100)}%`;
