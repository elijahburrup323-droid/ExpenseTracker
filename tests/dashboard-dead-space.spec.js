// @ts-check
const { test, expect, devices } = require("@playwright/test");

const BASE = "https://mybudgethq.com";

/*  iPad landscape viewport — the primary target for the 3×2 grid.
 *  Using Playwright's built-in iPad Pro 11 landscape profile. */
const IPAD = { ...devices["iPad Pro 11 landscape"] };

/* ──────────────────── helpers ──────────────────── */
async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 15000 });
}

/* ──────────────────── tests ──────────────────── */
test.use({ viewport: { width: 1194, height: 834 } });

test.describe("Dashboard vertical dead-space reduction", () => {

  test("all 6 cards visible on iPad landscape without scrolling (Eli)", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");

    // Wait for the card grid to appear
    const grid = page.locator('[data-dashboard-target="cardsGrid"]');
    await expect(grid).toBeVisible({ timeout: 10000 });

    // All 6 card wrappers should be visible
    const cards = grid.locator('[data-dashboard-target="slotWrapper"]');
    const count = await cards.count();
    expect(count).toBe(6);

    // Each card should be within the viewport (no vertical scroll needed)
    const viewportHeight = page.viewportSize().height;
    for (let i = 0; i < count; i++) {
      const box = await cards.nth(i).boundingBox();
      expect(box).not.toBeNull();
      // Card bottom must be within (or very close to) the viewport
      expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight + 10);
      // Card top must be non-negative
      expect(box.y).toBeGreaterThanOrEqual(-5);
    }
  });

  test("card footers are aligned at consistent height", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");

    const grid = page.locator('[data-dashboard-target="cardsGrid"]');
    await expect(grid).toBeVisible({ timeout: 10000 });

    const footers = grid.locator('[data-role="card-footer"]');
    const footerCount = await footers.count();
    // Should have at least 6 footers (front sides)
    expect(footerCount).toBeGreaterThanOrEqual(6);

    // All visible footers in the same row should share a consistent bottom position
    const bottomPositions = [];
    for (let i = 0; i < footerCount; i++) {
      const visible = await footers.nth(i).isVisible();
      if (visible) {
        const box = await footers.nth(i).boundingBox();
        if (box) bottomPositions.push(Math.round(box.y + box.height));
      }
    }

    // Group footers by approximate row (within 60px of each other = same row)
    const rows = [];
    for (const pos of bottomPositions) {
      const matchingRow = rows.find((r) => Math.abs(r[0] - pos) < 60);
      if (matchingRow) matchingRow.push(pos);
      else rows.push([pos]);
    }

    // Within each row, footer bottoms should be within 2px of each other
    for (const row of rows) {
      const min = Math.min(...row);
      const max = Math.max(...row);
      expect(max - min).toBeLessThanOrEqual(2);
    }
  });

  test("no content overflow on DJ account", async ({ page }) => {
    await login(page, "djburrup@gmail.com", "luckydjb");

    const grid = page.locator('[data-dashboard-target="cardsGrid"]');
    await expect(grid).toBeVisible({ timeout: 10000 });

    const cards = grid.locator('[data-dashboard-target="slotWrapper"]');
    const count = await cards.count();
    expect(count).toBe(6);

    // Check main page is not scrollable (dashboard should be viewport-locked)
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = page.viewportSize().height;
    // Body scroll height should be close to viewport (allow 20px tolerance)
    expect(bodyHeight).toBeLessThanOrEqual(viewportHeight + 20);
  });

  test("spacing values are tighter after deploy", async ({ page }) => {
    await login(page, "elijahburrup323@gmail.com", "Eli624462!");

    const grid = page.locator('[data-dashboard-target="cardsGrid"]');
    await expect(grid).toBeVisible({ timeout: 10000 });

    // Verify card padding — on iPad landscape (>1024px), lg:p-5 = 1.25rem = 20px
    const firstCard = grid.locator('[data-dashboard-target="slotWrapper"]').first();
    const cardPadding = await firstCard.evaluate((el) => {
      return parseInt(window.getComputedStyle(el).paddingTop);
    });
    expect(cardPadding).toBeLessThanOrEqual(20);

    // Verify grid gap — md:gap-5 = 1.25rem = 20px
    const gridGap = await grid.evaluate((el) => {
      return parseInt(window.getComputedStyle(el).gap || window.getComputedStyle(el).rowGap);
    });
    expect(gridGap).toBeLessThanOrEqual(20);
  });
});
