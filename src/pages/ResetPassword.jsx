
import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { supabase } from '../supabaseClient';
import { KeyRound, ArrowLeft, CheckCircle, AlertCircle, Loader2, Smartphone, Mail, MessageSquare } from 'lucide-react';

export default function ResetPassword() {
  const [resetMode, setResetMode] = useState('phone'); // 'phone' or 'email'
  const [phone, setPhone] = useState('');
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
  const [step, setStep] = useState('request'); // 'request', 'verify', 'reset'
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

    let resolved = false;
    const resolve = (hasSession) => {
      if (!active || resolved) return;
      resolved = true;
      if (hasSession || hasRecoveryPayload) {
        setResetMode('email');
        setStep('reset');
      } else {
        setStep('request');
      }
      setCheckingRecovery(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setIsInvite(false);
        if (!resolved) resolve(true);
      } else if (event === 'INITIAL_SESSION') {
        if (session && !resolved) resolve(true);
      }
    });

    const initialise = async () => {
      try {
        if (params.get('code')) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.get('code'));
          if (error && !resolved) setResetMsg('This link is invalid or has expired.');
          if (!resolved) {
            const { data } = await supabase.auth.getSession();
            resolve(Boolean(data?.session));
          }
          return;
        }

        const rawToken = params.get('token') || hashParams.get('token');
        if (rawToken) {
          const tokenType = params.get('type') || hashParams.get('type') || 'recovery';
          const { error } = await supabase.auth.verifyOtp({ token_hash: rawToken, type: tokenType });
          if (error && !resolved) setResetMsg('This link is invalid or has expired.');
          if (!resolved) {
            const { data } = await supabase.auth.getSession();
            resolve(Boolean(data?.session));
          }
          return;
        }

        if (hashParams.has('access_token')) {
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (!error && !resolved) {
              resolve(true);
              return;
            }
          }
        }

        if (!resolved) {
          const { data } = await supabase.auth.getSession();
          resolve(Boolean(data?.session));
        }
      } catch {
        if (!resolved) {
          if (hasRecoveryPayload) setResetMsg('This link is invalid or has expired.');
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

  const handleRequestOTP = async () => {
    setRequestError('');
    setRequestSuccess('');

    if (resetMode === 'phone') {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        setRequestError('Please enter a valid 10-digit mobile number.');
        return;
      }
      setRequestLoading(true);
      try {
        // Try Python backend first, fallback to Supabase Edge Function
        let sentOk = false;
        let msg = 'OTP sent via WhatsApp & SMS. Check your mobile number.';

        try {
          const resp = await fetch('/auth/otp/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone }),
          });
          if (resp.ok) {
            const data = await resp.json();
            msg = data.message || msg;
            sentOk = true;
          }
        } catch {
          // Backend API call failed, try edge function
        }

        if (!sentOk) {
          const { data, error } = await supabase.functions.invoke('otp_gateway', {
            body: { action: 'send', phone: cleanPhone },
          });
          if (error) throw new Error(error.message || 'Failed to send OTP via WhatsApp/SMS.');
          msg = data?.message || msg;
        }

        setRequestSuccess(msg);
        setStep('verify');
      } catch (err) {
        setRequestError(err.message || 'Failed to send OTP code. Please try again.');
      } finally {
        setRequestLoading(false);
      }
    } else {
      if (!email) {
        setRequestError('Please enter your email address.');
        return;
      }
      setRequestLoading(true);
      try {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/reset-password.html`
        });
        if (resetErr) throw resetErr;

        setRequestSuccess('A password reset link has been sent to your email ID. Please check your inbox (and spam folder) and click the link to set your new password.');
      } catch (err) {
        setRequestError(err.message || 'Failed to send reset link. Please try again.');
      } finally {
        setRequestLoading(false);
      }
    }
  };


  const handleVerifyCode = async () => {
    setVerifyError('');
    const token = verificationCode.trim();
    if (resetMode === 'phone') {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        setVerifyError('Please enter a valid 10-digit mobile number.');
        setStep('request');
        return;
      }
      if (!/^\d{6}$/.test(token)) {
        setVerifyError('Please enter the 6-digit OTP code received via WhatsApp or SMS.');
        return;
      }
      setVerifyLoading(true);
      try {
        let verifiedOk = false;
        try {
          const resp = await fetch('/auth/otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone, otp: token }),
          });
          if (resp.ok) verifiedOk = true;
        } catch {
          // Backend API call error fallback to edge function
        }

        if (!verifiedOk) {
          const { data, error } = await supabase.functions.invoke('otp_gateway', {
            body: { action: 'verify', phone: cleanPhone, otp: token },
          });
          if (error) throw new Error(error.message || 'Incorrect OTP code.');
          if (data?.verified) verifiedOk = true;
        }

        if (verifiedOk) {
          setStep('reset');
        } else {
          setVerifyError('Incorrect OTP code. Please check your WhatsApp/SMS and try again.');
        }
      } catch (err) {
        setVerifyError(err.message || 'Failed to verify code. Please try again.');
      } finally {
        setVerifyLoading(false);
      }
    } else {
      if (!email) {
        setVerifyError('Please enter your email address first.');
        setStep('request');
        return;
      }
      if (!token) {
        setVerifyError('Please enter the 6-digit verification code.');
        return;
      }
      setVerifyLoading(true);
      try {
        // Try type: 'email' (from signInWithOtp), then 'recovery', then 'invite'
        const { error: emailOtpError } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
        if (!emailOtpError) {
          setStep('reset');
          return;
        }

        const { error: recoveryError } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
        if (!recoveryError) {
          setStep('reset');
          return;
        }

        const { error: inviteError } = await supabase.auth.verifyOtp({ email, token, type: 'invite' });
        if (inviteError) {
          setVerifyError(inviteError.message || 'Invalid or expired OTP code. Please request a new one.');
        } else {
          setStep('reset');
        }
      } catch (err) {
        setVerifyError(err.message || 'Failed to verify OTP code.');
      } finally {
        setVerifyLoading(false);
      }
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

    if (resetMode === 'phone') {
      const cleanPhone = phone.replace(/\D/g, '');
      const token = verificationCode.trim();
      try {
        let updated = false;
        let msg = 'Password updated successfully! Redirecting…';

        try {
          const resp = await fetch('/auth/otp/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone, otp: token, new_password: newPassword }),
          });
          if (resp.ok) {
            const data = await resp.json();
            msg = data.message || msg;
            updated = true;
          }
        } catch {
          // Fallback to edge function
        }

        if (!updated) {
          const { data, error } = await supabase.functions.invoke('otp_gateway', {
            body: { action: 'reset_password', phone: cleanPhone, otp: token, new_password: newPassword },
          });
          if (error) throw new Error(error.message || 'Failed to update password.');
          if (data?.verified) {
            msg = data.message || msg;
            updated = true;
          }
        }

        if (!updated) {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (!error) updated = true;
        }

        if (updated) {
          setResetSuccess(true);
          setResetMsg(msg);
          setTimeout(() => {
            window.location.href = `${import.meta.env.BASE_URL}login.html`;
          }, 1800);
        } else {
          setResetMsg('Could not update password. Please try again.');
        }
      } catch (err) {
        setResetMsg(err.message || 'Failed to reset password. Please try again.');
      } finally {
        setResetLoading(false);
      }
    } else {
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
    }
  };

  const headings = {
    request: {
      title: isInvite ? 'Activate your account' : 'Reset your password',
      sub: resetMode === 'phone'
        ? 'We will send a 6-digit OTP to your mobile via WhatsApp & SMS.'
        : "We'll email you a direct link to reset your password.",
    },
    verify: {
      title: 'Enter verification code',
      sub: resetMode === 'phone'
        ? `Enter the 6-digit OTP code sent via WhatsApp & Fast2SMS to +91 ${phone.replace(/\D/g, '')}`
        : `Use the 6-digit code sent to ${email}`,
    },
    reset: {
      title: isInvite ? 'Choose your password' : 'Choose a new password',
      sub: 'Set a new secure password for your TurboFix account.',
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
                {/* Method selector tabs */}
                <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-medium mb-4">
                  <button
                    type="button"
                    onClick={() => { setResetMode('phone'); setRequestError(''); setRequestSuccess(''); }}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                      resetMode === 'phone'
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Smartphone size={14} /> Mobile OTP (WhatsApp & SMS)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResetMode('email'); setRequestError(''); setRequestSuccess(''); }}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                      resetMode === 'email'
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Mail size={14} /> Account Email
                  </button>
                </div>

                {resetMode === 'phone' ? (
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-1">
                      10-digit Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">+91</span>
                      <input
                        type="tel"
                        id="phone"
                        placeholder="9876543210"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setRequestError(''); }}
                        className="w-full pl-14 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                      <MessageSquare size={12} className="text-emerald-400 shrink-0" />
                      Identical OTP sent via WhatsApp & Fast2SMS SMS
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Account Email</label>
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
                )}

                <button
                  id="requestBtn"
                  onClick={handleRequestOTP}
                  disabled={requestLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 text-sm active:scale-[0.99] disabled:opacity-70"
                >
                  {requestLoading
                    ? <><Loader2 size={16} className="animate-spin" /> {resetMode === 'phone' ? 'Sending OTP…' : 'Sending Link…'}</>
                    : resetMode === 'phone' ? 'Send OTP via WhatsApp & SMS' : 'Send Password Reset Link'}
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
                  <label htmlFor="verificationCode" className="block text-sm font-medium text-slate-300 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    id="verificationCode"
                    placeholder="123456"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => { setVerificationCode(e.target.value.replace(/\D/g, '')); setVerifyError(''); }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all tracking-[0.25em] text-center text-lg font-semibold"
                  />
                  <p className="mt-1.5 text-xs text-slate-400 text-center">
                    {resetMode === 'phone' ? `Sent via WhatsApp & SMS to +91 ${phone}` : `Sent to ${email}`}
                  </p>
                </div>

                <button
                  id="verifyBtn"
                  onClick={handleVerifyCode}
                  disabled={verifyLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 text-sm active:scale-[0.99] disabled:opacity-70"
                >
                  {verifyLoading ? <><Loader2 size={16} className="animate-spin" /> Verifying OTP…</> : 'Verify OTP Code'}
                </button>

                {verifyError && (
                  <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-sm flex items-start gap-2" role="alert">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-4 pt-2 text-sm">
                  <button type="button" onClick={handleRequestOTP} disabled={requestLoading} className="text-emerald-400 hover:underline disabled:opacity-50">
                    {requestLoading ? 'Sending…' : 'Resend OTP'}
                  </button>
                  <button type="button" onClick={() => { setStep('request'); setVerifyError(''); }} className="text-slate-400 hover:text-slate-200 transition-colors">
                    Change mobile/email
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {isInvite && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded-xl text-sm flex items-start gap-2">
                    <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                    <span>Your account invitation was verified. Choose a password to activate your account.</span>
                  </div>
                )}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-1">
                    {isInvite ? 'Create Password' : 'New Password'}
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
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    placeholder="repeat password"
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
                    ? <><Loader2 size={16} className="animate-spin" /> Saving password…</>
                    : isInvite ? 'Activate account' : 'Set New Password'}
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
