import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 60000 });

const BASE_USER = {
  id: 'mock-user-123',
  company_code: 'TEST01',
  company_name: 'Test Plant',
};

function seedUser(page, role) {
  return page.addInitScript((user) => {
    window.localStorage.setItem('tf_user', JSON.stringify(user));
    window.localStorage.setItem('tf_token', 'fake.eyJleHAiOiA5OTk5OTk5OTk5fQ==.fake');
  }, { ...BASE_USER, role });
}

async function mockSettingsData(page, machines = [{ id: 'mock1', name: 'Mock Machine 1' }], documents = []) {
  await page.route('**/rest/v1/machines?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(machines),
    });
  });

  await page.route('**/rest/v1/documents?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(documents),
    });
  });
}

async function openSettings(page, role, hash = '') {
  await seedUser(page, role);
  await mockSettingsData(page);
  await page.goto(`/settings.html${hash}`);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
}

function navTab(page, name) {
  return page.locator('.settings-nav').getByRole('tab', { name });
}

function contentTab(page, name) {
  return page.locator('.settings-content').getByRole('tab', { name });
}

test.describe('Settings role boundaries', () => {
  test('owner sees every section', async ({ page }) => {
    await openSettings(page, 'owner');
    await expect(navTab(page, 'General & Preferences')).toBeVisible();
    await expect(navTab(page, 'Plant Info')).toBeVisible();
    await expect(navTab(page, 'AI & Machine Data')).toBeVisible();
    await expect(navTab(page, 'Breakdown Alerts')).toBeVisible();
    await expect(navTab(page, 'Roles & Access')).toBeVisible();
    await expect(navTab(page, 'Security & Encryption')).toBeVisible();
    await expect(navTab(page, 'Activity Audit Log')).toBeVisible();
  });

  // getVisibleSettingTabs() (src/pages/Settings.jsx) still has branches for
  // role === 'technician'/'support'/'admin', but AppShell.jsx's own
  // workspace-access gate (canViewWorkspace() against ROLE_NAV in
  // src/lib/roles.js) only lets owner/supervisor/maintenance_head into the
  // 'settings' workspace at all — every other role, including these three,
  // hits AppShell's "This workspace is not part of your role view." message
  // before Settings.jsx's tab logic ever runs. 'support' in particular isn't
  // a role anywhere else in the codebase (every other use of that string is
  // the *workspace* named "Support & Decisions") — these three branches are
  // unreachable dead code today, left in place rather than removed here since
  // this file can't rule out another entry point into Settings.jsx that
  // bypasses AppShell. These tests were written before ROLE_NAV's gate
  // existed and asserted tab-level behavior these roles can never actually
  // reach; rewritten to verify what a real user session in each of these
  // states actually sees.

  test('supervisor sees only their permitted admin sections', async ({ page }) => {
    await openSettings(page, 'supervisor');
    await expect(navTab(page, 'General & Preferences')).toBeVisible();
    await expect(navTab(page, 'Plant Info')).toBeVisible();
    await expect(navTab(page, 'Breakdown Alerts')).toBeVisible();
    await expect(navTab(page, 'Activity Audit Log')).toBeVisible();
    await expect(navTab(page, 'AI & Machine Data')).toHaveCount(0);
    await expect(navTab(page, 'Roles & Access')).toHaveCount(0);
    await expect(navTab(page, 'Security & Encryption')).toHaveCount(0);
  });

  test('a role without settings access sees the role-view message instead', async ({ page }) => {
    await seedUser(page, 'maintenance_technician');
    await mockSettingsData(page);
    await page.goto('/settings.html');
    await expect(page.getByText('This workspace is not part of your role view.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Settings' })).toHaveCount(0);
  });

  test('invalid deep link falls back to the first visible tab', async ({ page }) => {
    await openSettings(page, 'supervisor', '#security');
    await expect(navTab(page, 'Security & Encryption')).toHaveCount(0);
    await expect(navTab(page, 'General & Preferences')).toHaveAttribute('aria-selected', 'true');
  });

  test('unrecognized role is blocked at the workspace level, not shown a default tab', async ({ page }) => {
    await seedUser(page, 'guest');
    await mockSettingsData(page);
    await page.goto('/settings.html');
    await expect(page.getByText('This workspace is not part of your role view.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Settings' })).toHaveCount(0);
  });
});
