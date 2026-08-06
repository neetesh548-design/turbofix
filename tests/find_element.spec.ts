import { test, expect } from '@playwright/test';

test('find cutoff text', async ({ page }) => {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  const element = page.locator('text=/TurboFix Technologies helps/i').first();
  console.log(await element.evaluate((el) => {
    return {
      tagName: el.tagName,
      className: el.className,
      style: el.getAttribute('style'),
      text: el.textContent,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      cssText: window.getComputedStyle(el).cssText
    };
  }));
});
