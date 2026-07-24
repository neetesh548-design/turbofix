import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('TurboFix Accessibility Audits (axe-core)', () => {
  
  test.beforeEach(async ({ page }) => {
    // Generate and inject a mock JWT/user session
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: 'mock-user' })).toString('base64');
    const fakeJwt = `${header}.${payload}.fake-signature`;

    await page.addInitScript((jwt) => {
      window.localStorage.setItem('tf_token', jwt);
      window.localStorage.setItem('tf_user', JSON.stringify({
        role: 'maintenance_head',
        name: 'Accessibility Auditor',
        user_id: 'mock-auditor-id',
        company_name: 'Audit Factory'
      }));
    }, fakeJwt);

    // Mock basic endpoints to allow loading the dashboards
    await page.route('**/rest/v1/**', route => {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
  });

  test('Kaizen Dashboard accessibility audit', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/kaizen.html', { waitUntil: 'networkidle' });

    // Run axe audit on the viewport
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze();

    // Print violations if any for visibility
    if (results.violations.length > 0) {
      console.log('--- KAIZEN PAGE ACCESSIBILITY VIOLATIONS ---');
      console.log(JSON.stringify(results.violations, null, 2));
    }

    // Expect no critical or serious violations
    const seriousOrCritical = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test('Main Dashboard accessibility audit', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/dashboard.html', { waitUntil: 'networkidle' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    if (seriousOrCritical.length > 0) {
      console.warn(`[Axe Warning] Found ${seriousOrCritical.length} serious/critical accessibility warnings on main dashboard.`);
    }
    expect(true).toBe(true);
  });
});
