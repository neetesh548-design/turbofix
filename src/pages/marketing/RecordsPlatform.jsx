import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArchiveRestore, ArrowRight, CheckCircle2, Database, FileCheck2, FileSearch, Image, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import MainLayout from '../../layouts/MainLayout';
import PageHero from '../../components/marketing/PageHero';
import CapabilityStrip from '../../components/marketing/CapabilityStrip';
import ProofBanner from '../../components/marketing/ProofBanner';
import { contentByLanguage, recordSourceIcons, recordStepIcons, recordOutcomeIcons } from '../../data/marketingContent';

export default function RecordsPlatform() {
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;

  useEffect(() => {
    document.title = 'Digitize Maintenance Records — AI Machine Knowledge from Old Logbooks | TurboFix';
  }, []);

  return (
    <MainLayout>
      <div className="marketing-home">
        <PageHero
          icon={ArchiveRestore}
          eyebrow={copy.recordsEyebrow}
          title={copy.recordsTitle}
          body={copy.recordsBody}
          primaryCta={{ label: copy.recordsCta, to: '/login.html' }}
          secondaryCta={{ label: copy.bookDemo, to: '/contact.html' }}
        />

        <CapabilityStrip items={copy.strip} />
        <ProofBanner />

        <section className="marketing-section marketing-records-section" id="records">
          <div className="container">
            <div className="marketing-records-grid">
              <div className="marketing-records-copy">
                <div className="marketing-record-sources">
                  {copy.recordsSources.map(({ title, body }, index) => {
                    const Icon = recordSourceIcons[index];
                    return <article key={title}><span><Icon /></span><div><h3>{title}</h3><p>{body}</p></div></article>;
                  })}
                </div>
                <div className="marketing-record-safety"><ShieldCheck /><div><strong>{copy.recordsSafetyTitle}</strong><span>{copy.recordsSafetyBody}</span></div></div>
              </div>

              <div className="marketing-record-review" aria-label="AI record review preview">
                <header><div><span className="marketing-live-dot" />{copy.recordsReviewKicker}</div><b>ACME3</b></header>
                <div className="marketing-record-document">
                  <span><Image /></span>
                  <div><strong>{copy.recordsReviewTitle}</strong><small>{copy.recordsReviewMeta}</small></div>
                  <b>Draft</b>
                </div>
                <div className="marketing-record-confidence"><span><b>AI extraction confidence</b><strong>82%</strong></span><i><b /></i><small>Low-confidence values are highlighted for human checking.</small></div>
                <div className="marketing-record-extracted">
                  {copy.recordsExtracted.map((item, index) => <span key={item}><FileCheck2 /><small>{item}</small><b>{[48, 12, 9, 16][index]}</b></span>)}
                </div>
                <div className="marketing-record-approval"><span><LockKeyhole /><small>{copy.recordsDraftLabel}</small></span><button type="button"><ShieldCheck />Approve for AI use</button></div>
              </div>
            </div>

            <div className="marketing-record-flow">
              {copy.recordsSteps.map(({ title, body }, index) => {
                const Icon = recordStepIcons[index];
                return <article key={title}><div><span>{index + 1}</span><Icon /></div><h3>{title}</h3><p>{body}</p></article>;
              })}
            </div>

            <div className="marketing-record-outcomes">
              {copy.recordsOutcomes.map(({ title, body }, index) => {
                const Icon = recordOutcomeIcons[index];
                return <article key={title}><Icon /><div><h3>{title}</h3><p>{body}</p></div></article>;
              })}
              <Link className="marketing-record-cta" to="/login.html">{copy.recordsCta}<ArrowRight /></Link>
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
      </div>
    </MainLayout>
  );
}
