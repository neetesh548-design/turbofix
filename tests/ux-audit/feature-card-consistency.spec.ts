import { test, expect, type Page } from '@playwright/test';

/**
 * Guards against the exact drift a code review caught once already: the
 * "icon + title + body" feature-card pattern (src/components/marketing/FeatureCard.jsx)
 * used on Home, Platform, and WhyTurboFix silently forked into two different
 * visual identities before it was extracted into one shared component. These
 * pages don't share a data source, so nothing else would catch a future
 * one-off override at a call site.
 *
 * Also guards the light-theme legibility bug the pixel baseline caught:
 * headings, body copy, and CTA links were all still tuned for the dark-theme
 * card background and went near-invisible once light theme flipped the card
 * to white. The geometry checks below wouldn't have caught that — a future
 * regression there needs a color-contrast assertion, not a padding one.
 */

const PAGES_WITH_CARDS = [
  { name: 'Home', path: '/', minCount: 6 },
  { name: 'Platform', path: '/platform.html', minCount: 6 },
  { name: 'WhyTurboFix', path: '/why-turbofix.html', minCount: 2 },
];

async function cardStyles(page: Page) {
  const cards = page.locator('[data-testid="feature-card"]');
  await cards.first().waitFor({ state: 'attached' });
  const count = await cards.count();
  const styles = [];
  for (let i = 0; i < count; i += 1) {
    const card = cards.nth(i);
    styles.push(
      await card.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          padding: s.padding,
          borderRadius: s.borderRadius,
          transitionProperty: s.transitionProperty,
          backgroundColor: s.backgroundColor,
          borderColor: s.borderTopColor,
        };
      }),
    );
  }
  return { count, styles };
}

/** Relative luminance (WCAG 2.x) from an rgb()/rgba() computed-style string. */
function luminance(rgb: string): number {
  const match = rgb.match(/[\d.]+/g);
  if (!match) return 0;
  const [r, g, b] = match.slice(0, 3).map((c) => {
    const v = Number(c) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

async function setLightTheme(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('tf_theme', 'light');
  });
}

test.describe('Feature card design-system consistency', () => {
  for (const { name, path, minCount } of PAGES_WITH_CARDS) {
    test(`${name} renders at least ${minCount} feature cards`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const { count } = await cardStyles(page);
      expect(count).toBeGreaterThanOrEqual(minCount);
    });
  }

  test('every feature card across every page shares identical geometry and color', async ({ page }) => {
    const allStyles: Array<{ page: string } & Record<string, string>> = [];

    for (const { name, path } of PAGES_WITH_CARDS) {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(300);
      const { styles } = await cardStyles(page);
      styles.forEach((s) => allStyles.push({ page: name, ...s }));
    }

    expect(allStyles.length).toBeGreaterThan(0);

    const reference = allStyles[0];
    for (const style of allStyles) {
      for (const key of ['padding', 'borderRadius', 'transitionProperty', 'backgroundColor', 'borderColor'] as const) {
        expect(style[key], `${key} mismatch on ${style.page} vs ${reference.page}`).toBe(reference[key]);
      }
    }
  });

  test('Home feature-card grid — pixel baseline', async ({ page }, testInfo) => {
    // Only a darwin baseline is committed (generated locally); Playwright keys
    // snapshots by platform, so this would fail on first run in Linux CI with
    // no baseline to compare against rather than a real regression. Geometry
    // and contrast are covered platform-independently by the other tests here.
    test.skip(process.platform !== 'darwin', 'Baseline only generated for darwin so far');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const grid = page.locator('[data-testid="feature-card"]').first().locator('xpath=..');
    await expect(grid).toHaveScreenshot('home-feature-card-grid.png', { maxDiffPixels: 100 });
  });

  test.describe('Light theme legibility', () => {
    for (const { name, path } of PAGES_WITH_CARDS) {
      test(`${name} — card title, body, and CTA meet contrast minimums against the card background`, async ({ page }) => {
        await setLightTheme(page);
        await page.goto(path);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(300);

        const card = page.locator('[data-testid="feature-card"]').first();
        await card.waitFor({ state: 'attached' });

        const measurements = await card.evaluate((el) => {
          const cardBg = getComputedStyle(el).backgroundColor;
          const readColor = (node: Element | null) => {
            if (!node) return null;
            const s = getComputedStyle(node);
            // The dark-theme default paints heading glyphs via a transparent
            // fill + background-clip gradient, not `color` — read whichever
            // one is actually doing the painting.
            if (s.webkitTextFillColor && s.webkitTextFillColor !== 'rgba(0, 0, 0, 0)') {
              return s.webkitTextFillColor;
            }
            const gradientMatch = s.backgroundImage.match(/rgb\([^)]+\)/g);
            if (gradientMatch && gradientMatch.length) return gradientMatch[0];
            return s.color;
          };
          return {
            cardBg,
            title: readColor(el.querySelector('h3')),
            body: readColor(el.querySelector('p')),
            cta: readColor(el.querySelector('.marketing-text-link')),
          };
        });

        // AA for normal text is 4.5:1; icons/large text/UI components are 3:1.
        // Title uses a large/bold face, so 3:1 is the applicable floor there.
        expect(
          contrastRatio(measurements.title!, measurements.cardBg),
          `title ${measurements.title} vs card ${measurements.cardBg}`,
        ).toBeGreaterThanOrEqual(3);
        expect(
          contrastRatio(measurements.body!, measurements.cardBg),
          `body ${measurements.body} vs card ${measurements.cardBg}`,
        ).toBeGreaterThanOrEqual(4.5);
        if (measurements.cta) {
          expect(
            contrastRatio(measurements.cta, measurements.cardBg),
            `cta ${measurements.cta} vs card ${measurements.cardBg}`,
          ).toBeGreaterThanOrEqual(3);
        }
      });
    }
  });
});
