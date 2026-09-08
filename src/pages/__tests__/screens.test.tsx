// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import type { PersonaId } from '../../fixtures';
import { DemoStoreProvider } from '../../store/DemoStore';
import { CustomersPage } from '../CustomersPage';
import { EarningsPage } from '../EarningsPage';
import { YourListPage } from '../YourListPage';

afterEach(cleanup);

const mount = (persona: PersonaId, element: ReactElement) =>
  render(
    <MemoryRouter>
      <DemoStoreProvider personaId={persona}>
        <Routes>
          <Route path="*" element={element} />
        </Routes>
      </DemoStoreProvider>
    </MemoryRouter>,
  );

const bodyText = () => document.body.textContent ?? '';

describe('the customers screen', () => {
  it('leads with the company, never a person', () => {
    mount('mid-campaign', <CustomersPage />);
    expect(screen.getByRole('heading', { name: /Your customers/ })).toBeTruthy();
    // The seat holder's name may appear as "supplied by" data, but the money and the
    // account belong to the firm. Nothing may offer a personal link or QR.
    expect(bodyText()).not.toMatch(/your link|personal link|QR/i);
  });

  it('aggregates the missing addresses and prices them per household', () => {
    mount('mid-campaign', <CustomersPage />);
    const text = bodyText();
    expect(text).toMatch(/missing an email address/i);
    // The rate, which is true. Not 28 x £50, which assumes every one converts.
    expect(text).toMatch(/each one that signs up and stays connected for 30 days is £50/i);
    expect(text).not.toMatch(/£1,400/);
  });

  it('states the silent majority once rather than as a hundred rows', () => {
    mount('mid-campaign', <CustomersPage />);
    // Under "Needs you" it is absent entirely; the cohort note only appears on All.
    expect(bodyText()).not.toMatch(/never opened/i);
  });

  it('surfaces the uncredited household above everything else', () => {
    mount('mid-campaign', <CustomersPage />);
    expect(bodyText()).toMatch(/going to nobody/i);
  });

  it('renders a real sortable table for desktop', () => {
    mount('mid-campaign', <CustomersPage />);
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent?.trim().replace(/[↑↓↕]/g, ''))).toEqual([
      'Household',
      'Status',
      'Whose',
      'Age',
      'Reward',
      'Open',
    ]);
    // The default order is not a column, so no header can claim it. Saying so beats
    // an unexplained order or a fake aria-sort on Household.
    expect(headers.every((h) => h.getAttribute('aria-sort') !== 'descending')).toBe(true);
    expect(bodyText()).toMatch(/Sorted by what needs you first/i);
  });

  it('asks for the one approval when nothing has been sent', () => {
    mount('awaiting-approval', <CustomersPage />);
    const text = bodyText();
    expect(text).toMatch(/Nothing has been sent yet/i);
    expect(text).toMatch(/only sign-off/i);
    // No earnings figure before a send. The per-household rate in the data-quality
    // copy is fine; a total on this screen would be a projection.
    expect(text).not.toMatch(/Yours so far/);
  });

  it('does not repeat the one approval on all 118 rows', () => {
    // The failure mode this whole screen exists to avoid. One sign-off releases the
    // list, so it belongs in the callout, not stamped on every household — which
    // leaves the per-row queue genuinely empty until someone approves.
    mount('awaiting-approval', <CustomersPage />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(bodyText()).toMatch(/Nothing else needs you one at a time/i);
    expect(bodyText()).not.toMatch(/Approve the email/);
  });

  it('does not put the same label on two different numbers', () => {
    // The strip counts the funnel; the toggle counts the queue. When the strip said
    // "Need you 75" directly above a "Needs you 21" toggle, both were correct and
    // the screen was still wrong.
    mount('mid-campaign', <CustomersPage />);
    expect(bodyText()).not.toMatch(/Need you/);
    expect(bodyText()).toMatch(/Signed up/);
  });

  it('does not claim nothing needs you while callouts say otherwise', () => {
    mount('awaiting-approval', <CustomersPage />);
    const text = bodyText();
    expect(text).toMatch(/missing an email address/i);
    expect(text).toMatch(/Nothing else needs you one at a time/i);
    expect(text).not.toMatch(/Nothing needs you\b/);
  });

  it('never shows a forecast, in any persona', () => {
    for (const persona of ['mid-campaign', 'awaiting-approval', 'messy-list'] as const) {
      cleanup();
      mount(persona, <CustomersPage />);
      expect(bodyText(), persona).not.toMatch(
        /could earn|you could|projected|per year|annually|estimate/i,
      );
    }
  });
});

describe('the earnings screen', () => {
  it('states who gets paid, and it is the firm', () => {
    mount('mid-campaign', <EarningsPage />);
    expect(bodyText()).toMatch(/Paid to Northfield Renewables/);
  });

  it('spells out the clawback rule where control has since dropped', () => {
    mount('mid-campaign', <EarningsPage />);
    expect(bodyText()).toMatch(/not reversed/i);
  });

  it('leaves the un-signed-up hundreds off the money screen', () => {
    // Every non-responder is technically "not earning". Listing them would bury the
    // twenty that are, and there is nothing to do about them here.
    mount('mid-campaign', <EarningsPage />);
    expect(bodyText()).not.toMatch(/No response/);
  });

  it('shows nothing and promises nothing before a send', () => {
    mount('awaiting-approval', <EarningsPage />);
    const text = bodyText();
    expect(text).toMatch(/Nothing yet, and no guesses/i);
    expect(text).not.toMatch(/could earn|projected|per year/i);
  });
});

describe('the your-list screen', () => {
  it('reports what was loaded, held and rejected, with the reason', () => {
    mount('mid-campaign', <YourListPage />);
    const text = bodyText();
    expect(text).toMatch(/You sent/);
    expect(text).toMatch(/We loaded/);
    expect(text).toMatch(/Held back/);
    expect(text).toMatch(/Could not use/);
    expect(text).toMatch(/exact duplicates/i);
  });

  it('breaks down the held figure into numbers that sum to it', () => {
    mount('mid-campaign', <YourListPage />);
    const panel = screen.getByRole('region', { name: 'What we loaded' });
    const text = panel.textContent ?? '';
    // A bounce is campaign feedback, not an import outcome. Listing it here made a
    // "Held back: 34" headline break down into 28 + 6 + 18.
    expect(text).toMatch(/28 missing an email address/i);
    expect(text).toMatch(/6 battery not confirmed/i);
    expect(text).not.toMatch(/bounced/i);
  });

  it('shows the email exactly as it arrives, sent as the firm', () => {
    mount('mid-campaign', <YourListPage />);
    const text = bodyText();
    expect(text).toMatch(/Northfield Renewables/);
    expect(text).toMatch(/hello@northfieldrenewables\.co\.uk/);
    // Lumo is named as the deliverer, not as the sender.
    expect(text).toMatch(/on behalf of Northfield Renewables/i);
  });

  it('offers the sender ladder as a question rather than a recommendation', () => {
    mount('mid-campaign', <YourListPage />);
    const text = bodyText();
    expect(text).toMatch(/Send from Lumo's domain/);
    expect(text).toMatch(/Send from your own domain/);
    expect(text).toMatch(/Two DNS records/);
    // The impersonation objection has to be defused explicitly and accurately.
    expect(text).toMatch(/not us pretending to be you/i);
  });

  it('records who confirmed permission and when', () => {
    mount('mid-campaign', <YourListPage />);
    expect(bodyText()).toMatch(/Confirmed by Ade Bankole/);
  });

  it('frames the company link as newsletter content, not as a way to add someone', () => {
    mount('mid-campaign', <YourListPage />);
    const text = bodyText();
    expect(text).toMatch(/not a way to add someone/i);
    expect(text).toMatch(/lumo\.energy\/j\/northfield/);
  });

  it('puts the paste grid first, and asks for no kit detail', () => {
    mount('mid-campaign', <YourListPage />);
    expect(screen.getByLabelText('Name, row 1')).toBeTruthy();
    expect(screen.getByLabelText('Email, row 1')).toBeTruthy();
    expect(screen.getByLabelText('Postcode, row 1')).toBeTruthy();
    // Three columns and no more. A back-book export does not carry kit detail, so a
    // battery-size field would collect a guess and then be trusted like a fact.
    // Scoped to the form: the email body mentions an inverter, which is fine.
    const form = screen.getByLabelText('Name, row 1').closest('section');
    expect(form?.textContent).not.toMatch(/inverter|battery/i);
  });

  it('leads with the approval when it is outstanding', () => {
    mount('awaiting-approval', <YourListPage />);
    const text = bodyText();
    expect(text).toMatch(/Read it, then approve it once/i);
    expect(text).toMatch(/Approve and send to 118/);
    expect(text).toMatch(/Waiting on you/);
  });

  it('never asks the firm to report work they did themselves', () => {
    for (const persona of ['mid-campaign', 'awaiting-approval', 'messy-list'] as const) {
      cleanup();
      mount(persona, <YourListPage />);
      expect(bodyText(), persona).not.toMatch(
        /mark as sent|I(?:'| have)?ve sent|confirm you sent/i,
      );
    }
  });
});
