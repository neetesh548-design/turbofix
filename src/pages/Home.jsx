import React from 'react';
import { useLanguage } from '../LanguageContext';
import MainLayout from '../layouts/MainLayout';

export default function Home() {
  const { t } = useLanguage();

  return (
    <MainLayout>
      <div className="home-page">

        {/* HERO */}
        <section className="hero">
          <div className="container hero-center">
            <h1 className="hero-headline">
              {t('hero.title1')} <br />
              <span className="text-brand">{t('hero.title2')}</span>
            </h1>
            <p className="hero-lede">{t('hero.lede')}</p>
            <div className="hero-cta-row">
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="btn btn-whatsapp btn-lg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.227 5.227 0 00-.571-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {t('hero.btn')}
              </a>
            </div>

            {/* Hero Flow Pipeline */}
            <div className="hero-flow">
              <div className="flow-step">
                <div className="flow-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>
                </div>
                <span className="flow-label">{t('hero.step1')}</span>
              </div>
              <div className="flow-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div className="flow-step">
                <div className="flow-icon flow-icon--machine">
                  <span>🏭</span>
                </div>
                <span className="flow-label">{t('hero.step2')}</span>
                <span className="flow-detail">CNC Lathe #3</span>
              </div>
              <div className="flow-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div className="flow-step">
                <div className="flow-icon flow-icon--voice">
                  <span>🎙️</span>
                </div>
                <span className="flow-label">{t('hero.step3')}</span>
              </div>
              <div className="flow-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div className="flow-step">
                <div className="flow-icon flow-icon--ai">
                  <span>🤖</span>
                </div>
                <span className="flow-label">{t('hero.step4')}</span>
                <span className="flow-detail">"Spindle bearing wear"</span>
              </div>
              <div className="flow-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div className="flow-step">
                <div className="flow-icon flow-icon--notify">
                  <span>🔔</span>
                </div>
                <span className="flow-label">{t('hero.step5')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* THE PROBLEM */}
        <section className="section" id="problem">
          <div className="container">
            <h2 className="section-title">{t('problem.title')}</h2>
            <p className="section-sub">Every factory floor has the same invisible leaks draining profits.</p>
            <div className="problem-grid">
              <div className="problem-card card">
                <div className="problem-icon">🗣️</div>
                <h3>{t('problem.card1.title')}</h3>
                <p>{t('problem.card1.desc')}</p>
              </div>
              <div className="problem-card card">
                <div className="problem-icon">🤷‍♂️</div>
                <h3>{t('problem.card2.title')}</h3>
                <p>{t('problem.card2.desc')}</p>
              </div>
              <div className="problem-card card">
                <div className="problem-icon">🔁</div>
                <h3>{t('problem.card3.title')}</h3>
                <p>{t('problem.card3.desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section" id="how" style={{ background: 'var(--navy-2)' }}>
          <div className="container">
            <h2 className="section-title">{t('how.title') || 'How It Works'}</h2>
            <p className="section-sub">{t('how.sub') || 'Zero training required. If they can use WhatsApp, they can use TurboFix.'}</p>
            <div className="how-steps">
              <div className="how-step">
                <div className="how-num">1</div>
                <div className="how-content">
                  <h4>{t('how.step1.title') || 'Scan the Machine QR'}</h4>
                  <p>{t('how.step1.desc') || 'Operator scans the QR code sticker placed on the faulty machine.'}</p>
                </div>
              </div>
              <div className="how-step">
                <div className="how-num">2</div>
                <div className="how-content">
                  <h4>{t('how.step2.title') || 'Send a WhatsApp Message'}</h4>
                  <p>{t('how.step2.desc') || 'WhatsApp opens automatically with the Machine ID pre-filled. They just type the issue or send a voice note.'}</p>
                </div>
              </div>
              <div className="how-step">
                <div className="how-num">3</div>
                <div className="how-content">
                  <h4>{t('how.step3.title') || 'Ticket is Auto-Logged'}</h4>
                  <p>{t('how.step3.desc') || 'The backend logs the exact time, alerts the maintenance supervisor immediately, and starts the SLA clock.'}</p>
                </div>
              </div>
              <div className="how-step">
                <div className="how-num">4</div>
                <div className="how-content">
                  <h4>{t('how.step4.title') || 'Owner Tracks Everything'}</h4>
                  <p>{t('how.step4.desc') || 'Check your live dashboard to see response times, pending fixes, and historic machine health.'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="section">
          <div className="container">
            <h2 className="section-title">{t('features.title')}</h2>
            <p className="section-sub">{t('features.sub')}</p>
            <div className="features-grid">
              <div className="feature-card card">
                <h3>{t('features.whatsapp.title')}</h3>
                <p>{t('features.whatsapp.desc')}</p>
              </div>
              <div className="feature-card card">
                <h3>{t('features.qr.title')}</h3>
                <p>{t('features.qr.desc')}</p>
              </div>
              <div className="feature-card card">
                <h3>{t('features.sheets.title')}</h3>
                <p>{t('features.sheets.desc')}</p>
              </div>
              <div className="feature-card card">
                <h3>{t('features.offline.title')}</h3>
                <p>{t('features.offline.desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* VIDEO DEMO */}
        <section className="section demo-video-section" id="demo" style={{ background: 'var(--navy-2)' }}>
          <div className="container">
            <h2 className="section-title">{t('demo.title')}</h2>
            <p className="section-sub">{t('demo.sub')}</p>
            <div className="demo-video-wrap">
              <div className="demo-video-placeholder">
                <div className="demo-video-play">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <div className="demo-video-overlay">
                  <div className="demo-video-mockup">
                    <div className="demo-mock-bar">
                      <span className="demo-mock-dot" style={{ background: 'var(--red)' }} />
                      <span className="demo-mock-dot" style={{ background: 'var(--amber)' }} />
                      <span className="demo-mock-dot" style={{ background: 'var(--ok)' }} />
                    </div>
                    <div className="demo-mock-body">
                      <div className="demo-mock-chat">
                        <div className="demo-mock-bubble demo-mock-bubble--sys">{t('demo.mock.sys')}</div>
                        <div className="demo-mock-bubble demo-mock-bubble--out">{t('demo.mock.out')}</div>
                        <div className="demo-mock-bubble demo-mock-bubble--in">{t('demo.mock.in')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="demo-video-note">{t('demo.note')}</p>
            </div>
          </div>
        </section>

        {/* COMPARISON TABLE */}
        <section className="section compare-section" id="compare">
          <div className="container">
            <h2 className="section-title">{t('compare.title')}</h2>
            <p className="section-sub">{t('compare.sub')}</p>
            <div className="compare-table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>{t('compare.col.feature')}</th>
                    <th className="compare-col-old">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                      {t('compare.col.register')}
                    </th>
                    <th className="compare-col-cmms">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                      {t('compare.col.cmms')}
                    </th>
                    <th className="compare-col-tf">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      TurboFix
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{t('compare.row.setup')}</td>
                    <td>{t('compare.register.setup')}</td>
                    <td>{t('compare.cmms.setup')}</td>
                    <td className="compare-highlight">{t('compare.tf.setup')}</td>
                  </tr>
                  <tr>
                    <td>{t('compare.row.training')}</td>
                    <td>{t('compare.register.training')}</td>
                    <td>{t('compare.cmms.training')}</td>
                    <td className="compare-highlight">{t('compare.tf.training')}</td>
                  </tr>
                  <tr>
                    <td>{t('compare.row.cost')}</td>
                    <td>{t('compare.register.cost')}</td>
                    <td>{t('compare.cmms.cost')}</td>
                    <td className="compare-highlight">{t('compare.tf.cost')}</td>
                  </tr>
                  <tr>
                    <td>{t('compare.row.records')}</td>
                    <td><span className="compare-no">{t('compare.register.records')}</span></td>
                    <td>{t('compare.cmms.records')}</td>
                    <td className="compare-highlight">{t('compare.tf.records')}</td>
                  </tr>
                  <tr>
                    <td>{t('compare.row.alerts')}</td>
                    <td><span className="compare-no">{t('compare.register.alerts')}</span></td>
                    <td>{t('compare.cmms.alerts')}</td>
                    <td className="compare-highlight">{t('compare.tf.alerts')}</td>
                  </tr>
                  <tr>
                    <td>{t('compare.row.export')}</td>
                    <td><span className="compare-no">{t('compare.register.export')}</span></td>
                    <td>{t('compare.cmms.export')}</td>
                    <td className="compare-highlight">{t('compare.tf.export')}</td>
                  </tr>
                  <tr>
                    <td>{t('compare.row.offline')}</td>
                    <td>{t('compare.register.offline')}</td>
                    <td><span className="compare-no">{t('compare.cmms.offline')}</span></td>
                    <td className="compare-highlight">{t('compare.tf.offline')}</td>
                  </tr>
                  <tr>
                    <td>{t('compare.row.accountability')}</td>
                    <td><span className="compare-no">{t('compare.register.accountability')}</span></td>
                    <td>{t('compare.cmms.accountability')}</td>
                    <td className="compare-highlight">{t('compare.tf.accountability')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="section" style={{ background: 'var(--navy-2)' }}>
          <div className="container">
            <h2 className="section-title">{t('proof.title') || 'What Owners Are Saying'}</h2>
            <div className="proof-grid">
              <div className="proof-card card">
                <div className="proof-quote">"</div>
                <p className="proof-text">
                  "Before TurboFix, my maintenance guys would waste an hour just finding out which machine was broken. Now the notification hits their phone before the operator even walks away."
                </p>
                <div className="proof-author">
                  <strong>Factory Owner</strong>
                  <span>Director, MIDC Auto Parts Mfg</span>
                </div>
              </div>
              <div className="proof-card card">
                <div className="proof-quote">"</div>
                <p className="proof-text">
                  "I didn't want to buy expensive software because my floor workers won't use it. But everyone uses WhatsApp. We deployed this to 40 machines in one afternoon."
                </p>
                <div className="proof-author">
                  <strong>Factory Owner</strong>
                  <span>Owner, Fabrication Unit</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section cta-section" id="trial">
          <div className="container cta-center">
            <h2 className="section-title">{t('cta.title') || 'Ready to stop the downtime leak?'}</h2>
            <p className="section-sub">{t('cta.sub') || 'TurboFix is built for MSME budgets. Stop losing thousands of rupees to unrecorded downtime every month.'}</p>
            <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="btn btn-whatsapp btn-lg">
              Get Started on WhatsApp
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section className="section" id="faq" style={{ background: 'var(--navy-2)' }}>
          <div className="container">
            <h2 className="section-title">{t('faq.title') || 'Frequently Asked Questions'}</h2>
            <div className="faq-list">
              <details className="faq-item">
                <summary>{t('faq.q1') || 'Do I need to install any apps?'}</summary>
                <p>{t('faq.a1') || 'No. Your workers only need the standard WhatsApp app that is already on their phones. Scanning the QR code automatically opens a chat with the TurboFix bot.'}</p>
              </details>
              <details className="faq-item">
                <summary>{t('faq.q2') || 'What if the WiFi on the factory floor is bad?'}</summary>
                <p>{t('faq.a2') || 'WhatsApp is highly optimized for low-bandwidth environments. If they have a basic 2G or 3G signal, the text message will go through.'}</p>
              </details>
              <details className="faq-item">
                <summary>{t('faq.q3') || 'Where is my data stored?'}</summary>
                <p>{t('faq.a3') || 'All ticket data is synced instantly to a private Google Sheet that you own. You can view, export, or analyze it anytime.'}</p>
              </details>
              <details className="faq-item">
                <summary>{t('faq.q4') || 'How much does it cost?'}</summary>
                <p>{t('faq.a4') || 'Our pricing is designed for MSMEs, not massive enterprises. Contact us on WhatsApp for a quick demo and a flat-rate quote based on your factory size.'}</p>
              </details>
            </div>
          </div>
        </section>

        {/* LEAD CAPTURE */}
        <section className="section lead-section" id="contact">
          <div className="container lead-inner">
            <div className="lead-copy">
              <h2 className="section-title" style={{ textAlign: 'left' }}>{t('lead.title') || 'Start Your Free Pilot'}</h2>
              <p className="lead-sub">{t('lead.sub') || 'Fill in your details and our team will set up your factory within 24 hours. No credit card required.'}</p>
              <div className="lead-alt">
                <p>Or reach us directly:</p>
                <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  Chat on WhatsApp
                </a>
              </div>
            </div>
            <form className="lead-form" onSubmit={(e) => e.preventDefault()}>
              <div className="lead-row">
                <div className="lead-field">
                  <label>{t('lead.name') || 'Your Name'}</label>
                  <input type="text" placeholder="Rajesh Patil" />
                </div>
                <div className="lead-field">
                  <label>{t('lead.phone') || 'WhatsApp Number'}</label>
                  <input type="tel" placeholder="+91 98765 43210" />
                </div>
              </div>
              <div className="lead-field">
                <label>{t('lead.company') || 'Company Name'}</label>
                <input type="text" placeholder="Shree Industries Pvt Ltd" />
              </div>
              <div className="lead-field">
                <label>{t('lead.machines') || 'Number of Machines'}</label>
                <input type="number" placeholder="e.g. 15" />
              </div>
              <button type="submit" className="btn btn-whatsapp btn-lg lead-submit">
                {t('lead.submit') || 'Request Free Setup'}
              </button>
              <p className="lead-note">No spam. We'll only WhatsApp you about your pilot setup.</p>
            </form>
          </div>
        </section>

      </div>
    </MainLayout>
  );
}
