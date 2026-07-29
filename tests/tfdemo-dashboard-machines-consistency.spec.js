import { test, expect } from '@playwright/test';

const machines = [
  { id: 'tf-1', name: 'Healthy 1', status: 'healthy', criticality: 'medium' },
  { id: 'tf-2', name: 'Healthy 2', status: 'healthy', criticality: 'high' },
  { id: 'tf-3', name: 'Healthy 3', status: 'healthy', criticality: 'low' },
  { id: 'tf-4', name: 'Down 1', status: 'down', criticality: 'critical' },
  { id: 'tf-5', name: 'Down 2', status: 'down', criticality: 'critical' },
  { id: 'tf-6', name: 'Down 3', status: 'down', criticality: 'high' },
  { id: 'tf-7', name: 'Down 4', status: 'down', criticality: 'medium' },
];

const tickets = [
  { id: 'ticket-healthy', machine_id: 'tf-1', status: 'open', urgency: 'critical', issue_text: 'Alarm only' },
  { id: 'ticket-down', machine_id: 'tf-4', status: 'open', urgency: 'high', issue_text: 'Machine stopped' },
];

test.describe('TFDEMO cross-page status consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ exp: 9999999999, sub: 'tfdemo-owner' }));
      localStorage.setItem('tf_token', `${header}.${payload}.signature`);
      localStorage.setItem('tf_user', JSON.stringify({
        role: 'owner', user_id: 'tfdemo-owner', company_code: 'TFDEMO', company_name: 'TFDEMO', name: 'TFDEMO Owner',
      }));
    });
    await page.route('**/rest/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/machines')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(machines) });
      if (url.includes('/tickets')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tickets) });
      if (url.includes('/companies')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'company-tfdemo', domain: 'TFDEMO', machine_quota: 10 }]) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/functions/v1/**', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ members: [], machine_assignments: {} }),
    }));
  });

  test('Dashboard and Machines render identical status totals', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'networkidle' });
    await expect(page.getByText('Fleet health map')).toBeVisible();
    const dashboard = await page.locator('.rd-status-grid').innerText();
    expect(dashboard).toContain('Running');
    expect(dashboard).toContain('Down');
    expect(dashboard).toMatch(/Fleet total[\s\S]*3[\s\S]*0[\s\S]*4/);

    await page.goto('/machines.html', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('machine-filter-all')).toContainText('7');
    await expect(page.getByTestId('machine-filter-running')).toContainText('3');
    await expect(page.getByTestId('machine-filter-issues')).toContainText('0');
    await expect(page.getByTestId('machine-filter-down')).toContainText('4');
    await expect(page.getByTestId('machine-filter-maintenance')).toContainText('0');
  });

  test('explicit database status wins over conflicting tickets', async ({ page }) => {
    await page.goto('/machines.html', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-machine-id="tf-1"]')).toHaveAttribute('data-health', 'running');
    await expect(page.locator('[data-machine-id="tf-4"]')).toHaveAttribute('data-health', 'down');
  });
});
