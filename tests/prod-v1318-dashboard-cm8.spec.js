// Dashboard CM-8: Spending Overview expand/collapse verification
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const accounts = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!', name: 'Elijah' },
  { email: 'djburrup@gmail.com', password: 'luckydjb', name: 'DJ' }
];

for (const acct of accounts) {
  test.describe.serial(`Dashboard CM-8: ${acct.name}`, () => {
    let page;

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
      await page.goto(`${BASE}/users/sign_in`);
      await page.locator('#user_email').fill(acct.email);
      await page.locator('#user_password').fill(acct.password);
      await page.locator('input[type="submit"]').click();
      await page.waitForURL(/dashboard/, { timeout: 15000 });

      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }
      await page.waitForLoadState('networkidle');
    });

    test.afterAll(async () => {
      await page.close();
    });

    test('No JavaScript errors on dashboard', async () => {
      const jsErrors = [];
      page.on('pageerror', err => jsErrors.push(err.message));
      await page.reload();
      await page.waitForLoadState('networkidle');
      expect(jsErrors).toEqual([]);
    });

    test('Dashboard loads with 3x2 card grid', async () => {
      const grid = page.locator('[data-dashboard-target="cardsGrid"]');
      await expect(grid).toBeVisible();
      const cards = grid.locator('[data-dashboard-target="slotWrapper"]');
      await expect(cards).toHaveCount(6);
    });

    test('Spending Overview card has flip button', async () => {
      const spendingCard = page.locator('[data-card-type="spending_overview"]');
      await expect(spendingCard).toBeVisible();
      const flipBtn = spendingCard.locator('button[data-action*="flipCard"]').first();
      await expect(flipBtn).toBeVisible();
    });

    test('Flip to back side reveals Spending Breakdown', async () => {
      const spendingCard = page.locator('[data-card-type="spending_overview"]');
      const flipBtn = spendingCard.locator('button[data-action*="flipCard"]').first();
      await flipBtn.click({ force: true });
      await page.waitForTimeout(800);

      // Back side should show "Spending Breakdown" or "By Category"
      const backContent = spendingCard.locator('[data-role="back"]');
      await expect(backContent).toBeVisible();
    });

    test('Back side has expand button', async () => {
      const spendingCard = page.locator('[data-card-type="spending_overview"]');
      const expandBtn = spendingCard.locator('[data-role="expand-btn"]');
      await expect(expandBtn).toBeVisible({ timeout: 3000 });
    });

    test('Expand button covers full grid area', async () => {
      const spendingCard = page.locator('[data-card-type="spending_overview"]');
      const expandBtn = spendingCard.locator('[data-role="expand-btn"]');
      await expandBtn.click({ force: true });
      await page.waitForTimeout(500);

      // Card should have grid-column: 1 / -1
      const gridCol = await spendingCard.evaluate(el => el.style.gridColumn);
      expect(gridCol).toBe('1 / -1');

      // Other cards should be hidden
      const grid = page.locator('[data-dashboard-target="cardsGrid"]');
      const visibleCards = grid.locator('[data-dashboard-target="slotWrapper"]:not(.hidden)');
      await expect(visibleCards).toHaveCount(1);
    });

    test('Collapse icon is visible when expanded', async () => {
      const spendingCard = page.locator('[data-card-type="spending_overview"]');
      const collapseIcon = spendingCard.locator('[data-icon="collapse"]');
      // Should be visible (not hidden) when expanded
      const isHidden = await collapseIcon.evaluate(el => el.classList.contains('hidden'));
      expect(isHidden).toBe(false);
    });

    test('Collapse returns to normal grid', async () => {
      const spendingCard = page.locator('[data-card-type="spending_overview"]');
      const expandBtn = spendingCard.locator('[data-role="expand-btn"]');
      await expandBtn.click({ force: true });
      await page.waitForTimeout(500);

      // All 6 cards should be visible again
      const grid = page.locator('[data-dashboard-target="cardsGrid"]');
      const visibleCards = grid.locator('[data-dashboard-target="slotWrapper"]:not(.hidden)');
      await expect(visibleCards).toHaveCount(6);

      // Grid column should be reset
      const gridCol = await spendingCard.evaluate(el => el.style.gridColumn);
      expect(gridCol).toBe('');
    });

    test(`${acct.name}: Dashboard CM-8 expand/collapse verified`, async () => {
      console.log(`${acct.name}: Dashboard CM-8 verified`);
    });
  });
}
