import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from './components/Shell';
import { DemoStoreProvider } from './store/DemoStore';
import { DEMO_BASE } from './demoBase';
import { personaFromSearch } from './fixtures';
import { CustomersPage } from './pages/CustomersPage';
import { AddCustomerPage } from './pages/AddCustomerPage';
import { EarningsPage } from './pages/EarningsPage';
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
