import { test, expect } from '@playwright/test';

test('capture Kaizen Dashboard screenshots and verify UX layout', async ({ page }) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: 'mock-user' })).toString('base64');
  const fakeJwt = `${header}.${payload}.fake-signature`;

  // Inject authentication state
  await page.addInitScript((jwt) => {
    window.localStorage.setItem('tf_token', jwt);
    window.localStorage.setItem('tf_user', JSON.stringify({
      role: 'maintenance_head',
      name: 'Mock Supervisor',
      user_id: 'mock-user-id',
      company_name: 'Test Plant'
    }));
  }, fakeJwt);

  // Mock Supabase API calls
  await page.route('**/rest/v1/machines**', route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'm1', machine_id: 'M001', machine_name: 'Stamping Press 1', location: 'Section A' },
        { id: 'm2', machine_id: 'M002', machine_name: 'Welding Cell 3', location: 'Section B' }
      ])
    });
  });

  await page.route('**/rest/v1/users**', route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'mock-user-id', name: 'Mock Supervisor', role: 'maintenance_head' }
      ])
    });
  });

  await page.route('**/rest/v1/kaizen_opportunities**', route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'KZN-2026-001',
          machine_id: 'M001',
          title: 'Relocate Scrap Bin to Unloading Table',
          proposal: 'Operator currently walks 5 meters with metal punch residue to reach the main scrap yard after every 15 cycles. Move a small scrap bin directly next to the unloading table to eliminate motion waste.',
          category: 'simplification',
          waste_category: 'motion',
          estimated_impact: 'medium',
          estimated_cost: 1500,
          actual_saving: 24000,
          status: 'closed',
          standardisation_status: 'checklist',
          created_by_name: 'Anil Kumar',
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          verified_by_name: 'S. Patil',
          verified_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          trial_duration_shifts: 6,
          before_photo_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop',
          after_photo_url: 'https://images.unsplash.com/photo-1581092162613-f54843a91034?w=200&auto=format&fit=crop'
        }
      ])
    });
  });

  // 1. Verify Desktop UI Layout & Capture Screenshots
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/kaizen.html', { waitUntil: 'networkidle' });

  // Basic assertions
  await expect(page.locator('h1')).toContainText('Kaizen');
  await expect(page.locator('text=Open Kaizens')).toBeVisible();
  await expect(page.locator('text=Estimated Annual Saving')).toBeVisible();

  // Create folder and save screenshots
  await page.screenshot({ path: 'test-results/kaizen-desktop-dashboard.png', fullPage: true });

  // Switch to All Kaizens list tab
  await page.click('text=All Kaizens');
  await page.waitForTimeout(500);
  await expect(page.locator('text=KZN-2026-001')).toBeVisible();
  await page.screenshot({ path: 'test-results/kaizen-desktop-list.png', fullPage: true });

  // Switch to Submit tab
  await page.click('text=Submit Kaizen');
  await page.waitForTimeout(500);
  await expect(page.locator('text=Record Voice')).toBeVisible();
  await page.screenshot({ path: 'test-results/kaizen-desktop-form.png', fullPage: true });

  // 2. Verify Mobile Viewport Responsive Flow
  await page.setViewportSize({ width: 375, height: 812 });
  await page.click('text=Summary');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/kaizen-mobile-dashboard.png', fullPage: true });
});
