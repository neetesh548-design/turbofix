import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, ClipboardCheck, Gauge, Layers3 } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import MainLayout from '../../layouts/MainLayout';
import PageHero from '../../components/marketing/PageHero';
import CapabilityStrip from '../../components/marketing/CapabilityStrip';
import ProofBanner from '../../components/marketing/ProofBanner';
import FaqAccordion from '../../components/marketing/FaqAccordion';
import { contentByLanguage, platformFeatures, workflowSteps, roleCards } from '../../data/marketingContent';

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

        <section className="marketing-section" id="platform">
          <div className="container">
            <div className="marketing-section-heading">
              <span>{copy.platformEyebrow}</span>
              <h2>{copy.platformTitle}</h2>
              <p>{copy.platformBody}</p>
            </div>
            <div className="marketing-feature-grid">
              {platformFeatures.map(({ icon: Icon, title, body }, index) => (
                <article className="marketing-feature-card" key={title}>
                  <div className="marketing-feature-icon"><Icon /></div>
                  <span>0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-section marketing-workflow" id="how">
          <div className="container marketing-workflow-grid">
            <div className="marketing-workflow-intro">
              <span>{copy.workflowEyebrow}</span>
              <h2>{copy.workflowTitle}</h2>
              <p>{copy.workflowBody}</p>
              <div className="marketing-workflow-callout">
                <Gauge />
                <div><strong>One visible next step</strong><small>Everyone knows what needs attention, who owns it, and what evidence closes it.</small></div>
              </div>
            </div>
            <div className="marketing-workflow-list">
              {workflowSteps.map(({ icon: Icon, number, title, body }) => (
                <article key={number}>
                  <span>{number}</span>
                  <div className="marketing-workflow-icon"><Icon /></div>
                  <div><h3>{title}</h3><p>{body}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-section marketing-fit-section">
          <div className="container">
            <div className="marketing-section-heading">
              <span>{copy.fitEyebrow}</span>
              <h2>{copy.fitTitle}</h2>
              <p>{copy.fitBody}</p>
            </div>
            <div className="marketing-role-grid">
              {roleCards.map(({ icon: Icon, title, body }) => <article key={title}><Icon /><h3>{title}</h3><p>{body}</p></article>)}
            </div>
          </div>
        </section>

        <FaqAccordion title={copy.faqTitle} />

        <section className="marketing-section" style={{ textAlign: 'center' }}>
          <div className="container">
            <Link className="marketing-btn marketing-btn-primary" to="/contact.html">{copy.bookDemo}</Link>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
