import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function PageHero({ icon: Icon, eyebrow, title, body, primaryCta, secondaryCta, trust }) {
  return (
    <section className="marketing-page-hero">
      <div className="container marketing-page-hero-inner">
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
        {trust && trust.length > 0 && (
          <div className="marketing-trust-row">
            {trust.map((item) => <span key={item}><CheckCircle2 />{item}</span>)}
          </div>
        )}
      </div>
    </section>
  );
}
