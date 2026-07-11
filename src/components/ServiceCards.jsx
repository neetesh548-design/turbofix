import React from 'react';

const services = [
  { title: 'Smartphone Repair', desc: 'Screen replacements, battery swaps, and water damage recovery.', icon: '📱' },
  { title: 'Laptop & PC', desc: 'Hardware upgrades, virus removal, and motherboard diagnostics.', icon: '💻' },
  { title: 'Tablet Repair', desc: 'Fixing cracked screens and charging port issues fast.', icon: '📱' },
  { title: 'Game Consoles', desc: 'HDMI port repair, disc drive issues, and overheating fixes.', icon: '🎮' },
  { title: 'Smartwatches', desc: 'Screen fixes and battery replacements for major brands.', icon: '⌚' },
  { title: 'Data Recovery', desc: 'Retrieving lost photos and files from damaged devices.', icon: '💾' },
];

export default function ServiceCards() {
  return (
    <section id="services" style={{padding: '80px 0', background: 'var(--bg)'}}>
      <div className="container">
        <div style={{textAlign: 'center', marginBottom: '48px'}}>
          <span style={{color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px'}}>
            What We Do
          </span>
          <h2 style={{fontSize: '36px', color: 'var(--ink)', marginTop: '8px'}}>Our Repair Services</h2>
        </div>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px'}}>
          {services.map((svc, i) => (
            <div key={i} style={{background: 'var(--card)', padding: '32px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s', cursor: 'pointer'}} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{fontSize: '40px', marginBottom: '16px'}}>{svc.icon}</div>
              <h3 style={{fontSize: '20px', color: 'var(--ink)', marginBottom: '12px'}}>{svc.title}</h3>
              <p style={{color: 'var(--slate)', fontSize: '15px', lineHeight: 1.6}}>{svc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
