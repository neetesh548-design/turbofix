import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BellRing,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Save,
  Settings2,
  Shield,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import { apiFetch } from '@/lib/api';
import { defaultRoles, getRoleLabel } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const settingTabs = [
  { value: 'general', label: 'General', description: 'Plant details and refresh', icon: Building2 },
  { value: 'ai-data', label: 'AI & machine data', description: 'Knowledge and approvals', icon: BrainCircuit },
  { value: 'escalation', label: 'Breakdown alerts', description: 'Who gets called and when', icon: Shield },
  { value: 'roles', label: 'Roles & access', description: 'Factory responsibilities', icon: Users },
];

function readCurrentUser() {
  try {
    return JSON.parse(window.localStorage.getItem('tf_user') || '{}');
  } catch {
    return {};
  }
}

function initialTab() {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'overview') return 'general';
  return settingTabs.some((tab) => tab.value === hash) ? hash : 'general';
}

function responseStepLabel(index, total) {
  if (index === 0) return 'First contact';
  if (index === total - 1) return 'Final contact';
  return `Escalation ${index}`;
}

export default function Settings() {
  const [currentUser] = useState(readCurrentUser);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [escalationPath, setEscalationPath] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [escalationDirty, setEscalationDirty] = useState(false);
  const [knowledgeStats, setKnowledgeStats] = useState({ total: 0, ready: 0, gaps: 0 });
  const [preferences, setPreferences] = useState(() => ({
    autoRefresh: window.localStorage.getItem('tf_settings_auto_refresh') !== 'false',
    approvalMode: window.localStorage.getItem('tf_settings_approval_mode') || 'always-ask',
  }));

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => setSuccess(''), 3500);
    return () => window.clearTimeout(timer);
  }, [success]);

  const fetchSettings = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const dashboardResponse = await apiFetch('/vault/dashboard');
      if (!dashboardResponse.ok) throw new Error('Company settings could not be loaded.');
      const dashboard = await dashboardResponse.json();
      const machineCount = dashboard.kpis?.total_machines || 0;
      setCompanyInfo({
        name: dashboard.company_name,
        code: currentUser.company_code || '',
        quota: machineCount + (dashboard.unassigned_machines?.length || 0) || 5,
        machinesUsed: machineCount,
      });

      const [rolesResponse, escalationResponse, machinesResponse] = await Promise.all([
        apiFetch('/vault/custom-roles'),
        apiFetch('/vault/escalation'),
        apiFetch('/vault/machines'),
      ]);

      if (rolesResponse.ok) setCustomRoles(await rolesResponse.json());
      if (escalationResponse.ok) {
        setEscalationPath(await escalationResponse.json());
        setEscalationDirty(false);
      }

      if (machinesResponse.ok) {
        const machines = await machinesResponse.json();
        const machineData = await Promise.all(machines.map(async (machine) => {
          try {
            const response = await apiFetch(`/vault/machines/${machine.machine_id}/machine-data`);
            return response.ok ? response.json() : null;
          } catch {
            return null;
          }
        }));
        setKnowledgeStats({
          total: machines.length,
          ready: machineData.filter((data) => data?.exists && !data?.approval_required).length,
          gaps: machineData.filter((data) => data?.approval_required).length,
        });
      }
    } catch (requestError) {
      setError(requestError.message || 'Settings could not be loaded.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const selectTab = (value) => {
    setActiveTab(value);
    setSuccess('');
    window.history.replaceState(null, '', `${window.location.pathname}#${value}`);
  };

  const updatePreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    window.localStorage.setItem(
      key === 'autoRefresh' ? 'tf_settings_auto_refresh' : 'tf_settings_approval_mode',
      value,
    );
    setSuccess('Preference saved on this browser.');
  };

  const updateEscalation = (updater) => {
    setEscalationPath((current) => updater([...current]));
    setEscalationDirty(true);
    setSuccess('');
  };

  const moveStep = (index, direction) => updateEscalation((updated) => {
    const target = index + direction;
    if (target < 0 || target >= updated.length) return updated;
    [updated[index], updated[target]] = [updated[target], updated[index]];
    return updated;
  });

  const deleteStep = (index) => updateEscalation((updated) => updated.filter((_, itemIndex) => itemIndex !== index));

  const addStep = () => updateEscalation((updated) => [...updated, {
    role: 'maintenance_technician',
    label: 'Maintenance Technician',
    threshold_hours: 2,
  }]);

  const handleRoleChange = (index, roleValue) => updateEscalation((updated) => {
    updated[index] = { ...updated[index], role: roleValue, label: getRoleLabel(roleValue, customRoles) };
    return updated;
  });

  const handleThresholdChange = (index, value) => updateEscalation((updated) => {
    updated[index] = { ...updated[index], threshold_hours: value === '' ? '' : Number(value) };
    return updated;
  });

  const saveEscalationConfig = async (event) => {
    event.preventDefault();
    setBusyAction('escalation');
    setError('');
    try {
      const payload = escalationPath.map((step, index) => ({
        role: step.role,
        label: step.label,
        threshold_hours: index === escalationPath.length - 1 ? null : (Number(step.threshold_hours) || 2),
      }));
      const response = await apiFetch('/vault/escalation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let message = 'Breakdown alert path could not be saved.';
        try {
          const responseBody = await response.json();
          message = responseBody.detail || message;
        } catch {
          // Keep the friendly fallback when the server does not return JSON.
        }
        throw new Error(message);
      }
      setEscalationDirty(false);
      setSuccess('Breakdown alert path saved.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction('');
    }
  };

  const handleAddRoleSubmit = async (event) => {
    event.preventDefault();
    const roleLabel = newRoleLabel.trim();
    if (!roleLabel) return;
    setBusyAction('role');
    setError('');
    try {
      const response = await apiFetch('/vault/custom-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_name: roleLabel.toLowerCase().replace(/\s+/g, '_'), role_label: roleLabel }),
      });
      if (!response.ok) {
        const responseError = await response.json();
        throw new Error(responseError.detail || 'Role could not be created.');
      }
      setCustomRoles(await response.json());
      setSuccess(`Role “${roleLabel}” created.`);
      setNewRoleLabel('');
      setShowAddRole(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction('');
    }
  };

  const handleDeleteRole = async (roleName, roleLabel) => {
    if (!window.confirm(`Delete the role “${roleLabel}”?`)) return;
    setBusyAction(roleName);
    setError('');
    try {
      const response = await apiFetch(`/vault/custom-roles/${roleName}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Role could not be deleted.');
      setCustomRoles((current) => current.filter((role) => role.role_name !== roleName));
      setSuccess(`Role “${roleLabel}” deleted.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction('');
    }
  };

  const allAvailableRoles = [
    ...defaultRoles,
    ...customRoles.map((role) => ({ value: role.role_name, label: role.role_label })),
  ];
  const totalHours = escalationPath.reduce((total, step, index) => (
    index === escalationPath.length - 1 ? total : total + (Number(step.threshold_hours) || 0)
  ), 0);
  const machineUsage = companyInfo?.quota ? Math.min(100, (companyInfo.machinesUsed / companyInfo.quota) * 100) : 0;

  return <AppShell active="settings"><div className="settings-page">
    <header className="settings-page-header">
      <div className="settings-page-title"><span><Settings2 /></span><div><p>Workspace setup</p><h1>Settings</h1><small>Configure your plant one section at a time.</small></div></div>
      <div className="settings-plant-chip"><span>{companyInfo?.code || currentUser.company_code || 'Plant'}</span><b>Live workspace</b></div>
    </header>

    {error && <Alert variant="destructive" className="settings-alert"><AlertCircle className="size-4" /><AlertTitle>Action needed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    {success && <Alert className="settings-alert settings-alert-success"><CheckCircle2 className="size-4" /><AlertTitle>Saved</AlertTitle><AlertDescription>{success}</AlertDescription></Alert>}

    {loading ? <div className="settings-loading"><span /><strong>Loading plant settings…</strong></div> : <div className="settings-layout">
      <aside className="settings-subnav" aria-label="Settings sections">
        <div className="settings-subnav-heading"><div className="settings-subnav-icon"><Settings2 /></div><div><p className="settings-kicker">Choose a section</p><h2>Plant settings</h2></div></div>
        <p className="settings-subnav-copy">Only settings related to the selected task are shown.</p>
        <div className="settings-subnav-list" role="tablist" aria-label="Settings sections">
          {settingTabs.map(({ value, label, description, icon: Icon }) => <button key={value} type="button" role="tab" aria-selected={activeTab === value} onClick={() => selectTab(value)} className={`settings-subnav-item${activeTab === value ? ' active' : ''}`}><Icon /><span><strong>{label}</strong><small>{description}</small></span></button>)}
        </div>
        <div className="settings-subnav-note"><CheckCircle2 /><span>Changes are saved separately in each section.</span></div>
      </aside>

      <main className="settings-content">
        <div className="settings-mobile-tabs" role="tablist" aria-label="Settings sections">
          {settingTabs.map(({ value, label }) => <button key={value} type="button" role="tab" aria-selected={activeTab === value} onClick={() => selectTab(value)} className={activeTab === value ? 'active' : ''}>{label}</button>)}
        </div>

        {activeTab === 'general' && <section className="settings-section" aria-labelledby="general-settings-title">
          <SectionHeading icon={<Building2 />} eyebrow="General" title="Plant and workspace" id="general-settings-title" description="Review plant identity and choose how fresh data should behave on this browser." />
          <div className="settings-general-grid">
            <Card className="settings-company-card"><CardContent>
              <div className="settings-card-title"><Building2 /><div><h3>Company details</h3><p>Read-only plant information</p></div></div>
              <dl className="settings-company-facts"><div><dt>Company</dt><dd>{companyInfo?.name || '—'}</dd></div><div><dt>Plant code</dt><dd className="code">{companyInfo?.code || '—'}</dd></div><div><dt>Machine capacity</dt><dd>{companyInfo?.machinesUsed} of {companyInfo?.quota} used</dd></div></dl>
              <div className="settings-usage-track"><span style={{ width: `${machineUsage}%` }} /></div>
              <a className="settings-card-link" href="machines.html">Manage machines <ArrowUpRight /></a>
            </CardContent></Card>
            <Card className="settings-preference-card"><CardContent>
              <div className="settings-card-title"><BellRing /><div><h3>Data refresh</h3><p>Applies only to this browser</p></div></div>
              <button type="button" aria-pressed={preferences.autoRefresh} onClick={() => updatePreference('autoRefresh', !preferences.autoRefresh)} className="settings-toggle-row"><span><strong>Refresh plant data automatically</strong><small>Show current dashboard information when you return to a page.</small></span><span className={`settings-switch${preferences.autoRefresh ? ' on' : ''}`}><i /></span></button>
              <div className="settings-local-note"><CheckCircle2 /><span>{preferences.autoRefresh ? 'Automatic refresh is on.' : 'Pages refresh only when you request new data.'}</span></div>
            </CardContent></Card>
          </div>
        </section>}

        {activeTab === 'ai-data' && <section className="settings-section" aria-labelledby="ai-settings-title">
          <SectionHeading icon={<BrainCircuit />} eyebrow="AI & machine data" title="Knowledge and approvals" id="ai-settings-title" description="See whether AI has enough machine context and control when external references may be used." />
          <div className="settings-knowledge-grid">
            <Card className="settings-knowledge-hero"><CardContent><div className="settings-card-title"><BrainCircuit /><div><h3>{knowledgeStats.gaps ? 'Machine knowledge needs attention' : 'Machine knowledge is ready'}</h3><p>{knowledgeStats.ready} of {knowledgeStats.total} machines have approved AI context.</p></div></div><div className="settings-knowledge-progress"><span style={{ width: `${knowledgeStats.total ? (knowledgeStats.ready / knowledgeStats.total) * 100 : 0}%` }} /></div><a className="settings-primary-link" href="machines.html">Review machine data <ArrowUpRight /></a></CardContent></Card>
            <Card><CardContent><div className="settings-stat-card"><FileText /><span><strong>{knowledgeStats.ready}</strong><small>AI-ready machines</small></span></div></CardContent></Card>
            <Card className={knowledgeStats.gaps ? 'settings-gap-card' : ''}><CardContent><div className="settings-stat-card"><Wrench /><span><strong>{knowledgeStats.gaps}</strong><small>Need document review</small></span></div></CardContent></Card>
          </div>
          <Card className="settings-approval-card"><CardContent><div className="settings-card-title"><Shield /><div><h3>Internet enrichment approval</h3><p>TurboFix must receive permission before using external reference data.</p></div></div><label className="settings-select-field"><span>Approval rule</span><select value={preferences.approvalMode} onChange={(event) => updatePreference('approvalMode', event.target.value)}><option value="always-ask">Always ask before internet use</option><option value="disabled">Never use internet enrichment</option></select><small>Recommended: keep “Always ask” so the user stays in control.</small></label><a className="settings-card-link" href="assistant.html">Open AI Assistant <ArrowUpRight /></a></CardContent></Card>
        </section>}

        {activeTab === 'escalation' && <section className="settings-section" aria-labelledby="alert-settings-title">
          <SectionHeading icon={<Shield />} eyebrow="Breakdown alerts" title="Who gets called and when" id="alert-settings-title" description="Set a simple response order for breakdowns that remain unresolved." status={escalationDirty ? 'Unsaved changes' : 'Saved'} />
          <Card className="settings-response-card"><CardContent><form onSubmit={saveEscalationConfig}>
            <div className="settings-response-list">
              {escalationPath.map((step, index) => {
                const isLast = index === escalationPath.length - 1;
                return <div className="settings-response-row" key={`${step.role}-${index}`}>
                  <div className="settings-response-order"><b>{index + 1}</b><span>{responseStepLabel(index, escalationPath.length)}</span></div>
                  <label className="settings-response-role"><span>Responsible role</span><Select value={step.role} onValueChange={(value) => handleRoleChange(index, value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allAvailableRoles.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select></label>
                  {!isLast ? <label className="settings-response-time"><span>Wait before next alert</span><span className="settings-hours-input"><Input aria-label={`Hours before escalation from ${getRoleLabel(step.role, customRoles)}`} type="number" step="0.5" min="0.5" value={step.threshold_hours ?? ''} onChange={(event) => handleThresholdChange(index, event.target.value)} required /><small>hours</small></span></label> : <div className="settings-response-final"><span>Final contact</span><strong>No further escalation</strong></div>}
                  <div className="settings-response-actions"><Button type="button" variant="outline" size="icon-xs" aria-label={`Move ${getRoleLabel(step.role, customRoles)} up`} onClick={() => moveStep(index, -1)} disabled={index === 0}><ChevronUp /></Button><Button type="button" variant="outline" size="icon-xs" aria-label={`Move ${getRoleLabel(step.role, customRoles)} down`} onClick={() => moveStep(index, 1)} disabled={isLast}><ChevronDown /></Button><Button type="button" variant="destructive" size="icon-xs" aria-label={`Delete ${getRoleLabel(step.role, customRoles)}`} onClick={() => deleteStep(index)} disabled={escalationPath.length === 1}><Trash2 /></Button></div>
                </div>;
              })}
              {!escalationPath.length && <div className="settings-empty"><Shield /><strong>No breakdown alert path</strong><span>Add the first contact to start the response chain.</span></div>}
            </div>
            <div className="settings-response-summary"><span>Time before final contact</span><strong>{totalHours} hour{totalHours === 1 ? '' : 's'}</strong></div>
            <div className="settings-form-actions"><Button type="button" variant="outline" onClick={addStep}><Plus /> Add contact</Button><Button type="submit" disabled={!escalationDirty || busyAction === 'escalation'}><Save />{busyAction === 'escalation' ? 'Saving…' : 'Save response path'}</Button></div>
          </form></CardContent></Card>
        </section>}

        {activeTab === 'roles' && <section className="settings-section" aria-labelledby="role-settings-title">
          <SectionHeading icon={<Users />} eyebrow="Roles & access" title="Factory responsibilities" id="role-settings-title" description="Create role names used in team onboarding and breakdown alert assignments." action={<Button variant="outline" onClick={() => setShowAddRole((visible) => !visible)}>{showAddRole ? 'Cancel' : <><Plus /> Create role</>}</Button>} />
          {showAddRole && <Card className="settings-create-role"><CardContent><form onSubmit={handleAddRoleSubmit}><label><Label htmlFor="roleLabel">Role display name</Label><Input id="roleLabel" value={newRoleLabel} onChange={(event) => setNewRoleLabel(event.target.value)} placeholder="Example: Safety Inspector" required /><small>TurboFix automatically creates the internal system code.</small></label><Button type="submit" disabled={busyAction === 'role'}>{busyAction === 'role' ? 'Creating…' : 'Create role'}</Button></form></CardContent></Card>}
          <Card className="settings-role-card"><CardContent>
            <div className="settings-standard-roles"><CheckCircle2 /><span><strong>{defaultRoles.length} standard roles are active</strong><small>Technician, Supervisor, Engineer, Maintenance Head, and Owner remain available.</small></span></div>
            <div className="settings-role-list">
              {customRoles.map((role) => <div className="settings-role-row" key={role.role_name}><div className="settings-role-avatar">{role.role_label.charAt(0).toUpperCase()}</div><span><strong>{role.role_label}</strong><small>{role.role_name}</small></span><Button variant="destructive" size="xs" disabled={busyAction === role.role_name} onClick={() => handleDeleteRole(role.role_name, role.role_label)}><Trash2 /> Delete</Button></div>)}
              {!customRoles.length && <div className="settings-empty"><Users /><strong>No custom roles yet</strong><span>Create one only when the standard roles do not match your factory.</span></div>}
            </div>
            <a className="settings-card-link" href="team.html">Manage team members and access <ArrowUpRight /></a>
          </CardContent></Card>
        </section>}
      </main>
    </div>}
  </div></AppShell>;
}

function SectionHeading({ icon, eyebrow, title, id, description, status, action }) {
  return <div className="settings-section-heading"><span className="settings-section-icon">{icon}</span><div><p>{eyebrow}</p><h2 id={id}>{title}</h2><small>{description}</small></div>{status && <b className={status === 'Saved' ? 'saved' : 'dirty'}>{status}</b>}{action && <span className="settings-section-action">{action}</span>}</div>;
}
