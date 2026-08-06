import React from 'react';
import { useTheme } from '../hooks/useTheme';

/**
 * BrandLogo — Unified, theme-consistent TurboFix Logo Component
 * Ensures 100% brand consistency before login, after login, and in footers/auth pages.
 *
 * @param {Object} props
 * @param {'sm' | 'md' | 'lg' | 'xl'} [props.size='md'] - Sizing option
 * @param {string} [props.tag] - Optional subtitle/tag (e.g. 'Workflow Layer' or 'Technologies')
 * @param {boolean} [props.compact=false] - If true, renders icon only
 * @param {string} [props.className=''] - Custom container class
 */
export default function BrandLogo({
  size = 'md',
  tag,
  compact = false,
  className = '',
}) {
  const { theme } = useTheme() || { theme: 'dark' };
  const isLight = theme === 'light';

  // Dimension mapping
  const dimensions = {
    sm: { box: 'w-7 h-7 rounded-lg', icon: 'w-3.5 h-3.5', text: 'text-sm', tag: 'text-[9px]' },
    md: { box: 'w-9 h-9 rounded-xl', icon: 'w-4.5 h-4.5', text: 'text-base', tag: 'text-[10px]' },
    lg: { box: 'w-11 h-11 rounded-2xl', icon: 'w-5 h-5', text: 'text-xl', tag: 'text-[11px]' },
    xl: { box: 'w-14 h-14 rounded-2xl', icon: 'w-7 h-7', text: 'text-2xl', tag: 'text-xs' },
  }[size] || { box: 'w-9 h-9 rounded-xl', icon: 'w-4.5 h-4.5', text: 'text-base', tag: 'text-[10px]' };

  return (
    <div className={`brand-logo-container inline-flex items-center gap-2.5 flex-shrink-0 select-none ${className}`}>
      {/* Icon Emblem */}
      <div
        className={`brand-logo-icon ${dimensions.box} bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-500/25 border border-emerald-400/30 flex-shrink-0 transition-transform hover:scale-105`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className={`${dimensions.icon} text-amber-400 fill-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]`} aria-hidden="true">
          <path d="M13 2L3 14h8l-1 8 11-12h-9l1-8z" />
        </svg>
      </div>

      {/* Brand Text */}
      {!compact && (
        <span className="brand-logo-text flex flex-col justify-center leading-none">
          <span className={`brand-name font-extrabold tracking-tight ${dimensions.text} font-sans`}>
            <span className={isLight ? 'text-slate-900' : 'text-white'}>TURBO</span>
            <span className="text-amber-400 ml-0.5">FIX</span>
          </span>
          {tag && (
            <span className={`brand-tag font-semibold uppercase tracking-widest text-slate-400 mt-0.5 ${dimensions.tag}`}>
              {tag}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
