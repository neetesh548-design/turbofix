import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

// Public marketing/landing surface — see src/App.jsx MainLayoutRoute block.
const MARKETING_PAGES = [
  { name: 'home', route: '/' },
  { name: 'why-turbofix', route: '/why-turbofix.html' },
  { name: 'platform', route: '/platform.html' },
  { name: 'platform-experience', route: '/platform-experience.html' },
  { name: 'records-platform', route: '/records-platform.html' },
  { name: 'workflow', route: '/workflow.html' },
  { name: 'demo', route: '/demo.html' },
  { name: 'pricing', route: '/pricing.html' },
  { name: 'contact', route: '/contact.html' },
];

const OUT_DIR = path.join(process.cwd(), 'tests/ux-audit/marketing-audit-output');
const RESULTS_FILE = path.join(OUT_DIR, 'results.jsonl');

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // NOTE: do NOT truncate here — beforeAll re-fires per Playwright project
  // (chromium, mobile-chrome, ...) within the same worker, and truncating
  // would wipe results from a project that already ran. Truncate the file
  // once from the shell before invoking `playwright test` instead.
  if (!fs.existsSync(RESULTS_FILE)) fs.writeFileSync(RESULTS_FILE, '');
});

function appendResult(entry: Record<string, unknown>) {
  fs.appendFileSync(RESULTS_FILE, JSON.stringify(entry) + '\n');
}

for (const { name, route } of MARKETING_PAGES) {
  test.describe(`Marketing UI audit: ${name} (${route})`, () => {
    test(`${name} — screenshot + structural checks`, async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(String(err)));

      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(400); // let CSS transitions/lazy images settle

      const projectName = testInfo.project.name;
      const screenshotPath = path.join(OUT_DIR, `${name}-${projectName}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Horizontal overflow (common budget-device symptom)
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      const horizontalOverflowPx = Math.max(0, scrollWidth - clientWidth);

      // Broken images (src set, but failed to load)
      const brokenImages = await page.evaluate(() =>
        Array.from(document.querySelectorAll('img'))
          .filter((img) => img.src && img.complete && img.naturalWidth === 0)
          .map((img) => img.src)
      );

      // Images missing alt text (excluding aria-hidden decorative ones)
      const imagesMissingAlt = await page.evaluate(() =>
        Array.from(document.querySelectorAll('img'))
          .filter((img) => img.getAttribute('aria-hidden') !== 'true' && img.getAttribute('alt') === null)
          .map((img) => img.src)
      );

      // Heading structure
      const h1Count = await page.locator('h1').count();

      // Tap-target size check (mobile project only) — flags interactive elements under 40x40
      let smallTapTargets: string[] = [];
      if (projectName.includes('mobile')) {
        smallTapTargets = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('a, button, [role="button"], input, select'));
          return els
            .filter((el) => {
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0) return false;
              return (r.width < 40 || r.height < 40);
            })
            .slice(0, 15)
            .map((el) => {
              const r = el.getBoundingClientRect();
              const label = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('href') || '').trim().slice(0, 40);
              return `${el.tagName.toLowerCase()} "${label}" (${Math.round(r.width)}x${Math.round(r.height)})`;
            });
        });
      }

      appendResult({
        page: name,
        route,
        project: projectName,
        screenshot: screenshotPath,
        h1Count,
        horizontalOverflowPx,
        brokenImages,
        imagesMissingAlt,
        smallTapTargets,
        consoleErrors,
        pageErrors,
      });

      expect(h1Count, `${name} (${projectName}) should have exactly one h1`).toBe(1);
      expect(brokenImages, `${name} (${projectName}) has broken images`).toEqual([]);
    });

    test(`${name} — accessibility (axe-core)`, async ({ page }, testInfo) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      appendResult({
        page: name,
        route,
        project: testInfo.project.name,
        type: 'a11y',
        violations: results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
          targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
        })),
      });

      // Soft-fail: record but don't abort the whole suite on a11y issues —
      // we want the full report across all pages, not a stop at the first violation.
      testInfo.annotations.push({
        type: 'a11y-violations',
        description: `${results.violations.length} violation type(s)`,
      });
    });
  });
}
