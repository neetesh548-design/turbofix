import { expect, test } from '@playwright/test';

test.describe('Settings and Work Records UI Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'tf_user',
        JSON.stringify({
          user_id: 'usr_owner_exide',
          name: 'Balaji S',
          email: 'owner@exidebattery.in',
          role: 'owner',
          company_code: 'EXIDE',
          company_name: 'Exide Battery Plant 4',
          inventory_mode: 'demo',
        })
      );
      window.localStorage.setItem('tf_token', 'demo:owner');
    });
  });

  test('Check Settings page for UI issues and errors', async ({ page }) => {
    const unhandledJsErrors = [];
    page.on('pageerror', (err) => {
      unhandledJsErrors.push(err.message);
    });

    await page.goto('/settings.html', { waitUntil: 'networkidle' });

    // Expect main header or container to be visible
    const settingsContainer = page.locator('.decision-page, .settings-page, [data-testid="settings-page"]').first();
    await expect(settingsContainer).toBeVisible({ timeout: 10000 });

    if (unhandledJsErrors.length > 0) {
      console.log('JS Errors on Settings Page:', unhandledJsErrors);
    }
    expect(unhandledJsErrors.length).toBe(0);
  });

  test('Check Records page for UI issues and errors', async ({ page }) => {
    const unhandledJsErrors = [];
    page.on('pageerror', (err) => {
      unhandledJsErrors.push(err.message);
    });

    await page.goto('/records.html', { waitUntil: 'networkidle' });

    // Expect records page container to be visible
    const recordsContainer = page.locator('.records-page, [data-testid="records-page"]').first();
    await expect(recordsContainer).toBeVisible({ timeout: 10000 });

    if (unhandledJsErrors.length > 0) {
      console.log('JS Errors on Records Page:', unhandledJsErrors);
    }
    expect(unhandledJsErrors.length).toBe(0);
  });
});
