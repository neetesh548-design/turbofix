import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'navbar-screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

const VIEWPORTS = [
  { name: 'desktop-wide', width: 1920, height: 1080 },
  { name: 'desktop-standard', width: 1440, height: 900 },
  { name: 'desktop-laptop', width: 1280, height: 800 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'mobile-portrait', width: 375, height: 812 }
];

const THEMES = ['dark', 'light'];

test.describe('Navbar Regression & Overlap Audit Agent', () => {
  THEMES.forEach((theme) => {
    VIEWPORTS.forEach(({ name, width, height }) => {
      test(`Navbar visual check - ${theme} mode - ${name} (${width}x${height})`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');

        // Set theme
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
          localStorage.setItem('theme', t);
        }, theme);

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);

        const nav = page.locator('#nav');
        await expect(nav).toBeVisible();

        // Check bounding box overlap between central menu and right action buttons on desktop
        if (width >= 1140) {
          const menuBox = await page.locator('.public-nav-primary').boundingBox();
          const actionsBox = await page.locator('.public-nav-actions').boundingBox();
          const brandBox = await page.locator('.public-nav-brand-cluster').boundingBox();

          if (menuBox && actionsBox && brandBox) {
            // Assert menu right edge does not overlap actions left edge
            const menuRight = menuBox.x + menuBox.width;
            const actionsLeft = actionsBox.x;
            const brandRight = brandBox.x + brandBox.width;

            console.log(`[${name} ${theme}] Brand Right: ${brandRight}px | Menu X: ${menuBox.x}px..${menuRight}px | Actions X: ${actionsLeft}px`);

            // No overlap between brand and menu (allowing for 6px sub-element padding)
            expect(menuBox.x).toBeGreaterThanOrEqual(brandRight - 6);

            // No overlap between menu and actions
            expect(menuRight).toBeLessThanOrEqual(actionsLeft + 6);
          }
        }

        // Take component screenshot
        const screenshotPath = path.join(SCREENSHOT_DIR, `navbar-${theme}-${name}.png`);
        await nav.screenshot({ path: screenshotPath });
        console.log(`Captured screenshot: ${screenshotPath}`);
      });
    });
  });
});
