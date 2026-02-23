const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

for (const acct of ACCOUNTS) {
  test.describe(`Post-deploy v1.3.15 — ${acct.email}`, () => {
    let page;

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
      // Login
      await page.goto(`${BASE}/users/sign_in`);
      await page.fill('input[name="user[email]"]', acct.email);
      await page.fill('input[name="user[password]"]', acct.password);
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForURL(/dashboard/);

      // Dismiss What's New overlay if present
      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }
    });

    test.afterAll(async () => { await page.close(); });

    test('Dashboard loads with data', async () => {
      await page.goto(`${BASE}/dashboard`);
      await expect(page.locator('body')).toBeVisible();
      // Verify dashboard content renders by checking for a dashboard card
      await expect(page.locator('[data-controller="dashboard"]')).toBeVisible({ timeout: 10000 });
    });

    test('Payments page loads', async () => {
      await page.goto(`${BASE}/payments`);
      await expect(page.locator('h1:has-text("Payments")')).toBeVisible({ timeout: 10000 });
      // Verify tag filter exists
      await expect(page.locator('select[data-payments-target="filterTag"]')).toBeVisible();
    });

    test('Tags page loads and shows CRUD UI', async () => {
      await page.goto(`${BASE}/tags`);
      await expect(page.locator('h1:has-text("Tags")')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button:has-text("Add Tag")')).toBeVisible();
    });

    test('Tags nav item visible under Payments', async () => {
      await page.goto(`${BASE}/payments`);
      await expect(page.locator('a:has-text("Tags")')).toBeVisible({ timeout: 5000 });
    });

    test('Version shows 1.3.15', async () => {
      await page.goto(`${BASE}/dashboard`);
      const versionText = await page.locator('text=1.3.15').first();
      await expect(versionText).toBeVisible({ timeout: 10000 });
    });

    test('Payments Add modal has Tags field', async () => {
      await page.goto(`${BASE}/payments`);
      await page.waitForTimeout(2000);
      await page.locator('button:has-text("Add Payment")').click();
      await expect(page.locator('input[data-payments-target="modalTagsInput"]')).toBeVisible({ timeout: 5000 });
      // Cancel via the modal's Cancel text button
      await page.getByRole('button', { name: 'Cancel' }).first().click();
    });

    test('Navigation still works (Accounts, Deposits)', async () => {
      await page.goto(`${BASE}/accounts`);
      await expect(page.locator('h1:has-text("Accounts")')).toBeVisible({ timeout: 10000 });
      await page.goto(`${BASE}/income_entries`);
      await expect(page.locator('body')).toBeVisible();
    });
  });
}
