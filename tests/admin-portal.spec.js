import { test, expect } from '@playwright/test';

test('Verify TurboFix Admin Control Room login & Supabase Edge Function integration', async ({ page }) => {
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err));

  console.log('Navigating to local React Admin Portal...');
  await page.goto('http://localhost:5173/admin.html');

  // Verify Login form visibility
  await expect(page.locator('h1')).toContainText('TurboFix Control Room');
  await expect(page.locator('input[type="password"]')).toBeVisible();

  // Fill platform operator password
  await page.fill('input[type="password"]', 'TurboFixAdmin2026!');
  await page.click('button:has-text("Open Control Room")');

  // Wait for Control Room header & workspace metric cards
  console.log('Waiting for Supabase Edge Control Gateway data...');
  await page.waitForSelector('header', { timeout: 15000 });
  await expect(page.locator('header')).toContainText('TURBOFIX PLATFORM CONTROL');
  await expect(page.locator('header')).toContainText('Direct Cloud Gateway Active');

  // Verify metric cards
  await expect(page.locator('text=Workspaces').first()).toBeVisible();
  await expect(page.locator('text=Total Fleet Machines').first()).toBeVisible();
  await expect(page.locator('text=Active Breakdown Tickets').first()).toBeVisible();

  // Verify table loaded with companies
  await page.waitForSelector('table tr', { timeout: 10000 });
  const companyCount = await page.locator('tbody tr').count();
  console.log(`Found ${companyCount} registered plant company workspaces in Control Room.`);
  expect(companyCount).toBeGreaterThan(0);

  // Take screenshot of live Control Room
  await page.screenshot({ path: 'admin-portal-playwright.png', fullPage: true });
  console.log('Saved screenshot to admin-portal-playwright.png');
});
