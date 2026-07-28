// admin-data-audit.spec.js
// Deep data mismatch audit for TurboFix admin portal
import { test, expect } from "@playwright/test";
import { writeFileSync } from "fs";

const ADMIN_URL = "https://turbofix-backend-ehxb.onrender.com/admin";
const PASSWORD = "TurboFix@12345";
const OUT = (name) => `/tmp/tf-audit-${name}`;

test("admin data mismatch audit", async ({ page }) => {
  page.setDefaultTimeout(60000);

  // ── 1. Collect API data directly ─────────────────────────────────────────
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
  const apiCompanies = await companiesResp.json();

  console.log("=== API /admin/companies ===");
  console.log(JSON.stringify(apiCompanies, null, 2));
  writeFileSync(OUT("api-companies.json"), JSON.stringify(apiCompanies, null, 2));

  // ── 2. Navigate & log in via UI ───────────────────────────────────────────
  await page.goto(ADMIN_URL, { waitUntil: "networkidle" });
  await page.fill("#pw", PASSWORD);
  await page.click("#loginBtn");

  // Wait until portfolio loads (metric value changes from "—")
  await page.waitForFunction(
    () => {
      const el = document.getElementById("activeCompanies");
      return el && el.textContent.trim() !== "—";
    },
    { timeout: 30000 }
  );
  await page.waitForTimeout(1500);

  // ── 3. Read rendered metric values ───────────────────────────────────────
  const rendered = await page.evaluate(() => ({
    activeCompanies: document.getElementById("activeCompanies")?.textContent?.trim(),
    pendingCompanies: document.getElementById("pendingCompanies")?.textContent?.trim(),
    attentionCompanies: document.getElementById("attentionCompanies")?.textContent?.trim(),
    portfolioMachines: document.getElementById("portfolioMachines")?.textContent?.trim(),
    portfolioCapacity: document.getElementById("portfolioCapacity")?.textContent?.trim(),
    companiesInJs: typeof companies !== "undefined" ? companies : [],
  }));

  console.log("=== UI Overview Metrics ===");
  console.log(JSON.stringify({
    activeCompanies: rendered.activeCompanies,
    pendingCompanies: rendered.pendingCompanies,
    attentionCompanies: rendered.attentionCompanies,
    portfolioMachines: rendered.portfolioMachines,
    portfolioCapacity: rendered.portfolioCapacity,
  }, null, 2));

  console.log("=== window.companies (JS variable) ===");
  console.log(JSON.stringify(rendered.companiesInJs, null, 2));

  await page.screenshot({ path: OUT("01-overview.png"), fullPage: true });

  // ── 4. Capture company table rows ─────────────────────────────────────────
  const tableRows = await page.$$eval("table tbody tr", (rows) =>
    rows.map((row) => {
      const cells = row.querySelectorAll("td");
      return [...cells].map((c) => c.textContent.replace(/\s+/g, " ").trim());
    })
  );
  console.log("=== Company Table Rows (UI) ===");
  tableRows.forEach((r, i) => console.log(`Row ${i}:`, r.join(" | ")));

  // ── 5. Cross-check API vs UI ──────────────────────────────────────────────
  console.log("\n=== MISMATCH REPORT ===");
  const jsCompanies = rendered.companiesInJs;
  const mismatches = [];

  for (const api of apiCompanies) {
    const jsEntry = jsCompanies.find((c) => c.company_code === api.company_code);
    if (!jsEntry) {
      mismatches.push(`MISSING in UI JS: ${api.company_code}`);
      continue;
    }
    const fields = ["open_tickets", "critical_tickets", "document_count", "machines_used", "machine_quota", "approved", "needs_attention", "last_activity"];
    for (const f of fields) {
      if (String(api[f]) !== String(jsEntry[f])) {
        mismatches.push(`${api.company_code}.${f}: API=${api[f]} vs UI=${jsEntry[f]}`);
      }
    }
  }

  if (mismatches.length === 0) {
    console.log("✅ No mismatches found between API and window.companies");
  } else {
    console.log("❌ Mismatches found:");
    mismatches.forEach((m) => console.log(" -", m));
  }

  // ── 6. Open each company drawer ───────────────────────────────────────────
  const companyButtons = await page.$$("button[data-company]");
  for (let i = 0; i < Math.min(companyButtons.length, 6); i++) {
    const btn = companyButtons[i];
    const code = await btn.getAttribute("data-company");
    await btn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: OUT(`drawer-${code}.png`), fullPage: true });

    const drawerData = await page.evaluate(() => {
      const drawer = document.getElementById("drawer");
      return drawer ? drawer.textContent.replace(/\s+/g, " ").slice(0, 800) : "drawer not found";
    });
    console.log(`\n=== Drawer: ${code} ===`);
    console.log(drawerData);

    // close drawer
    const closeBtn = page.locator("#drawerClose");
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: OUT("05-final.png"), fullPage: true });

  console.log("\n=== SUMMARY ===");
  console.log(`API companies: ${apiCompanies.length}`);
  console.log(`JS companies: ${jsCompanies.length}`);
  console.log(`UI active count: ${rendered.activeCompanies}`);
  console.log(`Mismatches: ${mismatches.length}`);
  writeFileSync(OUT("mismatch-report.json"), JSON.stringify({ mismatches, apiCompanies, jsCompanies: rendered.companiesInJs }, null, 2));
});
