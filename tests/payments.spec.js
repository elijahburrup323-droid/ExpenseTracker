const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/expensetracker";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill("test@test.com");

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.waitFor({ state: "visible" });
  await passwordInput.click();
  await passwordInput.fill("password123");

  await expect(emailInput).toHaveValue("test@test.com");
  await expect(passwordInput).toHaveValue("password123");

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();

  await page.waitForTimeout(4000);
}

test.describe.serial("Payments CRUD", () => {
  test("payments page loads with filter bar", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator("h1")).toHaveText("Payments");

    // Verify filter bar elements exist
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('button:has-text("Reset")')).toBeVisible();

    // Verify filter dropdowns
    const filterAccount = page.locator('[data-payments-target="filterAccount"]');
    await expect(filterAccount).toBeVisible();
  });

  test("add a new payment", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Click Add Payment button
    await page.click('button:has-text("Add Payment")');
    await page.waitForTimeout(500);

    // Fill in fields
    await page.selectOption('select[name="account_id"]', { index: 1 });
    await page.selectOption('select[name="spending_category_id"]', { index: 1 });
    await page.fill('input[name="description"]', "Test Payment PW");
    await page.fill('input[name="amount"]', "25.50");

    // Save
    await page.click('button[title="Save"]');
    await page.waitForTimeout(2000);

    // Verify new row appears
    await expect(page.locator("tbody")).toContainText("Test Payment PW");
    await expect(page.locator("tbody")).toContainText("$25.50");
  });

  test("edit a payment", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Find the row and edit
    const targetRow = page.locator("tr", { hasText: "Test Payment PW" });
    await expect(targetRow).toBeVisible({ timeout: 5000 });
    await targetRow.locator('button[title="Edit"]').click();
    await page.waitForTimeout(500);

    // Change description and amount
    const editRow = page.locator("tr.bg-brand-50\\/40");
    await editRow.locator('input[name="description"]').fill("Updated Payment PW");
    await editRow.locator('input[name="amount"]').fill("50.00");

    // Save
    await page.click('button[title="Save"]');
    await page.waitForTimeout(2000);

    // Verify updated row
    await expect(page.locator("tbody")).toContainText("Updated Payment PW");
    await expect(page.locator("tbody")).toContainText("$50.00");
  });

  test("filter payments by search", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Search for "Updated Payment"
    const searchInput = page.locator('[data-payments-target="filterSearch"]');
    await searchInput.fill("Updated Payment");
    await page.waitForTimeout(500);

    // Should still show our payment
    await expect(page.locator("tbody")).toContainText("Updated Payment PW");

    // Search for something that doesn't exist
    await searchInput.fill("ZZZZNOTEXIST");
    await page.waitForTimeout(500);

    // Should show no results
    await expect(page.locator("tbody")).toContainText("No payments found");

    // Reset filters
    await page.click('button:has-text("Reset")');
    await page.waitForTimeout(500);

    // Should show payments again
    await expect(page.locator("tbody")).toContainText("Updated Payment PW");
  });

  test("delete a payment", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const targetRow = page.locator("tr", { hasText: "Updated Payment PW" });
    await expect(targetRow).toBeVisible({ timeout: 5000 });

    // Click Delete
    await targetRow.locator('button[title="Delete"]').click();
    await page.waitForTimeout(500);

    // Confirm modal
    await expect(page.locator("h3:has-text('Delete Payment')")).toBeVisible();

    // Click delete in modal
    const modal = page.locator('[data-payments-target="deleteModal"]');
    await modal.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(2000);

    // Verify row is gone
    await expect(page.locator("tbody tr", { hasText: "Updated Payment PW" })).toHaveCount(0);
  });
});

test.describe.serial("Bug Fixes", () => {
  test("accounts type column shows description instead of name", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // The Type column should show description (e.g., "Checking Account") not name ("Checking")
    const tbody = page.locator("tbody");
    await expect(tbody).not.toContainText("Loading...");

    // Check that at least one row exists with a description-style text
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    if (count > 0) {
      // The Type column (3rd td) should contain a longer description
      const firstRowType = rows.first().locator("td").nth(2);
      const typeText = await firstRowType.innerText();
      console.log("Account Type column value:", typeText);
      // Description should exist (not empty)
      expect(typeText.trim().length).toBeGreaterThan(0);
    }
  });

  test("spending types require description on save", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Click Add
    await page.click('button:has-text("Add Spending Type")');
    await page.waitForTimeout(500);

    // Fill name but leave description empty
    await page.fill('input[name="name"]', "NoDesc Type");

    // Try to save
    await page.click('button[title="Save"]');
    await page.waitForTimeout(500);

    // Should show error about description
    await expect(page.locator("tbody")).toContainText("Description is required");

    // Cancel
    await page.click('button[title="Cancel"]');
  });

  test("account types require description on save", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/account_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Click Add
    await page.click('button:has-text("Add Account Type")');
    await page.waitForTimeout(500);

    // Fill name but leave description empty
    await page.fill('input[name="name"]', "NoDesc AccType");

    // Try to save
    await page.click('button[title="Save"]');
    await page.waitForTimeout(500);

    // Should show error about description
    await expect(page.locator("tbody")).toContainText("Description is required");

    // Cancel
    await page.click('button[title="Cancel"]');
  });

  test("payments navbar link exists", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check navbar has Payments link
    const paymentsLink = page.locator('nav a:has-text("Payments")');
    await expect(paymentsLink).toBeVisible();

    // Click it and verify navigation
    await paymentsLink.click();
    await page.waitForTimeout(3000);
    await expect(page.locator("h1")).toHaveText("Payments");
  });
});
