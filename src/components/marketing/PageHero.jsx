import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function PageHero({ icon: Icon, eyebrow, title, body, primaryCta, secondaryCta, trust, visual }) {
  const hasVisual = Boolean(visual);
  const hasTrust = Array.isArray(trust) && trust.length > 0;

  return (
    <section className="marketing-page-hero">
      <div className={`container ${hasVisual ? 'grid gap-8 items-center lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]' : 'marketing-page-hero-inner'}`}>
        <div className="marketing-page-hero-copy">
          {eyebrow && (
            <span className="marketing-eyebrow">
              {Icon && <Icon />}
              {eyebrow}
            </span>
          )}
          <h1>{title}</h1>
          {body && <p>{body}</p>}
          {(primaryCta || secondaryCta) && (
            <div className="marketing-actions">
              {primaryCta && (
                <Link className="marketing-btn marketing-btn-primary" to={primaryCta.to}>
                  {primaryCta.label}<ArrowRight />
                </Link>
              )}
              {secondaryCta && (
                <Link className="marketing-btn marketing-btn-secondary" to={secondaryCta.to}>
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
          {hasTrust && (
            <div className="marketing-trust-row">
              {trust.map((item) => <span key={item}><CheckCircle2 />{item}</span>)}
            </div>
          )}
        </div>
        {hasVisual && <div className="marketing-page-hero-visual">{visual}</div>}
      </div>
    </section>
  );
}
