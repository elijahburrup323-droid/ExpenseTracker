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

test.describe("Payments Filter Grid & Sticky Header", () => {
  test("Sticky sub-header is visible and stacks below Hello bar", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Payments sub-header should exist and be sticky
    const subHeader = page.locator(".sticky.top-14.z-20");
    await expect(subHeader).toBeVisible();
    await expect(subHeader).toContainText("Payments");

    // Add Payment button should be in the sub-header
    const addBtn = subHeader.locator("button", { hasText: "Add Payment" });
    await expect(addBtn).toBeVisible();
  });

  test("Filter bar uses CSS Grid layout", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter grid should use CSS Grid
    const filterGrid = page.locator(".payments-filter-grid");
    await expect(filterGrid).toBeVisible();
    const display = await filterGrid.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe("grid");
  });

  test("All 8 filter controls are present", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Start Date
    await expect(page.locator('[data-payments-target="filterStartDate"]')).toBeVisible();
    // End Date
    await expect(page.locator('[data-payments-target="filterEndDate"]')).toBeVisible();
    // Account dropdown
    await expect(page.locator('[data-payments-target="filterAccount"]')).toBeVisible();
    // Category dropdown
    await expect(page.locator('[data-payments-target="filterCategory"]')).toBeVisible();
    // Spending Type dropdown
    await expect(page.locator('[data-payments-target="filterType"]')).toBeVisible();
    // Search input
    await expect(page.locator('[data-payments-target="filterSearch"]')).toBeVisible();
    // Reset button
    await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
    // Search button
    await expect(page.getByRole("button", { name: "Search", exact: true })).toBeVisible();
  });

  test("At tablet width (1024px), filter is 2-row, 4-column grid", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const filterGrid = page.locator(".payments-filter-grid");
    const display = await filterGrid.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe("grid");

    // Reset button should be in row 1 (same Y as Start Date)
    const startDateBox = await page.locator(".pf-start").boundingBox();
    const resetBox = await page.locator(".pf-reset").boundingBox();
    // They should be on the same row (similar Y position, within 5px)
    expect(Math.abs(startDateBox.y - resetBox.y)).toBeLessThan(5);

    // Search button should be in row 2 (same Y as Category)
    const categoryBox = await page.locator(".pf-category").boundingBox();
    const searchBtnBox = await page.locator(".pf-search-btn").boundingBox();
    expect(Math.abs(categoryBox.y - searchBtnBox.y)).toBeLessThan(5);

    // Reset and Search buttons should be in the same column (same X)
    expect(Math.abs(resetBox.x - searchBtnBox.x)).toBeLessThan(5);
  });

  test("At tablet width (834px iPad), no controls overlap", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Get all grid items and check for overlaps
    const items = page.locator(".payments-filter-grid > div");
    const count = await items.count();
    const boxes = [];
    for (let i = 0; i < count; i++) {
      const box = await items.nth(i).boundingBox();
      if (box) boxes.push(box);
    }

    // Check no two boxes overlap
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlaps =
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y;
        expect(overlaps).toBe(false);
      }
    }
  });

  test("Reset and Search buttons have identical width and height", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const resetBtn = page.locator(".pf-reset button");
    const searchBtn = page.locator(".pf-search-btn button");

    const resetBox = await resetBtn.boundingBox();
    const searchBox = await searchBtn.boundingBox();

    // Same width (within 2px tolerance)
    expect(Math.abs(resetBox.width - searchBox.width)).toBeLessThan(2);
    // Same height
    expect(Math.abs(resetBox.height - searchBox.height)).toBeLessThan(2);
  });

  test("Dropdowns have text-overflow ellipsis", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const selects = page.locator(".payments-filter-grid select");
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const overflow = await selects.nth(i).evaluate(el => getComputedStyle(el).textOverflow);
      expect(overflow).toBe("ellipsis");
    }
  });

  test("Sticky headers remain visible while scrolling", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);

    // Both headers should still be visible
    const subHeader = page.locator(".sticky.top-14.z-20");
    await expect(subHeader).toBeVisible();
    await expect(subHeader).toContainText("Payments");
  });
});
