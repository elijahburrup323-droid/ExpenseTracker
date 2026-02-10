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

test.describe("Stacked Sticky Headers on Payments", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${LOCAL_BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
  });

  test("Hello DJ bar stays at top after scrolling", async ({ page }) => {
    const helloBar = page.locator('[data-controller="quotes"]');
    await expect(helloBar).toBeVisible();

    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);

    await expect(helloBar).toBeVisible();
    const box = await helloBar.boundingBox();
    expect(box.y).toBeLessThanOrEqual(10);
  });

  test("Payments toolbar stays visible below Hello DJ after scrolling", async ({ page }) => {
    const toolbar = page.locator("h1:has-text('Payments')").locator("..");
    await expect(toolbar).toBeVisible();

    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);

    // The toolbar should still be visible
    const paymentsHeading = page.locator("h1:has-text('Payments')");
    await expect(paymentsHeading).toBeVisible();

    // And it should be below the Hello DJ bar (approx 56px from top)
    const headingBox = await paymentsHeading.boundingBox();
    expect(headingBox.y).toBeGreaterThanOrEqual(40);
    expect(headingBox.y).toBeLessThanOrEqual(120);
  });

  test("Add Payment button stays visible after scrolling", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Payment")');
    await expect(addBtn).toBeVisible();

    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);

    await expect(addBtn).toBeVisible();
    const box = await addBtn.boundingBox();
    // Should be near the top (within the sticky area)
    expect(box.y).toBeLessThanOrEqual(150);
  });

  test("both sticky headers have solid backgrounds (no content bleed-through)", async ({ page }) => {
    const helloBar = page.locator('[data-controller="quotes"]');
    const bgColor = await helloBar.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Should not be transparent
    expect(bgColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(bgColor).not.toBe("transparent");
  });

  test("Hello DJ bar has higher z-index than Payments toolbar", async ({ page }) => {
    // Compare z-index directly using known selectors
    const result = await page.evaluate(() => {
      const helloBar = document.querySelector('[data-controller="quotes"]');
      // The Payments toolbar is the sticky div containing the h1 with "Payments"
      const allSticky = [...document.querySelectorAll('*')].filter(
        el => getComputedStyle(el).position === 'sticky'
      );
      // Find the one that contains "Payments" h1 but is NOT the quotes bar
      const paymentsBar = allSticky.find(el =>
        el !== helloBar && el.querySelector('h1')
      );
      if (!helloBar || !paymentsBar) return null;
      return {
        helloZ: Number(getComputedStyle(helloBar).zIndex) || 0,
        paymentsZ: Number(getComputedStyle(paymentsBar).zIndex) || 0
      };
    });
    expect(result).not.toBeNull();
    expect(result.helloZ).toBeGreaterThan(result.paymentsZ);
  });
});
