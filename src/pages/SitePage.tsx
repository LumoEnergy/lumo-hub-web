import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDemoStore } from '../store/DemoStore';
import { buildRows } from '../selectors/customers';
import { liveRows } from '../selectors/views';
import { controlStatus, statusClass } from '../selectors/status';
import { displayName, siteFacts } from '../fixtures';
import type { HubSiteFacts } from '../fixtures';
import { WINDOWS, DEFAULT_WINDOW, siteSeries } from '../fixtures/telemetry';
import type { WindowId } from '../fixtures/telemetry';
import { SiteCharts } from '../components/SiteCharts';
import { Button, EmptyState, Missing, Panel, SegmentedToggle } from '../components/ui';

/**
 * One live site: what the kit is, whether Lumo is controlling it, and what it did.
 *
 * WHY THIS IS A PAGE AND NOT A SHEET. The kit card plus three charts is roughly 900px
 * of content. In the side sheet the charts would be about 420px wide, which is narrower
 * than a day of half-hourly bars needs to stay legible, and the sheet is already the
 * pattern for "the one thing this household needs from you". A monitoring readout is
 * something you sit and read, so it gets a URL, which also means it can be sent to a
 * colleague or opened next to the ops console.
 *
 * NOT REACHABLE FOR A HOUSEHOLD THAT IS NOT LIVE. There is no telemetry before a
 * battery is linked, and a page of empty charts would say "broken" rather than "not
 * started". Anything else lands on a route back to the fleet.
 */
export function SitePage() {
  const { siteId } = useParams();
  const { customers, asOf } = useDemoStore();
  const [window, setWindow] = useState<WindowId>(DEFAULT_WINDOW);

  const rows = useMemo(() => buildRows(customers, asOf), [customers, asOf]);
  const row = useMemo(
    () => liveRows(rows).find((r) => r.customer.id === siteId) ?? null,
    [rows, siteId],
  );

  const days = WINDOWS.find((w) => w.id === window)!.days;

  // The one activation state that means Lumo is actually driving the battery. Every
  // other state is a household on the platform whose battery Lumo cannot currently
  // reach, which is a different thing and has to look different.
  const controlled = row?.customer.activation === 'Smart Control Active';

  const facts = useMemo(() => (row ? siteFacts(row.customer, controlled) : null), [row, controlled]);

  const series = useMemo(
    () =>
      row
        ? siteSeries(row.customer.id, row.customer.batterySizeKwh, asOf, days, controlled)
        : [],
    [row, asOf, days, controlled],
  );

  if (!row || !facts) {
    return (
      <div className="mt-3">
        <EmptyState
          title="No live site here"
          body="This household is not on Lumo yet, so there is nothing to monitor. Live sites are on the Monitoring screen."
          action={
            <Link to="/monitoring">
              <Button variant="secondary">Back to your fleet</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const control = controlStatus(row);

  return (
    <div className="space-y-4 px-4 lg:px-0">
      <div>
        <Link
          to="/monitoring"
          className="text-[13px] font-semibold text-accent hover:underline"
        >
          &lsaquo; All sites
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[26px] font-bold leading-tight text-ink lg:text-[30px]">
            {displayName(row.customer)}
          </h1>
          <span
            className={[
              'rounded-chip px-2 py-0.5 text-[12px] font-semibold',
              statusClass(control.tone),
            ].join(' ')}
          >
            {control.label}
          </span>
        </div>
        <p className="mt-1 text-[14px] text-ink-soft">
          {row.customer.postcode ? `${row.customer.postcode}, ` : ''}live for{' '}
          {row.resolved.ageDays} days.
        </p>
      </div>

      <SiteDetails facts={facts} />

      <div>
        <SegmentedToggle<WindowId>
          label="How much history"
          value={window}
          onChange={setWindow}
          options={WINDOWS.map((w) => ({ value: w.id, label: w.label }))}
        />
        {/* The cap is a real retention limit, not a product choice, and saying so stops
            the obvious next question being asked on a sales call. */}
        <p className="mt-2 text-[12px] text-ink-mute">
          Half-hourly readings are kept for a week. Older periods are held as daily
          totals.
        </p>
      </div>

      <SiteCharts rows={series} days={days} />

      <p className="pb-2 text-[13px] text-ink-mute">
        Demo only. These readings are generated to show the shape of the data, not
        measured from a real home.
      </p>
    </div>
  );
}

/**
 * The kit card.
 *
 * The field list is the one the ops console already shrank for a presentation audience
 * rather than its full engineering panel: no coordinates, no capability probe history,
 * no Enode device ids. What is here is what an installer would ask about a job they
 * fitted.
 *
 * THE CAPACITY SOURCE IS SHOWN, and it is the one field that looks like clutter and is
 * not. The household's grid reward is banded by battery size, so a capacity that was
 * estimated rather than read off the device is a number an installer may want to
 * challenge, and hiding how it was arrived at is how that becomes a complaint later.
 */
function SiteDetails({ facts }: { facts: HubSiteFacts }) {
  const source: Record<HubSiteFacts['batterySource'], string> = {
    enode: 'read from the battery',
    estimate: 'estimated',
    manual: 'entered by hand',
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Kit">
        <dl className="space-y-2.5">
          <Row label="Inverter">
            {facts.inverterMake ? (
              <>
                {facts.inverterMake}
                {facts.inverterModel ? (
                  <span className="text-ink-soft"> {facts.inverterModel}</span>
                ) : null}
              </>
            ) : (
              <Missing />
            )}
          </Row>
          <Row label="Battery">
            {facts.batteryCapacityKwh === null ? (
              <Missing />
            ) : (
              <>
                <span className="tnum">{facts.batteryCapacityKwh} kWh</span>
                <span className="text-[12px] text-ink-mute">
                  {' '}
                  {source[facts.batterySource]}
                </span>
              </>
            )}
          </Row>
          <Row label="Solar, yearly estimate">
            {facts.solarAnnualGenerationKwh === null ? (
              <Missing />
            ) : (
              <span className="tnum">
                {facts.solarAnnualGenerationKwh.toLocaleString('en-GB')} kWh
              </span>
            )}
          </Row>
        </dl>
      </Panel>

      <Panel title="Tariff">
        <dl className="space-y-2.5">
          <Row label="Buying from">
            {facts.importSupplier ?? <Missing />}
            {facts.importTariffName ? (
              <span className="block text-[13px] text-ink-soft">{facts.importTariffName}</span>
            ) : null}
          </Row>
          <Row label="Selling to">
            {facts.exportSupplier ?? <Missing label="no export deal" />}
          </Row>
          <Row label="Export rate">
            {facts.exportRateIncVat === null ? (
              <Missing label="none" />
            ) : (
              <span className="tnum">{facts.exportRateIncVat}p per kWh</span>
            )}
          </Row>
        </dl>
      </Panel>

      <Panel title="Lumo control">
        <dl className="space-y-2.5">
          <Row label="Status">
            {facts.controlOn ? (
              <span className="font-semibold text-accent">Running</span>
            ) : (
              <span className="font-semibold text-ink-soft">Not running</span>
            )}
          </Row>
          <Row label="Doing what">{facts.controlMode ?? <Missing label="nothing yet" />}</Row>
          <Row label="Battery linked">
            {facts.linkedSince ? longDate(facts.linkedSince) : <Missing />}
          </Row>
        </dl>
      </Panel>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-mute">{label}</dt>
      <dd className="text-[15px] font-semibold text-ink">{children}</dd>
    </div>
  );
}

const longDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

