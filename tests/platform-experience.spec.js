import { test, expect } from '@playwright/test';

test.describe('Platform Experience Standalone Hidden Page (/platform-experience)', () => {

  test('loads hidden page with noindex metadata and header banner', async ({ page }) => {
    await page.goto('/platform-experience', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.platform-experience-page', { timeout: 15000 });

    // Verify title and heading
    await expect(page).toHaveTitle(/TurboFix Platform — Interactive Multi-Device Experience/i);
    await expect(page.locator('h1')).toContainText(/Interactive Multi-Device Platform Experience/i);

    // Verify noindex search metadata
    const robotsMeta = page.locator('meta[name="robots"]');
    await expect(robotsMeta).toHaveAttribute('content', 'noindex, nofollow');
  });

  test('renders 3-Device Multi-Screen Split frames by default', async ({ page }) => {
    await page.goto('/platform-experience', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.platform-experience-page', { timeout: 15000 });

    // Check device viewports
    await expect(page.locator('text=Field Mobile')).toBeVisible();
    await expect(page.locator('text=Maintenance Supervisor Tablet')).toBeVisible();

    // Check iframe presence
    const iframes = page.locator('iframe');
    await expect(iframes.first()).toBeVisible();
  });

  test('allows switching layout to Single Focused Frame and changing viewports', async ({ page }) => {
    await page.goto('/platform-experience', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.platform-experience-page', { timeout: 15000 });

    // Click Single Focused Frame button
    await page.locator('button:has-text("Single Focused Frame")').click();

    // Check device selection buttons are now visible
    await expect(page.locator('button:has-text("Control Room Laptop")')).toBeVisible();
    await expect(page.locator('button:has-text("4K Control Monitor")')).toBeVisible();

    // Click 4K Control Monitor
    await page.locator('button:has-text("4K Control Monitor")').click();
    await expect(page.locator('text=Plant Owner & General Manager')).toBeVisible();
  });

  test('allows stepping through 4-step real-world plant user journey', async ({ page }) => {
    await page.goto('/platform-experience', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.platform-experience-page', { timeout: 15000 });

    // Click Step 01
    await page.locator('text=Step 01').click();
    await expect(page.locator('text=10-Sec QR Scan')).toBeVisible();

    // Click Step 04
    await page.locator('text=Step 04').click();
    await expect(page.locator('text=Executive Downtime Sync')).toBeVisible();
  });

  test('allows toggling between Light Theme and Dark Theme previewing', async ({ page }) => {
    await page.goto('/platform-experience', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.platform-experience-page', { timeout: 15000 });

    const themeBtn = page.locator('button:has-text("Previewing Light Theme"), button:has-text("Previewing Dark Theme")');
    await expect(themeBtn).toBeVisible();

    await themeBtn.click();
    await expect(page.locator('button:has-text("Previewing Dark Theme")')).toBeVisible();
  });
});
