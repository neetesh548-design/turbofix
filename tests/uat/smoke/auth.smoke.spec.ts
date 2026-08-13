import { test } from '../fixtures/app.fixture';
import { LoginPage } from '../pages/LoginPage';

test.describe('UAT smoke: auth entry', () => {
  test('login and register entry points render cleanly', async ({ page, assertNoRuntimeErrors }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.expectLoaded();
    await login.openRegister();
    await login.expectRegisterVisible();
    await assertNoRuntimeErrors();
  });
});
