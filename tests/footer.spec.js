const { test, expect } = require("@playwright/test");

const LOCAL_BASE = "http://localhost:3000/expensetracker";

test.describe("Global Footer", () => {
  test.describe("Unauthenticated pages", () => {
    test("footer is visible on login page", async ({ page }) => {
      await page.goto(`${LOCAL_BASE}/users/sign_in`);
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      await expect(footer).toContainText("Contact");
      await expect(footer).toContainText("Help");
      await expect(footer).toContainText("Terms");
      await expect(footer).toContainText("Privacy");
      await expect(footer).toContainText("BudgetHQ");
      await expect(footer).toContainText("2026");
    });

    test("footer is visible on signup page", async ({ page }) => {
      await page.goto(`${LOCAL_BASE}/users/sign_up`);
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      await expect(footer).toContainText("Contact");
    });
  });

  test.describe("Authenticated pages", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${LOCAL_BASE}/users/sign_in`);
      await page.fill('input[name="user[email]"]', "test@example.com");
      await page.fill('input[name="user[password]"]', "password123");
      await Promise.all([
        page.waitForURL(`${LOCAL_BASE}/dashboard`),
        page.click('input[type="submit"], button[type="submit"]'),
      ]);
    });

    test("footer is visible on dashboard", async ({ page }) => {
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      await expect(footer).toContainText("Contact");
      await expect(footer).toContainText("Help");
      await expect(footer).toContainText("Terms");
      await expect(footer).toContainText("Privacy");
      await expect(footer).toContainText("BudgetHQ");
    });

    test("footer is visible on accounts page", async ({ page }) => {
      await page.goto(`${LOCAL_BASE}/accounts`);
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      await expect(footer).toContainText("Contact");
    });

    test("footer is visible on payments page", async ({ page }) => {
      await page.goto(`${LOCAL_BASE}/payments`);
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      await expect(footer).toContainText("Contact");
    });

    test("footer sticks to bottom on short content pages", async ({ page }) => {
      await page.goto(`${LOCAL_BASE}/spending_types`);
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      const footerBox = await footer.boundingBox();
      const viewportSize = page.viewportSize();
      // Footer should be at or near the bottom of the viewport
      expect(footerBox.y + footerBox.height).toBeGreaterThanOrEqual(
        viewportSize.height - 50
      );
    });

    test("footer has correct styling", async ({ page }) => {
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      // Check centered text
      await expect(footer).toHaveCSS("text-align", "center");
      // Check the paragraph font size is 13px
      const p = footer.locator("p");
      await expect(p).toHaveCSS("font-size", "13px");
    });

    test("footer links have correct hrefs", async ({ page }) => {
      const footer = page.locator("footer");
      await expect(footer.locator('a[href="#contact"]')).toBeVisible();
      await expect(footer.locator('a[href="#help"]')).toBeVisible();
      await expect(footer.locator('a[href="#terms"]')).toBeVisible();
      await expect(footer.locator('a[href="#privacy"]')).toBeVisible();
    });
  });
});
