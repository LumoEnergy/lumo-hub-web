import type { StateDefinition, StateTrack } from './types';

/**
 * Invite state — how the household came to hear about Lumo, and what happened to
 * the invite.
 *
 * NOTHING IN THE PLATFORM PRODUCES ANY OF THIS TODAY. Until now nothing tracked an
 * invite at all: the live Hub writes `lumo_homeowner_email_invite_status = 'Email
 * pending'` on create and nothing ever moves it, because the transactional email
 * registry holds exactly one template and it is an installer auth alert. The status
 * the current product displays is fiction. See `producerGaps.ts`.
 *
 * Designing the track here means the real build knows up front that it has to
 * create these states rather than discovering it late.
 *
 * Note the deliberate split between `sent_by_lumo` and `sent_by_installer`. Both
 * paths are recorded distinctly because we currently cannot tell an installer-sourced
 * household from a self-declared one anywhere in the estate, and that is precisely
 * why six months of installer channel produced no attributable answer.
 */

export const INVITE_STATE_IDS = [
  'added',
  'staged_for_lumo',
  'sent_by_lumo',
  'sent_by_installer',
  'link_only',
  'no_response',
  'bounced',
  'unsubscribed',
] as const;

export type InviteStateId = (typeof INVITE_STATE_IDS)[number];

const STATES: Record<InviteStateId, StateDefinition<InviteStateId>> = {
  added: {
    id: 'added',
    label: 'Added, not invited yet',
    blocker: "You haven't chosen how they get invited.",
    owner: 'installer',
    action: 'Pick who makes contact: Lumo, or you.',
    disposition: 'blocked',
  },
  staged_for_lumo: {
    id: 'staged_for_lumo',
    label: 'Lumo will contact them',
    blocker: 'Queued for Lumo to send.',
    owner: 'lumo',
    action: null,
    disposition: 'in_flight',
  },
  sent_by_lumo: {
    id: 'sent_by_lumo',
    label: 'Invited by Lumo',
    blocker: null,
    owner: 'nobody',
    action: null,
    disposition: 'in_flight',
  },
  sent_by_installer: {
    id: 'sent_by_installer',
    label: 'You invited them',
    blocker: null,
    owner: 'nobody',
    action: null,
    disposition: 'in_flight',
  },
  link_only: {
    id: 'link_only',
    label: 'Shared by link or QR',
    blocker:
      "No email address captured, so nobody can chase them and matching depends entirely on them using your link.",
    owner: 'installer',
    action: 'Get their email if you can. Without it your £50 rests on the link alone.',
    disposition: 'blocked',
  },
  no_response: {
    id: 'no_response',
    label: 'No response',
    blocker: "Invited, and they still haven't signed up.",
    owner: 'installer',
    action: 'Call them. A second email almost never lands.',
    disposition: 'blocked',
  },
  bounced: {
    id: 'bounced',
    label: 'Email bounced',
    blocker: "The address didn't accept the invite, so they never saw it.",
    owner: 'installer',
    action: 'Check the address and re-add them with the correction.',
    disposition: 'blocked',
  },
  unsubscribed: {
    id: 'unsubscribed',
    label: 'Unsubscribed',
    blocker: 'They opted out of Lumo email. We will not contact them again.',
    owner: 'nobody',
    action: null,
    disposition: 'blocked',
  },
};

const TRANSITIONS: Record<InviteStateId, readonly InviteStateId[]> = {
  added: ['staged_for_lumo', 'sent_by_installer', 'link_only'],
  staged_for_lumo: ['sent_by_lumo'],
  sent_by_lumo: ['no_response', 'bounced', 'unsubscribed'],
  sent_by_installer: ['no_response', 'unsubscribed'],
  // An email can be captured later, at which point a link-only share becomes a
  // proper invite.
  link_only: ['staged_for_lumo', 'sent_by_installer'],
  no_response: ['staged_for_lumo', 'sent_by_installer', 'unsubscribed'],
  bounced: ['staged_for_lumo', 'sent_by_installer'],
  unsubscribed: [],
};

export const INVITE: StateTrack<InviteStateId> = {
  name: 'Invite',
  description:
    'What happened to the invite. Hub-side only: no part of the platform emits any of this today.',
  states: STATES,
  order: INVITE_STATE_IDS,
  initial: ['added'],
  transitions: TRANSITIONS,
};

export const inviteState = (id: InviteStateId): StateDefinition<InviteStateId> => STATES[id];
