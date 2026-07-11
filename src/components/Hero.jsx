import React from 'react';

export default function Hero() {
  return (
    <section className="hero" style={{background: 'var(--navy-3)', padding: '80px 0', borderBottom: '1px solid var(--border)'}}>
      <div className="container" style={{display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap'}}>
        
        <div className="hero-text" style={{flex: '1 1 500px'}}>
          <span style={{color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px', marginBottom: '16px', display: 'block'}}>
            Fast & Reliable
          </span>
          <h1 style={{fontSize: '48px', color: 'var(--ink)', lineHeight: 1.1, marginBottom: '24px'}}>
            Expert Electronics <br/>
            <span style={{color: 'var(--brand)'}}>Repair Services</span>
          </h1>
          <p style={{fontSize: '18px', color: 'var(--slate)', marginBottom: '32px', maxWidth: '480px'}}>
            From broken screens to complex logic board repairs, our certified technicians get your devices back to life in record time.
          </p>
          <div style={{display: 'flex', gap: '16px'}}>
            <a href="#contact" className="btn btn-primary" style={{background: 'var(--brand)', color: 'white', padding: '12px 24px', borderRadius: '4px', fontWeight: 600, border: 'none'}}>
              Book a Repair
            </a>
            <a href="#services" className="btn btn-secondary" style={{background: 'transparent', color: 'var(--ink)', padding: '12px 24px', borderRadius: '4px', fontWeight: 600, border: '2px solid var(--border)'}}>
              View Services
            </a>
          </div>
        </div>

        <div className="hero-image" style={{flex: '1 1 400px', position: 'relative'}}>
          <div style={{background: 'var(--card)', padding: '24px', borderRadius: '12px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)'}}>
            <div style={{width: '100%', height: '300px', background: 'var(--slate-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '24px', opacity: 0.8}}>
               [ Technician Image ]
            </div>
            <div style={{position: 'absolute', bottom: '-20px', left: '-20px', background: 'white', padding: '16px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '40px', height: '40px', background: 'var(--ok)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px'}}>✓</div>
              <div>
                <div style={{fontWeight: 700, color: 'var(--ink)', fontSize: '18px'}}>10,000+</div>
                <div style={{fontSize: '12px', color: 'var(--slate)'}}>Repairs Completed</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
