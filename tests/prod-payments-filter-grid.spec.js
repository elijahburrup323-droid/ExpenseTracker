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

test.describe("Production Payments Filter Grid & Sticky Header", () => {
  test("elijahburrup323 - CSS Grid filter bar with sticky header", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Sticky sub-header visible
    const subHeader = page.locator(".sticky.top-14.z-20");
    await expect(subHeader).toBeVisible();
    await expect(subHeader).toContainText("Payments");

    // Filter bar uses CSS Grid
    const filterGrid = page.locator(".payments-filter-grid");
    await expect(filterGrid).toBeVisible();
    const display = await filterGrid.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe("grid");

    // All filter controls present
    await expect(page.locator('[data-payments-target="filterStartDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterEndDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterAccount"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterCategory"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterType"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterSearch"]')).toBeVisible();

    // Dropdowns have ellipsis
    const selects = page.locator(".payments-filter-grid select");
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const overflow = await selects.nth(i).evaluate(el => getComputedStyle(el).textOverflow);
      expect(overflow).toBe("ellipsis");
    }

    // Scroll and verify sticky header still visible
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    await expect(subHeader).toBeVisible();
  });

  test("djburrup - Filter grid layout and functionality", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Filter grid is CSS Grid
    const filterGrid = page.locator(".payments-filter-grid");
    const display = await filterGrid.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe("grid");

    // Reset and Search buttons exist and have same height
    const resetBtn = page.locator(".pf-reset button");
    const searchBtn = page.locator(".pf-search-btn button");
    const resetBox = await resetBtn.boundingBox();
    const searchBox = await searchBtn.boundingBox();
    expect(Math.abs(resetBox.height - searchBox.height)).toBeLessThan(2);

    // Filters still work — select a date range and search
    await page.locator('[data-payments-target="filterStartDate"]').fill("2024-01-01");
    await page.locator('[data-payments-target="filterEndDate"]').fill("2026-12-31");
    await page.locator(".pf-search-btn button").click();
    await page.waitForTimeout(2000);

    // Reset clears filters
    await resetBtn.click();
    await page.waitForTimeout(1000);
    const startVal = await page.locator('[data-payments-target="filterStartDate"]').inputValue();
    expect(startVal).toBe("");
  });
});
