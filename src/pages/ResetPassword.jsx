
import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { supabase } from '../supabaseClient';
import { KeyRound, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestMsg, setRequestMsg] = useState('');
  const [verifyMsg, setVerifyMsg] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [step, setStep] = useState('request');
  const [checkingRecovery, setCheckingRecovery] = useState(true);

  useEffect(() => {
    document.title = 'Reset Password | TurboFix';
    window.scrollTo(0, 0);

    let active = true;
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hasRecoveryPayload = params.has('code')
      || params.has('token')
      || hashParams.has('access_token')
      || hashParams.get('type') === 'recovery';

    const finishRecoveryCheck = (hasSession) => {
      if (!active) return;
      setStep(hasSession || hasRecoveryPayload ? 'reset' : 'request');
      setCheckingRecovery(false);
    };

    const initialiseRecovery = async () => {
      try {
        // Supabase may use PKCE and return ?code=..., while older projects
        // return the access token in the URL hash. Support both flows.
        if (params.get('code')) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.get('code'));
          if (error) setResetMsg('This reset link is invalid or has expired. Request a new one.');
        }
        const { data } = await supabase.auth.getSession();
        finishRecoveryCheck(Boolean(data?.session));
      } catch (error) {
        finishRecoveryCheck(false);
        if (hasRecoveryPayload) setResetMsg('This reset link is invalid or has expired. Request a new one.');
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') finishRecoveryCheck(Boolean(session));
    });
    initialiseRecovery();

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleRequestLink = async () => {
    setRequestMsg('');
    setVerifyMsg('');
    if (!email) {
      setRequestMsg('Please enter your email.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/reset-password.html`
      });
      if (error) {
        setRequestMsg(error.message);
      } else {
        setRequestMsg('Verification code sent. Please check your inbox.');
        setStep('verify');
      }
    } catch (err) {
      setRequestMsg('Failed to send verification code.');
    }
  };

  const handleVerifyCode = async () => {
    setVerifyMsg('');
    const token = verificationCode.trim();
    if (!email) {
      setVerifyMsg('Please enter your email.');
      setStep('request');
      return;
    }
    if (!token) {
      setVerifyMsg('Please enter the verification code.');
      return;
    }
    try {
      const { error: recoveryError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });
      if (!recoveryError) {
        setStep('reset');
        setVerifyMsg('');
        return;
      }

      const { error: inviteError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'invite',
      });
      if (inviteError) {
        setVerifyMsg('Invalid or expired code. Please request a new one.');
      } else {
        setStep('reset');
        setVerifyMsg('');
      }
    } catch (err) {
      setVerifyMsg('Failed to verify code.');
    }
  };

  const handleSetNewPassword = async () => {
    setResetMsg('');
    if (!newPassword || newPassword.length < 8) {
      setResetMsg('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetMsg('Passwords do not match.');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setResetMsg(error.message);
      } else {
        setResetMsg('Password updated successfully! Redirecting...');
        setTimeout(() => {
          window.location.href = `${import.meta.env.BASE_URL}login.html`;
        }, 1500);
      }
    } catch (err) {
      setResetMsg('Failed to reset password.');
    }
  };

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
              <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
                {step === 'reset' ? 'Choose a new password' : step === 'verify' ? 'Enter verification code' : 'Reset your password'}
              </h1>
              <p className="text-slate-400 text-sm">
                {step === 'reset'
                  ? 'Set a new password for your TurboFix account.'
                  : step === 'verify'
                    ? 'Use the code sent to your account email.'
                    : "We'll email you a code to get back in."}
              </p>
            </div>

            {checkingRecovery ? (
              <div className="p-4 text-center text-slate-400 text-sm" role="status">Checking your reset link…</div>
            ) : step === 'request' ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Account email</label>
                  <input
                    type="email"
                    id="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                  />
                </div>

                <button
                  id="requestBtn"
                  onClick={handleRequestLink}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 text-sm active:scale-[0.99]"
                >
                  Send verification code
                </button>

                {requestMsg && (
                  <div className="p-3 bg-slate-900/80 border border-slate-700/80 text-slate-300 rounded-xl text-sm">
                    {requestMsg}
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
                    onChange={(e) => setVerificationCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                  />
                </div>

                <button
                  id="verifyBtn"
                  onClick={handleVerifyCode}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 text-sm active:scale-[0.99]"
                >
                  Verify code
                </button>

                {verifyMsg && (
                  <div className="p-3 bg-slate-900/80 border border-slate-700/80 text-slate-300 rounded-xl text-sm" role="alert">
                    {verifyMsg}
                  </div>
                )}

                <div className="flex items-center justify-center gap-4 pt-2 text-sm">
                  <button type="button" onClick={handleRequestLink} className="text-emerald-400 hover:underline">
                    Resend code
                  </button>
                  <button type="button" onClick={() => setStep('request')} className="text-slate-400 hover:text-slate-200 transition-colors">
                    Change email
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-1">New password</label>
                  <input
                    type="password"
                    id="newPassword"
                    placeholder="at least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">Confirm new password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    placeholder="repeat it"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                  />
                </div>

                <button
                  id="resetBtn"
                  onClick={handleSetNewPassword}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 text-sm active:scale-[0.99]"
                >
                  Set new password
                </button>

                {resetMsg && (
                  <div className="p-3 bg-slate-900/80 border border-slate-700/80 text-slate-300 rounded-xl text-sm" role="alert">
                    {resetMsg}
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
