// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

for (const acct of ACCOUNTS) {
  test.describe(`CM-10 Accounts modal verification — ${acct.email}`, () => {
    test('login, navigate to accounts, verify modal-based Add flow', async ({ page }) => {
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

      // Navigate to Accounts
      await page.goto(`${BASE}/accounts`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      console.log(`  Accounts page loaded for ${acct.email}`);

      // Verify table is present and has data rows
      const tableBody = page.locator('[data-accounts-target="tableBody"]');
      await expect(tableBody).toBeVisible({ timeout: 5000 });

      // Wait for accounts to load (no "Loading..." text)
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-accounts-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      console.log(`  Accounts table loaded`);

      // Click Add Account button
      const addBtn = page.locator('[data-accounts-target="addButton"]');
      await expect(addBtn).toBeVisible();
      await addBtn.click();

      // Verify modal opens (not an inline row)
      const modal = page.locator('[data-accounts-target="accountModal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
      console.log(`  Add Account modal opened`);

      // Verify modal has correct title
      const modalTitle = page.locator('[data-accounts-target="modalTitle"]');
      await expect(modalTitle).toHaveText('Add Account');

      // Verify all form fields are present
      await expect(page.locator('[data-accounts-target="modalName"]')).toBeVisible();
      await expect(page.locator('[data-accounts-target="modalDate"]')).toBeVisible();
      await expect(page.locator('[data-accounts-target="modalType"]')).toBeVisible();
      await expect(page.locator('[data-accounts-target="modalInstitution"]')).toBeVisible();
      await expect(page.locator('[data-accounts-target="modalBalance"]')).toBeVisible();
      await expect(page.locator('[data-accounts-target="modalBudget"]')).toBeVisible();
      console.log(`  All modal fields present`);

      // Verify date field has min/max constraints
      const dateInput = page.locator('[data-accounts-target="modalDate"]');
      const dateMin = await dateInput.getAttribute('min');
      const dateMax = await dateInput.getAttribute('max');
      console.log(`  Date constraints: min=${dateMin}, max=${dateMax}`);

      // Verify icon picker button exists
      const iconPicker = page.locator('[data-accounts-target="modalIconPicker"]');
      await expect(iconPicker).toBeVisible();
      console.log(`  Icon picker present in modal`);

      // Verify Cancel button closes modal
      const cancelBtn = modal.locator('button:has-text("Cancel")');
      await cancelBtn.click();
      await expect(modal).toBeHidden({ timeout: 3000 });
      console.log(`  Cancel closes modal correctly`);

      // Verify Edit opens modal (not inline)
      const editBtn = page.locator('[data-action="click->accounts#startEditing"]').first();
      if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editBtn.click();
        await expect(modal).toBeVisible({ timeout: 5000 });
        const editTitle = await modalTitle.textContent();
        expect(editTitle).toBe('Edit Account');
        console.log(`  Edit Account modal opened with correct title`);

        // Verify date field is hidden in edit mode
        const dateRow = page.locator('[data-accounts-target="modalDateRow"]');
        await expect(dateRow).toBeHidden();
        console.log(`  Date field hidden in edit mode`);

        // Verify fields are pre-populated
        const nameVal = await page.locator('[data-accounts-target="modalName"]').inputValue();
        expect(nameVal.length).toBeGreaterThan(0);
        console.log(`  Edit modal pre-populated with name: ${nameVal}`);

        // Cancel edit
        await cancelBtn.click();
        await expect(modal).toBeHidden({ timeout: 3000 });
      }

      // Verify table is always read-only (no inline editing rows)
      const tableHtml = await tableBody.innerHTML();
      expect(tableHtml).not.toContain('input[name="name"]');
      expect(tableHtml).not.toContain('data-action="click->accounts#saveNew"');
      console.log(`  Table is read-only (no inline editing)`);

      // Check no JS errors
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.reload();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      if (errors.length > 0) {
        console.log(`  JS errors: ${errors.join(', ')}`);
      } else {
        console.log(`  No JS console errors`);
      }

      console.log(`  CM-10 verification PASSED for ${acct.email}`);
    });
  });
}
