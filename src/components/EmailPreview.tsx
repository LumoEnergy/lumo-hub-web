import { useState } from 'react';
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
  const [showSetup, setShowSetup] = useState(false);
  const onLumoDomain = sender.rung === 'lumo_domain';

  return (
    <div className="space-y-2">
      <Rung
        active={onLumoDomain}
        title="Send from Lumo's domain"
        cost="Nothing to set up"
        body={`Arrives as "${sender.displayName}", with replies coming back to you. Gmail and Outlook add a small "via ${sender.sendingDomain}" note under your name — most people never notice it, some do.`}
      />
      <Rung
        active={sender.rung === 'delegated_subdomain'}
        title="Send from your own domain"
        cost="Two DNS records"
        body="You publish two records we give you, on a subdomain of your own domain. The 'via' note disappears, the email authenticates as you rather than as us, and your main domain's reputation stays insulated from it. Ten minutes for whoever looks after your website."
        verified={sender.delegationVerified}
      />

      {onLumoDomain ? (
        <div className="rounded-card border border-line bg-surface">
          <button
            type="button"
            onClick={() => setShowSetup((v) => !v)}
            aria-expanded={showSetup}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
          >
            <span className="text-[13px] font-semibold text-ink">
              What the DNS change involves
            </span>
            <span aria-hidden="true" className="shrink-0 text-[13px] text-ink-mute">
              {showSetup ? 'Hide' : 'Show'}
            </span>
          </button>
          {showSetup ? <DnsSetup company={company} /> : null}
        </div>
      ) : null}

      <p className="pt-1 text-[13px] text-ink-mute">
        Either way you are the sender and we act on your instruction. The second option is
        not us pretending to be you — it only works because you publish the key, which is
        the same thing every company's newsletter does.
      </p>
    </div>
  );
}

/**
 * The actual records, because "just update your DNS" is not an instruction.
 *
 * This is written for the person who will really do it — whoever built the firm's
 * website, working from a forwarded email — not for the installer. Hence real record
 * types, a named subdomain, and an explicit note that the main domain is untouched,
 * which is the first thing any competent web person will want to know before they
 * agree to it.
 *
 * Collapsed by default. On the founder demo this is a detail that proves the upgrade
 * path is real; expanded by default it would be a wall of DNS in the middle of the
 * story.
 */
function DnsSetup({ company }: { company: HubCompany }) {
  const bare = company.selfServeLinkToken;
  const subdomain = `lumo.${bare}renewables.co.uk`;

  const records = [
    {
      type: 'CNAME',
      host: `lumo.${bare}...co.uk`,
      value: 'dkim.lumopartners.co.uk',
      why: 'Lets us sign mail with a key you have authorised. This is the part that makes it authenticate as you.',
    },
    {
      type: 'TXT',
      host: `lumo.${bare}...co.uk`,
      value: 'v=spf1 include:lumopartners.co.uk ~all',
      why: 'Tells inbox providers that our servers are allowed to send for that subdomain.',
    },
  ];

  return (
    <div className="border-t border-line px-3 py-3">
      <p className="text-[13px] leading-snug text-ink-soft">
        Two records on <span className="font-semibold text-ink">{subdomain}</span> — a
        subdomain we would use only for this. Your main domain is not touched, so your
        normal email and your website carry on exactly as they are.
      </p>
      <ul className="mt-3 space-y-2">
        {records.map((record) => (
          <li key={record.type} className="rounded-card bg-sunk px-3 py-2">
            <p className="text-[12px] font-semibold text-ink-soft">{record.type}</p>
            <p className="mt-0.5 break-all font-mono text-[12px] text-ink">{record.value}</p>
            <p className="mt-1 text-[12px] leading-snug text-ink-mute">{record.why}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-ink-mute">
        We check them every few minutes and switch you over automatically once both are
        live. Nothing changes for you in the meantime, and you can stay on Lumo's domain
        indefinitely if you would rather not bother.
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
