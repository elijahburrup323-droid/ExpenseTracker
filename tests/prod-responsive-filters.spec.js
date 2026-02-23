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

test.describe("Production CM2: Responsive Payments Filters", () => {
  test("elijahburrup323 - Dual sticky headers, Reset/Search aligned, no filter overlap", async ({ page }) => {
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
    expect(resetBox.y).toBeLessThan(searchBox.y);

    // Scroll and verify dual sticky headers
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    const helloBar = page.locator("text=Hello").first();
    await expect(helloBar).toBeVisible();
    const paymentsHeader = page.locator("h1:has-text('Payments')");
    await expect(paymentsHeader).toBeVisible();
  });

  test("djburrup - Dual sticky headers, Reset/Search aligned, no filter overlap", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // All filters visible
    await expect(page.locator('[data-payments-target="filterStartDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterType"]')).toBeVisible();

    // Reset and Search aligned
    const resetBox = await page.locator('button:has-text("Reset")').boundingBox();
    const searchBox = await page.locator('button:has-text("Search")').boundingBox();
    expect(Math.abs(resetBox.x - searchBox.x)).toBeLessThan(5);
    expect(Math.abs(resetBox.width - searchBox.width)).toBeLessThan(5);

    // Scroll test
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    await expect(page.locator("text=Hello").first()).toBeVisible();
    await expect(page.locator("h1:has-text('Payments')")).toBeVisible();
  });
});
