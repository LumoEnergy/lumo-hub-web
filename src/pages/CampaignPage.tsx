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
 * Campaign, everything about the sending, in the order of the conversation.
 *
 * RENAMED FROM "YOUR LIST", which was ambiguous in the one way a screen title cannot
 * afford to be: it read as a page about the people rather than about the machinery,
 * and the Hub now has a Customers tab that genuinely is the list of people. This is
 * the file, the email, the timing and the permission, the campaign.
 *
 * The order is the order of the conversation a firm actually has with us: here is
 * what we did with what you sent, here is exactly what goes out under your name,
 * here is when, here is who it comes from, and here is the basis we are relying on.
 * Approval sits with the email because that is the thing being approved.
 */
export function CampaignPage() {
  const { company, customers, approveCampaign, addFile, setDailyCap, editEmail } = useDemoStore();
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
      <ScreenTitle sub="What we did with your lists, and exactly what goes out under your name.">
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
                Read it, change anything, approve once
              </p>
              <p className="mt-1 text-[14px] text-ink-soft">
                One sign-off covers all {readyToSend} households and anything you add later. We
                will not come back to you for each batch.
              </p>
              <div className="mt-3">
                <Button onClick={approve} disabled={approving}>
                  {approving ? 'Starting the send' : `Approve and send to ${readyToSend}`}
                </Button>
              </div>
            </div>
          )}

          <EmailPreview company={company} onEdit={editEmail} />
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

        <Panel title="Email campaign setup" meta="Tell us which you would rather">
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
              confirmed these customers agreed to be contacted about products relating to their
              installation. We rely on that and we keep the record. It is why the email comes
              from you rather than from us.
            </p>
          ) : (
            <p className="text-[14px] text-ink-soft">
              Nothing sends until someone at {company.name} confirms these customers agreed to
              be contacted about products relating to their installation.
            </p>
          )}
        </Panel>

        <Panel title="Your own channels" meta="Optional">
          <p className="text-[14px] text-ink-soft">
            Got a newsletter or a Facebook group? Drop this link in. Your channel, your list,
            nothing to hand over, and anyone who comes through it is credited to{' '}
            {company.name}.
          </p>
          <div className="mt-3">
            <CopyBlock label="Your company link" value={newsletterLink} />
          </div>
          <p className="mt-2 text-[13px] text-ink-mute">
            Worth £{REWARD_GBP} a household, same as the campaign.
          </p>
        </Panel>

        <Panel title="Add customers by hand" meta="For the odd one, or a small batch">
          <AddCustomers />
        </Panel>
      </div>

      <p className="px-4 pb-8 pt-4 text-[12px] text-ink-mute lg:px-0">
        Demo only. Nothing here sends an email, writes to a database or leaves this tab.
        <span className="sr-only"> Base path {DEMO_BASE}.</span>
      </p>
    </>
  );
}
