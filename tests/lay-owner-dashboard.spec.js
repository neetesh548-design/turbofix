import { test, expect } from '@playwright/test';
import { mockMachines, mockTickets, mockReflectiveMemory } from './fixtures/dashboard-fixtures.js';

test.describe('Lay Owner Dashboard User Journey & Feature Suite (/dashboard.html)', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: 'mock-user' })).toString('base64');
  const fakeJwt = `${header}.${payload}.fake-signature`;

  test.beforeEach(async ({ page }) => {
    // 1. Inject Auth Tokens & Lay Owner User Session in localStorage before navigation
    await page.addInitScript(({ jwt, memory }) => {
      window.localStorage.setItem('tf_token', jwt);
      window.localStorage.setItem('tf_user', JSON.stringify({
        role: 'factory_owner',
        name: 'Rajesh Sharma',
        user_id: 'owner-777',
        company_name: 'TurboFix Manufacturing'
      }));
      window.localStorage.setItem('turbofix_reflective_memory', JSON.stringify(memory));
    }, { jwt: fakeJwt, memory: mockReflectiveMemory });

    // 2. Mock Supabase REST endpoints for isolated, lightning-fast execution
    await page.route('**/rest/v1/**', (route) => {
      const url = route.request().url();
      if (url.includes('machines')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMachines) });
      }
      if (url.includes('tickets')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTickets) });
      }
      if (url.includes('factories')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ name: 'TurboFix Manufacturing' }]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
  });

  test('TC-DASH-01: Lay Owner Executive Greeting & Crown Jewels Financial Shield', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Verify Royal VIP Header displays executive greeting
    const royalBanner = page.locator('.royal-vip-banner');
    await expect(royalBanner).toBeVisible({ timeout: 10000 });
    await expect(royalBanner).toContainText('Greetings, Your Majesty');
    await expect(royalBanner).toContainText('VIP COMMAND CENTER');

    // Verify Crown Jewels Shield Grid displays Downtime Cost Protection card
    const shieldGrid = page.locator('.royal-shield-grid');
    await expect(shieldGrid).toBeVisible();
    await expect(shieldGrid).toContainText('Downtime Cost Protection');
    await expect(shieldGrid).toContainText('Equipment Health Score');
  });

  test('TC-DASH-02: Executive Briefing Audio & Plain-English Text Reader', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Verify Executive Briefing text bar
    const briefingCard = page.locator('.royal-briefing-card');
    await expect(briefingCard).toBeVisible({ timeout: 10000 });
    await expect(briefingCard).toContainText('Executive Briefing:');

    // Test Audio Briefing button interaction
    const audioBtn = page.locator('button:has-text("Listen Briefing"), button:has-text("Stop Audio")').first();
    await expect(audioBtn).toBeVisible();
    await audioBtn.click();
  });

  test('TC-DASH-03: 1-Tap Express Spares Approval Action', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Locate 1-Tap Spares Approval button in King's Command Suite
    const sparesBtn = page.locator('.royal-action-btn:has-text("1-Tap Spares Approval")');
    await expect(sparesBtn).toBeVisible({ timeout: 10000 });
    await sparesBtn.click();

    // Verify confirmation toast notification appears
    const toast = page.locator('.toast-message');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Royal Command Executed');
  });

  test('TC-DASH-04: Reflective Behavioral Memory & Contrastive Bias Correction', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Verify Reflective Mirror Banner recalls previous session focus
    const reflectiveBanner = page.locator('.reflective-mirror-banner');
    await expect(reflectiveBanner).toBeVisible({ timeout: 10000 });
    await expect(reflectiveBanner).toContainText("The Analyst's Mirror");
    await expect(reflectiveBanner).toContainText('Hydraulic Press');

    // Verify Contrastive Suggestion / Counterbalance Alert for Screw Air Compressor
    await expect(reflectiveBanner).toContainText('Counterbalance Alert');
    await expect(reflectiveBanner).toContainText('Screw Air Compressor');
  });

  test('TC-DASH-05: Executive vs Operations View Mode Toggle', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    const shieldGrid = page.locator('.royal-shield-grid');
    await expect(shieldGrid).toBeVisible();

    // Click Operations View button
    const opsBtn = page.locator('button:has-text("Operations View")');
    await opsBtn.click();

    // Verify King's View Crown Jewels grid is hidden in Operations View
    await expect(shieldGrid).not.toBeVisible();

    // Click King's View button to restore executive layout
    const kingsBtn = page.locator('button:has-text("King\'s View")');
    await kingsBtn.click();
    await expect(shieldGrid).toBeVisible();
  });

  test('TC-DASH-06: Priority Queue Inspection & Drilldown Scroll', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Locate Needs Attention priority queue
    const queuePanel = page.locator('.dashboard-queue-panel');
    await expect(queuePanel).toBeVisible({ timeout: 10000 });

    // Click on a priority item
    const priorityItem = page.locator('.attention-row.clickable').first();
    await expect(priorityItem).toBeVisible();
    await priorityItem.click();
  });

  test('TC-DASH-07: Royal Concierge Quick Ask Search Command', async ({ page }) => {
    await page.goto('/dashboard.html', { waitUntil: 'domcontentloaded' });

    // Fill in quick ask prompt
    const input = page.locator('.royal-concierge-quick-ask input');
    await expect(input).toBeVisible();
    await input.fill('What is today\'s cost savings?');

    // Submit command
    const commandBtn = page.locator('.royal-concierge-quick-ask button[type="submit"]');
    await commandBtn.click();

    // Verify toast response
    const toast = page.locator('.toast-message');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Royal Concierge');
  });
});
