import { test, expect } from '@playwright/test';

test.describe('Machine Card Routing', () => {
  // We must authenticate first because machines.html is protected and redirects to vault.html
  test.beforeEach(async ({ page }) => {
    // 1. Navigate to the login page (vault)
    await page.goto('/vault.html');
    
    // 2. IMPORTANT: Fill in your actual test account credentials here
    // await page.fill('input[type="email"]', 'test-owner@example.com');
    // await page.fill('input[type="password"]', 'your-secure-password');
    // await page.click('button:has-text("Sign in")');
    
    // 3. Wait for successful login redirect
    // await page.waitForURL('**/dashboard.html');
  });

  test('clicking Open issues on a machine card routes to tickets with open filter', async ({ page }) => {
    // Navigate to the machines page
    await page.goto('/machines.html');

    // Wait for the machines to load
    await page.waitForSelector('.machine-tile', { state: 'visible' });

    // Find the first machine tile and get its ID
    const firstMachine = page.locator('.machine-tile').first();
    const machineIdElement = firstMachine.locator('.machine-tile-id');
    const machineId = await machineIdElement.textContent();

    // Click on the 'Open issues' span in the machine-track-record
    const openIssuesSpan = firstMachine.locator('.machine-track-record span').filter({ hasText: 'Open issues' });
    await openIssuesSpan.click();

    // Verify the URL correctly routed to tickets with the machine_id and open status
    await expect(page).toHaveURL(new RegExp(`/tickets.html\\?machine=${machineId}&status=open&activeFilter=open`));

    // Verify the "Open work" tab is active in the Tickets UI
    const openWorkTab = page.locator('button.active', { hasText: 'Open work' });
    await expect(openWorkTab).toBeVisible();
    
    // Check that the dropdown for "Filter by Status" is set to "open"
    const statusSelect = page.locator('select').filter({ hasText: /Open|Closed/ }).last();
    await expect(statusSelect).toHaveValue('open');
  });
});
