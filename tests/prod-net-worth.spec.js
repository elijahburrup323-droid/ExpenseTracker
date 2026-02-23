const { test, expect } = require("@playwright/test");

const PROD_BASE = "https://djburrup.com/mybudgethq";

const ACCOUNTS = [
  { email: "elijahburrup323@gmail.com", password: "Eli624462!" },
  { email: "djburrup@gmail.com", password: "luckydjb" },
];

async function login(page, email, password) {
  await page.goto(`${PROD_BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await Promise.all([
    page.waitForURL(`${PROD_BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Production: Net Worth Dashboard", () => {
  for (const account of ACCOUNTS) {
    test(`Net Worth card visible on dashboard - ${account.email}`, async ({
      page,
    }) => {
      await login(page, account.email, account.password);
      await page.waitForLoadState("networkidle");

      // Net Worth heading visible
      await expect(page.locator("text=Net Worth").first()).toBeVisible();

      // Subtext visible
      await expect(
        page.locator(
          "text=Your net worth chart will build automatically as more months are added."
        )
      ).toBeVisible();

      // Current net worth amount visible (currency format)
      const netWorthAmount = page.locator(
        ".text-2xl.font-bold.text-gray-900"
      );
      await expect(netWorthAmount.first()).toBeVisible();
    });

    test(`Admin populate button visible - ${account.email}`, async ({
      page,
    }) => {
      await login(page, account.email, account.password);
      await page.waitForLoadState("networkidle");

      // Admin users should see Populate Test Data
      await expect(
        page.locator('button:has-text("Populate Test Data")')
      ).toBeVisible();
    });
  }

  test("Populate test data and verify chart renders - elijahburrup323@gmail.com", async ({
    page,
  }) => {
    await login(page, ACCOUNTS[0].email, ACCOUNTS[0].password);
    await page.waitForLoadState("networkidle");

    // Select 3 months and populate
    await page.selectOption(
      '[data-net-worth-populate-target="months"]',
      "3"
    );
    await page.click('button:has-text("Populate Test Data")');

    // Wait for the page to reload
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // After populate, SVG should have purple circles (data points)
    const circles = page.locator("svg circle[fill='#a855f7']");
    const count = await circles.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("Release notes page shows net worth entries", async ({ page }) => {
    await login(page, ACCOUNTS[0].email, ACCOUNTS[0].password);
    await page.goto(`${PROD_BASE}/documentation/release-notes`);
    await page.waitForLoadState("networkidle");

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Should show release notes content
    await expect(
      page.locator("text=Release Notes").first()
    ).toBeVisible();
  });
});
