import React from 'react';

export default function PublicPersonaMosaic({ cards = [], className = '' }) {
  if (!cards.length) return null;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`.trim()}>
      {cards.map((card) => (
        <article
          key={card.title}
          className="stitch-glass-tile overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60"
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={card.src}
              alt={card.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
            <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur">
              {card.kicker}
            </span>
          </div>
          <div className="p-4">
            <h3 className="text-base font-bold text-white">{card.title}</h3>
            <p className="mt-1 text-sm text-slate-300">{card.body}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
