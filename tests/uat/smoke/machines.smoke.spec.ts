import { test } from '../fixtures/app.fixture';
import { MachinesPage } from '../pages/MachinesPage';

test.describe('UAT smoke: machines journey', () => {
  test('owner can open machine drawer and machine workspace', async ({ page, openApp, assertNoRuntimeErrors }) => {
    const machines = new MachinesPage(page);
    await openApp('/machines.html', 'owner');
    await machines.expectLoaded();
    await machines.openFirstMachine();
    await machines.expectDrawerOpen();
    await machines.openWorkspaceFromDrawer();
    await machines.expectWorkspaceVisible();
    await assertNoRuntimeErrors();
  });
});
