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
          primaryCta={{ label: 'Sign In to Platform', to: '/login.html' }}
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
                <Link className="marketing-btn marketing-btn-primary" to="/contact.html">Book Plant Walkthrough <ArrowRight /></Link>
              </aside>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-48 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/qr_scanner_breakdown.jpg`}
                    alt="Operator QR Scanner Demo"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">Operator View</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">10-sec QR Reporting</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Operators report machine issues by scanning QR codes on mobile browsers without app downloads.</p>
              </div>

              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-48 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/technician_field_repair.jpg`}
                    alt="Technician Field Repair Demo"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">Technician View</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Technician WhatsApp AI</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Receive instant WhatsApp breakdown alerts with 5-Why diagnostic guidance and spare part recommendations.</p>
              </div>

              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-48 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/dashboard_executive_control.jpg`}
                    alt="Control Room Executive Dashboard Demo"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg">Executive View</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Plant Owner Control Room</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Monitor plant-wide MTBF, MTTR, SLA compliance, and open breakdown work order queues in real time.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
