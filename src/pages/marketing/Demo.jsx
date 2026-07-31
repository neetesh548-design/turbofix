import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../LanguageContext';
import MainLayout from '../../layouts/MainLayout';
import PageHero from '../../components/marketing/PageHero';
import CapabilityStrip from '../../components/marketing/CapabilityStrip';
import ProofBanner from '../../components/marketing/ProofBanner';
import { contentByLanguage } from '../../data/marketingContent';

function DemoRoiCalculator() {
  const [machines, setMachines] = useState(20);
  const [downtimeHours, setDowntimeHours] = useState(30);
  const [hourlyRate, setHourlyRate] = useState(4000);

  const currentDowntimeLoss = downtimeHours * hourlyRate;
  const estimatedSavings = Math.round(currentDowntimeLoss * 0.45);
  const softwareInvestment = machines * 699;
  const netMonthlySavings = Math.max(0, estimatedSavings - softwareInvestment);
  const roiMultiplier = softwareInvestment > 0 ? (estimatedSavings / softwareInvestment).toFixed(1) : '0';

  return (
    <div className="stitch-glass-tile p-6 md:p-8 rounded-2xl border border-emerald-500/30 bg-slate-950/80 my-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Interactive Plant Economics</span>
          <h3 className="text-2xl font-extrabold text-white mt-1">Calculate Your Plant's ROI & Downtime Savings</h3>
          <p className="text-sm text-slate-400">Adjust sliders to see your factory's projected monthly savings and net ROI.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl">
          <span className="text-xl font-bold font-mono text-emerald-400">{roiMultiplier}x Net ROI</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center text-sm font-semibold mb-2">
              <span className="text-slate-300">Active Machines in Plant</span>
              <span className="text-emerald-400 font-mono text-base font-bold">{machines} Machines</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={machines}
              onChange={(e) => setMachines(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5</span>
              <span>25</span>
              <span>50</span>
              <span>100+</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-sm font-semibold mb-2">
              <span className="text-slate-300">Monthly Breakdown Hours</span>
              <span className="text-emerald-400 font-mono text-base font-bold">{downtimeHours} Hrs / Month</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={downtimeHours}
              onChange={(e) => setDowntimeHours(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5 hrs</span>
              <span>30 hrs</span>
              <span>60 hrs</span>
              <span>100+ hrs</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-sm font-semibold mb-2">
              <span className="text-slate-300">Production Loss per Hour</span>
              <span className="text-emerald-400 font-mono text-base font-bold">₹{hourlyRate.toLocaleString('en-IN')} / Hr</span>
            </div>
            <input
              type="range"
              min="1000"
              max="20000"
              step="500"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>₹1,000</span>
              <span>₹5,000</span>
              <span>₹10,000</span>
              <span>₹20,000</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Current Loss / Mo</span>
            <span className="text-xl md:text-2xl font-bold font-mono text-red-400">₹{currentDowntimeLoss.toLocaleString('en-IN')}</span>
            <span className="text-[11px] text-slate-500 block mt-1">Without automated response</span>
          </div>

          <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">45% MTTR Recovery</span>
            <span className="text-xl md:text-2xl font-bold font-mono text-emerald-400">₹{estimatedSavings.toLocaleString('en-IN')}</span>
            <span className="text-[11px] text-slate-500 block mt-1">Gross production value saved</span>
          </div>

          <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">TurboFix Investment</span>
            <span className="text-xl md:text-2xl font-bold font-mono text-slate-200">₹{softwareInvestment.toLocaleString('en-IN')}</span>
            <span className="text-[11px] text-slate-500 block mt-1">₹699 / machine / month</span>
          </div>

          <div className="bg-emerald-950/60 p-5 rounded-xl border border-emerald-500/40">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">Net Plant Gain / Mo</span>
            <span className="text-xl md:text-2xl font-bold font-mono text-emerald-300">₹{netMonthlySavings.toLocaleString('en-IN')}</span>
            <span className="text-[11px] text-emerald-400/80 block mt-1">Direct bottom-line profit boost</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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

            <DemoRoiCalculator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
              <div className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-xl">
                <div className="relative h-48 overflow-hidden rounded-xl mb-4">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/qr_scanner_breakdown.jpg`}
                    loading="lazy"
                    decoding="async"
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
                    loading="lazy"
                    decoding="async"
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
                    loading="lazy"
                    decoding="async"
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
