const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";
const AGENT = { email: "test@example.com", password: "password123" };

async function login(page, acct) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', acct.email);
  await page.fill('input[name="user[password]"]', acct.password);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Dashboard Card 2 — Pie Chart Flip", () => {
  test("Card 2 has pie icon in footer and Manage Accounts link", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    // Pie chart button should be visible
    const pieBtn = page.locator('button[aria-label="View pie chart"]');
    await expect(pieBtn).toBeVisible();

    // Manage Accounts link should be visible
    const manageLink = page.locator('a:has-text("Manage Accounts")');
    await expect(manageLink).toBeVisible();
  });

  test("Clicking pie icon flips card to show pie chart", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    // Click pie icon
    const pieBtn = page.locator('button[aria-label="View pie chart"]');
    await pieBtn.click();

    // Wait for flip animation
    await page.waitForTimeout(700);

    // "Flip back" button should be visible on back side
    const flipBackBtn = page.locator('button:has-text("Flip back")');
    await expect(flipBackBtn).toBeVisible();
  });

  test("Clicking Flip back returns to account list", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    // Flip to back
    await page.locator('button[aria-label="View pie chart"]').click();
    await page.waitForTimeout(700);

    // Flip back to front
    await page.locator('button:has-text("Flip back")').click();
    await page.waitForTimeout(700);

    // Pie icon should be visible again (front side)
    await expect(page.locator('button[aria-label="View pie chart"]')).toBeVisible();
    await expect(page.locator('a:has-text("Manage Accounts")')).toBeVisible();
  });
});
