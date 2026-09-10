import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDemoStore } from '../store/DemoStore';
import { buildRows, earningsSummary, gbp } from '../selectors/customers';
import { needsYou } from '../selectors/views';
import { fleetHealth, journey, pct, sendProgress } from '../selectors/journey';
import { DropOuts, FleetStrip, Funnel } from '../components/Funnel';
import { SendSchedule } from '../components/SendSchedule';
import { Button, Callout, Card, Panel, ScreenTitle } from '../components/ui';

/**
 * The landing page, and the one screen a founder demo lives or dies on.
 *
 * IT ANSWERS "IS THIS WORKING?", NOT "WHAT SHOULD I DO?". The previous landing page
 * was an attention queue, which is the right screen for the tenth session and the
 * wrong one for the first: it opened on a list of chores, so the story it told was
 * "here is some admin" rather than "here is your back-book converting". The work
 * still matters, so it gets one line and a route through to it, and the screen leads
 * with the funnel and the money instead.
 *
 * NOTHING ON THIS PAGE IS A PROJECTION. Every figure counts something that has
 * already happened. A dashboard is exactly where a forecast would feel natural and
 * exactly where it would do the most damage. See the design spec's forbidden list.
 */
export function DashboardPage() {
  const { customers, asOf, company, personaName } = useDemoStore();

  const rows = useMemo(() => buildRows(customers, asOf), [customers, asOf]);
  const summary = useMemo(() => earningsSummary(rows), [rows]);
  const funnel = useMemo(() => journey(rows), [rows]);
  const fleet = useMemo(() => fleetHealth(rows), [rows]);
  const progress = useMemo(() => sendProgress(company), [company]);
  const attention = useMemo(() => needsYou(rows).length, [rows]);

  const approved = company.campaignEmail.approved;

  return (
    <>
      <ScreenTitle sub={`Run by Lumo for ${company.name}.`}>Dashboard</ScreenTitle>

      <div className="space-y-4 px-4 lg:px-0">
        {!approved ? (
          <Callout
            title="Nothing has been sent yet"
            body={`Your list is loaded and cleaned. We need you to approve the email once, and that covers all ${funnel.listSize} households.`}
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

        {/*
          FOUR PANELS IN A 2x2, NOT ONE PANEL BESIDE A STACK OF THREE.

          The stack was taller than the funnel by about the height of two panels, so the
          screen was visibly bottom-right weighted with a column of dead space under the
          drop-outs. Laying all four out in one grid balances the columns and, because
          grid fills across before down, the reading order stays the intended one:
          funnel, live customers, sending, waiting on you.

          `items-start` stops a short panel being stretched to its row-mate's height,
          which is what made the funnel look like a rendering fault in the first place.

          The panels are conditional, and that is fine here. When a persona has no live
          customers the later panels flow up into the gap rather than leaving a hole,
          which is the one thing a flat grid does better than nested columns.
        */}
        <div className="grid items-start gap-4 xl:grid-cols-[1.35fr_1fr]">
          <Panel
            title="Where your customers are"
            meta={
              approved && progress.openRate !== null
                ? `${pct(progress.openRate)} opened so far`
                : undefined
            }
          >
            <Funnel journey={funnel} />
            {funnel.dropOuts.length > 0 ? (
              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-2 text-[12px] font-semibold text-ink-soft">
                  Everyone else, and why
                </p>
                <DropOuts journey={funnel} />
              </div>
            ) : null}
          </Panel>

          {/* The monitoring proof. Once a household is live the Hub has something to
              watch, and this is the smallest honest demonstration of it: no energy
              data, because there is none, but real control health. */}
          {fleet.signedUp > 0 ? (
            <Panel title="Live customers" meta={`${fleet.signedUp} on Lumo`}>
              <FleetStrip fleet={fleet} />
              <div className="mt-4">
                <Link
                  to="monitoring"
                  className="text-[13px] font-semibold text-accent hover:underline"
                >
                  Monitor them
                </Link>
              </div>
            </Panel>
          ) : null}

          <Panel
            title="Sending"
            meta={
              progress.awaitingApproval
                ? `${company.dailySendCap} a day once approved`
                : progress.daysRemaining > 0
                  ? `${progress.scheduled.toLocaleString('en-GB')} still to go`
                  : 'All sent'
            }
          >
            {progress.total === 0 ? (
              <p className="text-[14px] text-ink-soft">
                Nothing to schedule yet. We build it when your list is loaded.
              </p>
            ) : (
              <>
                <SendSchedule company={company} progress={progress} compact />
                <p className="mt-3 text-[13px] text-ink-mute">
                  {progress.daysRemaining > 0
                    ? `${company.dailySendCap} a day, not all at once, so inbox providers keep trusting your list.`
                    : 'Your whole list has been emailed.'}{' '}
                  <Link to="campaign" className="font-semibold text-accent hover:underline">
                    Manage sending
                  </Link>
                </p>
              </>
            )}
          </Panel>

          {attention > 0 ? (
            <Panel title="Waiting on you" meta={`${attention} households`}>
              <p className="text-[14px] leading-snug text-ink-soft">
                A missing address, a bounce, a battery we cannot confirm, or someone who
                clicked and stopped. Everything else is running.
              </p>
              <div className="mt-3">
                <Link to="signups?view=attention">
                  <Button variant="secondary">See what needs you</Button>
                </Link>
              </div>
            </Panel>
          ) : null}
        </div>

        <p className="pb-2 text-[13px] text-ink-mute">
          Demo only, {personaName}. Every figure counts something that has already happened.
          Nothing is sent, stored or forecast.
        </p>
      </div>
    </>
  );
}

/**
 * The money, and who it belongs to.
 *
 * "Earned" is paid plus confirmed, and both are final: a household switching control
 * off later does not reverse a reward, which is stated on the customer detail rather
 * than here because this row has to stay readable at a glance. What is deliberately
 * NOT here is the pending figure. Money the clock is still running on is not theirs
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
    <Card className="overflow-hidden bg-gradient-to-br from-accent-soft to-surface p-4 lg:p-5">
      <p className="text-[13px] text-ink-soft">Earned by {companyName}</p>
      <p className="tnum mt-1 text-[34px] font-bold leading-none text-accent lg:text-[40px]">
        {gbp(earned)}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-accent/15 pt-3">
        <p className="text-[13px] text-ink-soft">
          <span className="tnum font-semibold text-ink">{gbp(paid)}</span> paid
        </p>
        <p className="text-[13px] text-ink-soft">
          <span className="tnum font-semibold text-ink">{gbp(awaiting)}</span> in the next pay
          run
        </p>
        <Link
          to="monitoring"
          className="text-[13px] font-semibold text-accent hover:underline"
        >
          See who
        </Link>
      </div>
    </Card>
  );
}
