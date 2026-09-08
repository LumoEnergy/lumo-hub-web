import type { StateDefinition, StateTrack } from './types';

/**
 * Contact state — what happened to the campaign email Lumo sends to the installer's
 * back-book.
 *
 * THIS TRACK REPLACED AN EARLIER "INVITE" TRACK, AND THE REASON MATTERS. That track
 * modelled an installer adding households one at a time and choosing, per household,
 * whether Lumo or they made contact. It was wrong — not in its data shape but in what
 * it asked of the installer. A firm with three hundred past battery installations
 * will never sit in an unfamiliar tool adding them individually, and asking them to
 * write and send the email themselves and then record that they had done so is asking
 * for three jobs when the entire premise is that Lumo has not yet earned one.
 *
 * So the unit of work is a list, not a household. The installer hands over their
 * back-book once and confirms their customers agreed to be contacted. Lumo loads it,
 * writes the email, sends it as them, chases it and reports back. Every state below
 * is therefore something that happens TO a household rather than something the
 * installer did.
 *
 * COPY RULE FOR THIS TRACK. Any state owned by the installer must justify itself in
 * money, because they have no reason yet to do work on Lumo's behalf. "Call them" is
 * a chore. "These are the warmest leads on your list and a call from you converts
 * them far better than another email from us" is an argument. Every installer-owned
 * action here is written to the second form, and reviews of this file should hold it
 * to that.
 *
 * WHAT THE PLATFORM PRODUCES TODAY: none of it. There is no campaign, no send, no
 * import and no email event anywhere in the estate. The live Hub writes
 * `lumo_homeowner_email_invite_status = 'Email pending'` on create and nothing ever
 * moves it, so the status the current product shows is fiction. See `producerGaps.ts`
 * for what the real build has to create.
 *
 * A CAVEAT ON `opened`, worth carrying into the real build: open tracking is a
 * pixel, and Apple Mail Privacy Protection pre-fetches it while Gmail's image proxy
 * and any client with images off suppress it. Opens are therefore soft evidence in
 * both directions and must never gate a payment or a chase decision on their own.
 * `clicked` is trustworthy; `opened` is a hint.
 */

export const CONTACT_STATE_IDS = [
  'imported',
  'held_no_email',
  'held_unconfirmed',
  'awaiting_approval',
  'queued',
  'sent',
  'opened',
  'clicked',
  'signed_up',
  'bounced',
  'no_response',
  'unsubscribed',
  'complained',
] as const;

export type ContactStateId = (typeof CONTACT_STATE_IDS)[number];

const STATES: Record<ContactStateId, StateDefinition<ContactStateId>> = {
  imported: {
    id: 'imported',
    label: 'On your list',
    blocker: 'Loaded from your customer list. Lumo is still checking the details.',
    owner: 'lumo',
    action: null,
    disposition: 'in_flight',
  },
  held_no_email: {
    id: 'held_no_email',
    label: 'No email address',
    blocker:
      'Your list had no usable email for this household, so there is nobody for us to write to. Nothing else about the row is wrong.',
    owner: 'installer',
    action:
      'Add the address if you have it anywhere. Each one you supply is another £50 on the table, and we cannot get it from anywhere but you.',
    disposition: 'blocked',
  },
  held_unconfirmed: {
    id: 'held_unconfirmed',
    label: 'Battery not confirmed',
    blocker:
      "We cannot tell from your list whether this household actually has a battery. Sending to solar-only customers wastes the send and risks spam complaints that damage everyone's campaign.",
    owner: 'installer',
    action:
      'Confirm whether they have storage. You are the only one who knows, and a wrong guess either way costs you.',
    disposition: 'blocked',
  },
  awaiting_approval: {
    id: 'awaiting_approval',
    label: 'Ready to send',
    blocker:
      'Cleaned, checked and ready. Waiting on you to approve the email we send on your behalf.',
    owner: 'installer',
    action:
      'Approve the email once and every household on your list goes out. It is the only sign-off we will ask you for.',
    disposition: 'blocked',
  },
  queued: {
    id: 'queued',
    label: 'Sending',
    blocker:
      'In the send queue. We deliberately ramp up slowly rather than sending your whole list at once, because a spike of complaints would get every campaign filtered.',
    owner: 'lumo',
    action: null,
    disposition: 'in_flight',
  },
  sent: {
    id: 'sent',
    label: 'Email sent',
    blocker: null,
    owner: 'nobody',
    action: null,
    disposition: 'in_flight',
  },
  opened: {
    id: 'opened',
    label: 'Opened it',
    blocker: null,
    owner: 'nobody',
    action: null,
    disposition: 'in_flight',
  },
  clicked: {
    id: 'clicked',
    label: 'Interested, not signed up',
    blocker:
      'They clicked through and then stopped part-way. They are interested and something put them off.',
    owner: 'installer',
    action:
      'The warmest leads on your list. A call from the firm that fitted their battery converts these far better than another email from a company they have never heard of.',
    disposition: 'blocked',
  },
  signed_up: {
    id: 'signed_up',
    label: 'Signed up',
    blocker: null,
    owner: 'nobody',
    action: null,
    disposition: 'earning',
  },
  bounced: {
    id: 'bounced',
    label: 'Email bounced',
    blocker:
      'The address on your list is dead, so they never saw it. Common on a back-book — people change provider and move house.',
    owner: 'installer',
    action:
      'A better address puts them straight back in the queue. Bounces also hurt our sending reputation, so this one helps the rest of your list too.',
    disposition: 'blocked',
  },
  /**
   * OWNED BY NOBODY, DELIBERATELY, and this is the most arguable call in the track.
   *
   * A firm can act on a non-responder: a call from the company that fitted the
   * battery is the only thing left that would work. But this is the largest state in
   * any back-book campaign by a wide margin — around a hundred rows out of two
   * hundred — and a per-row task repeated a hundred times is not a queue, it is
   * wallpaper. It would bury the thirty-odd rows that genuinely need one specific
   * thing doing.
   *
   * So it is a cohort, not a task list. The row carries no action and never enters
   * the queue; the customers screen states the aggregate and makes the argument once.
   * Same reasoning as the held rows: one number with a total attached is an argument,
   * an itemised list of a hundred is a chore.
   */
  no_response: {
    id: 'no_response',
    label: 'No response',
    blocker:
      'Delivered and never opened. Lumo will not email these again — repeatedly mailing people who ignore us is how a sending domain dies, and it would take the rest of your list down with it.',
    owner: 'nobody',
    action: null,
    disposition: 'blocked',
  },
  unsubscribed: {
    id: 'unsubscribed',
    label: 'Opted out',
    blocker: 'They asked not to be contacted again, so we will not, and neither should you.',
    owner: 'nobody',
    action: null,
    disposition: 'blocked',
  },
  complained: {
    id: 'complained',
    label: 'Marked as spam',
    blocker:
      'They reported the email. Shown because it is honest and because it is the clearest signal that a list had addresses on it that should not have been there.',
    owner: 'nobody',
    action: null,
    disposition: 'blocked',
  },
};

/**
 * A manual one-at-a-time add is a batch of one and enters at `imported` like
 * everything else. Keeping one entry point is deliberate: two would mean two code
 * paths for data quality, and the ad-hoc path is exactly where dubious rows arrive.
 */
const TRANSITIONS: Record<ContactStateId, readonly ContactStateId[]> = {
  imported: ['held_no_email', 'held_unconfirmed', 'awaiting_approval'],
  held_no_email: ['awaiting_approval'],
  held_unconfirmed: ['awaiting_approval', 'held_no_email'],
  awaiting_approval: ['queued'],
  queued: ['sent', 'bounced'],
  // A household can sign up without a recorded open: the pixel may never load.
  sent: ['opened', 'clicked', 'signed_up', 'bounced', 'no_response', 'unsubscribed', 'complained'],
  opened: ['clicked', 'signed_up', 'no_response', 'unsubscribed', 'complained'],
  clicked: ['signed_up', 'no_response', 'unsubscribed'],
  signed_up: [],
  // A corrected address goes back to the send queue, not back for re-approval —
  // the installer signed off the email, not each recipient.
  bounced: ['queued', 'held_no_email'],
  no_response: ['signed_up', 'unsubscribed'],
  unsubscribed: [],
  complained: [],
};

export const CONTACT: StateTrack<ContactStateId> = {
  name: 'Contact',
  description:
    'What happened to the campaign email Lumo sends to the back-book, on the installer’s behalf. No producer today.',
  states: STATES,
  order: CONTACT_STATE_IDS,
  initial: ['imported'],
  transitions: TRANSITIONS,
};

export const contactState = (id: ContactStateId): StateDefinition<ContactStateId> => STATES[id];

/**
 * States where the household is somewhere in the campaign rather than on the
 * platform. Everything except `signed_up`, but named so the intent survives someone
 * adding a state later.
 */
export const isPreSignup = (id: ContactStateId): boolean => id !== 'signed_up';

/**
 * Rows held back from sending because only the installer can resolve them. This is
 * the "only you can fix this" queue on the customers screen, and it is deliberately
 * the ONLY place the product asks them for data-entry work.
 */
export const HELD_STATES: readonly ContactStateId[] = ['held_no_email', 'held_unconfirmed'];

/**
 * States where the household is NOT the unit of work, so the row must never appear
 * as an individual task.
 *
 * This is the same lesson as `no_response` in three more places, and it is the one
 * that decides whether the queue is usable. `awaiting_approval` is the clearest: one
 * sign-off releases the entire list, so putting it on every row would produce a
 * hundred and eighteen identical instructions to click the same button once. The
 * held states and bounces are batch jobs — fifty missing addresses is a job you sit
 * down and do, not fifty separate decisions.
 *
 * Each of these is presented in aggregate above the list instead. `clicked` is
 * deliberately absent: a warm lead is a specific person somebody would ring, and a
 * name is what makes that possible.
 */
export const AGGREGATED_STATES: readonly ContactStateId[] = [
  'awaiting_approval',
  'held_no_email',
  'held_unconfirmed',
  'bounced',
];
