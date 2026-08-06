import React from 'react';

export default function PublicPersonaMosaic({ cards = [], className = '', compact = false }) {
  if (!cards.length) return null;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'gap-3' : 'gap-4'} ${className}`.trim()}>
      {cards.map((card) => (
        <article
          key={card.title}
          className="stitch-glass-tile overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/80 shadow-md hover:border-emerald-500/40 transition-all"
        >
          <div className={`relative ${compact ? 'aspect-[16/10]' : 'aspect-[4/3]'} overflow-hidden`}>
            <img
              src={card.src}
              alt={card.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />
            <span className="absolute bottom-2 left-2 rounded-full border border-white/20 bg-slate-950/80 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 backdrop-blur-md">
              {card.kicker}
            </span>
          </div>
          <div className={compact ? 'p-3' : 'p-4'}>
            <h3 className={`${compact ? 'text-sm' : 'text-base'} font-extrabold text-white leading-snug`}>{card.title}</h3>
            <p className={`mt-1 ${compact ? 'text-xs' : 'text-sm'} text-slate-300 leading-snug line-clamp-2`}>{card.body}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
