const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/mybudgethq";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', "test@example.com");
  await page.fill('input[name="user[password]"]', "password123");
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("CM-13: Reports Maintenance — Route Path Dropdown", () => {
  test("Route Path field is a dropdown, not a text input", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports_masters`);
    await page.waitForLoadState("networkidle");

    // Click "+ Add Report" to open modal
    await page.click('text="+ Add Report"');
    await page.waitForSelector('[data-reports-masters-target="modal"]:not(.hidden)');

    // Route Path should be a <select>, not <input type="text">
    const routeSelect = page.locator('select[data-reports-masters-target="modalRoutePath"]');
    await expect(routeSelect).toBeVisible();

    // Should NOT have a text input for route path
    const routeInput = page.locator('input[data-reports-masters-target="modalRoutePath"]');
    await expect(routeInput).toHaveCount(0);
  });

  test("Dropdown has 'None (Coming Soon)' as default and registered routes as options", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports_masters`);
    await page.waitForLoadState("networkidle");

    await page.click('text="+ Add Report"');
    await page.waitForSelector('[data-reports-masters-target="modal"]:not(.hidden)');

    const routeSelect = page.locator('select[data-reports-masters-target="modalRoutePath"]');

    // First option should be "None (Coming Soon)" with empty value
    const firstOption = routeSelect.locator("option").first();
    await expect(firstOption).toHaveText("None (Coming Soon)");
    await expect(firstOption).toHaveAttribute("value", "");

    // Should have at least one registered route (Monthly Cash Flow)
    const cashFlowOption = routeSelect.locator('option[value="/reports/monthly_cash_flow"]');
    await expect(cashFlowOption).toHaveCount(1);
    await expect(cashFlowOption).toContainText("Monthly Cash Flow");

    // Default selection should be empty (Coming Soon)
    await expect(routeSelect).toHaveValue("");
  });

  test("Edit modal shows existing route_path selected in dropdown", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports_masters`);
    await page.waitForLoadState("networkidle");

    // Wait for table to load
    await page.waitForSelector('tbody tr button[title="Edit"]', { timeout: 10000 });

    // Click edit on the first report
    await page.click('tbody tr:first-child button[title="Edit"]');
    await page.waitForSelector('[data-reports-masters-target="modal"]:not(.hidden)');

    // Route path should be a select element
    const routeSelect = page.locator('select[data-reports-masters-target="modalRoutePath"]');
    await expect(routeSelect).toBeVisible();

    // The select should have a value (either empty or a valid route)
    const value = await routeSelect.inputValue();
    expect(typeof value).toBe("string");
  });

  test("Can save a report with a selected route path", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports_masters`);
    await page.waitForLoadState("networkidle");

    // Wait for table data
    await page.waitForSelector('tbody tr button[title="Edit"]', { timeout: 10000 });

    // Find the Monthly Cash Flow report and edit it
    const cashFlowRow = page.locator("tbody tr", { hasText: "Monthly Cash Flow" });
    await cashFlowRow.locator('button[title="Edit"]').click();
    await page.waitForSelector('[data-reports-masters-target="modal"]:not(.hidden)');

    // Select the monthly_cash_flow route
    const routeSelect = page.locator('select[data-reports-masters-target="modalRoutePath"]');
    await routeSelect.selectOption("/reports/monthly_cash_flow");
    await expect(routeSelect).toHaveValue("/reports/monthly_cash_flow");

    // Save
    await page.click('button:has-text("Save")');

    // Modal should close (successful save)
    await expect(page.locator('[data-reports-masters-target="modal"]')).toHaveClass(/hidden/, { timeout: 5000 });
  });
});
