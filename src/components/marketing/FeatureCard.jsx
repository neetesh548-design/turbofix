import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * The one shared "icon + title + body" feature-card treatment used across
 * Home, Platform, and WhyTurboFix. Previously copy-pasted per page, which let
 * the three drift onto two different visual identities — see the review
 * history for src/pages/Home.jsx before extracting this. Change the look
 * here, not at a call site.
 */
export default function FeatureCard({ icon: Icon, title, body, to, badge, ctaLabel }) {
  const Tag = to ? Link : 'article';
  const tagProps = to ? { to, style: { color: 'inherit', textDecoration: 'none' } } : {};

  return (
    <Tag
      className="stitch-glass-tile group relative block p-8 rounded-2xl transition-all hover:-translate-y-1"
      data-testid="feature-card"
      {...tagProps}
    >
      {badge != null && (
        <span className="absolute top-6 right-8 text-xs font-bold text-slate-400">{badge}</span>
      )}
      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 transition-colors group-hover:bg-emerald-500/20">
        <Icon size={22} />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-300 leading-relaxed">{body}</p>
      {ctaLabel && (
        <span className="marketing-text-link">
          {ctaLabel} <ArrowRight size={14} />
        </span>
      )}
    </Tag>
  );
}
