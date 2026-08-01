import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'artifacts/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Public Website Light Theme Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tf_theme', 'light');
    });
  });

  test('audit public pages in light theme', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const pagesToAudit = [
      { url: '/', name: 'public-01-home.png' },
      { url: '/platform.html', name: 'public-02-platform.png' },
      { url: '/pricing.html', name: 'public-03-pricing.png' },
      { url: '/why-turbofix.html', name: 'public-04-why-turbofix.png' },
      { url: '/contact.html', name: 'public-05-contact.png' },
      { url: '/demo.html', name: 'public-06-demo.png' },
    ];

    for (const item of pagesToAudit) {
      await page.goto(item.url, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, item.name), fullPage: true });
    }
  });
});
