// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import type { PersonaId } from '../../fixtures';
import { DemoStoreProvider } from '../../store/DemoStore';
import { DashboardPage } from '../DashboardPage';
import { CustomersPage } from '../CustomersPage';
import { CampaignPage } from '../CampaignPage';

afterEach(cleanup);

const mount = (persona: PersonaId, element: ReactElement, route = '/') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <DemoStoreProvider personaId={persona}>
        <Routes>
          <Route path="*" element={element} />
        </Routes>
      </DemoStoreProvider>
    </MemoryRouter>,
  );

const bodyText = () => document.body.textContent ?? '';

const ALL_PERSONAS = ['mid-campaign', 'awaiting-approval', 'messy-list'] as const;

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

  it('shows every journey stage, in order, narrowing', () => {
    mount('mid-campaign', <DashboardPage />);
    const panel = screen.getByRole('region', { name: 'Where your customers are' });
    const labels = within(panel)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '');
    expect(labels[0]).toMatch(/On your list/);
    expect(labels[1]).toMatch(/Emailed/);
    expect(labels[2]).toMatch(/Delivered/);
    expect(labels[3]).toMatch(/Opened/);
    expect(labels[4]).toMatch(/Signed up/);
    expect(labels[5]).toMatch(/Earning/);
  });

  it('accounts for everyone the funnel drops, so nobody looks lost', () => {
    // "808 on the list, 486 emailed" invites the worst assumption about the other
    // 322 unless the screen says where they went.
    mount('mid-campaign', <DashboardPage />);
    const text = bodyText();
    expect(text).toMatch(/Queued to send/);
    expect(text).toMatch(/No usable address/);
    expect(text).toMatch(/Stopped chasing/);
  });

  it('says when the rest goes out and why it is throttled', () => {
    mount('mid-campaign', <DashboardPage />);
    const text = bodyText();
    expect(text).toMatch(/100 a day rather than all at once/);
    expect(text).toMatch(/inbox providers keep trusting your list/i);
  });

  it('leads with the approval, and no money, before anything has sent', () => {
    mount('awaiting-approval', <DashboardPage />);
    const text = bodyText();
    expect(text).toMatch(/Nothing has been sent yet/i);
    expect(text).toMatch(/only sign-off/i);
    expect(text).not.toMatch(/Earned by/);
  });

  it('draws no bar and quotes no recoverable money for a stage at zero', () => {
    // The floor bar width keeps a small number readable. Applied to an empty stage
    // it drew a green bar beside "Earning 0", and the delivered note read "0
    // bounced, each one is a recoverable £50".
    mount('awaiting-approval', <DashboardPage />);
    const panel = screen.getByRole('region', { name: 'Where your customers are' });
    expect(panel.textContent).not.toMatch(/0 bounced/);
    expect(panel.textContent).toMatch(/Nothing has gone out yet/);
    const filled = panel.querySelectorAll('[style*="width"]');
    const widths = [...filled].map((el) => (el as HTMLElement).style.width);
    // Only "On your list" has anyone in it, so exactly one bar may have width.
    expect(widths.filter((w) => w !== '0%')).toHaveLength(1);
  });

  it('shows the schedule as a shape, not as dates, before sign-off', () => {
    // The dates are meaningless until approval starts the clock, and a date that
    // slips because someone took a day to read the email reads as a broken promise.
    mount('awaiting-approval', <DashboardPage />);
    const text = bodyText();
    expect(text).toMatch(/Day 1/);
    expect(text).toMatch(/after you approve/i);
  });

  it('never shows a forecast, in any persona', () => {
    // A dashboard is exactly where "at this rate you would earn" feels natural and
    // exactly where it does the most damage.
    for (const persona of ALL_PERSONAS) {
      cleanup();
      mount(persona, <DashboardPage />);
      expect(bodyText(), persona).not.toMatch(
        /could earn|you could|projected|per year|annually|estimate|on track for/i,
      );
    }
  });
});

describe('the customers screen', () => {
  it('leads with the company, never a person', () => {
    mount('mid-campaign', <CustomersPage />);
    expect(screen.getByRole('heading', { name: /Customers/ })).toBeTruthy();
    expect(bodyText()).not.toMatch(/your link|personal link|QR/i);
  });

  it('is one list, with the money as a column', () => {
    // There used to be two screens both listing the same households, one for
    // progress and one for money, and the reader had to reconcile them.
    mount('mid-campaign', <CustomersPage />);
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent?.trim().replace(/[↑↓↕]/g, ''))).toEqual([
      'Household',
      'Status',
      'Waiting',
      'Reward',
      'Open',
    ]);
  });

  it('has no owner column, because nobody knew what it meant', () => {
    // It read "Whose" and showed "You" / "The household" / "Lumo" — a concept from
    // the state model rather than a fact about the customer. Ownership still drives
    // the attention filter and the detail panel; it is not a thing to read in a row.
    mount('mid-campaign', <CustomersPage />);
    const table = screen.getByRole('table');
    expect(table.textContent).not.toMatch(/Whose/);
    expect(within(table).queryByText('The household')).toBeNull();
  });

  it('offers the four filters a firm actually arrives with', () => {
    mount('mid-campaign', <CustomersPage />);
    const group = screen.getByRole('group', { name: 'Filter customers' });
    const labels = within(group)
      .getAllByRole('button')
      .map((b) => b.textContent?.replace(/\d+$/, '').trim());
    expect(labels).toEqual(['All', 'Needs you', 'Earning', 'Not emailed yet']);
  });

  it('opens on the attention filter when the dashboard sends you there', () => {
    mount('mid-campaign', <CustomersPage />, '/?filter=attention');
    const group = screen.getByRole('group', { name: 'Filter customers' });
    const pressed = within(group)
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
    expect(pressed[0].textContent).toMatch(/Needs you/);
  });

  it('surfaces the uncredited household above everything else', () => {
    mount('mid-campaign', <CustomersPage />);
    expect(bodyText()).toMatch(/going to nobody/i);
  });

  it('caps the rendered rows and says so rather than truncating quietly', () => {
    mount('mid-campaign', <CustomersPage />);
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    // 150 body rows plus the header.
    expect(rows.length).toBe(151);
    expect(bodyText()).toMatch(/Showing 150 of 8\d\d/);
  });

  it('does not repeat the one approval on all 118 rows', () => {
    // One sign-off releases the whole list, so it belongs on the dashboard and the
    // campaign screen, not stamped on every household as an individual task. What
    // is legitimately here is the 34 rows only the firm can unblock — a missing
    // address is genuinely per-household work.
    mount('awaiting-approval', <CustomersPage />, '/?filter=attention');
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows.length).toBe(35);
    expect(bodyText()).not.toMatch(/Approve the email/);
  });

  it('never shows a forecast, in any persona', () => {
    for (const persona of ALL_PERSONAS) {
      cleanup();
      mount(persona, <CustomersPage />);
      expect(bodyText(), persona).not.toMatch(
        /could earn|you could|projected|per year|annually|estimate/i,
      );
    }
  });
});

describe('the campaign screen', () => {
  it('is not called "your list", which read as a page about people', () => {
    mount('mid-campaign', <CampaignPage />);
    expect(screen.getByRole('heading', { name: 'Campaign' })).toBeTruthy();
  });

  it('reports what was loaded, held and rejected, with the reason', () => {
    mount('mid-campaign', <CampaignPage />);
    const text = bodyText();
    expect(text).toMatch(/You sent/);
    expect(text).toMatch(/We loaded/);
    expect(text).toMatch(/Held back/);
    expect(text).toMatch(/Could not use/);
    expect(text).toMatch(/exact duplicates/i);
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
    expect(text).toMatch(/We will email Sean Docherty when it is done/);
  });

  it('takes another list either way, and does not ask them to tidy it', () => {
    mount('mid-campaign', <CampaignPage />);
    const text = bodyText();
    expect(screen.getByRole('button', { name: /Add another list/ })).toBeTruthy();
    expect(text).toMatch(/partners@lumo\.energy/);
    expect(text).toMatch(/columns in any order, nobody needs to tidy it/i);
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
    expect(bodyText()).toMatch(/treat the rest of your list as spam/i);
  });

  it('shows the email exactly as it arrives, sent as the firm', () => {
    mount('mid-campaign', <CampaignPage />);
    const text = bodyText();
    expect(text).toMatch(/Northfield Renewables/);
    expect(text).toMatch(/hello@northfieldrenewables\.co\.uk/);
    expect(text).toMatch(/on behalf of Northfield Renewables/i);
  });

  it('is honest about the via note on the domain it actually sends from', () => {
    // Northfield is on the shared rung, so the customer sees "via
    // send.lumopartners.co.uk". Hiding that would demo a configuration nobody has.
    mount('mid-campaign', <CampaignPage />);
    expect(bodyText()).toMatch(/via send\.lumopartners\.co\.uk/);
  });

  it('offers the sender ladder as a question rather than a recommendation', () => {
    mount('mid-campaign', <CampaignPage />);
    const text = bodyText();
    expect(text).toMatch(/Send from Lumo's domain/);
    expect(text).toMatch(/Send from your own domain/);
    expect(text).toMatch(/Two DNS records/);
    expect(text).toMatch(/not us pretending to be you/i);
  });

  it('keeps the DNS detail collapsed until asked for', () => {
    mount('mid-campaign', <CampaignPage />);
    const toggle = screen.getByRole('button', { name: /What the DNS change involves/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(bodyText()).not.toMatch(/v=spf1/);
  });

  it('gives the real records, and says the main domain is untouched', () => {
    mount('mid-campaign', <CampaignPage />);
    fireEvent.click(screen.getByRole('button', { name: /What the DNS change involves/ }));
    const text = bodyText();
    expect(text).toMatch(/CNAME/);
    expect(text).toMatch(/v=spf1 include:lumopartners\.co\.uk/);
    expect(text).toMatch(/Your main domain is not touched/i);
  });

  it('records who confirmed permission and when', () => {
    mount('mid-campaign', <CampaignPage />);
    expect(bodyText()).toMatch(/Confirmed by Ade Bankole/);
  });

  it('frames the company link as newsletter content, not as a way to add someone', () => {
    mount('mid-campaign', <CampaignPage />);
    const text = bodyText();
    expect(text).toMatch(/not a way to add someone/i);
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
    expect(text).toMatch(/Read it, then approve it once/i);
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
