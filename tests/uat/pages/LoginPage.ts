import { expect, type Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login.html', { waitUntil: 'networkidle' });
  }

  async expectLoaded() {
    await expect(this.page.getByRole('button', { name: /sign in/i })).toBeVisible();
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
