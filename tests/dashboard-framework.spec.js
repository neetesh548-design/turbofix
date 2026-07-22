import { test, expect } from '@playwright/test';
import { mockMachines, mockTickets, mockReflectiveMemory } from './fixtures/dashboard-fixtures.js';

test.describe('Dashboard End-to-End & Reflective Framework Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject auth token and mock user BEFORE page load
    await page.addInitScript((memory) => {
      window.localStorage.setItem('tf_token', 'mock-valid-jwt-token');
      window.localStorage.setItem('tf_user', JSON.stringify({
        role: 'plant_head',
        name: 'Royal Tester',
        user_id: 'tester-123',
        company_name: 'TurboFix Manufacturing'
      }));
      window.localStorage.setItem('turbofix_reflective_memory', JSON.stringify(memory));
    }, mockReflectiveMemory);

    // Mock Supabase REST endpoints
    await page.route('**/rest/v1/**', (route) => {
      const url = route.request().url();
      if (url.includes('machines')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMachines) });
      }
      if (url.includes('tickets')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTickets) });
      }
      if (url.includes('factories')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ name: 'TurboFix Factory' }]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
  });

  test('should render The Analyst\'s Mirror Reflective banner with memory recall', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Verify Reflective Mirror Banner is present
    const reflectiveBanner = page.locator('.reflective-mirror-banner');
    await expect(reflectiveBanner).toBeVisible({ timeout: 10000 });

    // Verify Cross-Session Memory recall text
    await expect(reflectiveBanner).toContainText("The Analyst's Mirror");
    await expect(reflectiveBanner).toContainText('Hydraulic Press');
    await expect(reflectiveBanner).toContainText('Contrastive Suggestion');
  });

  test('should render Royal VIP Concierge banner and switch modes between King\'s View and Operations View', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Verify Royal VIP Header
    const royalBanner = page.locator('.royal-vip-banner');
    await expect(royalBanner).toBeVisible({ timeout: 10000 });
    await expect(royalBanner).toContainText('Greetings, Your Majesty');

    // Verify King's View Crown Jewels Grid is visible by default
    const shieldGrid = page.locator('.royal-shield-grid');
    await expect(shieldGrid).toBeVisible();

    // Click Operations View button
    const opsButton = page.locator('button:has-text("Operations View")');
    await opsButton.click();

    // Verify Crown Jewels grid toggles off in Operations View
    await expect(shieldGrid).not.toBeVisible();

    // Switch back to King's View
    const kingsButton = page.locator('button:has-text("King\'s View")');
    await kingsButton.click();
    await expect(shieldGrid).toBeVisible();
  });

  test('should execute 1-Tap Spares Approval royal command and display toast notification', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard.html', { waitUntil: 'domcontentloaded' });

    const sparesButton = page.locator('button:has-text("1-Tap Spares Approval")').first();
    await expect(sparesButton).toBeVisible({ timeout: 10000 });
    await sparesButton.click();

    // Verify Toast notification appears
    const toast = page.locator('.toast-message');
    await expect(toast).toContainText('Royal Command Executed');
  });
});
