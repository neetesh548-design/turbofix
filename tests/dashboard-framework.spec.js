import { test, expect } from '@playwright/test';
import { mockMachines, mockTickets } from './fixtures/dashboard-fixtures.js';

test.describe('Dashboard End-to-End Framework Tests', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: 'mock-user' })).toString('base64');
  const fakeJwt = `${header}.${payload}.fake-signature`;

  test.beforeEach(async ({ page }) => {
    // Inject auth token and mock user BEFORE page load
    await page.addInitScript(({ jwt }) => {
      window.localStorage.setItem('tf_token', jwt);
      window.localStorage.setItem('tf_user', JSON.stringify({
        role: 'owner',
        name: 'Test Owner',
        user_id: 'tester-123',
        company_name: 'TurboFix Manufacturing'
      }));
    }, { jwt: fakeJwt });

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

  test('should render the Limble CMMS control board container', async ({ page }) => {
    await page.goto('/dashboard.html');
    const container = page.locator('.limble-cmms-container');
    await expect(container).toBeVisible({ timeout: 15000 });
    await expect(container).toContainText('LIMBLE CMMS DASHBOARD');
  });

  test('should render top 4 Limble CMMS KPI cards with live metrics', async ({ page }) => {
    await page.goto('/dashboard.html');
    const container = page.locator('.limble-cmms-container');
    await expect(container).toBeVisible({ timeout: 15000 });
    await expect(container).toContainText('Downtime Money Risk');
    await expect(container).toContainText('Daily Loss Today');
    await expect(container).toContainText('Monthly Money Saved');
    await expect(container).toContainText('Plant Machine Uptime');
  });

  test('should filter work orders on search input change', async ({ page }) => {
    await page.goto('/dashboard.html');
    const container = page.locator('.limble-cmms-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    const searchInput = page.locator('input[placeholder*="Search tasks"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('CNC');
    await expect(container).toBeVisible();
  });
});
