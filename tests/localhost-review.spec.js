const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";
const EMAIL = "elijahburrup323@gmail.com";
const PASSWORD = "Eli624462!";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', EMAIL);
  await page.fill('input[name="user[password]"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/dashboard|expensetracker\/?$/),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Login & Dashboard", () => {
  test("login works and dashboard loads", async ({ page }) => {
    await login(page);
    // Dashboard has no h1.text-2xl - card titles are h2.text-sm
    await expect(page.locator("h2").filter({ hasText: "Budget Overview" })).toBeVisible();
    // Check all 6 cards are present
    await expect(page.locator(".rounded-xl")).toHaveCount(6, { timeout: 10000 });
  });

  test("header shows greeting and quote", async ({ page }) => {
    await login(page);
    await expect(page.locator("h1.text-xl")).toContainText("Hello");
    // Quote should be visible (italic text)
    const quote = page.locator('[data-quotes-target="text"]');
    await expect(quote).toBeVisible();
    await expect(quote).not.toBeEmpty();
  });

  test("quote toggle hides/shows quote", async ({ page }) => {
    await login(page);
    const quote = page.locator('[data-quotes-target="text"]');
    const toggle = page.locator('[data-quotes-target="toggle"]');
    await expect(quote).toBeVisible();
    await toggle.click();
    await expect(quote).toBeHidden();
    await toggle.click();
    await expect(quote).toBeVisible();
  });
});

test.describe("Sidebar Navigation", () => {
  test("sidebar is visible with all groups", async ({ page }) => {
    await login(page);
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();
    // Check main nav groups
    await expect(sidebar.locator("text=Accounts")).toBeVisible();
    await expect(sidebar.locator("text=Income Entries")).toBeVisible();
    await expect(sidebar.locator("text=Payments")).toBeVisible();
  });

  test("admin menu is visible for admin user", async ({ page }) => {
    await login(page);
    const sidebar = page.locator("aside");
    await expect(sidebar.locator("text=Admin")).toBeVisible();
    await expect(sidebar.locator("text=Documentation")).toBeVisible();
    await expect(sidebar.locator("text=Frequency Masters")).toBeVisible();
    await expect(sidebar.locator("text=Users")).toBeVisible();
  });

  test("sidebar collapse/expand works", async ({ page }) => {
    await login(page);
    const toggleBtn = page.locator('button[title="Toggle sidebar"]');
    await toggleBtn.click();
    // Sidebar should be collapsed (w-16)
    const sidebar = page.locator("aside");
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
    await toggleBtn.click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");
  });
});

test.describe("Accounts Page", () => {
  test("loads and shows table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await expect(page.locator("h1.text-2xl")).toContainText("Accounts");
    // Wait for data to load (table body should have rows or empty message)
    await page.waitForTimeout(2000);
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("generate data button visible for admin", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await expect(page.locator("text=Generate Data").first()).toBeVisible();
  });

  test("add account button works", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await page.locator("text=Add Account").click();
    // Add row should appear with input fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('select[name="account_type_id"]')).toBeVisible();
  });
});

test.describe("Account Types Page", () => {
  test("loads and shows table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/account_types`);
    await expect(page.locator("h1.text-2xl")).toContainText("Account Types");
    await page.waitForTimeout(2000);
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("generate data button visible", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/account_types`);
    await expect(page.locator("text=Generate Data").first()).toBeVisible();
  });
});

test.describe("Spending Types Page", () => {
  test("loads and shows table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_types`);
    await expect(page.locator("h1.text-2xl")).toContainText("Spending Types");
    await page.waitForTimeout(2000);
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });
});

test.describe("Spending Categories Page", () => {
  test("loads and shows table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/spending_categories`);
    await expect(page.locator("h1.text-2xl")).toContainText("Categories");
    await page.waitForTimeout(2000);
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });
});

test.describe("Payments Page", () => {
  test("loads with filters and table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await expect(page.locator("h1.text-2xl")).toContainText("Payments");
    // Check filter controls exist
    await expect(page.locator('[data-payments-target="filterStartDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterEndDate"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterAccount"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterCategory"]')).toBeVisible();
    await expect(page.locator('[data-payments-target="filterType"]')).toBeVisible();
  });

  test("generate data button visible", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    await expect(page.locator("text=Generate Data").first()).toBeVisible();
  });

  test("spending type column has min-width", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/payments`);
    const th = page.locator('th[data-sort-col="type"]');
    await expect(th).toBeVisible();
    await expect(th).toHaveClass(/min-w/);
  });
});

test.describe("Income Frequencies Page", () => {
  test("loads and shows toggle list", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_user_frequencies`);
    await expect(page.locator("h1.text-2xl")).toContainText("Frequencies");
    await page.waitForTimeout(2000);
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("toggle all button exists", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_user_frequencies`);
    await expect(page.locator('[data-income-user-frequencies-target="toggleAllButton"]')).toBeVisible();
  });
});

test.describe("Income Sources Page", () => {
  test("loads and shows table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_recurrings`);
    await expect(page.locator("h1.text-2xl")).toContainText("Income Sources");
    await page.waitForTimeout(2000);
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });
});

test.describe("Income Entries Page", () => {
  test("loads and shows table", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_entries`);
    await expect(page.locator("h1.text-2xl")).toContainText("Income Entries");
    await page.waitForTimeout(2000);
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });
});

test.describe("Admin Pages", () => {
  test("frequency masters loads", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_frequency_masters`);
    await expect(page.locator("h1.text-2xl")).toContainText("Frequency Masters");
    await page.waitForTimeout(2000);
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("admin users page loads and shows users", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/admin/users`);
    await expect(page.locator("h1.text-2xl")).toContainText("Users");
    await page.waitForTimeout(3000);
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
    // Check that at least one user email is visible
    const body = await page.locator("tbody").textContent();
    expect(body.toLowerCase()).toContain("@");
  });

  test("admin users search works", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/admin/users`);
    await page.waitForTimeout(3000);
    await page.locator('[data-admin-users-target="searchInput"]').fill("elijahburrup");
    await page.locator("text=Search").last().click();
    await page.waitForTimeout(500);
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("documentation page loads", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/documentation`);
    await expect(page.locator("h1.text-2xl")).toContainText("Documentation");
  });
});

test.describe("Theme Toggle", () => {
  test("dark mode toggle works", async ({ page }) => {
    await login(page);
    // Click theme toggle in sidebar
    const themeBtn = page.locator('[data-action="click->theme#toggle"]');
    await themeBtn.click();
    // Check dark class is toggled on html element
    const htmlClass = await page.locator("html").getAttribute("class");
    const isDark = htmlClass?.includes("dark");
    // Toggle back
    await themeBtn.click();
    const htmlClass2 = await page.locator("html").getAttribute("class");
    const isDark2 = htmlClass2?.includes("dark");
    // Should have toggled
    expect(isDark).not.toBe(isDark2);
  });
});

test.describe("No Console Errors", () => {
  test("dashboard has no JS errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await login(page);
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  test("payments page has no JS errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await login(page);
    await page.goto(`${BASE}/payments`);
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  test("admin users page has no JS errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await login(page);
    await page.goto(`${BASE}/admin/users`);
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  test("accounts page has no JS errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await login(page);
    await page.goto(`${BASE}/accounts`);
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });
});
