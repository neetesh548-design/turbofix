import { test, expect } from '@playwright/test';

// Test all major pages in light, dark, MVP, and Full modes
const PAGES = [
  { name: 'Dashboard', path: '/' },
  { name: 'Tickets', path: '/tickets' },
  { name: 'Technician', path: '/technician' },
  { name: 'Machines', path: '/machines' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Kaizen', path: '/kaizen' },
  { name: 'AI Records', path: '/records' },
  { name: 'Settings', path: '/settings' }
];

test.describe('Visual Regression - Light Mode', () => {
  PAGES.forEach(page => {
    test(`${page.name} - Desktop Light MVP mode`, async ({ page: pw }) => {
      await pw.goto(page.path);
      await pw.evaluate(() => {
        localStorage.setItem('theme', 'light');
        localStorage.setItem('viewMode', 'mvp');
      });
      await pw.reload();
      await pw.waitForLoadState('networkidle');
      await pw.waitForTimeout(500); // Wait for animations

      await expect(pw).toHaveScreenshot(`${page.name.toLowerCase()}-light-mvp-desktop.png`, {
        maxDiffPixels: 100,
        mask: [pw.locator('[data-testid="live-timestamp"]')] // Mask dynamic content
      });
    });

    test(`${page.name} - Desktop Light Full mode`, async ({ page: pw }) => {
      await pw.goto(page.path);
      await pw.evaluate(() => {
        localStorage.setItem('theme', 'light');
        localStorage.setItem('viewMode', 'full');
      });
      await pw.reload();
      await pw.waitForLoadState('networkidle');
      await pw.waitForTimeout(500);

      await expect(pw).toHaveScreenshot(`${page.name.toLowerCase()}-light-full-desktop.png`, {
        maxDiffPixels: 100,
        mask: [pw.locator('[data-testid="live-timestamp"]')]
      });
    });

    test(`${page.name} - Mobile Light MVP mode`, async ({ page: pw }) => {
      await pw.setViewportSize(375, 812); // iPhone 12
      await pw.goto(page.path);
      await pw.evaluate(() => {
        localStorage.setItem('theme', 'light');
        localStorage.setItem('viewMode', 'mvp');
      });
      await pw.reload();
      await pw.waitForLoadState('networkidle');

      await expect(pw).toHaveScreenshot(`${page.name.toLowerCase()}-light-mvp-mobile.png`, {
        mask: [pw.locator('[data-testid="live-timestamp"]')]
      });
    });
  });
});

test.describe('Visual Regression - Dark Mode', () => {
  PAGES.forEach(page => {
    test(`${page.name} - Desktop Dark MVP mode`, async ({ page: pw }) => {
      await pw.goto(page.path);
      await pw.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('viewMode', 'mvp');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await pw.reload();
      await pw.waitForLoadState('networkidle');
      await pw.waitForTimeout(500);

      await expect(pw).toHaveScreenshot(`${page.name.toLowerCase()}-dark-mvp-desktop.png`, {
        maxDiffPixels: 100,
        mask: [pw.locator('[data-testid="live-timestamp"]')]
      });
    });

    test(`${page.name} - Desktop Dark Full mode`, async ({ page: pw }) => {
      await pw.goto(page.path);
      await pw.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('viewMode', 'full');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await pw.reload();
      await pw.waitForLoadState('networkidle');
      await pw.waitForTimeout(500);

      await expect(pw).toHaveScreenshot(`${page.name.toLowerCase()}-dark-full-desktop.png`, {
        maxDiffPixels: 100,
        mask: [pw.locator('[data-testid="live-timestamp"]')]
      });
    });

    test(`${page.name} - Mobile Dark MVP mode`, async ({ page: pw }) => {
      await pw.setViewportSize(375, 812);
      await pw.goto(page.path);
      await pw.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('viewMode', 'mvp');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await pw.reload();
      await pw.waitForLoadState('networkidle');

      await expect(pw).toHaveScreenshot(`${page.name.toLowerCase()}-dark-mvp-mobile.png`, {
        mask: [pw.locator('[data-testid="live-timestamp"]')]
      });
    });
  });
});

test.describe('Visual Regression - Tablet', () => {
  test('Dashboard - Tablet landscape', async ({ page }) => {
    await page.setViewportSize(1024, 768); // iPad landscape
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(1024);

    await expect(page).toHaveScreenshot('dashboard-tablet-landscape.png');
  });

  test('Tickets - Tablet portrait', async ({ page }) => {
    await page.setViewportSize(768, 1024); // iPad portrait
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(768);

    await expect(page).toHaveScreenshot('tickets-tablet-portrait.png');
  });
});
