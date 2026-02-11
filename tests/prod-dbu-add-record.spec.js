const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/expensetracker";

const ACCOUNTS = [
  { email: "elijahburrup323@gmail.com", password: "Eli624462!" },
  { email: "djburrup@gmail.com", password: "luckydjb" },
];

async function login(page, acct) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', acct.email);
  await page.fill('input[name="user[password]"]', acct.password);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

for (const acct of ACCOUNTS) {
  test.describe(`DBU Add Record — ${acct.email}`, () => {
    test("+ Add Record button is visible", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/dbu`);
      await page.waitForLoadState("networkidle");

      await expect(page.locator('button:has-text("+ Add Record")')).toBeVisible();
    });

    test("Add Record opens form when table is selected", async ({ page }) => {
      await login(page, acct);
      await page.goto(`${BASE}/dbu`);
      await page.waitForLoadState("networkidle");

      const nameSelect = page.locator("[data-dbu-target='tableNameSelect']");
      await expect(nameSelect.locator("option")).not.toHaveCount(1);

      await nameSelect.selectOption("quotes");
      await page.waitForTimeout(2000);

      await page.locator('button:has-text("+ Add Record")').click();
      await page.waitForTimeout(500);

      await expect(page.locator('h3:has-text("New Record")')).toBeVisible();
      await expect(page.locator('[data-dbu-target="recordPanel"] button:has-text("Cancel")')).toBeVisible();

      // Cancel and verify we return to the record view
      await page.locator('[data-dbu-target="recordPanel"] button:has-text("Cancel")').click();
      await page.waitForTimeout(500);
      await expect(page.locator('h3:has-text("New Record")')).not.toBeVisible();
    });
  });
}
