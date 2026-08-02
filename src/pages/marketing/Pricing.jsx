import React, { useEffect } from 'react';
import { IndianRupee, ShieldCheck, Settings, Users } from 'lucide-react';
import PageHero from '../../components/marketing/PageHero';
import FeatureCard from '../../components/marketing/FeatureCard';
import PricingCalculator from '../../components/marketing/PricingCalculator';
import FaqAccordion from '../../components/marketing/FaqAccordion';
import PublicPersonaMosaic from '../../components/marketing/PublicPersonaMosaic';

const INCLUSIONS = [
  {
    icon: Settings,
    title: 'How pricing works',
    body: 'Pick the machine count, then see the monthly plan before you talk to sales.',
  },
  {
    icon: ShieldCheck,
    title: 'What is included',
    body: 'Reporting, repair tracking, records, and approval are part of the same flow.',
  },
  {
    icon: Users,
    title: 'Onboarding',
    body: 'Start with one machine and one walkthrough before you expand to the rest of the plant.',
  },
];

export default function Pricing() {
  useEffect(() => {
    document.title = 'TurboFix Pricing | Per Machine Plans';
  }, []);

  return (
    <div className="marketing-home">
      <PageHero
        icon={IndianRupee}
        eyebrow="Pricing"
        title="Pricing that starts small."
        body="See the plan before you commit. TurboFix is designed to begin with one representative machine and a short walkthrough."
        primaryCta={{ label: 'Book a plant walkthrough', to: '/contact.html' }}
        secondaryCta={{ label: 'Explore the demo', to: '/demo.html' }}
        visual={
          <PublicPersonaMosaic
            cards={[
              {
                src: `${import.meta.env.BASE_URL}assets/plant_owner_executive.jpg`,
                alt: 'Factory owner reviewing pricing and plant value',
                kicker: 'Owner',
                title: 'See value before you buy',
                body: 'Start with a plan that fits one machine and one pilot.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/dashboard_executive_control.jpg`,
                alt: 'Executive control dashboard showing plant visibility',
                kicker: 'Leadership',
                title: 'Know what the team gets',
                body: 'Pricing should answer what is included and what the plant can see.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/inventory_warehouse_spares.jpg`,
                alt: 'Spare parts warehouse and inventory visibility',
                kicker: 'Operations',
                title: 'Plan with real scope',
                body: 'Onboarding starts small, then expands when the workflow is proven.',
              },
            ]}
          />
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>What buyers want to know</span>
            <h2>Remove the buying uncertainty</h2>
            <p>The page should answer price, scope, and onboarding without making the visitor hunt for details.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {INCLUSIONS.map(({ icon, title, body }) => <FeatureCard key={title} icon={icon} title={title} body={body} />)}
          </div>
        </div>
      </section>

      <PricingCalculator />
      <FaqAccordion title="Pricing questions" />
    </div>
  );
}
