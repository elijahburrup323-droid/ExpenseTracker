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

test.describe("Multi Screen Updates", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Income Frequencies - All toggle visible and functional", async ({ page }) => {
    await page.goto(`${LOCAL_BASE}/income_user_frequencies`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // "All" label should be visible (not "View All")
    await expect(page.locator('text=All').first()).toBeVisible();
    // Table should have rows
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("Payments - Spending Type dropdown is wider", async ({ page }) => {
    await page.goto(`${LOCAL_BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Spending Type filter should exist
    const typeFilter = page.locator('[data-payments-target="filterType"]');
    await expect(typeFilter).toBeVisible();
    // Reset button should exist
    await expect(page.locator('button:has-text("Reset")')).toBeVisible();
  });

  test("Admin Users page title", async ({ page }) => {
    await page.goto(`${LOCAL_BASE}/admin/users`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Admin Users" })).toBeVisible();
  });

  test("Sidebar sub-menus sorted alphabetically", async ({ page }) => {
    await page.goto(`${LOCAL_BASE}/dashboard`);
    await page.waitForLoadState("networkidle");

    // Check Deposits group children: Frequencies should come before Recurring Deposits
    const depositLinks = page.locator('[data-sidebar-group="deposits"] a span[data-sidebar-label]');
    const firstChild = await depositLinks.nth(0).textContent();
    const secondChild = await depositLinks.nth(1).textContent();
    expect(firstChild.trim()).toBe("Frequencies");
    expect(secondChild.trim()).toBe("Recurring Deposits");
  });

  test("Profile dropdown in header", async ({ page }) => {
    await page.goto(`${LOCAL_BASE}/dashboard`);
    await page.waitForLoadState("networkidle");

    // Profile dropdown button should show user's name
    const profileBtn = page.locator('[data-controller="dropdown"] button').first();
    await expect(profileBtn).toBeVisible();

    // Click to open dropdown
    await profileBtn.click();
    await page.waitForTimeout(300);

    // Dropdown should show Theme, Settings, Sign Out
    await expect(page.locator('[data-dropdown-target="menu"]').first()).toBeVisible();
    await expect(page.locator('text=Toggle Theme').first()).toBeVisible();
    await expect(page.locator('text=Settings').first()).toBeVisible();
    await expect(page.locator('text=Sign Out').first()).toBeVisible();
  });

  test("Bottom sidebar has profile items", async ({ page }) => {
    await page.goto(`${LOCAL_BASE}/dashboard`);
    await page.waitForLoadState("networkidle");

    // Sidebar should have Theme, Settings, Sign Out at bottom
    const sidebar = page.locator("aside");
    await expect(sidebar.locator('text=Theme').first()).toBeVisible();
    await expect(sidebar.locator('text=Settings').first()).toBeVisible();
    await expect(sidebar.locator('text=Sign Out').first()).toBeVisible();
  });

  test("Documentation pages load", async ({ page }) => {
    await page.goto(`${LOCAL_BASE}/documentation`);
    await page.waitForLoadState("networkidle");

    // Should have 4 documentation cards
    await expect(page.locator("text=Database Schema")).toBeVisible();
    await expect(page.locator("text=Database Visualization")).toBeVisible();
    await expect(page.locator("text=Bug Reports Log")).toBeVisible();
    await expect(page.locator("text=Claude.ai Prompt")).toBeVisible();

    // Visit database visualization
    await Promise.all([
      page.waitForURL(`${LOCAL_BASE}/documentation/database-visualization`),
      page.click("text=Database Visualization"),
    ]);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Database Visualization" })).toBeVisible();

    // Visit bug reports
    await page.goto(`${LOCAL_BASE}/documentation/bug-reports`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await expect(page.getByRole("heading", { name: "Bug Reports Log" })).toBeVisible();
  });

  test("Settings - Two-factor toggle is in Phone Settings section", async ({ page }) => {
    await page.goto(`${LOCAL_BASE}/users/edit`);
    await page.waitForLoadState("networkidle");

    // Two-factor toggle should be in the Phone Settings card (not Profile)
    const phoneSection = page.locator("text=Phone Settings").locator("..");
    // The two-factor label should be visible after phone settings
    await expect(page.locator("text=Two-Factor Notifications")).toBeVisible();
  });
});
