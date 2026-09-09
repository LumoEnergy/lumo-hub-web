import { useState } from 'react';
import type { HubCompany } from '../fixtures';
import { Button } from './ui';
import { Sheet } from './Sheet';

/**
 * The campaign email, rendered as it arrives.
 *
 * Nothing is hidden behind "we'll take it from here". A firm is being asked to let a
 * company they have just met write to their entire customer base under their own
 * name; showing them the exact thing that lands, including the From line, is the
 * minimum price of that.
 *
 * THE FROM LINE IS THE RESEARCH ARTEFACT. It is rendered in full, display name,
 * sending domain and reply-to, because which of those an installer will accept is one
 * of the open questions the sessions exist to answer, and it cannot be asked in the
 * abstract. Show them the header and they have an opinion immediately.
 *
 * IT IS ALSO EDITABLE NOW, and that is a genuine product decision rather than a
 * demo affordance. Read-only made approval a take-it-or-leave-it: the firm knows
 * their customers and we do not, and a firm that cannot change a sentence will
 * either not approve at all or approve something that reads wrong in their voice.
 * The subject and the paragraphs are theirs. The footer is not, because the
 * unsubscribe line and the "sent on behalf of" disclosure are what make the send
 * lawful, and those are not ours to let anyone delete.
 */
export function EmailPreview({
  company,
  onEdit,
}: {
  company: HubCompany;
  onEdit?: (subject: string, body: readonly string[]) => void;
}) {
  const { sender, campaignEmail } = company;
  const [editing, setEditing] = useState(false);
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
        {campaignEmail.body.map((paragraph, i) => (
          <p
            key={paragraph.slice(0, 24)}
            className={
              // The grid reward is the first paragraph and it is set larger than the
              // rest. An offer buried in paragraph three is an offer nobody reads.
              i === 0
                ? 'text-[19px] leading-snug font-bold text-accent'
                : 'text-[15px] leading-relaxed text-ink'
            }
          >
            {paragraph}
          </p>
        ))}
        <p className="pt-1">
          <span className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-[14px] font-semibold text-white">
            Get Lumo now
          </span>
        </p>
        <p className="text-[15px] text-ink">{sender.displayName}</p>
        <p className="border-t border-line pt-3 text-[12px] text-ink-mute">
          Sent by Lumo on behalf of {sender.displayName}, who fitted your battery. Not
          interested? Unsubscribe and neither of us will contact you about this again.
        </p>
      </div>

      {onEdit ? (
        <div className="flex items-center justify-between gap-3 border-t border-line bg-sunk px-4 py-2.5">
          <p className="text-[12px] text-ink-mute">Your customers, your words. Change anything.</p>
          <Button variant="secondary" small onClick={() => setEditing(true)}>
            Edit the email
          </Button>
        </div>
      ) : null}

      {onEdit ? (
        <Sheet open={editing} title="Edit the email" onClose={() => setEditing(false)}>
          <EmailEditor
            company={company}
            onSave={(subject, body) => {
              onEdit(subject, body);
              setEditing(false);
            }}
          />
        </Sheet>
      ) : null}
    </div>
  );
}

/**
 * The editor. Subject plus one textarea per paragraph, and nothing else.
 *
 * No rich text, no merge fields, no template picker. A firm changing this email is
 * changing a sentence or two into their own voice, and every control added to this
 * panel is another thing to get wrong in an email going to eight hundred people.
 */
function EmailEditor({
  company,
  onSave,
}: {
  company: HubCompany;
  onSave: (subject: string, body: readonly string[]) => void;
}) {
  const [subject, setSubject] = useState(company.campaignEmail.subject);
  const [body, setBody] = useState<string[]>([...company.campaignEmail.body]);

  const set = (index: number, value: string) =>
    setBody((current) => current.map((p, i) => (i === index ? value : p)));

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="campaign-subject"
          className="mb-1 block text-[13px] font-semibold text-ink-soft"
        >
          Subject
        </label>
        <input
          id="campaign-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="h-12 w-full rounded-chip border border-line-strong bg-surface px-3 text-[16px] text-ink lg:h-10 lg:text-[15px]"
        />
      </div>

      {body.map((paragraph, i) => (
        <div key={i}>
          <label
            htmlFor={`campaign-body-${i}`}
            className="mb-1 block text-[13px] font-semibold text-ink-soft"
          >
            {i === 0 ? 'Opening line' : `Paragraph ${i + 1}`}
          </label>
          <textarea
            id={`campaign-body-${i}`}
            value={paragraph}
            onChange={(e) => set(i, e.target.value)}
            rows={i === 0 ? 2 : 3}
            className="w-full rounded-chip border border-line-strong bg-surface p-3 text-[15px] text-ink"
          />
        </div>
      ))}

      <p className="text-[13px] text-ink-mute">
        The unsubscribe line and the note saying we send on your behalf stay as they are.
        They are what keeps the send legal.
      </p>

      <Button full onClick={() => onSave(subject, body)}>
        Save the email
      </Button>
    </div>
  );
}

/**
 * Email campaign setup: two cards, one decision.
 *
 * A research probe, not a recommendation, and it must not read as one. Which option a
 * firm will accept is genuinely unknown: the first needs nothing from them and ships
 * immediately, the second authenticates as their own domain and protects their
 * reputation but needs someone who can edit DNS.
 *
 * THE DNS DETAIL IS BEHIND THE CARD, not next to it. It used to be a third card with
 * an expander, which put a wall of record types in the middle of the story on a screen
 * whose job is to sell the flow. A modal keeps it one click from the decision and zero
 * clicks from everyone who does not care.
 *
 * ON THE WORDING. "Impersonation" is the objection this has to defuse, and it defuses
 * it by being accurate: the firm publishes a key in their own DNS, which is a grant of
 * authority rather than a forgery, and is why the mail passes DMARC where a spoof
 * fails. Every brand's "sent via" email works this way.
 */
export function SenderLadder({ company }: { company: HubCompany }) {
  const { sender } = company;
  const [showDns, setShowDns] = useState(false);
  const onLumoDomain = sender.rung === 'lumo_domain';

  return (
    <div className="space-y-2">
      <Rung
        active={onLumoDomain}
        title="Send from Lumo's domain"
        cost="Nothing to set up"
        body={`Arrives as "${sender.displayName}", replies come back to you. Gmail and Outlook add a small "via ${sender.sendingDomain}" note under your name.`}
      />

      <Rung
        active={sender.rung === 'delegated_subdomain'}
        title="Send from your own domain"
        cost="Requires DNS setup"
        body="The via note disappears and the email authenticates as you. Two records on a subdomain of your own domain."
        verified={sender.delegationVerified}
        onOpen={() => setShowDns(true)}
      />

      <p className="pt-1 text-[13px] text-ink-mute">
        Either way you are the sender and we act on your instruction. The second is not us
        pretending to be you: it only works because you publish the key.
      </p>

      <Sheet open={showDns} title="Send from your own domain" onClose={() => setShowDns(false)}>
        <DnsSetup company={company} />
      </Sheet>
    </div>
  );
}

/**
 * The actual records, because "just update your DNS" is not an instruction.
 *
 * Written for the person who will really do it, whoever built the firm's website
 * working from a forwarded email, not for the installer. Hence real record types, a
 * named subdomain, and an explicit note that the main domain is untouched, which is
 * the first thing any competent web person will want to know before they agree to it.
 *
 * The book-a-call route matters more than the records do. Most installers will not do
 * this themselves and pretending otherwise is how the upgrade path stays theoretical.
 */
function DnsSetup({ company }: { company: HubCompany }) {
  const bare = company.selfServeLinkToken;
  const subdomain = `lumo.${bare}renewables.co.uk`;

  const records = [
    {
      type: 'CNAME',
      value: 'dkim.lumopartners.co.uk',
      why: 'Lets us sign mail with a key you have authorised. This is what makes it authenticate as you.',
    },
    {
      type: 'TXT',
      value: 'v=spf1 include:lumopartners.co.uk ~all',
      why: 'Tells inbox providers our servers may send for that subdomain.',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-[15px] leading-snug text-ink-soft">
        Two records on <span className="font-semibold text-ink">{subdomain}</span>, a
        subdomain we would use only for this. Your main domain is untouched, so your normal
        email and website carry on exactly as they are.
      </p>

      <ul className="space-y-2">
        {records.map((record) => (
          <li key={record.type} className="rounded-card border border-line bg-sunk px-3 py-2">
            <p className="text-[12px] font-semibold text-ink-soft">{record.type}</p>
            <p className="mt-0.5 break-all font-mono text-[12px] text-ink">{record.value}</p>
            <p className="mt-1 text-[12px] leading-snug text-ink-mute">{record.why}</p>
          </li>
        ))}
      </ul>

      <div className="rounded-card border border-accent bg-accent-soft p-3">
        <p className="text-[14px] font-semibold text-ink">Not your sort of thing?</p>
        <p className="mt-1 text-[13px] text-ink-soft">
          Book a call and we will do it with whoever looks after your website. Ten minutes.
        </p>
        <div className="mt-3">
          <Button variant="secondary" small>
            Book a call
          </Button>
        </div>
      </div>

      <p className="text-[13px] text-ink-mute">
        We check every few minutes and switch you over once both are live. Nothing changes in
        the meantime, and staying on Lumo's domain is a perfectly good answer.
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
  onOpen,
}: {
  active: boolean;
  title: string;
  cost: string;
  body: string;
  verified?: boolean;
  onOpen?: () => void;
}) {
  const content = (
    <>
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
    </>
  );

  const shell = [
    'block w-full rounded-card border p-3 text-left',
    active ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
    onOpen ? 'transition-colors duration-150 hover:border-line-strong hover:bg-sunk' : '',
  ].join(' ');

  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} className={shell}>
        {content}
        <p className="mt-2 text-[12px] font-semibold text-accent">See what is involved</p>
      </button>
    );
  }

  return <div className={shell}>{content}</div>;
}
