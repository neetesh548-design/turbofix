import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../LanguageContext';
import MainLayout from '../../layouts/MainLayout';
import PageHero from '../../components/marketing/PageHero';
import CapabilityStrip from '../../components/marketing/CapabilityStrip';
import ProofBanner from '../../components/marketing/ProofBanner';
import { contentByLanguage } from '../../data/marketingContent';

export default function Demo() {
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    document.title = 'Watch the TurboFix Demo — Breakdown Reporting, Repair Proof & MTTR Tracking';
  }, []);

  const handlePlay = () => {
    videoRef.current?.play();
    setVideoPlaying(true);
  };

  return (
    <MainLayout>
      <div className="marketing-home">
        <PageHero
          icon={PlayCircle}
          eyebrow={copy.demoEyebrow}
          title={copy.demoTitle}
          body={copy.demoBody}
          primaryCta={{ label: copy.demoLogin, to: '/login.html' }}
          secondaryCta={{ label: copy.bookDemo, to: '/contact.html' }}
        />

        <CapabilityStrip items={copy.strip} />
        <ProofBanner />

        <section className="marketing-section marketing-demo-section" id="demo">
          <div className="container">
            <div className="marketing-demo-grid">
              <div className="marketing-video-wrap">
                <video ref={videoRef} src={`${import.meta.env.BASE_URL}demo.mp4`} preload="metadata" playsInline controls={videoPlaying} onEnded={() => setVideoPlaying(false)} />
                {!videoPlaying && (
                  <button type="button" onClick={handlePlay} aria-label="Play AI-generated TurboFix walkthrough">
                    <span>▶</span>
                    <b>Watch the AI-generated walkthrough</b>
                    <small>Illustrative video — explore the live product below</small>
                  </button>
                )}
              </div>
              <aside className="marketing-demo-checklist">
                <span>What you can explore</span>
                <h3>See how TurboFix works in practice</h3>
                <ul>{copy.demoList.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul>
                <Link className="marketing-btn marketing-btn-primary" to="/login.html">{copy.demoLogin}<ArrowRight /></Link>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
