const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/expensetracker";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");
  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill("test@test.com");
  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill("password123");
  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();
  await page.waitForTimeout(4000);
}

async function enableDarkMode(page) {
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  });
  await page.waitForTimeout(500);
}

async function enableLightMode(page) {
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  });
  await page.waitForTimeout(500);
}

test.describe.serial("Dark Mode & Screen Review", () => {

  test("login page renders correctly in dark mode", async ({ page }) => {
    await page.goto(`${BASE}/users/sign_in`);
    await page.waitForLoadState("networkidle");
    await enableDarkMode(page);
    await page.screenshot({ path: "test-results/login-dark.png", fullPage: true });

    // Check dark background is applied
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.querySelector(".min-h-screen")).backgroundColor;
    });
    console.log("Login page bg in dark mode:", bgColor);

    // Check form card has dark bg
    const cardBg = await page.evaluate(() => {
      const card = document.querySelector(".bg-white, .dark\\:bg-gray-800");
      return card ? window.getComputedStyle(card).backgroundColor : "not found";
    });
    console.log("Login card bg:", cardBg);

    // Check heading text is visible (should be white in dark mode)
    const heading = page.locator("h2");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Welcome back");
  });

  test("dashboard renders correctly in both modes", async ({ page }) => {
    await login(page);

    // Light mode screenshot
    await enableLightMode(page);
    await page.screenshot({ path: "test-results/dashboard-light.png", fullPage: true });

    // Dark mode screenshot
    await enableDarkMode(page);
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/dashboard-dark.png", fullPage: true });

    // Check cards have dark bg
    const cards = page.locator(".bg-white.dark\\:bg-gray-800");
    const cardCount = await cards.count();
    console.log("Dashboard cards with dark class:", cardCount);

    // Verify heading is visible
    await expect(page.locator("h1")).toContainText("Hello");
  });

  test("spending types page dark mode", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await enableDarkMode(page);
    await page.waitForTimeout(500);

    await page.screenshot({ path: "test-results/spending-types-dark.png", fullPage: true });

    // Verify table loaded
    await expect(page.locator("tbody")).not.toContainText("Loading...");

    // Check row text colors in dark mode
    const firstRowName = page.locator("tbody tr:first-child td:nth-child(2)");
    if (await firstRowName.count() > 0) {
      const nameColor = await firstRowName.evaluate(el => window.getComputedStyle(el).color);
      console.log("Spending type name color in dark mode:", nameColor);
    }

    // Test Add mode
    await page.click('button:has-text("Add Spending Type")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/spending-types-add-dark.png", fullPage: true });

    // Check input field styling
    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.count() > 0) {
      const inputBg = await nameInput.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const inputColor = await nameInput.evaluate(el => window.getComputedStyle(el).color);
      console.log("Input bg:", inputBg, "color:", inputColor);
    }

    // Cancel
    await page.click('button[title="Cancel"]');
    await page.waitForTimeout(500);
  });

  test("spending categories page dark mode", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await enableDarkMode(page);
    await page.waitForTimeout(500);

    await page.screenshot({ path: "test-results/spending-categories-dark.png", fullPage: true });

    // Verify table loaded
    await expect(page.locator("tbody")).not.toContainText("Loading...");

    // Test debt toggle visual
    const debtToggles = page.locator("button.debt-toggle");
    const toggleCount = await debtToggles.count();
    console.log("Debt toggles found:", toggleCount);

    // Test Add mode
    await page.click('button:has-text("Add Spending Category")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/spending-categories-add-dark.png", fullPage: true });

    // Check select dropdown styling
    const typeSelect = page.locator('select[name="spending_type_id"]');
    if (await typeSelect.count() > 0) {
      const selectBg = await typeSelect.evaluate(el => window.getComputedStyle(el).backgroundColor);
      console.log("Select bg in dark mode:", selectBg);
    }

    await page.click('button[title="Cancel"]');
    await page.waitForTimeout(500);
  });

  test("account types page dark mode", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/account_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await enableDarkMode(page);
    await page.waitForTimeout(500);

    await page.screenshot({ path: "test-results/account-types-dark.png", fullPage: true });

    // Verify table loaded
    await expect(page.locator("tbody")).not.toContainText("Loading...");

    // Test Add mode
    await page.click('button:has-text("Add Account Type")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/account-types-add-dark.png", fullPage: true });

    await page.click('button[title="Cancel"]');
    await page.waitForTimeout(500);
  });

  test("accounts page dark mode", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await enableDarkMode(page);
    await page.waitForTimeout(500);

    await page.screenshot({ path: "test-results/accounts-dark.png", fullPage: true });

    // Verify table loaded
    await expect(page.locator("tbody")).not.toContainText("Loading...");

    // Test budget toggles
    const budgetToggles = page.locator("button.budget-toggle");
    const toggleCount = await budgetToggles.count();
    console.log("Budget toggles found:", toggleCount);

    // Test Add mode
    await page.click('button:has-text("Add Account")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/accounts-add-dark.png", fullPage: true });

    // Check balance input styling
    const balanceInput = page.locator('input[name="balance"]');
    if (await balanceInput.count() > 0) {
      const balBg = await balanceInput.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const balColor = await balanceInput.evaluate(el => window.getComputedStyle(el).color);
      console.log("Balance input bg:", balBg, "color:", balColor);
    }

    await page.click('button[title="Cancel"]');
    await page.waitForTimeout(500);
  });

  test("navbar theme toggle works", async ({ page }) => {
    await login(page);
    await enableLightMode(page);

    // Open user dropdown
    const dropdownBtn = page.locator('[data-action="click->dropdown#toggle"]');
    await dropdownBtn.click();
    await page.waitForTimeout(500);

    // Find theme toggle
    const themeToggle = page.locator('[data-action="click->theme#toggle"]');
    await expect(themeToggle).toBeVisible();

    // Click to enable dark mode
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Verify dark class is on html element
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark).toBe(true);

    await page.screenshot({ path: "test-results/navbar-dark-toggle.png", fullPage: true });

    // Toggle back to light
    await themeToggle.click();
    await page.waitForTimeout(500);
    const isLight = await page.evaluate(() => !document.documentElement.classList.contains("dark"));
    expect(isLight).toBe(true);
  });

  test("light mode screenshots for comparison", async ({ page }) => {
    await login(page);
    await enableLightMode(page);

    // Spending types
    await page.goto(`${BASE}/spending_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test-results/spending-types-light.png", fullPage: true });

    // Spending categories
    await page.goto(`${BASE}/spending_categories`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test-results/spending-categories-light.png", fullPage: true });

    // Account types
    await page.goto(`${BASE}/account_types`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test-results/account-types-light.png", fullPage: true });

    // Accounts
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test-results/accounts-light.png", fullPage: true });
  });
});
