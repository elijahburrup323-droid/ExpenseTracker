// @ts-check
const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/mybudgethq";

const ACCOUNTS = [
  { email: "elijahburrup323@gmail.com", pass: "Eli624462!" },
  { email: "djburrup@gmail.com",        pass: "luckydjb"   },
];

async function login(page, email, pass) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', pass);
  await Promise.all([
    page.waitForURL(/\/mybudgethq\/dashboard/, { timeout: 15000 }),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  try {
    await gotIt.waitFor({ state: "visible", timeout: 4000 });
    await gotIt.click();
    await page.waitForTimeout(500);
  } catch { /* no overlay */ }
}

for (const acct of ACCOUNTS) {
  test.describe(`Account: ${acct.email}`, () => {

    test("Login succeeds and dashboard loads with data", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
      const body = await page.textContent("body");
      expect(body.length).toBeGreaterThan(200);
    });

    test("Navigation shows Month submenu under all three groups", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const sidebar = page.locator("aside");
      await expect(sidebar.locator('[data-sidebar-group="accounts-month"]')).toBeAttached({ timeout: 5000 });
      await expect(sidebar.locator('[data-sidebar-group="deposits-month"]')).toBeAttached({ timeout: 5000 });
      await expect(sidebar.locator('[data-sidebar-group="payments-month"]')).toBeAttached({ timeout: 5000 });
    });

    test("Soft Close Month links exist in all three Month sub-groups", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const sidebar = page.locator("aside");
      const accountsSC = sidebar.locator('[data-sidebar-group="accounts-month"] a:has-text("Soft Close Month")');
      const depositsSC = sidebar.locator('[data-sidebar-group="deposits-month"] a:has-text("Soft Close Month")');
      const paymentsSC = sidebar.locator('[data-sidebar-group="payments-month"] a:has-text("Soft Close Month")');
      await expect(accountsSC).toBeAttached({ timeout: 5000 });
      await expect(depositsSC).toBeAttached({ timeout: 5000 });
      await expect(paymentsSC).toBeAttached({ timeout: 5000 });
    });

    test("Soft Close Month page loads via direct navigation", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/soft_close`);
      await expect(page.locator("h1:has-text('Soft Close Month')")).toBeVisible({ timeout: 10000 });
    });

    test("Soft Close checklist does NOT show reconciliation item", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/soft_close`);
      await expect(page.locator("h1:has-text('Soft Close Month')")).toBeVisible({ timeout: 10000 });
      // Wait for the AJAX checklist to load
      await page.waitForTimeout(6000);
      const checklistText = await page.locator('[data-soft-close-target="checklistBody"]').textContent();
      expect(checklistText.length).toBeGreaterThan(20);
      expect(checklistText).not.toContain("Reconciliation");
    });

    test("Close Month button enables with both checkboxes only", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/soft_close`);
      await expect(page.locator("h1:has-text('Soft Close Month')")).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(3000);
      // Button should start disabled
      const closeBtn = page.locator('[data-soft-close-target="closeButton"]');
      await expect(closeBtn).toBeDisabled();
      // Check both checkboxes
      await page.locator('[data-soft-close-target="reviewedTotals"]').check();
      await page.locator('[data-soft-close-target="finalConfirmation"]').check();
      // Button should now be enabled
      await expect(closeBtn).toBeEnabled({ timeout: 3000 });
    });

    test("Profile dropdown still shows Soft Close and Open Soft Close", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const sidebarDropdown = page.locator('aside [data-controller="dropdown"]');
      await sidebarDropdown.locator("button").first().click({ force: true });
      await expect(sidebarDropdown.locator("text=Soft Close").first()).toBeVisible({ timeout: 3000 });
      await expect(sidebarDropdown.locator("text=Open Soft Close").first()).toBeVisible({ timeout: 3000 });
    });

    test("Navigate other pages - no regressions", async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });
      await page.goto(`${BASE}/accounts`);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });
      await page.goto(`${BASE}/income_entries`);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });
    });

  });
}
