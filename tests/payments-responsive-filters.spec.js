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

test.describe("CM2: Payments Responsive Sticky Header + Filter Layout", () => {

  test("Dual sticky headers remain visible while scrolling", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Both headers should be visible before scrolling
    const helloHeader = page.locator("text=Hello").first();
    await expect(helloHeader).toBeVisible();

    const paymentsHeader = page.locator("h1:has-text('Payments')");
    await expect(paymentsHeader).toBeVisible();

    // Add Payment button should be in the sticky sub-header
    const addBtn = page.locator('button:has-text("Add Payment")');
    await expect(addBtn).toBeVisible();

    // Scroll down significantly
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);

    // Both headers should still be visible (sticky)
    await expect(helloHeader).toBeVisible();
    await expect(paymentsHeader).toBeVisible();
    await expect(addBtn).toBeVisible();
  });

  test("All 5 filter controls are visible with labels", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // All filter controls visible
    await expect(page.locator('[data-payments-target="filterStartDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterEndDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterAccount"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterCategory"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterType"]')).toBeVisible();

    // Reset and Search buttons visible
    await expect(page.locator('button:has-text("Reset")')).toBeVisible();
    await expect(page.locator('button:has-text("Search")')).toBeVisible();
  });

  test("Reset and Search buttons are vertically aligned and same size", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const resetBox = await page.locator('button:has-text("Reset")').boundingBox();
    const searchBox = await page.locator('button:has-text("Search")').boundingBox();

    // Same x position (aligned, within 5px)
    expect(Math.abs(resetBox.x - searchBox.x)).toBeLessThan(5);

    // Same width (within 5px)
    expect(Math.abs(resetBox.width - searchBox.width)).toBeLessThan(5);

    // Same height (within 3px)
    expect(Math.abs(resetBox.height - searchBox.height)).toBeLessThan(3);

    // Reset should be above Search (smaller y value)
    expect(resetBox.y).toBeLessThan(searchBox.y);
  });

  test("Start Date and End Date never overlap at iPad width (768px)", async ({ page }) => {
    // Set viewport to iPad width
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const startDateBox = await page.locator('[data-payments-target="filterStartDate"]').boundingBox();
    const endDateBox = await page.locator('[data-payments-target="filterEndDate"]').boundingBox();

    // They should not overlap horizontally
    // Either end of startDate should be to the left of start of endDate,
    // or they should be on different rows (different y positions)
    const horizontalOverlap = startDateBox.x + startDateBox.width > endDateBox.x &&
                               endDateBox.x + endDateBox.width > startDateBox.x;
    const sameRow = Math.abs(startDateBox.y - endDateBox.y) < 10;

    if (sameRow) {
      // If on the same row, startDate right edge must be before endDate left edge (plus gap)
      expect(startDateBox.x + startDateBox.width).toBeLessThanOrEqual(endDateBox.x + 2);
    }
    // If on different rows, that's fine — no overlap by definition
  });

  test("No filter controls overlap at iPad width (768px)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const controls = [
      { name: "startDate", locator: '[data-payments-target="filterStartDate"]' },
      { name: "endDate", locator: '[data-payments-target="filterEndDate"]' },
      { name: "account", locator: '[data-payments-target="filterAccount"]' },
      { name: "category", locator: '[data-payments-target="filterCategory"]' },
      { name: "type", locator: '[data-payments-target="filterType"]' },
    ];

    const boxes = [];
    for (const ctrl of controls) {
      const box = await page.locator(ctrl.locator).boundingBox();
      boxes.push({ name: ctrl.name, ...box });
    }

    // Check no two controls on the same row overlap
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const sameRow = Math.abs(a.y - b.y) < 10;
        if (sameRow) {
          const overlap = a.x + a.width > b.x + 2 && b.x + b.width > a.x + 2;
          expect(overlap).toBe(false);
        }
      }
    }
  });

  test("Spending Type dropdown has reduced max-width", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const typeSelect = page.locator('[data-payments-target="filterType"]');
    const maxWidth = await typeSelect.evaluate((el) => {
      return window.getComputedStyle(el).maxWidth;
    });

    // Should have a max-width set (180px)
    expect(maxWidth).toBe("180px");
  });

  test("Sticky sub-header has shadow for visual separation", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const subHeader = page.locator('.sticky.top-14.z-20');
    await expect(subHeader).toBeVisible();

    const hasShadow = await subHeader.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.boxShadow !== "none";
    });
    expect(hasShadow).toBe(true);
  });
});
