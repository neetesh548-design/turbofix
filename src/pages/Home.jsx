import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArchiveRestore,
  ClipboardCheck,
  Factory,
  Layers3,
  MessageCircle,
  Route as RouteIcon,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import FeatureCard from '../components/marketing/FeatureCard';
import PublicPersonaMosaic from '../components/marketing/PublicPersonaMosaic';
import QrDemoPreview from '../components/marketing/QrDemoPreview';
import { contentByLanguage } from '../data/marketingContent';

const PROBLEMS = [
  {
    icon: MessageCircle,
    title: 'Signals are scattered',
    body: 'Breakdowns arrive through calls, WhatsApp, paper, and memory, so the next step gets delayed.',
  },
  {
    icon: ClipboardCheck,
    title: 'Ownership gets fuzzy',
    body: 'Work can move between people without a clear owner, evidence, or closure.',
  },
  {
    icon: ArchiveRestore,
    title: 'History disappears',
    body: 'Useful repair details stay trapped in registers and spreadsheets instead of becoming plant memory.',
  },
];

const OUTCOMES = [
  {
    icon: RouteIcon,
    title: 'Respond faster',
    body: 'Report one issue, assign it, and keep the team aligned on the next visible action.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify closure',
    body: 'Repair proof and approval stay attached to the job before it counts as closed.',
  },
  {
    icon: Factory,
    title: 'Build machine history',
    body: 'Every approved repair becomes cleaner context for the next decision.',
  },
];

const WORKFLOW = [
  { step: '01', title: 'Report', body: 'Capture a breakdown from the floor with one QR-based action.' },
  { step: '02', title: 'Assign', body: 'Send the job to the right technician with clear ownership.' },
  { step: '03', title: 'Repair', body: 'Track evidence, notes, and parts against the open job.' },
  { step: '04', title: 'Verify', body: 'Approve the fix and keep the result in plant history.' },
];

const ROLES = [
  {
    icon: Factory,
    title: 'Factory Owner',
    body: 'See where downtime is happening and what the team is doing about it.',
  },
  {
    icon: Wrench,
    title: 'Maintenance Head',
    body: 'Verify work, enforce accountability, and keep trusted machine history.',
  },
];

const HOME_PERSONAS = [
  {
    src: `${import.meta.env.BASE_URL}assets/plant_owner_executive.jpg`,
    alt: 'Factory owner reviewing plant performance and downtime visibility',
    kicker: 'Factory Owner',
    title: 'See downtime and risk clearly',
    body: 'Get a quick read on where production is slipping and what is being done about it.',
  },
  {
    src: `${import.meta.env.BASE_URL}assets/maintenance_head_lead.jpg`,
    alt: 'Maintenance head reviewing verified repair work',
    kicker: 'Maintenance Head',
    title: 'Verify repair and ownership',
    body: 'Keep work accountable, approved, and attached to the right machine history.',
  },
  {
    src: `${import.meta.env.BASE_URL}assets/technician_shift_lead.jpg`,
    alt: 'Technician and shift lead working on a machine repair',
    kicker: 'Technician',
    title: 'Work with proof attached',
    body: 'See the job, the evidence, and the next action in one place.',
  },
  {
    src: `${import.meta.env.BASE_URL}assets/qr_scanner_breakdown.jpg`,
    alt: 'Operator reporting a breakdown from the shop floor',
    kicker: 'Operator',
    title: 'Report the issue fast',
    body: 'Capture the first signal from the floor before it gets lost in messages.',
  },
];

export default function Home() {
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;

  useEffect(() => {
    document.title = 'TurboFix | Verified Maintenance for Manufacturing';
  }, []);

  return (
    <div className="marketing-home">
      <section className="marketing-hero">
        <div className="container marketing-hero-grid">
          <div className="marketing-hero-copy">
            <span className="marketing-eyebrow"><Layers3 />{copy.eyebrow}</span>
            <h1>Turn maintenance signals into verified action.</h1>
            <p>Start with one representative machine, then use TurboFix to report breakdowns, assign work, verify repair, and keep approved history in one place.</p>
            <div className="marketing-actions">
              <Link className="marketing-btn marketing-btn-primary" to="/contact.html">
                {copy.bookDemo}<ArrowRight />
              </Link>
              <Link className="marketing-btn marketing-btn-secondary" to="/demo.html">
                {copy.explore}
              </Link>
            </div>
            <div className="marketing-trust-row">
              <span><ShieldCheck />One machine first</span>
              <span><ShieldCheck />Human approval before AI use</span>
              <span><ShieldCheck />Exportable plant history</span>
            </div>
          </div>

          <div className="marketing-page-hero-visual">
            <PublicPersonaMosaic cards={HOME_PERSONAS} />
            <div className="marketing-preview-safe mt-4">
              <ShieldCheck />
              Every role sees one story, but each person gets the part that matters to them.
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Three problems</span>
            <h2>What usually slows maintenance down</h2>
            <p>TurboFix is built for plants where the problem is not lack of effort. It is lack of one clean path from signal to closure.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PROBLEMS.map(({ icon, title, body }) => <FeatureCard key={title} icon={icon} title={title} body={body} />)}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Three outcomes</span>
            <h2>What changes once the flow is clear</h2>
            <p>Each outcome is practical. Shorter response time. Cleaner ownership. Better history for the next breakdown.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {OUTCOMES.map(({ icon, title, body }) => <FeatureCard key={title} icon={icon} title={title} body={body} />)}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Four steps</span>
            <h2>How work moves through TurboFix</h2>
            <p>Keep the public story simple: report, assign, repair, and verify.</p>
          </div>
          <div className="marketing-workflow-callout" style={{ marginBottom: '1.25rem' }}>
            <RouteIcon />
            <div><strong>One visible next step</strong><small>Everyone sees what needs attention and who owns it.</small></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {WORKFLOW.map(({ step, title, body }) => (
              <article key={title} className="stitch-glass-tile p-5 rounded-2xl">
                <span className="text-xs font-bold text-emerald-400">{step}</span>
                <h3 className="mt-2 text-lg font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>One proof block</span>
            <h2>See one machine move through the workflow</h2>
            <p>Use the QR demo to understand the public journey before you open the full product.</p>
          </div>
          <QrDemoPreview />
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Built for two roles</span>
            <h2>One story, two views</h2>
            <p>Factory owners care about visibility and downtime. Maintenance heads care about ownership, proof, and trusted history.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ROLES.map(({ icon, title, body }) => <FeatureCard key={title} icon={icon} title={title} body={body} />)}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container text-center">
          <h2 className="text-3xl font-black text-white">Start with one representative machine.</h2>
          <p className="mt-3 text-slate-300 max-w-2xl mx-auto">That is enough to show the workflow, verify the process, and decide whether TurboFix fits your plant.</p>
          <div className="marketing-actions justify-center mt-6">
            <Link className="marketing-btn marketing-btn-primary" to="/contact.html">
              {copy.bookDemo}<ArrowRight />
            </Link>
            <Link className="marketing-btn marketing-btn-secondary" to="/pricing.html">
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
