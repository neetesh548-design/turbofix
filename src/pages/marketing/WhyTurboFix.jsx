import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Factory, Layers3, MessageCircle, ShieldCheck, Wrench } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import PageHero from '../../components/marketing/PageHero';
import FeatureCard from '../../components/marketing/FeatureCard';
import PublicPersonaMosaic from '../../components/marketing/PublicPersonaMosaic';

const CHAOS = [
  {
    icon: MessageCircle,
    title: 'Signals are split',
    body: 'A breakdown may start in a call, move to WhatsApp, and end up in a notebook nobody checks.',
  },
  {
    icon: ClipboardCheck,
    title: 'Ownership is unclear',
    body: 'When the handoff is informal, nobody knows who owns the next move or the final closure.',
  },
  {
    icon: Wrench,
    title: 'History gets lost',
    body: 'The useful repair detail disappears, so the next breakdown starts from scratch.',
  },
];

const CHANGE = [
  {
    icon: Factory,
    title: 'One visible owner',
    body: 'Every job is assigned once, then tracked until it is either fixed or escalated.',
  },
  {
    icon: ShieldCheck,
    title: 'One proof trail',
    body: 'Evidence and approval stay with the work, not in a separate chat thread.',
  },
  {
    icon: Layers3,
    title: 'One plant memory',
    body: 'Approved work becomes reusable history for the next decision.',
  },
];

export default function WhyTurboFix() {
  const { lang } = useLanguage();

  useEffect(() => {
    document.title = 'Why TurboFix | Why Plants Switch';
  }, []);

  const heroTitle = lang === 'en' ? 'Why the old workflow fails' : 'Why the old workflow fails';
  const heroBody = lang === 'en'
    ? 'Paper, Excel, and WhatsApp split the job. TurboFix keeps the signal, the owner, and the proof together.'
    : 'Paper, Excel, and WhatsApp split the job. TurboFix keeps the signal, the owner, and the proof together.';

  return (
    <div className="marketing-home">
      <PageHero
        icon={Layers3}
        eyebrow="Why plants switch"
        title={heroTitle}
        body={heroBody}
        primaryCta={{ label: 'Book a plant walkthrough', to: '/contact.html' }}
        secondaryCta={{ label: 'Explore the live demo', to: '/demo.html' }}
        visual={
          <PublicPersonaMosaic
            cards={[
              {
                src: `${import.meta.env.BASE_URL}assets/plant_owner_executive.jpg`,
                alt: 'Factory owner looking over plant performance',
                kicker: 'Owner',
                title: 'See the cost of chaos',
                body: 'When downtime is scattered across calls and chats, risk becomes harder to see.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/maintenance_head_lead.jpg`,
                alt: 'Maintenance head reviewing work and proof',
                kicker: 'Maintenance Head',
                title: 'Keep work accountable',
                body: 'The handoff stays clear when proof and approval live with the job.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/technician_shift_lead.jpg`,
                alt: 'Technician preparing to work on a machine',
                kicker: 'Technician',
                title: 'Stop re-explaining jobs',
                body: 'The next action is visible, so the team spends less time asking where things stand.',
              },
            ]}
          />
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Current chaos</span>
            <h2>Where the status quo breaks</h2>
            <p>The problem is not effort. It is fragmentation.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CHAOS.map(({ icon, title, body }) => <FeatureCard key={title} icon={icon} title={title} body={body} />)}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Changed state</span>
            <h2>What the plant gets instead</h2>
            <p>TurboFix is narrow on purpose: one flow, one proof trail, one trusted history.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CHANGE.map(({ icon, title, body }) => <FeatureCard key={title} icon={icon} title={title} body={body} />)}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container text-center">
          <h2 className="text-3xl font-black text-white">See the change on one representative machine.</h2>
          <p className="mt-3 text-slate-300 max-w-2xl mx-auto">That is enough to show how the public workflow works before the team rolls anything wider.</p>
          <div className="marketing-actions justify-center mt-6">
            <Link className="marketing-btn marketing-btn-primary" to="/contact.html">Book a plant walkthrough</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
