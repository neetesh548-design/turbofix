import { expect, test } from '@playwright/test';

test.describe('Machines Page Diagnostics', () => {
  test.beforeEach(async ({ page }) => {
    // Set authenticated demo user in localStorage before loading page
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'tf_user',
        JSON.stringify({
          user_id: 'usr_owner_exide',
          name: 'Balaji S',
          email: 'owner@exidebattery.in',
          role: 'owner',
          company_code: 'EXIDE',
          company_name: 'Exide Battery Plant 4',
          inventory_mode: 'demo',
        })
      );
      window.localStorage.setItem('tf_token', 'demo:owner');
    });
  });

  test('Check if /machines.html opens cleanly for signed-in user', async ({ page }) => {
    const unhandledJsErrors = [];
    page.on('pageerror', (err) => {
      unhandledJsErrors.push(err.message);
    });

    await page.goto('/machines.html', { waitUntil: 'networkidle' });

    // Expect page container or machines board to be visible
    const pageContainer = page.locator('.machines-board, .machines-page, [data-testid="machines-page"]').first();
    await expect(pageContainer).toBeVisible({ timeout: 10000 });

    const headerTitle = page.locator('.machines-board-head h1, .machines-workspace-identity h2').first();
    await expect(headerTitle).toBeVisible();

    expect(unhandledJsErrors.length).toBe(0);
  });

  test('Check if /machines route redirects to /machines.html and loads', async ({ page }) => {
    await page.goto('/machines', { waitUntil: 'networkidle' });

    // Expect URL to be /machines.html
    expect(page.url()).toContain('/machines.html');

    const pageContainer = page.locator('.machines-board, .machines-page, [data-testid="machines-page"]').first();
    await expect(pageContainer).toBeVisible({ timeout: 10000 });
  });
});
