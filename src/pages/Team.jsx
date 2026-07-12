import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';

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

  const token = localStorage.getItem('tf_token');
  const apiBase = localStorage.getItem('tf_api_base') || (['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://127.0.0.1:8000' : 'https://turbofix-backend-ehxb.onrender.com');

  const defaultRoles = [
    { value: 'maintenance_technician', label: 'Maintenance Technician' },
    { value: 'supervisor', label: 'Maintenance Supervisor' },
    { value: 'maintenance_engineer', label: 'Maintenance Engineer' },
    { value: 'maintenance_head', label: 'Maintenance Head' },
    { value: 'owner', label: 'Owner / Plant Director' }
  ];

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('tf_user') || 'null');
      setCurrentUser(u);
    } catch (_) {}
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Load team
      const tResp = await fetch(`${apiBase}/vault/team`, { headers });
      if (!tResp.ok) throw new Error('Failed to load team list');
      const tData = await tResp.json();
      setTeam(tData);

      // Load custom roles
      const crResp = await fetch(`${apiBase}/vault/custom-roles`, { headers });
      if (crResp.ok) {
        setCustomRoles(await crResp.json());
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
      const resp = await fetch(`${apiBase}/auth/supervisors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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

      setSuccess(`Account for "${name}" successfully onboarded as ${getRoleLabel(role)}.`);
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

  const getRoleLabel = (roleVal) => {
    const defaultFound = defaultRoles.find((r) => r.value === roleVal);
    if (defaultFound) return defaultFound.label;
    
    const customFound = customRoles.find((r) => r.role_name === roleVal);
    if (customFound) return customFound.role_label;
    
    return roleVal.replace('_', ' ');
  };

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
                {team.map((u) => (
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
                        {getRoleLabel(u.role)}
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
