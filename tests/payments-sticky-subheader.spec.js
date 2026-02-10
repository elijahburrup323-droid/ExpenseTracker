const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

test.describe("Payments Sticky Subheader", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/users/sign_in`);
    await page.fill('input[name="user[email]"]', "elijahburrup323@gmail.com");
    await page.fill('input[name="user[password]"]', "Eli624462!");
    await Promise.all([
      page.waitForURL("**/dashboard**"),
      page.click('input[type="submit"], button[type="submit"]'),
    ]);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
  });

  test("Payments subheader has sticky positioning", async ({ page }) => {
    // The subheader containing "Payments" title and "Add Payment" button
    const subheader = page.locator(".sticky.top-14.z-20");
    await expect(subheader).toBeVisible();

    // Verify it contains the title and Add Payment button
    await expect(subheader.locator("h1")).toContainText("Payments");
    await expect(subheader.locator('button:has-text("Add Payment")')).toBeVisible();
  });

  test("Subheader stays visible when scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    await page.waitForTimeout(500);

    // Scroll down significantly
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(500);

    // The subheader should still be visible
    const subheader = page.locator(".sticky.top-14.z-20");
    await expect(subheader).toBeVisible();

    // Add Payment button should still be visible
    const addBtn = page.locator('[data-payments-target="addButton"]');
    await expect(addBtn).toBeVisible();

    // Verify the button is in the viewport (not scrolled off)
    const btnBox = await addBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    expect(btnBox.y).toBeGreaterThanOrEqual(0);
    expect(btnBox.y).toBeLessThan(600); // within viewport height
  });

  test("Global header is above subheader in z-index", async ({ page }) => {
    // Global header has z-30, subheader has z-20
    const globalHeader = page.locator(".sticky.top-0.z-30");
    await expect(globalHeader).toBeVisible();

    const subheader = page.locator(".sticky.top-14.z-20");
    await expect(subheader).toBeVisible();

    // Verify z-index ordering via computed styles
    const globalZ = await globalHeader.evaluate(el => getComputedStyle(el).zIndex);
    const subZ = await subheader.evaluate(el => getComputedStyle(el).zIndex);
    expect(parseInt(globalZ)).toBeGreaterThan(parseInt(subZ));
  });

  test("No overflow-x-hidden on payments container (Safari sticky fix)", async ({ page }) => {
    // The payments controller div should NOT have overflow-x-hidden
    // because it breaks position:sticky in Safari
    const container = page.locator('[data-controller="payments"]');
    const overflowX = await container.evaluate(el => getComputedStyle(el).overflowX);
    expect(overflowX).not.toBe("hidden");
  });

  test("Subheader does not overlap global header", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    await page.waitForTimeout(500);

    // Scroll down to trigger sticky
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);

    const globalHeader = page.locator(".sticky.top-0.z-30");
    const subheader = page.locator(".sticky.top-14.z-20");

    const globalBox = await globalHeader.boundingBox();
    const subBox = await subheader.boundingBox();

    // Subheader top should be at or below global header bottom
    expect(subBox.y).toBeGreaterThanOrEqual(globalBox.y + globalBox.height - 2); // 2px tolerance
  });
});
