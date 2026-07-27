
import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { supabase } from '../supabaseClient';
import { KeyRound, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestMsg, setRequestMsg] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [isResetStep, setIsResetStep] = useState(false);

  useEffect(() => {
    document.title = 'Reset Password | TurboFix';
    window.scrollTo(0, 0);

    const params = new URLSearchParams(window.location.search);
    if (params.get('token') || window.location.hash.includes('access_token')) {
      setIsResetStep(true);
    }
  }, []);

  const handleRequestLink = async () => {
    setRequestMsg('');
    if (!email) {
      setRequestMsg('Please enter your email.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password.html`
      });
      if (error) {
        setRequestMsg(error.message);
      } else {
        setRequestMsg('Reset link sent! Please check your inbox.');
      }
    } catch (err) {
      setRequestMsg('Failed to send reset link.');
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
                {isResetStep ? 'Choose a new password' : 'Reset your password'}
              </h1>
              <p className="text-slate-400 text-sm">
                {isResetStep
                  ? 'Set a new password for your TurboFix account.'
                  : "We'll email you a link to get back in."}
              </p>
            </div>

            {!isResetStep ? (
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
                  Send reset link
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
                  <div className="p-3 bg-slate-900/80 border border-slate-700/80 text-slate-300 rounded-xl text-sm">
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
