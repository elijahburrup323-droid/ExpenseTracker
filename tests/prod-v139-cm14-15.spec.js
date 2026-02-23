// @ts-check
// Post-deploy verification for v1.3.9 CM-14 + CM-15
const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/mybudgethq";

const ACCOUNTS = [
  { email: "elijahburrup323@gmail.com", pass: "Eli624462!" },
  { email: "djburrup@gmail.com",        pass: "luckydjb"   },
];

async function login(page, email, pass) {
  await page.goto(BASE + "/users/sign_in");
  await page.fill("input[name=\"user[email]\"]", email);
  await page.fill("input[name=\"user[password]\"]", pass);
  await Promise.all([
    page.waitForURL(/\/mybudgethq\/dashboard/, { timeout: 15000 }),
    page.click("input[type=\"submit\"], button[type=\"submit\"]"),
  ]);
  const gotIt = page.locator("#whatsNewOverlay button:has-text(\"Got it\")");
  try {
    await gotIt.waitFor({ state: "visible", timeout: 4000 });
    await gotIt.click();
    await page.waitForTimeout(500);
  } catch (e) { /* no overlay */ }
}

for (const acct of ACCOUNTS) {
  test.describe("Account: " + acct.email, () => {

    test("Login + dashboard data", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator("h1, [data-controller=\"dashboard\"]")).toBeVisible({ timeout: 10000 });
      const body = await page.textContent("body");
      expect(body.length).toBeGreaterThan(200);
    });

    test("CM-14: Acct Type Masters loads data", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(BASE + "/account_type_masters");
      await page.waitForLoadState("networkidle");
      if (page.url().includes("account_type_masters")) {
        await page.waitForTimeout(3000);
        const tableBody = page.locator("[data-account-type-masters-target=\"tableBody\"]");
        const text = await tableBody.textContent();
        expect(text).not.toContain("Loading...");
        expect(text.length).toBeGreaterThan(5);
      }
    });

    test("CM-15: Reconcile Balance sticky header", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(BASE + "/account_reconciliation");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1:has-text(\"Reconcile Balance\")")).toBeVisible({ timeout: 10000 });
      const stickyHeader = page.locator(".sticky.top-14.z-20").first();
      await expect(stickyHeader).toBeVisible();
      await expect(stickyHeader.locator("input[placeholder=\"Search amount...\"]")).toBeVisible();
      await expect(stickyHeader.locator("select[data-reconciliation-target=\"accountSelect\"]")).toBeVisible();
    });

    test("Regression: Payments", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(BASE + "/payments");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1:has-text(\"Payments\")")).toBeVisible({ timeout: 10000 });
    });

    test("Regression: Accounts", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(BASE + "/accounts");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1:has-text(\"Accounts\")")).toBeVisible({ timeout: 10000 });
    });

    test("No JS console errors", async ({ page }) => {
      const errors = [];
      page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
      await login(page, acct.email, acct.pass);
      await page.waitForTimeout(3000);
      const jsErrors = errors.filter(e => !e.includes("favicon") && !e.includes("404"));
      expect(jsErrors.length).toBe(0);
    });

    test("Version shows 1.3.9", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const bodyText = await page.textContent("body");
      expect(bodyText).toContain("1.3.9");
    });

  });
}
