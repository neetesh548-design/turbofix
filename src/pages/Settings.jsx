import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Trash2, Plus, AlertCircle, CheckCircle2, Settings2, Building2, Shield, Users } from 'lucide-react';
import AppShell from '../components/AppShell';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

export default function Settings() {
  const [companyInfo, setCompanyInfo] = useState(null);
  const [escalationPath, setEscalationPath] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddRole, setShowAddRole] = useState(false);

  const [newRoleLabel, setNewRoleLabel] = useState('');


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
      const dResp = await apiFetch('/vault/dashboard');
      if (!dResp.ok) throw new Error('Failed to load company details');
      const dData = await dResp.json();
      setCompanyInfo({
        name: dData.company_name,
        code: localStorage.getItem('tf_user') ? JSON.parse(localStorage.getItem('tf_user')).company_code : '',
        quota: dData.kpis?.total_machines + (dData.unassigned_machines?.length || 0) || 5,
        machinesUsed: dData.kpis?.total_machines || 0,
      });

      const rolesResp = await apiFetch('/vault/custom-roles');
      if (rolesResp.ok) {
        setCustomRoles(await rolesResp.json());
      }

      const escResp = await apiFetch('/vault/escalation');
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
    setEscalationPath(escalationPath.filter((_, idx) => idx !== index));
  };

  const addStep = () => {
    setEscalationPath([...escalationPath, {
      role: 'maintenance_technician',
      label: 'Maintenance Technician',
      threshold_hours: 2
    }]);
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
      const payload = escalationPath.map((step, idx) => ({
        role: step.role,
        label: step.label,
        threshold_hours: idx === escalationPath.length - 1 ? null : (step.threshold_hours || 2)
      }));

      const resp = await apiFetch('/vault/escalation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error('Failed to save escalation configuration');

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
      const resp = await apiFetch('/vault/custom-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const resp = await apiFetch(`/vault/custom-roles/${roleName}`, {
        method: 'DELETE',
      });

      if (!resp.ok) throw new Error('Failed to delete custom role');

      setSuccess('Custom role successfully deleted.');
      fetchSettings();
    } catch (err) {
      setError(err.message);
    }
  };

  const allAvailableRoles = [
    ...defaultRoles,
    ...customRoles.map((r) => ({ value: r.role_name, label: r.role_label }))
  ];

  const totalHours = escalationPath.reduce((acc, step, idx) => {
    if (idx === escalationPath.length - 1) return acc;
    return acc + (step.threshold_hours || 0);
  }, 0);

  return (
    <AppShell active="settings">
      <div className="mx-auto max-w-[1000px] px-6 pt-5 pb-20">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Settings2 className="size-6 text-primary" />
            <h1 className="font-[Rajdhani,sans-serif] text-3xl font-extrabold uppercase tracking-wide text-foreground">
              Control Panel
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure company limits, ticket escalation paths, and factory roles.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4 border-emerald-500/30 bg-emerald-950/40">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <AlertTitle className="text-emerald-300">Success</AlertTitle>
            <AlertDescription className="text-emerald-300/80">{success}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading settings...</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Section 1: Company Profile */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="size-5 text-primary" />
                  <CardTitle className="font-[Rajdhani,sans-serif] text-base uppercase tracking-wide">
                    Company Details
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Company Profile</p>
                    <p className="text-lg font-bold text-foreground">{companyInfo?.name || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Unique Plant Code</p>
                    <p className="font-mono text-lg font-bold text-primary">{companyInfo?.code || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Active Slots / Machine Limit</p>
                    <p className="text-lg font-bold text-foreground">
                      {companyInfo?.machinesUsed} of {companyInfo?.quota} slots used
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Escalation Path Designer */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="size-5 text-primary" />
                  <div>
                    <CardTitle className="font-[Rajdhani,sans-serif] text-base uppercase tracking-wide">
                      Breakdown Escalation Path Designer
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Add, delete, reorder, or customize the escalation times for your factory breakdown response flow.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveEscalationConfig}>
                  <div className="flex flex-col gap-3 mb-5">
                    {escalationPath.map((step, idx) => {
                      const isLast = idx === escalationPath.length - 1;
                      return (
                        <div
                          key={`${step.role}-${idx}`}
                          className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 lg:flex-nowrap"
                        >
                          <Badge variant="outline" className="shrink-0 font-mono text-primary border-primary/30">
                            Lvl {idx}
                          </Badge>

                          <Select value={step.role} onValueChange={(val) => handleRoleChange(idx, val)}>
                            <SelectTrigger className="min-w-[200px] flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allAvailableRoles.map((r) => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-xs"
                              onClick={() => moveUp(idx)}
                              disabled={idx === 0}
                            >
                              <ChevronUp />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-xs"
                              onClick={() => moveDown(idx)}
                              disabled={isLast}
                            >
                              <ChevronDown />
                            </Button>
                          </div>

                          {!isLast ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Escalate after:</span>
                              <Input
                                type="number"
                                step="0.5"
                                min="0.5"
                                value={step.threshold_hours === null || step.threshold_hours === undefined ? '' : step.threshold_hours}
                                onChange={(e) => handleThresholdChange(idx, e.target.value)}
                                className="w-20 text-center"
                                required
                              />
                              <span className="text-xs text-muted-foreground">hours</span>
                            </div>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">
                              Terminal level (No escalation)
                            </span>
                          )}

                          <Button
                            type="button"
                            variant="destructive"
                            size="xs"
                            onClick={() => deleteStep(idx)}
                          >
                            <Trash2 /> Delete
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Response Time Summary */}
                  <div className="mb-5 flex items-center justify-between rounded-lg border border-dashed border-primary/25 bg-primary/5 px-5 py-3.5">
                    <span className="font-semibold text-foreground">
                      Total Factory Response Time before Owner Alert:
                    </span>
                    <span className="font-mono text-xl font-bold text-primary">
                      {totalHours} Hours
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit">
                      Save Escalation Chain
                    </Button>
                    <Button type="button" variant="outline" onClick={addStep}>
                      <Plus /> Add Escalation Step
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Section 3: Custom Role Configurations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="size-5 text-primary" />
                    <div>
                      <CardTitle className="font-[Rajdhani,sans-serif] text-base uppercase tracking-wide">
                        Custom Factory Roles
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Configure custom roles that will instantly populate dropdown options during team onboarding.
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowAddRole(!showAddRole)}>
                    {showAddRole ? 'Cancel' : <><Plus className="size-3.5" /> Create Role</>}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showAddRole && (
                  <div className="mb-5 rounded-lg border border-border bg-background p-4">
                    <form onSubmit={handleAddRoleSubmit} className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="roleLabel">Role Display Name</Label>
                        <Input
                          id="roleLabel"
                          value={newRoleLabel}
                          onChange={(e) => setNewRoleLabel(e.target.value)}
                          placeholder="e.g. Safety Inspector"
                          required
                        />
                      </div>
                      <Button type="submit">Create Role</Button>
                    </form>
                  </div>
                )}

                {customRoles.length === 0 ? (
                  <div className="py-8 text-center text-sm italic text-muted-foreground">
                    No custom roles defined. Standard plant roles (Technician, Supervisor, Engineer, Head, Owner) are active.
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role Label</TableHead>
                          <TableHead>System Code Identifier</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customRoles.map((r) => (
                          <TableRow key={r.role_name}>
                            <TableCell className="font-semibold text-foreground">{r.role_label}</TableCell>
                            <TableCell className="font-mono text-primary">{r.role_name}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="xs"
                                onClick={() => handleDeleteRole(r.role_name)}
                              >
                                <Trash2 /> Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </AppShell>
  );
}
