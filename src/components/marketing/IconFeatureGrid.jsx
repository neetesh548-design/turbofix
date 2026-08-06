import React from 'react';

/**
 * Large-icon 3-up feature grid inspired by Elite Waste Solutions' service cards.
 * items: Array<{ icon: LucideComponent, title: string, body: string, accent?: string }>
 * accent — optional coloured eyebrow text above the title
 */
export default function IconFeatureGrid({ items = [], cols = 3 }) {
  return (
    <div
      className="icon-feature-grid"
      style={{ '--ifg-cols': cols }}
    >
      {items.map(({ icon: Icon, title, body, accent }) => (
        <article key={title} className="icon-feature-card">
          <div className="icon-feature-icon-wrap">
            <Icon size={26} strokeWidth={1.6} />
          </div>
          {accent && <span className="icon-feature-accent">{accent}</span>}
          <h3 className="icon-feature-title">{title}</h3>
          <p className="icon-feature-body">{body}</p>
        </article>
      ))}
    </div>
  );
}
