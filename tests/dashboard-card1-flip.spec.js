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
  // Dismiss What's New overlay if present
  const overlay = page.locator('#whatsNewOverlay');
  if (await overlay.isVisible({ timeout: 2000 }).catch(() => false)) {
    await overlay.click({ position: { x: 5, y: 5 } });
    await overlay.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }
}

test.describe("Dashboard Card 1 — Spending by Category Flip", () => {
  test("Card 1 has pie icon in footer", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    const pieBtn = page.locator('button[aria-label="View spending by category"]');
    await expect(pieBtn).toBeVisible();
  });

  test("Clicking pie icon flips card to show category breakdown", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    // Click the pie icon
    const pieBtn = page.locator('button[aria-label="View spending by category"]');
    await pieBtn.click();

    // Wait for flip animation
    await page.waitForTimeout(700);

    // Back side header should be visible
    const backHeader = page.locator('h2:has-text("Spending by Category")');
    await expect(backHeader).toBeVisible();

    // Should have category rows with amounts and percentages
    const backContent = page.locator('[data-dashboard-target="card1BackContent"]');
    await expect(backContent).toBeVisible();
  });

  test("Clicking pie icon on back side flips back to front", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    // Flip to back
    const pieBtn = page.locator('button[aria-label="View spending by category"]');
    await pieBtn.click();
    await page.waitForTimeout(700);

    // Flip back
    const backBtn = page.locator('button[aria-label="Back to spending overview"]');
    await backBtn.click();
    await page.waitForTimeout(700);

    // Front side header should be visible
    const frontHeader = page.locator('h2:has-text("Spending Overview")');
    await expect(frontHeader).toBeVisible();
  });

  test("Card 1 flip does not affect Card 2 flip", async ({ page }) => {
    await login(page, AGENT);
    await page.waitForLoadState("networkidle");

    // Card 2 pie button should still work
    const card2Pie = page.locator('button[aria-label="View pie chart"]');
    await expect(card2Pie).toBeVisible();

    // Card 1 flip
    const card1Pie = page.locator('button[aria-label="View spending by category"]');
    await card1Pie.click();
    await page.waitForTimeout(700);

    // Card 2 should still be on front side
    await expect(card2Pie).toBeVisible();
  });
});
