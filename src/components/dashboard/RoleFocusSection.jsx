/**
 * RoleFocusSection — the single "start here" card every role board leads with.
 *
 * One card, four optional zones in a fixed order: kicker → title/body/pill →
 * meta chips → actions → a compact stat strip. Nothing here duplicates the
 * KPI row below it in its own dashboard — this card exists to say "look at
 * this one thing first", not to repeat every number on the page.
 */
import React from 'react';

export default function RoleFocusSection({
  ariaLabel,
  tone = 'ok',
  title,
  body,
  pill,
  meta = [],
  actions = [],
  priorities = [],
  kicker = 'Start here',
}) {
  return (
    <section className={`rd-focus rd-focus-${tone}`} aria-label={ariaLabel}>
      <span className="rd-focus-kicker">{kicker}</span>

      <div className="rd-focus-head">
        <div className="rd-focus-copy">
          {title ? <h3>{title}</h3> : null}
          {body ? <p>{body}</p> : null}
        </div>
        {pill ? <span className={`rd-focus-pill ${tone}`}>{pill}</span> : null}
      </div>

      {meta.length > 0 && (
        <div className="rd-focus-meta">
          {meta.map((item) => {
            const Icon = item.icon;
            return (
              <span key={item.label || item.text}>
                {Icon ? <Icon size={13} aria-hidden="true" /> : null}
                {item.text}
              </span>
            );
          })}
        </div>
      )}

      {actions.length > 0 && (
        <div className="rd-focus-actions">
          {actions.map((action, index) => (
            <a
              key={`${action.href}-${action.label}`}
              className={`rd-btn ${index === 0 ? 'rd-btn-primary' : ''}`}
              href={action.href}
            >
              {action.label}
            </a>
          ))}
        </div>
      )}

      {priorities.length > 0 && (
        <div className="rd-focus-stats">
          {priorities.map((item) => (
            <div key={item.label} className={`rd-focus-stat ${item.tone || ''}`} title={item.help}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
