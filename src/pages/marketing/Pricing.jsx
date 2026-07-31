import React, { useEffect } from 'react';
import { IndianRupee } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import MainLayout from '../../layouts/MainLayout';
import PageHero from '../../components/marketing/PageHero';
import CapabilityStrip from '../../components/marketing/CapabilityStrip';
import ProofBanner from '../../components/marketing/ProofBanner';
import FaqAccordion from '../../components/marketing/FaqAccordion';
import PricingCalculator from '../../components/marketing/PricingCalculator';
import { contentByLanguage } from '../../data/marketingContent';

export default function Pricing() {
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;

  useEffect(() => {
    document.title = 'TurboFix Pricing — Simple Per-Machine Plans for Indian SME Factories';
  }, []);

  return (
    <MainLayout>
      <div className="marketing-home">
        <PageHero
          icon={IndianRupee}
          eyebrow="Simple per-machine pricing"
          title="Pay only for the machines you manage."
          body="Transparent pricing tailored for Indian SME factories. Includes a 30-day free trial, full onboarding support, and no hidden fees."
          primaryCta={{ label: copy.explore, to: '/login.html' }}
          secondaryCta={{ label: copy.bookDemo, to: '/contact.html' }}
        />

        <CapabilityStrip items={copy.strip} />
        <ProofBanner />

        <section className="marketing-section py-12">
          <div className="container">
            <div className="marketing-section-heading mb-10 text-center">
              <span className="text-emerald-400 font-extrabold uppercase text-xs tracking-wider">Complete Platform Included</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">Every Plan Unlocks Full Plant Capabilities</h2>
              <p className="text-sm text-slate-300 max-w-2xl mx-auto mt-2">No tier lockouts. Every factory gets unlimited operator WhatsApp reporting, AI-driven RCA diagnostics, document vault access, and live control boards.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-48 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/plant_owner_executive.jpg`}
                    alt="Plant Owner Executive Dashboard"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">Full Control</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Executive Dashboards</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Real-time visibility into machine MTBF, MTTR, SLA compliance, and open breakdown work orders across shifts.</p>
              </div>

              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-48 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/inventory_warehouse_spares.jpg`}
                    alt="Warehouse Spare Parts & Inventory"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">Zero Waste</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Spare Parts Tracking</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Automated spare parts consumption logs tied directly to work orders with minimum stock alert thresholds.</p>
              </div>

              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-48 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/kaizen_innovation_shopfloor.jpg`}
                    alt="Kaizen & Continuous Improvement"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">Continuous Growth</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Kaizen & 5S Workflows</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Capture operator kaizen ideas, track 5S audit scores, and eliminate repeat machine failures systematically.</p>
              </div>
            </div>
          </div>
        </section>

        <PricingCalculator />
        <FaqAccordion title={copy.faqTitle} />
      </div>
    </MainLayout>
  );
}
