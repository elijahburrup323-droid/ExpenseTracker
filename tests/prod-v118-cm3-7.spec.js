const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/mybudgethq";
const ACCT = { email: "elijahburrup323@gmail.com", password: "Eli624462!" };

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', ACCT.email);
  await page.fill('input[name="user[password]"]', ACCT.password);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

async function dismissWhatsNew(page) {
  try {
    const popup = page.locator("[data-dashboard-target='whatsNewModal']");
    if (await popup.isVisible({ timeout: 2000 })) {
      await popup.locator("button", { hasText: "Close" }).click();
      await popup.waitFor({ state: "hidden" });
    }
  } catch (e) {}
}

test.describe("v1.1.8 — CM-3/4/5/6/7 Production Tests", () => {
  test("QA banner shows v1.1.8", async ({ page }) => {
    await login(page);
    await dismissWhatsNew(page);
    const banner = page.locator("text=QA MODE");
    await expect(banner.first()).toBeVisible({ timeout: 5000 });
    const body = await page.content();
    expect(body).toContain("1.1.8");
  });

  test("CM-3: Payments page has delete blocked modal markup", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    // Verify delete blocked modal target exists in DOM
    const modal = page.locator("[data-payments-target='deleteBlockedModal']");
    await expect(modal).toHaveCount(1);
    // Verify it's hidden by default
    await expect(modal).toHaveClass(/hidden/);
  });

  test("CM-4: Deposits page has date warning and delete blocked modals", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_entries`);
    await page.waitForLoadState("networkidle");
    // Date warning modal
    const dateWarning = page.locator("[data-income-entries-target='dateWarningModal']");
    await expect(dateWarning).toHaveCount(1);
    await expect(dateWarning).toHaveClass(/hidden/);
    // Delete blocked modal
    const deleteBlocked = page.locator("[data-income-entries-target='deleteBlockedModal']");
    await expect(deleteBlocked).toHaveCount(1);
    await expect(deleteBlocked).toHaveClass(/hidden/);
    // Total text is enlarged
    const total = page.locator("[data-income-entries-target='total']");
    await expect(total).toHaveCount(1);
  });

  test("CM-5: Accounts page has month closed modal", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");
    const modal = page.locator("[data-accounts-target='monthClosedModal']");
    await expect(modal).toHaveCount(1);
    await expect(modal).toHaveClass(/hidden/);
    // Total text is present
    const total = page.locator("[data-accounts-target='total']");
    await expect(total).toHaveCount(1);
  });

  test("CM-6: Transfers page has date warning and delete blocked modals", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/transfer_masters`);
    await page.waitForLoadState("networkidle");
    // Date warning modal
    const dateWarning = page.locator("[data-transfer-masters-target='dateWarningModal']");
    await expect(dateWarning).toHaveCount(1);
    await expect(dateWarning).toHaveClass(/hidden/);
    // Delete blocked modal
    const deleteBlocked = page.locator("[data-transfer-masters-target='deleteBlockedModal']");
    await expect(deleteBlocked).toHaveCount(1);
    await expect(deleteBlocked).toHaveClass(/hidden/);
  });

  test("CM-7: Open month API returns has_data and reopen_count fields", async ({ page }) => {
    await login(page);
    const res = await page.goto(`${BASE}/api/open_month_master`, {
      headers: { "Accept": "application/json" },
    });
    const json = await res.json();
    console.log("Open month:", JSON.stringify(json, null, 2));
    // Verify new fields exist
    expect(json).toHaveProperty("has_data");
    expect(json).toHaveProperty("reopen_count");
    expect(typeof json.has_data).toBe("boolean");
    expect(typeof json.reopen_count).toBe("number");
  });

  test("CM-7: Reopen endpoint exists and responds", async ({ page }) => {
    await login(page);
    // Navigate to dashboard first to have a proper HTML page with CSRF meta tag
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await dismissWhatsNew(page);

    // Call reopen via page context (has CSRF token in meta)
    const response = await page.evaluate(async (baseUrl) => {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const token = csrfMeta ? csrfMeta.getAttribute("content") : "";
      const res = await fetch(`${baseUrl}/api/open_month_master/reopen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": token,
        },
      });
      return { status: res.status, body: await res.json() };
    }, BASE);

    console.log("Reopen response:", JSON.stringify(response, null, 2));
    // Should be 200 (reopened) or 422 (blocked because has_data or other error)
    expect([200, 422]).toContain(response.status);
  });

  test("Payments page loads and renders table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    const table = page.locator("[data-payments-target='tableBody']");
    await expect(table).toBeVisible();
  });

  test("Deposits page loads and renders table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_entries`);
    await page.waitForLoadState("networkidle");
    const table = page.locator("[data-income-entries-target='tableBody']");
    await expect(table).toBeVisible();
  });

  test("Accounts page loads and renders table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");
    const table = page.locator("[data-accounts-target='tableBody']");
    await expect(table).toBeVisible();
  });

  test("Transfers page loads and renders table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/transfer_masters`);
    await page.waitForLoadState("networkidle");
    const table = page.locator("[data-transfer-masters-target='tableBody']");
    await expect(table).toBeVisible();
  });
});
