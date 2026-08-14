import { expect, type Locator, type Page } from '@playwright/test';

export class MachinesPage {
  readonly board: Locator;
  readonly cards: Locator;

  constructor(private readonly page: Page) {
    this.board = page.locator('[data-testid="machine-board"]');
    this.cards = page.locator('[data-testid="machine-card"]');
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: /^machines$/i })).toBeVisible();
    await expect(this.board).toBeVisible();
  }

  async openFirstMachine() {
    // machine-view-details (inside the card) jumps straight to the full
    // workspace, bypassing the drawer entirely — see MachineCard.jsx's
    // onClick, which calls onViewDetails (not onOpen) when present. The
    // card itself is what opens the lightweight drawer this test actually
    // wants first.
    await this.cards.first().click();
  }

  async expectDrawerOpen() {
    await expect(this.page.locator('[data-testid="machine-drawer"]')).toBeVisible();
    await expect(this.page.locator('.machine-drawer-photo').first()).toBeVisible();
  }

  async openWorkspaceFromDrawer() {
    await this.page.locator('[data-testid="machine-open-workspace"]').click();
  }

  async expectWorkspaceVisible() {
    await expect(this.page.locator('.machines-page, .vault-wrap.workspace-page.machines-page').first()).toBeVisible();
  }
}
