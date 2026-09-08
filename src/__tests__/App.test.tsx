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

  it('mounts the shell navigation', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /Customers/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Earnings/ })).toBeTruthy();
  });

  it('defaults to the established persona', () => {
    render(<App />);
    expect(screen.getByText(/Northfield Renewables/)).toBeTruthy();
  });

  it('is being exercised at the real base path', () => {
    // Guards the test itself. If DEMO_BASE moves and the jsdom URL in the header does
    // not, every assertion above would fail with "cannot find heading" and look like
    // a UI regression instead of a stale test.
    expect(window.location.pathname).toBe(DEMO_BASE);
  });
});
