const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

async function login(page, email = "test@example.com", password = "password123") {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(email);

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.waitFor({ state: "visible" });
  await passwordInput.click();
  await passwordInput.fill(password);

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`, { timeout: 10000 }),
    signInButton.click(),
  ]);
}

async function seedData(page) {
  // Visit pages to trigger auto-seeding for the test user
  await page.goto(`${BASE}/spending_types`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  await page.goto(`${BASE}/spending_categories`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  await page.goto(`${BASE}/account_types`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  await page.goto(`${BASE}/accounts`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Check if there's at least one account; if not, create one via API
  const accountCount = await page.evaluate(async () => {
    const resp = await fetch("/expensetracker/api/accounts", { headers: { "Accept": "application/json" } });
    const data = await resp.json();
    return data.length;
  });

  if (accountCount === 0) {
    // Get account type id
    const accountTypeId = await page.evaluate(async () => {
      const resp = await fetch("/expensetracker/api/account_types", { headers: { "Accept": "application/json" } });
      const types = await resp.json();
      return types.length > 0 ? types[0].id : null;
    });

    if (accountTypeId) {
      const csrfToken = await page.evaluate(() => {
        return document.querySelector('meta[name="csrf-token"]')?.content;
      });

      await page.evaluate(async ({ accountTypeId, csrfToken }) => {
        await fetch("/expensetracker/api/accounts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": csrfToken
          },
          body: JSON.stringify({ account: { name: "Test Checking", account_type_id: accountTypeId, balance: 1000.00, include_in_budget: true } })
        });
      }, { accountTypeId, csrfToken });
    }
  }
}

test.describe.serial("Payments Disappearing Fix", () => {
  test("seed data for test user", async ({ page }) => {
    await login(page);
    await seedData(page);

    // Verify data exists
    const counts = await page.evaluate(async () => {
      const [accResp, catResp] = await Promise.all([
        fetch("/expensetracker/api/accounts", { headers: { "Accept": "application/json" } }),
        fetch("/expensetracker/api/spending_categories", { headers: { "Accept": "application/json" } }),
      ]);
      return {
        accounts: (await accResp.json()).length,
        categories: (await catResp.json()).length,
      };
    });

    expect(counts.accounts).toBeGreaterThan(0);
    expect(counts.categories).toBeGreaterThan(0);
  });

  test("payments API returns 200 (no 500 crash)", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();

    // Verify the API returns 200
    const apiResponse = await page.evaluate(async () => {
      const resp = await fetch("/expensetracker/api/payments", {
        headers: { "Accept": "application/json" }
      });
      return { status: resp.status, ok: resp.ok };
    });

    expect(apiResponse.status).toBe(200);
    expect(apiResponse.ok).toBe(true);
  });

  test("payments persist across page reload", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Add a payment
    await page.click('button:has-text("Add Payment")');
    await page.waitForTimeout(500);

    await page.selectOption('select[name="account_id"]', { index: 2 }); // skip Select... and New
    await page.selectOption('select[name="spending_category_id"]', { index: 2 });
    await page.fill('input[name="description"]', "Persistence Test Payment");
    await page.fill('input[name="amount"]', "12.34");

    await page.click('button[title="Save"]');
    await page.waitForTimeout(2000);

    // Verify it appears
    await expect(page.locator("tbody")).toContainText("Persistence Test Payment");

    // Reload page completely
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Verify it still appears after reload
    await expect(page.locator("tbody")).toContainText("Persistence Test Payment");

    // Clean up — delete the test payment
    const targetRow = page.locator("tr", { hasText: "Persistence Test Payment" });
    await targetRow.locator('button[title="Delete"]').click();
    await page.waitForTimeout(500);
    const modal = page.locator('[data-payments-target="deleteModal"]');
    await modal.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(2000);
  });

  test("cannot delete spending category that has payments", async ({ page }) => {
    await login(page);

    // Create a payment first
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await page.click('button:has-text("Add Payment")');
    await page.waitForTimeout(500);

    await page.selectOption('select[name="account_id"]', { index: 2 });
    await page.selectOption('select[name="spending_category_id"]', { index: 2 });
    await page.fill('input[name="description"]', "Guard Test Payment");
    await page.fill('input[name="amount"]', "5.00");

    await page.click('button[title="Save"]');
    await page.waitForTimeout(2000);

    // Get the category name from the API
    const categoryName = await page.evaluate(async () => {
      const resp = await fetch("/expensetracker/api/payments", {
        headers: { "Accept": "application/json" }
      });
      const payments = await resp.json();
      const p = payments.find(p => p.description === "Guard Test Payment");
      return p ? p.spending_category_name : null;
    });

    expect(categoryName).toBeTruthy();

    // Go to spending categories page and try to delete that category
    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const targetRow = page.locator("tr", { hasText: categoryName });
    await expect(targetRow.first()).toBeVisible();

    await targetRow.first().locator('button[title="Delete"]').click();
    await page.waitForTimeout(500);

    // Listen for alert dialog (the error message)
    const dialogPromise = page.waitForEvent("dialog", { timeout: 5000 });

    const modal = page.locator('[data-spending-categories-target="deleteModal"]');
    await modal.locator('button:has-text("Delete")').click();

    // Should get an alert with the guard error
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain("cannot be deleted");
    await dialog.accept();

    await page.waitForTimeout(1000);

    // Category should STILL be in the table (not deleted)
    await expect(page.locator("tbody")).toContainText(categoryName);

    // Clean up — go back and delete the guard test payment
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const paymentRow = page.locator("tr", { hasText: "Guard Test Payment" });
    await paymentRow.locator('button[title="Delete"]').click();
    await page.waitForTimeout(500);
    const paymentModal = page.locator('[data-payments-target="deleteModal"]');
    await paymentModal.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(2000);
  });

  test("cannot delete spending type that has categories", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Get a type that has categories
    const typeName = await page.evaluate(async () => {
      const resp = await fetch("/expensetracker/api/spending_categories", {
        headers: { "Accept": "application/json" }
      });
      const cats = await resp.json();
      if (cats.length > 0) return cats[0].spending_type_name;
      return null;
    });

    expect(typeName).toBeTruthy();

    const targetRow = page.locator("tr", { hasText: typeName });
    await expect(targetRow.first()).toBeVisible();

    await targetRow.first().locator('button[title="Delete"]').click();
    await page.waitForTimeout(500);

    // Listen for alert dialog
    const dialogPromise = page.waitForEvent("dialog", { timeout: 5000 });

    const modal = page.locator('[data-spending-types-target="deleteModal"]');
    await modal.locator('button:has-text("Delete")').click();

    const dialog = await dialogPromise;
    expect(dialog.message()).toContain("cannot be deleted");
    await dialog.accept();

    await page.waitForTimeout(1000);

    // Type should STILL be in the table
    await expect(page.locator("tbody")).toContainText(typeName);
  });
});
