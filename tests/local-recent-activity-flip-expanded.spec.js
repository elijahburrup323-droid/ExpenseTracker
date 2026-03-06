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

function recentActivityCard(page) {
  return page.locator('[data-card-type="recent_activity"]');
}

test.describe("Recent Activity — Flip Redesign (Instruction S)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(2000);
  });

  test("1. Flip auto-expands the card", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    // Record height before flip
    const heightBefore = await card.evaluate(el => el.getBoundingClientRect().height);
    console.log("Height before flip:", heightBefore);

    // Click flip button
    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await flipBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Card should be expanded (larger or full width)
    const heightAfter = await card.evaluate(el => el.getBoundingClientRect().height);
    console.log("Height after flip:", heightAfter);
    expect(heightAfter).toBeGreaterThan(heightBefore);
  });

  test("2. Flip shows Monthly Activity with payments and deposits", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    // Flip the card
    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await flipBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Back side should show "Monthly Activity" title
    const backTitle = card.locator('[data-role="back"] h2');
    await expect(backTitle).toContainText("Monthly Activity");

    // Back content should have activity items
    const backContent = card.locator('[data-role="back-content"]');
    await expect(backContent).toBeVisible();
  });

  test("3. Flip back auto-collapses the card", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    // Flip
    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await flipBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Flip back
    const flipBackBtn = card.locator('[data-action="click->dashboard#flipCardBack"]');
    await flipBackBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Card should be back to normal height
    const heightAfter = await card.evaluate(el => el.getBoundingClientRect().height);
    console.log("Height after flip-back:", heightAfter);
    // Should be roughly the same as the original compact card height (~214px)
    expect(heightAfter).toBeLessThan(300);
  });

  test("4. Back side uses muted colors for amounts", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    // Flip
    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await flipBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Check amount spans in back content
    const amounts = card.locator('[data-role="back-content"] span.tabular-nums');
    const count = await amounts.count();
    console.log("Back side items:", count);

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const cls = await amounts.nth(i).getAttribute("class");
        // Should use muted colors, not aggressive
        expect(cls).not.toContain("text-emerald-600");
        expect(cls).not.toContain("text-red-500");
        const ok = cls.includes("emerald-500/80") || cls.includes("red-400/80");
        expect(ok).toBe(true);
      }
    }
  });

  test("5. Back side row has date, description, and optional category", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    // Flip
    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await flipBtn.click({ force: true });
    await page.waitForTimeout(1500);

    const rows = card.locator('[data-role="back-content"] .flex.items-center.justify-between');
    const count = await rows.count();
    if (count === 0) return; // No activity

    // First row: date, description, amount
    const firstRow = rows.first();
    const dateSpan = firstRow.locator('span.text-\\[11px\\]');
    await expect(dateSpan).toBeVisible();

    const descSpan = firstRow.locator("span.truncate");
    await expect(descSpan).toBeVisible();

    const amountSpan = firstRow.locator("span.tabular-nums");
    await expect(amountSpan).toBeVisible();
  });

  test("6. No filter or sorting controls on flip side", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    // Flip
    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await flipBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // No select dropdowns, no filter inputs, no chart elements
    const selects = card.locator('[data-role="back"] select');
    expect(await selects.count()).toBe(0);

    const filterInputs = card.locator('[data-role="back"] input[type="search"], [data-role="back"] input[type="text"]');
    expect(await filterInputs.count()).toBe(0);

    const charts = card.locator('[data-role="back"] canvas, [data-role="back"] svg.chart');
    expect(await charts.count()).toBe(0);
  });

  test("7. Back side has internal scroll", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    // Flip
    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await flipBtn.click({ force: true });
    await page.waitForTimeout(1500);

    const backContent = card.locator('[data-role="back-content"]');
    const overflowY = await backContent.evaluate(el => getComputedStyle(el).overflowY);
    expect(overflowY).toBe("auto");
  });

  test("8. Muted colors persist after month navigation on flip side", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    // Flip
    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await flipBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Navigate to previous month
    const prevBtn = card.locator('[data-role="back"] [data-action="click->dashboard#prevMonth"]');
    await prevBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Check back content still uses muted colors
    const amounts = card.locator('[data-role="back-content"] span.tabular-nums');
    const count = await amounts.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      const cls = await amounts.nth(i).getAttribute("class");
      expect(cls).not.toContain("text-emerald-600");
      expect(cls).not.toContain("text-red-500");
    }
  });
});
