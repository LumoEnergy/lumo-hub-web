import { useMemo, useState } from 'react';
import { useDemoStore } from '../store/DemoStore';
import { DEMO_BASE } from '../demoBase';
import { buildRows, dataQualityGroups } from '../selectors/customers';
import { REWARD_GBP } from '../state';
import { EmailPreview, SenderLadder } from '../components/EmailPreview';
import { AddCustomers } from '../components/AddCustomers';
import { Button, CopyBlock, Panel, ScreenTitle } from '../components/ui';

/**
 * Your list — everything to do with the campaign.
 *
 * One destination rather than a settings area, deliberately. A firm looks at this
 * twice: once to approve, and once when they want to hand over another batch. Burying
 * either behind a gear icon would be hiding the only two things the product needs
 * from them.
 *
 * The order is the order of the conversation: here is what we did with what you sent,
 * here is what we will say, here is who says it, here is your permission on record,
 * and here are the two smaller things you might want.
 */
export function YourListPage() {
  const { company, customers, asOf, approveCampaign } = useDemoStore();
  const [approving, setApproving] = useState(false);

  const rows = useMemo(() => buildRows(customers, asOf), [customers, asOf]);
  const quality = useMemo(() => dataQualityGroups(rows), [rows]);
  const batch = company.imports[0];
  const approved = company.campaignEmail.approved;
  const readyToSend = customers.filter((c) => c.contact === 'awaiting_approval').length;

  const approve = () => {
    // A deliberate pause. Approving 152 households instantly feels like the click did
    // nothing, and the demo has to convey that a real send is starting.
    setApproving(true);
    setTimeout(() => {
      approveCampaign();
      setApproving(false);
    }, 400);
  };

  const newsletterLink = `lumo.energy/j/${company.selfServeLinkToken}`;

  return (
    <>
      <ScreenTitle sub="What we did with the customer list you sent us, and what we send on your behalf.">
        Your list
      </ScreenTitle>

      <div className="space-y-4 px-4 lg:px-0">
        {batch ? (
          <Panel
            title="What we loaded"
            meta={`${batch.source} · supplied by ${batch.suppliedBy} on ${batch.suppliedOn}`}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure value={batch.rowsSupplied} label="You sent" />
              <Figure value={batch.rowsLoaded} label="We loaded" tone="accent" />
              <Figure value={batch.rowsHeld} label="Held back" tone="warn" />
              <Figure value={batch.rowsRejected} label="Could not use" />
            </div>

            {batch.rejectedReason ? (
              <p className="mt-4 border-t border-line pt-3 text-[14px] text-ink-soft">
                <span className="font-semibold text-ink">Could not use:</span>{' '}
                {batch.rejectedReason}
              </p>
            ) : null}

            {quality.length > 0 ? (
              <div className="mt-3 space-y-2 border-t border-line pt-3">
                <p className="text-[14px] font-semibold text-ink">
                  Held back, because only you can resolve these
                </p>
                <ul className="space-y-1.5">
                  {quality.map((group) => (
                    <li key={group.contact} className="text-[14px] text-ink-soft">
                      <span className="tnum font-semibold text-ink">{group.rows.length}</span>{' '}
                      {group.label.toLowerCase()}
                    </li>
                  ))}
                </ul>
                <p className="text-[13px] text-ink-mute">
                  These sit on your customers screen, where you can clear them one at a time.
                  Nothing else on your list is waiting on you.
                </p>
              </div>
            ) : null}
          </Panel>
        ) : null}

        <Panel
          title="The email we send"
          meta={
            approved
              ? `Approved by ${company.campaignEmail.approvedBy} on ${company.campaignEmail.approvedOn}`
              : 'Waiting on you'
          }
        >
          {approved ? null : (
            <div className="mb-4 rounded-card border border-accent bg-accent-soft p-3">
              <p className="text-[15px] font-semibold text-accent">
                Read it, then approve it once
              </p>
              <p className="mt-1 text-[14px] text-ink-soft">
                This is the only sign-off we ask for. It covers all {readyToSend} households
                that are ready, and everything you add later. We will not send anything you
                have not seen, and we will not come back to you for each batch.
              </p>
              <div className="mt-3">
                <Button onClick={approve} disabled={approving}>
                  {approving ? 'Starting the send…' : `Approve and send to ${readyToSend}`}
                </Button>
              </div>
            </div>
          )}

          <EmailPreview company={company} />

          <p className="mt-3 text-[13px] text-ink-mute">
            We send gradually rather than all at once. A few hundred emails arriving in one
            minute is what makes inbox providers treat the rest of your list as spam.
          </p>
        </Panel>

        <Panel title="Who it comes from" meta="An open question — tell us what you think">
          <SenderLadder company={company} />
        </Panel>

        <Panel
          title="Permission"
          meta={
            company.attestation
              ? `Confirmed by ${company.attestation.confirmedBy} on ${company.attestation.confirmedOn}`
              : 'Not confirmed'
          }
        >
          {company.attestation ? (
            <p className="text-[14px] text-ink-soft">
              <span className="font-semibold text-ink">{company.attestation.confirmedBy}</span>{' '}
              confirmed that the customers on this list agreed to be contacted about products
              and services relating to their installation. We rely on that, and we keep the
              record. It is why the email comes from you rather than from us, and it is why we
              act on your instruction rather than on our own.
            </p>
          ) : (
            <p className="text-[14px] text-ink-soft">
              Nothing can be sent until someone at {company.name} confirms these customers
              agreed to be contacted about products relating to their installation.
            </p>
          )}
        </Panel>

        <Panel title="Your own channels" meta="Optional">
          <p className="text-[14px] text-ink-soft">
            If you send a customer newsletter, run a Facebook group, or email people about
            their systems anyway, this link is yours to drop into it. It is your channel and
            your list, so there is no data to hand over and no permission question — and
            anyone who comes through it is credited to {company.name} automatically.
          </p>
          <div className="mt-3">
            <CopyBlock label="Your company link" value={newsletterLink} />
          </div>
          <p className="mt-2 text-[13px] text-ink-mute">
            Worth £{REWARD_GBP} a household, same as the campaign. This is not a way to add
            someone — it is content for something you were already writing.
          </p>
        </Panel>

        <Panel title="Add customers by hand" meta="For the odd one, or a small batch">
          <AddCustomers />
        </Panel>

        <p className="pb-2 text-[13px] text-ink-mute">
          Got another list? Email it to partners@lumo.energy in whatever shape it comes out of
          your system and we will do the rest. A spreadsheet is fine. So is a CSV with columns
          nobody has tidied.
        </p>
      </div>

      <p className="px-4 pb-8 pt-4 text-[12px] text-ink-mute lg:px-0">
        Demo only. Nothing on this screen sends an email, writes to a database or leaves this
        tab. The link above is not live.
        <span className="sr-only"> Base path {DEMO_BASE}.</span>
      </p>
    </>
  );
}

function Figure({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: 'accent' | 'warn';
}) {
  const colour =
    tone === 'accent' ? 'text-accent' : tone === 'warn' ? 'text-stale-fg' : 'text-ink';
  return (
    <div className="rounded-chip bg-sunk px-3 py-2">
      <p className={`tnum text-[22px] font-bold leading-tight ${colour}`}>
        {value.toLocaleString('en-GB')}
      </p>
      <p className="mt-0.5 text-[12px] text-ink-soft">{label}</p>
    </div>
  );
}
