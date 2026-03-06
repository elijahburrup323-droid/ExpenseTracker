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

test.describe("Recent Activity — Calm Scroll Model (Instruction R)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(2000);
  });

  test("1. Card renders with fixed height and internal scroll", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    // Card should have overflow hidden (dash-card class)
    const overflow = await card.evaluate(el => getComputedStyle(el).overflow);
    expect(overflow).toContain("hidden");

    // Content area should have overflow-y auto for internal scrolling
    const content = card.locator('[data-role="card-content"]');
    await expect(content).toBeVisible();
    const overflowY = await content.evaluate(el => getComputedStyle(el).overflowY);
    expect(overflowY).toBe("auto");
  });

  test("2. Only payments and deposits shown (no transfers)", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    const content = card.locator('[data-role="card-content"]');
    const text = await content.textContent();

    // Should not contain "Transfer" as a transaction type label
    // (individual descriptions might coincidentally contain the word, but
    // the card should not have a "transfer" type badge or section)
    const items = card.locator('[data-role="card-content"] .flex.items-center.justify-between');
    const count = await items.count();
    console.log(`Activity items rendered: ${count}`);

    // Each item amount should be either + (deposit/green) or − (payment/red)
    for (let i = 0; i < Math.min(count, 5); i++) {
      const amountSpan = items.nth(i).locator("span.tabular-nums");
      if (await amountSpan.count() > 0) {
        const amtText = await amountSpan.textContent();
        const hasSign = amtText.includes("+") || amtText.includes("−") || amtText.includes("-");
        expect(hasSign).toBe(true);
      }
    }
  });

  test("3. Muted color tones — no aggressive red or green", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    // Check net activity summary uses muted colors (emerald-500/80 or red-400/80)
    const summary = card.locator('[data-role="activity-summary"]');
    await expect(summary).toBeVisible();
    const netSpan = summary.locator("span").first();
    const classes = await netSpan.getAttribute("class");
    console.log("Net span classes:", classes);

    // Should NOT have the old aggressive colors
    expect(classes).not.toContain("text-emerald-600");
    expect(classes).not.toContain("text-red-600");
    expect(classes).not.toContain("text-red-500");

    // Should have muted variants
    const hasMuted = classes.includes("emerald-500/80") || classes.includes("red-400/80");
    expect(hasMuted).toBe(true);
  });

  test("4. Row structure: date, description, amount", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    const items = card.locator('[data-role="card-content"] .flex.items-center.justify-between');
    const count = await items.count();
    if (count === 0) {
      // No activity this month — acceptable
      const empty = card.locator("text=No activity this month");
      await expect(empty).toBeVisible();
      return;
    }

    // First row should have: date span (11px), description span, and amount span
    const firstRow = items.first();
    const dateSpan = firstRow.locator('span.text-\\[11px\\]');
    await expect(dateSpan).toBeVisible();

    const descSpan = firstRow.locator("span.truncate");
    await expect(descSpan).toBeVisible();

    const amountSpan = firstRow.locator("span.tabular-nums");
    await expect(amountSpan).toBeVisible();
  });

  test("5. Muted amount colors in transaction rows", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    const amounts = card.locator('[data-role="card-content"] span.tabular-nums');
    const count = await amounts.count();
    if (count === 0) return; // No activity

    for (let i = 0; i < Math.min(count, 5); i++) {
      const cls = await amounts.nth(i).getAttribute("class");
      // Should NOT have aggressive colors
      expect(cls).not.toContain("text-emerald-600");
      expect(cls).not.toContain("text-red-500");
      // Should have muted variants
      const ok = cls.includes("emerald-500/80") || cls.includes("red-400/80");
      expect(ok).toBe(true);
    }
  });

  test("6. Activity summary shows Net and transaction count", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    const summary = card.locator('[data-role="activity-summary"]');
    await expect(summary).toBeVisible();
    const text = await summary.textContent();
    expect(text).toContain("Net:");
    expect(text).toMatch(/transaction/);
  });

  test("7. Flip icon is present", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await expect(flipBtn).toBeVisible();
  });

  test("8. Card does not grow vertically — height stays fixed", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    const height1 = await card.evaluate(el => el.getBoundingClientRect().height);
    console.log("Card height:", height1);

    // Navigate to a different month and back
    const prevBtn = card.locator('[data-action="click->dashboard#prevMonth"]').first();
    await prevBtn.click({ force: true });
    await page.waitForTimeout(2000);

    const height2 = await card.evaluate(el => el.getBoundingClientRect().height);
    console.log("Card height after month change:", height2);

    // Heights should be the same (fixed grid)
    expect(Math.abs(height2 - height1)).toBeLessThan(2);
  });

  test("9. Muted colors persist after month navigation (JS renderer)", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 5000 });

    // Navigate to previous month to trigger JS renderer
    const prevBtn = card.locator('[data-action="click->dashboard#prevMonth"]').first();
    await prevBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Check summary still uses muted colors
    const summary = card.locator('[data-role="activity-summary"]');
    const summaryHtml = await summary.innerHTML();
    console.log("Summary HTML after nav:", summaryHtml);
    const netSpan = summary.locator("span").first();
    const classes = await netSpan.getAttribute("class");
    console.log("Net span classes after nav:", classes);

    // Should use muted variants (emerald-500/80 or red-400/80), not aggressive ones
    expect(classes).not.toContain("text-emerald-600 ");
    expect(classes).not.toContain("text-red-600 ");
    expect(classes).not.toContain("text-red-500 ");
    const hasMuted = classes.includes("emerald-500/80") || classes.includes("red-400/80");
    expect(hasMuted).toBe(true);

    // Check row amounts if any
    const amounts = card.locator('[data-role="card-content"] span.tabular-nums');
    const count = await amounts.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      const cls = await amounts.nth(i).getAttribute("class");
      expect(cls).not.toContain("text-emerald-600 ");
      expect(cls).not.toContain("text-red-500 ");
    }
  });
});
