import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './components/NotificationCenter';
import { registerServiceWorker, setupTouchGestures } from './utils/pwa';

const Home = lazy(() => import('./pages/Home'));
const QRGenerator = lazy(() => import('./pages/QRGenerator'));
const Vault = lazy(() => import('./pages/Vault'));
const Login = lazy(() => import('./pages/Login'));
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
const Support = lazy(() => import('./pages/Support'));
const QRGateway = lazy(() => import('./pages/QRGateway'));
const Inventory = lazy(() => import('./pages/Inventory'));

function App() {
  const basename = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL.slice(0, -1) : import.meta.env.BASE_URL;
  
  useEffect(() => {
    registerServiceWorker();
    setupTouchGestures();
  }, []);

  return (
    <NotificationProvider>
      <BrowserRouter basename={basename}>
        <Suspense fallback={<div className="route-loading">Loading TurboFix…</div>}>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/why-turbofix.html" element={<Navigate to="/#platform" replace />} />
          <Route path="/qr-generator.html" element={<QRGenerator />} />
          <Route path="/vault.html" element={<Vault />} />
          <Route path="/vault" element={<Navigate to="/vault.html" replace />} />
          <Route path="/login.html" element={<Login />} />
          <Route path="/login" element={<Navigate to="/login.html" replace />} />
          <Route path="/dashboard.html" element={<Dashboard />} />
          <Route path="/dashboard" element={<Navigate to="/dashboard.html" replace />} />
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
          <Route path="/inventory.html" element={<Inventory />} />
          <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;
