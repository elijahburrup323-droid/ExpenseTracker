const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";
const EMAIL = "test@example.com";
const PASS = "password123";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', EMAIL);
  await page.fill('input[name="user[password]"]', PASS);
  await Promise.all([
    page.waitForURL(/dashboard/),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
  // Dismiss What's New overlay
  await page.evaluate(() => document.getElementById("whatsNewOverlay")?.remove());
}

async function apiCall(page, method, path) {
  return page.evaluate(
    async ({ base, method, path }) => {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch(`${base}${path}`, {
        method,
        headers: { Accept: "application/json", "X-CSRF-Token": csrf },
      });
      let json;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      return { status: res.status, json };
    },
    { base: BASE, method, path }
  );
}

test.describe("BugStopper: Report API boundary conditions", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // --- monthly_cash_flow invalid month values ---

  test("monthly_cash_flow with month=0 returns 400", async ({ page }) => {
    const res = await apiCall(page, "GET", "/api/reports/monthly_cash_flow?year=2026&month=0");
    expect(res.status).toBe(400);
    expect(res.json?.error).toBeTruthy();
  });

  test("monthly_cash_flow with month=13 returns 400", async ({ page }) => {
    const res = await apiCall(page, "GET", "/api/reports/monthly_cash_flow?year=2026&month=13");
    expect(res.status).toBe(400);
    expect(res.json?.error).toBeTruthy();
  });

  test("monthly_cash_flow with month=-1 returns 400", async ({ page }) => {
    const res = await apiCall(page, "GET", "/api/reports/monthly_cash_flow?year=2026&month=-1");
    expect(res.status).toBe(400);
    expect(res.json?.error).toBeTruthy();
  });

  // --- spending_by_category invalid month ---

  test("spending_by_category with month=0 returns 400", async ({ page }) => {
    const res = await apiCall(page, "GET", "/api/reports/spending_by_category?year=2026&month=0");
    expect(res.status).toBe(400);
    expect(res.json?.error).toBeTruthy();
  });

  // --- spending_by_type invalid month ---

  test("spending_by_type with month=0 returns 400", async ({ page }) => {
    const res = await apiCall(page, "GET", "/api/reports/spending_by_type?year=2026&month=0");
    expect(res.status).toBe(400);
    expect(res.json?.error).toBeTruthy();
  });

  // --- spending_by_tag invalid month ---

  test("spending_by_tag with month=0 returns 400", async ({ page }) => {
    const res = await apiCall(page, "GET", "/api/reports/spending_by_tag?year=2026&month=0");
    expect(res.status).toBe(400);
    expect(res.json?.error).toBeTruthy();
  });

  // --- net_worth_report invalid start_month ---

  test("net_worth_report with start_month=0 returns 400", async ({ page }) => {
    const res = await apiCall(page, "GET", "/api/reports/net_worth_report?start_year=2026&start_month=0&end_year=2026&end_month=2");
    expect(res.status).toBe(400);
    expect(res.json?.error).toBeTruthy();
  });

  // --- account_balance_history invalid start_month ---

  test("account_balance_history with start_month=0 returns 400", async ({ page }) => {
    const res = await apiCall(page, "GET", "/api/reports/account_balance_history?start_year=2026&start_month=0&end_year=2026&end_month=2");
    expect(res.status).toBe(400);
    expect(res.json?.error).toBeTruthy();
  });

  // --- soft_close_summary invalid month ---

  test("soft_close_summary with month=0 returns 400", async ({ page }) => {
    const res = await apiCall(page, "GET", "/api/reports/soft_close_summary?year=2026&month=0");
    expect(res.status).toBe(400);
    expect(res.json?.error).toBeTruthy();
  });

  // --- Sanity check: valid params return 200 ---

  test("monthly_cash_flow with valid params returns 200", async ({ page }) => {
    const res = await apiCall(page, "GET", "/api/reports/monthly_cash_flow?year=2026&month=1");
    expect(res.status).toBe(200);
    expect(res.json).toBeTruthy();
    expect(res.json.month_label).toBeTruthy();
  });
});
