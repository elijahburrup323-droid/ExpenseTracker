const { test, expect } = require("@playwright/test");

const PROD_BASE = "https://djburrup.com/mybudgethq";

const ACCOUNTS = [
  { email: "elijahburrup323@gmail.com", password: "Eli624462!" },
  { email: "djburrup@gmail.com", password: "luckydjb" },
];

async function login(page, email, password) {
  await page.goto(`${PROD_BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await Promise.all([
    page.waitForURL(`${PROD_BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Production: Payments Sticky Subheader", () => {
  for (const account of ACCOUNTS) {
    test(`Sticky subheader works for ${account.email}`, async ({ page }) => {
      await login(page, account.email, account.password);
      await page.goto(`${PROD_BASE}/payments`);
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1024, height: 600 });
      await page.waitForTimeout(2000);

      // Subheader should be visible with sticky positioning
      const subheader = page.locator(".sticky.top-14.z-20");
      await expect(subheader).toBeVisible();
      await expect(subheader.locator("h1")).toContainText("Payments");
      await expect(subheader.locator('button:has-text("Add Payment")')).toBeVisible();

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(500);

      // Subheader and Add Payment should still be visible after scrolling
      await expect(subheader).toBeVisible();
      const addBtn = subheader.locator('button:has-text("Add Payment")');
      await expect(addBtn).toBeVisible();
      const btnBox = await addBtn.boundingBox();
      expect(btnBox).not.toBeNull();
      expect(btnBox.y).toBeLessThan(600);

      // No overflow-x-hidden on payments container
      const container = page.locator('[data-controller="payments"]');
      const overflowX = await container.evaluate(el => getComputedStyle(el).overflowX);
      expect(overflowX).not.toBe("hidden");
    });
  }
});
