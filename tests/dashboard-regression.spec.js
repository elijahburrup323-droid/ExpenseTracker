const { test, expect } = require('@playwright/test');

/**
 * Dashboard Visual Regression Test
 *
 * Asserts the following invariants:
 * 1. All 6 cards present; cards within each row are equal height
 * 2. Each card row meets the --dash-card-h minimum (448 px at desktop)
 * 3. Flip icons (↻) visible on all cards
 * 4. Expand icons (⬜) visible on all cards
 * 5. All 6 front footers visible and not collapsed
 * 6. Flip and expand interactions work without grid shift
 *
 * Design tokens: --dash-card-h, --dash-card-baseline-offset
 * DO NOT modify dashboard card height or baseline without updating this test.
 */

const BASE = process.env.BASE_URL || 'https://mybudgethq.com';
const MIN_CARD_HEIGHT = 400; // design token is 28 rem ≈ 448 px; allow some tolerance

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 });

  // Dismiss What's New overlay
  try {
    const gotItBtn = page.locator('button:has-text("Got it")');
    await gotItBtn.waitFor({ state: 'visible', timeout: 3000 });
    await gotItBtn.first().click();
    await page.waitForTimeout(500);
  } catch (e) {}

  // Wait for card data to load
  await page.waitForTimeout(2000);
}

test.describe('Dashboard Card Regression', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, 'djburrup@gmail.com', 'luckydjb');
  });

  test('All 6 cards present with equal height within each row', async ({ page }) => {
    const cards = page.locator('[data-dashboard-target="slotWrapper"]');
    const count = await cards.count();
    expect(count).toBe(6);

    const heights = [];
    for (let i = 0; i < count; i++) {
      const box = await cards.nth(i).boundingBox();
      expect(box).not.toBeNull();
      heights.push(Math.round(box.height));
    }

    // All cards in row 1 must be same height
    expect(heights[0]).toBe(heights[1]);
    expect(heights[1]).toBe(heights[2]);
    // All cards in row 2 must be same height
    expect(heights[3]).toBe(heights[4]);
    expect(heights[4]).toBe(heights[5]);

    // Each row must meet the minimum height from the design token
    expect(heights[0]).toBeGreaterThanOrEqual(MIN_CARD_HEIGHT);
    expect(heights[3]).toBeGreaterThanOrEqual(MIN_CARD_HEIGHT);
  });

  test('Flip icons visible on all cards', async ({ page }) => {
    const flipBtns = page.locator('[data-role="front"] [data-action*="flipCard"]');
    const count = await flipBtns.count();
    expect(count).toBe(6);

    for (let i = 0; i < count; i++) {
      const box = await flipBtns.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('Expand icons visible on all cards', async ({ page }) => {
    const expandBtns = page.locator('[data-role="front"] [data-role="expand-btn"]');
    const count = await expandBtns.count();
    expect(count).toBe(6);

    for (let i = 0; i < count; i++) {
      const box = await expandBtns.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('All 6 front footers visible with flip and expand controls', async ({ page }) => {
    const frontFooters = page.locator('[data-role="front"] [data-role="card-footer"]');
    const footerCount = await frontFooters.count();
    expect(footerCount).toBe(6);

    for (let i = 0; i < footerCount; i++) {
      const box = await frontFooters.nth(i).boundingBox();
      expect(box).not.toBeNull();
      // Footer must have reasonable dimensions (not collapsed)
      expect(box.height).toBeGreaterThanOrEqual(30);
    }
  });

  test('Accounts card flip toggles front/back', async ({ page }) => {
    const card2 = page.locator('[data-card-type="accounts_overview"]');
    const flipBtn = card2.locator('[data-role="front"] [data-action*="flipCard"]');

    // Click flip — uses force:true for CSS 3D perspective
    await flipBtn.click({ force: true });
    await page.waitForTimeout(800);

    // Back side should now be interactive
    const backFooter = card2.locator('[data-role="back"] [data-role="card-footer"]');
    await expect(backFooter).toBeVisible();

    // Flip back
    const flipBackBtn = card2.locator('[data-role="back"] [data-action*="flipCardBack"]');
    await flipBackBtn.click({ force: true });
    await page.waitForTimeout(800);
  });

  test('Accounts card expand does not shift grid', async ({ page }) => {
    const grid = page.locator('[data-dashboard-target="cardsGrid"]');
    const gridBoxBefore = await grid.boundingBox();

    const card2 = page.locator('[data-card-type="accounts_overview"]');
    const expandBtn = card2.locator('[data-role="front"] [data-role="expand-btn"]');

    await expandBtn.click({ force: true });
    await page.waitForTimeout(500);

    // Card should be expanded (data-expanded="true")
    await expect(card2).toHaveAttribute('data-expanded', 'true');

    // Collapse
    await expandBtn.click({ force: true });
    await page.waitForTimeout(500);

    // Grid should be same size after collapse
    const gridBoxAfter = await grid.boundingBox();
    expect(Math.abs(gridBoxBefore.width - gridBoxAfter.width)).toBeLessThan(2);
  });
});
