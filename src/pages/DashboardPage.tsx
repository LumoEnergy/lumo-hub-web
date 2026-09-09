import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDemoStore } from '../store/DemoStore';
import { buildRows, earningsSummary, gbp, needsAttentionCount } from '../selectors/customers';
import { journey, pct, sendProgress } from '../selectors/journey';
import { Funnel, FunnelAside } from '../components/Funnel';
import { SendSchedule } from '../components/SendSchedule';
import { Button, Callout, Card, Panel, ScreenTitle } from '../components/ui';

/**
 * The landing page, and the one screen a founder demo lives or dies on.
 *
 * IT ANSWERS "IS THIS WORKING?", NOT "WHAT SHOULD I DO?". The previous landing page
 * was an attention queue, which is the right screen for the tenth session and the
 * wrong one for the first: it opened on a list of chores, so the story it told was
 * "here is some admin" rather than "here is your back-book converting". The work
 * still matters, so it gets one honest line and a route through to it, and the
 * screen leads with the funnel and the money instead.
 *
 * NOTHING ON THIS PAGE IS A PROJECTION. Every figure counts something that has
 * already happened. A dashboard is exactly where a forecast would feel natural and
 * exactly where it would do the most damage — see the design spec's forbidden list.
 */
export function DashboardPage() {
  const { customers, asOf, company, personaName } = useDemoStore();

  const rows = useMemo(() => buildRows(customers, asOf), [customers, asOf]);
  const summary = useMemo(() => earningsSummary(rows), [rows]);
  const funnel = useMemo(() => journey(rows), [rows]);
  const progress = useMemo(() => sendProgress(company), [company]);
  const attention = needsAttentionCount(rows);

  const approved = company.campaignEmail.approved;

  return (
    <>
      <ScreenTitle sub={`Your back-book campaign, run by Lumo on behalf of ${company.name}.`}>
        Dashboard
      </ScreenTitle>

      <div className="space-y-4 px-4 lg:px-0">
        {!approved ? (
          <Callout
            title="Nothing has been sent yet"
            body={`Your list is loaded and cleaned. We are waiting on you to approve the email we send on your behalf — it is the only sign-off we will ask you for, and it covers all ${funnel.listSize} households.`}
            action={
              <Link to="campaign">
                <Button>Read it and approve</Button>
              </Link>
            }
          />
        ) : (
          <MoneyRow
            earned={summary.earnedGbp}
            paid={summary.paidGbp}
            awaiting={summary.awaitingPayoutGbp}
            companyName={company.name}
          />
        )}

        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <Panel
            title="Where your customers are"
            meta={
              approved && progress.openRate !== null
                ? `${pct(progress.openRate)} open rate so far`
                : undefined
            }
          >
            <Funnel journey={funnel} />
            <FunnelAside journey={funnel} />
          </Panel>

          <div className="space-y-4">
            <Panel
              title="Sending"
              meta={
                progress.awaitingApproval
                  ? `${company.dailySendCap} a day once approved`
                  : progress.daysRemaining > 0
                    ? `${progress.scheduled.toLocaleString('en-GB')} left to send`
                    : 'All sent'
              }
            >
              {progress.total === 0 ? (
                <p className="text-[14px] text-ink-soft">
                  Nothing to schedule yet. We build the schedule when your list is loaded.
                </p>
              ) : (
                <>
                  <SendSchedule company={company} progress={progress} compact />
                  <p className="mt-3 text-[13px] text-ink-mute">
                    {progress.daysRemaining > 0
                      ? `We send ${company.dailySendCap} a day rather than all at once, so inbox providers keep trusting your list.`
                      : 'Your whole list has been emailed.'}{' '}
                    <Link to="campaign" className="font-semibold text-accent hover:underline">
                      Manage the schedule
                    </Link>
                  </p>
                </>
              )}
            </Panel>

            {attention > 0 ? (
              <Panel title="Waiting on you" meta={`${attention} households`}>
                {/* Name only what the count contains. An earlier version ended
                    "…or one that is earning with nothing tying it to you", which is
                    the unmatched callout — deliberately NOT in this figure. */}
                <p className="text-[14px] leading-snug text-ink-soft">
                  Most of your list needs nothing from you. These are the households where we
                  have run out of things we can do without you — a missing address, an email
                  that bounced, a battery we cannot confirm, or someone who clicked through
                  and stopped.
                </p>
                <div className="mt-3">
                  <Link to="customers?filter=attention">
                    <Button variant="secondary">See what needs you</Button>
                  </Link>
                </div>
              </Panel>
            ) : null}
          </div>
        </div>

        <p className="pb-2 text-[13px] text-ink-mute">
          Demo only — {personaName}. Every figure counts something that has already happened;
          nothing here is a forecast. No email is sent, nothing is written to a database and
          nothing leaves this tab.
        </p>
      </div>
    </>
  );
}

/**
 * The money, and who it belongs to.
 *
 * "Earned" is paid plus confirmed, and both are final — a household switching control
 * off later does not reverse a reward, which is stated on the customer detail rather
 * than here because this row has to stay readable at a glance. What is deliberately
 * NOT here is the pending figure: money the clock is still running on is not theirs
 * yet, and a headline that blurs the two is a headline that eventually disappoints.
 */
function MoneyRow({
  earned,
  paid,
  awaiting,
  companyName,
}: {
  earned: number;
  paid: number;
  awaiting: number;
  companyName: string;
}) {
  return (
    <Card className="p-4 lg:p-5">
      <p className="text-[13px] text-ink-soft">Earned by {companyName}</p>
      <p className="tnum mt-1 text-[34px] font-bold leading-none text-accent lg:text-[40px]">
        {gbp(earned)}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3">
        <p className="text-[13px] text-ink-soft">
          <span className="tnum font-semibold text-ink">{gbp(paid)}</span> paid
        </p>
        <p className="text-[13px] text-ink-soft">
          <span className="tnum font-semibold text-ink">{gbp(awaiting)}</span> in the next pay
          run
        </p>
        <Link
          to="customers?filter=earning"
          className="text-[13px] font-semibold text-accent hover:underline"
        >
          See who
        </Link>
      </div>
    </Card>
  );
}
