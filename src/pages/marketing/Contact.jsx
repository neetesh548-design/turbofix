import React, { useEffect } from 'react';
import { PhoneCall } from 'lucide-react';
import PageHero from '../../components/marketing/PageHero';
import ContactCard from '../../components/marketing/ContactCard';
import PublicPersonaMosaic from '../../components/marketing/PublicPersonaMosaic';

export default function Contact() {
  useEffect(() => {
    document.title = 'Book a TurboFix Plant Walkthrough';
  }, []);

  return (
    <div className="marketing-home">
      <PageHero
        icon={PhoneCall}
        eyebrow="Contact"
        title="Book a plant walkthrough."
        body="We’ll map TurboFix to one representative machine, show the flow, and answer the questions that matter for your plant."
        visual={
          <PublicPersonaMosaic
            cards={[
              {
                src: `${import.meta.env.BASE_URL}assets/plant_owner_executive.jpg`,
                alt: 'Factory owner meeting the TurboFix team',
                kicker: 'Owner',
                title: 'Ask about visibility',
                body: 'See how the team will know what matters first.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/maintenance_head_lead.jpg`,
                alt: 'Maintenance head reviewing the walkthrough',
                kicker: 'Maintenance Head',
                title: 'Ask about accountability',
                body: 'See how approval and proof stay attached to work.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/technician_shift_lead.jpg`,
                alt: 'Technician and shift lead during a plant walkthrough',
                kicker: 'Technician',
                title: 'Ask about daily work',
                body: 'See how the floor team uses the product without extra friction.',
              },
            ]}
          />
        }
      />

      <ContactCard />
    </div>
  );
}
