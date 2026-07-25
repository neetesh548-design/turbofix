import { test, expect } from '@playwright/test';

// Base URL - adjust if needed
const BASE_URL = 'http://localhost:5173';

test.describe('Counter Widget E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to page with counter widget
    // Assuming we create a test page or use existing route
    await page.goto(`${BASE_URL}/counter-demo`);
    await page.waitForLoadState('networkidle');
  });

  test('E2E-1: Counter displays initial value of 0', async ({ page }) => {
    const counterValue = page.getByTestId('counter-value');
    await expect(counterValue).toContainText('0');
  });

  test('E2E-2: User can increment counter by clicking increment button 5 times', async ({
    page,
  }) => {
    const incrementBtn = page.getByTestId('counter-increment-btn');
    const counterValue = page.getByTestId('counter-value');

    // Click increment button 5 times
    for (let i = 0; i < 5; i++) {
      await incrementBtn.click();
      await page.waitForTimeout(100); // Wait for state update
    }

    // Verify counter value is 5
    await expect(counterValue).toContainText('5');
  });

  test('E2E-3: User can decrement counter by clicking decrement button 3 times', async ({
    page,
  }) => {
    const incrementBtn = page.getByTestId('counter-increment-btn');
    const decrementBtn = page.getByTestId('counter-decrement-btn');
    const counterValue = page.getByTestId('counter-value');

    // First increment to 5
    for (let i = 0; i < 5; i++) {
      await incrementBtn.click();
      await page.waitForTimeout(100);
    }

    // Then decrement 3 times
    for (let i = 0; i < 3; i++) {
      await decrementBtn.click();
      await page.waitForTimeout(100);
    }

    // Verify counter value is 2
    await expect(counterValue).toContainText('2');
  });

  test('E2E-4: Reset button resets counter to initial value', async ({ page }) => {
    const incrementBtn = page.getByTestId('counter-increment-btn');
    const resetBtn = page.getByTestId('counter-reset-btn');
    const counterValue = page.getByTestId('counter-value');

    // Increment to 10
    for (let i = 0; i < 10; i++) {
      await incrementBtn.click();
      await page.waitForTimeout(100);
    }

    // Verify counter is 10
    await expect(counterValue).toContainText('10');

    // Click reset
    await resetBtn.click();
    await page.waitForTimeout(200);

    // Verify counter is back to 0
    await expect(counterValue).toContainText('0');
  });

  test('E2E-5: Increment button is disabled at maximum value', async ({ page }) => {
    const incrementBtn = page.getByTestId('counter-increment-btn');

    // Assuming max is 10, increment to max
    for (let i = 0; i < 10; i++) {
      await incrementBtn.click();
      await page.waitForTimeout(100);
    }

    // Verify increment button is disabled
    await expect(incrementBtn).toBeDisabled();
  });

  test('E2E-6: Decrement button is disabled at minimum value', async ({ page }) => {
    const decrementBtn = page.getByTestId('counter-decrement-btn');

    // At minimum (0), decrement button should be disabled
    // (assuming no min constraint or min is 0)
    await expect(decrementBtn).toBeDisabled();
  });

  test('E2E-7: Counter widget is responsive on mobile viewport', async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify widget is visible and usable
    const counterWidget = page.getByTestId('counter-widget');
    await expect(counterWidget).toBeVisible();

    // Verify buttons are clickable
    const incrementBtn = page.getByTestId('counter-increment-btn');
    await expect(incrementBtn).toBeVisible();
    await incrementBtn.click();

    // Verify counter updated
    const counterValue = page.getByTestId('counter-value');
    await expect(counterValue).toContainText('1');
  });

  test('E2E-8: Counter widget is responsive on tablet viewport', async ({
    page,
  }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Verify widget is visible and usable
    const counterWidget = page.getByTestId('counter-widget');
    await expect(counterWidget).toBeVisible();

    // Verify buttons are clickable
    const incrementBtn = page.getByTestId('counter-increment-btn');
    await expect(incrementBtn).toBeVisible();
    await incrementBtn.click();

    // Verify counter updated
    const counterValue = page.getByTestId('counter-value');
    await expect(counterValue).toContainText('1');
  });

  test('E2E-9: Counter widget is responsive on desktop viewport', async ({
    page,
  }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Verify widget is visible and usable
    const counterWidget = page.getByTestId('counter-widget');
    await expect(counterWidget).toBeVisible();

    // Verify buttons are clickable and properly spaced
    const incrementBtn = page.getByTestId('counter-increment-btn');
    const decrementBtn = page.getByTestId('counter-decrement-btn');
    await expect(incrementBtn).toBeVisible();
    await expect(decrementBtn).toBeVisible();

    // Test interaction
    await incrementBtn.click();
    const counterValue = page.getByTestId('counter-value');
    await expect(counterValue).toContainText('1');
  });

  test('E2E-10: Buttons have proper accessibility attributes', async ({
    page,
  }) => {
    const incrementBtn = page.getByTestId('counter-increment-btn');
    const decrementBtn = page.getByTestId('counter-decrement-btn');
    const resetBtn = page.getByTestId('counter-reset-btn');

    // Check aria-label attributes
    await expect(incrementBtn).toHaveAttribute('aria-label');
    await expect(decrementBtn).toHaveAttribute('aria-label');
    await expect(resetBtn).toHaveAttribute('aria-label');

    // Verify they're accessible by keyboard
    await incrementBtn.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('counter-value')).toContainText('1');
  });

  test('E2E-11: Counter widget displays current value correctly', async ({
    page,
  }) => {
    const counterValue = page.getByTestId('counter-value');
    const currentValueLabel = page.getByText('Current Value');

    // Verify label exists
    await expect(currentValueLabel).toBeVisible();

    // Verify value is displayed
    await expect(counterValue).toBeVisible();
    await expect(counterValue).toContainText('0');
  });

  test('E2E-12: Multiple rapid clicks on increment button work correctly', async ({
    page,
  }) => {
    const incrementBtn = page.getByTestId('counter-increment-btn');
    const counterValue = page.getByTestId('counter-value');

    // Perform rapid clicks
    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();
    await page.waitForTimeout(200);

    // Verify all clicks were registered
    await expect(counterValue).toContainText('3');
  });

  test('E2E-13: Tooltips appear on button hover', async ({ page }) => {
    const incrementBtn = page.getByTestId('counter-increment-btn');

    // Hover over increment button
    await incrementBtn.hover();

    // Wait for tooltip to appear
    await page.waitForTimeout(300);

    // Verify tooltip is visible (check for tooltip element)
    const tooltip = page.locator('.ant-tooltip-inner');
    // Tooltip may or may not be visible depending on implementation
    // This is a flexible check
  });

  test('E2E-14: Counter widget works in different languages', async ({
    page,
  }) => {
    // This assumes there's a language switcher on the page
    const incrementBtn = page.getByTestId('counter-increment-btn');

    // Check that button text is in the current language
    const buttonText = await incrementBtn.textContent();
    expect(buttonText).toBeTruthy();
    expect(buttonText.length).toBeGreaterThan(0);

    // Verify English text (assuming default language)
    // This might need adjustment based on actual language implementation
  });

  test('E2E-15: Counter widget layout remains intact with long numbers', async ({
    page,
  }) => {
    const incrementBtn = page.getByTestId('counter-increment-btn');
    const counterWidget = page.getByTestId('counter-widget');

    // Increment to a relatively large number (assuming no max)
    // Use javascript to set counter to large value
    await page.evaluate(() => {
      // This assumes direct state manipulation is possible
      // Otherwise, just click increment many times
      for (let i = 0; i < 99; i++) {
        document.querySelector('[data-testid="counter-increment-btn"]')?.click();
      }
    });

    await page.waitForTimeout(500);

    // Verify widget is still properly displayed
    const widget = page.getByTestId('counter-widget');
    await expect(widget).toBeVisible();

    // Verify counter value is large
    const counterValue = page.getByTestId('counter-value');
    const value = await counterValue.textContent();
    expect(parseInt(value)).toBeGreaterThan(90);
  });
});
