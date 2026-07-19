import { useEffect, useState } from 'react';
import { Cpu, MessageCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function QRGateway() {
  const [machine, setMachine] = useState({ id: '', name: '', loc: '', wa: '' });

  useEffect(() => {
    document.title = 'TurboFix — QR Gateway';
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || '';
    const name = params.get('name') || 'Machine';
    const loc = params.get('loc') || 'Plant Floor';
    const wa = params.get('wa') || '';
    
    setMachine({ id, name, loc, wa });
  }, []);

  const handleWhatsApp = () => {
    if (machine.wa) {
      window.location.href = machine.wa;
    } else {
      window.location.href = `https://wa.me/?text=Issue with machine ${machine.id}`;
    }
  };

  const handleDashboard = () => {
    const base = import.meta.env.BASE_URL || '/';
    // Redirects to machines page with machine ID pre-selected (protected by auth shell redirect)
    window.location.href = `${base}machines.html?machine=${machine.id}`;
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0b1118', color: '#e5edf6', fontFamily: 'Outfit, sans-serif', padding: '24px 16px' }}>
      
      {/* Brand Header */}
      <header style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '20px 0 40px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.6))' }}>
          <path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H12l1-8z" fill="#f59e0b" />
        </svg>
        <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '1.5px', fontFamily: 'Rajdhani, sans-serif' }}>
          <span style={{ color: '#863bff' }}>TURBO</span>FIX
        </span>
      </header>

      {/* Main Content Area */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '440px', width: '100%', margin: '0 auto' }}>
        
        {/* Machine Badge Card */}
        <div style={{ background: '#151e28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(134,59,255,0.1)', borderRadius: '12px', color: '#863bff', marginBottom: '16px' }}>
            <Cpu size={32} />
          </div>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {machine.name}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 16px' }}>
            Location: {machine.loc}
          </p>
          
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.5px', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '6px', display: 'inline-block' }}>
            ID: {machine.id}
          </div>
        </div>

        {/* Action Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Option 1: WhatsApp */}
          <button 
            type="button" 
            onClick={handleWhatsApp}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '18px 20px',
              background: '#16a34a',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 4px 12px rgba(22,163,74,0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MessageCircle size={20} />
              <span>Report via WhatsApp</span>
            </div>
            <ArrowRight size={18} />
          </button>

          {/* Option 2: Dashboard */}
          <button 
            type="button" 
            onClick={handleDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '18px 20px',
              background: '#312e81',
              border: '1px solid rgba(134,59,255,0.2)',
              borderRadius: '12px',
              color: '#e5edf6',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 4px 12px rgba(49,46,129,0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Cpu size={20} />
              <span>Go to Machine Dashboard</span>
            </div>
            <ArrowRight size={18} />
          </button>

        </div>

      </section>

      {/* Footer Info */}
      <footer style={{ textAlign: 'center', padding: '40px 0 10px', fontSize: '0.8rem', color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
          <Sparkles size={12} color="#f59e0b" />
          <span>Secured by TurboFix Maintenance Network</span>
        </div>
      </footer>

    </main>
  );
}
