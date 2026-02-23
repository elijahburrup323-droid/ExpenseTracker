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

test.describe("Production: Privacy Policy & Terms Redesign", () => {
  test("Privacy policy has TOC sidebar and card sections", async ({ page }) => {
    await page.goto(`${PROD_BASE}/pages/privacy`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Title and breadcrumb
    await expect(page.locator("h1")).toContainText("Privacy Policy");
    await expect(page.locator("text=Home")).toBeVisible();

    // TOC sidebar with links
    const toc = page.locator('[data-legal-toc-target="toc"]');
    await expect(toc).toBeVisible();
    const tocLinks = toc.locator("a");
    expect(await tocLinks.count()).toBeGreaterThanOrEqual(10);

    // Card-based content sections
    const cards = page.locator('[data-legal-toc-target="content"] .rounded-lg.shadow-sm');
    expect(await cards.count()).toBeGreaterThanOrEqual(9);

    // Last updated date
    await expect(page.locator("text=Last updated:")).toBeVisible();
  });

  test("Terms of Service has TOC and card layout", async ({ page }) => {
    await page.goto(`${PROD_BASE}/pages/terms`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator("h1")).toContainText("Terms of Service");
    const toc = page.locator('[data-legal-toc-target="toc"]');
    await expect(toc).toBeVisible();
    expect(await toc.locator("a").count()).toBeGreaterThanOrEqual(10);
  });

  test("Sidebar toggle is at bottom next to profile", async ({ page }) => {
    await login(page, ACCOUNTS[0].email, ACCOUNTS[0].password);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(2000);

    const sidebar = page.locator('[data-sidebar-target="sidebar"]');

    // Exactly 1 toggle icon, inside the bottom profile section
    const allToggles = sidebar.locator('[data-sidebar-target="toggleIcon"]');
    expect(await allToggles.count()).toBe(1);
    const profileToggle = sidebar.locator(".border-t.border-white\\/20").locator('[data-sidebar-target="toggleIcon"]');
    expect(await profileToggle.count()).toBe(1);

    // Toggle works
    await page.evaluate(() => document.querySelector('button[title="Toggle sidebar"]').click());
    await page.waitForTimeout(500);
    await expect(sidebar).toHaveClass(/w-16/);

    await page.evaluate(() => document.querySelector('button[title="Toggle sidebar"]').click());
    await page.waitForTimeout(500);
    await expect(sidebar).toHaveClass(/w-56/);
  });

  for (const account of ACCOUNTS) {
    test(`Footer links work for ${account.email}`, async ({ page }) => {
      await login(page, account.email, account.password);
      await page.goto(`${PROD_BASE}/dashboard`);
      await page.waitForLoadState("networkidle");

      // Navigate to privacy via footer
      await Promise.all([
        page.waitForURL(`${PROD_BASE}/pages/privacy`),
        page.click('footer a:has-text("Privacy")'),
      ]);
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();

      // Navigate to terms via footer
      await page.goto(`${PROD_BASE}/dashboard`);
      await page.waitForLoadState("networkidle");
      await Promise.all([
        page.waitForURL(`${PROD_BASE}/pages/terms`),
        page.click('footer a:has-text("Terms")'),
      ]);
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
    });
  }
});
