import { useState, useEffect } from 'react';
import { Shield, Building2, Cpu, Ticket, CheckCircle2, Trash2, LogOut, Lock } from 'lucide-react';

const ADMIN_EDGE_URL = 'https://yvpiaqsoxsamwzaqdvzk.supabase.co/functions/v1/admin_portal';
const TOKEN_KEY = 'tf_supabase_admin_token';

export default function AdminPortal() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionErr, setActionErr] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Provision modal form state
  const [showProvision, setShowProvision] = useState(false);
  const [provCode, setProvCode] = useState('');
  const [provName, setProvName] = useState('');
  const [provPhone, setProvPhone] = useState('');
  const [provQuota, setProvQuota] = useState(5);
  const [provisioning, setProvisioning] = useState(false);

  useEffect(() => {
    document.title = 'TurboFix | Platform Operations Control Room';
    if (token) {
      fetchCompanies(token);
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
  };

  const fetchCompanies = async (authToken) => {
    setLoading(true);
    setActionErr('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/companies`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        handleLogout();
        throw new Error('Session expired. Please sign in again.');
      }
      if (!res.ok) throw new Error('Failed to load company records');
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (code) => {
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/companies/${code}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to approve company workspace');
      setActionSuccess(`Company ${code} approved successfully`);
      fetchCompanies(token);
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const handleDelete = async (code) => {
    if (!window.confirm(`Are you sure you want to delete workspace ${code}? This cannot be undone.`)) return;
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await fetch(`${ADMIN_EDGE_URL}/companies/${code}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete company workspace');
      setActionSuccess(`Company ${code} deleted successfully`);
      fetchCompanies(token);
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setProvisioning(true);
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
          admin_contact_phone: provPhone,
          machine_quota: Number(provQuota),
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Provisioning failed');
      }
      setActionSuccess(`Workspace ${provCode.toUpperCase()} provisioned successfully`);
      setShowProvision(false);
      setProvCode('');
      setProvName('');
      setProvPhone('');
      fetchCompanies(token);
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setProvisioning(false);
    }
  };

  if (!token) {
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
                Supabase Edge Platform Gateway
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
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium">
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

  const totalMachines = companies.reduce((acc, c) => acc + (c.machines_count || 0), 0);
  const totalOpenTickets = companies.reduce((acc, c) => acc + (c.open_tickets_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg">
            ϟ
          </div>
          <span className="font-extrabold tracking-wide text-slate-100">
            TURBOFIX PLATFORM CONTROL <span className="text-amber-500 text-xs ml-2 uppercase font-semibold">Supabase Edge</span>
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Shield className="w-3.5 h-3.5" /> Direct Cloud Gateway Active
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Banner / Flash Alerts */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-semibold flex items-center justify-between">
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess('')} className="text-emerald-400 hover:text-emerald-200">×</button>
          </div>
        )}
        {actionErr && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-semibold flex items-center justify-between">
            <span>{actionErr}</span>
            <button onClick={() => setActionErr('')} className="text-red-400 hover:text-red-200">×</button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Workspaces</p>
              <p className="text-3xl font-extrabold text-slate-100">{companies.length}</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Fleet Machines</p>
              <p className="text-3xl font-extrabold text-slate-100">{totalMachines}</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Breakdown Tickets</p>
              <p className="text-3xl font-extrabold text-slate-100">{totalOpenTickets}</p>
            </div>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between pt-4">
          <h2 className="text-xl font-bold text-slate-100">Onboarded Plant Organizations</h2>
          <button
            onClick={() => setShowProvision(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors text-sm"
          >
            + Provision New Workspace
          </button>
        </div>

        {/* Provision Modal */}
        {showProvision && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-100">Provision Organization Workspace</h3>
              <form onSubmit={handleProvisionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Company Domain Code</label>
                  <input
                    type="text"
                    value={provCode}
                    onChange={(e) => setProvCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ACME"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Admin Contact Phone</label>
                  <input
                    type="text"
                    value={provPhone}
                    onChange={(e) => setProvPhone(e.target.value)}
                    placeholder="e.g. +919876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Machine Quota</label>
                  <input
                    type="number"
                    value={provQuota}
                    onChange={(e) => setProvQuota(e.target.value)}
                    min="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProvision(false)}
                    className="px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={provisioning}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {provisioning ? 'Provisioning...' : 'Confirm Provisioning'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Querying Supabase Edge Gateway...</div>
          ) : companies.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No companies registered yet</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Company Code</th>
                  <th className="p-4">Organization Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Machines (Used / Quota)</th>
                  <th className="p-4">Users</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {companies.map((c) => (
                  <tr key={c.company_code} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-slate-100">{c.company_code}</td>
                    <td className="p-4 text-slate-300">{c.company_name || c.company_code}</td>
                    <td className="p-4">
                      {c.approved === 'yes' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-300">
                      {c.machines_count || 0} / {c.machine_quota || 5}
                    </td>
                    <td className="p-4 text-slate-300">{c.users_count || 0}</td>
                    <td className="p-4 text-right space-x-2">
                      {c.approved !== 'yes' && (
                        <button
                          onClick={() => handleApprove(c.company_code)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c.company_code)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
