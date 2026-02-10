const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

test.describe("Sidebar Toggle Position", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE}/users/sign_in`);
    await page.fill('input[name="user[email]"]', "elijahburrup323@gmail.com");
    await page.fill('input[name="user[password]"]', "Eli624462!");
    await Promise.all([
      page.waitForURL("**/dashboard**"),
      page.click('input[type="submit"], button[type="submit"]'),
    ]);
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(1000);
  });

  test("Toggle button is inside the bottom profile section", async ({ page }) => {
    const sidebar = page.locator('[data-sidebar-target="sidebar"]');
    await expect(sidebar).toBeVisible();

    // Toggle icon should exist in the DOM
    const toggleIcon = sidebar.locator('[data-sidebar-target="toggleIcon"]');
    expect(await toggleIcon.count()).toBe(1);

    // It should be inside the border-t profile section (bottom of sidebar)
    const profileSection = sidebar.locator(".border-t.border-white\\/20");
    await expect(profileSection).toBeVisible();
    const profileToggle = profileSection.locator('[data-sidebar-target="toggleIcon"]');
    expect(await profileToggle.count()).toBe(1);
  });

  test("Toggle button collapses and expands sidebar", async ({ page }) => {
    const sidebar = page.locator('[data-sidebar-target="sidebar"]');

    // Sidebar should start expanded (w-56)
    await expect(sidebar).toHaveClass(/w-56/);

    // Click the toggle button (use JS click for cross-browser compat with fixed positioning)
    await page.evaluate(() => document.querySelector('button[title="Toggle sidebar"]').click());
    await page.waitForTimeout(500);

    // Sidebar should now be collapsed (w-16)
    await expect(sidebar).toHaveClass(/w-16/);

    // Click again to expand
    await page.evaluate(() => document.querySelector('button[title="Toggle sidebar"]').click());
    await page.waitForTimeout(500);

    // Sidebar should be expanded again
    await expect(sidebar).toHaveClass(/w-56/);
  });

  test("No toggle button exists at top of sidebar (only at bottom)", async ({ page }) => {
    const sidebar = page.locator('[data-sidebar-target="sidebar"]');

    // Should be exactly 1 toggle icon in the entire sidebar
    const allToggles = sidebar.locator('[data-sidebar-target="toggleIcon"]');
    expect(await allToggles.count()).toBe(1);

    // It should be inside the border-t profile section (bottom)
    const profileToggle = sidebar.locator(".border-t.border-white\\/20").locator('[data-sidebar-target="toggleIcon"]');
    expect(await profileToggle.count()).toBe(1);
  });
});
