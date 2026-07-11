import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import WhyTurboFix from './pages/WhyTurboFix';
import QRGenerator from './pages/QRGenerator';
import Vault from './pages/Vault';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';

function App() {
  const basename = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL.slice(0, -1) : import.meta.env.BASE_URL;
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/why-turbofix.html" element={<WhyTurboFix />} />
        <Route path="/qr-generator.html" element={<QRGenerator />} />
        <Route path="/vault.html" element={<Vault />} />
        <Route path="/dashboard.html" element={<Dashboard />} />
        <Route path="/reset-password.html" element={<ResetPassword />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
