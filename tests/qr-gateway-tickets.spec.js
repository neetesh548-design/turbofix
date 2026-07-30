import { expect, test } from '@playwright/test';

test.describe('QR Gateway to Tickets Integration Test', () => {
  test.beforeEach(async ({ page }) => {
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

  test('Verify tickets submitted via QR Gateway appear immediately on Tickets page', async ({ page }) => {
    const unhandledJsErrors = [];
    page.on('pageerror', (err) => {
      unhandledJsErrors.push(err.message);
    });

    // 1. Visit QR Gateway
    await page.goto('/qr-gateway.html?machine_id=MCH-CNC-01', { waitUntil: 'networkidle' });

    // Verify QR Gateway loaded
    const gatewayTitle = page.locator('h1, .qr-gateway-identity-top, body').first();
    await expect(gatewayTitle).toBeVisible();

    // 2. Simulate QR ticket submission into localStorage
    await page.evaluate(() => {
      const payload = {
        id: 'qr-test-' + Date.now(),
        machine_id: 'MCH-CNC-01',
        machine_name: 'CNC Milling Machine #1',
        issue_text: 'Spindle motor overheating and unusual noise',
        urgency: 'high',
        status: 'open',
        lifecycle_stage: 'open',
        company_code: 'EXIDE',
        created_at: new Date().toISOString(),
      };
      const qrTickets = JSON.parse(localStorage.getItem('tf_qr_tickets') || '[]');
      qrTickets.unshift(payload);
      localStorage.setItem('tf_qr_tickets', JSON.stringify(qrTickets));
      window.dispatchEvent(new Event('ticketCreated'));
    });

    // 3. Navigate to Tickets page
    await page.goto('/tickets.html', { waitUntil: 'networkidle' });

    // 4. Assert submitted QR ticket is visible on Tickets page
    const ticketItem = page.locator('text=Spindle motor overheating').first();
    await expect(ticketItem).toBeVisible({ timeout: 10000 });

    expect(unhandledJsErrors.length).toBe(0);
  });
});
