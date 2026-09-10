/**
 * The register of state this design needs and the platform does not produce.
 *
 * This is a deliberate output, not a caveat. Designing these states here means the
 * real build knows up front that it has to create them, rather than discovering it
 * late and quietly shipping a screen that reports fiction, which is precisely what
 * the live Hub does today with its invite status.
 *
 * Do not remove an entry to make a screen simpler. If a gap closes, close it because
 * a producer now exists, and say which one.
 *
 * THE SHAPE OF THIS REGISTER CHANGED when the product became a back-book campaign
 * owned by a company rather than a set of invites sent by an individual. Two gaps
 * were rewritten rather than edited, and the reasons are worth keeping:
 *
 *   - `installer_company_entity` replaced a gap that asked for a per-person
 *     attribution token. Lumo's customer is the firm; the firm decides internally
 *     whether an engineer gets a cut. What the platform still needs per person is an
 *     audit field ("who added this row"), because "which of my crews actually
 *     registers customers" is the most useful management view the Hub can offer,
 *     but that is a column, not an identity to pay.
 *   - `campaign_lifecycle` replaced an invite gap. The unit is a list, not a
 *     household, and the missing producer is a real ESP integration with real
 *     delivery feedback.
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
    id: 'campaign_lifecycle',
    concept: 'A campaign send with real delivery feedback',
    statesAffected: [
      'queued',
      'sent',
      'opened',
      'clicked',
      'bounced',
      'no_response',
      'unsubscribed',
      'complained',
    ],
    whyMissing:
      'Nothing tracks an outbound send to a household. There is no campaign entity, no send, and no delivery feedback anywhere in the estate.',
    whatTheRealBuildMustCreate:
      'A campaign with a per-household send record, plus a webhook consumer for the mail provider’s delivered, bounced, opened, clicked, unsubscribed and complained events. Without the bounce and complaint events specifically there is no way to protect the sending domain, and without click events there is no way to identify the warm leads that are the installer’s reason to engage at all.',
    evidence:
      "The live Hub sets lumo_homeowner_email_invite_status = 'Email pending' on create and nothing ever moves it. Its transactional email registry holds one template, admin-auth-alert, which is installer auth. Where real contacts read 'Email sent', a human typed it.",
    blocksRealBuild: true,
  },
  {
    id: 'list_import',
    concept: 'An import batch with data-quality outcomes',
    statesAffected: ['imported', 'held_no_email', 'held_unconfirmed', 'awaiting_approval'],
    whyMissing:
      'There is no bulk ingestion path for installer-supplied households, and no concept of a row that was received but held back as unusable.',
    whatTheRealBuildMustCreate:
      'An import batch entity recording who supplied it, when, how many rows arrived, and a per-row outcome, loaded, held for a missing address, held pending a battery confirmation, or rejected as a duplicate. The held outcomes matter most: they are the only work the product asks an installer to do, so they have to be a real queryable state rather than a spreadsheet a human at Lumo keeps.',
    evidence:
      'Nothing in lumo-api, Firestore or the Hub ingests a list. The first imports will be done by hand by Lumo staff, which is the right call for the first few installers and precisely why the resulting rows still need a real home.',
    blocksRealBuild: true,
  },
  {
    id: 'account_matching',
    concept: 'A join between a contacted household and a Lumo account',
    statesAffected: [
      'matched_import',
      'matched_manual',
      'unmatched_different_email',
      'ambiguous',
      'signed_up',
      'no_account',
    ],
    whyMissing:
      'Nothing reconciles the household an installer supplied against the household that signed up, so a mismatch is indistinguishable from a lead that never converted.',
    whatTheRealBuildMustCreate:
      'A per-household token minted at import, carried through the campaign email and the signup flow, so attribution is a fact rather than an inference. Plus an explicit unmatched outcome with a way to resolve it, and an ambiguity outcome that refuses to guess. Silent non-matching is the failure mode that eats the reward.',
    evidence:
      'There is no such join in lumo-api, Firestore or the Hub. The only signal that a household came from an installer is a free-text CRM property.',
    blocksRealBuild: true,
  },
  {
    id: 'installer_company_entity',
    concept: 'An installer company account, with seats and an added-by audit field',
    statesAffected: ['matched_import', 'matched_manual'],
    whyMissing:
      'There is no installer entity anywhere in the system of record. The only installer-to-household link in the whole estate is partnerTag: a ?partner= URL parameter, cached in the browser, validated server-side only as a string of 1 to 100 characters. lumo-api has no concept of an installer at all.',
    whatTheRealBuildMustCreate:
      'A company entity in Postgres with real identifiers, multiple user seats under it, a verified household association, and an added-by field on every household row. The money is owed to the company; the added-by field exists so the company can manage its own people. Attribution cannot be a string the customer can type.',
    evidence:
      'Production partnerTag values include gbsolar.co.uk, GB_Solar_Ltd, not_sure and test_installer_01. The same firm is counted twice, which is what happens when identity is a free-text field rather than an entity.',
    blocksRealBuild: true,
  },
  {
    id: 'contact_permission',
    concept: 'A recorded attestation that the back-book agreed to be contacted',
    statesAffected: ['awaiting_approval', 'queued', 'complained'],
    whyMissing:
      'Nothing records permission to contact a household, because nothing has ever contacted one.',
    whatTheRealBuildMustCreate:
      'An attestation on the company account: who confirmed that their customers agreed to be contacted about products relating to their installation, when, and covering which import. It is the lawful basis for the whole campaign, Lumo sends as a processor on the installer’s instruction, relying on the installer’s own relationship with the household, so it needs to be an auditable record, not a checkbox whose value is discarded. It also protects the sending domain: a list without real permission generates the complaints that get every installer’s campaign filtered.',
    evidence:
      'No consent or permission artefact exists in the estate for installer-sourced households. A data processing agreement per installer is the contractual half of this and is not a product feature, but nothing should send before both exist.',
    blocksRealBuild: true,
  },
  {
    id: 'sender_identity',
    concept: 'Per-installer sender configuration',
    statesAffected: ['awaiting_approval', 'queued', 'sent'],
    whyMissing:
      'All outbound mail today is Lumo-branded transactional email from a single domain. There is no notion of sending on another party’s behalf.',
    whatTheRealBuildMustCreate:
      'A sender config per company: display name and reply-to at minimum, and optionally a verified sending subdomain the installer delegates by publishing DKIM and SPF records in their own DNS. The delegated form is authenticated and consented, which is what distinguishes it from spoofing, DMARC passes precisely because the domain owner published the key. Campaign mail must also leave from a domain entirely separate from the app’s transactional mail, so a bad list cannot take down password resets and control alerts with it.',
    evidence:
      'The estate has one transactional sending identity and one template. Sending thousands of campaign emails from it would put every installer’s campaign and the app’s own mail behind the same reputation.',
    blocksRealBuild: false,
  },
  {
    id: 'installer_site_visibility',
    concept: 'A lawful, authorised way for an installer to see a household’s telemetry',
    statesAffected: ['signed_up', 'Smart Control Active', 'confirmed', 'paid'],
    whyMissing:
      'The data exists and the permission does not. Half-hourly telemetry is already written per site to Firestore at webapp_site_data/{siteId} and already rendered as charts by the household’s own app, so the pipeline this screen needs is built. What is missing is any concept of a third party reading it: the document is scoped to the household that owns the site, and there is no installer identity to scope it to instead.',
    whatTheRealBuildMustCreate:
      'Two things, and the second is the hard one. First, an installer-scoped read path: the document is one per site, so a firm with several hundred live households cannot fan out hundreds of client reads, and this wants a server-side aggregate or a per-installer projection. Second, a lawful basis. Half-hourly consumption reveals when a house is empty, when people go to bed and when they go on holiday, which makes it a materially more sensitive disclosure than a name and an email. The contact attestation does not cover it: agreeing to be told about a product is not agreeing to have your electricity use shown to a contractor indefinitely. This needs its own consent, captured from the household rather than asserted by the installer, revocable, and probably narrower than the full series.',
    evidence:
      'The ops console reads webapp_site_data and webapp_sites directly with staff credentials, which is the only access pattern that exists today. Nothing in the estate has ever exposed one party’s energy data to another party, and Firestore rules currently deny it.',
    blocksRealBuild: true,
  },
];

export const producerGapsFor = (stateId: string): readonly ProducerGap[] =>
  PRODUCER_GAPS.filter((gap) => gap.statesAffected.includes(stateId));
