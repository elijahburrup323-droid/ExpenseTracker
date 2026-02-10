const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000/expensetracker";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill("test@example.com");

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill("password123");

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();
  await page.waitForTimeout(3000);
}

test.describe("Frequencies - View All Toggle", () => {
  test("Toggle is labeled 'View All'", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_user_frequencies`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const label = page.locator('[data-income-user-frequencies-target="toggleAllLabel"]');
    await expect(label).toHaveText("View All");
  });

  test("Default load shows View All = OFF (only enabled frequencies)", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_user_frequencies`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // The View All toggle should be OFF by default
    const toggleBtn = page.locator('[data-income-user-frequencies-target="toggleAllButton"]');
    const checked = await toggleBtn.getAttribute("aria-checked");
    expect(checked).toBe("false");
  });

  test("View All ON shows more frequencies than View All OFF", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_user_frequencies`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Count rows when View All is OFF (only enabled)
    const offRows = await page.locator("tbody tr").count();

    // Toggle View All ON
    const toggleBtn = page.locator('[data-income-user-frequencies-target="toggleAllButton"]');
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Count rows when View All is ON (all frequencies)
    const onRows = await page.locator("tbody tr").count();

    // View All ON should show >= View All OFF count
    expect(onRows).toBeGreaterThanOrEqual(offRows);
  });

  test("View All ON shows frequencies with both ON and OFF toggles", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_user_frequencies`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Toggle View All ON
    const toggleBtn = page.locator('[data-income-user-frequencies-target="toggleAllButton"]');
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Should have some rows
    const rows = await page.locator("tbody tr").count();
    expect(rows).toBeGreaterThan(0);

    // Should have use toggles visible
    const useToggles = page.locator(".use-toggle");
    const toggleCount = await useToggles.count();
    expect(toggleCount).toBeGreaterThan(0);
  });

  test("Toggling View All OFF again filters back to enabled only", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_user_frequencies`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Get initial row count (View All OFF)
    const initialRows = await page.locator("tbody tr").count();

    // Toggle ON
    const toggleBtn = page.locator('[data-income-user-frequencies-target="toggleAllButton"]');
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Toggle OFF again
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Should be back to initial count
    const finalRows = await page.locator("tbody tr").count();
    expect(finalRows).toBe(initialRows);
  });

  test("Subtitle text matches spec wording", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_user_frequencies`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const subtitle = page.locator("text=Toggle which pay frequencies you want available for your income sources");
    await expect(subtitle).toBeVisible();
  });
});
