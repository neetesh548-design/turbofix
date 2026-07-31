import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { safeRedirectPath } from '../utils/auth';
import { ShieldCheck, Wrench, Building2, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function DemoLogin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const demoAccounts = [
    { role: 'Plant VP (Exide)', email: 'owner@exidebattery.in', name: 'Anil Subrahmanian (VP)', company: 'exidebattery', desc: 'Full plant executive view, MTBF/MTTR analytics & SLA control', icon: Building2, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-emerald-950/40' },
    { role: 'Battery Shift Lead', email: 'supervisor@exidebattery.in', name: 'Ramesh Chander', company: 'exidebattery', desc: 'Shift breakdown triage, technician assignments & downtime logs', icon: ShieldCheck, color: 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 shadow-blue-950/40' },
    { role: 'Reliability Lead', email: 'engineer@exidebattery.in', name: 'Dr. Arindam Banerjee', company: 'exidebattery', desc: '5-Why RCA root cause analysis, PM schedules & machine health', icon: ShieldCheck, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20 shadow-indigo-950/40' },
    { role: 'Lead Technician', email: 'technician@exidebattery.in', name: 'Manoj Mukherjee', company: 'exidebattery', desc: 'Field repair tasklists, spare parts verification & closure logs', icon: Wrench, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 shadow-amber-950/40' },
    { role: 'EHS & Quality Manager', email: 'safety@exidebattery.in', name: 'Sneha Kulkarni', company: 'exidebattery', desc: 'Safety audit logs, compliance records & 5S quality checks', icon: CheckCircle, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 shadow-cyan-950/40' },
  ];

  const performPostLoginRedirect = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const queryRedirect = searchParams.get('redirect') || searchParams.get('returnUrl') || searchParams.get('next');
    const storedRedirect = sessionStorage.getItem('tf_post_login_redirect') || localStorage.getItem('tf_post_login_redirect');
    const rawTarget = queryRedirect || storedRedirect;

    sessionStorage.removeItem('tf_post_login_redirect');
    localStorage.removeItem('tf_post_login_redirect');

    navigate(safeRedirectPath(rawTarget, import.meta.env.BASE_URL), { replace: true });
  };

  const handleDemoLogin = (demo) => {
    setLoading(true);
    let role = 'owner';
    if (demo.role.includes('Supervisor') || demo.role.includes('Shift Lead')) role = 'supervisor';
    else if (demo.role.includes('Engineer') || demo.role.includes('Reliability')) role = 'maintenance_engineer';
    else if (demo.role.includes('Technician')) role = 'technician';
    else if (demo.role.includes('Safety') || demo.role.includes('Quality')) role = 'quality_inspector';
    else if (demo.role.includes('VP') || demo.role.includes('Owner')) role = 'owner';

    localStorage.setItem('tf_token', `demo:${role}`);
    localStorage.setItem('tf_user', JSON.stringify({
      user_id: `demo-${role}`,
      name: demo.name,
      role,
      company_code: demo.company,
      company_name: 'Exide Energy Industries Ltd',
      inventory_mode: 'demo',
      email: demo.email,
    }));
    window.dispatchEvent(new Event('authChanged'));
    performPostLoginRedirect();
  };

  return (
    <div className="tf-login-page min-h-screen w-full bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <div className="tf-login-shell w-full flex-1 flex items-center justify-center px-4 py-8 sm:p-10">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles size={14} /> Sample Interactive Demo Mode
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
              Explore TurboFix Demo Login
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
              Select a factory persona below to test live breakdown reporting, WhatsApp alerts, RCA workflows, and executive dashboards with sample data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {demoAccounts.map((demo) => {
              const Icon = demo.icon;
              return (
                <button
                  key={demo.role}
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin(demo)}
                  className={`flex flex-col justify-between p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer shadow-lg hover:scale-[1.02] ${demo.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/50">
                        <Icon size={20} />
                      </div>
                      <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-slate-900/80 text-white border border-slate-700/60">1-Tap Login</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{demo.role}</h3>
                    <p className="text-xs text-slate-300 mb-3">{demo.name}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{demo.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-400">
                    <span>Launch Demo Workspace</span>
                    <ArrowRight size={14} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-center pt-4 border-t border-slate-800/80">
            <p className="text-xs text-slate-400 mb-2">Have a real factory account?</p>
            <Link
              to="/login.html"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Go to Actual Plant Login <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
