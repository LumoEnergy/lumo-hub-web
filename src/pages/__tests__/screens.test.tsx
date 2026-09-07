// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { PersonaId } from '../../fixtures';
import { DemoStoreProvider } from '../../store/DemoStore';
import { Shell } from '../../components/Shell';
import { CustomersPage } from '../CustomersPage';
import { AddCustomerPage } from '../AddCustomerPage';
import { EarningsPage } from '../EarningsPage';

afterEach(cleanup);

/**
 * Screen-level guards for the things a research session would be invalidated by:
 * money shown to someone who has earned none, an unmatched household hidden in a
 * list, or an add flow that takes more than a handful of taps.
 */
function mount(persona: PersonaId, at = '/') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <DemoStoreProvider personaId={persona}>
        <Routes>
          <Route path="/" element={<Shell />}>
            <Route index element={<CustomersPage />} />
            <Route path="add" element={<AddCustomerPage />} />
            <Route path="earnings" element={<EarningsPage />} />
          </Route>
        </Routes>
      </DemoStoreProvider>
    </MemoryRouter>,
  );
}

describe('the first-run persona', () => {
  it('shows no money at all, not even a zero', () => {
    mount('first-run', '/earnings');
    expect(screen.getByText(/nothing yet, and no guesses/i)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/£0\b/);
  });

  it('never shows a forward-looking figure', () => {
    // The only amount allowed anywhere in the first-run product is the £50 rule
    // itself. Any other figure would be a projection, which is the specific thing
    // that lost installers' trust the first time round.
    for (const at of ['/', '/add', '/earnings']) {
      cleanup();
      mount('first-run', at);
      const amounts = (document.body.textContent ?? '').match(/£[\d,]+/g) ?? [];
      expect(new Set(amounts), at).toEqual(new Set(['£50']));
    }
  });

  it('never uses the language of a projection', () => {
    mount('first-run');
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/could earn|you could|projected|per year|annually|estimate/i);
  });

  it('makes adding the first customer the hero', () => {
    mount('first-run');
    expect(screen.getByText(/add your first customer/i)).toBeTruthy();
  });
});

describe('the messy persona', () => {
  it('pins the unmatched household above the queue rather than in it', () => {
    mount('messy');
    const callout = screen.getByText(/of yours is going to nobody/i);
    expect(callout).toBeTruthy();
    // The name appears in the callout, not only as an ordinary row.
    expect(screen.getByText('Dermot Kelly')).toBeTruthy();
  });

  it('leads the queue with what the installer can fix themselves', () => {
    mount('messy');
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    const owned = headings.findIndex((h) => h?.includes('You can fix these'));
    const household = headings.findIndex((h) => h?.includes('The household needs to act'));
    expect(owned).toBeGreaterThanOrEqual(0);
    expect(owned).toBeLessThan(household);
  });

  it('spells out a dead lead rather than showing a bare day count', () => {
    mount('messy');
    expect(screen.getByText(/Dead lead/)).toBeTruthy();
  });

  it('says whose problem a Lumo-side failure is, in the detail sheet', () => {
    mount('messy');
    fireEvent.click(screen.getByText('Orla Byrne'));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByText(/Battery offline/)).toBeTruthy();
    expect(within(sheet).getByText(/Whose job — You/)).toBeTruthy();
  });
});

describe('the established persona', () => {
  it('states plainly that a confirmed reward is not reversed when control drops', () => {
    mount('established', '/earnings');
    expect(screen.getAllByText(/not reversed/i).length).toBeGreaterThan(0);
  });

  it('shows a clock-reset section rather than quietly losing the household', () => {
    mount('established', '/earnings');
    expect(screen.getByText(/Clock reset/)).toBeTruthy();
  });

  it('does not queue the household whose control Lumo is still testing', () => {
    mount('established');
    const queue = screen.getByText('Need chasing').closest('div');
    expect(queue).toBeTruthy();
    expect(screen.queryByText('Niall Underhill')).toBeNull();
  });

  it('shows the full list one tap away', () => {
    mount('established');
    fireEvent.click(screen.getByRole('tab', { name: /All/ }));
    expect(screen.getByText(/Everyone you have added/)).toBeTruthy();
    expect(screen.getByText('Niall Underhill')).toBeTruthy();
  });
});

describe('adding a customer', () => {
  it('gets from the form to an invited customer in four interactions', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mount('first-run', '/add');

    // 1-3: the three things that cannot be defaulted.
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Rita' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Nayar' } });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'rita.nayar@example.com' },
    });

    // 4: continue. Inverter and battery are pre-set, which is what protects the
    // sixty-second criterion.
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }));
    await vi.advanceTimersByTimeAsync(500);

    expect(await screen.findByText(/Who makes contact\?/)).toBeTruthy();
    vi.useRealTimers();
  });

  it('opens on a single form, with the grid behind a disclosure', () => {
    mount('first-run', '/add');
    expect(screen.queryByPlaceholderText('First name')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /add several/i }));
    expect(screen.getAllByPlaceholderText('First name').length).toBe(5);
  });

  it('fills the grid from a pasted list', () => {
    mount('first-run', '/add');
    fireEvent.click(screen.getByRole('button', { name: /add several/i }));
    const first = screen.getAllByPlaceholderText('First name')[0];
    fireEvent.paste(first, {
      clipboardData: {
        getData: () =>
          'Rita\tNayar\trita@example.com\nJoe\tPatel\tjoe@example.com\nAmy\tLunt\tamy@example.com',
      },
    });
    expect(screen.getByText(/Filled 3 rows/)).toBeTruthy();
    expect(screen.getByDisplayValue('Patel')).toBeTruthy();
  });

  it('sends nothing until a contact path is chosen', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mount('first-run', '/add');
    expect(screen.getByText(/Nothing is sent until you choose/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Rita' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Nayar' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'r@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }));
    await vi.advanceTimersByTimeAsync(500);

    expect(await screen.findByText(/Nothing has been sent yet/)).toBeTruthy();
    vi.useRealTimers();
  });

  it('shows the exact email before Lumo would send it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mount('first-run', '/add');
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Rita' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Nayar' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'r@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }));
    await vi.advanceTimersByTimeAsync(500);

    fireEvent.click(await screen.findByText('Lumo will contact them'));
    expect(await screen.findByText(/exactly what they will receive/i)).toBeTruthy();
    expect(screen.getByText(/Hi Rita,/)).toBeTruthy();
    vi.useRealTimers();
  });

  it('records the two contact paths as different states', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mount('first-run', '/add');
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Rita' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Nayar' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'r@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }));
    await vi.advanceTimersByTimeAsync(500);

    fireEvent.click(await screen.findByText("I'll contact them"));
    expect(await screen.findByText(/Send it yourself/)).toBeTruthy();
    // The installer confirms the send, which is what distinguishes this from the
    // Lumo path rather than both collapsing into "invited".
    fireEvent.click(screen.getByRole('button', { name: /I've sent it/ }));
    await waitFor(() => expect(screen.getByText('Rita Nayar')).toBeTruthy());
    fireEvent.click(screen.getByText('Rita Nayar'));
    expect(within(screen.getByRole('dialog')).getByText('You invited them')).toBeTruthy();
    vi.useRealTimers();
  });
});

describe('the shell', () => {
  it('keeps the personal link one tap away on every screen', () => {
    mount('established', '/earnings');
    fireEvent.click(screen.getByRole('button', { name: /your personal link/i }));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByText(/not Northfield Renewables's/)).toBeTruthy();
  });

  it('offers a reset only once the demo has been changed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mount('messy');
    expect(screen.queryByRole('button', { name: /reset this demo/i })).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: /Add/ }));
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Rita' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Nayar' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'r@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }));
    await vi.advanceTimersByTimeAsync(500);
    fireEvent.click(await screen.findByText('Lumo will contact them'));
    fireEvent.click(screen.getByRole('button', { name: /^Done$/ }));

    const reset = await screen.findByRole('button', { name: /reset this demo/i });
    fireEvent.click(reset);
    expect(screen.queryByText('Rita Nayar')).toBeNull();
    vi.useRealTimers();
  });
});
