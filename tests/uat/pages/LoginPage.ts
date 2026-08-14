import { expect, type Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login.html', { waitUntil: 'networkidle' });
  }

  async expectLoaded() {
    // Login.jsx has two "Sign In"-labeled elements — the login/register tab
    // switcher and the form's own submit button — so the bare role query is
    // ambiguous (Playwright strict-mode violation). Scope to the submit
    // button specifically.
    await expect(this.page.getByRole('button', { name: 'Sign In', exact: true }).and(this.page.locator('button[type="submit"]'))).toBeVisible();
    await expect(this.page.getByRole('button', { name: /register company/i })).toBeVisible();
  }

  async openRegister() {
    await this.page.getByRole('button', { name: /register company/i }).click();
  }

  async expectRegisterVisible() {
    await expect(this.page.getByRole('textbox', { name: /company code/i })).toBeVisible();
    await expect(this.page.getByRole('textbox', { name: /company name/i })).toBeVisible();
  }
}
