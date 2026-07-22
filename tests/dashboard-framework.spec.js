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
        role: 'plant_head',
        name: 'Test User',
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

  test('should render the plant status pulse strip with core KPIs', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    const pulse = page.locator('.md-pulse');
    await expect(pulse).toBeVisible({ timeout: 10000 });
    await expect(pulse).toContainText('Machines down');
    await expect(pulse).toContainText('Urgent issues');
    await expect(pulse).toContainText('MTTR');
  });

  test('should render the priority row with queue, reliability, and cost-impact cards', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    const priorityRow = page.locator('.md-priority-row');
    await expect(priorityRow).toBeVisible({ timeout: 10000 });
    await expect(priorityRow).toContainText('Needs attention');
    await expect(priorityRow).toContainText('Equipment health');
    await expect(priorityRow).toContainText('Financial impact');
    await expect(priorityRow).toContainText('MTBF');
    await expect(priorityRow).toContainText('MTTR');
  });

  test('should expand a category tab and collapse it back on second click', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Categories are collapsed by default — a hint is shown instead of the details.
    await expect(page.locator('.md-filter-hint')).toBeVisible({ timeout: 10000 });

    const efficiencyTab = page.locator('.dashboard-filter-row button:has-text("Equipment-wise")');
    await efficiencyTab.click();
    await expect(efficiencyTab).toHaveClass(/active/);
    await expect(page.locator('.md-category', { hasText: 'Operational efficiency' })).toBeVisible();

    // Clicking the same tab again collapses it back to the hint state.
    await efficiencyTab.click();
    await expect(efficiencyTab).not.toHaveClass(/active/);
    await expect(page.locator('.md-filter-hint')).toBeVisible();
  });

  test('should open the priority queue drilldown on click', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    const queueRow = page.locator('.md-queue-row').first();
    await expect(queueRow).toBeVisible({ timeout: 10000 });
    await queueRow.click();

    const drilldown = page.locator('#dashboard-drilldown');
    await expect(drilldown).toBeVisible();
  });
});
