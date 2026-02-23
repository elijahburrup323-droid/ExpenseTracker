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

test.describe("Production Add Payment Modal", () => {
  test("elijahburrup323 - Add Payment opens modal", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Click Add Payment
    await page.locator('button:has-text("Add Payment")').click();
    await page.waitForTimeout(500);

    // Modal should appear
    const modal = page.locator('[data-payments-target="addModal"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator("h3")).toHaveText("Add Payment");

    // All fields present
    await expect(modal.locator('input[name="payment_date"]')).toBeVisible();
    await expect(modal.locator('select[name="account_id"]')).toBeVisible();
    await expect(modal.locator('select[name="spending_category_id"]')).toBeVisible();
    await expect(modal.locator('input[name="description"]')).toBeVisible();
    await expect(modal.locator('input[name="amount"]')).toBeVisible();
    await expect(modal.locator('button:has-text("Save")')).toBeVisible();
    await expect(modal.locator('button:has-text("Cancel")')).toBeVisible();

    // Cancel closes
    await modal.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(300);
    await expect(modal).toBeHidden();
  });

  test("djburrup - Add Payment opens modal", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await page.locator('button:has-text("Add Payment")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-payments-target="addModal"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator("h3")).toHaveText("Add Payment");

    // Cancel closes
    await modal.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(300);
    await expect(modal).toBeHidden();
  });
});
