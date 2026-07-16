import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const WhyTurboFix = lazy(() => import('./pages/WhyTurboFix'));
const QRGenerator = lazy(() => import('./pages/QRGenerator'));
const Vault = lazy(() => import('./pages/Vault'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Machines = lazy(() => import('./pages/Machines'));
const Tickets = lazy(() => import('./pages/Tickets'));
const Team = lazy(() => import('./pages/Team'));
const Settings = lazy(() => import('./pages/Settings'));
const Assistant = lazy(() => import('./pages/Assistant'));
const ShutdownPlanner = lazy(() => import('./pages/ShutdownPlanner'));
const Technician = lazy(() => import('./pages/Technician'));
const Records = lazy(() => import('./pages/Records'));

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
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
