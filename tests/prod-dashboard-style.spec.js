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

test.describe("Production CM6: Dashboard Preserve Style", () => {
  test("elijahburrup323 - Original styling preserved with content changes", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 6 cards in grid
    const cards = page.locator(".grid > div");
    expect(await cards.count()).toBe(6);

    // Card 1: No "Month to date", has month label, has View Details
    const card1 = cards.first();
    await expect(card1).not.toContainText("Month to date");
    await expect(card1.locator('[data-dashboard-target="monthLabel"]')).toBeVisible();
    await expect(card1).toContainText("View Details");
    // Original purple donut
    await expect(card1.locator('circle[stroke="#a855f7"]')).toHaveCount(1);

    // Card 2: Has Total, original Accounts styling
    await expect(cards.nth(1)).toContainText("Total:");
    await expect(cards.nth(1)).toContainText("Accounts");

    // Card 3: Net Worth with purple gradient
    await expect(cards.nth(2)).toContainText("Net Worth");

    // Card 4: Month arrows and original content
    const card4 = cards.nth(3);
    await expect(card4.locator('[data-dashboard-target="monthLabel"]')).toBeVisible();
    await expect(card4).toContainText("Beginning Balance");
    await expect(card4).toContainText("Current Balance");

    // Card 5: Month arrows and View All link
    const card5 = cards.nth(4);
    await expect(card5.locator('[data-dashboard-target="monthLabel"]')).toBeVisible();
    await expect(card5).toContainText("View All");

    // Card 6: Buckets unchanged
    await expect(cards.nth(5)).toContainText("Buckets");

    // Month navigation works
    await card1.locator('button[data-action="click->dashboard#prevMonth"]').click();
    await page.waitForTimeout(2000);
    // Still has View Details after re-render
    await expect(card1).toContainText("View Details");
  });

  test("djburrup - Dashboard styling and month navigation preserved", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Card containers use original classes
    const cards = page.locator(".grid > div");
    for (let i = 0; i < 6; i++) {
      const cls = await cards.nth(i).getAttribute("class");
      expect(cls).toContain("rounded-xl");
      expect(cls).toContain("shadow-sm");
      expect(cls).toContain("p-6");
    }

    // All 3 month labels visible
    const labels = page.locator('[data-dashboard-target="monthLabel"]');
    expect(await labels.count()).toBe(3);

    // Navigate prev month — all labels sync
    const card1 = cards.first();
    await card1.locator('button[data-action="click->dashboard#prevMonth"]').click();
    await page.waitForTimeout(2000);
    const t0 = await labels.nth(0).textContent();
    const t1 = await labels.nth(1).textContent();
    const t2 = await labels.nth(2).textContent();
    expect(t0).toBe(t1);
    expect(t1).toBe(t2);
  });
});
