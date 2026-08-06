import { test, expect } from '@playwright/test';

test.describe('Zero-Scroll Master Dashboard Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Set tf_token and tf_user in localStorage before loading page
    await page.addInitScript(() => {
      window.localStorage.setItem('tf_token', 'demo:owner');
      window.localStorage.setItem(
        'tf_user',
        JSON.stringify({ role: 'owner', name: 'Factory Owner', email: 'owner@turbofix.app' })
      );
    });

    await page.goto('http://localhost:5174/dashboard.html');
    await page.waitForLoadState('networkidle');
  });

  test('should verify ZERO vertical scroll on 1080p desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
    
    console.log(`Viewport height: ${clientHeight}px, Scroll height: ${scrollHeight}px`);
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 10);
  });

  test('should switch tabs smoothly via top 3-button controller', async ({ page }) => {
    // Click Tab 2: Operations & Fleet
    const tab2 = page.getByRole('button', { name: /Operations & Fleet/i }).first();
    await expect(tab2).toBeVisible({ timeout: 10000 });
    await tab2.click();

    // Verify Tab 2 content appears
    await expect(page.getByText('Operations & Technician Work Board')).toBeVisible();

    // Click Tab 3: Financial & Intelligence
    const tab3 = page.getByRole('button', { name: /Financial Intelligence/i }).first();
    await expect(tab3).toBeVisible();
    await tab3.click();

    // Verify Tab 3 content appears
    await expect(page.getByText('Spare Consumption Intelligence')).toBeVisible();

    // Click Tab 1: Executive Overview
    const tab1 = page.getByRole('button', { name: /Executive Overview/i }).first();
    await expect(tab1).toBeVisible();
    await tab1.click();

    // Verify Tab 1 content appears
    await expect(page.getByText('30-SECOND EXECUTIVE SUMMARY')).toBeVisible();
  });

  test('should switch tabs instantly via keyboard hotkeys (1, 2, 3)', async ({ page }) => {
    // Wait for initial render
    await expect(page.getByText('30-SECOND EXECUTIVE SUMMARY')).toBeVisible({ timeout: 10000 });

    // Press key '2'
    await page.keyboard.press('2');
    await expect(page.getByText('Operations & Technician Work Board')).toBeVisible();

    // Press key '3'
    await page.keyboard.press('3');
    await expect(page.getByText('Spare Consumption Intelligence')).toBeVisible();

    // Press key '1'
    await page.keyboard.press('1');
    await expect(page.getByText('30-SECOND EXECUTIVE SUMMARY')).toBeVisible();
  });

  test('should update metrics when switching industry presets', async ({ page }) => {
    const select = page.getByTestId('industry-preset-select');
    await expect(select).toBeVisible({ timeout: 10000 });

    // Select Injection Moulding
    await select.selectOption('moulding');
    await expect(page.getByText('Injection Moulding 02')).toBeVisible();

    // Select Packaging
    await select.selectOption('packaging');
    await expect(page.getByText('High-Speed Packaging Line 01')).toBeVisible();
  });
});
