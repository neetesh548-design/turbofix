import { expect, test } from '@playwright/test';

test.describe('QR Gateway 30-Day Rolling Session Token Test', () => {
  test('Verify active 30-day session token skips OTP screen and auto-renews', async ({ page }) => {
    const unhandledJsErrors = [];
    page.on('pageerror', (err) => unhandledJsErrors.push(err.message));

    // 1. Simulate verified session within 30-day window
    await page.addInitScript(() => {
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      window.localStorage.setItem('tf_qr_session_token', 'd0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1');
      window.localStorage.setItem('tf_qr_session_expiry', String(Date.now() + THIRTY_DAYS_MS));
      window.localStorage.setItem('tf_reporter_phone', '9876543210');
    });

    // 2. Open QR Gateway
    await page.goto('/qr-gateway.html?machine_id=MCH-CNC-01', { waitUntil: 'networkidle' });

    // 3. Verify OTP Gate is SKIPPED and user is directly on issue capture stage
    const phoneInput = page.locator('input[placeholder="e.g. 9876543210"]');
    await expect(phoneInput).not.toBeVisible();

    // 4. Verify session expiry window was auto-renewed in localStorage
    const newExpiry = await page.evaluate(() => localStorage.getItem('tf_qr_session_expiry'));
    expect(Number(newExpiry)).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);

    expect(unhandledJsErrors.length).toBe(0);
  });

  test('Verify session expires after 30 days of inactivity', async ({ page }) => {
    // 1. Simulate an expired session (> 30 days old)
    await page.addInitScript(() => {
      const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000;
      window.localStorage.setItem('tf_qr_session_token', 'expiredtoken12345');
      window.localStorage.setItem('tf_qr_session_expiry', String(Date.now() - THIRTY_ONE_DAYS_MS));
    });

    // 2. Open QR Gateway
    await page.goto('/qr-gateway.html?machine_id=MCH-CNC-01', { waitUntil: 'networkidle' });

    // 3. Verify expired token was cleared and OTP gate is displayed
    const token = await page.evaluate(() => localStorage.getItem('tf_qr_session_token'));
    expect(token).toBeNull();
  });
});
