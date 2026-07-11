import React, { useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';

export default function Home() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <MainLayout>
      <div className="home-page-redesign" style={{ paddingBottom: '80px' }}>
        
        {/* ============================================================
            1. HERO SECTION
            ============================================================ */}
        <section className="hero" style={{ padding: '100px 0 80px', textAlign: 'center', background: 'var(--navy)' }}>
          <div className="container" style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '3.5rem', marginBottom: '20px', lineHeight: '1.1' }}>
              NO APP. NO TRAINING. <br />
              <span style={{ color: 'var(--brand)' }}>JUST SCAN AND WHATSAPP.</span>
            </h1>
            <p className="lede" style={{ fontSize: '1.25rem', color: 'var(--slate)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
              Turn any factory machine into a ticketing point in 10 seconds. Built specifically for MSME factory owners in the Pune MIDC industrial belt.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '60px' }}>
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '16px 32px', fontSize: '1.1rem', background: 'var(--brand)', color: '#1a1f24' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.227 5.227 0 00-.571-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Book a Free Demo
              </a>
            </div>
            
            {/* Mockup Flow */}
            <div className="hero-mockup" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '20px',
              background: 'var(--card)',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              flexWrap: 'wrap'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '100px', height: '100px', background: '#fff', padding: '8px', borderRadius: '8px', margin: '0 auto 12px' }}>
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=TurboFix" alt="QR Code" style={{ width: '100%', height: '100%' }} />
                </div>
                <span style={{ fontSize: '13px', color: 'var(--slate)' }}>Scan QR</span>
              </div>
              <div style={{ color: 'var(--slate)', fontSize: '24px' }}>→</div>
              <div style={{ background: '#075e54', padding: '16px', borderRadius: '16px', width: '220px', textAlign: 'left' }}>
                <div style={{ background: '#dcf8c6', color: '#000', padding: '8px 12px', borderRadius: '8px 8px 0 8px', fontSize: '13px', marginBottom: '8px', marginLeft: 'auto', width: 'fit-content' }}>
                  Motor is overheating again.
                </div>
                <div style={{ background: '#fff', color: '#000', padding: '8px 12px', borderRadius: '8px 8px 8px 0', fontSize: '13px', width: 'fit-content' }}>
                  Ticket #104 logged. Supervisor notified.
                </div>
              </div>
              <div style={{ color: 'var(--slate)', fontSize: '24px' }}>→</div>
              <div style={{ background: 'var(--navy-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', width: '200px', textAlign: 'left' }}>
                <div style={{ fontSize: '12px', color: 'var(--slate)', marginBottom: '8px' }}>Open Tickets</div>
                <div style={{ background: 'rgba(255,0,0,0.1)', borderLeft: '3px solid var(--red)', padding: '8px', fontSize: '13px', marginBottom: '8px' }}>#104: Motor Overheat</div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', fontSize: '13px' }}>#103: Belt Jam</div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            2. THE PROBLEM
            ============================================================ */}
        <section style={{ padding: '80px 0' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '2.5rem' }}>The Shop Floor Reality</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              <div className="card" style={{ background: 'var(--card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>📝</div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Lost Complaints</h3>
                <p style={{ color: 'var(--slate)' }}>Workers shout over the noise or scribble in paper logbooks. By the time the supervisor hears about it, the machine has been dead for an hour.</p>
              </div>
              <div className="card" style={{ background: 'var(--card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>🤷‍♂️</div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>No Accountability</h3>
                <p style={{ color: 'var(--slate)' }}>"I told him yesterday!" "Nobody told me!" There is zero digital trail of who reported what, and when the technician actually arrived to fix it.</p>
              </div>
              <div className="card" style={{ background: 'var(--card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Repeat Breakdowns</h3>
                <p style={{ color: 'var(--slate)' }}>Without data, you don't know which machines are quietly eating into your profits with the same exact breakdown every single week.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            3. HOW IT WORKS
            ============================================================ */}
        <section style={{ padding: '80px 0', background: 'var(--navy-2)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '2.5rem' }}>How it works</h2>
              <p style={{ color: 'var(--slate)', fontSize: '1.1rem' }}>Zero training required. If they can use WhatsApp, they can use TurboFix.</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ background: 'var(--brand)', color: '#1a1f24', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0 }}>1</div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Scan the Machine QR</h4>
                  <p style={{ color: 'var(--slate)', margin: 0 }}>Operator scans the QR code sticker placed on the faulty machine.</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ background: 'var(--brand)', color: '#1a1f24', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0 }}>2</div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Send a WhatsApp Message</h4>
                  <p style={{ color: 'var(--slate)', margin: 0 }}>WhatsApp opens automatically with the Machine ID pre-filled. They just type the issue (or send a voice note/photo).</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ background: 'var(--brand)', color: '#1a1f24', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0 }}>3</div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Ticket is Auto-Logged</h4>
                  <p style={{ color: 'var(--slate)', margin: 0 }}>The backend logs the exact time, alerts the maintenance supervisor immediately, and starts the SLA clock.</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ background: 'var(--brand)', color: '#1a1f24', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0 }}>4</div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Owner Tracks Everything</h4>
                  <p style={{ color: 'var(--slate)', margin: 0 }}>You check your live dashboard (or Google Sheet) to see response times, pending fixes, and historic machine health.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            4. FEATURES GRID
            ============================================================ */}
        <section style={{ padding: '80px 0' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '2.5rem' }}>Built for MSME Factories</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
              <div style={{ background: 'var(--card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--brand)' }}>100% WhatsApp Native</h3>
                <p style={{ color: 'var(--slate)' }}>No new apps to download, no passwords for workers to forget. It lives where they already spend their time.</p>
              </div>
              <div style={{ background: 'var(--card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--brand)' }}>QR Tagging per Machine</h3>
                <p style={{ color: 'var(--slate)' }}>Instantly generate and print QR codes from the dashboard. Stick them on machines, and they become smart nodes.</p>
              </div>
              <div style={{ background: 'var(--card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--brand)' }}>Transparent Google Sheets</h3>
                <p style={{ color: 'var(--slate)' }}>Your data isn't locked in a black box. The entire backend mirrors to a live Google Sheet you can export anytime.</p>
              </div>
              <div style={{ background: 'var(--card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--brand)' }}>Works on Bad Internet</h3>
                <p style={{ color: 'var(--slate)' }}>WhatsApp handles slow 2G/3G connections effortlessly, meaning messages send reliably even deep inside metal factory floors.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            5. SOCIAL PROOF
            ============================================================ */}
        <section style={{ padding: '80px 0', background: 'var(--navy-2)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '2.5rem' }}>What Owners Are Saying</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              <div style={{ background: 'var(--card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative' }}>
                <div style={{ color: 'var(--brand)', fontSize: '3rem', position: 'absolute', top: '10px', right: '20px', opacity: 0.2 }}>"</div>
                <p style={{ fontSize: '1.1rem', fontStyle: 'italic', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                  [PLACEHOLDER] "Before TurboFix, my maintenance guys would waste an hour just finding out which machine was broken. Now the notification hits their phone before the operator even walks away."
                </p>
                <div>
                  <strong style={{ display: 'block' }}>[Name Placeholder]</strong>
                  <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Director, MIDC Auto Parts Mfg</span>
                </div>
              </div>
              <div style={{ background: 'var(--card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative' }}>
                <div style={{ color: 'var(--brand)', fontSize: '3rem', position: 'absolute', top: '10px', right: '20px', opacity: 0.2 }}>"</div>
                <p style={{ fontSize: '1.1rem', fontStyle: 'italic', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                  [PLACEHOLDER] "I didn't want to buy expensive software because my floor workers won't use it. But everyone uses WhatsApp. We deployed this to 40 machines in one afternoon."
                </p>
                <div>
                  <strong style={{ display: 'block' }}>[Name Placeholder]</strong>
                  <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Owner, Fabrication Unit</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            6. PRICING & CTA
            ============================================================ */}
        <section style={{ padding: '100px 0', textAlign: 'center' }}>
          <div className="container" style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Ready to stop the downtime leak?</h2>
            <p style={{ color: 'var(--slate)', fontSize: '1.1rem', marginBottom: '40px' }}>
              TurboFix is built for MSME budgets. Stop losing thousands of rupees to unrecorded downtime every month.
            </p>
            <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '16px 40px', fontSize: '1.2rem', background: 'var(--brand)', color: '#1a1f24', borderRadius: '8px', fontWeight: 'bold' }}>
              Get Started on WhatsApp
            </a>
          </div>
        </section>

        {/* ============================================================
            7. FAQ
            ============================================================ */}
        <section style={{ padding: '80px 0', background: 'var(--navy-2)' }}>
          <div className="container" style={{ maxWidth: '800px' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '2.5rem' }}>Frequently Asked Questions</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <details style={{ background: 'var(--card)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <summary style={{ fontWeight: 'bold', fontSize: '1.1rem', listStyle: 'none' }}>Do I need to install any apps?</summary>
                <p style={{ color: 'var(--slate)', marginTop: '16px' }}>No. Your workers only need the standard WhatsApp app that is already on their phones. Scanning the QR code automatically opens a chat with the TurboFix bot.</p>
              </details>
              <details style={{ background: 'var(--card)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <summary style={{ fontWeight: 'bold', fontSize: '1.1rem', listStyle: 'none' }}>What if the WiFi on the factory floor is bad?</summary>
                <p style={{ color: 'var(--slate)', marginTop: '16px' }}>WhatsApp is highly optimized for low-bandwidth environments. If they have a basic 2G or 3G signal, the text message will go through, which is much more reliable than heavy web apps.</p>
              </details>
              <details style={{ background: 'var(--card)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <summary style={{ fontWeight: 'bold', fontSize: '1.1rem', listStyle: 'none' }}>Where is my data stored?</summary>
                <p style={{ color: 'var(--slate)', marginTop: '16px' }}>All ticket data is synced instantly to a private Google Sheet that you own. You can view, export, or analyze it anytime. You are never locked in.</p>
              </details>
              <details style={{ background: 'var(--card)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <summary style={{ fontWeight: 'bold', fontSize: '1.1rem', listStyle: 'none' }}>How much does it cost?</summary>
                <p style={{ color: 'var(--slate)', marginTop: '16px' }}>Our pricing is designed for MSMEs, not massive enterprises. Contact us on WhatsApp for a quick demo and a flat-rate quote based on your factory size.</p>
              </details>
            </div>
          </div>
        </section>

      </div>
    </MainLayout>
  );
}
