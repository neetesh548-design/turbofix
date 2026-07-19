import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const loaders = {
  '/': () => import('./pages/Home'),
  '/why-turbofix.html': () => import('./pages/WhyTurboFix'),
  '/qr-generator.html': () => import('./pages/QRGenerator'),
  '/vault.html': () => import('./pages/Vault'),
  '/dashboard.html': () => import('./pages/Dashboard'),
  '/reset-password.html': () => import('./pages/ResetPassword'),
  '/machines.html': () => import('./pages/Machines'),
  '/tickets.html': () => import('./pages/Tickets'),
  '/team.html': () => import('./pages/Team'),
  '/settings.html': () => import('./pages/Settings'),
  '/assistant.html': () => import('./pages/Assistant'),
  '/shutdown-planner.html': () => import('./pages/ShutdownPlanner'),
  '/technician.html': () => import('./pages/Technician'),
  '/records.html': () => import('./pages/Records'),
  '/support.html': () => import('./pages/Support'),
  '/qr-gateway.html': () => import('./pages/QRGateway'),
};

const Home = lazy(loaders['/']);
const WhyTurboFix = lazy(loaders['/why-turbofix.html']);
const QRGenerator = lazy(loaders['/qr-generator.html']);
const Vault = lazy(loaders['/vault.html']);
const Dashboard = lazy(loaders['/dashboard.html']);
const ResetPassword = lazy(loaders['/reset-password.html']);
const Machines = lazy(loaders['/machines.html']);
const Tickets = lazy(loaders['/tickets.html']);
const Team = lazy(loaders['/team.html']);
const Settings = lazy(loaders['/settings.html']);
const Assistant = lazy(loaders['/assistant.html']);
const ShutdownPlanner = lazy(loaders['/shutdown-planner.html']);
const Technician = lazy(loaders['/technician.html']);
const Records = lazy(loaders['/records.html']);
const Support = lazy(loaders['/support.html']);
const QRGateway = lazy(loaders['/qr-gateway.html']);

// Start the current page chunk immediately instead of waiting for React Router.
const currentPath = window.location.pathname.replace(import.meta.env.BASE_URL.replace(/\/$/, ''), '') || '/';
loaders[currentPath]?.();

function App() {
  const basename = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL.slice(0, -1) : import.meta.env.BASE_URL;
  return (
    <BrowserRouter basename={basename}>
      <Suspense fallback={<div className="route-loading">Loading TurboFix…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/why-turbofix.html" element={<WhyTurboFix />} />
          <Route path="/qr-generator.html" element={<QRGenerator />} />
          <Route path="/vault.html" element={<Vault />} />
          <Route path="/dashboard.html" element={<Dashboard />} />
          <Route path="/reset-password.html" element={<ResetPassword />} />
          <Route path="/machines.html" element={<Machines />} />
          <Route path="/tickets.html" element={<Tickets />} />
          <Route path="/team.html" element={<Team />} />
          <Route path="/settings.html" element={<Settings />} />
          <Route path="/assistant.html" element={<Assistant />} />
          <Route path="/shutdown-planner.html" element={<ShutdownPlanner />} />
          <Route path="/technician.html" element={<Technician />} />
          <Route path="/records.html" element={<Records />} />
          <Route path="/support.html" element={<Support />} />
          <Route path="/qr-gateway.html" element={<QRGateway />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
