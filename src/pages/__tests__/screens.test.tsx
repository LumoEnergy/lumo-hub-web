// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import type { PersonaId } from '../../fixtures';
import { loadPersona } from '../../fixtures';
import { buildRows } from '../../selectors/customers';
import { liveRows } from '../../selectors/views';
import { DemoStoreProvider } from '../../store/DemoStore';
import { DashboardPage } from '../DashboardPage';
import { SignupsPage } from '../SignupsPage';
import { MonitoringPage } from '../MonitoringPage';
import { SitePage } from '../SitePage';
import { CampaignPage } from '../CampaignPage';
import { SettingsPage } from '../SettingsPage';

afterEach(cleanup);

/**
 * `pattern` exists for the one screen that reads a route parameter. Everything else
 * mounts under a catch-all, and `useParams` returns nothing under a catch-all.
 */
const mount = (persona: PersonaId, element: ReactElement, route = '/', pattern = '*') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <DemoStoreProvider personaId={persona}>
        <Routes>
          <Route path={pattern} element={element} />
        </Routes>
      </DemoStoreProvider>
    </MemoryRouter>,
  );

const bodyText = () => document.body.textContent ?? '';

const ALL_PERSONAS = ['mid-campaign', 'awaiting-approval', 'messy-list'] as const;

/**
 * A forecast of the firm's earnings, in the phrases it would actually use.
 *
 * "per year" and "annually" are deliberately NOT here any more. The campaign email
 * now leads on the household's guaranteed grid reward, which is a per-year figure and
 * is a commitment rather than a prediction. See the money-honesty test in
 * `src/__tests__/copy.test.ts` for why that distinction is the rule and not a hole
 * in it.
 */
const FORECAST = /could earn|you could|projected|on track for|estimated earnings/i;

describe('the dashboard', () => {
  it('leads with the money and the funnel, not with a list of chores', () => {
    mount('mid-campaign', <DashboardPage />);
    const text = bodyText();
    expect(text).toMatch(/Earned by Northfield Renewables/);
    expect(text).toMatch(/Where your customers are/);
    // The queue that used to be the landing page is now one route through, not the
    // first thing anyone sees.
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows five journey stages, in order, narrowing', () => {
    // FIVE, NOT SIX. A Delivered stage sat between Emailed and Opened whose only
    // content was the bounce count, and a sixth bar earned less than the second it
    // cost to read. Bounces moved to the drop-out row underneath.
    mount('mid-campaign', <DashboardPage />);
    const panel = screen.getByRole('region', { name: 'Where your customers are' });
    const labels = within(panel)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '');
    expect(labels[0]).toMatch(/On your list/);
    expect(labels[1]).toMatch(/Emailed/);
    expect(labels[2]).toMatch(/Opened/);
    expect(labels[3]).toMatch(/Signed up/);
    expect(labels[4]).toMatch(/Earning/);
    expect(labels[2]).not.toMatch(/Delivered/);
  });

  it('carries no prose in the funnel, only a label, a count and a drop-off', () => {
    // Six explanatory sentences on a screen whose entire job is to be glanced at.
    mount('mid-campaign', <DashboardPage />);
    const panel = screen.getByRole('region', { name: 'Where your customers are' });
    const stages = within(panel).getAllByRole('listitem').slice(0, 5);
    for (const stage of stages) {
      // Label, number, percentage. Anything longer is a sentence.
      expect((stage.textContent ?? '').length, stage.textContent ?? '').toBeLessThan(36);
    }
  });

  it('accounts for everyone the funnel drops, so nobody looks lost', () => {
    // "808 on the list, 486 emailed" invites the worst assumption about the other
    // 322 unless the screen says where they went.
    mount('mid-campaign', <DashboardPage />);
    const text = bodyText();
    expect(text).toMatch(/Still to send/);
    expect(text).toMatch(/No address/);
    expect(text).toMatch(/Bounced/);
    expect(text).toMatch(/Opted out/);
  });

  it('proves the live fleet can be monitored, without inventing energy data', () => {
    // There is no state of charge and no savings figure in this prototype, so the
    // monitoring proof has to be built from what the platform genuinely knows.
    mount('mid-campaign', <DashboardPage />);
    const panel = screen.getByRole('region', { name: 'Live customers' });
    const text = panel.textContent ?? '';
    expect(text).toMatch(/Control running/);
    expect(text).toMatch(/Clock still running/);
    expect(text).toMatch(/Kit we are controlling/);
    expect(text).not.toMatch(/kWh saved|state of charge|savings/i);
  });

  it('says when the rest goes out and why it is throttled', () => {
    mount('mid-campaign', <DashboardPage />);
    const text = bodyText();
    expect(text).toMatch(/100 a day, not all at once/);
    expect(text).toMatch(/inbox providers keep trusting your list/i);
  });

  it('leads with the approval, and no money, before anything has sent', () => {
    mount('awaiting-approval', <DashboardPage />);
    const text = bodyText();
    expect(text).toMatch(/Nothing has been sent yet/i);
    expect(text).toMatch(/approve the email once/i);
    expect(text).not.toMatch(/Earned by/);
  });

  it('draws no bar for a stage at zero', () => {
    // The floor bar width keeps a small number readable. Applied to an empty stage
    // it drew a green block beside "Earning 0", which is the one thing a funnel must
    // never imply.
    mount('awaiting-approval', <DashboardPage />);
    const panel = screen.getByRole('region', { name: 'Where your customers are' });
    const widths = [...panel.querySelectorAll('[style*="width"]')].map(
      (el) => (el as HTMLElement).style.width,
    );
    // Only "On your list" has anyone in it, so exactly one bar may have width.
    expect(widths.filter((w) => w !== '0%')).toHaveLength(1);
    expect(panel.textContent).toMatch(/none yet/);
  });

  it('shows the schedule as a shape, not as dates, before sign-off', () => {
    // The dates are meaningless until approval starts the clock, and a date that
    // slips because someone took a day to read the email reads as a broken promise.
    mount('awaiting-approval', <DashboardPage />);
    const text = bodyText();
    expect(text).toMatch(/Day 1/);
    expect(text).toMatch(/after you approve/i);
  });

  it('never forecasts the firm\u2019s earnings, in any persona', () => {
    for (const persona of ALL_PERSONAS) {
      cleanup();
      mount(persona, <DashboardPage />);
      expect(bodyText(), persona).not.toMatch(FORECAST);
    }
  });
});

describe('the sign-ups screen', () => {
  it('leads with the company, never a person', () => {
    mount('mid-campaign', <SignupsPage />);
    expect(screen.getByRole('heading', { name: /Sign-ups/ })).toBeTruthy();
    expect(bodyText()).not.toMatch(/your link|personal link|QR/i);
  });

  it('offers three campaign views and no undifferentiated list', () => {
    // "All" was 808 rows of averaged book that opened on the 322 households nothing
    // had happened to yet. Invited is where the campaign actually is.
    //
    // There is no Active tab. Live households are an operations question, not a campaign
    // one, and they have their own screen.
    mount('mid-campaign', <SignupsPage />);
    const group = screen.getByRole('group', { name: 'Which customers' });
    const labels = within(group)
      .getAllByRole('button')
      .map((b) => b.textContent?.replace(/\d+$/, '').trim());
    expect(labels).toEqual(['Invited', 'Not yet contacted', 'Needs you']);
  });

  it('opens on Invited when no view is named', () => {
    mount('mid-campaign', <SignupsPage />);
    const pressed = screen
      .getAllByRole('button', { pressed: true })
      .map((b) => b.textContent?.replace(/\d+$/, '').trim());
    expect(pressed).toEqual(['Invited']);
  });

  it('gives each view its own columns rather than one table filtered', () => {
    const headers = () =>
      within(screen.getByRole('table'))
        .getAllByRole('columnheader')
        .map((h) => h.textContent?.trim().replace(/[\u2191\u2193\u2195]/g, ''));

    mount('mid-campaign', <SignupsPage />);
    expect(headers()).toEqual(['Household', 'Status', 'Emailed', 'Reward', 'Open']);

    cleanup();
    mount('mid-campaign', <SignupsPage />, '/?view=waiting');
    expect(headers()).toEqual(['Household', 'Status', 'Scheduled send', 'Open']);

    cleanup();
    mount('mid-campaign', <SignupsPage />, '/?view=attention');
    expect(headers()).toEqual(['Household', 'Status', 'Waiting', 'What to do', 'Open']);
  });

  it('falls back to Invited for the retired active view rather than rendering nothing', () => {
    // A link to `?view=active` may be in someone's history or a slide deck. It is not a
    // campaign view any more, so an unknown value has to degrade to the default rather
    // than render an empty table.
    mount('mid-campaign', <SignupsPage />, '/?view=active');
    const pressed = screen
      .getAllByRole('button', { pressed: true })
      .map((b) => b.textContent?.replace(/\d+$/, '').trim());
    expect(pressed).toEqual(['Invited']);
  });

  it('never drops a column at a narrow width', () => {
    // The first version hid the age column below 1280px, which took its heading with
    // it and read as a broken table rather than as a responsive one. Every column is
    // always present and the container scrolls instead.
    mount('mid-campaign', <SignupsPage />);
    const table = screen.getByRole('table');
    for (const cell of within(table).getAllByRole('columnheader')) {
      expect(cell.className, cell.textContent ?? '').not.toMatch(/hidden/);
    }
    expect(table.parentElement?.className).toMatch(/overflow-x-auto/);
  });

  it('states the campaign fact, never the internal matching jargon', () => {
    // "More than one possible match", "On Lumo, not credited to you" and "Interested,
    // not signed up" are all accurate and none of them is a thing anybody says.
    // Status is one thing now: where this household has got to. The match track still
    // decides what lands in Needs you, it just does not get a label in a cell.
    const banned = /possible match|not credited to you|Interested, not signed up/i;
    for (const view of ['all', 'invited', 'attention'] as const) {
      cleanup();
      mount('mid-campaign', <SignupsPage />, `/?view=${view}`);
      expect(screen.getByRole('table').textContent ?? '', view).not.toMatch(banned);
    }
  });

  it('uses the words an installer already owns for each stage', () => {
    mount('mid-campaign', <SignupsPage />, '/?view=invited');
    const text = screen.getByRole('table').textContent ?? '';
    expect(text).toMatch(/Email opened/);
    expect(text).toMatch(/Clicked through/);
  });

  it('has no owner column, because nobody knew what it meant', () => {
    mount('mid-campaign', <SignupsPage />);
    const table = screen.getByRole('table');
    expect(table.textContent).not.toMatch(/Whose/);
    expect(within(table).queryByText('The household')).toBeNull();
  });

  it('has no pinned money callout, because it shouted on every visit', () => {
    // "£100 of yours is going to nobody" was true and was the loudest thing on the
    // screen even when you came to look at something else. It is rows in Needs you
    // with an instruction beside them now.
    for (const view of ['all', 'invited', 'waiting'] as const) {
      cleanup();
      mount('mid-campaign', <SignupsPage />, `/?view=${view}`);
      expect(bodyText(), view).not.toMatch(/going to nobody/i);
    }
  });

  it('states the unmatched total once, in the view that asks for the fix', () => {
    // The one multiplied total the spec allows: those households are live, the 30 days
    // are served, and the money exists. It belongs where someone has come to act on it.
    mount('mid-campaign', <SignupsPage />, '/?view=attention');
    expect(bodyText()).toMatch(/£\d+ of it is already earned and going to nobody/);
  });

  it('tells the firm what to do on the only view that asks anything of them', () => {
    mount('mid-campaign', <SignupsPage />, '/?view=attention');
    const text = screen.getByRole('table').textContent ?? '';
    expect(text).toMatch(/Add an email address/);
    expect(text).toMatch(/Send us a newer one/);
    expect(text).toMatch(/Worth £50/);
  });

  it('gives every household still queued a real send date', () => {
    mount('mid-campaign', <SignupsPage />, '/?view=waiting');
    const text = screen.getByRole('table').textContent ?? '';
    expect(text).toMatch(/Not emailed yet/);
    expect(text).toMatch(/\d{1,2} [A-Z][a-z]{2}/);
  });

  it('keeps the kit and control health off the campaign screen entirely', () => {
    // These belong to Monitoring now. A battery column on a campaign row was empty for
    // every household that had not signed up, which was most of them.
    for (const view of ['invited', 'waiting', 'attention'] as const) {
      cleanup();
      mount('mid-campaign', <SignupsPage />, `/?view=${view}`);
      const headers = within(screen.getByRole('table'))
        .getAllByRole('columnheader')
        .map((h) => h.textContent?.trim());
      expect(headers, view).not.toContain('Battery');
      expect(headers, view).not.toContain('Inverter');
      expect(headers, view).not.toContain('Control');
    }
  });

  it('opens on the right view when the dashboard sends you there', () => {
    mount('mid-campaign', <SignupsPage />, '/?view=attention');
    const group = screen.getByRole('group', { name: 'Which customers' });
    const pressed = within(group)
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
    expect(pressed[0].textContent).toMatch(/Needs you/);
  });

  it('caps the rendered rows and says so rather than truncating quietly', () => {
    mount('mid-campaign', <SignupsPage />);
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    // 150 body rows plus the header.
    expect(rows.length).toBe(151);
    expect(bodyText()).toMatch(/Showing 150 of 4\d\d/);
  });

  it('does not repeat the one approval on all 118 rows', () => {
    // One sign-off releases the whole list, so it belongs on the dashboard and the
    // campaign screen, not stamped on every household as an individual task. What is
    // legitimately here is the rows only the firm can unblock.
    mount('awaiting-approval', <SignupsPage />, '/?view=attention');
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows.length).toBe(35);
    expect(bodyText()).not.toMatch(/Approve the email/);
  });

  it('never forecasts, in any persona', () => {
    for (const persona of ALL_PERSONAS) {
      cleanup();
      mount(persona, <SignupsPage />);
      expect(bodyText(), persona).not.toMatch(FORECAST);
    }
  });
});

describe('the monitoring screen', () => {
  it('lists live sites with their kit and whether Lumo is controlling them', () => {
    mount('mid-campaign', <MonitoringPage />);
    expect(screen.getByRole('heading', { name: /Monitoring/ })).toBeTruthy();
    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((h) => h.textContent?.trim().replace(/[\u2191\u2193\u2195]/g, ''));
    expect(headers).toEqual([
      'Household',
      'Control',
      'Battery',
      'Inverter',
      'Live for',
      'Reward',
      'Open',
    ]);
  });

  it('leads with control health, not with the battery size', () => {
    // Control is the only column anyone ever acts on. Putting kit ahead of it made the
    // reader scan past two columns of trivia to find the fact that decides whether they
    // pick up the phone.
    mount('mid-campaign', <MonitoringPage />);
    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((h) => h.textContent?.trim().replace(/[\u2191\u2193\u2195]/g, ''));
    expect(headers.indexOf('Control')).toBeLessThan(headers.indexOf('Battery'));
  });

  it('lists only live households, and every one of them', () => {
    mount('mid-campaign', <MonitoringPage />);
    const rows = within(screen.getByRole('table')).getAllByRole('row').length - 1;
    // The fleet roll-up and the table are the same cohort. Two numbers under one label
    // is two correct numbers and one broken screen.
    expect(bodyText()).toMatch(new RegExp(`${rows} on Lumo`));
  });

  it('carries no campaign columns, because the campaign is over for these households', () => {
    mount('mid-campaign', <MonitoringPage />);
    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((h) => h.textContent?.trim());
    expect(headers).not.toContain('Scheduled send');
    expect(headers).not.toContain('Emailed');
  });

  it('quotes no fleet-wide energy total, in any persona', () => {
    // A summed kWh across a fleet is not a number anyone decides with, and summing
    // generated data would be the first genuinely misleading figure in the build.
    for (const persona of ALL_PERSONAS) {
      cleanup();
      mount(persona, <MonitoringPage />);
      expect(bodyText(), persona).not.toMatch(/kWh (generated|used|total)/i);
      expect(bodyText(), persona).not.toMatch(FORECAST);
    }
  });

  it('says nobody is live rather than showing an empty table', () => {
    mount('awaiting-approval', <MonitoringPage />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(bodyText()).toMatch(/Nobody is live yet/);
  });
});

describe('the campaign screen', () => {
  it('is not called "your list", which read as a page about people', () => {
    mount('mid-campaign', <CampaignPage />);
    expect(screen.getByRole('heading', { name: 'Campaign' })).toBeTruthy();
  });

  it('reports what was loaded and held without explaining our de-duplication', () => {
    // The reason line said "thirty-two rows were exact duplicates of another row in
    // the same file, same name and same address", which is a sentence about our
    // matching rather than about their business. The count stays, the essay goes.
    mount('mid-campaign', <CampaignPage />);
    const text = bodyText();
    expect(text).toMatch(/You sent/);
    expect(text).toMatch(/We loaded/);
    expect(text).toMatch(/Need you/);
    expect(text).toMatch(/Duplicates/);
    expect(text).not.toMatch(/exact duplicates/i);
  });

  it('names the file and how it reached us, so the receipt is real', () => {
    mount('mid-campaign', <CampaignPage />);
    const text = bodyText();
    expect(text).toMatch(/commusoft-battery-jobs-2021-2026\.csv/);
    expect(text).toMatch(/Emailed to us by Ade Bankole/);
  });

  it('shows a file still being worked through, with no outcome figures invented', () => {
    // Loading a book is asynchronous. A screen that implies otherwise turns a normal
    // wait into a support ticket, and a fabricated count into a trusted fact.
    mount('mid-campaign', <CampaignPage />);
    const text = bodyText();
    expect(text).toMatch(/new-fits-jan-to-aug\.csv/);
    expect(text).toMatch(/Still processing/);
    expect(text).toMatch(/We will email Sean Docherty in a few hours/);

    // One honest number, the count they handed over. The other three used to render
    // as "not given", which put the same placeholder on screen three times and made a
    // normal wait look like a data fault.
    const record = screen.getByText(/new-fits-jan-to-aug\.csv/).closest('div')?.parentElement;
    expect(record?.textContent).not.toMatch(/We loaded|Duplicates/);
  });

  it('takes another list either way', () => {
    mount('mid-campaign', <CampaignPage />);
    expect(screen.getByRole('button', { name: /Add another list/ })).toBeTruthy();
    expect(bodyText()).toMatch(/partners@lumo\.energy/);
  });

  it('breaks the send into days and lets them change the rate', () => {
    mount('mid-campaign', <CampaignPage />);
    const panel = screen.getByRole('region', { name: 'When it goes out' });
    const text = panel.textContent ?? '';
    expect(text).toMatch(/100 households/);
    expect(text).toMatch(/opened/);
    expect(within(panel).getByLabelText('Emails a day')).toBeTruthy();
    expect(within(panel).getByRole('button', { name: /Update schedule/ })).toBeTruthy();
  });

  it('explains the throttle as deliverability, not as a queue we happen to have', () => {
    mount('mid-campaign', <CampaignPage />);
    expect(bodyText()).toMatch(/treating the rest of your list as spam/i);
  });

  it('leads the email on the guaranteed grid reward', () => {
    // A REVERSAL. The email carried no figure at all, on the grounds that nothing in
    // the estate could substantiate a per-household saving. That still holds for
    // savings; the grid reward is a commitment Lumo makes rather than an outcome it
    // predicts, so it can be stated as a fact and it is the strongest thing we have.
    mount('mid-campaign', <CampaignPage />);
    const text = bodyText();
    expect(text).toMatch(/guaranteed £150 per year for helping the grid/i);
    expect(text).toMatch(/Get Lumo now/);
    expect(text).not.toMatch(/save you £|estimated saving/i);
  });

  it('shows the email exactly as it arrives, sent as the firm', () => {
    mount('mid-campaign', <CampaignPage />);
    const text = bodyText();
    expect(text).toMatch(/Northfield Renewables/);
    expect(text).toMatch(/hello@northfieldrenewables\.co\.uk/);
    expect(text).toMatch(/on behalf of Northfield Renewables/i);
  });

  it('lets the firm rewrite it, because they know their customers and we do not', () => {
    mount('mid-campaign', <CampaignPage />);
    fireEvent.click(screen.getByRole('button', { name: /Edit the email/ }));
    const dialog = screen.getByRole('dialog', { name: /Edit the email/ });
    const subject = within(dialog).getByLabelText('Subject') as HTMLInputElement;
    expect(subject.value).toMatch(/guaranteed £150/);

    fireEvent.change(subject, { target: { value: 'A word from Northfield' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Save the email/ }));
    expect(bodyText()).toMatch(/A word from Northfield/);
  });

  it('keeps the unsubscribe and the disclosure out of the editor', () => {
    // They are what makes the send lawful, so they are not ours to let anyone delete.
    mount('mid-campaign', <CampaignPage />);
    fireEvent.click(screen.getByRole('button', { name: /Edit the email/ }));
    const dialog = screen.getByRole('dialog', { name: /Edit the email/ });
    expect(dialog.textContent).toMatch(/keeps the send legal/i);
    expect(within(dialog).queryByLabelText(/unsubscribe/i)).toBeNull();
  });

  it('is honest about the via note on the domain it actually sends from', () => {
    // Northfield is on the shared rung, so the customer sees "via
    // send.lumopartners.co.uk". Hiding that would demo a configuration nobody has.
    mount('mid-campaign', <CampaignPage />);
    expect(bodyText()).toMatch(/via send\.lumopartners\.co\.uk/);
  });

  it('offers exactly two sender options, with the cost of each on the card', () => {
    mount('mid-campaign', <CampaignPage />);
    const panel = screen.getByRole('region', { name: 'Email campaign setup' });
    const text = panel.textContent ?? '';
    expect(text).toMatch(/Send from Lumo's domain/);
    expect(text).toMatch(/Nothing to set up/);
    expect(text).toMatch(/Send from your own domain/);
    expect(text).toMatch(/Requires DNS setup/);
    expect(text).toMatch(/not us pretending to be you/i);
    // The third card, a permanently expanded wall of DNS, is gone.
    expect(text).not.toMatch(/What the DNS change involves/);
  });

  it('keeps the DNS detail behind the card until it is asked for', () => {
    mount('mid-campaign', <CampaignPage />);
    expect(bodyText()).not.toMatch(/v=spf1/);

    fireEvent.click(screen.getByRole('button', { name: /Send from your own domain/ }));
    const dialog = screen.getByRole('dialog', { name: /Send from your own domain/ });
    const text = dialog.textContent ?? '';
    expect(text).toMatch(/CNAME/);
    expect(text).toMatch(/v=spf1 include:lumopartners\.co\.uk/);
    expect(text).toMatch(/Your main domain is untouched/i);
    // Most installers will not do this themselves, and pretending otherwise is how
    // the upgrade path stays theoretical.
    expect(within(dialog).getByRole('button', { name: /Book a call/ })).toBeTruthy();
  });

  it('records who confirmed permission and when', () => {
    mount('mid-campaign', <CampaignPage />);
    expect(bodyText()).toMatch(/Confirmed by Ade Bankole/);
  });

  it('frames the company link as content for a channel they already own', () => {
    mount('mid-campaign', <CampaignPage />);
    const text = bodyText();
    expect(text).toMatch(/newsletter or a Facebook group/i);
    expect(text).toMatch(/lumo\.energy\/j\/northfield/);
  });

  it('puts the paste grid first, and asks for no kit detail', () => {
    mount('mid-campaign', <CampaignPage />);
    expect(screen.getByLabelText('Name, row 1')).toBeTruthy();
    expect(screen.getByLabelText('Email, row 1')).toBeTruthy();
    expect(screen.getByLabelText('Postcode, row 1')).toBeTruthy();
    const form = screen.getByLabelText('Name, row 1').closest('section');
    expect(form?.textContent).not.toMatch(/inverter|battery/i);
  });

  it('leads with the approval when it is outstanding', () => {
    mount('awaiting-approval', <CampaignPage />);
    const text = bodyText();
    expect(text).toMatch(/Read it, change anything, approve once/i);
    expect(text).toMatch(/Approve and send to 118/);
    expect(text).toMatch(/Starts the day after you approve/);
  });

  it('never asks the firm to report work they did themselves', () => {
    for (const persona of ALL_PERSONAS) {
      cleanup();
      mount(persona, <CampaignPage />);
      expect(bodyText(), persona).not.toMatch(
        /mark as sent|I(?:'| have)?ve sent|confirm you sent/i,
      );
    }
  });
});

describe('account settings', () => {
  it('shows who is on the account and what each of them can do', () => {
    // The Hub is a company account, and this is the screen that makes that claim
    // credible. Without it, "you" is indistinguishable from a personal login.
    mount('mid-campaign', <SettingsPage />);
    const panel = screen.getByRole('region', { name: 'Your team' });
    const text = panel.textContent ?? '';
    expect(text).toMatch(/Ade Bankole/);
    expect(text).toMatch(/Admin/);
    expect(text).toMatch(/Viewer/);
  });

  it('shows an unaccepted invite, which is the question people arrive with', () => {
    mount('mid-campaign', <SettingsPage />);
    expect(screen.getByRole('region', { name: 'Your team' }).textContent).toMatch(
      /Invite sent/,
    );
  });

  it('adds a colleague at the role you picked', () => {
    mount('mid-campaign', <SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Add someone/ }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tom Reilly' } });
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'tom@northfieldrenewables.co.uk' },
    });
    fireEvent.click(screen.getByLabelText(/Admin/));
    fireEvent.click(screen.getByRole('button', { name: /Send invite/ }));

    const panel = screen.getByRole('region', { name: 'Your team' });
    expect(panel.textContent).toMatch(/Tom Reilly/);
    expect(panel.textContent).toMatch(/5 people/);
  });

  it('will not let you remove yourself and lock the firm out', () => {
    mount('mid-campaign', <SettingsPage />);
    const rows = within(screen.getByRole('region', { name: 'Your team' })).getAllByRole(
      'listitem',
    );
    const me = rows.find((row) => (row.textContent ?? '').includes('Ade Bankole'))!;
    expect(within(me).queryByRole('button', { name: 'Remove' })).toBeNull();
  });

  it('does not ask for bank details on a prototype', () => {
    mount('mid-campaign', <SettingsPage />);
    expect(bodyText()).not.toMatch(/sort code|account number|IBAN/i);
    expect(bodyText()).toMatch(/Bank details are set up with us once/);
  });
});

describe('the site detail screen', () => {
  const site = (persona: PersonaId = 'mid-campaign') => {
    const { customers, asOf } = loadPersona(persona);
    const live = liveRows(buildRows(customers, asOf));
    return live[0].customer.id;
  };

  it('shows the kit, the tariff and what Lumo is doing', () => {
    mount('mid-campaign', <SitePage />, `/${site()}`, '/:siteId');
    expect(bodyText()).toMatch(/Inverter/);
    expect(bodyText()).toMatch(/Battery/);
    expect(bodyText()).toMatch(/Buying from/);
    expect(bodyText()).toMatch(/Lumo control/);
  });

  it('draws three charts and names each one for a screen reader', () => {
    // A canvas is opaque without a label, and three unlabelled canvases are three
    // invisible elements.
    mount('mid-campaign', <SitePage />, `/${site()}`, '/:siteId');
    const labels = screen.getAllByRole('img').map((c) => c.getAttribute('aria-label'));
    expect(labels).toHaveLength(3);
    for (const label of labels) expect(label).toBeTruthy();
  });

  it('offers a day, three days and a week, and stops there', () => {
    // Seven days is Firestore's half-hourly retention, not a product choice. A month
    // option would be a control that cannot be honoured.
    mount('mid-campaign', <SitePage />, `/${site()}`, '/:siteId');
    const group = screen.getByRole('group', { name: 'How much history' });
    const labels = within(group)
      .getAllByRole('button')
      .map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Day', '3 days', 'Week']);
    expect(bodyText()).toMatch(/kept for a week/);
  });

  it('says the readings are generated rather than letting them pass as real', () => {
    mount('mid-campaign', <SitePage />, `/${site()}`, '/:siteId');
    expect(bodyText()).toMatch(/generated to show the shape of the data/);
  });

  it('quotes no savings and no bill, because neither is the installer to quote', () => {
    mount('mid-campaign', <SitePage />, `/${site()}`, '/:siteId');
    expect(bodyText()).not.toMatch(/savings|bill|net cost/i);
    expect(bodyText()).not.toMatch(FORECAST);
  });

  it('sends you back to the fleet for a household that is not live', () => {
    mount('mid-campaign', <SitePage />, '/not-a-real-site', '/:siteId');
    expect(screen.queryByRole('img')).toBeNull();
    expect(bodyText()).toMatch(/No live site here/);
    expect(screen.getByRole('link', { name: /Back to your fleet/ })).toBeTruthy();
  });
});
