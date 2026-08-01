import { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Building2,
  Cpu,
  Ticket,
  CheckCircle2,
  Trash2,
  LogOut,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Wrench,
  AlertTriangle,
  Activity,
  Filter,
  Check,
  Edit3,
  Sliders,
  Pause,
  Play,
  Zap,
  Mail,
  Phone,
  User,
} from 'lucide-react';

const ADMIN_EDGE_URL = 'https://wcqgbleppiaddgfjrnpq.supabase.co/functions/v1/admin_portal';
const TOKEN_KEY = 'tf_supabase_admin_token';
const SECRET_ACCESS_KEY = 'TurboFixSecure2026';

export default function AdminPortal() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Check if URL has secret access key or if already authenticated
  const isAuthorizedPath = useMemo(() => {
    if (token) return true;
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key') || params.get('access_key') || params.get('secret');
    return key === SECRET_ACCESS_KEY;
  }, [token]);

  // Honeypot trap state
  const [honeypotPassword, setHoneypotPassword] = useState('');
  const [honeypotErr, setHoneypotErr] = useState('');
  const [honeypotSubmitting, setHoneypotSubmitting] = useState(false);

  const handleHoneypotSubmit = (e) => {
    e.preventDefault();
    setHoneypotErr('');
    setHoneypotSubmitting(true);
    // Tarpit delay to waste attacker/bot resources
    setTimeout(() => {
      setHoneypotSubmitting(false);
      setHoneypotErr('Access Denied: Invalid credentials. Security event logged with system administrator.');
      setHoneypotPassword('');
    }, 2200);
  };

  // Active Tab: 'companies' | 'machines' | 'tickets'
  const [activeTab, setActiveTab] = useState('companies');

  // Data States
  const [companies, setCompanies] = useState([]);
  const [machines, setMachines] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Notifications
  const [actionErr, setActionErr] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Provision Company Modal State
  const [showProvComp, setShowProvComp] = useState(false);
  const [provCode, setProvCode] = useState('');
  const [provName, setProvName] = useState('');
  const [provOwnerName, setProvOwnerName] = useState('');
  const [provOwnerEmail, setProvOwnerEmail] = useState('');
  const [provPhone, setProvPhone] = useState('');
  const [provQuota, setProvQuota] = useState(5);
  const [provUserQuota, setProvUserQuota] = useState(10);
  const [provCompSubmitting, setProvCompSubmitting] = useState(false);

  // Edit Quota Modal State
  const [quotaModalComp, setQuotaModalComp] = useState(null);
  const [newMachineQuota, setNewMachineQuota] = useState(5);
  const [newUserQuota, setNewUserQuota] = useState(10);

  // Approved Credentials Modal State
  const [approvedCreds, setApprovedCreds] = useState(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Provision Machine Modal State
  const [showProvMachine, setShowProvMachine] = useState(false);
  const [machineName, setMachineName] = useState('');
  const [machineCode, setMachineCode] = useState('');
  const [machineCompCode, setMachineCompCode] = useState('TFDEMO');
  const [machineSerial, setMachineSerial] = useState('');
  const [provMachineSubmitting, setProvMachineSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'TurboFix | Pro Platform Control Room';
    if (token) {
      loadAllData(token);
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErr('');
    setLoggingIn(true);
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        throw new Error('Invalid platform password. Access denied.');
      }
      const data = await res.json();
      sessionStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
    } catch (err) {
      setLoginErr(err.message || 'Failed to reach Supabase Edge Control Gateway');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setCompanies([]);
    setMachines([]);
    setTickets([]);
  };

  const loadAllData = async (authToken = token) => {
    setLoading(true);
    setActionErr('');
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const [compRes, machRes, tickRes] = await Promise.all([
        fetch(`${ADMIN_EDGE_URL}/companies`, { headers }),
        fetch(`${ADMIN_EDGE_URL}/machines`, { headers }),
        fetch(`${ADMIN_EDGE_URL}/tickets`, { headers }),
      ]);

      if (compRes.status === 401 || machRes.status === 401) {
        handleLogout();
        throw new Error('Session expired. Please sign in again.');
      }

      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanies(compData.companies || []);
      }
      if (machRes.ok) {
        const machData = await machRes.json();
        setMachines(machData.machines || []);
      }
      if (tickRes.ok) {
        const tickData = await tickRes.json();
        setTickets(tickData.tickets || []);
      }
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Company Actions
  const handleApproveCompany = async (code) => {
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/companies/${code}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to approve company workspace');
      const data = await res.json();
      if (data.temp_password) {
        setApprovedCreds({
          company_code: code,
          owner_name: data.owner_name || 'Plant Owner',
          owner_email: data.owner_email,
          temp_password: data.temp_password,
        });
      }
      setActionSuccess(`Workspace ${code} approved and activated! Owner activation details sent.`);
      loadAllData();
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const handlePauseCompany = async (code) => {
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/companies/${code}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to pause company workspace plan');
      setActionSuccess(`Company ${code} workspace plan paused`);
      loadAllData();
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const handleResumeCompany = async (code) => {
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/companies/${code}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to resume company workspace plan');
      setActionSuccess(`Company ${code} workspace plan resumed`);
      loadAllData();
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const handleDeleteCompany = async (code) => {
    if (!window.confirm(`Are you sure you want to delete workspace ${code}? This will remove all factory records.`)) return;
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/companies/${code}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete company workspace');
      setActionSuccess(`Company ${code} deleted successfully`);
      loadAllData();
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const handleUpdateQuotaSubmit = async (e) => {
    e.preventDefault();
    if (!quotaModalComp) return;
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/companies/${quotaModalComp.company_code}/quota`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ machine_quota: Number(newMachineQuota), user_quota: Number(newUserQuota) }),
      });
      if (!res.ok) throw new Error('Failed to update company quotas');
      setActionSuccess(`Quotas for ${quotaModalComp.company_code} updated — Machines: ${newMachineQuota}, Users: ${newUserQuota}`);
      setQuotaModalComp(null);
      loadAllData();
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const handleProvisionCompanySubmit = async (e) => {
    e.preventDefault();
    setProvCompSubmitting(true);
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/companies/provision`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_code: provCode,
          company_name: provName,
          owner_name: provOwnerName,
          owner_email: provOwnerEmail,
          admin_contact_phone: provPhone,
          machine_quota: Number(provQuota),
          user_quota: Number(provUserQuota),
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Provisioning failed');
      }
      const data = await res.json();
      if (data.temp_password) {
        setApprovedCreds({
          company_code: provCode.toUpperCase(),
          owner_name: provOwnerName || provName,
          owner_email: provOwnerEmail,
          temp_password: data.temp_password,
        });
      }
      setActionSuccess(`Workspace ${provCode.toUpperCase()} provisioned & activated successfully`);
      setShowProvComp(false);
      setProvCode('');
      setProvName('');
      setProvOwnerName('');
      setProvOwnerEmail('');
      setProvPhone('');
      loadAllData();
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setProvCompSubmitting(false);
    }
  };

  // Machine Actions
  const handleUpdateMachineStatus = async (machineId, newStatus) => {
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/machines/status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ machine_id: machineId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update machine status');
      setActionSuccess(`Machine status set to ${newStatus.toUpperCase()}`);
      loadAllData();
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const handleDeleteMachine = async (machineId, machineName) => {
    if (!window.confirm(`Decommission machine "${machineName}" (${machineId.slice(0, 8)})?`)) return;
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/machines/${machineId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to decommission machine');
      setActionSuccess(`Machine "${machineName}" decommissioned successfully`);
      loadAllData();
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const handleProvisionMachineSubmit = async (e) => {
    e.preventDefault();
    setProvMachineSubmitting(true);
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/machines/provision`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: machineName,
          code: machineCode,
          company_code: machineCompCode,
          serial_number: machineSerial,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Machine creation failed');
      }
      setActionSuccess(`Machine ${machineCode.toUpperCase()} provisioned successfully`);
      setShowProvMachine(false);
      setMachineName('');
      setMachineCode('');
      setMachineSerial('');
      loadAllData();
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setProvMachineSubmitting(false);
    }
  };

  // Ticket Actions
  const handleResolveTicket = async (ticketId) => {
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/tickets/${ticketId}/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to resolve breakdown ticket');
      setActionSuccess(`Ticket ${ticketId.slice(0, 8)} resolved`);
      loadAllData();
    } catch (err) {
      setActionErr(err.message);
    }
  };

  // Filtered Computed List
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch =
        c.company_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (statusFilter === 'active') return matchesSearch && (c.status === 'active' || (c.approved === 'yes' && c.status !== 'paused'));
      if (statusFilter === 'paused') return matchesSearch && c.status === 'paused';
      if (statusFilter === 'pending') return matchesSearch && c.approved !== 'yes' && c.status !== 'paused';
      return matchesSearch;
    });
  }, [companies, searchQuery, statusFilter]);

  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.company_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.serial_number.toLowerCase().includes(searchQuery.toLowerCase());
      if (statusFilter === 'running') return matchesSearch && m.status === 'running';
      if (statusFilter === 'breakdown') return matchesSearch && (m.status === 'breakdown' || m.status === 'down');
      if (statusFilter === 'maintenance') return matchesSearch && m.status === 'maintenance';
      return matchesSearch;
    });
  }, [machines, searchQuery, statusFilter]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch =
        (t.id && t.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.machine_code && t.machine_code.toLowerCase().includes(searchQuery.toLowerCase()));
      if (statusFilter === 'open') return matchesSearch && t.status === 'open';
      if (statusFilter === 'resolved') return matchesSearch && t.status === 'resolved';
      return matchesSearch;
    });
  }, [tickets, searchQuery, statusFilter]);

  // Overall Health Metrics
  const healthyCount = machines.filter((m) => m.status === 'running' || m.status === 'healthy').length;
  const breakdownCount = machines.filter((m) => m.status === 'breakdown' || m.status === 'down').length;
  const _maintenanceCount = machines.filter((m) => m.status === 'maintenance').length;
  const totalFleetMachines = machines.length;
  const quotaExceededCompanies = companies.filter(
    (c) => (c.machines_count || 0) > (c.machine_quota || 5) || (c.users_count || 0) > (c.user_quota || 10)
  );
  const totalAiTokens = companies.reduce((acc, c) => acc + (c.ai_tokens_used || 0), 0);

  if (!token) {
    if (!isAuthorizedPath) {
      // Honeypot Decoy Page (Option 3)
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xl border border-slate-700">
                <Shield className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-200">System Administration</h1>
                <p className="text-xs text-slate-500 font-medium tracking-wide">
                  Restricted Operator Gateway • Secure Port 443
                </p>
              </div>
            </div>

            <form onSubmit={handleHoneypotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Administrator Credentials
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={honeypotPassword}
                    onChange={(e) => setHoneypotPassword(e.target.value)}
                    placeholder="Enter security passcode"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 pl-9 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-600"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>
              </div>

              {honeypotErr && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{honeypotErr}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={honeypotSubmitting}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 border border-slate-700 text-xs"
              >
                {honeypotSubmitting ? 'Verifying Security Token...' : 'Authenticate'}
              </button>
            </form>
            <p className="text-[10px] text-slate-600 text-center mt-6">
              Unauthorized access attempts are monitored and recorded. IP address logged.
            </p>
          </div>
        </div>
      );
    }

    // Real Control Room Gateway (Option 2)
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl">
              ϟ
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">TurboFix Control Room</h1>
              <p className="text-xs text-amber-500 font-semibold tracking-wider uppercase">
                Pro Platform Gateway & Machine Operations
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Platform Operator Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter platform admin password"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 pl-9 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            {loginErr && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-xs font-medium">
                {loginErr}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loggingIn ? 'Authenticating...' : 'Open Control Room'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Pro Operations Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20">
            ϟ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wide text-slate-100 text-base">
                TURBOFIX PLATFORM CONTROL
              </span>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                Pro Operations
              </span>
            </div>
            <p className="text-xs text-slate-400">Direct Cloud Gateway & Fleet Machine Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadAllData()}
            title="Refresh Live Telemetry"
            className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <Shield className="w-3.5 h-3.5" /> Direct Cloud Gateway Active
          </span>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Banner Alerts */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-semibold flex items-center justify-between shadow-lg">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {actionSuccess}
            </span>
            <button onClick={() => setActionSuccess('')} className="text-emerald-400 hover:text-emerald-200 text-lg">
              ×
            </button>
          </div>
        )}
        {actionErr && (
          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 text-sm font-semibold flex items-center justify-between shadow-lg">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {actionErr}
            </span>
            <button onClick={() => setActionErr('')} className="text-orange-400 hover:text-orange-200 text-lg">
              ×
            </button>
          </div>
        )}

        {/* Global Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workspaces</p>
              <p className="text-3xl font-black text-slate-100 mt-1">{companies.length}</p>
              <p className="text-[11px] text-emerald-400 font-semibold mt-1">Plant Accounts</p>
            </div>
            <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Machine Fleet</p>
              <p className="text-3xl font-black text-slate-100 mt-1">{totalFleetMachines}</p>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">{healthyCount} Healthy • {breakdownCount} Down</p>
            </div>
            <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Cpu className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fleet Health Index</p>
              <p className="text-3xl font-black text-emerald-400 mt-1">{healthyCount}</p>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">
                {breakdownCount > 0 ? `${breakdownCount} Breakdown Alerts` : 'Zero Active Failures'}
              </p>
            </div>
            <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Breakdown Tickets</p>
              <p className="text-3xl font-black text-orange-400 mt-1">{tickets.length}</p>
              <p className="text-[11px] text-orange-400 font-semibold mt-1">Requires Operator Verification</p>
            </div>
            <div className="p-3.5 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20">
              <Ticket className="w-6 h-6" />
            </div>
          </div>

          <div className={`bg-slate-900/90 border rounded-2xl p-5 flex items-center justify-between shadow-xl ${
            quotaExceededCompanies.length > 0 ? 'border-orange-500/50 bg-orange-950/20' : 'border-slate-800'
          }`}>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quota Exceeded</p>
              <p className={`text-3xl font-black mt-1 ${quotaExceededCompanies.length > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                {quotaExceededCompanies.length}
              </p>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">
                {quotaExceededCompanies.length > 0
                  ? `${quotaExceededCompanies.map(c => c.company_code).join(', ')} over limit`
                  : 'All factories within limits'}
              </p>
            </div>
            <div className={`p-3.5 rounded-2xl border ${quotaExceededCompanies.length > 0 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Global Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('companies');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'companies'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Building2 className="w-4 h-4" /> Workspaces & Organizations ({companies.length})
            </button>

            <button
              onClick={() => {
                setActiveTab('machines');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'machines'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Cpu className="w-4 h-4" /> Factory Machine Fleet ({totalFleetMachines})
            </button>

            <button
              onClick={() => {
                setActiveTab('tickets');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'tickets'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Ticket className="w-4 h-4" /> Breakdown Queue ({tickets.length})
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {activeTab === 'companies' && (
              <button
                onClick={() => setShowProvComp(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
              >
                <Plus className="w-4 h-4" /> Provision Workspace
              </button>
            )}

            {activeTab === 'machines' && (
              <button
                onClick={() => setShowProvMachine(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
              >
                <Plus className="w-4 h-4" /> Provision Machine
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: WORKSPACES & ORGANIZATIONS */}
        {activeTab === 'companies' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Showing {filteredCompanies.length} of {companies.length} Plant Workspaces
              </span>
              <div className="flex items-center gap-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500">Filter:</span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    statusFilter === 'all' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('paused')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    statusFilter === 'paused' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
                  }`}
                >
                  Paused
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    statusFilter === 'pending' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 text-sm">Querying Supabase Edge Gateway...</div>
            ) : filteredCompanies.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">No plant workspaces match your search</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Domain Code</th>
                      <th className="p-4">Organization Name</th>
                      <th className="p-4">Owner / Contact</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Machines (Used / Quota)</th>
                      <th className="p-4">Users (Used / Quota)</th>
                      <th className="p-4">AI Tokens Used</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredCompanies.map((c, idx) => (
                      <tr key={`${c.company_code}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-extrabold text-amber-400 font-mono flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                          {c.company_code}
                        </td>
                        <td className="p-4 text-slate-100 font-semibold">{c.company_name || c.company_code}</td>
                        <td className="p-4">
                          <div className="space-y-0.5 text-xs">
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <User className="w-3 h-3 text-slate-400" />
                              {c.owner_name || 'Plant Manager'}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              {c.owner_email || 'Not specified'}
                            </div>
                            {c.admin_contact_phone && (
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                {c.admin_contact_phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {c.status === 'paused' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <Pause className="w-3 h-3" /> Plan Paused
                            </span>
                          ) : c.approved === 'yes' || c.status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              Pending Approval
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className={(c.machines_count || 0) > (c.machine_quota || 5) ? 'text-orange-400 font-bold' : ''}>
                              {c.machines_count || 0} / {c.machine_quota || 5}
                            </span>
                            {(c.machines_count || 0) > (c.machine_quota || 5) && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded font-bold">OVER</span>
                            )}
                            <button
                              onClick={() => {
                                setQuotaModalComp(c);
                                setNewMachineQuota(c.machine_quota || 5);
                                setNewUserQuota(c.user_quota || 10);
                              }}
                              title="Edit Quotas"
                              className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className={(c.users_count || 0) > (c.user_quota || 10) ? 'text-orange-400 font-bold' : ''}>
                              {c.users_count || 0} / {c.user_quota || 10}
                            </span>
                            {(c.users_count || 0) > (c.user_quota || 10) && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded font-bold">OVER</span>
                            )}
                            <button
                              onClick={() => {
                                setQuotaModalComp(c);
                                setNewMachineQuota(c.machine_quota || 5);
                                setNewUserQuota(c.user_quota || 10);
                              }}
                              title="Edit User & Machine Quotas"
                              className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300">
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <Zap className="w-3.5 h-3.5 text-purple-400" />
                            <span className="font-bold text-slate-200">
                              {(c.ai_tokens_used || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              ({c.ai_requests_count || 0} reqs)
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setQuotaModalComp(c);
                              setNewMachineQuota(c.machine_quota || 5);
                              setNewUserQuota(c.user_quota || 10);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
                            title="Edit User & Machine Quotas"
                          >
                            <Sliders className="w-3.5 h-3.5 text-amber-400" /> Quotas
                          </button>
                          {c.status === 'paused' ? (
                            <button
                              onClick={() => handleResumeCompany(c.company_code)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                              title="Resume Factory Plan"
                            >
                              <Play className="w-3.5 h-3.5" /> Resume
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePauseCompany(c.company_code)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
                              title="Pause Factory Plan"
                            >
                              <Pause className="w-3.5 h-3.5" /> Pause
                            </button>
                          )}
                          {c.approved !== 'yes' && c.status !== 'paused' && (
                            <button
                              onClick={() => handleApproveCompany(c.company_code)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCompany(c.company_code)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FACTORY MACHINE FLEET */}
        {activeTab === 'machines' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Showing {filteredMachines.length} of {machines.length} Fleet Machines
              </span>
              <div className="flex items-center gap-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500">Status:</span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    statusFilter === 'all' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('running')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    statusFilter === 'running' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  Running
                </button>
                <button
                  onClick={() => setStatusFilter('breakdown')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    statusFilter === 'breakdown' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400'
                  }`}
                >
                  Breakdown
                </button>
                <button
                  onClick={() => setStatusFilter('maintenance')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    statusFilter === 'maintenance' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400'
                  }`}
                >
                  Maintenance
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 text-sm">Loading Factory Machinery...</div>
            ) : filteredMachines.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">No machines found matching query</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Machine Name / Code</th>
                      <th className="p-4">Company / Factory</th>
                      <th className="p-4">Serial Number</th>
                      <th className="p-4">Operational Status</th>
                      <th className="p-4">Health Index</th>
                      <th className="p-4 text-right">Machine Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredMachines.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-100">{m.name}</p>
                          <p className="text-xs text-amber-500 font-mono">{m.code}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-200">{m.company_code}</p>
                          <p className="text-xs text-slate-400">{m.factory_name}</p>
                        </td>
                        <td className="p-4 text-slate-400 font-mono text-xs">{m.serial_number}</td>
                        <td className="p-4">
                          {m.status === 'running' || m.status === 'healthy' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <Check className="w-3 h-3" /> Running
                            </span>
                          ) : m.status === 'breakdown' || m.status === 'down' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                              <AlertTriangle className="w-3 h-3" /> Breakdown
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              <Wrench className="w-3 h-3" /> Maintenance
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-300 font-bold">{m.health_score}%</td>
                        <td className="p-4 text-right space-x-2">
                          {m.status !== 'running' && (
                            <button
                              onClick={() => handleUpdateMachineStatus(m.id, 'running')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Reset to Healthy
                            </button>
                          )}

                          {m.status !== 'maintenance' && (
                            <button
                              onClick={() => handleUpdateMachineStatus(m.id, 'maintenance')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Set Maintenance
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteMachine(m.id, m.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Decommission
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BREAKDOWN QUEUE */}
        {activeTab === 'tickets' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Showing {filteredTickets.length} Breakdown Tickets
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 text-sm">Fetching Breakdown Tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">No active breakdown tickets found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Ticket ID</th>
                      <th className="p-4">Issue Description</th>
                      <th className="p-4">Reported At</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono font-bold text-amber-500 text-xs">{t.id.slice(0, 8)}</td>
                        <td className="p-4 text-slate-200 max-w-md">{t.description || t.issue_text || 'Breakdown issue reported'}</td>
                        <td className="p-4 text-slate-400 text-xs">{new Date(t.created_at || Date.now()).toLocaleString()}</td>
                        <td className="p-4">
                          {t.status === 'resolved' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                              Open Breakdown
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {t.status !== 'resolved' && (
                            <button
                              onClick={() => handleResolveTicket(t.id)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                            >
                              Force Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: Provision Company */}
      {showProvComp && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                Provision Organization Workspace
              </h3>
              <p className="text-xs text-slate-400 mt-1">Register a new factory client with full owner credentials and machine/user operational limits.</p>
            </div>
            <form onSubmit={handleProvisionCompanySubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Company Code / Domain</label>
                  <input
                    type="text"
                    value={provCode}
                    onChange={(e) => setProvCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ACME"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Company Full Name</label>
                  <input
                    type="text"
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    placeholder="e.g. Acme Manufacturing Ltd."
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Owner / Plant Manager Name</label>
                  <input
                    type="text"
                    value={provOwnerName}
                    onChange={(e) => setProvOwnerName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Owner Email Address</label>
                  <input
                    type="email"
                    value={provOwnerEmail}
                    onChange={(e) => setProvOwnerEmail(e.target.value)}
                    placeholder="e.g. rajesh@acme.com"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Owner Contact Phone (WhatsApp)</label>
                <input
                  type="text"
                  value={provPhone}
                  onChange={(e) => setProvPhone(e.target.value)}
                  placeholder="e.g. +919876543210"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Machine Quota</label>
                  <input
                    type="number"
                    value={provQuota}
                    onChange={(e) => setProvQuota(e.target.value)}
                    min="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">User Quota</label>
                  <input
                    type="number"
                    value={provUserQuota}
                    onChange={(e) => setProvUserQuota(e.target.value)}
                    min="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProvComp(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provCompSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors disabled:opacity-50 shadow-lg shadow-amber-500/20"
                >
                  {provCompSubmitting ? 'Provisioning...' : 'Provision Organization Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Approved Workspace Credentials */}
      {approvedCreds && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl shadow-emerald-500/10">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Workspace Approved & Activated!</h3>
              <p className="text-xs text-slate-400 mt-1">An activation email has been queued for the plant owner.</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Workspace Code:</span>
                <span className="font-extrabold text-amber-400">{approvedCreds.company_code}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Owner Name:</span>
                <span className="font-semibold text-slate-200">{approvedCreds.owner_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Owner Email:</span>
                <span className="font-semibold text-emerald-400">{approvedCreds.owner_email}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400">Auto Password:</span>
                <span className="font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-sm tracking-wider">
                  {approvedCreds.temp_password}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const text = `TurboFix Workspace Approved!\nDomain: ${approvedCreds.company_code}\nOwner: ${approvedCreds.owner_name}\nEmail: ${approvedCreds.owner_email}\nPassword: ${approvedCreds.temp_password}\nLogin: https://turbofix.co.in/login.html`;
                  navigator.clipboard.writeText(text);
                  setCopiedCreds(true);
                  setTimeout(() => setCopiedCreds(false), 2500);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                {copiedCreds ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 text-amber-400" />
                    Copy Credentials
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setApprovedCreds(null)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Quotas (Machine + User) */}
      {quotaModalComp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">
              Edit Quotas: <span className="text-amber-400">{quotaModalComp.company_code}</span>
            </h3>
            <p className="text-xs text-slate-400">Set the maximum number of machines and users this factory is allowed. If exceeded, the factory must contact TurboFix admin for approval.</p>
            <form onSubmit={handleUpdateQuotaSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Machine Quota</label>
                  <input
                    type="number"
                    value={newMachineQuota}
                    onChange={(e) => setNewMachineQuota(e.target.value)}
                    min="1"
                    max="500"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Current: {quotaModalComp.machines_count || 0} machines</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">User Quota</label>
                  <input
                    type="number"
                    value={newUserQuota}
                    onChange={(e) => setNewUserQuota(e.target.value)}
                    min="1"
                    max="500"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Current: {quotaModalComp.users_count || 0} users</p>
                </div>
              </div>
              {((quotaModalComp.machines_count || 0) > newMachineQuota || (quotaModalComp.users_count || 0) > newUserQuota) && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Warning: Current usage exceeds the new quota. The factory will need to reduce usage or request an increase.
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuotaModalComp(null)}
                  className="px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                >
                  Save Quota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Provision Machine */}
      {showProvMachine && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">Provision New Factory Machine</h3>
            <form onSubmit={handleProvisionMachineSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Target Company Code</label>
                <select
                  value={machineCompCode}
                  onChange={(e) => setMachineCompCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {companies.map((c) => (
                    <option key={c.company_code} value={c.company_code}>
                      {c.company_code} &mdash; {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Machine Name</label>
                <input
                  type="text"
                  value={machineName}
                  onChange={(e) => setMachineName(e.target.value)}
                  placeholder="e.g. High Precision CNC Milling Center"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Machine Code</label>
                <input
                  type="text"
                  value={machineCode}
                  onChange={(e) => setMachineCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CNC-09"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Serial Number (Optional)</label>
                <input
                  type="text"
                  value={machineSerial}
                  onChange={(e) => setMachineSerial(e.target.value)}
                  placeholder="e.g. SN-884920"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProvMachine(false)}
                  className="px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provMachineSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  {provMachineSubmitting ? 'Provisioning...' : 'Provision Machine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
