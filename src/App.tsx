import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from './components/Shell';
import { DemoStoreProvider } from './store/DemoStore';
import { DEMO_BASE } from './demoBase';
import { personaFromSearch } from './fixtures';
import { DashboardPage } from './pages/DashboardPage';
import { SignupsPage } from './pages/SignupsPage';
import { CampaignPage } from './pages/CampaignPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { SitePage } from './pages/SitePage';
import { SettingsPage } from './pages/SettingsPage';
import { JoinPage } from './pages/JoinPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * The router mounts at `DEMO_BASE`, the same constant vite.config.ts uses for `base`
 * and for the nested output directory. One value, imported in both places, because
 * two copies that drift render a blank page rather than an error.
 */
export default function App() {
  return (
    <BrowserRouter basename={DEMO_BASE}>
      <PersonaGate />
    </BrowserRouter>
  );
}

/**
 * Persona selection is URL-encoded so a specific scenario can be shared as a link.
 * It is read once and keyed into the store, so switching persona remounts the store
 * and discards any session state, which is what you want between research sessions.
 */
function PersonaGate() {
  const { search } = useLocation();
  const personaId = personaFromSearch(search);

  return (
    <DemoStoreProvider key={personaId} personaId={personaId}>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<DashboardPage />} />
          <Route path="signups" element={<SignupsPage />} />
          <Route path="campaign" element={<CampaignPage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="monitoring/:siteId" element={<SitePage />} />
          <Route path="settings" element={<SettingsPage />} />
          {/* Retired screens and retired query strings. Earnings is a column on
              `signups` and a figure on the dashboard; adding by hand is a panel on
              `campaign`; `customers` split into `signups` and `monitoring`. Anything
              holding an old URL lands where that content went rather than on a 404. */}
          <Route path="customers" element={<CustomersRedirect />} />
          <Route path="earnings" element={<Navigate to="/monitoring" replace />} />
          <Route path="list" element={<Navigate to="/campaign" replace />} />
          <Route path="add" element={<Navigate to="/campaign" replace />} />
        </Route>
        {/* Where the company newsletter link resolves to. */}
        <Route path="/j/:token" element={<JoinPage />} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </DemoStoreProvider>
  );
}

/**
 * `/customers` split in two, so where it lands depends on which tab you were on.
 *
 * `?view=active` was the live-household view and is now the Monitoring screen; every
 * other view is a campaign question and stays on Sign-ups. A plain `<Navigate>` cannot
 * express that, because the decision is in the query string rather than the path.
 *
 * The persona parameter has to survive the hop. Dropping it would silently reset the
 * demo to the default company mid-navigation, which looks like a data bug.
 */
function CustomersRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const view = params.get('view');
  params.delete('view');

  const query = params.toString();
  const suffix = query ? `?${query}` : '';

  if (view === 'active') return <Navigate to={`/monitoring${suffix}`} replace />;

  if (view) params.set('view', view);
  const signupsQuery = params.toString();
  return <Navigate to={`/signups${signupsQuery ? `?${signupsQuery}` : ''}`} replace />;
}
