import type { HubCompany } from '../fixtures';

/**
 * The campaign email, rendered as it arrives.
 *
 * Nothing is hidden behind "we'll take it from here". A firm is being asked to let a
 * company they have just met write to their entire customer base under their own
 * name; showing them the exact thing that lands, including the From line, is the
 * minimum price of that.
 *
 * THE FROM LINE IS THE RESEARCH ARTEFACT. It is rendered in full — display name,
 * sending domain, reply-to — because which of those an installer will accept is one of
 * the open questions the five sessions exist to answer, and it cannot be asked in the
 * abstract. Show them the header and they have an opinion immediately.
 */
export function EmailPreview({ company }: { company: HubCompany }) {
  const { sender, campaignEmail } = company;
  const viaNote = sender.rung === 'lumo_domain';

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      {/* Header block, styled as an inbox rather than as our UI. */}
      <div className="border-b border-line bg-sunk px-4 py-3">
        <dl className="space-y-1 text-[13px]">
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-ink-mute">From</dt>
            <dd className="min-w-0 text-ink">
              <span className="font-semibold">{sender.displayName}</span>
              {viaNote ? (
                <span className="text-ink-mute"> via {sender.sendingDomain}</span>
              ) : (
                <span className="text-ink-mute"> &lt;hello@{sender.sendingDomain}&gt;</span>
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-ink-mute">Reply to</dt>
            <dd className="min-w-0 truncate text-ink">{sender.replyTo}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-ink-mute">Subject</dt>
            <dd className="min-w-0 font-semibold text-ink">{campaignEmail.subject}</dd>
          </div>
        </dl>
        <p className="mt-2 border-t border-line pt-2 text-[12px] text-ink-mute">
          {campaignEmail.preheader}
        </p>
      </div>

      {/* Body. Deliberately plain: no hero image, no button the size of a fist. */}
      <div className="space-y-3 px-4 py-4">
        <p className="text-[15px] text-ink">Hello Marion,</p>
        {campaignEmail.body.map((paragraph) => (
          <p key={paragraph.slice(0, 24)} className="text-[15px] leading-relaxed text-ink">
            {paragraph}
          </p>
        ))}
        <p className="pt-1">
          <span className="inline-flex h-10 items-center rounded-full bg-accent px-4 text-[14px] font-semibold text-white">
            Set up smart control
          </span>
        </p>
        <p className="text-[15px] text-ink">
          — {sender.displayName}
        </p>
        <p className="border-t border-line pt-3 text-[12px] text-ink-mute">
          Sent by Lumo on behalf of {sender.displayName}, who fitted your battery. Not
          interested? Unsubscribe and neither of us will contact you about this again.
        </p>
      </div>
    </div>
  );
}

/**
 * The sender ladder, as an explicit choice with its cost stated.
 *
 * This is a research probe, not a recommendation, and it must not read as one. Which
 * rung a firm will accept is genuinely unknown: rung 1 needs nothing from them and
 * ships immediately, rung 2 authenticates as their own domain and protects their
 * reputation but needs someone who can edit DNS.
 *
 * ON THE WORDING. "Impersonation" is the objection this has to defuse, and it defuses
 * it by being accurate: the firm publishes a key in their own DNS, which is a grant of
 * authority rather than a forgery, and is why the mail passes DMARC where a spoof
 * fails. Every brand's "sent via" email works this way.
 */
export function SenderLadder({ company }: { company: HubCompany }) {
  const { sender } = company;

  return (
    <div className="space-y-2">
      <Rung
        active={sender.rung === 'lumo_domain'}
        title="Send from Lumo's domain"
        cost="Nothing to set up"
        body={`Arrives as "${sender.displayName}", with replies coming back to you. Some email apps add a small "via" note showing it was sent through Lumo. Ready immediately.`}
      />
      <Rung
        active={sender.rung === 'delegated_subdomain'}
        title="Send from your own domain"
        cost="Two DNS records"
        body="You publish two records we give you, on a subdomain of your own domain. The email then authenticates as you rather than as us, and your main domain's reputation stays separate from it. Ten minutes for whoever looks after your website."
        verified={sender.delegationVerified}
      />
      <p className="pt-1 text-[13px] text-ink-mute">
        Either way you are the sender and we act on your instruction. The second option is
        not us pretending to be you — it only works because you publish the key, which is
        the same thing every company's newsletter does.
      </p>
    </div>
  );
}

function Rung({
  active,
  title,
  cost,
  body,
  verified,
}: {
  active: boolean;
  title: string;
  cost: string;
  body: string;
  verified?: boolean;
}) {
  return (
    <div
      className={[
        'rounded-card border p-3',
        active ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[14px] font-bold text-ink">
          {title}
          {active ? (
            <span className="ml-2 text-[12px] font-semibold text-accent">
              {verified ? 'In use, verified' : 'In use'}
            </span>
          ) : null}
        </p>
        <p className="text-[12px] font-semibold text-ink-mute">{cost}</p>
      </div>
      <p className="mt-1 text-[13px] leading-snug text-ink-soft">{body}</p>
    </div>
  );
}
