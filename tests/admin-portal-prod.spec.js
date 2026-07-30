import { test, expect } from '@playwright/test';

test('Verify Production TurboFix Admin Control Room login & Supabase Edge Function integration', async ({ page }) => {
  console.log('Navigating to live production Admin Portal: https://turbofix.co.in/admin.html ...');
  await page.goto('https://turbofix.co.in/admin.html');

  // Verify Login form visibility
  await expect(page.locator('h1')).toContainText('TurboFix Control Room');
  await expect(page.locator('input[type="password"]')).toBeVisible();

  // Fill platform operator password
  await page.fill('input[type="password"]', 'TurboFixAdmin2026!');
  await page.click('button:has-text("Open Control Room")');

  // Wait for Control Room header & workspace metric cards
  console.log('Waiting for Supabase Edge Control Gateway live production data...');
  await expect(page.locator('header')).toContainText('TURBOFIX PLATFORM CONTROL');
  await expect(page.locator('header')).toContainText('Direct Cloud Gateway Active');

  // Verify metric cards
  await expect(page.locator('text=Total Workspaces')).toBeVisible();
  await expect(page.locator('text=Active Fleet Machines')).toBeVisible();
  await expect(page.locator('text=Open Breakdown Tickets')).toBeVisible();

  // Verify table loaded with companies
  await page.waitForSelector('table tr', { timeout: 15000 });
  const companyCount = await page.locator('tbody tr').count();
  console.log(`Found ${companyCount} registered plant company workspaces in Production Control Room.`);
  expect(companyCount).toBeGreaterThan(0);

  // Take screenshot of live production Control Room
  await page.screenshot({ path: 'admin-portal-prod-playwright.png', fullPage: true });
  console.log('Saved screenshot to admin-portal-prod-playwright.png');
});
