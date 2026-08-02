import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArchiveRestore, CheckCircle2, FileSearch, Layers3, ShieldCheck, Upload } from 'lucide-react';
import PageHero from '../../components/marketing/PageHero';
import FeatureCard from '../../components/marketing/FeatureCard';
import PublicPersonaMosaic from '../../components/marketing/PublicPersonaMosaic';

const SOURCES = [
  {
    icon: Upload,
    title: 'Paper records',
    body: 'Register pages, job cards, and inspection sheets become reviewable inputs.',
  },
  {
    icon: FileSearch,
    title: 'Digital files',
    body: 'PDFs, spreadsheets, Word files, and exports can all be uploaded together.',
  },
  {
    icon: ArchiveRestore,
    title: 'Technical docs',
    body: 'Manuals, BOMs, and spare lists add context to the machine history.',
  },
];

const OUTCOMES = [
  {
    icon: CheckCircle2,
    title: 'Faster troubleshooting',
    body: 'Approved history is easier to search when the next breakdown happens.',
  },
  {
    icon: ShieldCheck,
    title: 'Human approval',
    body: 'Nothing becomes trusted plant history until the Maintenance Head approves it.',
  },
  {
    icon: Layers3,
    title: 'Reusable knowledge',
    body: 'Verified records become a better starting point for repair and planning.',
  },
];

export default function RecordsPlatform() {
  useEffect(() => {
    document.title = 'TurboFix Records Platform';
  }, []);

  return (
    <div className="marketing-home">
      <PageHero
        icon={ArchiveRestore}
        eyebrow="Records platform"
        title="Turn old records into approved history."
        body="TurboFix lets you bring paper and digital maintenance records into one place, review them, and approve only what should become trusted machine memory."
        primaryCta={{ label: 'Book a plant walkthrough', to: '/contact.html' }}
        secondaryCta={{ label: 'Explore the live demo', to: '/demo.html' }}
        visual={
          <PublicPersonaMosaic
            cards={[
              {
                src: `${import.meta.env.BASE_URL}assets/records_ocr_digitization.jpg`,
                alt: 'Scanned maintenance register and OCR digitization',
                kicker: 'Records',
                title: 'Capture paper history',
                body: 'Photos and scans become a reviewable draft instead of being lost in storage.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/plant_settings_security.jpg`,
                alt: 'Approved document vault and secure plant settings',
                kicker: 'Approval',
                title: 'Keep human review in loop',
                body: 'Nothing becomes trusted history until the Maintenance Head approves it.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/maintenance_head_lead.jpg`,
                alt: 'Maintenance head reviewing approved machine history',
                kicker: 'Maintenance Head',
                title: 'Use approved memory',
                body: 'The next breakdown starts with history the team trusts.',
              },
            ]}
          />
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Existing records</span>
            <h2>Bring the history together</h2>
            <p>Start with one representative machine and upload the most useful records first.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SOURCES.map(({ icon, title, body }) => <FeatureCard key={title} icon={icon} title={title} body={body} />)}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Review and approval</span>
            <h2>Keep human judgment in the loop</h2>
            <p>TurboFix prepares a draft. The Maintenance Head decides what enters the trusted record set.</p>
          </div>
          <div className="marketing-workflow-callout">
            <ShieldCheck />
            <div>
              <strong>Draft first, approval second</strong>
              <small>That keeps the plant from treating uncertain data as fact.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Why it matters</span>
            <h2>What approved records unlock</h2>
            <p>Once the history is clean, the team can use it for the next breakdown, the next shutdown, and the next planning decision.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {OUTCOMES.map(({ icon, title, body }) => <FeatureCard key={title} icon={icon} title={title} body={body} />)}
          </div>
          <div className="marketing-actions justify-center mt-6">
            <Link className="marketing-btn marketing-btn-primary" to="/contact.html">Book a plant walkthrough</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
