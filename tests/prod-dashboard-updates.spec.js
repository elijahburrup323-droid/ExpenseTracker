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

test.describe("Production Dashboard CM1 Updates", () => {
  test("elijahburrup323 - All 5 card updates present and month navigation works", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Card 1: No "Month to date", has month label and arrows
    const card1 = page.locator(".grid > div").first();
    await expect(card1).not.toContainText("Month to date");
    const card1Label = card1.locator('[data-dashboard-target="monthLabel"]');
    await expect(card1Label).toBeVisible();

    // Card 2: Has "Total:" in header
    const card2 = page.locator(".grid > div").nth(1);
    await expect(card2).toContainText("Total:");

    // Card 4: Has month label with arrows
    const card4 = page.locator(".grid > div").nth(3);
    await expect(card4.locator('[data-dashboard-target="monthLabel"]')).toBeVisible();

    // Card 5: Has month label with arrows
    const card5 = page.locator(".grid > div").nth(4);
    await expect(card5.locator('[data-dashboard-target="monthLabel"]')).toBeVisible();

    // Right arrows should be disabled at current month
    const nextBtns = page.locator('[data-dashboard-target="nextBtn"]');
    expect(await nextBtns.count()).toBe(3);
    await expect(nextBtns.first()).toHaveClass(/opacity-30/);

    // Navigate to prev month — all labels should sync
    await card1.locator('button[data-action="click->dashboard#prevMonth"]').click();
    await page.waitForTimeout(2000);
    const labels = page.locator('[data-dashboard-target="monthLabel"]');
    const t0 = await labels.nth(0).textContent();
    const t1 = await labels.nth(1).textContent();
    const t2 = await labels.nth(2).textContent();
    expect(t0).toBe(t1);
    expect(t1).toBe(t2);

    // Right arrows should now be enabled
    await expect(nextBtns.first()).not.toHaveClass(/opacity-30/);
  });

  test("djburrup - Dashboard card updates and month navigation", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Card 1: Month label visible, no "Month to date"
    const card1 = page.locator(".grid > div").first();
    await expect(card1).not.toContainText("Month to date");
    await expect(card1.locator('[data-dashboard-target="monthLabel"]')).toBeVisible();

    // Card 2: Total in header
    await expect(page.locator(".grid > div").nth(1)).toContainText("Total:");

    // Month navigation works
    await card1.locator('button[data-action="click->dashboard#prevMonth"]').click();
    await page.waitForTimeout(2000);

    // Navigate forward back to current month
    await card1.locator('button[data-action="click->dashboard#nextMonth"]').click();
    await page.waitForTimeout(2000);

    // Should be back at current month
    const now = new Date();
    const monthName = now.toLocaleString("en-US", { month: "long" });
    await expect(card1.locator('[data-dashboard-target="monthLabel"]')).toContainText(monthName);
  });
});
