const { test, expect } = require('@playwright/test');
const BASE = 'https://djburrup.com/mybudgethq';

const accounts = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!', name: 'Elijah' },
  { email: 'djburrup@gmail.com', password: 'luckydjb', name: 'DJ' }
];

for (const acct of accounts) {
  test(`Post-deploy verify: ${acct.name}`, async ({ page }) => {
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

    // Dashboard loads with greeting
    await expect(page.locator('h1:has-text("Hello")')).toBeVisible();

    // Profile dropdown works
    await page.locator('button:has-text("' + acct.name + '")').first().click();
    await page.waitForTimeout(300);

    // Navigate to Payments - verify data
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').filter({ hasText: /payment/i }).first()).toBeVisible();

    // Navigate to Accounts - verify data
    await page.goto(`${BASE}/accounts`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').filter({ hasText: /account/i }).first()).toBeVisible();

    // Navigate to SS Planner
    await page.goto(`${BASE}/social_security_planner`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Social Security Benefit Planner")')).toBeVisible();
    await expect(page.locator('button:has-text("Edit Assumptions")')).toBeVisible();
    await expect(page.locator('button:has-text("Run Strategy Analysis")')).toBeVisible();

    // No JS errors
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
}
