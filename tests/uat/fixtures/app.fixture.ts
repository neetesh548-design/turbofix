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
        // A demo session (tf_token = `demo:<role>`) has no real Supabase
        // Auth session, so any edge function call that requires one
        // (onboard_team_member, etc.) is correctly rejected by the live
        // backend — Machines.jsx logging that rejection is the *correct*
        // behavior (the alternative is silently swallowing it, which this
        // whole test suite exists to catch elsewhere), not a bug to
        // suppress in product code. Expected only for demo-mode sessions.
        return !lower.includes('favicon')
          && !lower.includes('failed to load resource')
          && !lower.includes('onboard_team_member list failed');
      });
      expect(seriousConsoleErrors, `Console errors: ${seriousConsoleErrors.join('\n')}`).toEqual([]);
    });
  },
});

export { expect } from '@playwright/test';
