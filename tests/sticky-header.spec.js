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

test.describe("Sticky Top Header", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("header bar has sticky positioning", async ({ page }) => {
    const header = page.locator('[data-controller="quotes"]');
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS("position", "sticky");
  });

  test("header stays visible after scrolling on dashboard", async ({ page }) => {
    const header = page.locator('[data-controller="quotes"]');
    await expect(header).toBeVisible();

    // Scroll down significantly
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(300);

    // Header should still be visible
    await expect(header).toBeVisible();
    const box = await header.boundingBox();
    // Header top should be at or near the top of viewport (within 60px for mobile pt-14)
    expect(box.y).toBeLessThanOrEqual(60);
  });

  test("header stays visible on payments page after scroll", async ({ page }) => {
    await page.goto(`${LOCAL_BASE}/payments`);
    const header = page.locator('[data-controller="quotes"]');
    await expect(header).toBeVisible();

    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);

    await expect(header).toBeVisible();
    const box = await header.boundingBox();
    expect(box.y).toBeLessThanOrEqual(60);
  });

  test("header has correct z-index to stay above content", async ({ page }) => {
    const header = page.locator('[data-controller="quotes"]');
    await expect(header).toBeVisible();
    // z-30 = z-index: 30
    const zIndex = await header.evaluate((el) => getComputedStyle(el).zIndex);
    expect(Number(zIndex)).toBeGreaterThanOrEqual(30);
  });

  test("header spans full width of main content area", async ({ page }) => {
    const header = page.locator('[data-controller="quotes"]');
    const main = page.locator("main");
    await expect(header).toBeVisible();

    const headerBox = await header.boundingBox();
    const mainBox = await main.boundingBox();
    // Header width should roughly match main width
    expect(headerBox.width).toBeGreaterThanOrEqual(mainBox.width * 0.95);
  });
});
