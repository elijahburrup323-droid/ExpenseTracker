const { test, expect } = require("@playwright/test");

const BASE = "https://mybudgethq.com";
const EMAIL = "jacismith@home.net";
const PASSWORD = "luckydjb";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', EMAIL);
  await page.fill('input[name="user[password]"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/dashboard|mybudgethq\/?$/),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Production v1.3.69 — Transaction Engine deploy verification", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("1. Login succeeds and dashboard loads", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("2. Version is 1.3.69", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    const body = await page.content();
    expect(body).toContain("1.3.69");
  });

  test("3. Payments page loads without errors", async ({ page }) => {
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    // No 500 error
    const content = await page.content();
    expect(content).not.toContain("Internal Server Error");
    expect(content).not.toContain("We're sorry, but something went wrong");
  });

  test("4. Deposits page loads without errors", async ({ page }) => {
    await page.goto(`${BASE}/income_entries`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    const content = await page.content();
    expect(content).not.toContain("Internal Server Error");
    expect(content).not.toContain("We're sorry, but something went wrong");
  });

  test("5. Transfers page loads without errors", async ({ page }) => {
    await page.goto(`${BASE}/transfer_masters`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    const content = await page.content();
    expect(content).not.toContain("Internal Server Error");
    expect(content).not.toContain("We're sorry, but something went wrong");
  });

  test("6. Accounts page loads without errors", async ({ page }) => {
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    const content = await page.content();
    expect(content).not.toContain("Internal Server Error");
    expect(content).not.toContain("We're sorry, but something went wrong");
  });

  test("7. Documentation pages load (schema docs updated)", async ({ page }) => {
    await page.goto(`${BASE}/documentation/database-schema`);
    await page.waitForLoadState("networkidle");
    const content = await page.content();
    expect(content).toContain("transactions");
    expect(content).not.toContain("Internal Server Error");
  });

  test("8. Release notes show v1.3.69", async ({ page }) => {
    await page.goto(`${BASE}/documentation/release-notes`);
    await page.waitForLoadState("networkidle");
    const content = await page.content();
    expect(content).toContain("1.3.69");
    expect(content).toContain("Transaction Engine");
  });
});
