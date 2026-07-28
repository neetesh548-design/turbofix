import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Database, FileSearch, LockKeyhole, Wrench } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import MainLayout from '../../layouts/MainLayout';
import PageHero from '../../components/marketing/PageHero';
import CapabilityStrip from '../../components/marketing/CapabilityStrip';
import ProofBanner from '../../components/marketing/ProofBanner';
import { contentByLanguage, platformFeatures, roleCards } from '../../data/marketingContent';

export default function Platform() {
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;

  useEffect(() => {
    document.title = 'TurboFix Platform — Breakdown, Records, Shutdown & Technician Tools in One System';
  }, []);

  return (
    <MainLayout>
      <div className="marketing-home">
        <PageHero
          icon={Wrench}
          eyebrow={copy.platformEyebrow}
          title={copy.platformTitle}
          body={copy.platformBody}
          primaryCta={{ label: copy.explore, to: '/login.html' }}
          secondaryCta={{ label: copy.bookDemo, to: '/contact.html' }}
        />

        <CapabilityStrip items={copy.strip} />
        <ProofBanner />

        <section className="marketing-section" id="platform">
          <div className="container">
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

        <section className="marketing-section marketing-knowledge-section">
          <div className="container marketing-knowledge-grid">
            <div className="marketing-knowledge-visual">
              <div className="marketing-file-card marketing-file-card-back">
                <FileSearch /><span>Service_Register_2019-2025.pdf</span><small>Handwritten scan • review completed</small>
              </div>
              <div className="marketing-file-card">
                <Database /><span>HydraulicPress_MachineData.md</span><small>Manuals • BOM • maintenance history</small>
                <div className="marketing-file-lines"><i /><i /><i /><i /></div>
                <b><LockKeyhole />Plant-approved AI context</b>
              </div>
            </div>
            <div className="marketing-knowledge-copy">
              <span>{copy.knowledgeEyebrow}</span>
              <h2>{copy.knowledgeTitle}</h2>
              <p>{copy.knowledgeBody}</p>
              <ul>{copy.knowledgeItems.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul>
              <Link to="/login.html" className="marketing-text-link">See machine workspace <ArrowRight /></Link>
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
      </div>
    </MainLayout>
  );
}
