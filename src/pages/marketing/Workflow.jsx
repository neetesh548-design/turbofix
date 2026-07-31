import React, { useEffect } from 'react';
import { Gauge, Route as RouteIcon } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import MainLayout from '../../layouts/MainLayout';
import PageHero from '../../components/marketing/PageHero';
import CapabilityStrip from '../../components/marketing/CapabilityStrip';
import ProofBanner from '../../components/marketing/ProofBanner';
import { contentByLanguage } from '../../data/marketingContent';

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
          <div className="container">
            <div className="marketing-section-heading">
              <span>Verified 4-Step Loop</span>
              <h2>From Operator QR Scan to Maintenance Head Sign-off</h2>
              <p>Every step in TurboFix is backed by verified machine context, real-time WhatsApp dispatch, and audit-ready RCA records.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-10">
              <div className="stitch-glass-tile overflow-hidden flex flex-col justify-between group rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-44 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/qr_scanner_breakdown.jpg`}
                    loading="lazy"
                    decoding="async"
                    alt="Step 1: Operator 10-sec QR Breakdown Scan"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg shadow-md">01</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">1. 10-sec QR Report</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Operators scan the machine's physical QR tag with any phone. No app download needed.</p>
              </div>

              <div className="stitch-glass-tile overflow-hidden flex flex-col justify-between group rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-44 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/technician_field_repair.jpg`}
                    loading="lazy"
                    decoding="async"
                    alt="Step 2: Technician AI Diagnosis & Field Repair"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg shadow-md">02</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">2. AI Diagnosis & Dispatch</h3>
                <p className="text-xs text-slate-300 leading-relaxed">WhatsApp automatically alerts the assigned technician with 5-Why root cause guidance.</p>
              </div>

              <div className="stitch-glass-tile overflow-hidden flex flex-col justify-between group rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-44 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/rca_team_collaboration.jpg`}
                    loading="lazy"
                    decoding="async"
                    alt="Step 3: Team Collaboration & Spares Verification"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg shadow-md">03</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">3. Spares & Work Execution</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Technicians verify replacement parts, record downtime, and log root-cause repair actions.</p>
              </div>

              <div className="stitch-glass-tile overflow-hidden flex flex-col justify-between group rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-44 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/maintenance_head_lead.jpg`}
                    loading="lazy"
                    decoding="async"
                    alt="Step 4: Maintenance Head Sign-off & Audit Closure"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg shadow-md">04</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">4. Verified Closure</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Maintenance Head approves closure. MTBF and MTTR metrics update live in executive dashboard.</p>
              </div>
            </div>

            <div className="marketing-workflow-callout" style={{ marginTop: '2rem' }}>
              <Gauge />
              <div><strong>One visible next step</strong><small>Everyone knows what needs attention, who owns it, and what evidence closes it.</small></div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
