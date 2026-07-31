import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, ClipboardCheck, Gauge, Layers3, Route as RouteIcon, Wrench } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import MainLayout from '../../layouts/MainLayout';
import PageHero from '../../components/marketing/PageHero';
import CapabilityStrip from '../../components/marketing/CapabilityStrip';
import ProofBanner from '../../components/marketing/ProofBanner';
import FeatureCard from '../../components/marketing/FeatureCard';
import { contentByLanguage } from '../../data/marketingContent';

export default function WhyTurboFix() {
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;

  useEffect(() => {
    document.title = 'Why TurboFix — Replace Paper, Excel & WhatsApp Maintenance Chaos';
  }, []);

  return (
    <MainLayout>
      <div className="marketing-home">
        <PageHero
          icon={Layers3}
          eyebrow="Why plants choose TurboFix"
          title="One verified system instead of five disconnected habits."
          body="Paper registers, Excel trackers, and WhatsApp groups all hold pieces of your maintenance story. TurboFix brings them together into one closed-loop system your whole team can trust."
          primaryCta={{ label: copy.bookDemo, to: '/contact.html' }}
          secondaryCta={{ label: copy.explore, to: '/login.html' }}
        />

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
            <div className="marketing-outcomes-grid">
              <article>
                <span>01</span>
                <Gauge />
                <h3>See operational risk</h3>
                <p>Track open breakdowns, SLA risk, MTTR, downtime cost, and plant health from one owner-ready view.</p>
                <strong>For plant owners</strong>
              </article>
              <article>
                <span>02</span>
                <ClipboardCheck />
                <h3>Enforce accountable work</h3>
                <p>Route every issue to an owner, require repair evidence, and close work only after verification.</p>
                <strong>For maintenance heads</strong>
              </article>
              <article>
                <span>03</span>
                <BrainCircuit />
                <h3>Build machine intelligence</h3>
                <p>Turn approved records, repairs, spares, and root causes into trusted machine-specific knowledge.</p>
                <strong>For long-term reliability</strong>
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
              <span>Go deeper</span>
              <h2>See the platform and the workflow that make this possible.</h2>
              <p>This page is about why plants switch. The mechanics live on their own pages.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FeatureCard
                icon={Wrench}
                title="Explore the full platform"
                body="Every tool from breakdown dispatch to executive control room, in one connected system."
                to="/platform.html"
                ctaLabel="See the platform"
              />
              <FeatureCard
                icon={RouteIcon}
                title="See how it works"
                body="The verified loop from operator QR scan to Maintenance Head sign-off, step by step."
                to="/workflow.html"
                ctaLabel="See the workflow"
              />
            </div>
          </div>
        </section>

        <section className="marketing-section" style={{ textAlign: 'center' }}>
          <div className="container">
            <Link className="marketing-btn marketing-btn-primary" to="/contact.html">{copy.bookDemo}</Link>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
