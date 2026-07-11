
import React, { useEffect } from 'react';

export default function ResetPassword() {
  useEffect(() => {
    // Basic script execution simulation can go here
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: `
<div class="container">
  <div class="screen">
    <div class="login-card">
      <h1>TurboFix</h1>

      <!-- Step 1: request a reset link (shown when there's no ?token= in the URL) -->
      <div id="requestStep">
        <p class="subtitle">Reset your password</p>
        <div class="form-group">
          <label for="email">Account email</label>
          <input type="email" id="email" placeholder="you@company.com" autocomplete="email">
        </div>
        <button id="requestBtn" class="btn-primary">Send reset link</button>
        <div id="requestMsg" class="error-msg"></div>
        <div class="footer-link"><a href="vault.html">← Back to sign in</a></div>
      </div>

      <!-- Step 2: choose a new password (shown when the URL carries a ?token=) -->
      <div id="resetStep" style="display:none;">
        <p class="subtitle">Choose a new password</p>
        <div class="form-group">
          <label for="newPassword">New password</label>
          <input type="password" id="newPassword" placeholder="at least 8 characters" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label for="confirmPassword">Confirm new password</label>
          <input type="password" id="confirmPassword" placeholder="repeat it" autocomplete="new-password">
        </div>
        <button id="resetBtn" class="btn-primary">Set new password</button>
        <div id="resetMsg" class="error-msg"></div>
        <div class="footer-link"><a href="vault.html">← Back to sign in</a></div>
      </div>
    </div>
  </div>
</div>


` }} />
  );
}
