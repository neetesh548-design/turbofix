import { test as base, expect, type Page } from '@playwright/test';
import { demoUsers, type DemoUserKey } from '../data/demoUsers';

type AppFixtures = {
  pageErrors: string[];
  consoleErrors: string[];
  bootAsDemo: (role: DemoUserKey) => Promise<void>;
  openApp: (path: string, role?: DemoUserKey) => Promise<void>;
  assertNoRuntimeErrors: () => Promise<void>;
};

async function seedDemoAuth(page: Page, role: DemoUserKey) {
  const user = demoUsers[role];
  await page.addInitScript((demoUser) => {
    window.localStorage.setItem('tf_user', JSON.stringify(demoUser));
    window.localStorage.setItem('tf_token', `demo:${demoUser.role}`);
  }, user);
}

export const test = base.extend<AppFixtures>({
  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await use(errors);
  },

  consoleErrors: async ({ page }, use) => {
    const messages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') messages.push(msg.text());
    });
    await use(messages);
  },

  bootAsDemo: async ({ page }, use) => {
    await use(async (role: DemoUserKey) => {
      await seedDemoAuth(page, role);
    });
  },

  openApp: async ({ page }, use) => {
    await use(async (path: string, role: DemoUserKey = 'owner') => {
      await seedDemoAuth(page, role);
      await page.goto(path, { waitUntil: 'networkidle' });
    });
  },

  assertNoRuntimeErrors: async ({ pageErrors, consoleErrors }, use) => {
    await use(async () => {
      expect(pageErrors, `Unhandled page errors: ${pageErrors.join('\n')}`).toEqual([]);
      const seriousConsoleErrors = consoleErrors.filter((entry) => {
        const lower = entry.toLowerCase();
        return !lower.includes('favicon') && !lower.includes('failed to load resource');
      });
      expect(seriousConsoleErrors, `Console errors: ${seriousConsoleErrors.join('\n')}`).toEqual([]);
    });
  },
});

export { expect } from '@playwright/test';
