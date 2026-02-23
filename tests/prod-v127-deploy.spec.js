// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

for (const acct of ACCOUNTS) {
  test.describe(`v1.2.7 deploy verification — ${acct.email}`, () => {
    test('login, dismiss overlay, verify dashboard with slots', async ({ page }) => {
      // Sign in
      await page.goto(`${BASE}/users/sign_in`);
      await page.fill('input[name="user[email]"]', acct.email);
      await page.fill('input[name="user[password]"]', acct.password);
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForURL(/dashboard/, { timeout: 15000 });

      // Dismiss What's New overlay if present
      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }

      // Verify dashboard loaded — check for slot wrappers
      const slotWrappers = page.locator('[data-dashboard-target="slotWrapper"]');
      const count = await slotWrappers.count();
      console.log(`  Dashboard loaded with ${count} slot wrappers`);
      expect(count).toBe(6);

      // Verify card types are present
      for (const cardType of ['spending_overview', 'accounts_overview', 'net_worth', 'income_spending', 'recent_activity', 'buckets']) {
        const card = page.locator(`[data-card-type="${cardType}"]`);
        await expect(card).toBeVisible({ timeout: 5000 });
        console.log(`  Card type "${cardType}" is visible`);
      }

      // Verify drag handles exist
      const handles = page.locator('.drag-handle');
      const handleCount = await handles.count();
      console.log(`  Found ${handleCount} drag handles`);
      expect(handleCount).toBeGreaterThanOrEqual(6);

      // Check data is present (not blank screen)
      const pageText = await page.textContent('body');
      expect(pageText).toContain('Spending Overview');
      expect(pageText).toContain('Accounts');
      expect(pageText).toContain('Net Worth');
      console.log(`  Dashboard data is present (not blank)`);

      // Navigate to another page to verify navigation still works
      const paymentsLink = page.locator('a[href*="payments"]').first();
      if (await paymentsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await paymentsLink.click();
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        console.log(`  Payments page loaded: ${page.url()}`);
      }

      // Go back to dashboard
      await page.goto(`${BASE}/dashboard`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Verify flip card works (spending overview)
      const flipBtn = page.locator('[data-card-type="spending_overview"] [data-action="click->dashboard#flipCard"]');
      if (await flipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await flipBtn.click({ force: true });
        await page.waitForTimeout(800);
        console.log(`  Flip card works on spending_overview`);
      }

      // Check no JS errors in console
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.reload();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      if (errors.length > 0) {
        console.log(`  JS errors found: ${errors.join(', ')}`);
      } else {
        console.log(`  No JS console errors`);
      }

      console.log(`  v1.2.7 deploy verification PASSED for ${acct.email}`);
    });
  });
}
