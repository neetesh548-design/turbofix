import React, { useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';

export default function WhyTurboFix() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="hero" style={{ padding: '120px 0 60px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '24px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            "My supervisor is just <span style={{ color: 'var(--amber)' }}>5 minutes</span> away..."
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--slate)', margin: '0 auto', maxWidth: '700px', lineHeight: 1.6 }}>
            Those 5 minutes cost more than you think. <strong style={{ color: 'var(--ink)' }}>TurboFix</strong> doesn't replace your supervisor. It gives them eyes across the entire floor — before they even start walking.
          </p>
        </div>
      </section>

      {/* Timeline Comparison */}
      <section style={{ padding: '60px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>What really happens in those "5 minutes"</h2>
            <p style={{ color: 'var(--slate)', maxWidth: '700px', margin: '0 auto' }}>
              Every unrecorded breakdown is a mystery your team solves from scratch next time it happens. A machine stops. The worker shouts, or walks to find someone. Here's the real timeline:
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px' }}>
            {/* Bad Timeline */}
            <div className="card" style={{ borderTop: '4px solid var(--red)', padding: '40px' }}>
              <h3 style={{ color: 'var(--red)', fontSize: '1.5rem', marginBottom: '32px', textAlign: 'center' }}>Without TurboFix</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <li style={{ borderLeft: '2px solid rgba(248, 113, 113, 0.3)', paddingLeft: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--red)' }}></div>
                  <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>0:00 — Machine stops</strong>
                  <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Worker notices the problem. Production on this machine halts. The clock starts.</span>
                </li>
                <li style={{ borderLeft: '2px solid rgba(248, 113, 113, 0.3)', paddingLeft: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--red)' }}></div>
                  <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>0:00 – 3:00 — Finding supervisor</strong>
                  <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Worker leaves the station. Walks to supervisor's last known location. Supervisor may be handling another issue.</span>
                </li>
                <li style={{ borderLeft: '2px solid rgba(248, 113, 113, 0.3)', paddingLeft: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--red)' }}></div>
                  <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>3:00 – 8:00 — Walk to machine</strong>
                  <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Supervisor drops current task. Walks to machine. Asks worker to explain verbally — details get lost.</span>
                </li>
                <li style={{ borderLeft: '2px solid rgba(248, 113, 113, 0.3)', paddingLeft: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--red)' }}></div>
                  <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>15:00 – 20:00 — Diagnosis begins</strong>
                  <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Technician finally sees the machine. Asks the worker again: "What happened?" No record exists.</span>
                </li>
              </ul>
              <div style={{ marginTop: '40px', background: 'rgba(248, 113, 113, 0.05)', padding: '24px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{color:'var(--slate)'}}>Time lost:</span><strong style={{color:'var(--red)'}}>20+ min</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{color:'var(--slate)'}}>People interrupted:</span><strong style={{color:'var(--red)'}}>3-5x</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--slate)'}}>Knowledge lost:</span><strong style={{color:'var(--red)'}}>100%</strong></div>
              </div>
            </div>

            {/* Good Timeline */}
            <div className="card" style={{ borderTop: '4px solid var(--amber)', padding: '40px', background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.4) 100%)', boxShadow: '0 0 40px rgba(245, 158, 11, 0.05)' }}>
              <h3 style={{ color: 'var(--amber)', fontSize: '1.5rem', marginBottom: '8px', textAlign: 'center' }}>With TurboFix</h3>
              <p style={{ textAlign: 'center', color: 'var(--slate)', fontSize: '0.9rem', marginBottom: '32px' }}>Same supervisor, 10x faster.</p>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <li style={{ borderLeft: '2px solid rgba(245, 158, 11, 0.3)', paddingLeft: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--amber)' }}></div>
                  <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>0:00 — Worker sends a WhatsApp</strong>
                  <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Scans the machine's QR code, describes issue in their language. Done in 30 seconds.</span>
                </li>
                <li style={{ borderLeft: '2px solid rgba(245, 158, 11, 0.3)', paddingLeft: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--amber)' }}></div>
                  <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>0:01 — Everyone notified instantly</strong>
                  <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Supervisor, technician, and owner receive WhatsApp alert with AI summary and urgency.</span>
                </li>
                <li style={{ borderLeft: '2px solid rgba(245, 158, 11, 0.3)', paddingLeft: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--amber)' }}></div>
                  <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>0:02 — Supervisor acknowledges</strong>
                  <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Replies "ACK T001 10min". Worker gets instant confirmation: "Help is on the way."</span>
                </li>
                <li style={{ borderLeft: '2px solid rgba(245, 158, 11, 0.3)', paddingLeft: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--amber)' }}></div>
                  <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>0:10 — Technician arrives prepared</strong>
                  <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Technician read AI summary, saw the photo, and knows what tools to bring. No wasted trip.</span>
                </li>
              </ul>
              <div style={{ marginTop: '40px', background: 'rgba(245, 158, 11, 0.05)', padding: '24px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{color:'var(--slate)'}}>Time to notify:</span><strong style={{color:'var(--amber)'}}>1 min</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{color:'var(--slate)'}}>People interrupted:</span><strong style={{color:'var(--amber)'}}>0</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--slate)'}}>Knowledge kept:</span><strong style={{color:'var(--amber)'}}>100%</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '60px 0', background: 'rgba(15, 23, 42, 0.4)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Built for the way supervisors actually work</h2>
            <p style={{ color: 'var(--slate)', maxWidth: '700px', margin: '0 auto' }}>
              These features don't add bureaucracy — they remove it. The supervisor does less walking and more managing.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div className="card" style={{ padding: '32px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>✅</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Acknowledge + ETA</h3>
              <p style={{ color: 'var(--slate)', fontSize: '0.95rem' }}>One reply. Instant accountability. Supervisor replies "ACK" via WhatsApp. The worker immediately gets an ETA.</p>
            </div>
            <div className="card" style={{ padding: '32px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🛡️</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Auto-Escalation</h3>
              <p style={{ color: 'var(--slate)', fontSize: '0.95rem' }}>Nothing falls through the cracks. If no one acknowledges within 15 minutes, the owner automatically gets an alert.</p>
            </div>
            <div className="card" style={{ padding: '32px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🧠</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>AI Summaries</h3>
              <p style={{ color: 'var(--slate)', fontSize: '0.95rem' }}>Worker speaks Hindi? TurboFix translates automatically. The supervisor gets a clean English brief with urgency level.</p>
            </div>
            <div className="card" style={{ padding: '32px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>📊</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Response Metrics</h3>
              <p style={{ color: 'var(--slate)', fontSize: '0.95rem' }}>Measure what matters. Dashboard tracks acknowledgment rate and average response time. Prove your team's speed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ROI */}
      <section style={{ padding: '80px 0' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>The numbers that matter</h2>
          <p style={{ color: 'var(--slate)', maxWidth: '700px', margin: '0 auto 60px' }}>For a factory with 10 machines and 2–3 breakdowns per day:</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            <div style={{ padding: '40px 24px', background: 'var(--card)', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--amber)', marginBottom: '16px' }}>40 min</div>
              <div style={{ color: 'var(--slate)' }}>Saved per incident. From 20+ min response down to instant notification.</div>
            </div>
            <div style={{ padding: '40px 24px', background: 'var(--card)', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--amber)', marginBottom: '16px' }}>2–3 hrs</div>
              <div style={{ color: 'var(--slate)' }}>Production recovered daily. That's machine uptime your competitors lose.</div>
            </div>
            <div style={{ padding: '40px 24px', background: 'var(--card)', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--amber)', marginBottom: '16px' }}>90 hrs</div>
              <div style={{ color: 'var(--slate)' }}>Saved per month. Machine time, supervisor time, and idle time recovered.</div>
            </div>
          </div>

          <div style={{ marginTop: '80px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '24px' }}>Ready to see it on your floor?</h2>
            <p style={{ color: 'var(--slate)', maxWidth: '600px', margin: '0 auto 32px' }}>TurboFix works through WhatsApp — no app downloads, no training, no IT setup.</p>
            <a href="/qr-generator.html" className="btn btn-primary" style={{ display: 'inline-block' }}>Generate a QR Tag for free</a>
          </div>
        </div>
      </section>

    </MainLayout>
  );
}
