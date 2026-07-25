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

    // 2. Mock Supabase REST endpoints for isolated, lightning-fast execution
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

  // The pulse strip was replaced by the role-aware Owner board: the same
  // "how is the plant doing right now" question, answered in the four
  // business KPIs plus the fleet health map. Same intent, new structure.
  test('TC-DASH-01: Owner board shows the core business KPIs and fleet health', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    const board = page.getByTestId('owner-dashboard');
    await expect(board).toBeVisible({ timeout: 10000 });
    await expect(board).toContainText('Fleet value at risk');
    await expect(board).toContainText('SLA compliance');
    await expect(board).toContainText('Downtime cost');
    await expect(board).toContainText('Fleet health map');
    // Machines-down now reads off the health map rather than a flat counter.
    await expect(board).toContainText('Down');
  });

  test('TC-DASH-02: Reliability card surfaces MTBF, MTTR, and repeat-breakdown signal', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    const reliabilityCard = page.locator('.md-reliability-card');
    await expect(reliabilityCard).toBeVisible({ timeout: 10000 });
    await expect(reliabilityCard).toContainText('MTBF');
    await expect(reliabilityCard).toContainText('MTTR');
    await expect(reliabilityCard).toContainText('Repeat breakdowns');
  });

  test('TC-DASH-03: Financial impact card shows downtime and maintenance cost', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    const impactCard = page.locator('.md-impact-card');
    await expect(impactCard).toBeVisible({ timeout: 10000 });
    await expect(impactCard).toContainText('Downtime cost');
    await expect(impactCard).toContainText('Maintenance cost');
  });

  test('TC-DASH-04: Operational efficiency KPI cards render with benchmark hints', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Categories are collapsed by default — drill in via the Equipment-wise tab.
    await page.locator('.dashboard-filter-row button:has-text("Equipment-wise")').click();

    const efficiencySection = page.locator('.md-category', { hasText: 'Operational efficiency' });
    await expect(efficiencySection).toBeVisible({ timeout: 10000 });
    await expect(efficiencySection).toContainText('PM compliance rate');
    await expect(efficiencySection).toContainText('Planned vs reactive');
    await expect(efficiencySection).toContainText('World-class');
  });

  test('TC-DASH-05: Cost management KPI cards render with RAV and emergency-cost ratios', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Categories are collapsed by default — drill in via the Maintenance-wise tab.
    await page.locator('.dashboard-filter-row button:has-text("Maintenance-wise")').click();

    const costSection = page.locator('.md-category', { hasText: 'Cost management' });
    await expect(costSection).toBeVisible({ timeout: 10000 });
    await expect(costSection).toContainText('Maintenance cost vs asset value');
    await expect(costSection).toContainText('Emergency cost ratio');
  });

  test('TC-DASH-06: Priority Queue Inspection & Drilldown Scroll', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Locate Needs Attention priority queue
    const queuePanel = page.locator('.md-queue-card');
    await expect(queuePanel).toBeVisible({ timeout: 10000 });

    // Click on a priority item
    const priorityItem = page.locator('.md-queue-row').first();
    await expect(priorityItem).toBeVisible();
    await priorityItem.click();

    const drilldown = page.locator('#dashboard-drilldown');
    await expect(drilldown).toBeVisible();
  });

  test('TC-DASH-07: Strategic planning section renders the shift handover panel', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    const frequencyTab = page.locator('.dashboard-filter-row button:has-text("Frequency-wise")');
    await frequencyTab.click();

    const planningSection = page.locator('.md-category', { hasText: 'Strategic planning' });
    await expect(planningSection).toBeVisible({ timeout: 10000 });
    await expect(planningSection).toContainText('Shift handover');
  });
});
