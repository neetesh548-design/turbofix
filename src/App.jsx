import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { NotificationProvider } from './components/NotificationCenter';
import { I18nProvider } from './utils/i18n-provider';
import AntDProvider from './components/AntDProvider';
import { ViewModeProvider } from './ViewModeContext';
import { MachineProvider } from './MachineContext';
import { registerServiceWorker, setupTouchGestures } from './utils/pwa';

const Home = lazy(() => import('./pages/Home'));
const WhyTurboFix = lazy(() => import('./pages/marketing/WhyTurboFix'));
const Platform = lazy(() => import('./pages/marketing/Platform'));
const PlatformExperience = lazy(() => import('./pages/PlatformExperience'));
const RecordsPlatform = lazy(() => import('./pages/marketing/RecordsPlatform'));
const Workflow = lazy(() => import('./pages/marketing/Workflow'));
const MarketingDemo = lazy(() => import('./pages/marketing/Demo'));
const Pricing = lazy(() => import('./pages/marketing/Pricing'));
const MarketingContact = lazy(() => import('./pages/marketing/Contact'));
const QRGenerator = lazy(() => import('./pages/QRGenerator'));
const MainLayoutRoute = lazy(() => import('./layouts/MainLayoutRoute'));
const Login = lazy(() => import('./pages/Login'));
const DemoLogin = lazy(() => import('./pages/DemoLogin'));
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
const Kaizen = lazy(() => import('./pages/Kaizen'));
const ReportBreakdown = lazy(() => import('./pages/ReportBreakdown'));
const RCA = lazy(() => import('./pages/RCA'));
import AdminPortal from './pages/AdminPortal';
const NotFound = lazy(() => import('./pages/NotFound'));

import { LanguageProvider } from './LanguageContext';
import { ThemeProvider } from './hooks/useTheme';

function SearchMetadata() {
  const { pathname } = useLocation();

  const metadata = {
    '/': {
      title: 'TurboFix | Verified Maintenance for Manufacturing',
      description: 'TurboFix helps plants report breakdowns, assign work, verify repairs, and keep approved machine history in one system.',
    },
    '/admin.html': {
      title: 'TurboFix | Platform Operations Control Room',
      description: 'TurboFix Platform Operations Control Room & Factory Machine Fleet Management',
    },
    '/admin': {
      title: 'TurboFix | Platform Operations Control Room',
      description: 'TurboFix Platform Operations Control Room & Factory Machine Fleet Management',
    },
    '/why-turbofix.html': {
      title: 'Why TurboFix | Why Plants Switch',
      description: 'See how TurboFix replaces paper, spreadsheets, and WhatsApp handoffs with verified maintenance work.',
    },
    '/platform.html': {
      title: 'TurboFix Platform | Maintenance Workflows',
      description: 'See TurboFix for breakdown reporting, repair execution, records, and plant visibility.',
    },
    '/records-platform.html': {
      title: 'TurboFix Records Platform',
      description: 'Digitize handwritten and digital maintenance records into reviewable machine history.',
    },
    '/workflow.html': {
      title: 'TurboFix Workflow | Report to Verify',
      description: 'Follow each issue from report to assignment, repair, and verified closure.',
    },
    '/demo.html': {
      title: 'TurboFix Demo | See the Product in Action',
      description: 'See one representative TurboFix scenario for operators, technicians, and plant leaders.',
    },
    '/pricing.html': {
      title: 'TurboFix Pricing | Per Machine Plans',
      description: 'Explore per-machine pricing, onboarding, and what is included before you book a walkthrough.',
    },
    '/contact.html': {
      title: 'Book a TurboFix Plant Walkthrough',
      description: 'Book a guided TurboFix walkthrough for one representative machine in your plant.',
    },
    '/platform-experience.html': {
      title: 'TurboFix | Platform Experience',
      description: 'Experience how TurboFix unifies your plant maintenance workflow in one seamless platform.',
    },
    '/experience.html': {
      title: 'TurboFix | Experience',
      description: 'See the TurboFix difference and learn how to optimize your manufacturing downtime.',
    },
  };
  const page = metadata[pathname] || null;

  useEffect(() => {
    const isPublicMarketingPage = [
      '/',
      '/why-turbofix.html',
      '/platform.html',
      '/records-platform.html',
      '/workflow.html',
      '/demo.html',
      '/pricing.html',
      '/contact.html',
    ].includes(pathname);
    document.querySelector('meta[name="robots"]')?.setAttribute(
      'content',
      isPublicMarketingPage
        ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
        : 'noindex, nofollow',
    );
    document.querySelector('link[rel="canonical"]')?.setAttribute(
      'href',
      `https://www.turbofix.co.in${isPublicMarketingPage ? (pathname === '/' ? '/' : pathname) : pathname}`,
    );
    if (page) {
      document.title = page.title;
      document.querySelector('meta[name="description"]')?.setAttribute('content', page.description);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', page.title);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', page.description);
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', `https://www.turbofix.co.in${pathname === '/' ? '/' : pathname}`);
    }
  }, [pathname, page]);

  return null;
}

function App() {
  const basename = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL.slice(0, -1) : import.meta.env.BASE_URL;
  
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const isRecoveryLink = hashParams.get('type') === 'recovery' || (hashParams.has('access_token') && hashParams.get('type') === 'recovery');
    const appBasePath = `${basename || ''}/`;
    const currentPath = window.location.pathname;

    if (isRecoveryLink && (currentPath === '/' || currentPath === appBasePath)) {
      window.location.replace(`${basename}/reset-password.html${window.location.hash}`);
      return;
    }

    registerServiceWorker();
    setupTouchGestures();
  }, [basename]);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <I18nProvider>
          <AntDProvider>
            <ViewModeProvider>
              <MachineProvider>
                <NotificationProvider>
                  <BrowserRouter basename={basename}>
                  <SearchMetadata />
                  <Suspense fallback={<div className="route-loading">Loading TurboFix…</div>}>
                    <Routes>
                    <Route element={<MainLayoutRoute />}>
                      <Route path="/" element={<Home />} />
                      <Route path="/why-turbofix.html" element={<WhyTurboFix />} />
                      <Route path="/platform.html" element={<Platform />} />
                      <Route path="/platform-experience.html" element={<PlatformExperience />} />
                      <Route path="/experience.html" element={<PlatformExperience />} />
                      <Route path="/records-platform.html" element={<RecordsPlatform />} />
                      <Route path="/workflow.html" element={<Workflow />} />
                      <Route path="/demo.html" element={<MarketingDemo />} />
                      <Route path="/pricing.html" element={<Pricing />} />
                      <Route path="/contact.html" element={<MarketingContact />} />
                      <Route path="/qr-generator.html" element={<QRGenerator />} />
                    </Route>
                    <Route path="/platform-experience" element={<Navigate to="/platform-experience.html" replace />} />
                    <Route path="/experience" element={<Navigate to="/experience.html" replace />} />
                    <Route path="/login.html" element={<Login />} />
                    <Route path="/login" element={<Navigate to="/login.html" replace />} />
                    <Route path="/demo-login.html" element={<DemoLogin />} />
                    <Route path="/demo-login" element={<Navigate to="/demo-login.html" replace />} />
                    <Route path="/dashboard.html" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Navigate to="/dashboard.html" replace />} />
                    <Route path="/reset-password.html" element={<ResetPassword />} />
                    <Route path="/machines.html" element={<Machines />} />
                    <Route path="/machines" element={<Navigate to="/machines.html" replace />} />
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
                    <Route path="/kaizen.html" element={<Kaizen />} />
                    <Route path="/kaizen" element={<Navigate to="/kaizen.html" replace />} />
                    <Route path="/rca.html" element={<RCA />} />
                    <Route path="/rca" element={<Navigate to="/rca.html" replace />} />
                    <Route path="/report-breakdown.html" element={<ReportBreakdown />} />
                    <Route path="/report-breakdown" element={<Navigate to="/report-breakdown.html" replace />} />
                    <Route path="/admin.html" element={<AdminPortal />} />
                    <Route path="/admin" element={<AdminPortal />} />
                    <Route path="/admin/*" element={<AdminPortal />} />
                    <Route path="/admin_portal.html" element={<AdminPortal />} />
                    <Route path="/admin_portal" element={<AdminPortal />} />
                    <Route path="/admin_portal/*" element={<AdminPortal />} />
                    <Route path="/superadmin.html" element={<AdminPortal />} />
                    <Route path="/superadmin" element={<AdminPortal />} />
                    <Route path="/superadmin/*" element={<AdminPortal />} />
                    <Route path="/control-room" element={<AdminPortal />} />
                    <Route path="/control-room/*" element={<AdminPortal />} />
                    <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
                </NotificationProvider>
              </MachineProvider>
            </ViewModeProvider>
          </AntDProvider>
        </I18nProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
