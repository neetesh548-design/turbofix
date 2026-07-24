import { test, expect } from '@playwright/test';

test.describe('Machines Page Workspace & Kaizen Tab Tests', () => {
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
              machine_id: 'M001',
              machine_name: 'CNC Lathe 1',
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

  test('should load machines page and open Kaizen workspace tab', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/machines.html', { waitUntil: 'networkidle' });

    // Verify page header
    await expect(page.locator('h1', { hasText: 'MACHINES' })).toBeVisible();
    
    // Wait for the table rows / machines to load
    const openWorkspaceBtn = page.locator('button:has-text("Open Workspace")').first();
    await expect(openWorkspaceBtn).toBeVisible({ timeout: 10000 });

    // Click on Open Workspace
    await openWorkspaceBtn.click();

    // Verify the Kaizen top-level tab is visible in the workspace navigation row
    const kaizenTab = page.locator('button:has-text("Kaizen")').first();
    await expect(kaizenTab).toBeVisible({ timeout: 10000 });

    // Click on the Kaizen workspace tab
    await kaizenTab.click();

    // Verify Kaizen Opportunities panel content is rendered
    await expect(page.locator('h3', { hasText: 'Kaizen Opportunities' })).toBeVisible();
    await expect(page.locator('text=Relocate Scrap Bin')).toBeVisible();

    // Verify "+ Suggest Improvement" and "View Global Dashboard →" buttons render
    await expect(page.locator('button:has-text("+ Suggest Improvement")')).toBeVisible();
    await expect(page.locator('button:has-text("View Global Dashboard →")')).toBeVisible();
  });
});
