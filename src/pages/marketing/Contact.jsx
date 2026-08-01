import React, { useEffect } from 'react';
import { PhoneCall } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import PageHero from '../../components/marketing/PageHero';
import CapabilityStrip from '../../components/marketing/CapabilityStrip';
import ProofBanner from '../../components/marketing/ProofBanner';
import FaqAccordion from '../../components/marketing/FaqAccordion';
import ContactCard from '../../components/marketing/ContactCard';
import { contentByLanguage } from '../../data/marketingContent';

export default function Contact() {
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;

  useEffect(() => {
    document.title = 'Book a TurboFix Plant Walkthrough — 15-Minute Guided Demo';
  }, []);

  return (
    <>
      <div className="marketing-home">
        <PageHero
          icon={PhoneCall}
          eyebrow={copy.contactEyebrow}
          title={copy.contactTitle}
          body={copy.contactBody}
        />

        <CapabilityStrip items={copy.strip} />
        <ProofBanner />

        <ContactCard />
        <FaqAccordion title={copy.faqTitle} />
      </div>
    </>
  );
}
