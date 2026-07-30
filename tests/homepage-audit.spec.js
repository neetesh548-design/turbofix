import { expect, test } from '@playwright/test';

test.describe('TurboFix Homepage E2E Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('1. Verify homepage title, hero heading, and primary CTAs', async ({ page }) => {
    await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveTitle(/TurboFix/i);

    const heroHeading = page.locator('.marketing-hero-copy h1');
    await expect(heroHeading).toBeVisible();

    const bookDemoBtn = page.locator('.marketing-actions a').first();
    await expect(bookDemoBtn).toBeVisible();
    await expect(bookDemoBtn).toContainText(/book/i);
  });

  test('2. Verify Executive Connection Cards & custom persona portraits', async ({ page }) => {
    await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 10000 });

    const ownerCard = page.locator('article', { hasText: 'Factory Owners' });
    await expect(ownerCard).toBeVisible();
    await expect(ownerCard).toContainText('MTTR');

    const ownerImg = ownerCard.locator('img');
    await expect(ownerImg).toBeVisible();
    await expect(ownerImg).toHaveAttribute('src', /plant_owner_executive\.jpg/);

    const headCard = page.locator('article', { hasText: 'Maintenance Heads' });
    await expect(headCard).toBeVisible();
    await expect(headCard).toContainText('verified photo proof');

    const headImg = headCard.locator('img');
    await expect(headImg).toBeVisible();
    await expect(headImg).toHaveAttribute('src', /maintenance_head_lead\.jpg/);

    const techCard = page.locator('article', { hasText: 'Shift Techs' });
    await expect(techCard).toBeVisible();
    await expect(techCard).toContainText('10-second QR scan');

    const techImg = techCard.locator('img');
    await expect(techImg).toBeVisible();
    await expect(techImg).toHaveAttribute('src', /technician_shift_lead\.jpg/);
  });

  test('3. Verify Theme Toggle switches between Dark and Light Mode', async ({ page }) => {
    await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 10000 });
    const htmlElement = page.locator('html');

    let initialTheme = await htmlElement.getAttribute('data-theme');
    if (!initialTheme) initialTheme = 'dark';

    const themeToggleBtn = page.locator('.theme-toggle').first();
    await expect(themeToggleBtn).toBeVisible();

    // Click toggle to switch theme
    await themeToggleBtn.click();
    const switchedTheme = await htmlElement.getAttribute('data-theme');
    expect(switchedTheme).not.toBe(initialTheme);

    // Toggle back
    await themeToggleBtn.click();
    const resetTheme = await htmlElement.getAttribute('data-theme');
    expect(resetTheme).toBe(initialTheme);
  });

  test('4. Verify Navbar brand and navigation links', async ({ page }) => {
    await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 10000 });

    const brand = page.locator('.brand-turbo').first();
    await expect(brand).toBeVisible();
    await expect(brand).toHaveText('TURBO');

    const platformLink = page.locator('a[href*="platform.html"]').first();
    await expect(platformLink).toBeVisible();

    const pricingLink = page.locator('a[href*="pricing.html"]').first();
    await expect(pricingLink).toBeVisible();
  });
});
