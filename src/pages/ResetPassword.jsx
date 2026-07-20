
import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { supabase } from '../supabaseClient';

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
          window.location.href = `${import.meta.env.BASE_URL}vault.html`;
        }, 1500);
      }
    } catch (err) {
      setResetMsg('Failed to reset password.');
    }
  };

  return (
    <MainLayout>
      <section style={{ padding: '120px 0' }}>
        <div className="container">
          <div className="screen">
            <div className="login-card vault-login-card" style={{ margin: '0 auto' }}>
              <h1>TurboFix</h1>

              {!isResetStep ? (
                <div id="requestStep">
                  <p className="subtitle">Reset your password</p>
                  <div className="form-group vault-field">
                    <label htmlFor="email">Account email</label>
                    <input 
                      type="email" 
                      id="email" 
                      placeholder="you@company.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email" 
                    />
                  </div>
                  <button 
                    id="requestBtn" 
                    onClick={handleRequestLink}
                    className="btn-primary vault-btn vault-btn-primary" 
                    style={{ width: '100%' }}
                  >
                    Send reset link
                  </button>
                  {requestMsg && <div id="requestMsg" className="error-msg vault-error" style={{ display: 'block', marginTop: '10px' }}>{requestMsg}</div>}
                  <div className="footer-link" style={{ textAlign: 'center', marginTop: '14px' }}>
                    <a href="vault.html" style={{ color: 'var(--slate-light)' }}>← Back to sign in</a>
                  </div>
                </div>
              ) : (
                <div id="resetStep">
                  <p className="subtitle">Choose a new password</p>
                  <div className="form-group vault-field">
                    <label htmlFor="newPassword">New password</label>
                    <input 
                      type="password" 
                      id="newPassword" 
                      placeholder="at least 8 characters" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password" 
                    />
                  </div>
                  <div className="form-group vault-field">
                    <label htmlFor="confirmPassword">Confirm new password</label>
                    <input 
                      type="password" 
                      id="confirmPassword" 
                      placeholder="repeat it" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password" 
                    />
                  </div>
                  <button 
                    id="resetBtn" 
                    onClick={handleSetNewPassword}
                    className="btn-primary vault-btn vault-btn-primary" 
                    style={{ width: '100%' }}
                  >
                    Set new password
                  </button>
                  {resetMsg && <div id="resetMsg" className="error-msg vault-error" style={{ display: 'block', marginTop: '10px' }}>{resetMsg}</div>}
                  <div className="footer-link" style={{ textAlign: 'center', marginTop: '14px' }}>
                    <a href="vault.html" style={{ color: 'var(--slate-light)' }}>← Back to sign in</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
