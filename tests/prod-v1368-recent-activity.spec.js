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

function recentActivityCard(page) {
  return page.locator('[data-card-type="recent_activity"]');
}

test.describe("Production v1.3.68 — Recent Activity R+S", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
  });

  test("1. Front: muted colors on net summary", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 10000 });

    const summary = card.locator('[data-role="activity-summary"]');
    await expect(summary).toBeVisible();
    const netSpan = summary.locator("span").first();
    const classes = await netSpan.getAttribute("class");
    console.log("Prod net span classes:", classes);

    expect(classes).not.toContain("text-emerald-600 ");
    expect(classes).not.toContain("text-red-600 ");
  });

  test("2. Front: card renders with fixed height", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 10000 });

    const overflow = await card.evaluate(el => getComputedStyle(el).overflow);
    expect(overflow).toContain("hidden");
  });

  test("3. Flip auto-expands and shows Monthly Activity", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 10000 });

    const heightBefore = await card.evaluate(el => el.getBoundingClientRect().height);

    // Wait for Stimulus controller to connect
    await page.waitForTimeout(1000);
    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await expect(flipBtn).toBeVisible({ timeout: 5000 });
    await flipBtn.click({ force: true });
    await page.waitForTimeout(3000);

    // Card should have data-expanded attribute set by _expandCard
    const isExpanded = await card.evaluate(el => el.getAttribute('data-expanded') === 'true');
    console.log(`Prod expanded: ${isExpanded}`);
    expect(isExpanded).toBe(true);

    // Flipper should be rotated to show back
    const flipper = card.locator('[data-role="flipper"]');
    const transform = await flipper.evaluate(el => el.style.transform);
    console.log(`Prod flipper transform: ${transform}`);
    expect(transform).toContain("rotateY(180deg)");

    const backTitle = card.locator('[data-role="back"] h2');
    await expect(backTitle).toContainText("Monthly Activity");
  });

  test("4. Flip back auto-collapses", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 10000 });

    // Flip
    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await flipBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Flip back
    const flipBackBtn = card.locator('[data-action="click->dashboard#flipCardBack"]');
    await flipBackBtn.click({ force: true });
    await page.waitForTimeout(1500);

    const height = await card.evaluate(el => el.getBoundingClientRect().height);
    expect(height).toBeLessThan(300);
  });

  test("5. No regressions — flip icon and month nav present", async ({ page }) => {
    const card = recentActivityCard(page);
    await expect(card).toBeVisible({ timeout: 10000 });

    const flipBtn = card.locator('[data-action="click->dashboard#flipCard"]');
    await expect(flipBtn).toBeVisible();

    const prevBtn = card.locator('[data-action="click->dashboard#prevMonth"]').first();
    await expect(prevBtn).toBeVisible();
  });

  test("6. Version is 1.3.68", async ({ page }) => {
    // Check footer or version endpoint
    const versionText = await page.locator("text=1.3.68").first();
    // If version is displayed anywhere, verify it. Otherwise just check the page loads.
    const pageContent = await page.content();
    expect(pageContent).toContain("1.3.68");
  });
});
