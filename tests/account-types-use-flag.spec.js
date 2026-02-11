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

test.describe("Account Types — Use Flag", () => {
  test("Account Types page shows Use column header and toggle switches", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/account_types`);
    await page.waitForLoadState("networkidle");

    // Use column header exists
    const useHeader = page.locator("th", { hasText: "Use" });
    await expect(useHeader).toBeVisible();

    // At least one toggle switch should be visible
    const toggles = page.locator("button.use-toggle");
    await expect(toggles.first()).toBeVisible({ timeout: 5000 });

    // All toggles should default to ON (checked=true)
    const count = await toggles.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const checked = await toggles.nth(i).getAttribute("data-checked");
      expect(checked).toBe("true");
    }
  });

  test("Toggling Use OFF hides account type from Accounts dropdown", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/account_types`);
    await page.waitForLoadState("networkidle");

    // Wait for table to render with toggles
    const toggles = page.locator("button.use-toggle");
    await expect(toggles.first()).toBeVisible({ timeout: 5000 });

    // Get the first account type name
    const firstRow = page.locator("tbody tr").first();
    const firstTypeName = await firstRow.locator("td:nth-child(2)").textContent();

    // Toggle the first Use switch OFF and wait for the PUT response
    const firstToggle = firstRow.locator("button.use-toggle");
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes("/api/account_types/") && resp.request().method() === "PUT"),
      firstToggle.click(),
    ]);

    // Verify it's now OFF
    await expect(firstToggle).toHaveAttribute("data-checked", "false");

    // Navigate to Accounts page
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState("networkidle");

    // Wait for the accounts table to render (the Stimulus controller fetches data)
    await page.waitForTimeout(1000);

    // Click Add Account
    const addBtn = page.locator('button:has-text("Add Account")');
    await addBtn.click();

    // Check the account type dropdown does NOT contain the toggled-off type
    const typeSelect = page.locator("select[name='account_type_id']");
    await expect(typeSelect).toBeVisible();
    const options = await typeSelect.locator("option").allTextContents();
    expect(options).not.toContain(firstTypeName.trim());

    // Clean up: go back and toggle it ON again
    await page.goto(`${BASE}/account_types`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("button.use-toggle").first()).toBeVisible({ timeout: 5000 });
    const cleanupToggle = page.locator("tbody tr").first().locator("button.use-toggle");
    await expect(cleanupToggle).toHaveAttribute("data-checked", "false");
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes("/api/account_types/") && resp.request().method() === "PUT"),
      cleanupToggle.click(),
    ]);
    await expect(cleanupToggle).toHaveAttribute("data-checked", "true");
  });
});
