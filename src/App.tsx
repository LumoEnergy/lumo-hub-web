import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from './components/Shell';
import { DemoStoreProvider } from './store/DemoStore';
import { DEMO_BASE } from './demoBase';
import { personaFromSearch } from './fixtures';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CampaignPage } from './pages/CampaignPage';
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
 * and discards any session state — which is what you want between research sessions.
 */
function PersonaGate() {
  const { search } = useLocation();
  const personaId = personaFromSearch(search);

  return (
    <DemoStoreProvider key={personaId} personaId={personaId}>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="campaign" element={<CampaignPage />} />
          {/* Retired screens. Earnings is now a column on `customers` and a figure
              on the dashboard; adding by hand is a panel on `campaign`. Anything
              holding an old URL lands where that content went rather than on a 404. */}
          <Route path="earnings" element={<Navigate to="/customers?filter=earning" replace />} />
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
