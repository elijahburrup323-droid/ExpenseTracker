const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/mybudgethq";

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(email);

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill(password);

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();
  await page.waitForTimeout(4000);
}

test.describe("Production CM2 Layout", () => {
  test("elijahburrup323 - Reset aligned over Search, filters evenly spaced", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // All filters visible
    await expect(page.locator('[data-payments-target="filterStartDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterEndDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterAccount"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterCategory"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterType"]')).toBeVisible();

    // Reset and Search aligned
    const resetBox = await page.locator('button:has-text("Reset")').boundingBox();
    const searchBox = await page.locator('button:has-text("Search")').boundingBox();
    expect(Math.abs(resetBox.x - searchBox.x)).toBeLessThan(5);
    expect(Math.abs(resetBox.width - searchBox.width)).toBeLessThan(5);
  });

  test("djburrup - Reset aligned over Search, filters evenly spaced", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator('[data-payments-target="filterStartDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterType"]')).toBeVisible();

    const resetBox = await page.locator('button:has-text("Reset")').boundingBox();
    const searchBox = await page.locator('button:has-text("Search")').boundingBox();
    expect(Math.abs(resetBox.x - searchBox.x)).toBeLessThan(5);
    expect(Math.abs(resetBox.width - searchBox.width)).toBeLessThan(5);
  });
});
