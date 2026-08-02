import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArchiveRestore, BrainCircuit, ClipboardCheck, Layers3, Wrench } from 'lucide-react';
import PageHero from '../../components/marketing/PageHero';
import FeatureCard from '../../components/marketing/FeatureCard';
import PublicPersonaMosaic from '../../components/marketing/PublicPersonaMosaic';

const CAPABILITIES = [
  {
    icon: Wrench,
    title: 'Report',
    body: 'Capture a breakdown quickly and route it to the right person.',
  },
  {
    icon: ClipboardCheck,
    title: 'Repair',
    body: 'Track evidence, notes, and progress until the job is verified.',
  },
  {
    icon: ArchiveRestore,
    title: 'Records',
    body: 'Keep approved maintenance history attached to the machine.',
  },
];

export default function Platform() {
  useEffect(() => {
    document.title = 'TurboFix Platform | Maintenance Workflows';
  }, []);

  return (
    <div className="marketing-home">
      <PageHero
        icon={Layers3}
        eyebrow="Product"
        title="Three capabilities. One plant flow."
        body="TurboFix connects breakdown reporting, repair execution, and approved machine history without forcing a full-plant digitization project."
        primaryCta={{ label: 'Book a plant walkthrough', to: '/contact.html' }}
        secondaryCta={{ label: 'Explore the live demo', to: '/demo.html' }}
        visual={
          <PublicPersonaMosaic
            cards={[
              {
                src: `${import.meta.env.BASE_URL}assets/qr_scanner_breakdown.jpg`,
                alt: 'Operator reporting a breakdown through QR scan',
                kicker: 'Operator',
                title: 'Breakdown reporting',
                body: 'Capture the first signal quickly from the floor.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/technician_field_repair.jpg`,
                alt: 'Technician working through a field repair',
                kicker: 'Technician',
                title: 'Repair execution',
                body: 'Track the work while the job is open.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/dashboard_executive_control.jpg`,
                alt: 'Owner and leadership dashboard showing plant control',
                kicker: 'Owner',
                title: 'Plant visibility',
                body: 'See what is open, what is done, and what still needs attention.',
              },
            ]}
          />
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Core capabilities</span>
            <h2>What the platform does</h2>
            <p>Keep the public story narrow. The product has more depth, but these three parts explain the value quickly.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CAPABILITIES.map(({ icon, title, body }) => <FeatureCard key={title} icon={icon} title={title} body={body} />)}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Product view</span>
            <h2>One workspace for the team</h2>
            <p>Operators report. Technicians act. Maintenance heads verify. Owners see what is open, what is done, and what is still waiting.</p>
          </div>
          <div className="marketing-workflow-callout">
            <BrainCircuit />
            <div>
              <strong>One machine record becomes the starting point</strong>
              <small>TurboFix is easiest to understand when the team maps one real machine first.</small>
            </div>
          </div>
          <div className="marketing-actions justify-center mt-6">
            <Link className="marketing-btn marketing-btn-primary" to="/records-platform.html">See records platform</Link>
            <Link className="marketing-btn marketing-btn-secondary" to="/workflow.html">See workflow</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
