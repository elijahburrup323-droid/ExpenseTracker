const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill("test@example.com");

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill("password123");

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();
  await page.waitForTimeout(3000);
}

test.describe("Dashboard Updates - CM1", () => {
  test("Card 1: Shows month/year instead of Month To Date, has arrows", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Should NOT show "Month to date"
    const card1 = page.locator(".grid > div").first();
    await expect(card1).not.toContainText("Month to date");

    // Should show current month/year (e.g., "February 2026")
    const now = new Date();
    const monthName = now.toLocaleString("en-US", { month: "long" });
    const yearStr = now.getFullYear().toString();
    const monthLabel = card1.locator('[data-dashboard-target="monthLabel"]');
    await expect(monthLabel).toContainText(monthName);
    await expect(monthLabel).toContainText(yearStr);

    // Should have left and right arrow buttons
    const prevBtn = card1.locator('button[data-action="click->dashboard#prevMonth"]');
    const nextBtn = card1.locator('button[data-action="click->dashboard#nextMonth"]');
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
  });

  test("Card 1: Month navigation works - prev month loads different data", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click prev month
    const card1 = page.locator(".grid > div").first();
    const prevBtn = card1.locator('button[data-action="click->dashboard#prevMonth"]');
    await prevBtn.click();
    await page.waitForTimeout(1500);

    // Month label should change to previous month
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const prevMonthName = now.toLocaleString("en-US", { month: "long" });
    const monthLabel = card1.locator('[data-dashboard-target="monthLabel"]');
    await expect(monthLabel).toContainText(prevMonthName);
  });

  test("Card 2: Shows Total on the Accounts header line", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Card 2 is the second card
    const card2 = page.locator(".grid > div").nth(1);
    await expect(card2).toContainText("Accounts");
    await expect(card2).toContainText("Total:");
  });

  test("Card 4: Shows month/year with arrows", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Card 4 is the 4th card (index 3)
    const card4 = page.locator(".grid > div").nth(3);
    await expect(card4).toContainText("Income & Spending");

    // Should show current month label
    const monthLabel = card4.locator('[data-dashboard-target="monthLabel"]');
    const now = new Date();
    const monthName = now.toLocaleString("en-US", { month: "long" });
    await expect(monthLabel).toContainText(monthName);

    // Should have arrows
    const prevBtn = card4.locator('button[data-action="click->dashboard#prevMonth"]');
    const nextBtn = card4.locator('button[data-action="click->dashboard#nextMonth"]');
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
  });

  test("Card 5: Shows month/year with arrows in header", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Card 5 is the 5th card (index 4)
    const card5 = page.locator(".grid > div").nth(4);
    await expect(card5).toContainText("Recent Activity");

    // Should show current month label
    const monthLabel = card5.locator('[data-dashboard-target="monthLabel"]');
    const now = new Date();
    const monthName = now.toLocaleString("en-US", { month: "long" });
    await expect(monthLabel).toContainText(monthName);

    // Should have arrows
    const prevBtn = card5.locator('button[data-action="click->dashboard#prevMonth"]');
    const nextBtn = card5.locator('button[data-action="click->dashboard#nextMonth"]');
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
  });

  test("Cards 1, 4, 5: Right arrow disabled at current month", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // All nextBtn should have opacity-30 class (disabled visual)
    const nextBtns = page.locator('[data-dashboard-target="nextBtn"]');
    const count = await nextBtns.count();
    expect(count).toBe(3); // Cards 1, 4, 5

    for (let i = 0; i < count; i++) {
      await expect(nextBtns.nth(i)).toHaveClass(/opacity-30/);
    }
  });

  test("Month navigation syncs all cards", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click prev on Card 1
    const card1 = page.locator(".grid > div").first();
    await card1.locator('button[data-action="click->dashboard#prevMonth"]').click();
    await page.waitForTimeout(1500);

    // All three month labels should show the same previous month
    const labels = page.locator('[data-dashboard-target="monthLabel"]');
    const count = await labels.count();
    expect(count).toBe(3);

    const text0 = await labels.nth(0).textContent();
    const text1 = await labels.nth(1).textContent();
    const text2 = await labels.nth(2).textContent();
    expect(text0).toBe(text1);
    expect(text1).toBe(text2);

    // Next buttons should no longer be disabled (we're in past month)
    const nextBtns = page.locator('[data-dashboard-target="nextBtn"]');
    for (let i = 0; i < 3; i++) {
      await expect(nextBtns.nth(i)).not.toHaveClass(/opacity-30/);
    }
  });
});
