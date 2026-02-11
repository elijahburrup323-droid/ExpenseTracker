const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', "test@example.com");
  await page.fill('input[name="user[password]"]', "password123");
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Open Month Master — Dashboard Integration", () => {
  test("Dashboard loads with month navigation", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    // Month labels should be visible
    const monthLabels = page.locator("[data-dashboard-target='monthLabel']");
    await expect(monthLabels.first()).toBeVisible();

    // Should show a month name (e.g., "February 2026")
    const text = await monthLabels.first().textContent();
    expect(text).toMatch(/\w+ \d{4}/);
  });

  test("Navigating to prev month persists in open_month_master", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    // Get initial month label
    const monthLabel = page.locator("[data-dashboard-target='monthLabel']").first();
    const initialText = await monthLabel.textContent();

    // Click prev month and wait for API responses
    const prevBtn = page.locator("[data-action='click->dashboard#prevMonth']").first();
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes("/api/open_month_master") && resp.request().method() === "PUT"),
      page.waitForResponse(resp => resp.url().includes("/api/dashboard/card_data")),
      prevBtn.click(),
    ]);

    // Month label should have changed
    const newText = await monthLabel.textContent();
    expect(newText).not.toBe(initialText);

    // Reload the page — month should still be the navigated month (persisted)
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    const persistedText = await page.locator("[data-dashboard-target='monthLabel']").first().textContent();
    expect(persistedText).toBe(newText);

    // Clean up: navigate back to current month
    const nextBtn = page.locator("[data-action='click->dashboard#nextMonth']").first();
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes("/api/open_month_master") && resp.request().method() === "PUT"),
      nextBtn.click(),
    ]);
  });

  test("API returns open_month_master record", async ({ page }) => {
    await login(page);

    const response = await page.request.get(`${BASE}/api/open_month_master`, {
      headers: { "Accept": "application/json" }
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty("current_year");
    expect(data).toHaveProperty("current_month");
    expect(data).toHaveProperty("is_closed");
    expect(data.current_month).toBeGreaterThanOrEqual(1);
    expect(data.current_month).toBeLessThanOrEqual(12);
  });
});
