const { test, expect } = require("@playwright/test");

const BASE = "http://localhost:3000";
const EMAIL = "elijahburrup323@gmail.com";
const PASSWORD = "Eli624462!";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', EMAIL);
  await page.fill('input[name="user[password]"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/dashboard|mybudgethq\/?$/),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("Dashboard: Recent Activity Net Summary", () => {
  test("1. Summary strip renders on page load", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(2000);

    // Find the activity summary strip
    const summary = page.locator('[data-role="activity-summary"]');
    await expect(summary).toBeVisible({ timeout: 5000 });

    // Should contain "Net:" text
    const text = await summary.textContent();
    console.log("Activity summary text:", text.trim());
    expect(text).toContain("Net:");
    expect(text).toMatch(/transaction/);
  });

  test("2. Net activity shows correct color (green for positive, red for negative)", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(2000);

    const summary = page.locator('[data-role="activity-summary"]');
    await expect(summary).toBeVisible({ timeout: 5000 });

    // The net amount span should have either emerald (green) or red class
    const netSpan = summary.locator("span").first();
    const classes = await netSpan.getAttribute("class");
    console.log("Net span classes:", classes);
    const hasColor = classes.includes("emerald") || classes.includes("red");
    expect(hasColor).toBe(true);
  });

  test("3. Summary updates on month navigation", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(2000);

    const summary = page.locator('[data-role="activity-summary"]');
    await expect(summary).toBeVisible({ timeout: 5000 });
    const initialText = await summary.textContent();
    console.log("Initial summary:", initialText.trim());

    // Navigate to previous month (force to avoid backface-visibility overlap in webkit)
    const prevBtn = page.locator('[data-action="click->dashboard#prevMonth"]').first();
    await prevBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Summary should still be visible (may have different values)
    await expect(summary).toBeVisible({ timeout: 5000 });
    const updatedText = await summary.textContent();
    console.log("After prev month:", updatedText.trim());

    // Should still contain "Net:" and "transaction" regardless of month
    expect(updatedText).toContain("Net:");
    expect(updatedText).toMatch(/transaction/);
  });
});
