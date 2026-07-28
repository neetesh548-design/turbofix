import React, { useEffect } from 'react';
import { Gauge, Route as RouteIcon } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import MainLayout from '../../layouts/MainLayout';
import PageHero from '../../components/marketing/PageHero';
import CapabilityStrip from '../../components/marketing/CapabilityStrip';
import ProofBanner from '../../components/marketing/ProofBanner';
import { contentByLanguage, workflowSteps } from '../../data/marketingContent';

export default function Workflow() {
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;

  useEffect(() => {
    document.title = 'How TurboFix Works — 4-Step Verified Maintenance Workflow';
  }, []);

  return (
    <MainLayout>
      <div className="marketing-home">
        <PageHero
          icon={RouteIcon}
          eyebrow={copy.workflowEyebrow}
          title={copy.workflowTitle}
          body={copy.workflowBody}
          primaryCta={{ label: copy.bookDemo, to: '/contact.html' }}
          secondaryCta={{ label: copy.explore, to: '/login.html' }}
        />

        <CapabilityStrip items={copy.strip} />
        <ProofBanner />

        <section className="marketing-section marketing-workflow" id="how">
          <div className="container marketing-workflow-grid">
            <div className="marketing-workflow-intro">
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
      </div>
    </MainLayout>
  );
}
