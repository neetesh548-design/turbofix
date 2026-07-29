import { test, expect } from '@playwright/test';

/**
 * Role dashboards — each login must land on the board built for it.
 *
 * Supabase is left unmocked and returns nothing here, so the page takes its
 * demo-data path. That is deliberate: it exercises the fallback every pilot
 * factory hits on day one, and keeps the assertions about *which board and
 * which structure* rather than about specific numbers.
 */

const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: 'mock-user' })).toString('base64');
const FAKE_JWT = `${header}.${payload}.fake-signature`;

async function signInAs(page, role, name = 'Test User') {
  await page.addInitScript(({ jwt, userRole, userName }) => {
    window.localStorage.setItem('tf_token', jwt);
    window.localStorage.setItem('tf_user', JSON.stringify({
      user_id: 'demo-tech-1',
      name: userName,
      role: userRole,
      company_code: 'PUNE-PLANT-01',
      inventory_mode: 'demo',
    }));
  }, { jwt: FAKE_JWT, userRole: role, userName: name });
}

async function gotoDashboard(page) {
  await page.goto('/dashboard.html');
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
}

test.describe('Role-aware dashboard routing', () => {
  test('owner login renders the owner board', async ({ page }) => {
    await signInAs(page, 'owner', 'Rajesh Sharma');
    await gotoDashboard(page);

    await expect(page.getByTestId('dashboard-page')).toHaveAttribute('data-role', 'owner');
    await expect(page.getByTestId('owner-dashboard')).toBeVisible();
    await expect(page.getByTestId('technician-dashboard')).toHaveCount(0);

    // The four business KPIs the owner board promises.
    for (const id of ['kpi-value-at-risk', 'kpi-maintenance-cost', 'kpi-critical-machines', 'kpi-downtime-cost']) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
  });

  test('technician login renders the technician board with a work queue', async ({ page }) => {
    await signInAs(page, 'maintenance_technician', 'Amit Kumar');
    await gotoDashboard(page);

    await expect(page.getByTestId('dashboard-page')).toHaveAttribute('data-role', 'technician');
    await expect(page.getByTestId('technician-dashboard')).toBeVisible();
    await expect(page.getByTestId('owner-dashboard')).toHaveCount(0);

    await expect(page.getByTestId('kpi-due-today')).toBeVisible();
    await expect(page.getByTestId('kpi-overdue-pm')).toBeVisible();
    await expect(page.getByTestId('kpi-parts-to-order')).toBeVisible();
  });

  test('supervisor login renders the supervisor board with team cards', async ({ page }) => {
    await signInAs(page, 'supervisor', 'Vikram Patil');
    await gotoDashboard(page);

    await expect(page.getByTestId('dashboard-page')).toHaveAttribute('data-role', 'supervisor');
    await expect(page.getByTestId('supervisor-dashboard')).toBeVisible();
    await expect(page.getByTestId('supervisor-team-grid')).toBeVisible();
    await expect(page.getByTestId('kpi-resolved-week')).toBeVisible();
  });

  test('engineer login renders the engineer board with reliability KPIs', async ({ page }) => {
    await signInAs(page, 'maintenance_engineer', 'Anita Deshmukh');
    await gotoDashboard(page);

    await expect(page.getByTestId('dashboard-page')).toHaveAttribute('data-role', 'engineer');
    await expect(page.getByTestId('engineer-dashboard')).toBeVisible();
    await expect(page.getByTestId('kpi-repeat-rate')).toBeVisible();
    await expect(page.getByTestId('kpi-rca-completion')).toBeVisible();
  });

  test('quality inspector gets a dedicated verification board', async ({ page }) => {
    await signInAs(page, 'quality_inspector', 'Priya Nair');
    await gotoDashboard(page);

    await expect(page.getByTestId('dashboard-page')).toHaveAttribute('data-role', 'quality_inspector');
    await expect(page.getByTestId('quality_inspector-dashboard')).toBeVisible();
    await expect(page.getByTestId('owner-dashboard')).toHaveCount(0);
  });

  for (const [role, testId] of [
    ['maintenance_head', 'maintenance_head-dashboard'],
    ['safety_officer', 'safety_officer-dashboard'],
  ]) {
    test(`${role} gets a dedicated action board`, async ({ page }) => {
      await signInAs(page, role);
      await gotoDashboard(page);
      await expect(page.getByTestId('dashboard-page')).toHaveAttribute('data-role', role);
      await expect(page.getByTestId(testId)).toBeVisible();
      await expect(page.getByTestId('owner-dashboard')).toHaveCount(0);
    });
  }
});

test.describe('Explicit demo mode', () => {
  test('labels the board as sample data for an explicit demo session', async ({ page }) => {
    await signInAs(page, 'owner');
    await gotoDashboard(page);
    await expect(page.getByTestId('dashboard-demo-banner')).toBeVisible();
  });
});

test.describe('Technician quick report', () => {
  test('the quick report button opens the existing dialog', async ({ page }) => {
    await signInAs(page, 'maintenance_technician');
    await gotoDashboard(page);

    const trigger = page.getByTestId('technician-quick-report');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('Responsive layout', () => {
  const VIEWPORTS = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
  ];

  for (const viewport of VIEWPORTS) {
    for (const role of ['owner', 'maintenance_technician']) {
      test(`${role} board has no horizontal overflow at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await signInAs(page, role);
        await gotoDashboard(page);

        // Scoped to the dashboard container rather than <body>: AppShell's
        // off-canvas sidebar parks ~12px past the viewport on every page in
        // the app, so a body-level assertion would fail for reasons that have
        // nothing to do with this board. What must hold here is that the
        // dashboard's own content never forces a sideways scroll — wide
        // tables scroll inside their own overflow-x container instead.
        const overflow = await page.evaluate(() => {
          const root = document.querySelector('[data-testid="dashboard-page"]');
          return { scroll: root.scrollWidth, client: root.clientWidth };
        });
        expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
      });
    }
  }
});
