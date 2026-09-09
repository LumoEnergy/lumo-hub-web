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
 * FIVE STAGES, NOT SIX. There was a Delivered stage between Emailed and Opened whose
 * only content was the bounce count, and a sixth bar earned less than the second it
 * cost to read. Bounces are still accounted for, in `bounced` below, and they are
 * still money: the aside states them next to the other places households drop out.
 *
 * TWO RULES, BOTH LEARNED THE HARD WAY.
 *
 * Percentages are of the stage above, not of the list. "8% of the emailed signed up"
 * is a number an email marketer can compare against their own; "5% of the list" is a
 * number that quietly hides a bounce rate. Showing drop-off at the step where it
 * happens is the difference between a funnel and a bar chart.
 *
 * Nothing here is projected. Every figure is a count of something that has already
 * happened. Nothing extrapolates a rate into a future total, however tempting that is
 * on a screen whose job is to impress. See the forbidden list in the design spec.
 *
 * THE PROSE IS GONE. Each stage used to carry a sentence explaining it, which is six
 * sentences of body text on a screen whose entire job is to be glanced at. What
 * survives is a label, a number and a drop-off percentage, because that is what a
 * funnel is.
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

export type StageId = 'list' | 'emailed' | 'opened' | 'signed_up' | 'earning';

export interface JourneyStage {
  readonly id: StageId;
  readonly label: string;
  readonly count: number;
  /** Share of the stage above, as a fraction. `null` for the first stage. */
  readonly ofPrevious: number | null;
  /** Share of the whole list, which drives the bar width. */
  readonly ofList: number;
  /** One short line, shown on hover and to screen readers. Never on the face. */
  readonly hint: string;
}

/** Where households leave the funnel. Named so nothing quietly vanishes. */
export interface DropOut {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  /** True where the firm can do something about it. */
  readonly actionable: boolean;
}

export interface Journey {
  readonly stages: readonly JourneyStage[];
  readonly dropOuts: readonly DropOut[];
  readonly listSize: number;
}

export function journey(rows: readonly CustomerRow[]): Journey {
  const listSize = rows.length;
  const emailed = countIn(rows, EMAILED);
  const bounced = countIn(rows, ['bounced']);
  const opened = countIn(rows, OPENED);
  const signedUp = signedUpCount(rows);
  const earning = earningCount(rows);

  const share = (n: number, of: number): number | null => (of === 0 ? null : n / of);
  const ofList = (n: number) => (listSize === 0 ? 0 : n / listSize);

  const stages: JourneyStage[] = [
    {
      id: 'list',
      label: 'On your list',
      count: listSize,
      ofPrevious: null,
      ofList: 1,
      hint: 'Households you handed over.',
    },
    {
      id: 'emailed',
      label: 'Emailed',
      count: emailed,
      ofPrevious: share(emailed, listSize),
      ofList: ofList(emailed),
      hint: 'Sent as you, on your instruction.',
    },
    {
      id: 'opened',
      label: 'Opened',
      count: opened,
      ofPrevious: share(opened, emailed),
      ofList: ofList(opened),
      hint: 'Tells you whether the email is being trusted.',
    },
    {
      id: 'signed_up',
      label: 'Signed up',
      count: signedUp,
      ofPrevious: share(signedUp, opened),
      ofList: ofList(signedUp),
      hint: 'Made a Lumo account and connected a battery.',
    },
    {
      id: 'earning',
      label: 'Earning',
      count: earning,
      ofPrevious: share(earning, signedUp),
      ofList: ofList(earning),
      hint: `Control running. Thirty days in a row pays you £${REWARD_GBP}.`,
    },
  ];

  const dropOuts: DropOut[] = [
    { id: 'queued', label: 'Still to send', count: countIn(rows, WAITING), actionable: false },
    { id: 'bounced', label: 'Bounced', count: bounced, actionable: true },
    { id: 'no_email', label: 'No address', count: countIn(rows, UNREACHABLE), actionable: true },
    { id: 'quiet', label: 'No response', count: countIn(rows, ['no_response']), actionable: false },
    {
      id: 'opted_out',
      label: 'Opted out',
      count: countIn(rows, ['unsubscribed', 'complained']),
      actionable: false,
    },
  ];

  return { stages, dropOuts: dropOuts.filter((d) => d.count > 0), listSize };
}

/**
 * The live fleet, for the monitoring strip.
 *
 * Deliberately not energy data. There is no state of charge here, no time series and
 * no savings figure, because none of that exists in this prototype and faking it in a
 * founder demo would set an expectation the real Hub cannot meet on day one.
 *
 * What it does show is what the platform genuinely knows about a connected household:
 * whether control is running, how far through the reward clock it is, and what kit it
 * is on. That is enough to make the point that this screen becomes a monitoring
 * surface, without inventing a single number.
 */
export interface FleetHealth {
  readonly live: number;
  readonly settingUp: number;
  readonly needsLook: number;
  readonly signedUp: number;
  /** Households inside the 30 consecutive days, so the money is not banked yet. */
  readonly onTheClock: number;
  readonly qualified: number;
  /** Inverter makes across the live fleet, commonest first. */
  readonly kit: readonly { readonly make: string; readonly count: number }[];
}

export function fleetHealth(rows: readonly CustomerRow[]): FleetHealth {
  const onPlatform = rows.filter((row) => row.customer.contact === 'signed_up');
  const live = onPlatform.filter((row) => row.customer.activation === 'Smart Control Active');

  const settingUp = onPlatform.filter((row) =>
    ['Smart Control Test Running', 'Smart Control Check Incomplete', 'Setup Incomplete'].includes(
      row.customer.activation,
    ),
  );

  const counts = new Map<string, number>();
  for (const row of live) {
    const make = row.customer.inverterMake;
    if (make) counts.set(make, (counts.get(make) ?? 0) + 1);
  }

  return {
    live: live.length,
    settingUp: settingUp.length,
    needsLook: onPlatform.length - live.length - settingUp.length,
    signedUp: onPlatform.length,
    onTheClock: live.filter((row) => row.resolved.earnings === 'qualifying').length,
    qualified: live.filter(
      (row) => row.resolved.earnings === 'confirmed' || row.resolved.earnings === 'paid',
    ).length,
    kit: [...counts.entries()]
      .map(([make, count]) => ({ make, count }))
      .sort((a, b) => b.count - a.count || a.make.localeCompare(b.make)),
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
