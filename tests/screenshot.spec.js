import { test } from '@playwright/test';

test('capture dashboard screenshots', async ({ page }) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: 'mock-user' })).toString('base64');
  const fakeJwt = `${header}.${payload}.fake-signature`;

  await page.addInitScript((jwt) => {
    window.localStorage.setItem('tf_token', jwt);
    window.localStorage.setItem('tf_user', JSON.stringify({
      role: 'maintenance_head', name: 'Mock User',
      user_id: 'mock-user-id', company_name: 'Test Factory'
    }));
  }, fakeJwt);

  await page.route('**/rest/v1/**', route => {
    const url = route.request().url();
    if (url.includes('machines')) {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify([
          { id: 'm1', name: 'CNC Lathe', location: 'Zone A', hourly_downtime_cost: 100 },
          { id: 'm2', name: 'Hydraulic Press', location: 'Zone B', hourly_downtime_cost: 200 },
          { id: 'm3', name: 'Milling Machine', location: 'Zone C', hourly_downtime_cost: 150 },
        ])
      });
    }
    if (url.includes('tickets')) {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify([
          { id: 't1', machine_id: 'm1', status: 'open', created_at: new Date().toISOString(), issue_text: 'Bearing noise detected', ai_summary: { urgency: 'high', summary: 'Bearing noise' } },
          { id: 't2', machine_id: 'm2', status: 'open', created_at: new Date().toISOString(), issue_text: 'Oil leak from hydraulic line', ai_summary: { urgency: 'critical', summary: 'Oil leak' } },
          { id: 't3', machine_id: 'm1', status: 'resolved', created_at: '2025-07-10T10:00:00Z', resolved_at: '2025-07-10T14:00:00Z', issue_text: 'Belt replacement' },
        ])
      });
    }
    if (url.includes('factories')) {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify([{ name: 'TurboFix Demo Plant' }])
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/functions/v1/**', route => {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ members: [], machine_assignments: {} })
    });
  });

  // Desktop viewport
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/dashboard.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/dashboard-full-top.png', fullPage: false });
  await page.screenshot({ path: 'test-results/dashboard-full-page.png', fullPage: true });

  // Mobile viewport
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
});
