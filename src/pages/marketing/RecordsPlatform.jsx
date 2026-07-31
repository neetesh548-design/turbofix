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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-48 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/records_ocr_digitization.jpg`}
                    alt="Paper Logbook & Handwritten OCR Scanning"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">OCR Engine</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Paper Logbook OCR</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Turn handwritten register pages, PDF manuals, and vendor service invoices into searchable digital records.</p>
              </div>

              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-48 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/shutdown_overhaul_team.jpg`}
                    alt="Shutdown & Heavy Overhaul Logbook Digitization"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">Overhaul Vault</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Overhaul History Preservation</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Preserve historical annual overhaul reports, sensor calibration certificates, and major component replacements.</p>
              </div>

              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-48 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/plant_settings_security.jpg`}
                    alt="Approved Document Vault & Security"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">Plant Security</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Human Approval Gate</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Maintenance Head reviews and approves extracted machine context before AI uses it in live breakdown assistance.</p>
              </div>
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
