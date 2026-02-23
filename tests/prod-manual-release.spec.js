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

test.describe("Production: Manual Release — Feb 9 2026", () => {
  for (const account of ACCOUNTS) {
    test.describe(`Account: ${account.email}`, () => {

      test("Deposit Frequencies header renamed", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/income_user_frequencies`);
        await page.waitForLoadState("networkidle");
        const h1 = page.locator(".sticky.top-14 h1");
        await expect(h1).toContainText("Deposit Frequencies");
      });

      test("Payments search on second row", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/payments`);
        await page.waitForLoadState("networkidle");
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(500);

        // Search input should exist
        const searchInput = page.locator('input[placeholder*="Search"]');
        await expect(searchInput).toBeVisible();

        // No "Search" label above input
        const searchLabel = page.locator("label", { hasText: /^Search$/ });
        await expect(searchLabel).toHaveCount(0);

        // Search input should be on row 2 (below filters)
        const searchBox = await searchInput.boundingBox();
        const resetBtn = page.locator('button:has-text("Reset")');
        const resetBox = await resetBtn.boundingBox();
        expect(searchBox.y).toBeGreaterThan(resetBox.y);
      });

      test("Sticky subheaders on all CRUD screens", async ({ page }) => {
        await login(page, account.email, account.password);

        const screens = [
          { path: "/accounts", title: "Accounts" },
          { path: "/account_types", title: "Account Types" },
          { path: "/spending_types", title: "Spending Types" },
          { path: "/spending_categories", title: "Spending Categories" },
          { path: "/income_entries", title: "Deposits" },
          { path: "/income_recurrings", title: "Income Sources" },
          { path: "/income_user_frequencies", title: "Deposit Frequencies" },
        ];

        for (const screen of screens) {
          await page.goto(`${PROD_BASE}${screen.path}`);
          await page.waitForLoadState("networkidle");
          const sticky = page.locator(".sticky.top-14.z-20");
          await expect(sticky).toBeVisible({ timeout: 5000 });
          await expect(sticky.locator("h1")).toContainText(screen.title);
        }
      });

      test("Privacy policy has no ERB comment text", async ({ page }) => {
        await login(page, account.email, account.password);
        await page.goto(`${PROD_BASE}/pages/privacy`);
        await page.waitForLoadState("networkidle");

        // Page should load with content
        const heading = page.locator("h1", { hasText: "Privacy Policy" });
        await expect(heading).toBeVisible();

        // No ERB comment text visible anywhere
        const bodyText = await page.locator("body").textContent();
        expect(bodyText).not.toContain("<%#");
        expect(bodyText).not.toContain("Section 1:");
        expect(bodyText).not.toContain("Section 5:");
        expect(bodyText).not.toContain("Section 10:");
        expect(bodyText).not.toContain("Security visualization");
      });
    });
  }
});
