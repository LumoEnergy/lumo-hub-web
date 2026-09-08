// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://example.test/d/3FgvdyiYBsD9/" }
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from '../App';
import { DEMO_BASE } from '../demoBase';

afterEach(cleanup);

/**
 * App.tsx was the one file with no coverage, and it is the file that decides whether
 * anything renders at all: the router mounts at the base path, so a mismatch between
 * the path and the basename produces a blank page rather than an error.
 *
 * The jsdom URL in the header above deliberately sits inside the base path. If
 * DEMO_BASE changes, the last test here fails and says so.
 */
describe('App at the base path', () => {
  it('renders the customers screen', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Your customers' })).toBeTruthy();
  });

  it('mounts both shell navigations, and keeps them tellable apart', () => {
    render(<App />);
    // Two of each link is correct: the sidebar and the bottom tab bar are both in the
    // DOM and CSS chooses. The named landmarks are what stop that being a mess for
    // anyone not looking at the CSS.
    expect(screen.getAllByRole('link', { name: /Customers/ })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /Earnings/ })).toHaveLength(2);
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Sections, bottom bar' })).toBeTruthy();
  });

  it('identifies the account by company, not by the person logged in', () => {
    render(<App />);
    expect(screen.getAllByText(/Northfield Renewables/).length).toBeGreaterThan(0);
  });

  it('defaults to the mid-campaign persona', () => {
    render(<App />);
    // Sign-off already given, money on the board. The demo opens on the state that
    // shows the product working rather than on an empty account.
    expect(screen.queryByText(/Nothing has been sent yet/)).toBeNull();
  });

  it('is being exercised at the real base path', () => {
    // Guards the test itself. If DEMO_BASE moves and the jsdom URL in the header does
    // not, every assertion above would fail with "cannot find heading" and look like
    // a UI regression instead of a stale test.
    expect(window.location.pathname).toBe(DEMO_BASE);
  });
});
