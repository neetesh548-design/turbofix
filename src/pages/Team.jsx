import React, { useState, useEffect, useMemo } from 'react';
import AppShell from '../components/AppShell';
import ContactReveal from '../components/ContactReveal';
import { supabase } from '@/supabaseClient';
import { defaultRoles, getRoleLabel } from '@/lib/roles';

export default function Team() {
  const [team, setTeam] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('maintenance_technician');
  const [managerUserId, setManagerUserId] = useState('');
  const [department, setDepartment] = useState('Maintenance');
  const [plantLocation, setPlantLocation] = useState('');
  const [shift, setShift] = useState('');
  const [portalAccess, setPortalAccess] = useState(true);


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
      const { data: directoryData, error: directoryErr } = await supabase.functions.invoke('onboard_team_member', {
        body: { action: 'list' },
      });
      if (directoryErr) {
        let message = directoryErr.message;
        try {
          const errorBody = await directoryErr.context?.json();
          message = errorBody?.error || errorBody?.message || message;
        } catch {}
        throw new Error(message);
      }
      if (directoryData?.error) throw new Error(directoryData.error);
      const tData = (directoryData?.members || []).map(u => ({
        user_id: u.user_id,
        name: u.name,
        role: u.role,
        email_masked: u.email_masked,
        phone_masked: u.phone_masked,
        has_email: u.has_email,
        has_phone: u.has_phone,
        has_contact: u.has_contact,
        can_reveal_contact: u.can_reveal_contact !== false,
        portal_access: u.portal_access,
        can_receive_alerts: u.can_receive_alerts,
      }));
      setTeam(tData);
      setCustomRoles([]);
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
      if (portalAccess && !email.trim() && !phone.trim()) {
        throw new Error('Add an email address or mobile number for portal access.');
      }
      const { data, error: onboardErr } = await supabase.functions.invoke('onboard_team_member', {
        body: {
          name: name.trim(), phone: phone.trim(), email: email.trim(), password,
          role, manager_user_id: managerUserId, department: department.trim(),
          plant_location: plantLocation.trim(), shift: shift.trim(), portal_access: portalAccess,
        },
      });
      if (onboardErr) {
        let functionMessage = data?.error;
        try {
          const errorBody = await onboardErr.context?.json();
          functionMessage = errorBody?.error || errorBody?.message || functionMessage;
        } catch {}
        throw new Error(functionMessage || onboardErr.message || 'Team member could not be onboarded.');
      }
      if (data?.error) throw new Error(data.error);

      setSuccess(`Account for "${name}" successfully onboarded as ${getLabel(role)}.`);
      setShowAddForm(false);
      
      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setRole('maintenance_technician');
      setManagerUserId('');
      setDepartment('Maintenance');
      setPlantLocation('');
      setShift('');
      setPortalAccess(true);

      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getLabel = (roleVal) => getRoleLabel(roleVal, customRoles);

  const isOwner = currentUser && currentUser.role === 'owner';
  const techniciansCount = team.filter((member) => member.role === 'maintenance_technician').length;
  const portalCount = team.filter((member) => member.portal_access).length;
  const responseCount = team.filter((member) => member.can_receive_alerts).length;
  const visibleTeam = team.filter((member) => activeFilter === 'all'
    || (activeFilter === 'technicians' && member.role === 'maintenance_technician')
    || (activeFilter === 'portal' && member.portal_access)
    || (activeFilter === 'alerts' && member.can_receive_alerts));

  // Combine default and custom roles for select dropdown
  const allAvailableRoles = [
    ...defaultRoles.filter((availableRole) => availableRole.value !== 'owner'),
    ...customRoles.map((r) => ({ value: r.role_name, label: r.role_label }))
  ];

  const eligibleManagers = useMemo(() => {
    const managerRoles = role === 'maintenance_head'
      ? ['owner']
      : ['owner', 'maintenance_head', 'maintenance_engineer', 'supervisor'];
    return team.filter((member) => managerRoles.includes(member.role));
  }, [role, team]);

  useEffect(() => {
    if (managerUserId && !eligibleManagers.some((member) => member.user_id === managerUserId)) {
      setManagerUserId('');
    }
  }, [eligibleManagers, managerUserId]);

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

        {!loading && team.length > 0 && <section className="postlogin-summary" aria-label="Team summary filters">
          {[['all', team.length, 'All members'], ['technicians', techniciansCount, 'Technicians'], ['portal', portalCount, 'Portal access'], ['alerts', responseCount, 'Can receive alerts']].map(([key, value, label]) => <button type="button" className={activeFilter === key ? 'active' : ''} onClick={() => setActiveFilter(key)} key={key}><strong>{value}</strong><span>{label}</span><small>View people →</small></button>)}
        </section>}

        {showAddForm && (
          <div className="vault-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>Onboard Staff Account</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="team-onboard-grid">
                <p className="team-onboard-legend">Identity &amp; role</p>
                <div className="vault-field">
                  <label htmlFor="supName">Full name</label>
                  <input type="text" id="supName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anil Sharma" required />
                </div>
                <div className="vault-field">
                  <label htmlFor="supRole">Role</label>
                  <select id="supRole" value={role} onChange={(e) => setRole(e.target.value)}>
                    {allAvailableRoles.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="vault-field">
                  <label htmlFor="supManager">Reports to</label>
                  <select id="supManager" value={managerUserId} onChange={(e) => setManagerUserId(e.target.value)} required={eligibleManagers.length > 0}>
                    <option value="">Select reporting manager</option>
                    {eligibleManagers.map((member) => (
                      <option key={member.user_id} value={member.user_id}>{member.name} — {getLabel(member.role)}</option>
                    ))}
                  </select>
                </div>

                <p className="team-onboard-legend">Workplace</p>
                <div className="vault-field">
                  <label htmlFor="supDepartment">Department</label>
                  <input type="text" id="supDepartment" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Maintenance" />
                </div>
                <div className="vault-field">
                  <label htmlFor="supLocation">Plant / work area</label>
                  <input type="text" id="supLocation" value={plantLocation} onChange={(e) => setPlantLocation(e.target.value)} placeholder="e.g. Shop Floor A" />
                </div>
                <div className="vault-field">
                  <label htmlFor="supShift">Shift</label>
                  <input type="text" id="supShift" value={shift} onChange={(e) => setShift(e.target.value)} placeholder="e.g. General or Shift B" />
                </div>

                <p className="team-onboard-legend">Contact details</p>
                <div className="vault-field wide">
                  <label htmlFor="supPhone">Mobile number <span>Optional</span></label>
                  <input type="text" id="supPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91 98765 43212" />
                  <small>Shown as “not available” when left blank.</small>
                </div>
                <div className="vault-field wide">
                  <label htmlFor="supEmail">Email address <span>Optional</span></label>
                  <input type="email" id="supEmail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. anil@company.com" />
                  <small>Shown as “not available” when left blank.</small>
                </div>

                <div className="team-onboard-access">
                  <label className="team-portal-toggle">
                    <input type="checkbox" checked={portalAccess} onChange={(e) => setPortalAccess(e.target.checked)} />
                    <span><strong>Enable TurboFix portal access</strong><small>Lets this member sign in. Requires a mobile number or email plus a password.</small></span>
                  </label>
                  <div className="vault-field">
                    <label htmlFor="supPassword">Sign-in password {portalAccess ? <span>Required</span> : <span>Not needed for offline staff</span>}</label>
                    <input type="password" id="supPassword" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" minLength="8" required={portalAccess} disabled={!portalAccess} />
                  </div>
                </div>
              </div>
              <div className="team-onboard-actions">
                <button type="submit" className="vault-btn vault-btn-primary">Onboard Member</button>
                <button type="button" className="vault-btn vault-btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
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
                  <th>Name</th>
                  <th>Reports to</th>
                  <th>Contact Info</th>
                  <th>Authorization Badge</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {visibleTeam.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--slate)', padding: '32px' }}>{team.length ? 'No team members match this view.' : 'No team members found for this plant.'}</td></tr>
                ) : visibleTeam.map((u) => (
                  <tr key={u.user_id}>
                    <td>
                      <div style={{ fontWeight: '600' }}>{u.name}</div>
                      {[u.department, u.plant_location, u.shift].some(Boolean) && <div style={{ fontSize: '0.75rem', color: 'var(--slate)', marginTop: '3px' }}>{[u.department, u.plant_location, u.shift].filter(Boolean).join(' · ')}</div>}
                    </td>
                    <td>{u.manager_name || (u.role === 'owner' ? 'Top level' : 'Not assigned')}</td>
                    <td><ContactReveal member={u} compact /></td>
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
                    <td>
                      <span className={`team-access-status ${u.portal_access ? 'active' : 'offline'}`}>{u.portal_access ? 'Portal access' : 'Offline staff'}</span>
                      {!u.can_receive_alerts && <small className="team-alert-warning">Cannot receive mobile alerts</small>}
                    </td>
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
