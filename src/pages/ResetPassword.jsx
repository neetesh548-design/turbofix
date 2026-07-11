
import React, { useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';

export default function ResetPassword() {
  useEffect(() => {
    window.scrollTo(0, 0);
    const script = document.createElement('script');
    script.src = '/assets/vault.js';
    document.body.appendChild(script);
    
    return () => {
      script.remove();
    };
  }, []);

  return (
    <MainLayout>
      <div dangerouslySetInnerHTML={{ __html: `
<section style="padding: 120px 0;">
  <div class="container">
    <div class="screen">
      <div class="login-card vault-login-card" style="margin: 0 auto;">
        <h1>TurboFix</h1>

        <!-- Step 1: request a reset link (shown when there's no ?token= in the URL) -->
        <div id="requestStep">
          <p class="subtitle">Reset your password</p>
          <div class="form-group vault-field">
            <label for="email">Account email</label>
            <input type="email" id="email" placeholder="you@company.com" autocomplete="email">
          </div>
          <button id="requestBtn" class="btn-primary vault-btn vault-btn-primary" style="width: 100%;">Send reset link</button>
          <div id="requestMsg" class="error-msg vault-error"></div>
          <div class="footer-link" style="text-align: center; margin-top: 14px;"><a href="vault.html" style="color: var(--slate-light);">← Back to sign in</a></div>
        </div>

        <!-- Step 2: choose a new password (shown when the URL carries a ?token=) -->
        <div id="resetStep" style="display:none;">
          <p class="subtitle">Choose a new password</p>
          <div class="form-group vault-field">
            <label for="newPassword">New password</label>
            <input type="password" id="newPassword" placeholder="at least 8 characters" autocomplete="new-password">
          </div>
          <div class="form-group vault-field">
            <label for="confirmPassword">Confirm new password</label>
            <input type="password" id="confirmPassword" placeholder="repeat it" autocomplete="new-password">
          </div>
          <button id="resetBtn" class="btn-primary vault-btn vault-btn-primary" style="width: 100%;">Set new password</button>
          <div id="resetMsg" class="error-msg vault-error"></div>
          <div class="footer-link" style="text-align: center; margin-top: 14px;"><a href="vault.html" style="color: var(--slate-light);">← Back to sign in</a></div>
        </div>
      </div>
    </div>
  </div>
</section>
` }} />
    </MainLayout>
  );
}
