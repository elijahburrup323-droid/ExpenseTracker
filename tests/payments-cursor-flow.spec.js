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

test.describe("Payments Add Row Cursor Flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Ensure seeded data exists
    await page.goto(`${LOCAL_BASE}/spending_types`);
    await page.waitForLoadState("networkidle");
    await page.goto(`${LOCAL_BASE}/spending_categories`);
    await page.waitForLoadState("networkidle");
    await page.goto(`${LOCAL_BASE}/account_types`);
    await page.waitForLoadState("networkidle");
    await page.goto(`${LOCAL_BASE}/accounts`);
    await page.waitForLoadState("networkidle");
    await page.goto(`${LOCAL_BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
  });

  test("Step 1: Date field is focused after clicking Add Payment", async ({ page }) => {
    await page.click('button:has-text("Add Payment")');
    await page.waitForTimeout(500);

    const dateInput = page.locator('input[name="payment_date"]');
    await expect(dateInput).toBeFocused();
  });

  test("Step 2: After date change, focus moves to Account dropdown", async ({ page }) => {
    await page.click('button:has-text("Add Payment")');
    await page.waitForTimeout(500);

    const dateInput = page.locator('input[name="payment_date"]');
    // Change the date to trigger the change event
    await dateInput.fill("2026-02-15");
    await dateInput.dispatchEvent("change");
    await page.waitForTimeout(300);

    const accountSelect = page.locator('select[name="account_id"]');
    await expect(accountSelect).toBeFocused();
  });

  test("Step 3: After account selection, focus moves to Category dropdown", async ({ page }) => {
    await page.click('button:has-text("Add Payment")');
    await page.waitForTimeout(500);

    const accountSelect = page.locator('select[name="account_id"]');
    // Select an actual account (not "Select..." or "New")
    const options = await accountSelect.locator("option").all();
    // Find first real option (skip "Select..." and "— New Account —")
    let realOptionValue = null;
    for (const opt of options) {
      const val = await opt.getAttribute("value");
      if (val && val !== "" && val !== "new") {
        realOptionValue = val;
        break;
      }
    }

    if (realOptionValue) {
      await accountSelect.selectOption(realOptionValue);
      await page.waitForTimeout(300);

      const categorySelect = page.locator('select[name="spending_category_id"]');
      await expect(categorySelect).toBeFocused();
    }
  });

  test("Step 4: After category selection, spending type auto-populates and focus moves to Description", async ({ page }) => {
    await page.click('button:has-text("Add Payment")');
    await page.waitForTimeout(500);

    const categorySelect = page.locator('select[name="spending_category_id"]');
    // Find first real category option
    const options = await categorySelect.locator("option").all();
    let realOptionValue = null;
    for (const opt of options) {
      const val = await opt.getAttribute("value");
      if (val && val !== "" && val !== "new") {
        realOptionValue = val;
        break;
      }
    }

    if (realOptionValue) {
      await categorySelect.selectOption(realOptionValue);
      await page.waitForTimeout(300);

      // Spending type should be auto-populated
      const typeSelect = page.locator('select[name="spending_type_override_id"]');
      const typeVal = await typeSelect.inputValue();
      // Type should have a value (the auto-selected spending type id)
      expect(typeVal).toBeTruthy();

      // Description should be focused
      const descInput = page.locator('input[name="description"]');
      await expect(descInput).toBeFocused();
    }
  });

  test("Full flow: Date → Account → Category → Description in sequence", async ({ page }) => {
    await page.click('button:has-text("Add Payment")');
    await page.waitForTimeout(500);

    // Step 1: Date is focused
    const dateInput = page.locator('input[name="payment_date"]');
    await expect(dateInput).toBeFocused();

    // Step 2: Change date → Account focused
    await dateInput.fill("2026-02-10");
    await dateInput.dispatchEvent("change");
    await page.waitForTimeout(300);

    const accountSelect = page.locator('select[name="account_id"]');
    await expect(accountSelect).toBeFocused();

    // Step 3: Select account → Category focused
    const accOptions = await accountSelect.locator("option").all();
    let accVal = null;
    for (const opt of accOptions) {
      const val = await opt.getAttribute("value");
      if (val && val !== "" && val !== "new") { accVal = val; break; }
    }
    if (accVal) {
      await accountSelect.selectOption(accVal);
      await page.waitForTimeout(300);

      const categorySelect = page.locator('select[name="spending_category_id"]');
      await expect(categorySelect).toBeFocused();

      // Step 4: Select category → Description focused
      const catOptions = await categorySelect.locator("option").all();
      let catVal = null;
      for (const opt of catOptions) {
        const val = await opt.getAttribute("value");
        if (val && val !== "" && val !== "new") { catVal = val; break; }
      }
      if (catVal) {
        await categorySelect.selectOption(catVal);
        await page.waitForTimeout(300);

        const descInput = page.locator('input[name="description"]');
        await expect(descInput).toBeFocused();
      }
    }
  });
});
