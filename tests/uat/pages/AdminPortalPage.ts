import { expect, type Page } from '@playwright/test';

export class AdminPortalPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/admin.html', { waitUntil: 'networkidle' });
  }

  async expectLoginVisible() {
    await expect(this.page.locator('input[type="password"]').first()).toBeVisible();
    await expect(this.page.getByRole('button').first()).toBeVisible();
  }
}
