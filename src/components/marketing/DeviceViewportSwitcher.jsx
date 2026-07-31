import React, { useState } from 'react';
import {
  Laptop,
  Maximize2,
  Monitor,
  RotateCcw,
  Smartphone,
  Tablet,
  Check,
  ExternalLink,
} from 'lucide-react';

const DEVICES = [
  {
    id: 'mobile',
    label: 'Mobile Phone',
    sublabel: 'iPhone 15 Pro (390 x 780)',
    icon: Smartphone,
    width: 390,
    height: 780,
    borderRadius: '44px',
    framePadding: '14px',
    type: 'mobile',
  },
  {
    id: 'tablet',
    label: 'Tablet',
    sublabel: 'iPad Air (820 x 680)',
    icon: Tablet,
    width: 820,
    height: 680,
    borderRadius: '28px',
    framePadding: '16px',
    type: 'tablet',
  },
  {
    id: 'laptop',
    label: 'Laptop',
    sublabel: 'MacBook Pro 14" (1100 x 650)',
    icon: Laptop,
    width: 1100,
    height: 650,
    borderRadius: '16px',
    framePadding: '20px 20px 32px',
    type: 'laptop',
  },
  {
    id: 'desktop',
    label: '4K Monitor',
    sublabel: 'Studio Display (1380 x 720)',
    icon: Monitor,
    width: 1380,
    height: 720,
    borderRadius: '12px',
    framePadding: '24px',
    type: 'desktop',
  },
];

const PREVIEW_PAGES = [
  { id: 'dashboard', label: 'Executive Dashboard', path: '/dashboard.html' },
  { id: 'records', label: 'Work Records Vault', path: '/records.html' },
  { id: 'machines', label: 'Machines Register', path: '/machines.html' },
  { id: 'qr-gateway', label: '10s QR Gateway', path: '/qr-gateway.html' },
];

export default function DeviceViewportSwitcher() {
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[2]);
  const [selectedPage, setSelectedPage] = useState(PREVIEW_PAGES[0]);
  const [key, setKey] = useState(0);

  const handleRefresh = () => setKey((k) => k + 1);

  const previewUrl = `${import.meta.env.BASE_URL.replace(/\/$/, '')}${selectedPage.path}`;

  return (
    <div className="stitch-glass-tile my-12 p-4 md:p-8 rounded-3xl border border-emerald-500/30 bg-slate-950/90 shadow-2xl overflow-hidden">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Device Viewport Stream
          </div>
          <h3 className="text-2xl font-extrabold text-white">Interactive Multi-Device Experience</h3>
          <p className="text-sm text-slate-400">Switch devices to preview real-time responsive UI rendering at exact screen resolutions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
          {DEVICES.map((device) => {
            const Icon = device.icon;
            const active = selectedDevice.id === device.id;
            return (
              <button
                key={device.id}
                type="button"
                onClick={() => setSelectedDevice(device)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon size={15} />
                <span>{device.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4 mb-6 px-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preview Page:</span>
          {PREVIEW_PAGES.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setSelectedPage(page)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedPage.id === page.id
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-900/50 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {page.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            Resolution: <strong className="text-emerald-400">{selectedDevice.sublabel}</strong>
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Reload Frame Stream"
          >
            <RotateCcw size={14} />
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-emerald-400 border border-slate-800 text-xs font-semibold transition-colors"
          >
            <span>Full Window</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <div className="relative flex justify-center items-center py-6 bg-slate-950/60 rounded-2xl border border-slate-900 min-h-[500px] overflow-x-auto">
        <div
          style={{
            width: selectedDevice.width,
            maxWidth: '100%',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="relative flex flex-col items-center"
        >
          <div
            style={{
              borderRadius: selectedDevice.borderRadius,
              padding: selectedDevice.framePadding,
            }}
            className="w-full bg-slate-900 border-2 border-slate-700/80 shadow-2xl shadow-emerald-950/40 relative overflow-hidden group"
          >
            {selectedDevice.type === 'mobile' && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-20 flex items-center justify-end px-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-ping" />
              </div>
            )}

            {selectedDevice.type === 'laptop' && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-3 bg-slate-950 rounded-b-lg z-20" />
            )}

            <div className="w-full bg-slate-950 rounded-xl overflow-hidden relative border border-slate-800" style={{ height: selectedDevice.height }}>
              <iframe
                key={key}
                src={previewUrl}
                title={`TurboFix Live Stream - ${selectedDevice.label}`}
                className="w-full h-full border-0 bg-slate-950"
                loading="lazy"
              />
            </div>

            {selectedDevice.type === 'laptop' && (
              <div className="w-[115%] -ml-[7.5%] h-3 bg-slate-800 rounded-b-xl border-t border-slate-700 flex justify-center items-center">
                <div className="w-16 h-1 bg-slate-700 rounded-full" />
              </div>
            )}
          </div>

          {selectedDevice.type === 'desktop' && (
            <div className="flex flex-col items-center -mt-1">
              <div className="w-24 h-12 bg-slate-800 border-x border-slate-700" />
              <div className="w-64 h-3 bg-slate-800 rounded-lg border border-slate-700 shadow-md" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
