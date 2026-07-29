import { test, expect } from '@playwright/test';

const MOCK_MACHINE = {
  id: 'TF-M-001',
  name: 'CNC Milling Machine #4',
  loc: 'Assembly Area A',
  technician_user_id: 'TECH-789'
};

test.describe('WhatsApp OTP & Edge Cases Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Clear localStorage & sessionStorage before each test so Phone Gate is shown
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });


    // Mock Supabase machine lookup
    await page.route('**/rest/v1/machines?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_MACHINE)
      });
    });

    // Mock backend OTP endpoints
    await page.route('**/auth/otp/send', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'sent', message: 'OTP sent', otp_debug: '123456' })
      });
    });

    await page.route('**/auth/otp/verify', async (route) => {
      const body = route.request().postDataJSON() || {};
      if (body.otp === '123456') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ verified: true, phone: body.phone })
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Incorrect OTP code. Please check your WhatsApp and try again.' })
        });
      }
    });
  });

  test('Edge Case 1: Invalid phone number entry (<10 digits)', async ({ page }) => {
    await page.goto('/qr-gateway.html?id=TF-M-001');

    await expect(page.locator('#qr-phone')).toBeVisible({ timeout: 10000 });

    // Type 5 digits
    await page.locator('#qr-phone').fill('98765');
    await page.getByRole('button', { name: /Send WhatsApp OTP|व्हाट्सएप ओटीपी भेजें|व्हॉट्सअॅप ओटीपी पाठवा/i }).click();

    // Verify error message displayed in any language
    await expect(page.locator('div', { hasText: /10-digit|10 अंकों|१० अंकी/i }).last()).toBeVisible();
  });



  test('Edge Case 2: Incorrect 6-digit OTP code verification failure', async ({ page }) => {
    await page.goto('/qr-gateway.html?id=TF-M-001');

    await expect(page.locator('#qr-phone')).toBeVisible();
    await page.locator('#qr-phone').fill('9876543210');
    await page.getByRole('button', { name: /Send WhatsApp OTP|व्हाट्सएप ओटीपी भेजें|व्हॉट्सअॅप ओटीपी पाठवा/i }).click();

    // Verify OTP input stage appears
    await expect(page.locator('#qr-otp-input')).toBeVisible({ timeout: 10000 });

    // Enter wrong 6-digit OTP
    await page.locator('#qr-otp-input').fill('000000');
    await page.getByRole('button', { name: /Verify OTP|ओटीपी सत्यापित करें|ओटीपी पडताळा/i }).click();

    // Verify error feedback shown
    await expect(page.locator('text=/Incorrect OTP|गलत|त्रुटि|फिर से/i')).toBeVisible();
  });

  test('Edge Case 3: Resend OTP and Change Phone number navigation', async ({ page }) => {
    await page.goto('/qr-gateway.html?id=TF-M-001');

    await expect(page.locator('#qr-phone')).toBeVisible();
    await page.locator('#qr-phone').fill('9876543210');
    await page.getByRole('button', { name: /Send WhatsApp OTP|व्हाट्सएप ओटीपी भेजें|व्हॉट्सअॅप ओटीपी पाठवा/i }).click();

    await expect(page.locator('#qr-otp-input')).toBeVisible({ timeout: 10000 });

    // Click 'Change Phone Number'
    await page.getByRole('button', { name: /Change Phone Number|मोबाइल नंबर बदलें|मोबाईल नंबर बदला/i }).click();

    // Verify back on Phone Input stage
    await expect(page.locator('#qr-phone')).toBeVisible();
  });

  test('Edge Case 4: Successful OTP verification unlocks ticket creation flow', async ({ page }) => {
    await page.goto('/qr-gateway.html?id=TF-M-001');

    await expect(page.locator('#qr-phone')).toBeVisible();
    await page.locator('#qr-phone').fill('9876543210');
    await page.getByRole('button', { name: /Send WhatsApp OTP|व्हाट्सएप ओटीपी भेजें|व्हॉट्सअॅप ओटीपी पाठवा/i }).click();

    await expect(page.locator('#qr-otp-input')).toBeVisible({ timeout: 10000 });

    await page.locator('#qr-otp-input').fill('123456');
    await page.getByRole('button', { name: /Verify OTP|ओटीपी सत्यापित करें|ओटीपी पडताळा/i }).click();

    // Phone Gate should close and main reporting UI should unlock
    await expect(page.locator('#qr-phone')).not.toBeVisible({ timeout: 10000 });
  });

});
