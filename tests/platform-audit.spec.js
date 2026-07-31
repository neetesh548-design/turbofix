import { test, expect } from '@playwright/test';

const TARGET_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'https://turbofix.co.in/platform.html#platform';

test.describe('Platform Page & Live Device Viewport Playwright Audit', () => {

  test('1. Page load, SEO meta tags, and document title', async ({ page }) => {
    const response = await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    expect(response?.status()).toBeLessThan(400);

    const title = await page.title();
    expect(title).toContain('TurboFix');

    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /.+/);
  });

  test('2. Material 3 Google Fonts and Stitch design tokens', async ({ page }) => {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    // Verify Google Fonts links are present
    const fontLinks = page.locator('link[href*="fonts.googleapis.com"]');
    expect(await fontLinks.count()).toBeGreaterThan(0);

    // Verify design components and buttons
    const buttons = page.locator('button');
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test('3. Interactive Multi-Device Viewport Switcher functionality', async ({ page }) => {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    // Scroll to #platform section or device switcher
    const switcher = page.locator('text=Live Device Viewport Stream').first();
    await switcher.scrollIntoViewIfNeeded();
    await expect(switcher).toBeVisible();

    // Verify device buttons exist
    const mobileBtn = page.locator('button:has-text("Mobile Phone")').first();
    const tabletBtn = page.locator('button:has-text("Tablet")').first();
    const laptopBtn = page.locator('button:has-text("Laptop")').first();
    const desktopBtn = page.locator('button:has-text("4K Monitor")').first();

    await expect(mobileBtn).toBeVisible();
    await expect(tabletBtn).toBeVisible();
    await expect(laptopBtn).toBeVisible();
    await expect(desktopBtn).toBeVisible();

    // Click Mobile Phone button & check resolution text update
    await mobileBtn.click();
    await expect(page.locator('text=iPhone 15 Pro').first()).toBeVisible();

    // Click 4K Monitor button & check resolution text update
    await desktopBtn.click();
    await expect(page.locator('text=Studio Display').first()).toBeVisible();
  });

  test('4. Live iframe preview and page switcher buttons', async ({ page }) => {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    const iframe = page.locator('iframe[title*="TurboFix Live Stream"]').first();
    await expect(iframe).toBeVisible();

    // Verify page preview selector buttons
    const dashboardPageBtn = page.locator('button:has-text("Executive Dashboard")').first();
    const recordsPageBtn = page.locator('button:has-text("Work Records Vault")').first();
    const machinesPageBtn = page.locator('button:has-text("Machines Register")').first();

    await expect(dashboardPageBtn).toBeVisible();
    await expect(recordsPageBtn).toBeVisible();
    await expect(machinesPageBtn).toBeVisible();

    // Switch preview page to Work Records Vault
    await recordsPageBtn.click();
    await page.waitForTimeout(500);
    await expect(iframe).toHaveAttribute('src', /records\.html/);
  });

  test('5. Mobile responsiveness (< 768px width viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    // Verify navbar menu toggle button is visible on mobile
    const menuBtn = page.locator('button[aria-label*="menu" i], button[aria-label*="navigation" i], .md\\:hidden button').first();
    await expect(menuBtn).toBeVisible();

    // Verify container padding prevents horizontal overflow
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflowX).toBe(false);
  });

  test('6. Image accessibility & non-empty alt attributes', async ({ page }) => {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
      expect(alt?.length).toBeGreaterThan(0);
    }
  });

  test('7. Zero uncaught JavaScript errors in console', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    expect(consoleErrors).toEqual([]);
  });

});
