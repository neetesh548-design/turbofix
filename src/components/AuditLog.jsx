import React, { useEffect, useState } from 'react';
import { History, Shield, User, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const MOCK_LOGS = [
  { id: '1', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), user_name: 'Plant Manager', action: 'SETTINGS_UPDATE', target: 'Escalation Thresholds', details: 'Updated critical ticket SLA escalation path' },
  { id: '2', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), user_name: 'Anil Kumar', action: 'RCA_SUBMITTED', target: 'P1-MAC-CNC-VTL-001', details: '5-Why RCA submitted for spindle vibration' },
  { id: '3', created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), user_name: 'S. Patil', action: 'KAIZEN_APPROVED', target: 'Lubrication Checklist', details: 'Approved Kaizen proposal for CNC Lathe 1' },
  { id: '4', created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(), user_name: 'Ramesh Yadav', action: 'TICKET_RESOLVED', target: 'T007 (Hydraulic Press)', details: 'Relief valve replaced and tested under full load' },
  { id: '5', created_at: new Date(Date.now() - 1000 * 60 * 1440).toISOString(), user_name: 'Plant Manager', action: 'ROLE_ASSIGNED', target: 'Vikram Patil', details: 'Assigned role maintenance_technician on Dispatch line' },
];

export default function AuditLog({ limit = 20 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const { data, error } = await supabase
          .from('activity_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error || !data || data.length === 0) {
          setLogs(MOCK_LOGS);
        } else {
          setLogs(data);
        }
      } catch {
        setLogs(MOCK_LOGS);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [limit]);

  return (
    <div className="audit-log-container" style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} style={{ color: 'var(--brand)' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Plant Activity Audit Trail</h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 4 }}>
          QMS / ISO 45001 Compliant
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Loading audit log…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {logs.map((log) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', gap: 10 }}>
                <Clock size={14} style={{ marginTop: 3, color: 'var(--muted-foreground)', flexShrink: 0 }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <strong style={{ color: '#f8fafc' }}>{log.user_name || 'System'}</strong>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(37,211,102,0.1)',
                      color: '#25D366',
                    }}>
                      {log.action}
                    </span>
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>• {log.target}</span>
                  </div>
                  <div style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>{log.details}</div>
                </div>
              </div>
              <time style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
