
import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { supabase } from '../supabaseClient';
import { KeyRound, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Separate success/error for each step
  const [requestSuccess, setRequestSuccess] = useState('');
  const [requestError, setRequestError] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [step, setStep] = useState('request');
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [isInvite, setIsInvite] = useState(false);
  // Loading states
  const [requestLoading, setRequestLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    document.title = 'Reset Password | TurboFix';
    window.scrollTo(0, 0);

    let active = true;
    // Read params BEFORE Supabase clears the hash (synchronous, runs first)
    const params = new URLSearchParams(window.location.search);
    const rawHash = window.location.hash;
    const hashParams = new URLSearchParams(rawHash.replace(/^#/, ''));

    const urlType = params.get('type') || hashParams.get('type') || '';
    if (urlType === 'invite' || urlType === 'signup') setIsInvite(true);

    const errorDescription = params.get('error_description') || hashParams.get('error_description') || '';
    const errorMsg = errorDescription
      ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
      : (params.get('error') || hashParams.get('error')) ? 'This link is invalid or has expired.' : '';

    if (errorMsg) {
      setRequestError(errorMsg);
    }

    const hasRecoveryPayload =
      !errorMsg && (
        params.has('code') ||
        params.has('token') ||
        hashParams.has('access_token') ||
        hashParams.get('type') === 'recovery' ||
        urlType === 'invite' ||
        urlType === 'signup'
      );

    // Track whether we have already resolved the step so two async paths
    // (onAuthStateChange + initialise) don't fight each other.
    let resolved = false;
    const resolve = (hasSession) => {
      if (!active || resolved) return;
      resolved = true;
      setStep(hasSession || hasRecoveryPayload ? 'reset' : 'request');
      setCheckingRecovery(false);
    };

    // onAuthStateChange fires FIRST with INITIAL_SESSION (synchronously in
    // Supabase JS v2). If Supabase already processed the hash token before our
    // useEffect ran, we get a valid session here immediately — no race.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === 'PASSWORD_RECOVERY') {
        // Explicit recovery — go straight to set-password step
        setIsInvite(false);
        if (!resolved) {
          resolved = true;
          setStep('reset');
          setCheckingRecovery(false);
        }
      } else if (event === 'SIGNED_IN') {
        // Covers invite links and magic-link sign-ins
        if (!resolved) {
          resolved = true;
          setStep('reset');
          setCheckingRecovery(false);
        }
      } else if (event === 'INITIAL_SESSION') {
        // Fires immediately on listener registration with the current session.
        // If the Supabase client already consumed the URL hash and created a
        // session, session will be non-null here — use it.
        if (session) {
          if (!resolved) {
            resolved = true;
            setStep('reset');
            setCheckingRecovery(false);
          }
        }
        // If session is null, let initialise() do the code exchange first.
      }
    });

    const initialise = async () => {
      try {
        // PKCE code flow (most common for modern Supabase projects)
        if (params.get('code')) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.get('code'));
          if (error && !resolved) {
            setResetMsg('This link is invalid or has expired. Request a new one.');
          }
          // onAuthStateChange will fire SIGNED_IN / PASSWORD_RECOVERY and call resolve()
          // Fallback in case the event never fires:
          if (!resolved) {
            const { data } = await supabase.auth.getSession();
            resolve(Boolean(data?.session));
          }
          return;
        }

        // Legacy token flow: ?token=xxx&type=invite or ?token=xxx&type=recovery
        if (params.get('token')) {
          const tokenType = params.get('type') || 'recovery';
          const { error } = await supabase.auth.verifyOtp({
            token_hash: params.get('token'),
            type: tokenType,
          });
          if (error && !resolved) {
            setResetMsg('This link is invalid or has expired. Request a new one.');
          }
          if (!resolved) {
            const { data } = await supabase.auth.getSession();
            resolve(Boolean(data?.session));
          }
          return;
        }

        // No URL payload — check for an existing session (e.g. user refreshed)
        if (!resolved) {
          const { data } = await supabase.auth.getSession();
          resolve(Boolean(data?.session));
        }
      } catch {
        if (!resolved) {
          if (hasRecoveryPayload) {
            setResetMsg('This link is invalid or has expired. Request a new one.');
          }
          resolve(false);
        }
      }
    };

    initialise();

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
    };

  }, []);

  const handleRequestLink = async () => {
    setRequestError('');
    setRequestSuccess('');
    if (!email) {
      setRequestError('Please enter your email address.');
      return;
    }
    setRequestLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/reset-password.html`
      });
      if (error) {
        setRequestError(error.message);
      } else {
        setRequestSuccess('Verification code sent — check your inbox (and spam folder).');
        setStep('verify');
      }
    } catch {
      setRequestError('Failed to send verification code. Please try again.');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setVerifyError('');
    const token = verificationCode.trim();
    if (!email) {
      setVerifyError('Please enter your email address first.');
      setStep('request');
      return;
    }
    if (!token) {
      setVerifyError('Please enter the verification code from your email.');
      return;
    }
    setVerifyLoading(true);
    try {
      // Try recovery OTP first, then invite OTP
      const { error: recoveryError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });
      if (!recoveryError) {
        setStep('reset');
        return;
      }

      const { error: inviteError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'invite',
      });
      if (inviteError) {
        setVerifyError('Invalid or expired code. Please request a new one.');
      } else {
        setStep('reset');
      }
    } catch {
      setVerifyError('Failed to verify code. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    setResetMsg('');
    setResetSuccess(false);
    if (!newPassword || newPassword.length < 8) {
      setResetMsg('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetMsg('Passwords do not match.');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setResetMsg(error.message);
      } else {
        setResetSuccess(true);
        setResetMsg(isInvite
          ? 'Password set! Welcome to TurboFix. Redirecting to sign in…'
          : 'Password updated successfully! Redirecting…');
        setTimeout(() => {
          window.location.href = `${import.meta.env.BASE_URL}login.html`;
        }, 1800);
      }
    } catch {
      setResetMsg('Failed to reset password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  // Derive page heading and subtext based on step and invite context
  const headings = {
    request: {
      title: isInvite ? 'Activate your account' : 'Reset your password',
      sub: isInvite
        ? "Enter your email to receive an activation code."
        : "We'll email you a code to get back in.",
    },
    verify: {
      title: 'Enter verification code',
      sub: 'Use the 6-digit code sent to your account email.',
    },
    reset: {
      title: isInvite ? 'Choose your password' : 'Choose a new password',
      sub: isInvite
        ? 'Set a password for your new TurboFix account.'
        : 'Set a new password for your TurboFix account.',
    },
  };
  const { title, sub } = headings[step] || headings.request;

  return (
    <div className="min-h-screen w-full bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <div className="w-full flex-1 flex flex-col justify-center items-center p-4 py-8">
        <div className="w-[92vw] sm:w-[460px] max-w-[460px] bg-[#131922]/90 rounded-2xl shadow-2xl border border-slate-800/80 overflow-hidden backdrop-blur-xl transition-all">
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 shadow-inner">
                <KeyRound size={24} />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-1">{title}</h1>
              <p className="text-slate-400 text-sm">{sub}</p>
            </div>

            {checkingRecovery ? (
              <div className="p-4 text-center text-slate-400 text-sm flex items-center justify-center gap-2" role="status">
                <Loader2 size={16} className="animate-spin" /> Checking your link…
              </div>
            ) : step === 'request' ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Account email</label>
                  <input
                    type="email"
                    id="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setRequestError(''); }}
                    autoComplete="email"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                  />
                </div>

                <button
                  id="requestBtn"
                  onClick={handleRequestLink}
                  disabled={requestLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 text-sm active:scale-[0.99] disabled:opacity-70"
                >
                  {requestLoading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Send verification code'}
                </button>

                {requestError && (
                  <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-sm flex items-start gap-2" role="alert">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{requestError}</span>
                  </div>
                )}
                {requestSuccess && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 rounded-xl text-sm flex items-start gap-2" role="status">
                    <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                    <span>{requestSuccess}</span>
                  </div>
                )}

                <div className="text-center pt-2">
                  <a href="login.html" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    <ArrowLeft size={14} /> Back to sign in
                  </a>
                </div>
              </div>
            ) : step === 'verify' ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="verificationCode" className="block text-sm font-medium text-slate-300 mb-1">Verification code</label>
                  <input
                    type="text"
                    id="verificationCode"
                    placeholder="6-digit code"
                    value={verificationCode}
                    onChange={(e) => { setVerificationCode(e.target.value); setVerifyError(''); }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all tracking-[0.2em] text-center text-lg font-semibold"
                  />
                  <p className="mt-1.5 text-xs text-slate-500 text-center">Sent to {email}</p>
                </div>

                <button
                  id="verifyBtn"
                  onClick={handleVerifyCode}
                  disabled={verifyLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 text-sm active:scale-[0.99] disabled:opacity-70"
                >
                  {verifyLoading ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : 'Verify code'}
                </button>

                {verifyError && (
                  <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-sm flex items-start gap-2" role="alert">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-4 pt-2 text-sm">
                  <button type="button" onClick={handleRequestLink} disabled={requestLoading} className="text-emerald-400 hover:underline disabled:opacity-50">
                    {requestLoading ? 'Sending…' : 'Resend code'}
                  </button>
                  <button type="button" onClick={() => { setStep('request'); setVerifyError(''); }} className="text-slate-400 hover:text-slate-200 transition-colors">
                    Change email
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {isInvite && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded-xl text-sm flex items-start gap-2">
                    <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                    <span>Your invitation was verified. Choose a password to activate your account.</span>
                  </div>
                )}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-1">
                    {isInvite ? 'Create password' : 'New password'}
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    placeholder="at least 8 characters"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setResetMsg(''); setResetSuccess(false); }}
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">Confirm password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    placeholder="repeat it"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setResetMsg(''); setResetSuccess(false); }}
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                  />
                </div>

                <button
                  id="resetBtn"
                  onClick={handleSetNewPassword}
                  disabled={resetLoading || resetSuccess}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 text-sm active:scale-[0.99] disabled:opacity-70"
                >
                  {resetLoading
                    ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                    : isInvite ? 'Activate account' : 'Set new password'}
                </button>

                {resetMsg && (
                  <div
                    className={`p-3 rounded-xl text-sm flex items-start gap-2 ${resetSuccess
                      ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
                      : 'bg-red-950/60 border border-red-800/80 text-red-300'}`}
                    role="alert"
                  >
                    {resetSuccess
                      ? <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                      : <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />}
                    <span>{resetMsg}</span>
                  </div>
                )}

                <div className="text-center pt-2">
                  <a href="login.html" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    <ArrowLeft size={14} /> Back to sign in
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
