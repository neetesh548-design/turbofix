import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { apiFetch } from '@/lib/api';
import { defaultRoles, getRoleLabel } from '@/lib/roles';

export default function Team() {
  const [team, setTeam] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('maintenance_technician');


  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('tf_user') || 'null');
      setCurrentUser(u);
    } catch {}
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load team
      const tResp = await apiFetch('/vault/team');
      if (!tResp.ok) throw new Error('Failed to load team list');
      const tData = await tResp.json();
      setTeam(Array.isArray(tData) ? tData : []);

      // Load custom roles
      const crResp = await apiFetch('/vault/custom-roles');
      if (crResp.ok) {
        const roleData = await crResp.json();
        setCustomRoles(Array.isArray(roleData) ? roleData : []);
      }
    } catch (err) {
      setError(err.message || 'An error occurred while loading team list.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const resp = await apiFetch('/auth/supervisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: phone || '',
          email: email || '',
          password,
          role,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.detail || 'Failed to onboard team member');
      }

      setSuccess(`Account for "${name}" successfully onboarded as ${getLabel(role)}.`);
      setShowAddForm(false);
      
      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setRole('maintenance_technician');

      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getLabel = (roleVal) => getRoleLabel(roleVal, customRoles);

  const isOwner = currentUser && currentUser.role === 'owner';

  // Combine default and custom roles for select dropdown
  const allAvailableRoles = [
    ...defaultRoles,
    ...customRoles.map((r) => ({ value: r.role_name, label: r.role_label }))
  ];

  return (
    <AppShell active="team">
      <div className="vault-wrap" style={{ maxWidth: '1000px', padding: '20px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>Team Directory</h1>
            <p style={{ color: 'var(--slate)', fontSize: '0.9rem', margin: '4px 0 0' }}>Manage technicians, supervisors, engineers, and plant directors access authorization permissions.</p>
          </div>
          {isOwner && (
            <button className="vault-btn vault-btn-ghost" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : '+ Onboard Staff'}
            </button>
          )}
        </div>

        {error && <div className="vault-error show" style={{ marginBottom: '16px' }}>{error}</div>}
        {success && <div className="vault-success" style={{ background: '#065f46', color: '#d1fae5', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

        {showAddForm && (
          <div className="vault-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>Onboard Staff Account</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="vault-form-grid">
                <div className="vault-field">
                  <label htmlFor="supName">Full Name</label>
                  <input type="text" id="supName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anil Sharma" required />
                </div>
                <div className="vault-field">
                  <label htmlFor="supRole">Access Authorization Role</label>
                  <select id="supRole" value={role} onChange={(e) => setRole(e.target.value)}>
                    {allAvailableRoles.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="vault-field">
                  <label htmlFor="supPhone">Phone Number</label>
                  <input type="text" id="supPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +919876543212" />
                </div>
                <div className="vault-field">
                  <label htmlFor="supEmail">Email Address</label>
                  <input type="email" id="supEmail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. anil@company.com" />
                </div>
                <div className="vault-field" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="supPassword">Sign In Password (Min 8 chars)</label>
                  <input type="password" id="supPassword" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength="8" required />
                </div>
              </div>
              <button type="submit" className="vault-btn vault-btn-primary" style={{ width: 'auto', marginTop: '14px', padding: '10px 24px' }}>Onboard Member</button>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate)' }}>Loading team directory...</div>
        ) : (
          <div className="vault-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="vault-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Contact Info</th>
                  <th>Authorization Badge</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {team.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--slate)', padding: '32px' }}>No team members found for this plant.</td></tr>
                ) : team.map((u) => (
                  <tr key={u.user_id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--slate-light)' }}>{u.user_id}</td>
                    <td style={{ fontWeight: '600' }}>{u.name}</td>
                    <td>
                      <div>{u.email || '—'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--slate)', marginTop: '2px' }}>{u.phone || '—'}</div>
                    </td>
                    <td>
                      <span className={`vault-role-badge ${u.role === 'owner' ? '' : u.role === 'supervisor' ? 'read-only' : 'medium-badge'}`}
                            style={
                              u.role === 'owner' ? { background: '#D1FAE5', color: '#065F46' } :
                              u.role === 'supervisor' ? { background: '#FEF3C7', color: '#92400E' } :
                              u.role === 'maintenance_head' ? { background: '#DBEAFE', color: '#1E40AF' } :
                              u.role === 'maintenance_engineer' ? { background: '#F3E8FF', color: '#6B21A8' } :
                              { background: '#E2E8F0', color: '#334155' }
                            }>
                        {getLabel(u.role)}
                      </span>
                    </td>
                    <td>{u.created_at || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
