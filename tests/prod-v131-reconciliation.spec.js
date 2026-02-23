const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

for (const acct of ACCOUNTS) {
  test.describe(`Post-deploy v1.3.1 — ${acct.email}`, () => {

    test('Dashboard loads with data', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await expect(page.locator('text=Hello')).toBeVisible({ timeout: 10000 });
    });

    test('Account Reconciliation page loads', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/account_reconciliation`);
      await expect(page.locator('text=Reconcile Balance')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Compare your BudgetHQ records')).toBeVisible();
    });

    test('Account selector populates and loads data', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/account_reconciliation`);
      const select = page.locator('select[data-reconciliation-target="accountSelect"]');
      await expect(select).toBeVisible({ timeout: 5000 });
      const options = await select.locator('option').count();
      expect(options).toBeGreaterThan(1);

      // Select first real account
      await select.selectOption({ index: 1 });
      await page.waitForTimeout(2000);

      // Budget balance should show a dollar amount
      const budgetBal = page.locator('[data-reconciliation-target="budgetBalance"]');
      const balText = await budgetBal.textContent();
      expect(balText).toContain('$');
    });

    test('Payments page still works (regression)', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/payments`);
      await expect(page.locator('h1:has-text("Payments")')).toBeVisible({ timeout: 10000 });
    });

    test('Accounts page still works (regression)', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/accounts`);
      await expect(page.locator('h1:has-text("Accounts")')).toBeVisible({ timeout: 10000 });
    });

    test('No JavaScript errors on reconciliation page', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/account_reconciliation`);
      await page.waitForTimeout(2000);

      const critical = errors.filter(e => !e.includes('ResizeObserver'));
      expect(critical).toHaveLength(0);
    });
  });
}
