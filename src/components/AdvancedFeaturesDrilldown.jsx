/**
 * Advanced Features Drill-down Panel
 * Shows non-MVP features in collapsible sections
 * In Full View mode, always shows content; in MVP mode, user can toggle
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useViewMode } from '../ViewModeContext';

export const AdvancedFeaturesDrilldown = ({
  isOpen = false,
  onToggle,
  children,
}) => {
  const { isFullMode } = useViewMode();

  // In full mode, always show; in MVP mode, user toggles
  const shouldShow = isFullMode || isOpen;

  return (
    <div className="advanced-features-drilldown" style={{ marginTop: isFullMode ? 0 : '2rem' }}>
      {/* Drill-down Header Button - hidden in full mode */}
      {!isFullMode && (
        <button
          type="button"
          className="advanced-features-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--slate)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 200ms ease',
          }}
        >
          <ChevronDown
            size={18}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          />
          <span>{isOpen ? 'Hide' : 'Show'} advanced features</span>
        </button>
      )}

      {/* Collapsible Content */}
      {shouldShow && (
        <div
          className="advanced-features-content"
          style={{
            marginTop: isFullMode ? 0 : '1rem',
            paddingTop: isFullMode ? 0 : '1rem',
            borderTop: isFullMode ? 'none' : '2px solid var(--border-color)',
            animation: 'slideDown 200ms ease',
          }}
        >
          {children}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .advanced-features-toggle:hover {
          backgroundColor: var(--bg-tertiary);
          borderColor: var(--border-color-hover);
        }

        .advanced-features-toggle:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
};

export default AdvancedFeaturesDrilldown;
