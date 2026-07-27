import React from 'react';
import { X, Command, Search, Plus, HelpCircle } from 'lucide-react';

export function KeyboardShortcutsModal({ open, onClose }) {
  if (!open) return null;

  const shortcuts = [
    { key: 'Cmd / Ctrl + K', description: 'Focus Global Search bar', icon: Search },
    { key: 'Cmd / Ctrl + N', description: 'Open Quick Report dialog', icon: Plus },
    { key: '?', description: 'Toggle Keyboard Shortcuts helper modal', icon: HelpCircle },
    { key: 'Esc', description: 'Close open dialog or clear active selection', icon: X },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface-card, #1E293B)',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          maxWidth: 480,
          width: '100%',
          padding: 24,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          color: '#F8FAFC',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, background: 'rgba(56,189,248,0.15)', borderRadius: 10, color: '#38BDF8' }}>
              <Command size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Keyboard Shortcuts</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94A3B8' }}>Speed up your plant maintenance workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          {shortcuts.map(({ key, description, icon: Icon }) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#CBD5E1', fontSize: '0.88rem' }}>
                <Icon size={16} style={{ color: '#94A3B8' }} />
                <span>{description}</span>
              </div>
              <kbd
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  color: '#38BDF8',
                }}
              >
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              background: '#0EA5E9',
              border: 'none',
              color: '#FFFFFF',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
