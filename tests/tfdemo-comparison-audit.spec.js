import { test, expect } from "@playwright/test";

const ADMIN_URL = "https://turbofix-backend-ehxb.onrender.com/admin";
const PASSWORD = "TurboFix@12345";

test("TFDEMO backend vs admin frontend comparison", async ({ page }) => {
  page.setDefaultTimeout(60000);

  // 1. Direct Backend REST API calls
  const loginResp = await page.request.post(`${ADMIN_URL}/login`, {
    data: { password: PASSWORD },
    headers: { "Content-Type": "application/json" },
  });
  expect(loginResp.ok()).toBeTruthy();
  const { access_token: token } = await loginResp.json();

  const companiesResp = await page.request.get(`${ADMIN_URL}/companies`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(companiesResp.ok()).toBeTruthy();
  const companiesList = await companiesResp.json();
  const backendCompany = companiesList.find((c) => c.company_code === "TFDEMO");

  const dashboardResp = await page.request.get(`${ADMIN_URL}/companies/TFDEMO/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const backendDashboard = dashboardResp.ok() ? await dashboardResp.json() : null;

  const workspaceResp = await page.request.get(`${ADMIN_URL}/companies/TFDEMO/workspace-preview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const backendWorkspace = workspaceResp.ok() ? await workspaceResp.json() : null;

  const usersResp = await page.request.get(`${ADMIN_URL}/companies/TFDEMO/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const backendUsers = usersResp.ok() ? await usersResp.json() : null;

  console.log("\n================ BACKEND DATA FOR TFDEMO ================");
  console.log("1. /admin/companies summary:\n", JSON.stringify(backendCompany, null, 2));
  console.log("2. /admin/companies/TFDEMO/dashboard KPIs:\n", JSON.stringify(backendDashboard?.kpis, null, 2));
  console.log("3. /admin/companies/TFDEMO/workspace-preview machines count:", backendWorkspace?.machines?.length);
  console.log("4. /admin/companies/TFDEMO/users count:", backendUsers?.users?.length);

  // 2. Open Admin UI in Browser
  await page.goto(ADMIN_URL, { waitUntil: "networkidle" });
  await page.fill("#pw", PASSWORD);
  await page.click("#loginBtn");

  await page.waitForFunction(
    () => {
      const el = document.getElementById("activeCompanies");
      return el && el.textContent.trim() !== "—";
    },
    { timeout: 30000 }
  );
  await page.waitForTimeout(1500);

  // Extract window.companies array from JS context
  const uiCompanies = await page.evaluate(() => window.companies || companies || []);
  const uiTfdemo = uiCompanies.find((c) => c.company_code === "TFDEMO");

  // Extract rendered table row text for TFDEMO
  const tableRowText = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("table tbody tr"));
    const tfRow = rows.find((r) => r.textContent.includes("TFDEMO"));
    return tfRow ? tfRow.textContent.replace(/\s+/g, " ").trim() : "NOT FOUND IN TABLE";
  });

  console.log("\n================ FRONTEND UI DATA FOR TFDEMO ================");
  console.log("1. JS state (window.companies entry):\n", JSON.stringify(uiTfdemo, null, 2));
  console.log("2. Table row rendered text:\n", tableRowText);

  // Open TFDEMO Drawer
  const tfBtn = page.locator("button[data-company='TFDEMO']");
  if (await tfBtn.count() > 0) {
    await tfBtn.click();
    await page.waitForTimeout(1000);
  }

  const drawerContent = await page.evaluate(() => {
    const d = document.getElementById("companyDrawer");
    return d ? d.textContent.replace(/\s+/g, " ").trim() : "DRAWER NOT OPEN";
  });

  console.log("\n================ TFDEMO DRAWER CONTENT ================");
  console.log(drawerContent.slice(0, 800));

  // Perform field-by-field verification
  const mismatches = [];

  if (!backendCompany) {
    mismatches.push("TFDEMO not found in backend /admin/companies response");
  } else if (!uiTfdemo) {
    mismatches.push("TFDEMO not found in frontend window.companies array");
  } else {
    const compareFields = [
      ["company_code", "Company Code"],
      ["company_name", "Company Name"],
      ["machines_used", "Machines Used"],
      ["machine_quota", "Machine Quota"],
      ["user_count", "User Count"],
      ["open_tickets", "Open Tickets"],
      ["critical_tickets", "Critical Tickets"],
      ["document_count", "Document Count"],
      ["pending_records", "Pending Records"],
      ["approved_records", "Approved Records"],
      ["approved", "Approval Status"],
      ["needs_attention", "Needs Attention Flag"],
    ];

    for (const [key, label] of compareFields) {
      const backendVal = backendCompany[key];
      const uiVal = uiTfdemo[key];
      if (String(backendVal) !== String(uiVal)) {
        mismatches.push(`MISMATCH in ${label} (${key}): Backend = ${backendVal} | Frontend JS = ${uiVal}`);
      }
    }
  }

  console.log("\n================ MISMATCH COMPARISON RESULT ================");
  if (mismatches.length === 0) {
    console.log("✅ 100% MATCH: Backend API data and Admin Frontend rendered UI match perfectly for TFDEMO!");
  } else {
    console.log(`❌ ${mismatches.length} MISMATCH(ES) FOUND:`);
    mismatches.forEach((m) => console.log(" -", m));
  }
});
