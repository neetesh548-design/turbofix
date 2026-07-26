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
    await expect(navTab(page, 'Smart Modules')).toBeVisible();
    await expect(navTab(page, 'Security & Encryption')).toBeVisible();
  });

  test('technician only sees low-risk settings', async ({ page }) => {
    await openSettings(page, 'technician');
    await expect(navTab(page, 'General & Preferences')).toBeVisible();
    await expect(navTab(page, 'AI & Machine Data')).toBeVisible();
    await expect(navTab(page, 'Plant Info')).toHaveCount(0);
    await expect(navTab(page, 'Breakdown Alerts')).toHaveCount(0);
    await expect(navTab(page, 'Roles & Access')).toHaveCount(0);
    await expect(navTab(page, 'Smart Modules')).toHaveCount(0);
    await expect(navTab(page, 'Security & Encryption')).toHaveCount(0);
  });

  test('support cannot see role admin controls', async ({ page }) => {
    await openSettings(page, 'support');
    await expect(navTab(page, 'General & Preferences')).toBeVisible();
    await expect(navTab(page, 'AI & Machine Data')).toBeVisible();
    await expect(navTab(page, 'Security & Encryption')).toBeVisible();
    await expect(navTab(page, 'Roles & Access')).toHaveCount(0);
    await expect(navTab(page, 'Plant Info')).toHaveCount(0);
    await expect(navTab(page, 'Breakdown Alerts')).toHaveCount(0);
  });

  test('invalid deep link falls back to the first visible tab', async ({ page }) => {
    await openSettings(page, 'technician', '#security');
    await expect(navTab(page, 'Security & Encryption')).toHaveCount(0);
    await expect(navTab(page, 'General & Preferences')).toHaveAttribute('aria-selected', 'true');
  });

  test('unknown role gets only the calm default tab', async ({ page }) => {
    await openSettings(page, 'guest');
    await expect(navTab(page, 'General & Preferences')).toBeVisible();
    await expect(navTab(page, 'AI & Machine Data')).toHaveCount(0);
    await expect(navTab(page, 'Roles & Access')).toHaveCount(0);
  });
});
