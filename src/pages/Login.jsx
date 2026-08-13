import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { safeRedirectPath } from '../utils/auth';
import { apiFetch } from '../lib/api';
import { Mail, Lock, ArrowRight, CheckCircle, Eye, EyeOff, ShieldCheck, Building2, AlertCircle } from 'lucide-react';

const humanizeAuthFailure = (err, fallback) => {
  if (!err) return fallback;
  if (err.status === 401) return 'Invalid credentials. Check your phone/email and password, or use Quick Demo Access.';
  if (err.status === 403) return err.message || 'Your company is pending approval before sign-in.';
  return err.message || fallback;
};

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
  // Every tenant-scoping check downstream (Dashboard, Tickets, Inventory,
  // Machines) filters rows against user.company_id, but neither login path
  // below has ever set it — only company_code. Resolve it once here so the
  // rest of the app can actually tell this company's machines/parts/tickets
  // apart from every other company's, instead of relying on RLS alone.
  const resolveCompanyId = async (companyCode) => {
    if (!companyCode) return null;
    try {
      const { data } = await supabase.from('companies').select('id').ilike('domain', companyCode).maybeSingle();
      return data?.id || null;
    } catch {
      return null;
    }
  };

  const toLoginEmail = (rawIdentifier) => (
    rawIdentifier.includes('@') ? rawIdentifier.trim() : `${rawIdentifier.trim()}@phone.turbofix.co.in`
  );

  // The backend's own JWT (tf_token) is all the FastAPI routes need, but
  // every direct-from-browser Supabase call — supabase.functions.invoke(),
  // RLS-scoped supabase.from() reads — is authenticated separately, off
  // whatever session the Supabase JS client itself is holding. Without
  // this, that client never has one, so it silently sends the anon key as
  // the bearer token; server-side, that fails auth.getUser() and comes
  // back as "Your session has expired" on the very first Team/Inventory/
  // Edge Function call after a login that, from the user's side, worked.
  const establishSupabaseSession = async (rawIdentifier) => {
    try {
      await supabase.auth.signInWithPassword({ email: toLoginEmail(rawIdentifier), password });
    } catch {
      // Best-effort — accounts that only exist in the backend's own store
      // (not yet provisioned into Supabase Auth) simply won't get a
      // session here, same as before this call existed.
    }
  };

  const performPostLoginRedirect = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const queryRedirect = searchParams.get('redirect') || searchParams.get('returnUrl') || searchParams.get('next');
    const storedRedirect = sessionStorage.getItem('tf_post_login_redirect') || localStorage.getItem('tf_post_login_redirect');
    const rawTarget = queryRedirect || storedRedirect;

    sessionStorage.removeItem('tf_post_login_redirect');
    localStorage.removeItem('tf_post_login_redirect');

    navigate(safeRedirectPath(rawTarget, import.meta.env.BASE_URL), { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 1. Primary Authentication Path: Backend REST API (/auth/login)
      try {
        // apiFetch throws for every non-2xx status (with a `.status` on the
        // error), so reaching this line at all means the login succeeded.
        const apiResp = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            identifier: identifier.trim(),
            password: password,
          }),
        });

        const resData = await apiResp.json();
        if (resData.access_token && resData.user) {
          const companyId = await resolveCompanyId(resData.user.company_code);
          localStorage.setItem('tf_token', resData.access_token);
          localStorage.setItem('tf_user', JSON.stringify({ ...resData.user, company_id: companyId }));
          await establishSupabaseSession(identifier);
          window.dispatchEvent(new Event('authChanged'));

          if (resData.user.must_change_password) {
            navigate(`${import.meta.env.BASE_URL}reset-password.html?must_change=true`, { replace: true });
            return;
          }

          performPostLoginRedirect();
          return;
        }
      } catch (backendErr) {
        // A 403 from /auth/login means exactly one thing (see
        // auth_router.py): the company is registered but an admin hasn't
        // approved it yet. That's a hard stop — falling through to the
        // Supabase fallback below would let an unapproved company log in
        // anyway, since GoTrue has no concept of company approval. This
        // used to be checked by string-matching the error message for
        // "pending approval", which never matched the backend's actual
        // wording ("pending TurboFix admin approval") and silently let
        // every unapproved company straight through.
        if (backendErr.status === 403) {
          throw backendErr;
        }
        // Otherwise (invalid credentials, network error, timeout, 5xx) —
        // proceed to the Supabase fallback, same as before.
      }

      // 2. Secondary Fallback Path: Direct Supabase Client Auth
      const loginEmail = toLoginEmail(identifier);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (signInError || !data?.user || !data.session?.access_token) {
        throw new Error(humanizeAuthFailure(signInError, 'Login failed. Please try again in a moment.'));
      }
      const authUser = data.user;
      const meta = authUser.user_metadata || {};
      const companyId = await resolveCompanyId(meta.company_code);
      const appUser = {
        user_id: meta.user_id || authUser.id,
        name: meta.name || meta.full_name || loginEmail.split('@')[0],
        role: meta.role || 'owner',
        company_code: meta.company_code || '',
        company_id: companyId,
        email: authUser.email,
      };

      localStorage.setItem('tf_token', data.session.access_token);
      localStorage.setItem('tf_user', JSON.stringify(appUser));
      window.dispatchEvent(new Event('authChanged'));
      
      performPostLoginRedirect();
    } catch (err) {
      setError(humanizeAuthFailure(err, 'Login failed. Please try again in a moment.'));
    } finally {
      setLoading(false);
    }
  };

  // Registration goes through the backend's own POST /auth/register (rate-
  // limited, real password-strength + duplicate email/phone checks, writes
  // via the backend's UserRepository) instead of writing to Supabase
  // directly from the browser. The direct-write version silently failed on
  // every real attempt — public.companies has RLS enabled with no INSERT
  // policy for anonymous self-registration, so the insert was always denied,
  // the error was only console.warn'd, and this form told every prospect
  // their signup succeeded regardless. See LESSONS_LEARNED.md.
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (regPassword.length < 8) throw new Error('Password must be at least 8 characters long.');

      const cleanCode = companyCode.toUpperCase().trim();
      const cleanName = companyName.trim();
      const cleanPhone = phone.trim();
      const cleanOwner = ownerName.trim();
      const cleanEmail = email.trim();

      if (!cleanCode || !cleanName || !cleanOwner || !cleanEmail || !cleanPhone) {
        throw new Error('All registration fields are required.');
      }

      const apiResp = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          company_code: cleanCode,
          company_name: cleanName,
          admin_contact_phone: cleanPhone,
          owner_name: cleanOwner,
          owner_email: cleanEmail,
          owner_password: regPassword,
        }),
      });

      const resData = await apiResp.json().catch(() => ({}));

      // apiFetch only throws for 401/403/404/429/5xx — /auth/register's own
      // validation/conflict responses (400 bad password, 409 duplicate
      // company/email/phone) come back here as an ordinary non-ok response,
      // so they must be checked explicitly rather than relying on a throw.
      if (!apiResp.ok) {
        throw new Error(resData.detail || 'Registration failed. Please try again or contact support at turbofixsolution@gmail.com');
      }

      setSuccess(resData.message || `Your company registration request for "${cleanName}" (${cleanCode}) has been submitted to the admin for approval!`);
      setError(null);
      setCompanyCode(''); setCompanyName(''); setPhone(''); setOwnerName(''); setEmail(''); setRegPassword('');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again or contact support at turbofixsolution@gmail.com');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="tf-login-page min-h-screen w-full bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <div className="tf-login-shell w-full flex-1 flex items-center justify-center px-3 py-6 sm:p-8">
        <div className="tf-login-layout w-full max-w-6xl grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-14 items-center">
          <section className="tf-login-intro hidden lg:block" aria-label="TurboFix platform overview">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,.8)]" /> Secure staff workspace
            </div>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-[1.05] tracking-tight text-white">Keep every machine moving.</h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-400">One calm control room for breakdown response, preventive maintenance, plant knowledge, and team execution.</p>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                ['01', 'See risk early'],
                ['02', 'Assign the right work'],
                ['03', 'Close the loop'],
              ].map(([number, label]) => (
                <div key={number} className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
                  <span className="text-xs font-semibold tracking-widest text-emerald-400">{number}</span>
                  <p className="mt-2 text-sm font-medium leading-5 text-slate-200">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 flex items-center gap-2 text-sm text-slate-400"><ShieldCheck size={16} className="text-emerald-400" /> Role-based access · Audit-ready workflows</p>
          </section>

          <div className="w-full max-w-[460px] justify-self-center lg:justify-self-end bg-[#131922]/95 rounded-3xl shadow-2xl shadow-black/30 border border-slate-700/70 overflow-hidden backdrop-blur-xl transition-all">
          <div className="border-b border-slate-800/80 bg-slate-950/25 px-5 py-3.5 sm:px-8">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400"><span>TurboFix platform</span><span className="flex items-center gap-1.5 text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Protected access</span></div>
          </div>
          <div className="p-5 sm:p-8">
            <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => { setView('login'); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${view === 'login' ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setView('register'); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${view === 'register' ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Register Company
              </button>
            </div>
            {view === 'login' ? (
              <>
                <div className="text-center mb-5 sm:mb-6">
                  <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 shadow-inner">
                    <ShieldCheck size={22} />
                  </div>
                  <h1 className="tf-login-title text-[1.7rem] sm:text-2xl font-bold text-white tracking-tight normal-case mb-1">Staff Sign-In</h1>
                  <p className="text-slate-400 text-sm">Access your TurboFix enterprise portal.</p>
                </div>



                {error && (
                  <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-sm flex items-start gap-2 animate-fadeIn">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-3.5 sm:space-y-4">
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
                        className="w-full min-h-11 pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
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
                        className="w-full min-h-11 pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
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
                    className="w-full min-h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-70 text-sm mt-2 active:scale-[0.99]"
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

                <div className="mt-5 sm:mt-6 text-center pt-4 border-t border-slate-800/80 flex flex-col gap-2">
                  <button type="button" onClick={() => { setView('register'); setError(null); setSuccess(null); }} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-emerald-400 hover:underline">
                    New factory? Register your company
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-5 sm:mb-6">
                  <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 shadow-inner">
                    <Building2 size={22} />
                  </div>
                  <h1 className="tf-login-title text-2xl font-bold text-white tracking-tight normal-case mb-1">Register Company</h1>
                  <p className="text-slate-400 text-sm">Create an enterprise owner account for your factory.</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-sm flex items-start gap-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="mb-5 p-4 bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 rounded-2xl text-sm space-y-2.5 shadow-lg shadow-emerald-950/40 animate-fadeIn">
                    <div className="flex items-start gap-2.5 font-bold text-emerald-300 text-base">
                      <CheckCircle size={22} className="shrink-0 text-emerald-400 mt-0.5" />
                      <span>Registration Request Submitted!</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-8">
                      {success}
                    </p>
                    <div className="pt-2 pl-8 flex flex-wrap items-center gap-2">
                      <a
                        href="mailto:turbofixsolution@gmail.com?subject=TurboFix%20Workspace%20Activation%20Request"
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition-colors shadow"
                      >
                        <Mail size={15} /> Contact Support: turbofixsolution@gmail.com
                      </a>
                    </div>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
    </div>
  );
}
