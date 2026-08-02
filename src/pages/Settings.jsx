import React, { useCallback, useEffect, useState } from 'react';
import AuditLog from '../components/AuditLog';
import {
  AlertCircle,
  BellRing,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  History,
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
  { key: 'security', label: 'Security & Encryption', icon: <KeyRound className="w-4 h-4" /> },
  { key: 'audit-log', label: 'Activity Audit Log', icon: <History className="w-4 h-4" /> },
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

function getVisibleSettingTabs(role) {
  if (role === 'owner' || role === 'admin') return SETTING_TABS;
  if (role === 'maintenance_head') return SETTING_TABS.filter((tab) => ['general', 'company', 'ai-data', 'escalation', 'roles', 'audit-log'].includes(tab.key));
  if (role === 'supervisor') return SETTING_TABS.filter((tab) => ['general', 'company', 'escalation', 'audit-log'].includes(tab.key));
  if (role === 'maintenance_technician' || role === 'technician') return SETTING_TABS.filter((tab) => ['general', 'ai-data'].includes(tab.key));
  if (role === 'support') return SETTING_TABS.filter((tab) => ['general', 'ai-data', 'security', 'audit-log'].includes(tab.key));
  return SETTING_TABS.filter((tab) => ['general'].includes(tab.key));
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
  const aiCoverage = knowledgeStats.total ? Math.round((knowledgeStats.ready / knowledgeStats.total) * 100) : 0;
  const roleKey = currentUser.role || 'general';
  const visibleTabs = getVisibleSettingTabs(roleKey);
  const effectiveTab = visibleTabs.some((tab) => tab.key === activeTab) ? activeTab : (visibleTabs[0]?.key || 'general');
  const settingsOverview = [
    { label: 'Plant code', value: companyInfo?.code || currentUser.company_code || 'PLANT-01' },
    { label: 'Machine quota', value: `${companyInfo?.machinesUsed || 0}/${companyInfo?.quota || 0}` },
    { label: 'Knowledge coverage', value: `${aiCoverage}%` },
    { label: 'Escalation depth', value: `${escalationPath.length} steps` },
  ];

  return (
    <AppShell active="settings">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-6 sm:px-6 lg:px-8 transition-colors duration-200 settings-page" data-testid="settings-page">
        <div className="mx-auto max-w-7xl space-y-5">
          <header className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-teal-500/10 p-3 text-teal-600 dark:text-teal-400">
                    <Settings2 className="h-6 w-6" />
                  </div>
                  <div>
                    <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600 dark:text-teal-400">
                      Plant setup & security
                    </Text>
                    <Title level={1} className="!mb-0 !mt-1 !text-slate-900 dark:!text-white !font-semibold tracking-tight">
                      Settings
                    </Title>
                  </div>
                </div>
                <Paragraph className="!mb-0 max-w-xl text-slate-600 dark:text-slate-300">
                  Keep the system aligned to this plant, tune local preferences, and manage the few high-impact controls that need attention.
                </Paragraph>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[38rem]">
                {settingsOverview.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {item.label}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </header>

          {/* Plant Settings & Security Connection Banner */}
          <div className="stitch-glass-tile overflow-hidden mb-6 flex flex-col md:flex-row items-center gap-6 p-4 sm:p-5 relative group border border-teal-500/30">
            <div className="w-full md:w-1/3 h-44 rounded-xl overflow-hidden relative flex-shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}assets/plant_settings_security.jpg`}
                alt="Plant Governance & Cybersecurity"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-70" />
              <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-300 border border-teal-500/40 backdrop-blur-md">
                Plant Governance Command
              </span>
            </div>
            <div className="flex-1 space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-semibold border border-teal-500/20">
                <span>{getRoleLabel(currentUser.role)} view</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                "Configure plant-wide SLA escalation matrix, role access privileges, and offline AI encryption keys with total audit transparency."
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Seamlessly tune automatic data refresh rates, background AI enrichment permissions, custom team roles, and immutable system audit logs.
              </p>
            </div>
          </div>

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

          <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
            <Card className="rounded-3xl border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <div className="p-4">
                <div className="mb-4">
                  <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Sections
                  </Text>
                </div>
                <Tabs
                  activeKey={effectiveTab}
                  onChange={handleTabChange}
                  tabPlacement="left"
                  size="small"
                  className="settings-nav"
                  items={visibleTabs.map((tab) => ({
                    key: tab.key,
                    label: (
                      <span className="flex items-center gap-2 font-medium">
                        {tab.icon}
                        {tab.label}
                      </span>
                    ),
                  }))}
                />
              </div>
            </Card>

            <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <div className="p-0">
                <Tabs
                  activeKey={effectiveTab}
                  onChange={handleTabChange}
                  size="large"
                  className="settings-content"
                  renderTabBar={() => null}
                  items={visibleTabs.map((tab) => ({
                    key: tab.key,
                    label: (
                      <span className="flex items-center gap-2 font-medium">
                        {tab.icon}
                        {tab.label}
                      </span>
                    ),
                    children: (
                      <div className="space-y-6 p-5 sm:p-6 lg:p-8">
                    {/* General Preferences Tab */}
                    {tab.key === 'general' && (
                      <div className="max-w-4xl space-y-4">
                        <div className="space-y-1">
                          <Title level={2} className="!mb-0 flex items-center gap-2 !text-slate-900 dark:!text-white">
                            <Building2 className="h-5 w-5 text-teal-500" />
                            Personal & local preferences
                          </Title>
                          <Text className="text-slate-500 dark:text-slate-400">
                            Lightweight browser settings that stay local to this device.
                          </Text>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card className="rounded-2xl border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/40">
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

                          <Card className="rounded-2xl border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/40">
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
                                aria-label="Internet AI enrichment approval mode"
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
                      <div className="max-w-4xl space-y-6">
                        <div className="space-y-1">
                          <Title level={2} className="!mb-0 flex items-center gap-2 !text-slate-900 dark:!text-white">
                            <Building2 className="h-5 w-5 text-teal-500" />
                            Plant & quota information
                          </Title>
                          <Text className="text-slate-500 dark:text-slate-400">
                            Read-only plant identity and capacity context.
                          </Text>
                        </div>

                        <Card className="rounded-2xl border-slate-200 bg-slate-50 p-2 dark:border-slate-700/60 dark:bg-slate-800/40">
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
                      <div className="max-w-4xl space-y-6">
                        <div className="space-y-1">
                          <Title level={2} className="!mb-0 flex items-center gap-2 !text-slate-900 dark:!text-white">
                            <BrainCircuit className="h-5 w-5 text-teal-500" />
                            AI knowledge & documentation audit
                          </Title>
                          <Text className="text-slate-500 dark:text-slate-400">
                            Track manual coverage and know where the gaps are.
                          </Text>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="rounded-2xl border-slate-200 bg-slate-50 md:col-span-3 dark:border-slate-700/60 dark:bg-slate-800/40">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-teal-500/10 text-teal-500 rounded-xl">
                                <Sparkles className="w-6 h-6" />
                              </div>
                              <div className="space-y-1 flex-1">
                                <Title level={3} className="!mb-0 !text-slate-900 dark:!text-white">
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

                          <Card className="rounded-2xl border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/40">
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

                          <Card className="rounded-2xl border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/40">
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
                      <div className="max-w-4xl space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <Title level={2} className="!mb-0 flex items-center gap-2 !text-slate-900 dark:!text-white">
                              <Shield className="h-5 w-5 text-teal-500" />
                              Breakdown alert escalation chain
                            </Title>
                            <Text className="text-slate-500 dark:text-slate-400">Define the response order and wait thresholds.</Text>
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
                                  className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/60 dark:bg-slate-800/40 sm:flex-row sm:items-center"
                                >
                                  <div className="flex items-center gap-3 w-full sm:w-auto">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-sm font-bold text-teal-600 dark:text-teal-400">
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
                                      <div className="rounded-lg bg-slate-200/50 px-3 py-1.5 text-xs font-semibold text-slate-400 dark:bg-slate-700/40">
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

                          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row">
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
                      <div className="max-w-4xl space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Title level={2} className="!mb-0 flex items-center gap-2 !text-slate-900 dark:!text-white">
                              <Users className="h-5 w-5 text-teal-500" />
                              Custom plant responsibilities
                            </Title>
                            <Text className="text-slate-500 dark:text-slate-400">Add the few extra role labels your plant actually uses.</Text>
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
                          <Card className="rounded-2xl border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/40">
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

                    {/* Security & Encryption Tab */}
                    {tab.key === 'security' && (
                      <div className="max-w-4xl space-y-6">
                        <div className="space-y-1">
                          <Title level={2} className="!mb-0 flex items-center gap-2 !text-slate-900 dark:!text-white">
                            <KeyRound className="h-5 w-5 text-teal-500" />
                            Security keys & URL encryption
                          </Title>
                          <Text className="text-slate-500 dark:text-slate-400">
                            Rotate secrets and choose how strictly gateway links are enforced.
                          </Text>
                        </div>

                        <Card className="rounded-2xl border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/40">
                          <div className="space-y-4">
                            <div className="rounded-lg border border-teal-500/20 bg-teal-500/10 p-3 text-xs font-medium text-teal-600 dark:text-teal-400">
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

                    {/* Activity Audit Log Tab */}
                    {tab.key === 'audit-log' && (
                      <div className="max-w-4xl space-y-6">
                        <AuditLog limit={50} />
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
