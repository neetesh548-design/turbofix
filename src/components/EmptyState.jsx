import React from 'react';
import { PackageOpen } from 'lucide-react';

/**
 * EmptyState — Human-centered action-oriented empty state container.
 * Pillar 1 of "Designing User-Friendly Interfaces: Putting People First".
 */
export function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description = 'Try adjusting your search or filters to find what you are looking for.',
  primaryAction,
  secondaryAction,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`ui-empty-state glass-panel ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        borderRadius: '12px',
        margin: '20px 0',
        ...style,
      }}
    >
      <div
        className="ui-empty-icon-wrap"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(37, 211, 102, 0.1)',
          color: 'var(--primary)',
          marginBottom: '16px',
        }}
      >
        <Icon size={32} />
      </div>

      <h3
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '1.4rem',
          fontWeight: 700,
          margin: '0 0 8px 0',
          color: 'var(--foreground)',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          color: 'var(--muted-foreground)',
          fontSize: '0.9rem',
          maxWidth: '460px',
          margin: '0 0 24px 0',
          lineHeight: '1.5',
        }}
      >
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {primaryAction && (
            <button
              type="button"
              className="vault-btn vault-btn-primary"
              onClick={primaryAction.onClick}
              style={{
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
                fontWeight: 600,
                padding: '10px 20px',
                borderRadius: '8px',
              }}
            >
              {primaryAction.label}
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              className="vault-btn vault-btn-ghost"
              onClick={secondaryAction.onClick}
              style={{
                background: 'transparent',
                border: '1px solid var(--ui-border)',
                color: 'var(--foreground)',
                padding: '10px 16px',
                borderRadius: '8px',
              }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
