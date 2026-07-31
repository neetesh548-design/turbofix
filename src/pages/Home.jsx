import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArchiveRestore,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  IndianRupee,
  PhoneCall,
  PlayCircle,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import MainLayout from '../layouts/MainLayout';
import CapabilityStrip from '../components/marketing/CapabilityStrip';
import ProofBanner from '../components/marketing/ProofBanner';
import { contentByLanguage, HERO_SCENARIOS } from '../data/marketingContent';

const EXPLORE_LINKS = [
  { icon: Wrench, title: 'Platform', body: 'Breakdown, records, shutdown, technician, and control-board tools in one system.', to: '/platform.html' },
  { icon: ArchiveRestore, title: 'Use old records', body: 'Turn paper logbooks and soft copies into approved machine knowledge.', to: '/records-platform.html' },
  { icon: RouteIcon, title: 'How it works', body: 'The 4-step verified loop from operator scan to Maintenance Head sign-off.', to: '/workflow.html' },
  { icon: PlayCircle, title: 'Product demo', body: 'Watch how operators, technicians, and maintenance heads use TurboFix.', to: '/demo.html' },
  { icon: IndianRupee, title: 'Pricing', body: 'Simple per-machine pricing with a 30-day free trial.', to: '/pricing.html' },
  { icon: PhoneCall, title: 'Get started', body: 'Book a 15-minute guided plant walkthrough.', to: '/contact.html' },
];

export default function Home() {
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [showStickyCta, setShowStickyCta] = useState(false);

  const activeScenario = HERO_SCENARIOS[selectedScenario] || HERO_SCENARIOS[0];

  useEffect(() => {
    document.title = 'TurboFix — AI Maintenance Control & Breakdown Decision Platform for Manufacturing SMEs';
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const updateStickyState = () => {
      setShowStickyCta(mediaQuery.matches && window.scrollY > 450);
    };

    updateStickyState();
    window.addEventListener('scroll', updateStickyState, { passive: true });
    window.addEventListener('resize', updateStickyState);

    return () => {
      window.removeEventListener('scroll', updateStickyState);
      window.removeEventListener('resize', updateStickyState);
    };
  }, []);

  return (
    <MainLayout>
      <div className="marketing-home">
        <section className="marketing-hero">
          <div className="container marketing-hero-grid">
            <div className="marketing-hero-copy">
              <span className="marketing-eyebrow"><Sparkles />{copy.eyebrow}</span>
              <h1>{copy.heroTitle}</h1>
              <p>{copy.heroBody}</p>
              <div className="marketing-actions">
                <Link className="marketing-btn marketing-btn-primary" to="/contact.html">{copy.bookDemo}<ArrowRight /></Link>
                <Link className="marketing-btn marketing-btn-secondary" to="/login.html">{copy.explore}</Link>
              </div>
              <div className="marketing-trust-row">
                {copy.trust.map((item) => <span key={item}><CheckCircle2 />{item}</span>)}
              </div>
            </div>

            <div className="marketing-product-preview" aria-label="TurboFix AI recommendation preview">
              <div className="marketing-preview-top">
                <span><span className="marketing-live-dot" />ACME3 LIVE</span>
                <span className="marketing-preview-role">Maintenance head</span>
              </div>
              <div className="marketing-scenario-tabs" aria-label="Select machine preview scenario">
                {HERO_SCENARIOS.map((scen, idx) => (
                  <button
                    key={scen.id}
                    type="button"
                    className={`marketing-scenario-tab ${selectedScenario === idx ? 'active' : ''}`}
                    onClick={() => setSelectedScenario(idx)}
                  >
                    {scen.label.split(' ')[0]} {scen.label.split(' ')[1]}
                  </button>
                ))}
              </div>
              <div className="marketing-preview-question">
                <span className="marketing-preview-icon"><BrainCircuit /></span>
                <div>
                  <small>{activeScenario.scope}</small>
                  <strong>{activeScenario.question}</strong>
                </div>
              </div>
              <div className="marketing-preview-answer">
                <div className="marketing-preview-priority">
                  <span>0{selectedScenario + 1}</span>
                  <div><small>Priority recommendation</small><strong>{activeScenario.finding}</strong></div>
                  <b className={`priority-badge-${activeScenario.priority.toLowerCase()}`}>{activeScenario.priority}</b>
                </div>
                <p>{activeScenario.reason}</p>
                <div className="marketing-preview-metrics">
                  <span><b>{activeScenario.estTime}</b> estimated work</span>
                  <span><b>{activeScenario.spares}</b></span>
                  <span><b>{activeScenario.sources}</b></span>
                </div>
                <button type="button">{activeScenario.action}<ArrowRight /></button>
              </div>
              <div className="marketing-preview-safe"><ShieldCheck />{activeScenario.safe}</div>
            </div>
          </div>
        </section>

        <CapabilityStrip items={copy.strip} />
        <ProofBanner />

        <section className="marketing-section marketing-outcomes" id="transformation">
          <div className="container">
            <div className="marketing-outcomes-heading">
              <div>
                <span>One operating story</span>
                <h2>From breakdown signal to verified closure—without the daily chase.</h2>
              </div>
              <p>Bring in old machine history, verify what is trustworthy, and then run daily maintenance from the same system instead of switching between records and execution.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <article className="stitch-glass-tile overflow-hidden flex flex-col justify-between group hover:-translate-y-2 transition-transform duration-300">
                <div className="relative h-48 overflow-hidden rounded-t-xl">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/plant_owner_executive.jpg`}
                    loading="lazy"
                    decoding="async"
                    alt="Plant Director & Factory Owner"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-90" />
                  <span className="absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-md">
                    For Factory Owners &amp; VPs
                  </span>
                </div>
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 mb-2">"I get real-time MTTR &amp; downtime cost clarity."</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      "No more morning surprise breakdowns or hidden production losses. TurboFix gives me live executive control, CapEx replacement alerts, and plant-wide uptime confidence."
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                    <span>Plant Director &amp; Owner View</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </article>

              <article className="stitch-glass-tile overflow-hidden flex flex-col justify-between group hover:-translate-y-2 transition-transform duration-300">
                <div className="relative h-48 overflow-hidden rounded-t-xl">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/maintenance_head_lead.jpg`}
                    loading="lazy"
                    decoding="async"
                    alt="Maintenance Head & Reliability Lead"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-90" />
                  <span className="absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 backdrop-blur-md">
                    For Maintenance Heads
                  </span>
                </div>
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 mb-2">"Work is closed only after verified photo proof."</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      "Every repair requires mandatory photo evidence, 5-Why Ishikawa root-cause analysis, and my sign-off before AI integrates it into our trusted machine knowledge base."
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-semibold text-sky-400">
                    <span>Maintenance Head Sign-off</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </article>

              <article className="stitch-glass-tile overflow-hidden flex flex-col justify-between group hover:-translate-y-2 transition-transform duration-300">
                <div className="relative h-48 overflow-hidden rounded-t-xl">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/technician_shift_lead.jpg`}
                    loading="lazy"
                    decoding="async"
                    alt="Shift Supervisor & Lead Technician"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-90" />
                  <span className="absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 backdrop-blur-md">
                    For Shift Techs &amp; Supervisors
                  </span>
                </div>
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 mb-2">"10-second QR scan to start work &amp; log notes."</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      "Shift A, B, and C technicians log repairs right at the machine with voice notes, photo proof, and auto-guided checklists without paper hassle."
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-semibold text-amber-400">
                    <span>Field Technician Work Queue</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </article>
            </div>
            <div className="marketing-executive-proof">
              <span><b>10 sec</b> QR breakdown reporting</span>
              <span><b>4 steps</b> to verified closure</span>
              <span><b>5-Why</b> structured root-cause analysis</span>
              <span><b>100%</b> exportable plant data</span>
            </div>
          </div>
        </section>

        <section className="marketing-section">
          <div className="container">
            <div className="marketing-section-heading">
              <span>Explore TurboFix</span>
              <h2>See how each part of the system works.</h2>
              <p>Dig into the platform, legacy records, workflow, live demo, pricing, or book a walkthrough.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {EXPLORE_LINKS.map(({ icon: Icon, title, body, to }) => (
                <Link
                  className="stitch-glass-tile group block p-8 rounded-2xl transition-all hover:-translate-y-1"
                  to={to}
                  key={title}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 transition-colors group-hover:bg-emerald-500/20">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{body}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>

      {showStickyCta && (
        <div className="marketing-mobile-sticky-bar">
          <div className="sticky-bar-copy">
            <strong>Protect Production Hours</strong>
            <small>10-sec QR reporting & 5-Why RCA</small>
          </div>
          <div className="sticky-bar-actions">
            <Link to="/contact.html" className="marketing-btn marketing-btn-primary marketing-btn-sm">
              Book Walkthrough <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
