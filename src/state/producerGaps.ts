/**
 * The register of state this design needs and the platform does not produce.
 *
 * This is a deliberate output, not a caveat. Designing these states here means the
 * real build knows up front that it has to create them, rather than discovering it
 * late and quietly shipping a screen that reports fiction — which is precisely what
 * the live Hub does today with its invite status.
 *
 * Do not remove an entry to make a screen simpler. If a gap closes, close it because
 * a producer now exists, and say which one.
 */

export interface ProducerGap {
  readonly id: string;
  readonly concept: string;
  /** State ids across any track that depend on this producer existing. */
  readonly statesAffected: readonly string[];
  readonly whyMissing: string;
  readonly whatTheRealBuildMustCreate: string;
  readonly evidence: string;
  /**
   * Whether the real build is blocked on this, as opposed to being able to ship a
   * degraded version without it.
   */
  readonly blocksRealBuild: boolean;
}

export const PRODUCER_GAPS: readonly ProducerGap[] = [
  {
    id: 'invite_lifecycle',
    concept: 'An invite that has a delivery state',
    statesAffected: [
      'added',
      'staged_for_lumo',
      'sent_by_lumo',
      'sent_by_installer',
      'link_only',
      'no_response',
      'bounced',
      'unsubscribed',
    ],
    whyMissing:
      'Until now nothing tracked an invite. There is no invite entity, no send, and no delivery feedback anywhere in the estate.',
    whatTheRealBuildMustCreate:
      'An invite record with a real send, a real delivery/bounce/unsubscribe signal from the mail provider, and an age. The "Lumo will contact them" proposition is undeliverable without it.',
    evidence:
      "The live Hub sets lumo_homeowner_email_invite_status = 'Email pending' on both add paths and nothing ever moves it. Its transactional email registry holds one template, admin-auth-alert, which is installer auth. Where real contacts read 'Email sent', a human typed it.",
    blocksRealBuild: true,
  },
  {
    id: 'account_matching',
    concept: 'A join between an invited email and a Lumo account',
    statesAffected: [
      'matched_email',
      'matched_link',
      'unmatched_different_email',
      'ambiguous',
      'no_account',
    ],
    whyMissing:
      'Nothing reconciles the address an installer typed against the address a household signed up with, so a mismatch is indistinguishable from a lead that never converted.',
    whatTheRealBuildMustCreate:
      'A matching step with an explicit unmatched outcome and a way to resolve it, plus an ambiguity outcome that refuses to guess. Silent non-matching is the failure mode that eats the reward.',
    evidence:
      'There is no such join in lumo-api, Firestore or the Hub. The only signal that a household came from an installer is a free-text CRM property.',
    blocksRealBuild: true,
  },
  {
    id: 'installer_identity',
    concept: 'An installer entity, and a per-person attribution link',
    statesAffected: ['matched_link', 'link_only'],
    whyMissing:
      'There is no installer entity anywhere in the system of record. The only installer-to-household link in the whole estate is partnerTag: a ?partner= URL parameter, cached in the browser, validated server-side only as a string of 1 to 100 characters. lumo-api has no concept of an installer at all.',
    whatTheRealBuildMustCreate:
      'An installer entity in Postgres with real identifiers, a verified household association, and a token that identifies a person or a job rather than an email domain. The incentive only works if you can pay the individual who did the work, and attribution cannot be a string the customer can type.',
    evidence:
      'Production partnerTag values include gbsolar.co.uk, GB_Solar_Ltd, not_sure and test_installer_01. The same firm is counted twice. The 2026-08-06 review named this as the blocker on the entire installer roadmap, independent of where the UI is built.',
    blocksRealBuild: true,
  },
];

export const producerGapsFor = (stateId: string): readonly ProducerGap[] =>
  PRODUCER_GAPS.filter((gap) => gap.statesAffected.includes(stateId));
