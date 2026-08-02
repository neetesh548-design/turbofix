import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Route as RouteIcon, ShieldCheck } from 'lucide-react';
import PageHero from '../../components/marketing/PageHero';
import PublicPersonaMosaic from '../../components/marketing/PublicPersonaMosaic';

const STEPS = [
  {
    step: '01',
    title: 'Report',
    body: 'Capture the issue from the floor and make the problem visible right away.',
  },
  {
    step: '02',
    title: 'Assign',
    body: 'Send the job to the right person so ownership is clear from the start.',
  },
  {
    step: '03',
    title: 'Repair',
    body: 'Track the repair work, evidence, and notes while the job is open.',
  },
  {
    step: '04',
    title: 'Verify',
    body: 'Approve the closure only after the repair is checked and accepted.',
  },
];

export default function Workflow() {
  useEffect(() => {
    document.title = 'TurboFix Workflow | Report to Verify';
  }, []);

  return (
    <div className="marketing-home">
      <PageHero
        icon={RouteIcon}
        eyebrow="How it works"
        title="Report. Assign. Repair. Verify."
        body="TurboFix keeps the public workflow short so teams can see the path from a breakdown signal to a closed job."
        primaryCta={{ label: 'Book a plant walkthrough', to: '/contact.html' }}
        secondaryCta={{ label: 'Explore the live demo', to: '/demo.html' }}
        visual={
          <PublicPersonaMosaic
            cards={[
              {
                src: `${import.meta.env.BASE_URL}assets/qr_scanner_breakdown.jpg`,
                alt: 'Operator scanning a QR code on the machine',
                kicker: 'Report',
                title: 'Start with a signal',
                body: 'The issue is captured from the floor before it gets buried in chat.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/technician_field_repair.jpg`,
                alt: 'Technician handling a machine repair in the field',
                kicker: 'Repair',
                title: 'Move to the right person',
                body: 'The job goes to the person who can act on it next.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/maintenance_head_lead.jpg`,
                alt: 'Maintenance head approving repair closure',
                kicker: 'Verify',
                title: 'Close with proof',
                body: 'The fix counts only after it is checked and accepted.',
              },
            ]}
          />
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Four steps</span>
            <h2>One sentence per step</h2>
            <p>Each step is narrow on purpose. The user should be able to explain the flow after one read.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {STEPS.map(({ step, title, body }) => (
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
          <div className="marketing-workflow-callout">
            <ShieldCheck />
            <div>
              <strong>Verified closure matters</strong>
              <small>The job stays open until the plant has enough proof to trust the fix.</small>
            </div>
          </div>
          <div className="marketing-actions justify-center mt-6">
            <Link className="marketing-btn marketing-btn-primary" to="/contact.html">Book a plant walkthrough</Link>
            <Link className="marketing-btn marketing-btn-secondary" to="/platform.html">See the product</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
