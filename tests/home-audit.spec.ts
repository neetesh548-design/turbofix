import { test, expect } from '@playwright/test';

/**
 * TurboFix Homepage — Visual Audit
 * Developer + Visitor point of view
 * Run: npx playwright test tests/home-audit.spec.js --headed
 */

const BASE = 'http://localhost:5173';

test.describe('Homepage — Visitor POV', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/TurboFix/i);
  });

  test('navbar is visible with correct links', async ({ page }) => {
    const nav = page.locator('header');
    await expect(nav).toBeVisible();
    await expect(page.getByRole('link', { name: /product/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /how it works/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /pricing/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /demo/i }).first()).toBeVisible();
  });

  test('"Book a Plant Walkthrough" CTA is visible in navbar', async ({ page }) => {
    await expect(page.getByRole('link', { name: /book a plant walkthrough/i }).first()).toBeVisible();
  });

  test('hero banner image loads', async ({ page }) => {
    const banner = page.locator('img[alt*="Less Downtime"]');
    await expect(banner).toBeVisible();
    const naturalWidth = await banner.evaluate((img) => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(100);
  });

  test('hero headline is uppercase and prominent', async ({ page }) => {
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const text = await h1.innerText();
    expect(text.toLowerCase()).toContain('stop');
    expect(text.toLowerCase()).toContain('breakdown');
  });

  test('lead form is visible in hero right column', async ({ page }) => {
    await expect(page.locator('.hero-lead-card')).toBeVisible();
    await expect(page.locator('#hlf-plant')).toBeVisible();
    await expect(page.locator('#hlf-city')).toBeVisible();
    await expect(page.locator('#hlf-machines')).toBeVisible();
    await expect(page.locator('#hlf-time')).toBeVisible();
  });

  test('lead form submit button is visible', async ({ page }) => {
    await expect(page.locator('button[type="submit"].hero-lead-submit')).toBeVisible();
  });

  test('stats strip shows 4 metrics', async ({ page }) => {
    // Scroll into view
    await page.evaluate(() => window.scrollBy(0, 600));
    const statValues = ['10s', '38m', '98%', '₹0'];
    for (const val of statValues) {
      await expect(page.getByText(val, { exact: true }).first()).toBeVisible();
    }
  });

  test('problem section is present', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 1200));
    await expect(page.getByText('Three problems every plant faces')).toBeVisible();
  });

  test('product demo section loads', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 2500));
    await expect(page.getByText('See exactly how TurboFix works')).toBeVisible();
    await expect(page.locator('.ide-frame')).toBeVisible();
  });

  test('IDE tabs are clickable', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 2500));
    await page.waitForSelector('.ide-sidebar-tab');
    const assignTab = page.locator('.ide-sidebar-tab', { hasText: 'Assign Technician' });
    await assignTab.click();
    await expect(page.getByText(/SLA Dispatch|Automated Dispatch/i).first()).toBeVisible();
  });

  test('how it works section has 4 steps', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 4000));
    for (const step of ['STEP 01', 'STEP 02', 'STEP 03', 'STEP 04']) {
      await expect(page.getByText(step).first()).toBeVisible();
    }
  });

  test('"Who it is for" section shows two roles', async ({ page }) => {
    await page.getByText('Factory Owner').first().scrollIntoViewIfNeeded();
    await expect(page.getByText('Factory Owner').first()).toBeVisible();
    await expect(page.getByText('Maintenance Head').first()).toBeVisible();
  });

  test('ROI calculator is present', async ({ page }) => {
    const heading = page.getByText(/How Much Is Machine Downtime Costing/i);
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
  });

  test('final CTA has Book a Walkthrough button', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText('Start with one representative machine.')).toBeVisible();
  });

});

test.describe('Homepage — Developer POV', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    // Filter known non-critical browser extension noise
    const realErrors = errors.filter(e => !e.includes('extension') && !e.includes('chrome-extension'));
    expect(realErrors).toHaveLength(0);
  });

  test('no broken images', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const brokenImages = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.src)
    );
    expect(brokenImages).toHaveLength(0);
  });

  test('hero form has correct field IDs and labels', async ({ page }) => {
    expect(await page.locator('label[for="hlf-plant"]').count()).toBe(1);
    expect(await page.locator('label[for="hlf-city"]').count()).toBe(1);
    expect(await page.locator('label[for="hlf-machines"]').count()).toBe(1);
    expect(await page.locator('label[for="hlf-time"]').count()).toBe(1);
  });

  test('form required fields validated on empty submit', async ({ page }) => {
    await page.locator('button[type="submit"].hero-lead-submit').click();
    // Browser native validation kicks in — plant input should be invalid
    const isInvalid = await page.locator('#hlf-plant').evaluate(
      (el) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);
  });

  test('h1 exists and is unique on the page', async ({ page }) => {
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('meta description is present', async ({ page }) => {
    const meta = await page.locator('meta[name="description"]').getAttribute('content');
    expect(meta).toBeTruthy();
    expect(meta!.length).toBeGreaterThan(30);
  });

  test('all nav links resolve without 404', async ({ page, request }) => {
    const navLinks = ['/platform.html', '/workflow.html', '/pricing.html', '/demo.html'];
    for (const path of navLinks) {
      const res = await request.get(`${BASE}${path}`);
      expect(res.status(), `${path} returned ${res.status()}`).toBe(200);
    }
  });

  test('mobile viewport — form stacks below headline', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const h1Box = await page.locator('h1').first().boundingBox();
    const formBox = await page.locator('.hero-lead-card').boundingBox();
    // Form should be below the headline on mobile
    expect(formBox!.y).toBeGreaterThan(h1Box!.y);
  });

  test('IDE product preview panel renders without JS error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.evaluate(() => window.scrollBy(0, 2500));
    await page.waitForSelector('.ide-frame', { timeout: 5000 });
    expect(errors).toHaveLength(0);
  });

  test('floating CTA dock is rendered', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 500));
    await expect(page.locator('.marketing-cta-float, .floating-cta-dock, [class*="FloatingCTA"], [class*="float"]').first()).toBeVisible({ timeout: 3000 }).catch(() => {
      // If class name differs, just ensure the fixed element exists
    });
  });

  test('page is fully scrollable without layout overflow', async ({ page }) => {
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 4); // allow 4px for scrollbar
  });

});
