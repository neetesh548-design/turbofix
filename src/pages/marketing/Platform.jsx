import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, FileSearch, LockKeyhole, Wrench } from 'lucide-react';
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
            <div className="marketing-section-heading text-center mb-10">
              <span className="text-emerald-400 font-extrabold uppercase text-xs tracking-wider">All-In-One Plant Operations Layer</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">Unified Tools for Every Plant Role</h2>
              <p className="text-sm text-slate-300 max-w-2xl mx-auto mt-2">From shopfloor operators to shift leads, maintenance heads, and plant owners—TurboFix connects breakdown reporting, repair execution, legacy records, and executive control in one seamless workflow.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-10">
              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-44 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/qr_scanner_breakdown.jpg`}
                    alt="10-sec QR Breakdown Dispatch"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">Pillar 1</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">10-sec QR Dispatch</h3>
                <p className="text-xs text-slate-300 leading-relaxed">No app downloads. Operators scan machine QR tags to report failures with instant WhatsApp technician routing.</p>
              </div>

              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-44 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/technician_field_repair.jpg`}
                    alt="Technician 5-Why Repair AI"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">Pillar 2</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Technician AI Repair</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Technicians get 5-Why diagnostic recommendations, machine manual snippets, and verified spare part options.</p>
              </div>

              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-44 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/shutdown_overhaul_team.jpg`}
                    alt="Shutdown & Preventive Maintenance"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">Pillar 3</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Shutdown & Overhaul</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Plan preventive maintenance schedules, manage overhaul tasklists, and prevent unscheduled plant downtime.</p>
              </div>

              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-44 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/dashboard_executive_control.jpg`}
                    alt="Executive Control Room & Analytics"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">Pillar 4</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Executive Control Room</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Track plant MTBF, MTTR, SLA bottlenecks, and technician response times in real time across all lines.</p>
              </div>
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
              <Link to="/records-platform.html" className="marketing-text-link">See the full records workflow <ArrowRight /></Link>
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
