import { test } from '../fixtures/app.fixture';
import { AdminPortalPage } from '../pages/AdminPortalPage';

test.describe('UAT smoke: admin entry', () => {
  test('admin portal login shell renders', async ({ page, assertNoRuntimeErrors }) => {
    const admin = new AdminPortalPage(page);
    await admin.goto();
    await admin.expectLoginVisible();
    await assertNoRuntimeErrors();
  });
});
