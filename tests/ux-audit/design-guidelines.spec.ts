import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: 'ux-audit' })).toString('base64');
const FAKE_JWT = `${header}.${payload}.fake-signature`;

const OPERATIONAL_PAGES = [
  '/dashboard.html',
  '/tickets.html',
  '/technician.html',
  '/machines.html',
  '/inventory.html',
  '/records.html',
  '/settings.html',
];

async function signIn(page: Page, role: string) {
  await page.addInitScript(({ token, userRole }) => {
    window.localStorage.setItem('tf_token', token);
    window.localStorage.setItem('tf_user', JSON.stringify({
      user_id: 'ux-audit-owner',
      name: 'UX Audit Owner',
      role: userRole,
      company_code: 'PUNE-PLANT-01',
    }));
  }, { token: FAKE_JWT, userRole: role });
}

async function openOperationalPage(page: Page, path: string) {
  await signIn(page, path === '/technician.html' ? 'maintenance_technician' : 'owner');
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
}

test.describe('TurboFix design guideline guardrails', () => {
  test('each operational page has one page title and no skipped heading levels', async ({ page }) => {
    for (const path of OPERATIONAL_PAGES) {
      await openOperationalPage(page, path);

      const headings = await page.locator('main h1, main h2, main h3, main h4, main h5, main h6')
        .evaluateAll(elements => elements.map(element => ({
          level: Number(element.tagName.slice(1)),
          text: element.textContent?.trim() || '(untitled)',
        })));

      expect(headings.filter(({ level }) => level === 1), `${path} page titles`).toHaveLength(1);
      expect(headings[0]?.level, `${path} first heading`).toBe(1);

      for (let index = 1; index < headings.length; index += 1) {
        expect(
          headings[index].level - headings[index - 1].level,
          `${path}: "${headings[index - 1].text}" to "${headings[index].text}"`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  test('visible form controls have an accessible label', async ({ page }) => {
    for (const path of OPERATIONAL_PAGES) {
      await openOperationalPage(page, path);

      const unlabeled = await page.locator(
        'main input:not([type="hidden"]):visible, main select:visible, main textarea:visible',
      ).evaluateAll(controls => controls.flatMap((control, index) => {
        const element = control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        const labelledBy = element.getAttribute('aria-labelledby');
        const hasLabelledBy = Boolean(
          labelledBy?.split(/\s+/).some(id => id && document.getElementById(id)),
        );
        const exemptInput = element instanceof HTMLInputElement
          && ['button', 'image', 'reset', 'submit'].includes(element.type);

        if (
          exemptInput
          || element.labels?.length
          || element.getAttribute('aria-label')?.trim()
          || hasLabelledBy
        ) return [];

        return [`${element.tagName.toLowerCase()}#${element.id || index}`];
      }));

      expect(unlabeled, `${path} unlabeled controls`).toEqual([]);
    }
  });

  test('status dots are decorative or accompanied by readable status text', async ({ page }) => {
    for (const path of OPERATIONAL_PAGES) {
      await openOperationalPage(page, path);

      const unlabeled = await page.locator(
        'main .status-dot, main .md-dot, main .inv-status-dot, main .glow-dot',
      ).evaluateAll(dots => dots.flatMap((dot, index) => {
        if (dot.getAttribute('aria-hidden') === 'true') return [];
        if (dot.getAttribute('aria-label')?.trim()) return [];

        const readableText = dot.parentElement?.textContent?.trim();
        return readableText ? [] : [`${dot.className || 'status-dot'}#${index}`];
      }));

      expect(unlabeled, `${path} color-only status indicators`).toEqual([]);
    }
  });

  test('operational pages do not scroll sideways on a one-handed phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const path of OPERATIONAL_PAGES) {
      await openOperationalPage(page, path);
      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        offenders: Array.from(document.querySelectorAll('body *')).flatMap(element => {
          const rect = element.getBoundingClientRect();
          return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1
            ? [`${element.tagName.toLowerCase()}.${String(element.className).split(/\s+/).join('.')}`]
            : [];
        }).slice(0, 8),
      }));

      expect(overflow.scrollWidth, `${path} horizontal overflow: ${overflow.offenders.join(', ')}`).toBeLessThanOrEqual(
        overflow.clientWidth + 1,
      );
    }
  });

  test('visible action controls meet the 44px touch target minimum', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const path of OPERATIONAL_PAGES) {
      await openOperationalPage(page, path);
      const undersized = await page.locator(
        'main button:visible, main [role="button"]:visible, main input[type="submit"]:visible, main select:visible',
      ).evaluateAll(controls => controls.flatMap((control, index) => {
        const rect = control.getBoundingClientRect();
        if (rect.width >= 44 && rect.height >= 44) return [];

        const name = control.getAttribute('aria-label')
          || control.textContent?.trim()
          || `${control.tagName.toLowerCase()}#${index}`;
        return [`${name} (${Math.round(rect.width)}×${Math.round(rect.height)})`];
      }));

      expect(undersized, `${path} undersized touch targets`).toEqual([]);
    }
  });
});
