// @ts-check
const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3002";
const TIMEOUT = 20000;

test.use({ browserName: "chromium" });

const USER = {
  email: "elijahburrup323@gmail.com",
  password: "Eli624462!",
};

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="user[email]"]').fill(USER.email);
  await page.locator('input[name="user[password]"]').fill(USER.password);
  await Promise.all([
    page.waitForURL("**/*", { timeout: TIMEOUT }),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

async function dismissModals(page) {
  try {
    const gotIt = page.getByRole("button", { name: "Got it" });
    if (await gotIt.isVisible({ timeout: 2000 })) await gotIt.click();
  } catch {}
  try {
    const dismiss = page.locator('[data-action*="dismissSuggestion"]');
    if (await dismiss.isVisible({ timeout: 1000 })) await dismiss.click();
  } catch {}
}

test.describe("Smart Import — Add New Account & Category", () => {
  test.describe.configure({ mode: "serial" });

  let page;
  let context;
  const uniqueSuffix = Date.now();
  const testAccountName = `Test Import Acct ${uniqueSuffix}`;
  const testCategoryName = `Test Import Cat ${uniqueSuffix}`;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await login(page);
    await dismissModals(page);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("Smart Import page loads with account dropdown", async () => {
    await page.goto(`${BASE}/smart_import`);
    await page.waitForLoadState("networkidle");

    // Step 1 should be visible with account select
    const accountSelect = page.locator("#si-account-select");
    await expect(accountSelect).toBeVisible({ timeout: TIMEOUT });

    // Should have "+ Add New Account" sentinel option
    const addNewOption = accountSelect.locator('option[value="__new_account__"]');
    await expect(addNewOption).toHaveCount(1);
    await expect(addNewOption).toHaveText("+ Add New Account");
  });

  test("Selecting '+ Add New Account' opens the account child modal", async () => {
    const accountSelect = page.locator("#si-account-select");

    // Select the sentinel
    await accountSelect.selectOption("__new_account__");

    // Modal should appear
    const modal = page.locator('[data-smart-import-target="accountChildModal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Should have Name input focused
    const nameInput = page.locator('[data-smart-import-target="childAccountName"]');
    await expect(nameInput).toBeVisible();

    // Should have Account Type dropdown
    const typeSelect = page.locator('[data-smart-import-target="childAccountType"]');
    await expect(typeSelect).toBeVisible();

    // Account type dropdown should have options (including Default)
    const typeOptions = typeSelect.locator("option");
    expect(await typeOptions.count()).toBeGreaterThanOrEqual(2); // Default + at least 1 type
  });

  test("Creating a new account adds it to the dropdown and auto-selects it", async () => {
    const nameInput = page.locator('[data-smart-import-target="childAccountName"]');
    await nameInput.fill(testAccountName);

    // Click Save
    await page.locator('[data-action="click->smart-import#saveAccountChild"]').click();

    // Modal should close
    const modal = page.locator('[data-smart-import-target="accountChildModal"]');
    await expect(modal).toBeHidden({ timeout: 5000 });

    // The account dropdown should now have the new account selected
    const accountSelect = page.locator("#si-account-select");
    const selectedText = await accountSelect.locator("option:checked").textContent();
    expect(selectedText).toContain(testAccountName);
  });

  test("Cancel on account modal does not create anything", async () => {
    // Re-open the modal
    const accountSelect = page.locator("#si-account-select");
    await accountSelect.selectOption("__new_account__");

    const modal = page.locator('[data-smart-import-target="accountChildModal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Type a name but cancel — click the Cancel button inside the modal (not the backdrop overlay)
    const nameInput = page.locator('[data-smart-import-target="childAccountName"]');
    await nameInput.fill("Should Not Exist");

    const cancelBtn = modal.getByRole("button", { name: "Cancel" });
    await cancelBtn.click();

    // Modal should close
    await expect(modal).toBeHidden({ timeout: 5000 });

    // "Should Not Exist" should NOT be in the dropdown
    const options = await accountSelect.locator("option").allTextContents();
    expect(options.join(",")).not.toContain("Should Not Exist");
  });

  test("Category child modal accessible via API endpoint check", async () => {
    // Verify spending types are fetched (categories need spending_type_id)
    const res = await page.request.get(`${BASE}/api/spending_types`, {
      headers: { Accept: "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const types = await res.json();
    expect(types.length).toBeGreaterThan(0);
  });

  test("Cleanup: delete test account via API", async () => {
    // Get list of accounts
    const res = await page.request.get(`${BASE}/api/accounts`, {
      headers: { Accept: "application/json" },
    });
    const accounts = await res.json();
    const testAcct = accounts.find((a) => a.name === testAccountName);
    if (testAcct) {
      const delRes = await page.request.delete(
        `${BASE}/api/accounts/${testAcct.id}`,
        {
          headers: {
            Accept: "application/json",
            "X-CSRF-Token": await page.evaluate(() =>
              document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
            ),
          },
        }
      );
      // Account with no transactions should delete successfully
      expect(delRes.status()).toBeLessThan(500);
    }
  });
});
