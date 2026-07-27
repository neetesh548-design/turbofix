import React from 'react';
import { Award, Zap, CheckCircle2, Star, Flame } from 'lucide-react';

export function ShiftHeroLeaderboard({ technicians = [] }) {
  const heroes = [
    { name: 'Anil Kumar', role: 'Senior Tech', resolved: 14, avgTime: '38m', badge: '🏆 Zero Downtime Champ', points: 450 },
    { name: 'Ramesh Yadav', role: 'Forming Specialist', resolved: 11, avgTime: '45m', badge: '⚡ Quick Responder', points: 380 },
    { name: 'S. Patil', role: 'Supervisor Tech', resolved: 9, avgTime: '52m', badge: '🇯🇵 5-Why Master', points: 310 },
  ];

  return (
    <div
      style={{
        background: 'var(--surface-card, #1E293B)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: 16,
        color: '#F8FAFC',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ padding: 6, background: 'rgba(245,158,11,0.15)', borderRadius: 8, color: '#FBBF24' }}>
            <Award size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Shift Heroes &amp; Technician Leaderboard</h4>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Recognizing top maintenance contributions this week</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.12)', color: '#F87171', padding: '3px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>
          <Flame size={12} /> Active Shift
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {heroes.map((hero, idx) => (
          <div
            key={hero.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: idx === 0 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${idx === 0 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : '#CD7F32',
                  color: '#0F172A',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                #{idx + 1}
              </div>
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#F8FAFC' }}>{hero.name}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{hero.role}</span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(56,189,248,0.12)', color: '#38BDF8', padding: '1px 6px', borderRadius: 4 }}>
                    {hero.badge}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#34D399', fontSize: '0.82rem', fontWeight: 700, justifyContent: 'flex-end' }}>
                <CheckCircle2 size={14} /> {hero.resolved} resolved
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Avg response: {hero.avgTime}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
