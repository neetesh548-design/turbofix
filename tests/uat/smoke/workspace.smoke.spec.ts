import { test } from '../fixtures/app.fixture';
import { AppWorkspacePage } from '../pages/AppWorkspacePage';

const pageChecks = [
  { path: '/dashboard.html', role: 'owner', assert: 'expectDashboard' },
  { path: '/tickets.html', role: 'owner', assert: 'expectTickets' },
  { path: '/team.html', role: 'owner', assert: 'expectTeam' },
  { path: '/settings.html', role: 'owner', assert: 'expectSettings' },
  { path: '/support.html', role: 'support', assert: 'expectSupport' },
] as const;

test.describe('UAT smoke: core workspaces', () => {
  for (const entry of pageChecks) {
    test(`${entry.path} opens for ${entry.role} demo session`, async ({ page, openApp, assertNoRuntimeErrors }) => {
      const workspace = new AppWorkspacePage(page);
      await openApp(entry.path, entry.role);
      await workspace[entry.assert]();
      await assertNoRuntimeErrors();
    });
  }
});
