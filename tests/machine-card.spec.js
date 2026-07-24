import { test, expect } from '@playwright/test';

test.describe('Machines Page Workspace & Sub-Tabs Tests', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: 'mock-user' })).toString('base64');
  const fakeJwt = `${header}.${payload}.fake-signature`;

  test.beforeEach(async ({ page }) => {
    // 1. Inject auth token and mock user session
    await page.addInitScript((jwt) => {
      window.localStorage.setItem('tf_token', jwt);
      window.localStorage.setItem('tf_user', JSON.stringify({
        role: 'maintenance_head',
        name: 'Mock Engineer',
        user_id: 'mock-user-id',
        company_name: 'Test Factory'
      }));
    }, fakeJwt);

    // 2. Mock REST API endpoints
    await page.route('**/rest/v1/**', (route) => {
      const url = route.request().url();
      if (url.includes('machines')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'm1',
              name: 'CNC Lathe 1',
              location: 'Zone A',
              status: 'healthy',
              hourly_downtime_cost: 150,
              created_at: new Date().toISOString()
            }
          ])
        });
      }
      if (url.includes('tickets')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 't1',
              machine_id: 'M001',
              status: 'open',
              created_at: new Date().toISOString(),
              issue_text: 'Spindle vibration',
              ai_summary: { urgency: 'high', summary: 'Spindle vibration' }
            }
          ])
        });
      }
      if (url.includes('kaizen_opportunities')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'KZN-2026-001',
              machine_id: 'M001',
              title: 'Relocate Scrap Bin',
              proposal: 'Move bin next to machine unloading side to save 5 seconds of motion waste per cycle.',
              category: 'simplification',
              waste_category: 'motion',
              status: 'submitted',
              created_by_name: 'Anil Kumar',
              created_at: new Date().toISOString()
            }
          ])
        });
      }
      if (url.includes('factories')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ name: 'Test Factory Plant' }])
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    // Mock Supabase Edge Functions
    await page.route('**/functions/v1/**', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [], machine_assignments: {} })
      });
    });
  });

  test('should load machines workspace and successfully click through all 9 sub-tabs', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/machines.html', { waitUntil: 'networkidle' });

    // Verify page header
    await expect(page.locator('h1', { hasText: 'MACHINES' })).toBeVisible();
    
    // Wait for the table rows / machines to load
    const openWorkspaceBtn = page.locator('button:has-text("Open Workspace")').first();
    await expect(openWorkspaceBtn).toBeVisible({ timeout: 10000 });

    // Click on Open Workspace
    await openWorkspaceBtn.click();

    // Define all tabs to test sequentially (name and an expected heading or content marker)
    const tabsToTest = [
      { name: 'Overview', markerText: 'Machine profile' },
      { name: 'Documents', markerText: 'Machine knowledge file' },
      { name: 'Spare parts', markerText: 'Keep the parts this machine depends on' },
      { name: 'Consumables', markerText: 'Add only the few supply items this machine depends on' },
      { name: 'Preventive', markerText: 'Keep the routine checks visible so this machine stays ahead' },
      { name: 'Reliability', markerText: 'Reliability improvement' },
      { name: 'Kaizen', markerText: 'Kaizen Opportunities' },
      { name: 'Calendar', markerText: 'Replenishment markers are dynamically computed' },
      { name: 'QR tag', markerText: 'CNC Lathe 1 Tag' }
    ];

    for (const tab of tabsToTest) {
      // Find the tab button by text inside the workspace tabs row and click it
      const tabButton = page.locator('.machine-workspace-tabs button', { hasText: tab.name }).first();
      await expect(tabButton).toBeVisible();
      await tabButton.click();

      // Verify that the tab becomes active
      await expect(tabButton).toHaveClass(/active/);

      // Verify that the corresponding panel content renders the expected heading or content marker
      await expect(page.locator(`text=${tab.markerText}`).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
