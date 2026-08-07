import { test, expect } from '@playwright/test';
import { mockMachines, mockTickets } from './fixtures/dashboard-fixtures.js';

test.describe('Lay Owner Dashboard User Journey & Feature Suite (/dashboard.html)', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: 'mock-user' })).toString('base64');
  const fakeJwt = `${header}.${payload}.fake-signature`;

  test.beforeEach(async ({ page }) => {
    // 1. Inject Auth Tokens & Lay Owner User Session in localStorage before navigation
    await page.addInitScript(({ jwt }) => {
      window.localStorage.setItem('tf_token', jwt);
      window.localStorage.setItem('tf_user', JSON.stringify({
        role: 'factory_owner',
        name: 'Rajesh Sharma',
        user_id: 'owner-777',
        company_name: 'TurboFix Manufacturing'
      }));
    }, { jwt: fakeJwt });

    // 2. Mock Supabase REST endpoints for isolated execution
    await page.route('**/rest/v1/**', (route) => {
      const url = route.request().url();
      if (url.includes('machines')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMachines) });
      }
      if (url.includes('tickets')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTickets) });
      }
      if (url.includes('factories')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ name: 'TurboFix Manufacturing' }]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
  });

  test('TC-DASH-01: Owner board shows core business KPIs and machine health in Limble layout', async ({ page }) => {
    await page.goto('/dashboard.html');

    const container = page.locator('.limble-cmms-container');
    await expect(container).toBeVisible({ timeout: 15000 });
    await expect(container).toContainText('Downtime Money Risk');
    await expect(container).toContainText('Daily Loss Today');
    await expect(container).toContainText('Monthly Money Saved');
    await expect(container).toContainText('Plant Machine Uptime');
  });

  test('TC-DASH-02: Work order list and machine status render cleanly in Limble layout', async ({ page }) => {
    await page.goto('/dashboard.html');

    const container = page.locator('.limble-cmms-container');
    await expect(container).toBeVisible({ timeout: 15000 });
    await expect(container).toContainText('Machine Status');
    await expect(container).toContainText('Low Stock Parts Alert');
  });
});
