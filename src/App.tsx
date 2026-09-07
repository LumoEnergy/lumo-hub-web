import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from './components/Shell';
import { DemoStoreProvider } from './store/DemoStore';
import { personaFromSearch } from './fixtures';
import { CustomersPage } from './pages/CustomersPage';
import { AddCustomerPage } from './pages/AddCustomerPage';
import { EarningsPage } from './pages/EarningsPage';
import { JoinPage } from './pages/JoinPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * The router is mounted at `import.meta.env.BASE_URL`, which Vite sets from `base` in
 * vite.config.js. Anything outside that path renders nothing recognisable — the demo
 * is unlisted, and a static host will happily serve the SPA shell at the site root
 * unless the app itself declines.
 *
 * Obscurity, not security. Proportionate only because the bundle holds no real data.
 */
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
          <Route index element={<CustomersPage />} />
          <Route path="add" element={<AddCustomerPage />} />
          <Route path="earnings" element={<EarningsPage />} />
        </Route>
        {/* Where the personal link and QR resolve to. */}
        <Route path="/join/:token" element={<JoinPage />} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </DemoStoreProvider>
  );
}
