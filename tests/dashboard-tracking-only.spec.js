const { test, expect } = require("@playwright/test");

const LOCAL_BASE = "http://localhost:3000/expensetracker";

async function login(page) {
  await page.goto(`${LOCAL_BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', "test@example.com");
  await page.fill('input[name="user[password]"]', "password123");
  await Promise.all([
    page.waitForURL(`${LOCAL_BASE}/dashboard`),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
}

test.describe("Dashboard Card 1: Tracking-Only Mode", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
  });

  test("shows Spending Overview title instead of Budget Overview", async ({ page }) => {
    const heading = page.locator("h2:has-text('Spending Overview')");
    await expect(heading).toBeVisible();
    // Should NOT show "Budget Overview"
    await expect(page.locator("h2:has-text('Budget Overview')")).not.toBeVisible();
  });

  test("shows spent this month amount", async ({ page }) => {
    // Should show "spent this month" text
    await expect(page.locator("text=spent this month")).toBeVisible();
    // Should show "Month to date" subtitle
    await expect(page.locator("text=Month to date")).toBeVisible();
  });

  test("does NOT show budget plan terminology", async ({ page }) => {
    // Card 1 should not contain budget/plan/left terminology
    const card = page.locator("h2:has-text('Spending Overview')").locator("..");
    const cardText = await card.textContent();
    expect(cardText).not.toContain("plan");
    expect(cardText).not.toContain("left");
    expect(cardText).not.toContain("$6,300");
  });

  test("shows donut chart with Spent label in center", async ({ page }) => {
    const card = page.locator("h2:has-text('Spending Overview')").locator("..");
    // Should have "Spent" text in the donut center
    await expect(card.locator("text=Spent").first()).toBeVisible();
    // Should have an SVG donut chart
    await expect(card.locator("svg")).toBeVisible();
  });

  test("View Details link navigates to Payments with current month filter", async ({ page }) => {
    const viewDetails = page.locator("h2:has-text('Spending Overview')").locator("..").locator("a:has-text('View Details')");
    await expect(viewDetails).toBeVisible();

    // Click View Details
    await viewDetails.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Should be on the payments page
    expect(page.url()).toContain("/payments");

    // The URL should have start_date and end_date params
    expect(page.url()).toContain("start_date=");
    expect(page.url()).toContain("end_date=");

    // The date filter fields should be populated
    const startDate = await page.locator('[data-payments-target="filterStartDate"]').inputValue();
    const endDate = await page.locator('[data-payments-target="filterEndDate"]').inputValue();
    expect(startDate).not.toBe("");
    expect(endDate).not.toBe("");
  });
});
