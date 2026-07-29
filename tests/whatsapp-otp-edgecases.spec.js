import { test, expect } from '@playwright/test';

test.describe('WhatsApp OTP & Edge Cases Verification', () => {

  test('Edge Case 1: Invalid phone number entry (<10 digits)', async ({ page }) => {
    await page.goto('/qr-gateway.html?id=TF-M-001');

    // Wait for Phone Gate UI
    await expect(page.locator('#qr-phone')).toBeVisible({ timeout: 10000 });

    // Type 5 digits
    await page.locator('#qr-phone').fill('98765');
    await page.getByRole('button', { name: /Send WhatsApp OTP|व्हाट्सएप ओटीपी भेजें|व्हॉट्सअॅप ओटीपी पाठवा/i }).click();

    // Verify error message displayed in any language
    await expect(page.locator('text=/10-digit|10 अंकों|१० अंकी/i')).toBeVisible();
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

    // Check if demo preview OTP is rendered or use test fallback 123456
    const demoBadge = page.locator('text=Demo OTP Preview:');
    let otpCode = '123456';
    if (await demoBadge.isVisible()) {
      const text = await demoBadge.innerText();
      otpCode = text.replace(/\D/g, '');
    }

    await page.locator('#qr-otp-input').fill(otpCode);
    await page.getByRole('button', { name: /Verify OTP|ओटीपी सत्यापित करें|ओटीपी पडताळा/i }).click();

    // Phone Gate should close and main reporting UI should unlock
    await expect(page.locator('#qr-phone')).not.toBeVisible({ timeout: 10000 });
  });

});
