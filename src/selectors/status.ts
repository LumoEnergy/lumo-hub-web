import type { CustomerRow } from './customers';
import { REWARD_GBP } from '../state';

/**
 * WHAT A ROW SAYS IT IS, in words an installer already owns.
 *
 * The status column used to show whichever of four tracks was most blocking, which
 * is why it could say "More than one possible match" or "Interested, not signed up".
 * Both are accurate and neither is a thing anybody says. Worse, a column that
 * sometimes reports campaign progress and sometimes reports an internal matching
 * problem is not one column, it is two sharing a header.
 *
 * So status is now one thing only: where this household has got to. It runs in the
 * same order as the funnel and uses the same five colours, so recognising a stage on
 * one screen means recognising it on the other.
 *
 * PROBLEMS MOVED OUT, they did not disappear. Anything the firm can act on is an
 * `action` on the Needs you view, phrased as an instruction rather than a diagnosis.
 * That is the honest split: status is a fact about the customer, an action is a job
 * for the firm.
 */

export type StatusTone = 'wait' | 'sent' | 'open' | 'click' | 'live' | 'warn' | 'quiet';

export interface Status {
  readonly label: string;
  readonly tone: StatusTone;
}

const STATUS_CLASS: Record<StatusTone, string> = {
  wait: 'bg-wait-bg text-wait-fg',
  sent: 'bg-sent-bg text-sent-fg',
  open: 'bg-open-bg text-open-fg',
  click: 'bg-click-bg text-click-fg',
  live: 'bg-accent-soft text-accent',
  warn: 'bg-warn-bg text-warn-fg',
  quiet: 'bg-wait-bg text-ink-mute',
};

export const statusClass = (tone: StatusTone): string => STATUS_CLASS[tone];

export function statusFor(row: CustomerRow): Status {
  const { customer } = row;

  switch (customer.contact) {
    case 'held_no_email':
      return { label: 'No email address', tone: 'warn' };
    case 'held_unconfirmed':
      return { label: 'Battery unconfirmed', tone: 'warn' };
    case 'awaiting_approval':
      return { label: 'Waiting for your approval', tone: 'wait' };
    case 'imported':
    case 'queued':
      return { label: 'Not emailed yet', tone: 'wait' };
    case 'sent':
      return { label: 'Emailed', tone: 'sent' };
    case 'opened':
      return { label: 'Email opened', tone: 'open' };
    case 'clicked':
      return { label: 'Clicked through', tone: 'click' };
    case 'bounced':
      return { label: 'Email bounced', tone: 'warn' };
    case 'no_response':
      return { label: 'No response', tone: 'quiet' };
    case 'unsubscribed':
      return { label: 'Unsubscribed', tone: 'quiet' };
    case 'complained':
      return { label: 'Marked as spam', tone: 'quiet' };
    case 'signed_up':
      // Signing up is not the end of the journey, and the gap between "signed up"
      // and "earning you money" is where every household actually gets stuck. Three
      // words rather than ten activation states: the Active view carries the detail.
      return customer.activation === 'Smart Control Active'
        ? { label: 'Active', tone: 'live' }
        : { label: 'Setting up', tone: 'open' };
  }
}

/**
 * How healthy a live household is, for the Active view.
 *
 * The activation label verbatim, because on this one screen the detail IS the point:
 * "Device Disconnected" and "Needs Relink" are different jobs for whoever installed
 * it. Everywhere else it would be noise.
 */
export function controlStatus(row: CustomerRow): Status {
  const label = row.customer.activation;
  if (label === 'Smart Control Active') return { label: 'Running', tone: 'live' };
  if (label === 'no_account') return { label: 'No account', tone: 'quiet' };

  const healthy: readonly string[] = [
    'Smart Control Test Running',
    'Smart Control Check Incomplete',
  ];
  return { label, tone: healthy.includes(label) ? 'open' : 'warn' };
}

/**
 * What the firm should actually do, for the Needs you view.
 *
 * SHORT, AND AN IMPERATIVE. The previous copy explained the situation at length in
 * the row itself, which meant nobody read any of it. The reasoning still exists on
 * the detail panel; this is the one line that tells them which of four jobs this is.
 */
export function actionFor(row: CustomerRow): string {
  if (row.resolved.track === 'match') {
    return `Tell us this one is yours. Worth £${REWARD_GBP}.`;
  }

  switch (row.customer.contact) {
    case 'held_no_email':
      return 'Add an email address and we will write to them.';
    case 'held_unconfirmed':
      return 'Confirm whether they have a battery.';
    case 'bounced':
      return 'Old address. Send us a newer one.';
    case 'clicked':
      return 'Interested but stalled. Worth a call.';
    default:
      return row.resolved.state?.label ?? 'Take a look.';
  }
}
