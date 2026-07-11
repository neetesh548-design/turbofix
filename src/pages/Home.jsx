import React, { useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import Hero from '../components/Hero';
import ServiceCards from '../components/ServiceCards';

export default function Home() {
  // We can keep the legacy script loaders just in case other vanilla elements are still used on this page
  // but we are migrating heavily into pure React components.
  useEffect(() => {
    const scriptI18n = document.createElement('script');
    scriptI18n.src = '/assets/i18n.js';
    scriptI18n.onload = () => {
      const scriptMain = document.createElement('script');
      scriptMain.src = '/assets/script.js';
      scriptMain.onload = () => {
        if (window.initVanillaHome) window.initVanillaHome();
      };
      document.body.appendChild(scriptMain);
    };
    document.body.appendChild(scriptI18n);
    
    return () => {
      const scripts = document.querySelectorAll('script[src^="/assets/"]');
      scripts.forEach(s => s.remove());
    };
  }, []);

  return (
    <MainLayout>
      <Hero />
      <ServiceCards />
      
      {/* Testimonials / CTA could go here */}
      <section style={{padding: '80px 0', background: 'var(--brand)', color: 'white', textAlign: 'center'}}>
        <div className="container">
          <h2 style={{fontSize: '36px', marginBottom: '24px'}}>Ready to get your device fixed?</h2>
          <p style={{fontSize: '18px', opacity: 0.9, maxWidth: '600px', margin: '0 auto 32px'}}>
            Drop by our store or mail your device in. We offer free diagnostics and a 90-day warranty on all repairs.
          </p>
          <a href="#contact" className="btn" style={{background: 'white', color: 'var(--brand)', padding: '16px 32px', borderRadius: '4px', fontWeight: 700, fontSize: '18px', display: 'inline-block'}}>
            Schedule Repair Now
          </a>
        </div>
      </section>
    </MainLayout>
  );
}
