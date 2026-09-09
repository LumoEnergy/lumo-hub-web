import { NavLink, Outlet } from 'react-router-dom';
import { useDemoStore } from '../store/DemoStore';
import { currentSeat } from '../fixtures';

/**
 * The shell.
 *
 * DESKTOP MANAGES THE PORTFOLIO, MOBILE WORKS THE JOB. Those are different jobs, so
 * this is not one layout that shrinks: it is a persistent sidebar and a data table on
 * a laptop, and a bottom tab bar and a card list on a phone. Forcing one responsive
 * compromise would give a table nobody can read at 390px and a card list that wastes
 * a 1400px screen.
 *
 * THE ACCOUNT IS THE COMPANY. The firm's name is the largest text in the sidebar and
 * the current person is secondary to it, because Lumo's customer is the firm and the
 * money is owed to the firm. There is deliberately no personal link and no personal
 * QR anywhere in this product, the previous version had both, and they encoded an
 * attribution model that cannot be paid.
 */

/**
 * Three destinations, and the order is the argument.
 *
 * Dashboard answers "is this working", Customers answers "who and how much", and
 * Campaign answers "what goes out, when, from whom". A fourth tab for earnings used
 * to sit in the middle listing the same households as Customers, which made the
 * reader hold two lists in their head; money is a column and a headline now.
 */
const NAV = [
  { to: '', label: 'Dashboard', end: true, icon: ChartIcon },
  { to: 'customers', label: 'Customers', end: false, icon: ListIcon },
  { to: 'campaign', label: 'Campaign', end: false, icon: InboxIcon },
] as const;

export function Shell() {
  const { company, personaName, dirty, reset } = useDemoStore();
  const seat = currentSeat(company);

  return (
    <div className="min-h-dvh bg-page lg:flex">
      {/* Desktop sidebar. Hidden below lg, where the tab bar takes over. */}
      <aside className="hidden lg:flex lg:h-dvh lg:w-[240px] lg:shrink-0 lg:flex-col lg:justify-between lg:border-r lg:border-line lg:bg-surface lg:px-4 lg:py-5 lg:sticky lg:top-0">
        <div>
          {/* The identity block is the way into account settings, which is where
              people look for it. A fourth main tab would put team admin at the same
              weight as the campaign, and it is not. */}
          <NavLink
            to="settings"
            className={({ isActive }) =>
              [
                'mb-6 block rounded-card px-2 py-1.5 transition-colors duration-150',
                isActive ? 'bg-accent-soft' : 'hover:bg-sunk',
              ].join(' ')
            }
          >
            <span className="block text-[17px] font-bold leading-tight text-ink">
              {company.name}
            </span>
            <span className="mt-0.5 block text-[13px] text-ink-mute">
              {seat.name} · Account
            </span>
          </NavLink>
          {/* Both navs are always in the DOM and CSS picks one, which is the right
              trade for a responsive layout but does leave a screen reader with two
              sets of the same links. Distinct labels are what make that navigable. */}
          <nav aria-label="Sections">
            <ul className="space-y-0.5">
              {NAV.map(({ to, label, end, icon: Icon }) => (
                <li key={label}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-2.5 rounded-card px-2.5 py-2 text-[14px] font-semibold transition-colors duration-150',
                        isActive
                          ? 'bg-accent-soft text-accent'
                          : 'text-ink-soft hover:bg-sunk hover:text-ink',
                      ].join(' ')
                    }
                  >
                    <Icon />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <ResetControl personaName={personaName} dirty={dirty} onReset={reset} />
      </aside>

      {/* Mobile app bar. */}
      <header className="sticky top-0 z-30 flex h-[52px] shrink-0 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <p className="truncate text-[16px] font-bold text-ink">{company.name}</p>
        <NavLink
          to="settings"
          className={({ isActive }) =>
            [
              'ml-3 flex shrink-0 items-center gap-1.5 rounded-chip px-2 py-1 text-[13px]',
              isActive ? 'bg-accent-soft text-accent' : 'text-ink-mute',
            ].join(' ')
          }
        >
          {seat.name}
          <GearIcon />
        </NavLink>
      </header>

      <main className="flex-1 pb-[calc(56px+max(0.5rem,env(safe-area-inset-bottom)))] lg:pb-0">
        <div className="mx-auto w-full max-w-[1200px] lg:px-8 lg:py-8">
          <Outlet />
        </div>
        <div className="px-4 pt-2 pb-6 lg:hidden">
          <ResetControl personaName={personaName} dirty={dirty} onReset={reset} />
        </div>
      </main>

      {/* Mobile tab bar. */}
      <nav
        aria-label="Sections, bottom bar"
        className="fixed bottom-0 z-30 w-full border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="flex h-[56px]">
          {NAV.map(({ to, label, end, icon: Icon }) => (
            <li key={label} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors duration-150',
                    isActive ? 'text-accent' : 'text-ink-mute',
                  ].join(' ')
                }
              >
                <Icon />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/**
 * The reset. Quiet until something has actually changed, then it says what it will
 * undo, a research session that has drifted needs a visible way back to a known
 * starting point.
 */
function ResetControl({
  personaName,
  dirty,
  onReset,
}: {
  personaName: string;
  dirty: boolean;
  onReset: () => void;
}) {
  return (
    <div className="px-2">
      <button
        type="button"
        onClick={onReset}
        className="text-[12px] font-semibold text-ink-mute underline decoration-line underline-offset-2 transition-colors duration-150 hover:text-ink-soft"
      >
        {dirty ? `Reset to ${personaName}` : `Demo: ${personaName}`}
      </button>
    </div>
  );
}

/* Line icons, inherit colour. Inline because there are four of them and a
   dependency would be heavier than the markup. */

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6.5 5.5h9M6.5 10h9M6.5 14.5h9M3.5 5.5h.01M3.5 10h.01M3.5 14.5h.01"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.25 16.75V9.5M8.417 16.75V3.25M13.583 16.75v-5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M17.5 16.75H2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M2.75 11.5 5 4.75h10L17.25 11.5v3.25a1 1 0 0 1-1 1h-12.5a1 1 0 0 1-1-1V11.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M2.75 11.5h4l1 2h4.5l1-2h4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
