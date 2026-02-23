// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

for (const acct of ACCOUNTS) {
  test.describe(`v1.2.9 CM-13 Dashboard dual breakdown — ${acct.email}`, () => {
    test('flip card shows By Category + By Spending Type sections', async ({ page }) => {
      // Sign in
      await page.goto(`${BASE}/users/sign_in`);
      await page.fill('input[name="user[email]"]', acct.email);
      await page.fill('input[name="user[password]"]', acct.password);
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForURL(/dashboard/, { timeout: 15000 });

      // Dismiss What's New overlay
      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }

      // Find spending_overview card
      const spendingCard = page.locator('[data-card-type="spending_overview"]');
      await expect(spendingCard).toBeVisible({ timeout: 5000 });
      console.log(`  Spending Overview card visible for ${acct.email}`);

      // Click flip button
      const flipBtn = spendingCard.locator('[data-action="click->dashboard#flipCard"]');
      await flipBtn.click({ force: true });
      // Wait for flip animation
      await page.waitForTimeout(700);

      // Check back side content
      const backContent = spendingCard.locator('[data-role="card-back-content"]');
      await expect(backContent).toBeVisible({ timeout: 5000 });

      const backHtml = await backContent.innerHTML();

      // Verify "By Category" section header
      expect(backHtml).toContain('By Category');
      console.log(`  "By Category" section present`);

      // Verify "By Spending Type" section header
      expect(backHtml).toContain('By Spending Type');
      console.log(`  "By Spending Type" section present`);

      // Verify there are color dots (spending data exists)
      const dots = backContent.locator('.rounded-full.flex-shrink-0');
      const dotCount = await dots.count();
      console.log(`  ${dotCount} breakdown items found`);
      expect(dotCount).toBeGreaterThan(0);

      // Verify totals line(s) exist
      expect(backHtml).toContain('Total:');
      console.log(`  Total line(s) present`);

      // Flip back
      const flipBackBtn = spendingCard.locator('[data-action="click->dashboard#flipCardBack"]');
      await flipBackBtn.click({ force: true });
      await page.waitForTimeout(700);
      console.log(`  Flipped back successfully`);

      // Flip back first, then navigate month from front side (avoids 3D pointer intercept)
      await flipBackBtn.click({ force: true });
      await page.waitForTimeout(700);

      // Navigate to previous month from front side
      const prevBtn = spendingCard.locator('[data-action="click->dashboard#prevMonth"]').first();
      await prevBtn.click({ force: true });
      await page.waitForTimeout(1500);

      // Flip to back on previous month
      await flipBtn.click({ force: true });
      await page.waitForTimeout(700);

      const backHtml2 = await backContent.innerHTML();
      expect(backHtml2).toContain('By Category');
      expect(backHtml2).toContain('By Spending Type');
      console.log(`  AJAX update preserved dual breakdown on month nav`);

      // Flip back and return to current month
      await flipBackBtn.click({ force: true });
      await page.waitForTimeout(700);
      const nextBtn = spendingCard.locator('[data-action="click->dashboard#nextMonth"]').first();
      await nextBtn.click({ force: true });
      await page.waitForTimeout(1000);

      console.log(`  CM-13 verification PASSED for ${acct.email}`);
    });
  });
}
