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

  const signInButton = page.getByRole("button", {
    name: "Sign in",
    exact: true,
  });
  await signInButton.click();

  await page.waitForTimeout(3000);
}

async function ensureDataExists(page) {
  // Generate accounts, categories, and spending types if needed
  await page.goto(`${BASE}/accounts`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const noAccounts = page.locator("text=No accounts found");
  if (await noAccounts.isVisible()) {
    const genBtn = page.locator('button:has-text("Generate Data")');
    if (await genBtn.isVisible()) {
      await genBtn.click();
      await page.waitForTimeout(5000);
    }
  }

  await page.goto(`${BASE}/spending_categories`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const noCats = page.locator("text=No categories found");
  if (await noCats.isVisible()) {
    const genBtn = page.locator('button:has-text("Generate Data")');
    if (await genBtn.isVisible()) {
      await genBtn.click();
      await page.waitForTimeout(5000);
    }
  }
}

test.describe.serial("Payments Add Modal", () => {
  test("clicking Add Payment opens modal instead of inline row", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click Add Payment
    await page.locator('button:has-text("Add Payment")').click();
    await page.waitForTimeout(500);

    // Modal should be visible
    const modal = page.locator('[data-payments-target="addModal"]');
    await expect(modal).toBeVisible();

    // Modal title
    await expect(modal.locator("h3")).toHaveText("Add Payment");

    // All form fields should be present
    await expect(modal.locator('input[name="payment_date"]')).toBeVisible();
    await expect(modal.locator('select[name="account_id"]')).toBeVisible();
    await expect(
      modal.locator('select[name="spending_category_id"]')
    ).toBeVisible();
    await expect(
      modal.locator('select[name="spending_type_override_id"]')
    ).toBeVisible();
    await expect(modal.locator('input[name="description"]')).toBeVisible();
    await expect(modal.locator('input[name="amount"]')).toBeVisible();

    // Save and Cancel buttons
    await expect(modal.locator('button:has-text("Save")')).toBeVisible();
    await expect(modal.locator('button:has-text("Cancel")')).toBeVisible();

    // No inline add row should exist in the table
    const inlineAddRow = page.locator(
      'tbody tr.bg-brand-50\\/40, tbody tr[class*="bg-brand-50"]'
    );
    await expect(inlineAddRow).toHaveCount(0);
  });

  test("cancel closes modal without saving", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("Add Payment")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-payments-target="addModal"]');
    await expect(modal).toBeVisible();

    // Click Cancel
    await modal.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(300);

    // Modal should be hidden
    await expect(modal).toBeHidden();
  });

  test("X button closes modal", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("Add Payment")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-payments-target="addModal"]');
    await expect(modal).toBeVisible();

    // Click X button
    await modal.locator('button[title="Close"]').click();
    await page.waitForTimeout(300);

    await expect(modal).toBeHidden();
  });

  test("Escape key closes modal", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("Add Payment")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-payments-target="addModal"]');
    await expect(modal).toBeVisible();

    // Click description field first to dismiss any open date picker
    await modal.locator('input[name="description"]').click();
    await page.waitForTimeout(200);

    // Press Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    await expect(modal).toBeHidden();
  });

  test("validation shows errors for empty required fields", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("Add Payment")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-payments-target="addModal"]');

    // Clear the date and try to save
    await modal.locator('input[name="payment_date"]').fill("");
    await modal.locator('button:has-text("Save")').click();
    await page.waitForTimeout(300);

    // Error should be visible
    const error = modal.locator('[data-payments-target="modalError"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText("required");
  });

  test("successfully saves a payment and closes modal", async ({ page }) => {
    await login(page);
    await ensureDataExists(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Count current payments
    const countBefore = await page
      .locator('[data-payments-target="filterCount"]')
      .textContent();

    await page.locator('button:has-text("Add Payment")').click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-payments-target="addModal"]');

    // Fill in the form
    // Date is pre-filled with today

    // Select first account
    const accountSelect = modal.locator('select[name="account_id"]');
    const accountOptions = await accountSelect.locator("option").all();
    // Skip "Select account..." and "— New Account —", pick the 3rd option
    if (accountOptions.length > 2) {
      await accountSelect.selectOption({ index: 2 });
    }
    await page.waitForTimeout(200);

    // Select first category
    const categorySelect = modal.locator(
      'select[name="spending_category_id"]'
    );
    const categoryOptions = await categorySelect.locator("option").all();
    if (categoryOptions.length > 2) {
      await categorySelect.selectOption({ index: 2 });
    }
    await page.waitForTimeout(200);

    // Fill description
    await modal
      .locator('input[name="description"]')
      .fill("Test Modal Payment");

    // Fill amount
    await modal.locator('input[name="amount"]').fill("42.50");

    // Save
    await modal.locator('button:has-text("Save")').click();
    await page.waitForTimeout(2000);

    // Modal should be closed
    await expect(modal).toBeHidden();

    // Payment should appear in table
    const tableText = await page
      .locator('[data-payments-target="tableBody"]')
      .textContent();
    expect(tableText).toContain("Test Modal Payment");
  });
});
