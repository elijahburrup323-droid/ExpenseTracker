// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

for (const acct of ACCOUNTS) {
  test.describe(`v1.3.0 Soft Close screen — ${acct.email}`, () => {
    test('navigates to Soft Close page and verifies checklist', async ({ page }) => {
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

      // Navigate to Soft Close page
      await page.goto(`${BASE}/soft_close`);
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log(`  Soft Close page loaded for ${acct.email}`);

      // Verify page title
      const heading = page.locator('h1:has-text("Soft Close Month")');
      await expect(heading).toBeVisible({ timeout: 5000 });
      console.log(`  Page heading visible`);

      // Verify checklist section exists
      const checklistBody = page.locator('[data-soft-close-target="checklistBody"]');
      await expect(checklistBody).toBeVisible({ timeout: 5000 });

      // Wait for checklist to load (no "Loading..." text)
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-soft-close-target="checklistBody"]');
        return el && !el.textContent.includes('Loading');
      }, { timeout: 10000 });
      console.log(`  Checklist loaded`);

      // Verify checklist has items (should have green/red icons)
      const checkItems = checklistBody.locator('svg');
      const itemCount = await checkItems.count();
      expect(itemCount).toBeGreaterThanOrEqual(8);
      console.log(`  ${itemCount} checklist items found`);

      // Verify summary section exists and loaded
      const summaryBody = page.locator('[data-soft-close-target="summaryBody"]');
      await expect(summaryBody).toBeVisible();
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-soft-close-target="summaryBody"]');
        return el && !el.textContent.includes('Loading');
      }, { timeout: 10000 });
      console.log(`  Summary loaded`);

      // Verify summary has currency values
      const summaryText = await summaryBody.textContent();
      expect(summaryText).toContain('$');
      console.log(`  Summary contains currency values`);

      // Verify Close Month button exists and is disabled
      const closeBtn = page.locator('[data-soft-close-target="closeButton"]');
      await expect(closeBtn).toBeVisible();
      await expect(closeBtn).toBeDisabled();
      console.log(`  Close Month button visible and disabled`);

      // Verify user confirmation checkboxes exist
      const reviewedToggle = page.locator('[data-soft-close-target="reviewedTotals"]');
      const finalToggle = page.locator('[data-soft-close-target="finalConfirmation"]');
      await expect(reviewedToggle).toBeVisible();
      await expect(finalToggle).toBeVisible();
      console.log(`  User confirmation checkboxes visible`);

      // Check both user items
      await reviewedToggle.check();
      await finalToggle.check();
      console.log(`  User items checked`);

      // Verify Close Month button state (may be enabled if system checks pass)
      // We just verify it's clickable or still disabled (depends on system checks)
      const isDisabled = await closeBtn.isDisabled();
      console.log(`  Close Month button disabled=${isDisabled} after checking user items`);

      // Verify Cancel link exists and points to dashboard
      const cancelLink = page.locator('a:has-text("Cancel")');
      await expect(cancelLink).toBeVisible();
      const href = await cancelLink.getAttribute('href');
      expect(href).toContain('dashboard');
      console.log(`  Cancel link points to dashboard`);

      // DO NOT actually click Close Month — that would change production state!

      console.log(`  CM-5 Soft Close verification PASSED for ${acct.email}`);
    });
  });
}
