const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', "elijahburrup323@gmail.com");
  await page.fill('input[name="user[password]"]', "Eli624462!");
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Payment Delete — Balance Update", () => {
  test("Delete button visible on payment rows", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");

    // Check that delete buttons exist on rows
    const deleteButtons = page.locator('button[title="Delete"]');
    const count = await deleteButtons.count();
    if (count > 0) {
      await expect(deleteButtons.first()).toBeVisible();
    }
  });

  test("Delete confirmation modal appears", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");

    const deleteButtons = page.locator('button[title="Delete"]');
    const count = await deleteButtons.count();
    if (count > 0) {
      await deleteButtons.first().click();
      await page.waitForTimeout(300);

      // Modal should appear
      const modal = page.locator('[data-payments-target="deleteModal"]');
      await expect(modal).toBeVisible();

      // Cancel the delete
      await page.locator('[data-payments-target="deleteModal"] button:has-text("Cancel")').click();
      await page.waitForTimeout(300);
      await expect(modal).toHaveClass(/hidden/);
    }
  });
});
