import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { safeRedirectPath } from '../utils/auth';
import { Mail, Lock, ArrowRight, CheckCircle, Eye, EyeOff, ShieldCheck, Wrench, Building2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [view, setView] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [companyCode, setCompanyCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  // Quick demo logins use the app's existing demo-data mode. They must not
  // depend on remote accounts being provisioned.
  const demoAccounts = [
    { role: 'Plant Owner', email: 'owner@turbofix.co.in', name: 'Demo Owner', company: 'ACME3', icon: Building2, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' },
    { role: 'Maintenance Lead', email: 'lead@turbofix.co.in', name: 'Demo Lead', company: 'ACME3', icon: ShieldCheck, color: 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20' },
    { role: 'Technician', email: 'tech@turbofix.co.in', name: 'Demo Tech', company: 'ACME3', icon: Wrench, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' },
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
    setError(null);
    const role = demo.role.includes('Owner') ? 'owner' : demo.role.includes('Lead') ? 'supervisor' : 'maintenance_technician';
    localStorage.setItem('tf_token', `demo:${role}`);
    localStorage.setItem('tf_user', JSON.stringify({
      user_id: `demo-${role}`,
      name: demo.name,
      role,
      company_code: demo.company,
      inventory_mode: 'demo',
      email: demo.email,
    }));
    window.dispatchEvent(new Event('authChanged'));
    performPostLoginRedirect();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loginEmail = identifier.includes('@') ? identifier : `${identifier}@phone.turbofix.co.in`;
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (signInError || !data?.user || !data.session?.access_token) {
        throw new Error('Invalid credentials. Check your phone/email and password, or use Quick Demo Access.');
      }
      const authUser = data.user;
      const meta = authUser.user_metadata || {};
      const appUser = {
        user_id: meta.user_id || authUser.id,
        name: meta.name || meta.full_name || loginEmail.split('@')[0],
        role: meta.role || 'owner',
        company_code: meta.company_code || '',
        email: authUser.email,
      };

      localStorage.setItem('tf_token', data.session.access_token);
      localStorage.setItem('tf_user', JSON.stringify(appUser));
      window.dispatchEvent(new Event('authChanged'));
      
      performPostLoginRedirect();
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (regPassword.length < 8) throw new Error('Password must be at least 8 characters.');

      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password: regPassword,
          options: {
            data: {
              name: ownerName,
              role: 'owner',
              company_code: companyCode.toUpperCase(),
              company_name: companyName,
              phone,
            }
          }
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          await supabase.from('companies').insert({
            name: companyName,
            domain: companyCode.toLowerCase(),
            status: 'pending',
          });
        }
      } catch (spErr) {
        console.warn('Supabase registration API notice:', spErr);
      }

      setSuccess('Registration submitted. A TurboFix administrator will review and activate your workspace within 2 hours.');
      setCompanyCode(''); setCompanyName(''); setPhone(''); setOwnerName(''); setEmail(''); setRegPassword('');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <div className="w-full flex-1 flex flex-col justify-center items-center p-4 py-8">
        <div className="w-[92vw] sm:w-[460px] max-w-[460px] bg-[#131922]/90 rounded-2xl shadow-2xl border border-slate-800/80 overflow-hidden backdrop-blur-xl transition-all">
          <div className="p-8">
            {view === 'login' ? (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 shadow-inner">
                    <ShieldCheck size={24} />
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Staff Sign-In</h1>
                  <p className="text-slate-400 text-sm">Access your TurboFix enterprise portal.</p>
                </div>

                {/* Quick 1-Tap Demo Logins */}
                <div className="mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">Quick Demo Access (1-Tap)</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {demoAccounts.map((demo) => {
                      const Icon = demo.icon;
                      return (
                        <button
                          key={demo.role}
                          type="button"
                          onClick={() => handleDemoLogin(demo)}
                          disabled={loading}
                          className={`flex flex-col items-center justify-center gap-1 px-1 py-2.5 min-h-[64px] rounded-xl border text-[11px] font-medium transition-all ${demo.color} disabled:opacity-50`}
                          title={`Log in as ${demo.name} (${demo.role})`}
                        >
                          <Icon size={18} />
                          <span className="w-full text-center leading-tight whitespace-normal">{demo.role}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative flex items-center justify-center mb-6">
                  <div className="border-t border-slate-800 w-full"></div>
                  <span className="bg-[#131922] px-3 text-xs text-slate-500 uppercase tracking-wider absolute">or credentials</span>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-sm flex items-start gap-2 animate-fadeIn">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Phone or Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. owner@turbofix.co.in or 9876543210"
                        value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all" 
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-slate-300">Password</label>
                      <a href="/reset-password.html" className="text-xs text-emerald-400 hover:underline">Forgot password?</a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        required
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-70 text-sm mt-2 active:scale-[0.99]"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Authenticating...
                      </span>
                    ) : (
                      <>
                        Sign In <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center pt-4 border-t border-slate-800/80">
                  <button type="button" onClick={() => { setView('register'); setError(null); }} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-emerald-400 hover:underline">
                    New factory? Register your company
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 shadow-inner">
                    <Building2 size={24} />
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Register Company</h1>
                  <p className="text-slate-400 text-sm">Create an enterprise owner account for your factory.</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-sm flex items-start gap-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3.5 bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 rounded-xl text-sm flex items-start gap-2">
                    <CheckCircle size={18} className="shrink-0 mt-0.5 text-emerald-400" />
                    <span>{success}</span>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Company Code</label>
                      <input type="text" required placeholder="e.g. ACME" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-sm uppercase text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Company Name</label>
                      <input type="text" required placeholder="Acme Auto Ltd." value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Owner / Plant Lead Name</label>
                    <input type="text" required placeholder="e.g. Rajesh Sharma" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                      <input type="email" required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                      <input type="tel" required placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Account Password</label>
                    <input type="password" required minLength={8} placeholder="At least 8 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-70 text-sm mt-3"
                  >
                    {loading ? 'Submitting Registration...' : 'Submit Company Registration'}
                  </button>
                </form>

                <div className="mt-6 text-center pt-4 border-t border-slate-800/80">
                  <button type="button" onClick={() => { setView('login'); setError(null); }} className="inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-sm font-medium text-slate-400 transition-colors hover:text-white">
                    &larr; Back to Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
