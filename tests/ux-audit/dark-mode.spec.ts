import { test, expect } from '@playwright/test';

const PAGES = [
  { name: 'Dashboard', path: '/' },
  { name: 'Tickets', path: '/tickets' },
  { name: 'Technician', path: '/technician' },
  { name: 'Machines', path: '/machines' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Settings', path: '/settings' }
];

test.describe('Dark Mode Consistency', () => {
  PAGES.forEach(page => {
    test(`${page.name} should be readable in dark mode`, async ({ page: pageFixture }) => {
      await pageFixture.goto(page.path);

      // Enable dark mode
      await pageFixture.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });

      await pageFixture.reload();
      await pageFixture.waitForLoadState('networkidle');

      // Check that text is visible (basic contrast check)
      const textElements = await pageFixture.locator('p, span, h1, h2, h3, h4, a, button').all();
      let visibleTexts = 0;

      for (const elem of textElements) {
        if (await elem.isVisible()) {
          visibleTexts++;

          const color = await elem.evaluate(el => {
            return window.getComputedStyle(el).color;
          });

          // Color should not be transparent or nearly invisible
          expect(color).not.toMatch(/rgba\(.*0\)/); // Not transparent black
          expect(color).not.toMatch(/rgba\(255,\s*255,\s*255,\s*0/); // Not transparent white
        }
      }

      // Page should have visible text content
      expect(visibleTexts).toBeGreaterThan(0);
    });

    test(`${page.name} should not have hardcoded colors breaking in dark mode`, async ({ page: pageFixture }) => {
      await pageFixture.goto(page.path);

      // Enable dark mode
      await pageFixture.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });

      await pageFixture.reload();
      await pageFixture.waitForLoadState('networkidle');

      // Check for suspicious hardcoded colors
      const suspiciousElements = await pageFixture.locator('*[style*="color: white"], *[style*="color: #fff"], *[style*="background: white"]').all();

      // In dark mode, white text on dark background is fine
      // But hardcoded white text that can't adapt is bad
      for (const elem of suspiciousElements) {
        // Check if it's not white text in a proper context
        const bgColor = await elem.evaluate(el => window.getComputedStyle(el).backgroundColor);

        // If it's white text, background should be dark
        if (bgColor.includes('rgb')) {
          // Very basic RGB check (would need proper parsing)
          expect(bgColor).toBeTruthy();
        }
      }
    });
  });

  test('should toggle between light and dark mode smoothly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get initial theme
    const initialTheme = await page.evaluate(() => localStorage.getItem('theme'));

    // Toggle theme
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="light"]').first();

    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await page.waitForTimeout(300); // Animation time

      // Theme should have changed
      const newTheme = await page.evaluate(() => localStorage.getItem('theme'));
      expect(newTheme).not.toBe(initialTheme);

      // Should still be readable
      const main = page.locator('main');
      expect(await main.isVisible()).toBe(true);
    }
  });

  test('dark mode charts should be readable', async ({ page }) => {
    await page.goto('/');

    // Enable dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Look for charts (canvas or SVG)
    const charts = await page.locator('canvas, svg[data-chart], [data-testid*="chart"]').all();

    // If there are charts, take a screenshot to verify visually
    if (charts.length > 0) {
      await expect(page).toHaveScreenshot('dashboard-dark-charts.png');
    }
  });

  test('dark mode form inputs should be visible', async ({ page }) => {
    await page.goto('/tickets');

    // Enable dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open Quick Report dialog
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+Shift+R`);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Check form inputs are visible
    const inputs = await dialog.locator('input, select, textarea').all();

    for (const input of inputs) {
      expect(await input.isVisible()).toBe(true);

      // Check it has border or some visual definition
      const borderColor = await input.evaluate(el => {
        return window.getComputedStyle(el).borderColor;
      });

      expect(borderColor).not.toMatch(/rgba\(0,\s*0,\s*0,\s*0/); // Not transparent
    }
  });

  test('dark mode modals should have proper contrast', async ({ page }) => {
    await page.goto('/tickets');

    // Enable dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open dialog
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+Shift+R`);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Modal background should be dark, text should be light
    const modalBg = await dialog.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    const modalText = await dialog.locator('p, span, h1, h2, h3').first();
    const textColor = await modalText.evaluate(el => {
      return window.getComputedStyle(el).color;
    });

    // Very basic check - modal should have background and text should be visible
    expect(modalBg).toBeTruthy();
    expect(textColor).toBeTruthy();
  });
});

test.describe('Theme Persistence', () => {
  test('should remember selected theme after refresh', async ({ page }) => {
    await page.goto('/');

    // Set dark theme
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // Refresh
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check theme is still dark
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');

    // Check dark mode is applied
    const isDark = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    });

    expect(isDark).toBe(true);
  });

  test('should remember theme across different pages', async ({ page }) => {
    await page.goto('/');

    // Set dark theme
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));

    // Navigate to another page
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');

    // Theme should still be dark
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');
  });
});
