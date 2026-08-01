import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'artifacts/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Multi-Tab Persona Dashboard Visual Audit', () => {
  test.beforeEach(async ({ page }) => {
    const fakeJwt = 'header.payload.signature';
    await page.addInitScript(() => {
      window.localStorage.setItem('tf_theme', 'light');
      window.localStorage.setItem('tf_token', 'demo:owner');
      window.localStorage.setItem('tf_user', JSON.stringify({
        user_id: 'demo-owner',
        name: 'Anil Subrahmanian (VP)',
        role: 'owner',
        company_code: 'exidebattery',
        company_name: 'Exide Energy Industries Ltd',
        inventory_mode: 'demo',
        email: 'owner@exidebattery.in'
      }));
    });
  });

  test('audit multi-tabs and persona views', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Ensure document element has data-theme="light"
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

    // Screenshot Tab 1 - Operations (Default Owner View)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-tab1-operations-owner.png'), fullPage: true });

    // Switch to Operator View
    const operatorBtn = page.locator('button.dashboard-role-chip:has-text("Operator")');
    if (await operatorBtn.isVisible()) {
      await operatorBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-tab1-operations-operator.png'), fullPage: true });
    }

    // Switch to Technician View
    const techBtn = page.locator('button.dashboard-role-chip:has-text("Technician")');
    if (await techBtn.isVisible()) {
      await techBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-tab1-operations-technician.png'), fullPage: true });
    }

    // Switch to Supervisor View
    const supBtn = page.locator('button.dashboard-role-chip:has-text("Supervisor")');
    if (await supBtn.isVisible()) {
      await supBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-tab1-operations-supervisor.png'), fullPage: true });
    }

    // Switch to Engineer View
    const engBtn = page.locator('button.dashboard-role-chip:has-text("Engineer")');
    if (await engBtn.isVisible()) {
      await engBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-tab1-operations-engineer.png'), fullPage: true });
    }

    // Switch to Tab 2 - Machine Telemetry
    const telemetryTab = page.locator('button.dashboard-subtab:has-text("Telemetry")');
    if (await telemetryTab.isVisible()) {
      await telemetryTab.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-tab2-telemetry-fleet.png'), fullPage: true });
    }

    // Switch to Tab 3 - Command Center (Light Theme)
    const commandTab = page.locator('button.dashboard-subtab:has-text("Reliability")');
    if (await commandTab.isVisible()) {
      await commandTab.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-tab3-command-center-light.png'), fullPage: true });

      // Toggle to Dark Mode to verify Dark Mode Tab 3
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-tab3-command-center-dark.png'), fullPage: true });

      // Revert back to Light Mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark');
      });
    }

    // Mobile Viewport Audit on Tab 1
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-mobile-dashboard.png'), fullPage: true });
  });
});
