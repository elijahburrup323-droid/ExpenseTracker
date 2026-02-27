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

test.describe("Dashboard Slot 1: Available to Spend Redesign", () => {
  test("1. Dashboard loads with new metrics", async ({ page }) => {
    await login(page);
    await page.waitForTimeout(2000);

    // Should show "Available to Spend" label
    await expect(page.getByText("Available to Spend")).toBeVisible({ timeout: 10000 });

    // Should show "Scheduled:" line
    await expect(page.getByText(/Scheduled:/)).toBeVisible();

    // Should show "safe / day" label
    await expect(page.getByText("safe / day")).toBeVisible();

    // Should show "days left" label
    await expect(page.getByText(/days left/)).toBeVisible();

    // Donut chart should still be present
    const donut = page.locator("svg circle[stroke='#a855f7']");
    await expect(donut.first()).toBeVisible();

    // Old metrics should NOT be present
    const dailyAvg = page.getByText("Daily Avg:");
    expect(await dailyAvg.count()).toBe(0);
    const projected = page.getByText("Projected:");
    expect(await projected.count()).toBe(0);
  });

  test("2. API returns new fields", async ({ page }) => {
    await login(page);

    // Call the API directly
    const data = await page.evaluate(async (base) => {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const token = csrfMeta ? csrfMeta.content : "";
      const res = await fetch(`${base}/api/dashboard/card_data`, {
        credentials: "same-origin",
        headers: { Accept: "application/json", "X-CSRF-Token": token },
      });
      return res.json();
    }, BASE);

    // Check that new fields exist in spending_overview slot
    const spending = data.slots?.find(s => s.card_type === "spending_overview")?.data ||
                     data.spending_overview || data;
    console.log("Spending data keys:", Object.keys(spending));

    expect(spending.available_to_spend).toBeDefined();
    expect(spending.scheduled_remaining).toBeDefined();
    expect(spending.safe_daily_spend).toBeDefined();
    expect(spending.days_remaining).toBeDefined();
    expect(spending.category_pressure).toBeDefined();

    // available_to_spend should be a number
    expect(typeof spending.available_to_spend).toBe("number");
  });
});
