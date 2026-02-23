const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/mybudgethq";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill("test@test.com");

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.waitFor({ state: "visible" });
  await passwordInput.click();
  await passwordInput.fill("password123");

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();

  await page.waitForTimeout(4000);
}

test.describe.serial("Generate Data Button & Reset Layout", () => {
  test("Spending Types has Generate Data button", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("h1")).toHaveText("Spending Types");

    const generateBtn = page.locator('button:has-text("Generate Data")');
    await expect(generateBtn).toBeVisible();

    const addBtn = page.locator('button:has-text("Add Spending Type")');
    await expect(addBtn).toBeVisible();

    await page.screenshot({ path: "test-results/spending-types-generate-btn.png", fullPage: true });
  });

  test("Account Types has Generate Data button", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/account_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("h1")).toHaveText("Account Types");

    const generateBtn = page.locator('button:has-text("Generate Data")');
    await expect(generateBtn).toBeVisible();

    await page.screenshot({ path: "test-results/account-types-generate-btn.png", fullPage: true });
  });

  test("Spending Categories has Generate Data button", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("h1")).toHaveText("Spending Categories");

    const generateBtn = page.locator('button:has-text("Generate Data")');
    await expect(generateBtn).toBeVisible();

    await page.screenshot({ path: "test-results/spending-categories-generate-btn.png", fullPage: true });
  });

  test("Accounts has Generate Data button", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("h1")).toHaveText("Accounts");

    const generateBtn = page.locator('button:has-text("Generate Data")');
    await expect(generateBtn).toBeVisible();

    await page.screenshot({ path: "test-results/accounts-generate-btn.png", fullPage: true });
  });

  test("Payments has Generate Data button and correct Reset position", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("h1")).toHaveText("Payments");

    const generateBtn = page.locator('button:has-text("Generate Data")');
    await expect(generateBtn).toBeVisible();

    const resetBtn = page.locator('button:has-text("Reset")');
    await expect(resetBtn).toBeVisible();

    const searchBtn = page.locator('button:has-text("Search")');
    await expect(searchBtn).toBeVisible();

    // Reset should be above Search (lower Y value)
    const resetBox = await resetBtn.boundingBox();
    const searchBox = await searchBtn.boundingBox();
    console.log(`Reset button: x=${resetBox.x}, y=${resetBox.y}, w=${resetBox.width}, h=${resetBox.height}`);
    console.log(`Search button: x=${searchBox.x}, y=${searchBox.y}, w=${searchBox.width}, h=${searchBox.height}`);

    expect(resetBox.y).toBeLessThan(searchBox.y);

    // Both should be roughly the same width
    expect(Math.abs(resetBox.width - searchBox.width)).toBeLessThan(10);

    await page.screenshot({ path: "test-results/payments-generate-reset.png", fullPage: true });
  });
});
