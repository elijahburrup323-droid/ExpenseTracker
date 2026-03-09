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

function spendingOverviewCard(page) {
  return page.locator('[data-card-type="spending_overview"]');
}

test.describe("Spending Overview — Financial Flow Card", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
  });

  test("1. Card renders with financial flow layout", async ({ page }) => {
    const card = spendingOverviewCard(page);
    await expect(card).toBeVisible({ timeout: 10000 });

    const content = card.locator('[data-role="card-content"]');
    await expect(content).toBeVisible();

    const text = await content.textContent();
    console.log("Card content:", text);

    // Must show all four financial flow sections
    expect(text).toContain("Available Cash");
    expect(text).toContain("Recurring Bills Remaining");
    expect(text).toContain("Est. Variable Spending");
    expect(text).toContain("Projected Safe To Spend");
  });

  test("2. Available Cash shows a dollar amount", async ({ page }) => {
    const card = spendingOverviewCard(page);
    await expect(card).toBeVisible({ timeout: 10000 });

    const content = card.locator('[data-role="card-content"]');
    const text = await content.textContent();

    // Should contain dollar amounts
    const hasDollar = /\$[\d,]+\.\d{2}/.test(text);
    expect(hasDollar).toBe(true);
  });

  test("3. Financial flow updates when navigating months", async ({ page }) => {
    const card = spendingOverviewCard(page);
    await expect(card).toBeVisible({ timeout: 10000 });

    const content = card.locator('[data-role="card-content"]');
    const textBefore = await content.textContent();
    console.log("Before month nav:", textBefore);

    // Navigate to previous month
    const prevBtn = card.locator('[data-action="click->dashboard#prevMonth"]').first();
    await prevBtn.click({ force: true });
    await page.waitForTimeout(2000);

    const textAfter = await content.textContent();
    console.log("After month nav:", textAfter);

    // Financial flow sections must still be present after navigation
    expect(textAfter).toContain("Available Cash");
    expect(textAfter).toContain("Projected Safe To Spend");
  });

  test("4. Back side shows spending breakdown", async ({ page }) => {
    const card = spendingOverviewCard(page);
    await expect(card).toBeVisible({ timeout: 10000 });

    // Flip
    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await flipBtn.click({ force: true });
    await page.waitForTimeout(1500);

    const backContent = card.locator('[data-role="back-content"]');
    await expect(backContent).toBeVisible();

    const text = await backContent.textContent();
    console.log("Back content:", text);

    // Back side should show Plan vs Spent section
    expect(text).toContain("Plan vs Spent");
    expect(text).toContain("Spent");
  });

  test("5. API returns new financial flow keys", async ({ page }) => {
    const json = await page.evaluate(async () => {
      const resp = await fetch("/api/dashboard/card_data");
      return resp.json();
    });

    const spendingData = json.spending_overview ||
      json.slots?.find(s => s.card_type === "spending_overview")?.data;
    console.log("API spending data keys:", Object.keys(spendingData || {}));

    expect(spendingData).toBeTruthy();
    expect(spendingData).toHaveProperty("operating_balance");
    expect(spendingData).toHaveProperty("recurring_bills_total");
    expect(spendingData).toHaveProperty("recurring_bills_items");
    expect(spendingData).toHaveProperty("variable_spending_total");
    expect(spendingData).toHaveProperty("variable_spending_items");
    expect(spendingData).toHaveProperty("projected_safe_to_spend");

    // Validate types
    expect(Array.isArray(spendingData.recurring_bills_items)).toBe(true);
    expect(Array.isArray(spendingData.variable_spending_items)).toBe(true);
    expect(typeof spendingData.projected_safe_to_spend).toBe("number");

    // Validate formula: projected = available - bills - variable
    const expected = spendingData.operating_balance - spendingData.recurring_bills_total - spendingData.variable_spending_total;
    expect(Math.abs(spendingData.projected_safe_to_spend - expected)).toBeLessThan(0.02);

    console.log("operating_balance:", spendingData.operating_balance);
    console.log("recurring_bills_total:", spendingData.recurring_bills_total);
    console.log("variable_spending_total:", spendingData.variable_spending_total);
    console.log("projected_safe_to_spend:", spendingData.projected_safe_to_spend);
  });

  test("6. Variable spending items subtract current month spend", async ({ page }) => {
    const json = await page.evaluate(async () => {
      const resp = await fetch("/api/dashboard/card_data");
      return resp.json();
    });

    const spendingData = json.spending_overview ||
      json.slots?.find(s => s.card_type === "spending_overview")?.data;

    if (spendingData.variable_spending_items.length > 0) {
      for (const item of spendingData.variable_spending_items) {
        console.log(`${item.name}: estimate=${item.estimate}, spent=${item.spent}, remaining=${item.remaining}, source=${item.source}`);
        // remaining = max(estimate - spent, 0)
        const expectedRemaining = Math.max(item.estimate - item.spent, 0);
        expect(Math.abs(item.remaining - expectedRemaining)).toBeLessThan(0.02);
        // remaining must never be negative
        expect(item.remaining).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("7. Card layout — footer, flip, expand buttons present", async ({ page }) => {
    const card = spendingOverviewCard(page);
    await expect(card).toBeVisible({ timeout: 10000 });

    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await expect(flipBtn).toBeVisible();

    const expandBtn = card.locator('[data-action="click->dashboard#toggleCardExpand"]').first();
    await expect(expandBtn).toBeVisible();
  });
});
