import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import WhyTurboFix from './pages/WhyTurboFix';
import QRGenerator from './pages/QRGenerator';
import Vault from './pages/Vault';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/why-turbofix.html" element={<WhyTurboFix />} />
        <Route path="/qr-generator.html" element={<QRGenerator />} />
        <Route path="/vault.html" element={<Vault />} />
        <Route path="/dashboard.html" element={<Dashboard />} />
        <Route path="/reset-password.html" element={<ResetPassword />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
