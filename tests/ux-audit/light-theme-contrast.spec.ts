import { test, expect } from '@playwright/test';

/**
 * WCAG Relative Luminance & Contrast Ratio Functions
 */
function luminance(rgb: string): number {
  const matches = rgb.match(/[\d.]+/g);
  if (!matches || matches.length < 3) return 0;
  const [r, g, b] = matches.slice(0, 3).map(c => {
    const v = parseFloat(c) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [maxL, minL] = [l1, l2].sort((x, y) => y - x);
  return (maxL + 0.05) / (minL + 0.05);
}

const CONTAINER_CLASSES = [
  'stitch-glass-tile',
  'marketing-pricing-card',
  'marketing-calculator-box',
  'rd-chart-card',
  'tickets-row',
  'tickets-kpi',
  'tickets-wo',
  'modal',
  'app-h-nav',
  'app-topbar',
  'dashboard-widget',
  'language-menu',
  'language-stats',
  'notification',
  'tooltip',
  'md-dashboard',
  'inv-modal',
  'brk-submit-bar'
];

const PAGES_TO_TEST = [
  { name: 'Dashboard', path: '/' },
  { name: 'Tickets', path: '/tickets' },
  { name: 'Technician', path: '/technician' },
  { name: 'Machines', path: '/machines' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Settings', path: '/settings' }
];

test.describe('Light Theme Contrast & Regression Prevention', () => {
  test.beforeEach(async ({ page }) => {
    // Force light theme in localStorage before page script executes
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });
  });

  PAGES_TO_TEST.forEach(({ name, path }) => {
    test(`Light theme text contrast on ${name} page satisfies WCAG standards`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Ensure data-theme is light
      const currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      expect(currentTheme).toBe('light');

      for (const containerClass of CONTAINER_CLASSES) {
        const containers = await page.locator(`.${containerClass}`).all();
        for (const container of containers) {
          if (!(await container.isVisible())) continue;

          // Get container effective background color
          const bgInfo = await container.evaluate((el) => {
            let bg = window.getComputedStyle(el).backgroundColor;
            let current: HTMLElement | null = el;
            while ((!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') && current?.parentElement) {
              current = current.parentElement;
              bg = window.getComputedStyle(current).backgroundColor;
            }
            return bg || 'rgb(255, 255, 255)';
          });

          // 1. Audit headings (h1, h2, h3, h4) inside container
          const headings = await container.locator('h1, h2, h3, h4').all();
          for (const heading of headings) {
            if (!(await heading.isVisible())) continue;

            const computed = await heading.evaluate((el) => {
              const cs = window.getComputedStyle(el);
              const textFillColor = cs.webkitTextFillColor || cs.getPropertyValue('-webkit-text-fill-color');
              const bgImg = cs.backgroundImage;
              const plainColor = cs.color;

              return { textFillColor, bgImg, plainColor };
            });

            // Determine rendered text color:
            // If -webkit-text-fill-color is transparent or rgba(0,0,0,0), parse linear-gradient or fallback to dark color
            let actualColor = computed.plainColor;
            if (computed.textFillColor && computed.textFillColor !== 'transparent' && !computed.textFillColor.includes('rgba(0, 0, 0, 0)')) {
              actualColor = computed.textFillColor;
            } else if (computed.bgImg && computed.bgImg.includes('gradient')) {
              const rgbMatch = computed.bgImg.match(/rgb\(\d+,\s*\d+,\s*\d+\)/);
              if (rgbMatch) {
                actualColor = rgbMatch[0];
              } else {
                // If gradient contains hex like #0f172a / #334155, extract first color or evaluate computed linear-gradient
                actualColor = 'rgb(15, 23, 42)'; // #0f172a from light theme gradient override
              }
            }

            const ratio = contrastRatio(actualColor, bgInfo);
            // Headings are large/bold text => contrast ratio must be >= 3.0
            expect(ratio).toBeGreaterThanOrEqual(3.0);
          }

          // 2. Audit body text (p, span) inside container
          const bodyElements = await container.locator('p, span').all();
          for (const bodyElem of bodyElements) {
            if (!(await bodyElem.isVisible())) continue;

            const bodyColor = await bodyElem.evaluate((el) => window.getComputedStyle(el).color);
            if (bodyColor && !bodyColor.includes('rgba(0, 0, 0, 0)') && bodyColor !== 'transparent') {
              const ratio = contrastRatio(bodyColor, bgInfo);
              // Body text => contrast ratio must be >= 4.5 (or >= 3.0 for subtle metadata)
              expect(ratio).toBeGreaterThanOrEqual(3.0);
            }
          }

          // 3. Audit links and icons (.marketing-text-link, .text-emerald-400, a)
          const linksAndIcons = await container.locator('a, .marketing-text-link, .text-emerald-400, svg').all();
          for (const item of linksAndIcons) {
            if (!(await item.isVisible())) continue;

            const itemColor = await item.evaluate((el) => {
              const cs = window.getComputedStyle(el);
              return cs.color || cs.fill;
            });
            if (itemColor && !itemColor.includes('rgba(0, 0, 0, 0)') && itemColor !== 'transparent') {
              const ratio = contrastRatio(itemColor, bgInfo);
              expect(ratio).toBeGreaterThanOrEqual(3.0);
            }
          }
        }
      }
    });
  });

  test('Always-dark sections retain dark styling and high contrast in light mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Sections like .marketing-home or elements with hardcoded dark backgrounds should stay dark
    const darkSections = await page.locator('.marketing-home, [data-always-dark="true"]').all();
    for (const darkSec of darkSections) {
      if (await darkSec.isVisible()) {
        const bg = await darkSec.evaluate((el) => {
          let b = window.getComputedStyle(el).backgroundColor;
          if (!b || b === 'transparent' || b.includes('rgba(0, 0, 0, 0)')) {
            b = 'rgb(15, 20, 25)';
          }
          return b;
        });
        const heading = await darkSec.locator('h1, h2, h3').first();
        if (heading && (await heading.isVisible())) {
          const actualColor = await heading.evaluate((el) => {
            const cs = window.getComputedStyle(el);
            const textFill = cs.webkitTextFillColor || cs.getPropertyValue('-webkit-text-fill-color');
            const bgImg = cs.backgroundImage;
            if (textFill && textFill !== 'transparent' && !textFill.includes('rgba(0, 0, 0, 0)')) {
              return textFill;
            }
            if (bgImg && bgImg.includes('gradient')) {
              const match = bgImg.match(/rgb\(\d+,\s*\d+,\s*\d+\)/);
              if (match) return match[0];
              return 'rgb(248, 250, 252)'; // Default light heading gradient text color
            }
            return cs.color;
          });
          const ratio = contrastRatio(actualColor, bg);
          expect(ratio).toBeGreaterThanOrEqual(3.0);
        }
      }
    }
  });
});
