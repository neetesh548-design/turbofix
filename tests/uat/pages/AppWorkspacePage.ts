import { expect, type Page } from '@playwright/test';

export class AppWorkspacePage {
  constructor(private readonly page: Page) {}

  async expectDashboard() {
    await expect(this.page.locator('[data-testid="dashboard-page"]')).toBeVisible();
    await expect(this.page.locator('.md-header h1').first()).toBeVisible();
  }

  async expectTickets() {
    await expect(this.page.getByRole('heading', { name: /work order control board/i })).toBeVisible();
  }

  async expectTeam() {
    await expect(this.page.getByRole('heading', { name: /team directory/i })).toBeVisible();
  }

  async expectSettings() {
    await expect(this.page.locator('[data-testid="settings-page"]')).toBeVisible();
  }

  async expectSupport() {
    await expect(this.page.getByRole('heading', { name: /^support$/i })).toBeVisible();
  }
}
