import { test, expect } from '@playwright/test';

test.describe('Settings - Smart Modules (Poka-Yoke Config)', () => {
  test('should display and allow toggling of Smart Modules overlays', async ({ page }) => {
    // Log browser console logs for debugging
    page.on('console', msg => console.log(`BROWSER LOG: [${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('tf_user', JSON.stringify({
        id: 'mock-user-123',
        company_code: 'TEST01',
        role: 'admin'
      }));
      window.localStorage.setItem('tf_token', 'fake.eyJleHAiOiA5OTk5OTk5OTk5fQ==.fake');
    });

    // Mock Supabase API calls
    await page.route('**/rest/v1/machines?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'mock1', name: 'Mock Machine 1' }])
      });
    });

    await page.route('**/rest/v1/documents?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Navigate to settings page
    await page.goto('/settings.html');

    // Wait for page to load and click the tab
    await page.getByRole('tab', { name: /Smart Modules/ }).click();

    // Wait for the new section to load
    await expect(page.locator('text=Configurable Smart Modules')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Enable Poka-Yoke overlays on top of the robust core system.')).toBeVisible();

    // Verify all 5 Smart Modules are present
    const modules = [
      'IoT Predictive Power-Signature',
      'Visual Spare Part Deduction',
      'Dynamic Supply-Chain Sync',
      'Opportunistic Mesh Syncing',
      'Location Handshake Verification'
    ];

    for (const mod of modules) {
      await expect(page.locator(`text=${mod}`)).toBeVisible();
    }

    // Since we are mocking the component UI, we verify the select exist
    const selectTriggers = page.locator('section[aria-labelledby="smart-modules-title"] button[role="combobox"]');
    await expect(selectTriggers).toHaveCount(5);

    // Toggle the first module
    await selectTriggers.nth(0).click();
    await page.getByRole('option', { name: 'Enabled' }).click();

    // Verify it was selected
    await expect(selectTriggers.nth(0)).toHaveText('Enabled');

    // Take a screenshot to show the user
    await page.screenshot({ path: 'settings-screenshot.png', fullPage: true });
  });
});
