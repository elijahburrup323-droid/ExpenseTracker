const { test, expect } = require("@playwright/test");

const BASE = "https://mybudgethq.com";
const EMAIL = "jacismith@home.net";
const PASSWORD = "luckydjb";

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', EMAIL);
  await page.fill('input[name="user[password]"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/dashboard|mybudgethq\/?$/),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

function spendingOverviewCard(page) {
  return page.locator('[data-card-type="spending_overview"]');
}

test.describe("PROD — Spending Overview Financial Flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
  });

  test("1. Card shows financial flow layout", async ({ page }) => {
    const card = spendingOverviewCard(page);
    await expect(card).toBeVisible({ timeout: 10000 });

    const content = card.locator('[data-role="card-content"]');
    const text = await content.textContent();
    console.log("Card content:", text);

    expect(text).toContain("Available Cash");
    expect(text).toContain("Recurring Bills Remaining");
    expect(text).toContain("Est. Variable Spending");
    expect(text).toContain("Projected Safe To Spend");
  });

  test("2. API returns financial flow keys", async ({ page }) => {
    const json = await page.evaluate(async () => {
      const resp = await fetch("/api/dashboard/card_data");
      return resp.json();
    });

    const d = json.spending_overview || json.slots?.find(s => s.card_type === "spending_overview")?.data;
    console.log("API keys:", Object.keys(d || {}));

    expect(d).toBeTruthy();
    expect(d).toHaveProperty("operating_balance");
    expect(d).toHaveProperty("recurring_bills_total");
    expect(d).toHaveProperty("recurring_bills_items");
    expect(d).toHaveProperty("variable_spending_total");
    expect(d).toHaveProperty("variable_spending_items");
    expect(d).toHaveProperty("projected_safe_to_spend");
    expect(typeof d.projected_safe_to_spend).toBe("number");

    // Formula check
    const expected = d.operating_balance - d.recurring_bills_total - d.variable_spending_total;
    expect(Math.abs(d.projected_safe_to_spend - expected)).toBeLessThan(0.02);

    console.log(`Available Cash: ${d.operating_balance}, Bills: ${d.recurring_bills_total}, Variable: ${d.variable_spending_total}, Safe: ${d.projected_safe_to_spend}`);
  });

  test("3. Version is 1.3.72", async ({ page }) => {
    const content = await page.content();
    expect(content).toContain("1.3.72");
  });
});
