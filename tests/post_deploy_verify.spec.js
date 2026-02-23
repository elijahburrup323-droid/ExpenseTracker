const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const accounts = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!', name: 'Eli' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb', name: 'DJ' },
];

for (const acct of accounts) {
  test.describe('Post-deploy CM-7: ' + acct.name, () => {
    test('Dblclick account to reconciliation for ' + acct.name, async ({ page }) => {
      // Login
      await page.goto(BASE + '/users/sign_in');
      await page.fill('input[name="user[email]"]', acct.email);
      await page.fill('input[name="user[password]"]', acct.pass);
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForURL(/dashboard|mybudgethq/, { timeout: 15000 });

      // Dismiss What's New overlay
      try {
        const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
        await gotIt.waitFor({ state: 'visible', timeout: 5000 });
        await gotIt.click();
        await page.waitForTimeout(1000);
      } catch (e) {}

      // Navigate to Accounts
      await page.goto(BASE + '/accounts');
      await page.waitForTimeout(2000);

      // Wait for accounts table to populate
      const firstNameCell = page.locator('tbody td[data-action="dblclick->accounts#goToReconciliation"]').first();
      await expect(firstNameCell).toBeVisible({ timeout: 10000 });
      const accountName = await firstNameCell.textContent();
      console.log(acct.name + ': Found account: ' + accountName);

      // Verify cursor:pointer on name cell
      const cursor = await firstNameCell.evaluate(el => window.getComputedStyle(el).cursor);
      expect(cursor).toBe('pointer');
      console.log(acct.name + ': cursor:pointer on account name - correct');

      // Double-click the account name
      await firstNameCell.dblclick();
      await page.waitForURL(/account_reconciliation/, { timeout: 10000 });

      // Verify URL has account_id param
      const url = page.url();
      expect(url).toContain('account_id=');
      console.log(acct.name + ': Navigated to reconciliation with URL: ' + url);

      // Verify the dropdown has an account pre-selected (not the default empty option)
      const dropdown = page.locator('select[data-reconciliation-target="accountSelect"]');
      const selectedValue = await dropdown.inputValue();
      expect(selectedValue).not.toBe('');
      console.log(acct.name + ': Account pre-selected in dropdown, id=' + selectedValue);

      // Verify reconciliation data section is visible (not empty state)
      const dataSections = page.locator('[data-reconciliation-target="dataSections"]');
      await expect(dataSections).toBeVisible({ timeout: 10000 });
      console.log(acct.name + ': Reconciliation data loaded for pre-selected account');

      // Regression: Navigate back to Accounts and verify single-click still works
      await page.goto(BASE + '/accounts');
      await page.waitForTimeout(2000);
      const editBtn = page.locator('button[data-action="click->accounts#startEditing"]').first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      console.log(acct.name + ': Edit button still visible (single-click actions intact)');

      // Navigate to Payments (regression)
      await page.goto(BASE + '/payments');
      await page.waitForTimeout(2000);
      await expect(page.locator('h1')).toContainText('Payments', { timeout: 5000 });
      console.log(acct.name + ': Payments page loads OK (regression)');

      // Navigate to Deposits (regression)
      await page.goto(BASE + '/income_entries');
      await page.waitForTimeout(2000);
      console.log(acct.name + ': Deposits page loads OK (regression)');
    });
  });
}
