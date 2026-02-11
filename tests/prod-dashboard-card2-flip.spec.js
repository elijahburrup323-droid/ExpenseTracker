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
  test.describe(`Dashboard Card 2 Flip — ${acct.email}`, () => {
    test("Card 2 has pie icon and Manage Accounts link", async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      const pieBtn = page.locator('button[aria-label="View pie chart"]');
      await expect(pieBtn).toBeVisible();

      const manageLink = page.locator('a:has-text("Manage Accounts")');
      await expect(manageLink).toBeVisible();
    });

    test("Pie icon flips card and Flip back returns", async ({ page }) => {
      await login(page, acct);
      await page.waitForLoadState("networkidle");

      await page.locator('button[aria-label="View pie chart"]').click();
      await page.waitForTimeout(700);

      const flipBackBtn = page.locator('button:has-text("Flip back")');
      await expect(flipBackBtn).toBeVisible();

      await flipBackBtn.click();
      await page.waitForTimeout(700);

      await expect(page.locator('button[aria-label="View pie chart"]')).toBeVisible();
    });
  });
}
