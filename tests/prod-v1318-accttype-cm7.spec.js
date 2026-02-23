// Account Type Masters CM-7: Delete modal messaging verification
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const accounts = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!', name: 'Elijah' },
  { email: 'djburrup@gmail.com', password: 'luckydjb', name: 'DJ' }
];

for (const acct of accounts) {
  test(`Post-deploy CM-7 verify: ${acct.name}`, async ({ page }) => {
    // Login
    await page.goto(`${BASE}/users/sign_in`);
    await page.locator('#user_email').fill(acct.email);
    await page.locator('#user_password').fill(acct.password);
    await page.locator('input[type="submit"]').click();
    await page.waitForURL(/dashboard/, { timeout: 15000 });

    const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
    if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotIt.click();
    }

    // Navigate to Account Type Masters (admin page)
    await page.goto(`${BASE}/account_type_masters`);
    await page.waitForLoadState('networkidle');

    // Verify page loads with table
    await expect(page.locator('h1, h2').filter({ hasText: /account type/i }).first()).toBeVisible({ timeout: 10000 });

    // Verify no JS errors on page
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);

    // Verify the delete confirmation modal exists in the DOM with deleteConfirmBtn target
    const deleteBtn = page.locator('[data-account-type-masters-target="deleteConfirmBtn"]');
    await expect(deleteBtn).toHaveCount(1);

    // Verify the cannot-delete modal exists in the DOM
    const cannotDeleteModal = page.locator('[data-account-type-masters-target="cannotDeleteModal"]');
    await expect(cannotDeleteModal).toHaveCount(1);

    console.log(`${acct.name}: Account Type Masters page verified - CM-7 deploy OK`);
  });
}
