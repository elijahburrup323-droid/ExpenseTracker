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
  test.describe(`Account Types Modal — ${acct.email}`, () => {

    test('Account Types page loads with table', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/account_types`);
      await expect(page.locator('h1:has-text("Account Types")')).toBeVisible({ timeout: 10000 });
      // Table should render with data rows or empty message
      await expect(page.locator('table')).toBeVisible();
    });

    test('Add button opens modal (not inline row)', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/account_types`);
      await expect(page.locator('h1:has-text("Account Types")')).toBeVisible({ timeout: 10000 });

      // Click Add Account Type button
      await page.click('button:has-text("Add Account Type")');
      await page.waitForTimeout(500);

      // Modal should be visible with title "Add Account Type"
      const modal = page.locator('[data-account-types-target="typeModal"]');
      await expect(modal).not.toHaveClass(/hidden/);
      await expect(page.locator('[data-account-types-target="modalTitle"]')).toHaveText('Add Account Type');

      // Name and Description inputs should be in the modal
      await expect(page.locator('[data-account-types-target="modalName"]')).toBeVisible();
      await expect(page.locator('[data-account-types-target="modalDescription"]')).toBeVisible();

      // Cancel button should close the modal
      await page.click('[data-account-types-target="typeModal"] button:has-text("Cancel")');
      await expect(modal).toHaveClass(/hidden/);
    });

    test('Edit button opens modal with pre-populated values', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/account_types`);
      await expect(page.locator('h1:has-text("Account Types")')).toBeVisible({ timeout: 10000 });

      // Wait for table to load
      await page.waitForTimeout(2000);

      // Check if there are edit buttons (i.e. data exists)
      const editButtons = page.locator('button[title="Edit"]');
      const count = await editButtons.count();
      if (count === 0) {
        test.skip('No account types to edit');
        return;
      }

      // Click first edit button
      await editButtons.first().click();
      await page.waitForTimeout(500);

      // Modal should be visible with title "Edit Account Type"
      const modal = page.locator('[data-account-types-target="typeModal"]');
      await expect(modal).not.toHaveClass(/hidden/);
      await expect(page.locator('[data-account-types-target="modalTitle"]')).toHaveText('Edit Account Type');

      // Name input should have a value
      const nameVal = await page.locator('[data-account-types-target="modalName"]').inputValue();
      expect(nameVal.length).toBeGreaterThan(0);

      // Cancel
      await page.click('[data-account-types-target="typeModal"] button:has-text("Cancel")');
      await expect(modal).toHaveClass(/hidden/);
    });

    test('Use toggle works on display rows', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/account_types`);
      await expect(page.locator('h1:has-text("Account Types")')).toBeVisible({ timeout: 10000 });

      // Wait for table to load
      await page.waitForTimeout(2000);

      // Check for use toggle buttons
      const toggles = page.locator('button.use-toggle');
      const count = await toggles.count();
      if (count === 0) {
        test.skip('No account types with use toggle');
        return;
      }

      // Toggle should be visible and clickable
      await expect(toggles.first()).toBeVisible();
    });

    test('No inline input rows in table', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/account_types`);
      await expect(page.locator('h1:has-text("Account Types")')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      // There should be NO input elements inside the table body (read-only table)
      const tableInputs = page.locator('tbody[data-account-types-target="tableBody"] input');
      await expect(tableInputs).toHaveCount(0);
    });

    test('No JavaScript errors on page', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/account_types`);
      await page.waitForTimeout(2000);

      const critical = errors.filter(e => !e.includes('ResizeObserver'));
      expect(critical).toHaveLength(0);
    });
  });
}
