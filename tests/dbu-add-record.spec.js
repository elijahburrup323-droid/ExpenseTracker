const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";
const AGENT = { email: "test@example.com", password: "password123" };

async function login(page, acct) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', acct.email);
  await page.fill('input[name="user[password]"]', acct.password);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("DBU — Add Record Button", () => {
  test("+ Add Record button is visible on DBU page", async ({ page }) => {
    await login(page, AGENT);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");

    const addBtn = page.locator('button:has-text("+ Add Record")');
    await expect(addBtn).toBeVisible();
  });

  test("Clicking + Add Record without table selected shows alert", async ({ page }) => {
    await login(page, AGENT);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");

    // Listen for alert dialog
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Select a table before adding a record");
      await dialog.accept();
    });

    await page.locator('button:has-text("+ Add Record")').click();
    await page.waitForTimeout(500);
  });

  test("Clicking + Add Record with table selected shows add form", async ({ page }) => {
    await login(page, AGENT);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");

    // Wait for dropdowns to load
    const nameSelect = page.locator("[data-dbu-target='tableNameSelect']");
    await expect(nameSelect).toBeVisible();
    await expect(nameSelect.locator("option")).not.toHaveCount(1);

    // Select the quotes table
    await nameSelect.selectOption("quotes");
    await page.waitForTimeout(2000);

    // Click + Add Record
    await page.locator('button:has-text("+ Add Record")').click();
    await page.waitForTimeout(500);

    // Should see "New Record — tablename" header and Save/Cancel buttons
    await expect(page.locator('h3:has-text("New Record")')).toBeVisible();
    await expect(page.locator('[data-dbu-target="recordPanel"] button:has-text("Save")')).toBeVisible();
    await expect(page.locator('[data-dbu-target="recordPanel"] button:has-text("Cancel")')).toBeVisible();
  });

  test("Cancel add returns to previous view", async ({ page }) => {
    await login(page, AGENT);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState("networkidle");

    const nameSelect = page.locator("[data-dbu-target='tableNameSelect']");
    await expect(nameSelect.locator("option")).not.toHaveCount(1);
    await nameSelect.selectOption("quotes");
    await page.waitForTimeout(2000);

    // Click + Add Record then Cancel
    await page.locator('button:has-text("+ Add Record")').click();
    await page.waitForTimeout(500);
    await page.locator('[data-dbu-target="recordPanel"] button:has-text("Cancel")').click();
    await page.waitForTimeout(500);

    // Should be back to record view
    await expect(page.locator('h3:has-text("New Record")')).not.toBeVisible();
  });
});
