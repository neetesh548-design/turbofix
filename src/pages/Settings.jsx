import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
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
  KeyRound,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  Tabs,
  Switch,
  Input,
  Select,
  Button,
  Alert as AntDAlert,
  Space,
  Typography,
  Badge,
  Progress,
  Popconfirm,
} from 'antd';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';
import {
  getAdminUrlSecret,
  setAdminUrlSecret,
  getAdminEncryptionConfig,
  setAdminEncryptionConfig,
  encryptUrlParams
} from '../utils/urlEncryption';
import { defaultRoles, getRoleLabel } from '@/lib/roles';

const { Title, Text, Paragraph } = Typography;

const SETTING_TABS = [
  { key: 'general', label: 'General & Preferences', icon: <Building2 className="w-4 h-4" /> },
  { key: 'company', label: 'Plant Info', icon: <Building2 className="w-4 h-4" /> },
  { key: 'ai-data', label: 'AI & Machine Data', icon: <BrainCircuit className="w-4 h-4" /> },
  { key: 'escalation', label: 'Breakdown Alerts', icon: <Shield className="w-4 h-4" /> },
  { key: 'roles', label: 'Roles & Access', icon: <Users className="w-4 h-4" /> },
  { key: 'smart-modules', label: 'Smart Modules', icon: <Settings2 className="w-4 h-4" /> },
  { key: 'security', label: 'Security & Encryption', icon: <KeyRound className="w-4 h-4" /> },
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
  return SETTING_TABS.some((tab) => tab.key === hash) ? hash : 'general';
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

  const [adminSecretKey, setAdminSecretKey] = useState(() => getAdminUrlSecret());
  const [urlConfig, setUrlConfig] = useState(() => getAdminEncryptionConfig());
  const [testSampleToken, setTestSampleToken] = useState('');

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => setSuccess(''), 3500);
    return () => window.clearTimeout(timer);
  }, [success]);

  const fetchSettings = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const { data: machines, error: machErr } = await supabase.from('machines').select('id,name');
      if (machErr) throw new Error(machErr.message);
      const machineCount = (machines || []).length;

      setCompanyInfo({
        name: currentUser.company_name || currentUser.factory_name || 'TurboFix Plant',
        code: currentUser.company_code || 'PLANT-01',
        quota: currentUser.machine_quota || 50,
        machinesUsed: machineCount,
      });

      const localRoles = window.localStorage.getItem('tf_settings_custom_roles');
      const localEscalation = window.localStorage.getItem('tf_settings_escalation_path');

      setCustomRoles(localRoles ? JSON.parse(localRoles) : []);
      setEscalationPath(localEscalation ? JSON.parse(localEscalation) : [
        { role: 'maintenance_technician', label: 'Maintenance Technician', threshold_hours: 2 }
      ]);
      setEscalationDirty(false);

      const { data: docs } = await supabase.from('documents').select('id,machine_id');
      const machinesWithDocs = new Set((docs || []).map(d => d.machine_id));
      setKnowledgeStats({
        total: machineCount,
        ready: machinesWithDocs.size,
        gaps: machineCount - machinesWithDocs.size,
      });
    } catch (requestError) {
      setError(requestError.message || 'Settings could not be loaded.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    document.title = 'Settings | TurboFix';
    fetchSettings();
  }, [fetchSettings]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSuccess('');
    window.history.replaceState(null, '', `${window.location.pathname}#${key}`);
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
    if (event) event.preventDefault();
    setBusyAction('escalation');
    setError('');
    try {
      setEscalationDirty(false);
      window.localStorage.setItem('tf_settings_escalation_path', JSON.stringify(escalationPath));
      setSuccess('Breakdown alert path saved locally.');
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
      const roleName = roleLabel.toLowerCase().replace(/\s+/g, '_');
      const updatedRoles = [...customRoles, { role_name: roleName, role_label: roleLabel }];
      setCustomRoles(updatedRoles);
      window.localStorage.setItem('tf_settings_custom_roles', JSON.stringify(updatedRoles));
      setSuccess(`Role "${roleLabel}" created locally.`);
      setNewRoleLabel('');
      setShowAddRole(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction('');
    }
  };

  const handleDeleteRole = async (roleName, roleLabel) => {
    setBusyAction(roleName);
    setError('');
    try {
      const updatedRoles = customRoles.filter((role) => role.role_name !== roleName);
      setCustomRoles(updatedRoles);
      window.localStorage.setItem('tf_settings_custom_roles', JSON.stringify(updatedRoles));
      setSuccess(`Role "${roleLabel}" deleted.`);
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
  const machineUsage = companyInfo?.quota ? Math.min(100, Math.round((companyInfo.machinesUsed / companyInfo.quota) * 100)) : 0;

  return (
    <AppShell active="settings">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 transition-colors duration-200">
        <header className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
              <Settings2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Text className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Plant Setup & Security
                </Text>
              </div>
              <Title level={2} className="!mb-0 !text-slate-900 dark:!text-white !font-bold tracking-tight">
                Settings
              </Title>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-sm font-medium rounded-md">
              {companyInfo?.code || currentUser.company_code || 'PLANT-01'}
            </span>
            <Badge status="processing" text="Live" className="dark:text-slate-300 font-medium" />
          </div>
        </header>

        <div className="max-w-7xl mx-auto space-y-4">
          {error && (
            <AntDAlert
              message="Action Needed"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError('')}
              className="rounded-lg shadow-sm"
            />
          )}

          {success && (
            <AntDAlert
              message="Success"
              description={success}
              type="success"
              showIcon
              closable
              onClose={() => setSuccess('')}
              className="rounded-lg shadow-sm"
            />
          )}

          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              size="large"
              className="px-4 pt-2"
              items={SETTING_TABS.map((tab) => ({
                key: tab.key,
                label: (
                  <span className="flex items-center gap-2 font-medium">
                    {tab.icon}
                    {tab.label}
                  </span>
                ),
                children: (
                  <div className="py-6 px-2 sm:px-4 space-y-6">
                    {/* General Preferences Tab */}
                    {tab.key === 'general' && (
                      <div className="space-y-6 max-w-4xl">
                        <div>
                          <Title level={4} className="!text-slate-900 dark:!text-white !mb-1 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-teal-500" />
                            Personal & Local Preferences
                          </Title>
                          <Text className="text-slate-500 dark:text-slate-400">
                            Configure automatic updates and internet enrichment behavior on this browser.
                          </Text>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 rounded-xl">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                  <BellRing className="w-4 h-4 text-teal-500" />
                                  Automatic Data Refresh
                                </div>
                                <Paragraph className="text-xs text-slate-500 dark:text-slate-400 !mb-0">
                                  Automatically poll plant telemetry and dashboard statistics when returning to tabs.
                                </Paragraph>
                              </div>
                              <Switch
                                checked={preferences.autoRefresh}
                                onChange={(val) => updatePreference('autoRefresh', val)}
                                aria-label="Toggle auto refresh"
                              />
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/50 text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1.5 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {preferences.autoRefresh ? 'Automatic background refresh active.' : 'Manual refresh mode selected.'}
                            </div>
                          </Card>

                          <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 rounded-xl">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                <Shield className="w-4 h-4 text-teal-500" />
                                Internet AI Enrichment
                              </div>
                              <Paragraph className="text-xs text-slate-500 dark:text-slate-400 !mb-0">
                                Controls whether TurboFix AI can fetch web documentation for unmapped spare parts.
                              </Paragraph>
                              <Select
                                value={preferences.approvalMode}
                                onChange={(val) => updatePreference('approvalMode', val)}
                                className="w-full"
                                options={[
                                  { value: 'always-ask', label: 'Always ask before internet lookup' },
                                  { value: 'disabled', label: 'Strictly disable external lookups' },
                                ]}
                              />
                            </div>
                          </Card>
                        </div>
                      </div>
                    )}

                    {/* Company Info Tab */}
                    {tab.key === 'company' && (
                      <div className="space-y-6 max-w-4xl">
                        <div>
                          <Title level={4} className="!text-slate-900 dark:!text-white !mb-1 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-teal-500" />
                            Plant & Quota Information
                          </Title>
                          <Text className="text-slate-500 dark:text-slate-400">
                            View registered plant credentials and capacity metrics.
                          </Text>
                        </div>

                        <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 rounded-xl p-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                            <div>
                              <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider block mb-1">
                                Company / Plant Name
                              </Text>
                              <Text className="text-base font-semibold text-slate-900 dark:text-white">
                                {companyInfo?.name || 'TurboFix Main Plant'}
                              </Text>
                            </div>
                            <div>
                              <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider block mb-1">
                                Plant System Code
                              </Text>
                              <Text className="text-base font-mono font-semibold text-teal-600 dark:text-teal-400">
                                {companyInfo?.code || 'PLANT-01'}
                              </Text>
                            </div>
                            <div>
                              <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider block mb-1">
                                Machine Quota Usage
                              </Text>
                              <Text className="text-base font-semibold text-slate-900 dark:text-white">
                                {companyInfo?.machinesUsed} of {companyInfo?.quota} slots used
                              </Text>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                              <span>Fleet Utilization</span>
                              <span>{machineUsage}%</span>
                            </div>
                            <Progress
                              percent={machineUsage}
                              status={machineUsage > 90 ? 'exception' : 'active'}
                              strokeColor={{ '0%': '#14b8a6', '100%': '#0d9488' }}
                            />
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* AI Data Tab */}
                    {tab.key === 'ai-data' && (
                      <div className="space-y-6 max-w-4xl">
                        <div>
                          <Title level={4} className="!text-slate-900 dark:!text-white !mb-1 flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-teal-500" />
                            AI Knowledge & Documentation Audit
                          </Title>
                          <Text className="text-slate-500 dark:text-slate-400">
                            Monitor machine manual coverage and AI diagnostic readiness.
                          </Text>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 rounded-xl md:col-span-3">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-teal-500/10 text-teal-500 rounded-xl">
                                <Sparkles className="w-6 h-6" />
                              </div>
                              <div className="space-y-1 flex-1">
                                <Title level={5} className="!mb-0 !text-slate-900 dark:!text-white">
                                  {knowledgeStats.gaps ? 'Documentation Gaps Identified' : 'Fleet Fully Knowledge-Mapped'}
                                </Title>
                                <Text className="text-xs text-slate-500 dark:text-slate-400 block">
                                  {knowledgeStats.ready} of {knowledgeStats.total} machines have verified manual embeddings.
                                </Text>
                              </div>
                            </div>
                            <Progress
                              percent={knowledgeStats.total ? Math.round((knowledgeStats.ready / knowledgeStats.total) * 100) : 0}
                              className="mt-4"
                              strokeColor="#14b8a6"
                            />
                          </Card>

                          <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 rounded-xl">
                            <a href="records.html" className="block space-y-2 hover:opacity-80 transition-opacity">
                              <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
                                <FileText className="w-5 h-5" />
                                <span className="text-xl font-bold">{knowledgeStats.ready}</span>
                              </div>
                              <div>
                                <Text className="text-sm font-semibold text-slate-900 dark:text-white block">
                                  AI-Ready Machines
                                </Text>
                                <Text className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                                  View approved knowledge &rarr;
                                </Text>
                              </div>
                            </a>
                          </Card>

                          <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 rounded-xl">
                            <a href="records.html" className="block space-y-2 hover:opacity-80 transition-opacity">
                              <div className="flex items-center justify-between text-amber-500">
                                <Wrench className="w-5 h-5" />
                                <span className="text-xl font-bold">{knowledgeStats.gaps}</span>
                              </div>
                              <div>
                                <Text className="text-sm font-semibold text-slate-900 dark:text-white block">
                                  Pending Manual Uploads
                                </Text>
                                <Text className="text-xs text-amber-500 font-medium">
                                  Open review inbox &rarr;
                                </Text>
                              </div>
                            </a>
                          </Card>
                        </div>
                      </div>
                    )}

                    {/* Breakdown Escalation Tab */}
                    {tab.key === 'escalation' && (
                      <div className="space-y-6 max-w-4xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <Title level={4} className="!text-slate-900 dark:!text-white !mb-1 flex items-center gap-2">
                              <Shield className="w-5 h-5 text-teal-500" />
                              Breakdown Alert Escalation Chain
                            </Title>
                            <Text className="text-slate-500 dark:text-slate-400">
                              Define response sequence and hour thresholds for unaddressed breakdowns.
                            </Text>
                          </div>
                          {escalationDirty && (
                            <Badge count="Unsaved changes" style={{ backgroundColor: '#eab308' }} />
                          )}
                        </div>

                        <form onSubmit={saveEscalationConfig} className="space-y-4">
                          <div className="space-y-3">
                            {escalationPath.map((step, index) => {
                              const isLast = index === escalationPath.length - 1;
                              return (
                                <div
                                  key={`${step.role}-${index}`}
                                  className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                >
                                  <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm shrink-0">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1 sm:w-64">
                                      <Text className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-medium">
                                        {responseStepLabel(index, escalationPath.length)}
                                      </Text>
                                      <Select
                                        value={step.role}
                                        onChange={(val) => handleRoleChange(index, val)}
                                        className="w-full"
                                        options={allAvailableRoles.map((r) => ({ value: r.value, label: r.label }))}
                                      />
                                    </div>
                                  </div>

                                  {!isLast ? (
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                      <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        Wait threshold:
                                      </Text>
                                      <Input
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        value={step.threshold_hours ?? ''}
                                        onChange={(e) => handleThresholdChange(index, e.target.value)}
                                        className="w-24 text-center font-semibold"
                                        suffix={<span className="text-xs text-slate-400">hrs</span>}
                                        aria-label={`Hours before escalation from ${getRoleLabel(step.role, customRoles)}`}
                                      />
                                    </div>
                                  ) : (
                                    <div className="text-xs font-semibold text-slate-400 bg-slate-200/50 dark:bg-slate-700/40 px-3 py-1.5 rounded-lg">
                                      Final Escalation Contact
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1 self-end sm:self-center">
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<ChevronUp className="w-4 h-4" />}
                                      onClick={() => moveStep(index, -1)}
                                      disabled={index === 0}
                                      aria-label={`Move ${getRoleLabel(step.role, customRoles)} up`}
                                    />
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<ChevronDown className="w-4 h-4" />}
                                      onClick={() => moveStep(index, 1)}
                                      disabled={isLast}
                                      aria-label={`Move ${getRoleLabel(step.role, customRoles)} down`}
                                    />
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      icon={<Trash2 className="w-4 h-4" />}
                                      onClick={() => deleteStep(index)}
                                      disabled={escalationPath.length === 1}
                                      aria-label={`Delete ${getRoleLabel(step.role, customRoles)}`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              Total chain duration: <strong className="text-slate-900 dark:text-white">{totalHours} hours</strong>
                            </Text>
                            <Space>
                              <Button icon={<Plus className="w-4 h-4" />} onClick={addStep}>
                                Add Escalation Step
                              </Button>
                              <Button
                                type="primary"
                                icon={<Save className="w-4 h-4" />}
                                htmlType="submit"
                                disabled={!escalationDirty || busyAction === 'escalation'}
                                loading={busyAction === 'escalation'}
                                className="bg-teal-600 hover:bg-teal-500"
                              >
                                Save Alert Path
                              </Button>
                            </Space>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Custom Roles & Access Tab */}
                    {tab.key === 'roles' && (
                      <div className="space-y-6 max-w-4xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <Title level={4} className="!text-slate-900 dark:!text-white !mb-1 flex items-center gap-2">
                              <Users className="w-5 h-5 text-teal-500" />
                              Custom Plant Responsibilities
                            </Title>
                            <Text className="text-slate-500 dark:text-slate-400">
                              Define custom role titles for factory staff allocation.
                            </Text>
                          </div>
                          <Button
                            type="primary"
                            icon={<Plus className="w-4 h-4" />}
                            onClick={() => setShowAddRole((prev) => !prev)}
                            className="bg-teal-600 hover:bg-teal-500"
                          >
                            {showAddRole ? 'Cancel' : 'Create Role'}
                          </Button>
                        </div>

                        {showAddRole && (
                          <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 rounded-xl">
                            <form onSubmit={handleAddRoleSubmit} className="space-y-4">
                              <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                                  Role Display Name
                                </label>
                                <Input
                                  value={newRoleLabel}
                                  onChange={(e) => setNewRoleLabel(e.target.value)}
                                  placeholder="e.g., EHS & Safety Specialist"
                                  required
                                />
                              </div>
                              <Button
                                type="primary"
                                htmlType="submit"
                                loading={busyAction === 'role'}
                                className="bg-teal-600 hover:bg-teal-500"
                              >
                                Save Role
                              </Button>
                            </form>
                          </Card>
                        )}

                        <div className="space-y-3">
                          <div className="p-3 bg-teal-500/10 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-500" />
                            {defaultRoles.length} built-in system roles are active (Technician, Supervisor, Engineer, Maintenance Head, Owner).
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {customRoles.map((role) => (
                              <div
                                key={role.role_name}
                                className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                                    {role.role_label.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <Text className="text-sm font-semibold text-slate-900 dark:text-white block">
                                      {role.role_label}
                                    </Text>
                                    <Text className="text-xs text-slate-400 font-mono">
                                      {role.role_name}
                                    </Text>
                                  </div>
                                </div>
                                <Popconfirm
                                  title="Delete role?"
                                  description={`Are you sure you want to remove ${role.role_label}?`}
                                  onConfirm={() => handleDeleteRole(role.role_name, role.role_label)}
                                  okText="Delete"
                                  okButtonProps={{ danger: true }}
                                >
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<Trash2 className="w-4 h-4" />}
                                  />
                                </Popconfirm>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Smart Modules Tab */}
                    {tab.key === 'smart-modules' && (
                      <div className="space-y-6 max-w-4xl">
                        <div>
                          <Title level={4} className="!text-slate-900 dark:!text-white !mb-1 flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-teal-500" />
                            Configurable Smart Modules & Overlays
                          </Title>
                          <Text className="text-slate-500 dark:text-slate-400">
                            Toggle specialized Poka-Yoke and IoT modules on top of core maintenance logic.
                          </Text>
                        </div>

                        <div className="space-y-3">
                          {[
                            { id: 'iot', name: 'IoT Predictive Power-Signature', desc: 'Predict motor wear using electrical current data overlay.' },
                            { id: 'cv', name: 'Visual Spare Part Deduction', desc: 'Auto-verify replaced components via AI camera snapshot.' },
                            { id: 'erp', name: 'Dynamic Supply-Chain Sync', desc: 'Synchronize inventory reorder triggers with enterprise ERP.' },
                            { id: 'mesh', name: 'Opportunistic Mesh Syncing', desc: 'Peer-to-peer sync between technician phones in offline zones.' },
                            { id: 'loc', name: 'Location Handshake Verification', desc: 'Require NFC/Bluetooth proximity validation before starting jobs.' }
                          ].map((mod) => (
                            <div
                              key={mod.id}
                              className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between gap-4"
                            >
                              <div>
                                <Text className="text-sm font-semibold text-slate-900 dark:text-white block">
                                  {mod.name}
                                </Text>
                                <Text className="text-xs text-slate-500 dark:text-slate-400">
                                  {mod.desc}
                                </Text>
                              </div>
                              <Select
                                defaultValue="disabled"
                                className="w-32"
                                options={[
                                  { value: 'disabled', label: 'Disabled' },
                                  { value: 'enabled', label: 'Enabled' },
                                ]}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Security & Encryption Tab */}
                    {tab.key === 'security' && (
                      <div className="space-y-6 max-w-4xl">
                        <div>
                          <Title level={4} className="!text-slate-900 dark:!text-white !mb-1 flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-teal-500" />
                            Security Keys & URL Encryption
                          </Title>
                          <Text className="text-slate-500 dark:text-slate-400">
                            Configure HMAC secrets and enforcement policies for plant links.
                          </Text>
                        </div>

                        <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 rounded-xl">
                          <div className="space-y-4">
                            <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 rounded-lg text-xs font-medium">
                              🔒 <strong>TurboFix Key Protection Active</strong> — Machine codes and QR gateway links are signed with HMAC token hashing.
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                                Admin Encryption Secret Key
                              </label>
                              <div className="flex gap-2">
                                <Input.Password
                                  value={adminSecretKey}
                                  onChange={(e) => setAdminSecretKey(e.target.value)}
                                  placeholder="Minimum 8 characters secret key"
                                  className="flex-1"
                                />
                                <Button
                                  type="primary"
                                  className="bg-teal-600 hover:bg-teal-500"
                                  onClick={() => {
                                    try {
                                      setAdminUrlSecret(adminSecretKey);
                                      setSuccess('Admin Master Secret Key updated!');
                                    } catch (err) {
                                      setError(err.message);
                                    }
                                  }}
                                >
                                  Rotate Key
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                              <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                  Enforce Encrypted URLs Only
                                </label>
                                <Select
                                  value={urlConfig.enforceEncryptedUrls ? 'true' : 'false'}
                                  onChange={(val) => {
                                    const updated = setAdminEncryptionConfig({ enforceEncryptedUrls: val === 'true' });
                                    setUrlConfig(updated);
                                    setSuccess('URL security policy updated.');
                                  }}
                                  className="w-full"
                                  options={[
                                    { value: 'false', label: 'Allow Plain & Encrypted URLs' },
                                    { value: 'true', label: 'Enforce Encrypted URLs Only' },
                                  ]}
                                />
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                  Token Expiration Duration
                                </label>
                                <Select
                                  value={String(urlConfig.linkExpirationDays)}
                                  onChange={(val) => {
                                    const updated = setAdminEncryptionConfig({ linkExpirationDays: Number(val) });
                                    setUrlConfig(updated);
                                    setSuccess('Link expiration period updated.');
                                  }}
                                  className="w-full"
                                  options={[
                                    { value: '30', label: '30 Days' },
                                    { value: '90', label: '90 Days' },
                                    { value: '365', label: '365 Days (Default)' },
                                    { value: '0', label: 'Never Expire' },
                                  ]}
                                />
                              </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700/60">
                              <Button
                                onClick={() => {
                                  const tokenQuery = encryptUrlParams({ id: 'MCH-SAMPLE-01', name: 'Sample Machine', loc: 'Bay 1' });
                                  setTestSampleToken(`${window.location.origin}/qr-gateway.html?${tokenQuery}`);
                                }}
                              >
                                Generate Sample Encrypted Gateway Link
                              </Button>
                              {testSampleToken && (
                                <div className="mt-3 p-3 bg-slate-900 text-teal-400 rounded-lg text-xs font-mono break-all border border-slate-800">
                                  {testSampleToken}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
n}</span>}</div>;
}
