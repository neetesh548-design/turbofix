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
    <section className="rd-supervisor-focus" aria-label={ariaLabel}>
      <div className={`rd-supervisor-focus-card ${tone}`}>
        <span className="rd-tech-focus-kicker">{kicker}</span>
        <div className="rd-tech-focus-head">
          <div>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
          {pill ? <span className={`rd-tech-pill ${tone}`}>{pill}</span> : null}
        </div>

        {meta.length > 0 && (
          <div className="rd-tech-focus-meta">
            {meta.map((item) => {
              const Icon = item.icon;
              return (
                <span key={item.label || item.text}>
                  {Icon ? <Icon size={14} aria-hidden="true" /> : null}
                  {item.text}
                </span>
              );
            })}
          </div>
        )}

        {actions.length > 0 && (
          <div className="rd-tech-focus-actions">
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
      </div>

      <div className="rd-tech-priorities">
        {priorities.map((item) => (
          <article key={item.label} className={`rd-tech-priority ${item.tone || ''}`}>
            <span className="rd-tech-priority-label">{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.help}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
