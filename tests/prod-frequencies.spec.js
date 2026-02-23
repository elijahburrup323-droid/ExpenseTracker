const { test, expect } = require("@playwright/test");

const BASE = "https://djburrup.com/mybudgethq";

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(email);

  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill(password);

  const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.click();
  await page.waitForTimeout(4000);
}

test.describe("Production Frequencies - View All Toggle", () => {
  test("elijahburrup323 - View All toggle works as view filter", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");
    await page.goto(`${BASE}/income_user_frequencies`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Label should be "View All"
    const label = page.locator('[data-income-user-frequencies-target="toggleAllLabel"]');
    await expect(label).toHaveText("View All");

    // Default: View All OFF
    const toggleBtn = page.locator('[data-income-user-frequencies-target="toggleAllButton"]');
    expect(await toggleBtn.getAttribute("aria-checked")).toBe("false");

    // Count rows OFF
    const offRows = await page.locator("tbody tr").count();

    // Toggle ON
    await toggleBtn.click();
    await page.waitForTimeout(500);
    expect(await toggleBtn.getAttribute("aria-checked")).toBe("true");

    // Count rows ON — should be >= offRows
    const onRows = await page.locator("tbody tr").count();
    expect(onRows).toBeGreaterThanOrEqual(offRows);
  });

  test("djburrup - View All toggle works as view filter", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");
    await page.goto(`${BASE}/income_user_frequencies`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Label should be "View All"
    const label = page.locator('[data-income-user-frequencies-target="toggleAllLabel"]');
    await expect(label).toHaveText("View All");

    // Default: View All OFF
    const toggleBtn = page.locator('[data-income-user-frequencies-target="toggleAllButton"]');
    expect(await toggleBtn.getAttribute("aria-checked")).toBe("false");

    // Toggle ON and verify rows appear
    await toggleBtn.click();
    await page.waitForTimeout(500);
    const rows = await page.locator("tbody tr").count();
    expect(rows).toBeGreaterThan(0);
  });
});
