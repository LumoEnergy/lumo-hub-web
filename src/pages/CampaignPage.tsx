import { useMemo, useState } from 'react';
import { useDemoStore } from '../store/DemoStore';
import { DEMO_BASE } from '../demoBase';
import { sendProgress } from '../selectors/journey';
import { EmailPreview, SenderLadder } from '../components/EmailPreview';
import { FileRecords } from '../components/FileRecords';
import { SendSchedule } from '../components/SendSchedule';
import { AddCustomers } from '../components/AddCustomers';
import { Button, CopyBlock, Panel, ScreenTitle } from '../components/ui';
import { REWARD_GBP } from '../state';

/**
 * Campaign — everything about the sending, in the order of the conversation.
 *
 * RENAMED FROM "YOUR LIST", which was ambiguous in the one way a screen title cannot
 * afford to be: it read as a page about the people rather than about the machinery,
 * and the Hub now has a Customers tab that genuinely is the list of people. This is
 * the file, the email, the timing and the permission — the campaign.
 *
 * The order is the order of the conversation a firm actually has with us: here is
 * what we did with what you sent, here is exactly what goes out under your name,
 * here is when, here is who it comes from, and here is the basis we are relying on.
 * Approval sits with the email because that is the thing being approved.
 */
export function CampaignPage() {
  const { company, customers, approveCampaign, addFile, setDailyCap } = useDemoStore();
  const [approving, setApproving] = useState(false);

  const progress = useMemo(() => sendProgress(company), [company]);
  const approved = company.campaignEmail.approved;
  const readyToSend = customers.filter((c) => c.contact === 'awaiting_approval').length;
  const newsletterLink = `lumo.energy/j/${company.selfServeLinkToken}`;

  const approve = () => {
    // A deliberate pause. Approving several hundred households instantly feels like
    // the click did nothing, and the demo has to convey that a real send is starting.
    setApproving(true);
    setTimeout(() => {
      approveCampaign();
      setApproving(false);
    }, 400);
  };

  return (
    <>
      <ScreenTitle sub="What we did with the lists you sent us, and exactly what goes out under your name.">
        Campaign
      </ScreenTitle>

      <div className="space-y-4 px-4 lg:px-0">
        <FileRecords company={company} onUpload={addFile} />

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
        </Panel>

        <Panel
          title="When it goes out"
          meta={
            progress.awaitingApproval
              ? 'Starts the day after you approve'
              : progress.daysRemaining > 0
                ? `${progress.scheduled.toLocaleString('en-GB')} still to send`
                : 'Finished'
          }
        >
          {progress.total === 0 ? (
            <p className="text-[14px] text-ink-soft">
              We build the schedule once your list is loaded.
            </p>
          ) : (
            <SendSchedule company={company} progress={progress} onChangeCap={setDailyCap} />
          )}
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
              confirmed that the customers on these lists agreed to be contacted about products
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
      </div>

      <p className="px-4 pb-8 pt-4 text-[12px] text-ink-mute lg:px-0">
        Demo only. Nothing on this screen sends an email, writes to a database or leaves this
        tab. The link above is not live.
        <span className="sr-only"> Base path {DEMO_BASE}.</span>
      </p>
    </>
  );
}
