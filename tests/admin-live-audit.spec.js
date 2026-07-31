import { test, expect } from '@playwright/test';

test('Audit live admin dashboard data and layout', async ({ page }) => {
  console.log('Navigating to live admin portal...');
  await page.goto('https://turbofix-backend-ehxb.onrender.com/admin');

  // Fill admin password
  await page.fill('#pw', 'TurboFix@12345');
  await page.click('#loginBtn');

  // Wait for control room to load
  await page.waitForSelector('#adminApp', { state: 'visible', timeout: 15000 });

  // Wait for portfolio data to finish loading from API
  console.log('Waiting for portfolio data to load...');
  await page.waitForFunction(
    () => {
      const el = document.getElementById('activeCompanies');
      return el && el.textContent.trim() !== '—';
    },
    { timeout: 30000 }
  );

  // Extract portfolio metrics
  const activeCompanies = await page.textContent('#activeCompanies');
  const activeCompaniesNote = await page.textContent('#activeCompaniesNote');
  const pendingCompanies = await page.textContent('#pendingCompanies');
  const attentionCompanies = await page.textContent('#attentionCompanies');
  const portfolioMachines = await page.textContent('#portfolioMachines');
  const portfolioCapacity = await page.textContent('#portfolioCapacity');

  console.log('=== LIVE DEPLOYED PORTFOLIO METRICS ===');
  console.log('Active Companies:', activeCompanies, `(${activeCompaniesNote})`);
  console.log('Pending Companies:', pendingCompanies);
  console.log('Attention Companies:', attentionCompanies);
  console.log('Portfolio Machines:', portfolioMachines, `(${portfolioCapacity})`);

  // Extract company rows
  const companyRows = await page.$$eval('#companyRows tr', rows => {
    return rows.map(r => {
      const cells = r.querySelectorAll('td');
      if (cells.length < 6) return null;
      return {
        company: cells[0]?.innerText.replace(/\n/g, ' '),
        status: cells[1]?.innerText.trim(),
        capacity: cells[2]?.innerText.replace(/\n/g, ' '),
        operations: cells[3]?.innerText.replace(/\n/g, ' '),
        ai_knowledge: cells[4]?.innerText.replace(/\n/g, ' '),
        last_activity: cells[5]?.innerText.trim()
      };
    }).filter(Boolean);
  });

  console.log('=== LIVE COMPANY DIRECTORY ROWS ===');
  console.log(JSON.stringify(companyRows, null, 2));

  // Screenshot the live admin app
  await page.screenshot({ path: 'test-results/admin-live-audit.png', fullPage: true });

  // Test drawer details for the first company
  const firstManageBtn = page.locator('.quiet-link').first();
  if (await firstManageBtn.isVisible()) {
    await firstManageBtn.click();
    await page.waitForSelector('#companyDrawer.open', { timeout: 5000 });
    await page.waitForTimeout(1000);
    const drawerText = await page.textContent('#companyDrawerContent');
    console.log('=== DRAWER DETAILS (FIRST COMPANY) ===');
    console.log(drawerText);
    await page.screenshot({ path: 'test-results/admin-drawer-audit.png' });
  }
});
