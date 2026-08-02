import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, PlayCircle, Factory, Wrench, ShieldCheck } from 'lucide-react';
import PageHero from '../../components/marketing/PageHero';
import FeatureCard from '../../components/marketing/FeatureCard';
import PublicPersonaMosaic from '../../components/marketing/PublicPersonaMosaic';

const VIEWS = [
  {
    icon: Factory,
    title: 'Operator view',
    body: 'See how one breakdown is reported from a phone without turning the story into a long form.',
  },
  {
    icon: Wrench,
    title: 'Technician view',
    body: 'See how the work gets assigned, tracked, and closed with proof attached.',
  },
  {
    icon: ShieldCheck,
    title: 'Maintenance head view',
    body: 'See how approval keeps the plant history trusted before it is reused.',
  },
];

export default function Demo() {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    document.title = 'TurboFix Demo | See the Product in Action';
  }, []);

  const handlePlay = () => {
    videoRef.current?.play();
    setVideoPlaying(true);
  };

  return (
    <div className="marketing-home">
      <PageHero
        icon={PlayCircle}
        eyebrow="Demo"
        title="See one representative machine."
        body="This page shows a single breakdown scenario so visitors can understand the product without reading a long feature list."
        primaryCta={{ label: 'Book a plant walkthrough', to: '/contact.html' }}
        secondaryCta={{ label: 'Explore pricing', to: '/pricing.html' }}
        visual={
          <PublicPersonaMosaic
            cards={[
              {
                src: `${import.meta.env.BASE_URL}assets/qr_scanner_breakdown.jpg`,
                alt: 'Operator reporting a breakdown from a phone',
                kicker: 'Operator',
                title: 'Report the issue',
                body: 'See the first step from the shop floor.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/technician_shift_lead.jpg`,
                alt: 'Technician and shift lead working on a repair',
                kicker: 'Technician',
                title: 'Work the job',
                body: 'See how the assignment and evidence stay together.',
              },
              {
                src: `${import.meta.env.BASE_URL}assets/dashboard_executive_control.jpg`,
                alt: 'Executive dashboard for plant owners and leadership',
                kicker: 'Owner',
                title: 'See the control view',
                body: 'See what leadership gets after the job is closed.',
              },
            ]}
          />
        }
      />

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section-heading">
            <span>Scenario</span>
            <h2>One breakdown, three views</h2>
            <p>Each view answers a different buyer question without repeating the full story.</p>
          </div>
          <div className="marketing-demo-grid">
            <div className="marketing-video-wrap">
              <video ref={videoRef} src={`${import.meta.env.BASE_URL}demo.mp4`} preload="metadata" playsInline controls={videoPlaying} onEnded={() => setVideoPlaying(false)} />
              {!videoPlaying && (
                <button type="button" onClick={handlePlay} aria-label="Play TurboFix walkthrough">
                  <span>▶</span>
                  <b>Watch the walkthrough</b>
                  <small>Open the video to see a simple product flow.</small>
                </button>
              )}
            </div>
            <aside className="marketing-demo-checklist">
              <span>What the visitor learns</span>
              <h3>Why the workflow feels simple</h3>
              <ul>
                <li><CheckCircle2 />How a breakdown is reported</li>
                <li><CheckCircle2 />How the work gets assigned</li>
                <li><CheckCircle2 />How closure becomes trusted history</li>
              </ul>
              <Link className="marketing-btn marketing-btn-primary" to="/contact.html">
                Book a plant walkthrough <ArrowRight />
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VIEWS.map(({ icon, title, body }) => <FeatureCard key={title} icon={icon} title={title} body={body} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
