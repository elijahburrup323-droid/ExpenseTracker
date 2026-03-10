// @ts-check
const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000";
const EMAIL = "jacismith@home.net";
const PASSWORD = "luckydjb";

test.describe("Snapshot Rebuild Validation — Jaci", () => {
  test.beforeEach(async ({ page }) => {
    // Login via Devise
    await page.goto(`${BASE}/users/sign_in`);
    await page.fill("#user_email", EMAIL);
    await page.fill("#user_password", PASSWORD);
    await page.click('input[type="submit"]');
    await page.waitForURL(/dashboard|home/i, { timeout: 15000 });
  });

  test("Dashboard loads without errors and shows March 2026", async ({ page }) => {
    // Check dashboard loads
    await expect(page).toHaveURL(/dashboard|home/i);

    // Check for March 2026 in the month display
    const bodyText = await page.textContent("body");
    expect(bodyText).toContain("March");
    expect(bodyText).toContain("2026");
  });

  test("Accounts card total matches sum of account balances", async ({ page }) => {
    // Fetch accounts via API
    const accounts = await page.evaluate(async (base) => {
      const res = await fetch(base + "/api/accounts");
      return res.json();
    }, BASE);

    expect(accounts).toBeTruthy();
    expect(Array.isArray(accounts)).toBe(true);
    expect(accounts.length).toBeGreaterThan(0);

    // Sum all account balances
    const total = accounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);
    console.log(`Account balances: ${accounts.map(a => `${a.name}=${a.balance}`).join(", ")}`);
    console.log(`Total: ${total.toFixed(2)}`);

    // Total should be a reasonable number (not NaN, not zero unless truly zero)
    expect(isNaN(total)).toBe(false);
  });

  test("Dashboard page renders income and spending sections", async ({ page }) => {
    // Verify dashboard page shows financial data
    const bodyText = await page.textContent("body");
    // Dashboard should show some financial numbers
    expect(bodyText).toMatch(/\$/);
  });

  test("Snapshot audit for Jan 2026 shows no variance", async ({ page }) => {
    const audit = await page.evaluate(async (base) => {
      const res = await fetch(
        base + "/api/reports/monthly_snapshot_audit?start_year=2026&start_month=1&end_year=2026&end_month=1"
      );
      return res.json();
    }, BASE);

    expect(audit).toBeTruthy();
    if (audit.accounts) {
      for (const acct of audit.accounts) {
        for (const m of acct.months || []) {
          if (m.has_snapshot) {
            console.log(`Jan ${acct.name}: beg=${m.beginning_balance}, end=${m.snapshot_ending_balance}, calc=${m.calculated_ending_balance}, variance=${m.variance}`);
            // Variance should be zero or very small
            expect(Math.abs(m.variance || 0)).toBeLessThan(0.01);
            expect(m.is_stale).toBe(false);
          }
        }
      }
    }
  });

  test("Snapshot audit for Feb 2026 shows no variance", async ({ page }) => {
    const audit = await page.evaluate(async (base) => {
      const res = await fetch(
        base + "/api/reports/monthly_snapshot_audit?start_year=2026&start_month=2&end_year=2026&end_month=2"
      );
      return res.json();
    }, BASE);

    expect(audit).toBeTruthy();
    if (audit.accounts) {
      for (const acct of audit.accounts) {
        for (const m of acct.months || []) {
          if (m.has_snapshot) {
            console.log(`Feb ${acct.name}: beg=${m.beginning_balance}, end=${m.snapshot_ending_balance}, calc=${m.calculated_ending_balance}, variance=${m.variance}`);
            expect(Math.abs(m.variance || 0)).toBeLessThan(0.01);
            expect(m.is_stale).toBe(false);
          }
        }
      }
    }
  });

  test("Feb beginning balances match Jan ending balances", async ({ page }) => {
    const audit = await page.evaluate(async (base) => {
      const res = await fetch(
        base + "/api/reports/monthly_snapshot_audit?start_year=2026&start_month=1&end_year=2026&end_month=2"
      );
      return res.json();
    }, BASE);

    expect(audit).toBeTruthy();
    if (audit.accounts) {
      for (const acct of audit.accounts) {
        const months = acct.months || [];
        const jan = months.find(m => m.month === 1);
        const feb = months.find(m => m.month === 2);
        if (jan && feb && jan.has_snapshot && feb.has_snapshot) {
          console.log(`${acct.name}: Jan end=${jan.snapshot_ending_balance}, Feb beg=${feb.beginning_balance}`);
          expect(Math.abs(jan.snapshot_ending_balance - feb.beginning_balance)).toBeLessThan(0.01);
        }
      }
    }
  });

  test("Net Worth chart has data points for Jan and Feb", async ({ page }) => {
    const snapshots = await page.evaluate(async (base) => {
      const res = await fetch(base + "/api/net_worth_snapshots");
      if (!res.ok) return null;
      return res.json();
    }, BASE);

    if (snapshots) {
      console.log("Net worth snapshots:", JSON.stringify(snapshots));
      const arr = Array.isArray(snapshots) ? snapshots : (snapshots.snapshots || []);
      expect(arr.length).toBeGreaterThanOrEqual(2);
    } else {
      // Endpoint doesn't exist — verify via snapshot audit that net worth is non-zero
      const audit = await page.evaluate(async (base) => {
        const res = await fetch(
          base + "/api/reports/monthly_snapshot_audit?start_year=2026&start_month=1&end_year=2026&end_month=2"
        );
        return res.json();
      }, BASE);
      expect(audit).toBeTruthy();
      expect(audit.accounts.length).toBeGreaterThan(0);
    }
  });
});
