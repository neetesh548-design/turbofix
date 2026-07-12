import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';

export default function Settings() {
  const [companyInfo, setCompanyInfo] = useState(null);
  const [escalationPath, setEscalationPath] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddRole, setShowAddRole] = useState(false);

  // New Role Form States
  const [newRoleLabel, setNewRoleLabel] = useState('');

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
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch dashboard data for company info
      const dResp = await fetch(`${apiBase}/vault/dashboard`, { headers });
      if (!dResp.ok) throw new Error('Failed to load company details');
      const dData = await dResp.json();
      setCompanyInfo({
        name: dData.company_name,
        code: localStorage.getItem('tf_user') ? JSON.parse(localStorage.getItem('tf_user')).company_code : '',
        quota: dData.kpis?.total_machines + (dData.unassigned_machines?.length || 0) || 5,
        machinesUsed: dData.kpis?.total_machines || 0,
      });

      // 2. Fetch Custom Roles
      let customRolesData = [];
      const rolesResp = await fetch(`${apiBase}/vault/custom-roles`, { headers });
      if (rolesResp.ok) {
        customRolesData = await rolesResp.json();
        setCustomRoles(customRolesData);
      }

      // 3. Fetch Escalation config
      const escResp = await fetch(`${apiBase}/vault/escalation`, { headers });
      if (escResp.ok) {
        setEscalationPath(await escResp.json());
      }
    } catch (err) {
      setError(err.message || 'An error occurred while loading settings.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (roleVal) => {
    const defaultFound = defaultRoles.find((r) => r.value === roleVal);
    if (defaultFound) return defaultFound.label;
    
    const customFound = customRoles.find((r) => r.role_name === roleVal);
    if (customFound) return customFound.role_label;
    
    return roleVal.replace('_', ' ');
  };

  // Reordering, Adding, and Deleting Tiers
  const moveUp = (index) => {
    if (index === 0) return;
    const updated = [...escalationPath];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setEscalationPath(updated);
  };

  const moveDown = (index) => {
    if (index === escalationPath.length - 1) return;
    const updated = [...escalationPath];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setEscalationPath(updated);
  };

  const deleteStep = (index) => {
    const updated = escalationPath.filter((_, idx) => idx !== index);
    setEscalationPath(updated);
  };

  const addStep = () => {
    const newStep = {
      role: 'maintenance_technician',
      label: 'Maintenance Technician',
      threshold_hours: 2
    };
    setEscalationPath([...escalationPath, newStep]);
  };

  const handleRoleChange = (index, roleVal) => {
    const updated = [...escalationPath];
    updated[index].role = roleVal;
    updated[index].label = getRoleLabel(roleVal);
    setEscalationPath(updated);
  };

  const handleThresholdChange = (index, value) => {
    const updated = [...escalationPath];
    updated[index].threshold_hours = value === '' ? 2 : parseFloat(value);
    setEscalationPath(updated);
  };

  const saveEscalationConfig = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      // Map thresholds: last one is always null
      const payload = escalationPath.map((step, idx) => ({
        role: step.role,
        label: step.label,
        threshold_hours: idx === escalationPath.length - 1 ? null : (step.threshold_hours || 2)
      }));

      const resp = await fetch(`${apiBase}/vault/escalation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        throw new Error('Failed to save escalation configuration');
      }

      setSuccess('Escalation path sequence and thresholds successfully saved.');
      fetchSettings();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddRoleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const roleName = newRoleLabel.trim().toLowerCase().replace(/\s+/g, '_');
      const resp = await fetch(`${apiBase}/vault/custom-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role_name: roleName,
          role_label: newRoleLabel.trim(),
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.detail || 'Failed to add custom role');
      }

      setSuccess(`Custom role "${newRoleLabel}" successfully added.`);
      setNewRoleLabel('');
      setShowAddRole(false);
      fetchSettings();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteRole = async (roleName) => {
    if (!window.confirm(`Are you sure you want to delete the role "${roleName}"?`)) return;
    setError('');
    setSuccess('');
    try {
      const resp = await fetch(`${apiBase}/vault/custom-roles/${roleName}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        throw new Error('Failed to delete custom role');
      }

      setSuccess('Custom role successfully deleted.');
      fetchSettings();
    } catch (err) {
      setError(err.message);
    }
  };

  // List of all active roles for step dropdowns
  const allAvailableRoles = [
    ...defaultRoles,
    ...customRoles.map((r) => ({ value: r.role_name, label: r.role_label }))
  ];

  // Calculate total worst-case time to Owner Escalation
  const totalHours = escalationPath.reduce((acc, step, idx) => {
    // skip the last step since it's the terminal one (threshold is null)
    if (idx === escalationPath.length - 1) return acc;
    return acc + (step.threshold_hours || 0);
  }, 0);

  return (
    <AppShell active="settings">
      <div className="vault-wrap" style={{ maxWidth: '1000px', padding: '20px 24px 80px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>Control Panel</h1>
          <p style={{ color: 'var(--slate)', fontSize: '0.9rem', margin: '4px 0 0' }}>Configure company limits, ticket escalation paths, and factory roles.</p>
        </div>

        {error && <div className="vault-error show" style={{ marginBottom: '16px' }}>{error}</div>}
        {success && <div className="vault-success" style={{ background: '#065f46', color: '#d1fae5', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate)' }}>Loading settings...</div>
        ) : (
          <>
            {/* Section 1: Company Profile */}
            <div className="vault-card" style={{ marginBottom: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>Company Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Company Profile</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>{companyInfo?.name || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Unique Plant Code</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--brand)', fontFamily: 'monospace' }}>{companyInfo?.code || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Active Slots / Machine Limit</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>{companyInfo?.machinesUsed} of {companyInfo?.quota} slots used</div>
                </div>
              </div>
            </div>

            {/* Section 2: Escalation Path Designer */}
            <div className="vault-card" style={{ marginBottom: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>Breakdown Escalation Path Designer</h3>
              <p style={{ color: 'var(--slate)', fontSize: '0.82rem', marginBottom: '18px' }}>Add, delete, reorder, or customize the escalation times for your factory breakdown response flow.</p>
              
              <form onSubmit={saveEscalationConfig}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                  {escalationPath.map((step, idx) => {
                    const isLast = idx === escalationPath.length - 1;
                    return (
                      <div key={`${step.role}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ width: '40px', fontWeight: 'bold', color: 'var(--brand)', fontFamily: 'monospace' }}>Lvl {idx}</div>
                        
                        {/* Role selector dropdown */}
                        <div style={{ flex: 1 }}>
                          <select 
                            value={step.role} 
                            onChange={(e) => handleRoleChange(idx, e.target.value)}
                            style={{ width: '100%', padding: '6px', background: 'var(--surface)', borderColor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '600' }}
                          >
                            {allAvailableRoles.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Reordering Controls */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            type="button" 
                            className="vault-btn vault-btn-ghost" 
                            style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                          >
                            ▲
                          </button>
                          <button 
                            type="button" 
                            className="vault-btn vault-btn-ghost" 
                            style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                            onClick={() => moveDown(idx)}
                            disabled={isLast}
                          >
                            ▼
                          </button>
                        </div>

                        {/* Threshold controls */}
                        {!isLast ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Escalate after:</span>
                            <input 
                              type="number" 
                              step="0.5" 
                              min="0.5"
                              value={step.threshold_hours === null || step.threshold_hours === undefined ? '' : step.threshold_hours}
                              onChange={(e) => handleThresholdChange(idx, e.target.value)}
                              style={{ width: '80px', padding: '6px', background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', textAlign: 'center', color: 'white' }}
                              required
                            />
                            <span style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>hours</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: 'var(--slate-light)', fontStyle: 'italic' }}>Terminal level (No escalation)</div>
                        )}

                        {/* Delete step */}
                        <button 
                          type="button" 
                          className="vault-btn vault-btn-danger" 
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }} 
                          onClick={() => deleteStep(idx)}
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Owner Worst-Case Response Calculator */}
                <div style={{ background: 'rgba(37, 211, 102, 0.05)', border: '1px dashed rgba(37, 211, 102, 0.2)', padding: '14px 18px', borderRadius: '6px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: 'white' }}>Total Factory Response Time before Owner Alert:</span>
                  <span style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--brand)' }}>{totalHours} Hours</span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="vault-btn vault-btn-primary" style={{ width: 'auto', padding: '10px 24px', background: 'var(--brand)', color: '#000' }}>
                    Save Escalation Chain
                  </button>
                  <button type="button" className="vault-btn vault-btn-ghost" style={{ width: 'auto', padding: '10px 24px', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} onClick={addStep}>
                    + Add Escalation Step
                  </button>
                </div>
              </form>
            </div>

            {/* Section 3: Custom Role Configurations */}
            <div className="vault-card" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>Custom Factory Roles</h3>
                  <p style={{ color: 'var(--slate)', fontSize: '0.8rem', margin: '4px 0 0' }}>Configure custom roles that will instantly populate dropdown options during team onboarding.</p>
                </div>
                <button className="vault-btn vault-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} onClick={() => setShowAddRole(!showAddRole)}>
                  {showAddRole ? 'Cancel' : '+ Create Role'}
                </button>
              </div>

              {showAddRole && (
                <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                  <form onSubmit={handleAddRoleSubmit}>
                    <div className="vault-field" style={{ marginBottom: '12px' }}>
                      <label htmlFor="roleLabel">Role Display Name</label>
                      <input type="text" id="roleLabel" value={newRoleLabel} onChange={(e) => setNewRoleLabel(e.target.value)} placeholder="e.g. Safety Inspector" required />
                    </div>
                    <button type="submit" className="vault-btn vault-btn-primary" style={{ width: 'auto', padding: '8px 20px', background: 'var(--brand)', color: '#000' }}>Create Role</button>
                  </form>
                </div>
              )}

              {customRoles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--slate-light)', fontStyle: 'italic' }}>
                  No custom roles defined. Standard plant roles (Technician, Supervisor, Engineer, Head, Owner) are active.
                </div>
              ) : (
                <table className="vault-table">
                  <thead>
                    <tr>
                      <th>Role Label</th>
                      <th>System Code Identifier</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customRoles.map((r) => (
                      <tr key={r.role_name}>
                        <td style={{ fontWeight: '600', color: 'white' }}>{r.role_label}</td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--brand)' }}>{r.role_name}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="vault-btn vault-btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleDeleteRole(r.role_name)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
