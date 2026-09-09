// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://example.test/d/3FgvdyiYBsD9/" }
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { DEMO_BASE } from '../demoBase';
import { REWARD_GBP } from '../state';

afterEach(cleanup);

const guide = () => screen.getByRole('dialog', { name: 'Getting started' });
const dots = () => within(guide()).getAllByRole('tab');
const next = () => fireEvent.click(within(guide()).getByRole('button', { name: 'Next' }));

/**
 * App.tsx was the one file with no coverage, and it is the file that decides whether
 * anything renders at all: the router mounts at the base path, so a mismatch between
 * the path and the basename produces a blank page rather than an error.
 *
 * The jsdom URL in the header above deliberately sits inside the base path. If
 * DEMO_BASE changes, the last test here fails and says so.
 */
describe('App at the base path', () => {
  it('lands on the dashboard, not on a list of chores', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy();
  });

  it('mounts both shell navigations, and keeps them tellable apart', () => {
    render(<App />);
    // Two of each link is correct: the sidebar and the bottom tab bar are both in the
    // DOM and CSS chooses. The named landmarks are what stop that being a mess for
    // anyone not looking at the CSS.
    expect(screen.getAllByRole('link', { name: /Dashboard/ })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /Customers/ })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /Campaign/ })).toHaveLength(2);
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Sections, bottom bar' })).toBeTruthy();
  });

  it('has no earnings tab, because it listed the same households twice', () => {
    render(<App />);
    expect(screen.queryAllByRole('link', { name: /Earnings/ })).toHaveLength(0);
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

/**
 * THE FIRST-OPEN GUIDE.
 *
 * The behaviour under test is the timing, not the copy: once per page load, never
 * again on a navigation. Anyone who moves this state onto a page component instead of
 * the shell will break that and the screens will still look right, so it is asserted
 * here rather than left to a manual check.
 */
describe('the first-open guide', () => {
  it('opens over the dashboard on a fresh load', () => {
    render(<App />);
    expect(guide()).toBeTruthy();
    expect(within(guide()).getByRole('heading', { name: 'Welcome to Lumo' })).toBeTruthy();
  });

  it('does not come back when you change tab', () => {
    render(<App />);
    fireEvent.click(within(guide()).getByRole('button', { name: 'Skip' }));
    expect(screen.queryByRole('dialog', { name: 'Getting started' })).toBeNull();

    // Two of each nav link exist, sidebar and bottom bar. Either is a real navigation.
    fireEvent.click(screen.getAllByRole('link', { name: /Customers/ })[0]);
    expect(screen.getByRole('heading', { name: /Customers/ })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Getting started' })).toBeNull();

    fireEvent.click(screen.getAllByRole('link', { name: /Dashboard/ })[0]);
    expect(screen.queryByRole('dialog', { name: 'Getting started' })).toBeNull();
  });

  it('steps through five screens with a dot each', () => {
    render(<App />);
    expect(dots()).toHaveLength(5);
    expect(dots()[0].getAttribute('aria-selected')).toBe('true');

    const titles = ['Welcome to Lumo'];
    for (let n = 0; n < 4; n += 1) {
      next();
      titles.push(within(guide()).getByRole('heading').textContent ?? '');
    }
    expect(titles).toEqual([
      'Welcome to Lumo',
      'Send us your customer list',
      'We load it and check with you',
      'Watch it land',
      'Then it keeps working',
    ]);
    expect(dots()[4].getAttribute('aria-selected')).toBe('true');
  });

  it('closes on the last step rather than offering a sixth', () => {
    render(<App />);
    for (let n = 0; n < 4; n += 1) next();
    expect(within(guide()).queryByRole('button', { name: 'Next' })).toBeNull();
    fireEvent.click(within(guide()).getByRole('button', { name: 'Get started' }));
    expect(screen.queryByRole('dialog', { name: 'Getting started' })).toBeNull();
  });

  it('lets a dot jump straight to a step, for a demo that is being talked over', () => {
    render(<App />);
    fireEvent.click(dots()[3]);
    expect(within(guide()).getByRole('heading', { name: 'Watch it land' })).toBeTruthy();
  });

  it('can be reopened without a page reload', () => {
    render(<App />);
    fireEvent.click(within(guide()).getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'How this works' })[0]);
    // Back at step one. A guide that resumes three screens in cannot be shown twice.
    expect(within(guide()).getByRole('heading', { name: 'Welcome to Lumo' })).toBeTruthy();
    expect(dots()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('names the firm and quotes the reward per household, never a total', () => {
    render(<App />);
    const text = guide().textContent ?? '';
    expect(text).toMatch(/Northfield Renewables earns/);
    expect(text).toMatch(new RegExp(`£${REWARD_GBP} per household`));
    // The forbidden shape: a count of households multiplied by the reward. Adding a
    // customer earns nothing on its own, so any figure larger than the unit rate
    // here would be pricing the ask at a conversion rate nobody has measured.
    expect(text).not.toMatch(/£\s?\d{3,}|£\s?\d+,\d{3}/);
  });

  it('promises only what the demo can show, and no energy data', () => {
    render(<App />);
    for (let n = 0; n < 4; n += 1) next();
    const text = within(guide()).getByRole('heading').parentElement?.textContent ?? '';
    expect(text).toMatch(/Then it keeps working/);
    expect(guide().textContent).not.toMatch(
      /savings|state of charge|kWh generated|performance report/i,
    );
  });

  it('stays shut when the guide is switched off in the URL', () => {
    // How the smoke check and the screenshots get at the screens underneath.
    window.history.replaceState({}, '', `${DEMO_BASE}?guide=off`);
    render(<App />);
    expect(screen.queryByRole('dialog', { name: 'Getting started' })).toBeNull();
    window.history.replaceState({}, '', DEMO_BASE);
  });
});
