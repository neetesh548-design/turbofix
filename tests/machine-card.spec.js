import { test, expect } from '@playwright/test';

/**
 * Machines — health board.
 *
 * The page leads with a card grid that answers "is this machine OK?" at a
 * glance. The nine-tab workspace still exists, but it now sits behind
 * "View details" rather than being the first thing a user meets.
 */
test.describe('Machines health board', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: 'mock-user' })).toString('base64');
  const fakeJwt = `${header}.${payload}.fake-signature`;

  const DAY = 24 * 60 * 60 * 1000;
  /** Local YYYY-MM-DD `offset` days from today — matches how the app compares dates. */
  const dateFromNow = (offset) => {
    const d = new Date(Date.now() + offset * DAY);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const stamp = (offset) => new Date(Date.now() + offset * DAY).toISOString();

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((jwt) => {
      window.localStorage.setItem('tf_token', jwt);
      window.localStorage.setItem('tf_user', JSON.stringify({
        role: 'owner',
        name: 'Mock Owner',
        user_id: 'mock-user-id',
        company_name: 'Test Factory',
      }));
      // Start from a known board layout rather than a previous run's toggle.
      window.localStorage.setItem('tf_machines_directory_view', 'grid');
    }, fakeJwt);

    await page.route('**/rest/v1/**', (route) => {
      const url = route.request().url();
      const json = (body) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

      if (url.includes('machines')) {
        // One machine per health state the board can show.
        return json([
          {
            id: 'M001', name: 'CNC Lathe 1', location: 'Zone A', status: 'healthy',
            last_maintenance_date: dateFromNow(-28), next_maintenance_due: dateFromNow(2),
            technician_user_id: 'u1',
          },
          {
            id: 'M002', name: 'Hydraulic Press', location: 'Bay 1', status: 'breakdown',
            last_maintenance_date: dateFromNow(-71), next_maintenance_due: dateFromNow(-11),
            technician_user_id: 'u1',
          },
          {
            id: 'M003', name: 'Air Compressor', location: 'Utility Room', status: 'healthy',
            last_maintenance_date: dateFromNow(-40), next_maintenance_due: dateFromNow(60),
            technician_user_id: 'u1',
          },
        ]);
      }

      if (url.includes('tickets')) {
        return json([
          // Two open tickets push M002 to "down".
          { id: 't1', machine_id: 'M002', status: 'open', issue_text: 'Spindle vibration', urgency: 'high', created_at: stamp(-1) },
          { id: 't2', machine_id: 'M002', status: 'open', issue_text: 'Oil seepage', urgency: 'medium', created_at: stamp(-4) },
          // A single critical ticket puts M003 at "needs a look".
          { id: 't3', machine_id: 'M003', status: 'open', issue_text: 'Discharge temperature alarm', urgency: 'critical', created_at: stamp(-2) },
          { id: 't4', machine_id: 'M001', status: 'closed', issue_text: 'Coolant nozzle realigned', urgency: 'low', created_at: stamp(-12) },
        ]);
      }

      if (url.includes('factories')) return json([{ id: 'f1', name: 'Test Factory Plant' }]);
      return json([]);
    });

    await page.route('**/functions/v1/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        members: [{ user_id: 'u1', name: 'Anil Kumar', role: 'maintenance_technician', can_reveal_contact: true }],
        machine_assignments: {},
      }),
    }));
  });

  test('grades each machine and sorts the worst first', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/machines.html', { waitUntil: 'networkidle' });

    const cards = page.locator('[data-testid="machine-card"]');
    await expect(cards).toHaveCount(3);

    // Worst-first: nobody should have to scroll to find the machine that is down.
    await expect(cards.nth(0)).toHaveAttribute('data-health', 'down');
    await expect(cards.nth(1)).toHaveAttribute('data-health', 'issues');
    await expect(cards.nth(2)).toHaveAttribute('data-health', 'running');

    // A PM merely due soon does not make a healthy machine look sick.
    const healthy = page.locator('[data-machine-id="M001"]');
    await expect(healthy).toHaveAttribute('data-health', 'running');

    // The chip counts summarise the whole fleet, not the filtered view.
    await expect(page.getByTestId('machine-filter-all')).toContainText('3');
    await expect(page.getByTestId('machine-filter-down')).toContainText('1');
    await expect(page.getByTestId('machine-filter-issues')).toContainText('1');
    await expect(page.getByTestId('machine-filter-running')).toContainText('1');
  });

  test('filters by health and searches by name or location', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/machines.html', { waitUntil: 'networkidle' });

    await page.getByTestId('machine-filter-down').click();
    await expect(page.locator('[data-testid="machine-card"]')).toHaveCount(1);
    await expect(page.locator('[data-machine-id="M002"]')).toBeVisible();

    await page.getByTestId('machine-filter-all').click();
    await page.getByTestId('machine-search').fill('utility');
    await expect(page.locator('[data-testid="machine-card"]')).toHaveCount(1);
    await expect(page.locator('[data-machine-id="M003"]')).toBeVisible();

    await page.getByTestId('machine-search').fill('nothing-matches-this');
    await expect(page.getByTestId('machine-board-no-results')).toBeVisible();
  });

  test('opens the detail drawer when a card is clicked', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/machines.html', { waitUntil: 'networkidle' });

    await page.locator('[data-machine-id="M002"]').click();

    const drawer = page.getByTestId('machine-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('Hydraulic Press');
    // The open work is listed, not just counted.
    await expect(drawer).toContainText('Spindle vibration');
    await expect(drawer).toContainText('Oil seepage');
    // Quick edit is three fields, reachable in one click.
    await expect(page.getByTestId('machine-quick-edit-open')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });

  test('reports an issue straight from a card without entering the workspace', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/machines.html', { waitUntil: 'networkidle' });

    await page.locator('[data-machine-id="M002"]').getByTestId('machine-report-issue').click();

    await expect(page.getByRole('heading', { name: 'Report issue' })).toBeVisible();
    await expect(page.getByText('Speak the problem')).toBeVisible();
    // Still on the board — reporting never forced a detour through the workspace.
    await expect(page.locator('.machine-workspace-page')).toHaveCount(0);
  });

  test('View details still reaches all nine workspace tabs', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/machines.html', { waitUntil: 'networkidle' });

    await page.locator('[data-machine-id="M001"]').getByTestId('machine-view-details').click();
    await expect(page.locator('.machine-workspace-page')).toBeVisible();

    await page.getByRole('button', { name: /More options/ }).click();

    const tabsToTest = [
      { name: 'Overview', markerText: 'Machine profile' },
      { name: 'Documents', markerText: 'Machine knowledge file' },
      { name: 'Spare parts', markerText: 'Keep the parts this machine depends on' },
      { name: 'Consumables', markerText: 'Add only the few supply items this machine depends on' },
      { name: 'Preventive', markerText: 'Keep the routine checks visible so this machine stays ahead' },
      { name: 'Reliability', markerText: 'Reliability improvement' },
      { name: 'Kaizen', markerText: 'Kaizen Opportunities' },
      { name: 'Calendar', markerText: 'Replenishment markers are dynamically computed' },
      { name: 'QR tag', markerText: 'CNC Lathe 1 Tag' },
    ];

    for (const tab of tabsToTest) {
      const tabButton = page.locator('.machine-workspace-tabs button', { hasText: tab.name }).first();
      await expect(tabButton).toBeVisible();
      await tabButton.click();
      await expect(tabButton).toHaveClass(/active/);
      await expect(page.locator(`text=${tab.markerText}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('stacks to a single column on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/machines.html', { waitUntil: 'networkidle' });

    const cards = page.locator('[data-testid="machine-card"]');
    await expect(cards).toHaveCount(3);

    // Same DOM at every width: one column means every card shares an x origin.
    const boxes = await cards.all();
    const lefts = [];
    for (const card of boxes) lefts.push((await card.boundingBox()).x);
    expect(new Set(lefts).size).toBe(1);

    // The board must not push the page sideways. Asserted against the board's
    // own subtree rather than the document, because the shared AppShell chrome
    // already overflows by ~12px on every page at this width — that is a
    // pre-existing layout bug and not something this board introduced.
    const boardOverflow = await page.evaluate(() => {
      const board = document.querySelector('.machines-board');
      return { scrollWidth: board.scrollWidth, clientWidth: board.clientWidth };
    });
    expect(boardOverflow.scrollWidth).toBeLessThanOrEqual(boardOverflow.clientWidth);

    // Cards themselves stay inside the viewport.
    for (const card of boxes) {
      const box = await card.boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
  });
});
