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

        <PricingCalculator />
        <FaqAccordion title={copy.faqTitle} />
      </div>
    </MainLayout>
  );
}
