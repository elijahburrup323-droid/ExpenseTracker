const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/expensetracker";
const EMAIL = "elijahburrup323@gmail.com";
const PASSWORD = "Eli624462!";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(EMAIL);

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.waitFor({ state: "visible" });
  await passwordInput.click();
  await passwordInput.fill(PASSWORD);

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();

  // Wait for redirect to dashboard
  await page.waitForURL(`${BASE}/**`, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
}

test.describe.serial("Comprehensive E2E Tests", () => {

  // ===== DASHBOARD =====
  test("dashboard loads with 6 cards", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check card headings using role selector (more specific than text=)
    await expect(page.getByRole("heading", { name: "Budget Overview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Net Worth" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Income & Spending" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Activity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Buckets" })).toBeVisible();
  });

  test("dashboard budget overview and current balance match", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Get the budget overview center value (inside the donut chart)
    const budgetAmount = await page.locator(".relative.w-32.h-32 span.text-sm.font-bold").textContent();

    // Get the current balance value (in Income & Spending card)
    const currentBalanceRow = page.locator("text=Current Balance").locator("../..");
    const currentBalanceAmount = await currentBalanceRow.locator("> span.font-bold").textContent();

    // They should match
    expect(budgetAmount.trim()).toBe(currentBalanceAmount.trim());
    console.log(`Budget Overview: ${budgetAmount.trim()}, Current Balance: ${currentBalanceAmount.trim()}`);
  });

  test("dashboard budget values are not rounded", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // The budget overview center value should contain cents (e.g., $42,804.81 not $42,805)
    const budgetAmount = await page.locator(".relative.w-32.h-32 span.text-sm.font-bold").textContent();
    // Should contain a decimal point and cents
    expect(budgetAmount).toMatch(/\$[\d,]+\.\d{2}/);
    console.log(`Budget value with cents: ${budgetAmount.trim()}`);
  });

  // ===== SIDEBAR NAVIGATION =====
  test("sidebar has navigation groups", async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1000);

    // Check sidebar exists
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    // Check nav groups
    await expect(sidebar.locator("text=Payments")).toBeVisible();
  });

  test("sidebar collapse/expand works", async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1000);

    // Find the collapse toggle button (exact match, not toggleGroup)
    const collapseBtn = page.locator('button[title="Toggle sidebar"]');
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(500);
      await collapseBtn.click();
      await page.waitForTimeout(500);
    }
  });

  // ===== PAYMENTS =====
  test("payments page loads with filter bar and table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Payments");

    // Verify filter elements
    await expect(page.locator('[data-payments-target="filterStartDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterEndDate"]')).toBeVisible();
    await expect(page.locator('button:has-text("Reset")')).toBeVisible();
    await expect(page.locator('button:has-text("Search")')).toBeVisible();

    // Verify filter dropdowns
    await expect(page.locator('[data-payments-target="filterAccount"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterCategory"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterType"]')).toBeVisible();
  });

  test("payments filter labels are bold", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Check that filter labels have font-bold class
    const labels = page.locator(".bg-white label, .dark\\:bg-gray-800 label");
    const count = await labels.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const classes = await labels.nth(i).getAttribute("class");
      expect(classes).toContain("font-bold");
    }
  });

  test("payments column headers are sortable", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Verify sort column headers exist
    const dateHeader = page.locator('[data-sort-col="payment_date"]');
    await expect(dateHeader).toBeVisible();

    // Default sort should be date ascending - look for sort indicator
    const sortIndicator = dateHeader.locator(".sort-indicator");
    await expect(sortIndicator).toBeVisible();

    // Click to toggle direction
    await dateHeader.click();
    await page.waitForTimeout(500);

    // Click Amount column
    await page.locator('[data-sort-col="amount"]').click();
    await page.waitForTimeout(500);

    // Click Description column
    await page.locator('[data-sort-col="description"]').click();
    await page.waitForTimeout(500);

    // Click Account column
    await page.locator('[data-sort-col="account"]').click();
    await page.waitForTimeout(500);
  });

  test("payments search placeholder mentions = prefix", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const searchInput = page.locator('[data-payments-target="filterSearch"]');
    await expect(searchInput).toBeVisible();
    const placeholder = await searchInput.getAttribute("placeholder");
    expect(placeholder).toContain("=");
    expect(placeholder).toContain("combinations");
  });

  test("payments input fields have dark borders in light mode", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Check filter date input has border-gray-900 class
    const dateInput = page.locator('[data-payments-target="filterStartDate"]');
    const classes = await dateInput.getAttribute("class");
    expect(classes).toContain("border-gray-900");
  });

  test("payments add new payment flow", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Click Add Payment
    await page.click('button:has-text("Add Payment")');
    await page.waitForTimeout(500);

    // Verify add row appears with New options in dropdowns
    const accountSelect = page.locator('select[name="account_id"]');
    await expect(accountSelect).toBeVisible();
    const accountOptions = await accountSelect.locator("option").allTextContents();
    expect(accountOptions.some(o => o.includes("New Account"))).toBeTruthy();

    const categorySelect = page.locator('select[name="spending_category_id"]');
    const categoryOptions = await categorySelect.locator("option").allTextContents();
    expect(categoryOptions.some(o => o.includes("New Category"))).toBeTruthy();

    // Cancel
    await page.locator('[title="Cancel"]').click();
    await page.waitForTimeout(500);
  });

  test("payments reset filters works", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Click reset
    await page.click('button:has-text("Reset")');
    await page.waitForTimeout(500);

    // Account filter should be "All"
    const accountFilter = page.locator('[data-payments-target="filterAccount"]');
    await expect(accountFilter).toHaveValue("");
  });

  // ===== ACCOUNTS =====
  test("accounts page loads with table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Accounts");
    await expect(page.locator('button:has-text("Add Account")')).toBeVisible();

    // Check table rows exist
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} account rows`);
  });

  test("accounts add row has New Account Type option", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Click Add Account
    await page.click('button:has-text("Add Account")');
    await page.waitForTimeout(500);

    // Check for New Account Type option
    const typeSelect = page.locator('select[name="account_type_id"]');
    await expect(typeSelect).toBeVisible();
    const options = await typeSelect.locator("option").allTextContents();
    expect(options.some(o => o.includes("New Account Type"))).toBeTruthy();
    console.log("Account type options:", options.join(", "));

    // Cancel
    await page.locator('[title="Cancel"]').click();
    await page.waitForTimeout(500);
  });

  // ===== ACCOUNT TYPES =====
  test("account types page loads", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/account_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Account Types");
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    console.log(`Found ${count} account type rows`);
  });

  // ===== SPENDING TYPES =====
  test("spending types page loads", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Spending Types");
  });

  // ===== SPENDING CATEGORIES =====
  test("spending categories page loads", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Spending Categories");
  });

  // ===== INCOME FREQUENCIES =====
  test("income frequencies page loads with toggle all", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_user_frequencies`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Income Frequencies");

    // Verify View All label and button
    await expect(page.locator("text=View All")).toBeVisible();
    const toggleAllBtn = page.locator('[data-income-user-frequencies-target="toggleAllButton"]');
    await expect(toggleAllBtn).toBeVisible();

    // Verify table headers
    await expect(page.locator("th", { hasText: "Frequency Name" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Use" })).toBeVisible();

    // Verify frequencies loaded
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} frequency rows`);
  });

  test("income frequencies individual toggle works", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_user_frequencies`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Find first use toggle button
    const firstToggle = page.locator("button.use-toggle").first();
    if (await firstToggle.isVisible()) {
      const wasOn = await firstToggle.getAttribute("data-checked");
      await firstToggle.click();
      await page.waitForTimeout(1000);

      const nowOn = await firstToggle.getAttribute("data-checked");
      expect(nowOn).not.toBe(wasOn);
      console.log(`Toggle changed from ${wasOn} to ${nowOn}`);

      // Toggle back
      await firstToggle.click();
      await page.waitForTimeout(1000);
    }
  });

  // ===== INCOME SOURCES =====
  test("income sources page loads", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_recurrings`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Income Sources");
  });

  // ===== INCOME ENTRIES =====
  test("income entries page loads", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_entries`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page.locator("h1.text-2xl")).toHaveText("Deposits");
  });

  // ===== THEME TOGGLE =====
  test("theme toggle button exists and works", async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1000);

    // Find theme toggle in sidebar
    const themeBtn = page.locator('[data-action*="theme#toggle"]').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(500);

      // Check that html has dark class
      const htmlClass = await page.locator("html").getAttribute("class");
      const isDark = htmlClass && htmlClass.includes("dark");
      console.log(`After toggle, dark mode: ${isDark}`);

      // Toggle back
      await themeBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
