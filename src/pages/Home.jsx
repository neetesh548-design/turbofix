import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArchiveRestore,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  Gauge,
  IndianRupee,
  MessageCircle,
  PhoneCall,
  PlayCircle,
  QrCode,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import CapabilityStrip from '../components/marketing/CapabilityStrip';
import ProofBanner from '../components/marketing/ProofBanner';
import FeatureCard from '../components/marketing/FeatureCard';
import RoiCalculator from '../components/marketing/RoiCalculator';
import QrDemoPreview from '../components/marketing/QrDemoPreview';
import { contentByLanguage, HERO_SCENARIOS } from '../data/marketingContent';

const SALES_WHATSAPP = import.meta.env.VITE_SALES_WHATSAPP || '919637438044';

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
    document.title = 'TurboFix — Zero Unplanned Downtime for Indian Manufacturing SMEs';
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
    <>
      <div className="marketing-home">
        {/* HERO SECTION */}
        <section className="marketing-hero">
          <div className="container marketing-hero-grid">
            <div className="marketing-hero-copy">
              <span className="marketing-eyebrow"><Sparkles />{copy.eyebrow}</span>
              <h1>Zero Unplanned Downtime for Indian Manufacturing.</h1>
              <p>Control breakdowns, track technician SLAs, digitize paper registers, and calculate plant financial downtime loss in one verified system.</p>
              
              <div className="marketing-actions">
                <Link className="marketing-btn marketing-btn-primary" to="/contact.html">
                  {copy.bookDemo}<ArrowRight />
                </Link>
                <Link className="marketing-btn marketing-btn-secondary" to="/login.html">
                  {copy.explore}
                </Link>
              </div>

              {/* Manufacturing Hub Badges */}
              <div className="marketing-trust-row flex-wrap gap-2 mt-4 pt-4 border-t border-slate-800">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                  <Factory size={13} className="text-emerald-400" />
                  Trusted by Industrial Hubs:
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">Pune Auto Cluster</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">Surat Textiles</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">Chennai OEMs</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">Ludhiana Engineering</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">Gujarat Pharma</span>
              </div>

              {/* Compliance & Trust Badges */}
              <div className="marketing-trust-row flex-wrap gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                  <ShieldCheck size={12} /> MSME Registered
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={12} /> GST Compliant Invoicing
                </span>
              </div>
            </div>

            {/* PRODUCT PREVIEW SCENARIO WIDGET */}
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

        {/* INTERACTIVE ROI & FINANCIAL DOWNTIME CALCULATOR */}
        <section className="marketing-section py-4">
          <div className="container">
            <RoiCalculator />
          </div>
        </section>

        {/* 10-SECOND PUBLIC QR BREAKDOWN DEMO */}
        <section className="marketing-section py-4">
          <div className="container">
            <QrDemoPreview />
          </div>
        </section>

        <ProofBanner />

        {/* ROLE PERSONAS SECTION */}
        <section className="marketing-section marketing-outcomes" id="transformation">
          <div className="container">
            <div className="marketing-outcomes-heading">
              <div>
                <span>One operating story</span>
                <h2>Tailored for Every Role on the Indian Shop Floor</h2>
              </div>
              <p>Bring in old machine history, verify what is trustworthy, and run daily maintenance from the same system across Factory Owners, Maintenance Heads, Engineers, and Technicians.</p>
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
                    <h3 className="text-lg font-bold text-slate-100 mb-2">"Real-time OEE &amp; downtime financial savings in ₹."</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      "No more morning surprise breakdowns or hidden production losses. TurboFix gives me live executive control, multi-plant switching, and daily WhatsApp digest reports."
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
                    For Shift Techs &amp; Workers
                  </span>
                </div>
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 mb-2">"10-second QR scan &amp; voice-to-text logging."</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      "Operators log defects with voice notes in Hindi/English ('बोलकर दर्ज करें'), 1-tap QR scan, and step-by-step visual checklists built for rugged factory floor use."
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-semibold text-amber-400">
                    <span>Field Worker &amp; Tech Work Queue</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </article>
            </div>
            <div className="marketing-executive-proof">
              <span><b>10 sec</b> QR breakdown reporting</span>
              <span><b>₹ Lakhs</b> calculated downtime savings</span>
              <span><b>5-Why</b> structured root-cause analysis</span>
              <span><b>100%</b> exportable plant data</span>
            </div>
          </div>
        </section>

        {/* EXPLORE FEATURES GRID */}
        <section className="marketing-section">
          <div className="container">
            <div className="marketing-section-heading">
              <span>Explore TurboFix</span>
              <h2>See how each part of the system works.</h2>
              <p>Dig into the platform, legacy records, workflow, live demo, pricing, or book a walkthrough.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {EXPLORE_LINKS.map(({ icon, title, body, to }) => (
                <FeatureCard key={title} icon={icon} title={title} body={body} to={to} />
              ))}
            </div>
          </div>
        </section>
      </div>

      {showStickyCta && (
        <div className="marketing-mobile-sticky-bar">
          <div className="sticky-bar-copy">
            <strong>Protect Production Hours</strong>
            <small>10-sec QR reporting &amp; 5-Why RCA</small>
          </div>
          <div className="sticky-bar-actions">
            <a
              href={`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent('Hi, I want to know more about TurboFix for my factory.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="sticky-bar-whatsapp"
              aria-label="Chat with TurboFix on WhatsApp"
            >
              <MessageCircle size={20} />
            </a>
            <Link to="/contact.html" className="marketing-btn marketing-btn-primary marketing-btn-sm">
              Book Walkthrough <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
