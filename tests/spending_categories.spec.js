const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/expensetracker";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  // Fill email
  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill("test@test.com");

  // Fill password
  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.waitFor({ state: "visible" });
  await passwordInput.click();
  await passwordInput.fill("password123");

  // Verify both fields have values
  await expect(emailInput).toHaveValue("test@test.com");
  await expect(passwordInput).toHaveValue("password123");

  // Click sign in
  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();

  // Wait for Turbo navigation to complete
  await page.waitForTimeout(4000);
}

test.describe.serial("Spending Categories CRUD", () => {
  test("seed spending types then verify categories page loads with defaults", async ({
    page,
  }) => {
    await login(page);

    // Visit spending types first to trigger seeding
    await page.goto(`${BASE}/spending_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await expect(page.locator("h1")).toHaveText("Spending Types");
    // Verify spending types were seeded
    await expect(page.locator("tbody")).not.toContainText("Loading...");

    // Now visit spending categories — this will seed defaults
    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator("h1")).toHaveText("Spending Categories");
    await expect(page.locator("tbody")).not.toContainText("Loading...");

    // Log table content
    const bodyText = await page.locator("tbody").innerText();
    console.log("Table content:", bodyText.substring(0, 500));

    // Should have default categories now
    await expect(page.locator("tbody")).toContainText("Groceries");
  });

  test("add a new spending category", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Click Add button
    await page.click('button:has-text("Add Spending Category")');
    await page.waitForTimeout(500);

    // Fill in fields
    await page.fill('input[name="name"]', "Test Category PW");
    await page.fill(
      'input[name="description"]',
      "Playwright test category desc"
    );

    // Select a spending type from dropdown (index 1 = first real option after placeholder)
    await page.selectOption('select[name="spending_type_id"]', { index: 1 });

    // Debt toggle should be visible in add mode (defaults to unchecked/false)
    const debtToggle = page.locator("tr.bg-brand-50\\/40 input[name='is_debt']");
    await expect(debtToggle).toHaveCount(1);
    // Toggle it to true for this test category
    await debtToggle.check({ force: true });

    // Save
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Verify new row appears
    await expect(page.locator("tbody")).toContainText("Test Category PW");

    // Verify debt shows True pill (we toggled it on)
    const newRow = page.locator("tr", { hasText: "Test Category PW" });
    await expect(newRow.locator("span", { hasText: "True" })).toBeVisible();
  });

  test("edit a spending category with debt toggle", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Find the row and edit
    const targetRow = page.locator("tr", { hasText: "Test Category PW" });
    await expect(targetRow).toBeVisible({ timeout: 5000 });
    await targetRow.locator('button[title="Edit"]').click();
    await page.waitForTimeout(500);

    // Verify debt toggle IS visible in edit mode
    const editRow = page.locator("tr.bg-brand-50\\/40");
    await expect(editRow.locator("input[name='is_debt']")).toHaveCount(1);

    // Toggle debt off (it was set to true during creation)
    await editRow.locator("input[name='is_debt']").uncheck({ force: true });

    // Change description
    await editRow
      .locator('input[name="description"]')
      .fill("Updated by Playwright");

    // Save
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Verify debt now shows False pill (we toggled it off)
    const updatedRow = page.locator("tr", { hasText: "Test Category PW" });
    await expect(
      updatedRow.locator("span", { hasText: "False" })
    ).toBeVisible();
    await expect(updatedRow).toContainText("Updated by Playwright");
  });

  test("delete a spending category", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const targetRow = page.locator("tr", { hasText: "Test Category PW" });
    await expect(targetRow).toBeVisible({ timeout: 5000 });

    // Click Delete
    await targetRow.locator('button[title="Delete"]').click();
    await page.waitForTimeout(500);

    // Confirm modal
    await expect(
      page.locator("h3:has-text('Delete Spending Category')")
    ).toBeVisible();

    // Click delete in modal
    const modal = page.locator(
      '[data-spending-categories-target="deleteModal"]'
    );
    await modal.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(2000);

    // Verify row is gone
    await expect(
      page.locator("tbody tr", { hasText: "Test Category PW" })
    ).toHaveCount(0);
  });

  test("spending types page still works after icon catalog refactor", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE}/spending_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator("h1")).toHaveText("Spending Types");
    await expect(page.locator("tbody")).not.toContainText("Loading...");

    // Should have at least one spending type row
    const rows = page.locator("tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
  });
});
