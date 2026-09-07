import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useDemoStore } from '../store/DemoStore';
import { Sheet } from './Sheet';
import { SharePanel } from './PersonalLink';

/**
 * The app shell: a sticky bar, a scrolling screen, and three tabs.
 *
 * Single column, 480px maximum, centred. Laptop is the same layout in the middle of
 * a wider window — there is no separate desktop design and the spec says none is
 * needed. An installer on a driveway is the design target; a laptop is a courtesy.
 */

const TABS = [
  { to: '', label: 'Customers', icon: ListIcon },
  { to: 'add', label: 'Add', icon: PlusIcon },
  { to: 'earnings', label: 'Earnings', icon: MoneyIcon },
] as const;

export function Shell() {
  const { installer } = useDemoStore();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-page">
      <header className="sticky top-0 z-30 flex h-[52px] shrink-0 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur">
        <span className="text-[17px] font-bold tracking-tight text-ink">
          Lumo <span className="text-accent">Hub</span>
        </span>
        <button
          onClick={() => setShareOpen(true)}
          aria-label="Your personal link and QR code"
          className="-mr-2 flex h-10 items-center gap-1.5 rounded-full px-2 text-[14px] font-semibold text-accent"
        >
          <ShareIcon />
          <span>Your link</span>
        </button>
      </header>

      <main className="flex-1 pb-[calc(56px+max(0.5rem,env(safe-area-inset-bottom)))]">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 z-30 w-full max-w-[480px] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <ul className="flex h-[56px]">
          {TABS.map(({ to, label, icon: Icon }) => (
            <li key={label} className="flex-1">
              <NavLink
                to={to}
                end={to === ''}
                className={({ isActive }) =>
                  [
                    'flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors duration-150',
                    isActive ? 'text-accent' : 'text-ink-mute',
                  ].join(' ')
                }
              >
                <Icon />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Sheet open={shareOpen} title="Your link and code" onClose={() => setShareOpen(false)}>
        <SharePanel
          firstName={installer.firstName}
          company={installer.company}
          linkToken={installer.linkToken}
        />
      </Sheet>
    </div>
  );
}

/* Line icons only, per the spec. Inline rather than a dependency: there are four. */

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function ListIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1.2" />
      <circle cx="4" cy="12" r="1.2" />
      <circle cx="4" cy="18" r="1.2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

function MoneyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
      <path d="M13.5 13.5h3v3h-3zM19 19h1M17 20v-1" />
    </svg>
  );
}
