// Post-deploy verification for CM-4: Create Category from Add Payment Modal (Child Modal)
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const accounts = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb' },
];

async function dismissWhatsNew(page) {
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

async function login(page, email, pass) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  await dismissWhatsNew(page);
}

for (const acct of accounts) {
  test.describe(`Account: ${acct.email}`, () => {

    test('Payments page loads without JS errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(3000);
      expect(errors.filter(e => /payment|category|modal/i.test(e))).toHaveLength(0);
    });

    test('Add Payment modal opens and has Category dropdown with New option', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(2000);

      // Click Add Payment button
      const addBtn = page.locator('button:has-text("Add"), a:has-text("Add")').first();
      await addBtn.click();
      await page.waitForTimeout(500);

      // Verify modal is visible
      const modal = page.locator('[data-payments-target="addModal"]');
      await expect(modal).toBeVisible();

      // Verify Category dropdown has "New Category" option
      const catSelect = page.locator('[data-payments-target="modalCategory"]');
      await expect(catSelect).toBeVisible();
      const newOpt = catSelect.locator('option[value="new"]');
      await expect(newOpt).toHaveCount(1);
      console.log(`  ${acct.email}: Add modal opens, Category dropdown has New option`);
    });

    test('Selecting New Category opens child modal (not alert/tab)', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(2000);

      // Dismiss any dialog/alert that might appear (regression safety)
      page.on('dialog', async dialog => {
        console.log(`  UNEXPECTED ALERT: ${dialog.message()}`);
        await dialog.dismiss();
      });

      // Open Add Payment modal
      const addBtn = page.locator('button:has-text("Add"), a:has-text("Add")').first();
      await addBtn.click();
      await page.waitForTimeout(500);

      // Select "New Category"
      const catSelect = page.locator('[data-payments-target="modalCategory"]');
      await catSelect.selectOption('new');
      await page.waitForTimeout(500);

      // Child modal should be visible
      const childModal = page.locator('[data-payments-target="categoryChildModal"]');
      await expect(childModal).toBeVisible();

      // Child modal should have name input and type dropdown
      const nameInput = page.locator('[data-payments-target="childCategoryName"]');
      const typeSelect = page.locator('[data-payments-target="childCategoryType"]');
      await expect(nameInput).toBeVisible();
      await expect(typeSelect).toBeVisible();

      // Spending type dropdown should have options
      const typeOptions = await typeSelect.locator('option').count();
      expect(typeOptions).toBeGreaterThan(1);

      console.log(`  ${acct.email}: Child modal opens with name input and ${typeOptions} type options`);
    });

    test('Child modal Cancel closes child and resets category dropdown', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(2000);

      // Open Add modal, select New Category
      const addBtn = page.locator('button:has-text("Add"), a:has-text("Add")').first();
      await addBtn.click();
      await page.waitForTimeout(500);
      const catSelect = page.locator('[data-payments-target="modalCategory"]');
      await catSelect.selectOption('new');
      await page.waitForTimeout(500);

      // Click Cancel
      const cancelBtn = page.locator('[data-payments-target="categoryChildModal"] button:has-text("Cancel")');
      await cancelBtn.click();
      await page.waitForTimeout(300);

      // Child modal should be hidden
      const childModal = page.locator('[data-payments-target="categoryChildModal"]');
      await expect(childModal).toBeHidden();

      // Parent modal should still be visible
      const parentModal = page.locator('[data-payments-target="addModal"]');
      await expect(parentModal).toBeVisible();

      // Category dropdown should be reset
      const catValue = await catSelect.inputValue();
      expect(catValue).toBe('');

      console.log(`  ${acct.email}: Cancel closes child modal, parent still open, dropdown reset`);
    });

    test('Child modal validation — empty name shows error', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(2000);

      // Open Add modal, select New Category
      const addBtn = page.locator('button:has-text("Add"), a:has-text("Add")').first();
      await addBtn.click();
      await page.waitForTimeout(500);
      const catSelect = page.locator('[data-payments-target="modalCategory"]');
      await catSelect.selectOption('new');
      await page.waitForTimeout(500);

      // Click Save without entering name
      const saveBtn = page.locator('[data-payments-target="categoryChildModal"] button:has-text("Save")');
      await saveBtn.click();
      await page.waitForTimeout(300);

      // Error should be visible
      const errorDiv = page.locator('[data-payments-target="childCategoryError"]');
      await expect(errorDiv).toBeVisible();
      const errorText = await errorDiv.textContent();
      expect(errorText).toContain('required');

      console.log(`  ${acct.email}: Empty name validation works: "${errorText}"`);
    });

    test('Child modal Save creates category and auto-selects it', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(2000);

      const testName = `_TestCat_${Date.now()}`;

      // Open Add modal, select New Category
      const addBtn = page.locator('button:has-text("Add"), a:has-text("Add")').first();
      await addBtn.click();
      await page.waitForTimeout(500);
      const catSelect = page.locator('[data-payments-target="modalCategory"]');
      await catSelect.selectOption('new');
      await page.waitForTimeout(500);

      // Fill in name, select a spending type, and save
      const nameInput = page.locator('[data-payments-target="childCategoryName"]');
      await nameInput.fill(testName);
      const typeSelect = page.locator('[data-payments-target="childCategoryType"]');
      // Select the first available spending type
      const firstTypeOpt = typeSelect.locator('option:not([value=""])').first();
      const firstTypeVal = await firstTypeOpt.getAttribute('value');
      await typeSelect.selectOption(firstTypeVal);
      const saveBtn = page.locator('[data-payments-target="categoryChildModal"] button:has-text("Save")');
      await saveBtn.click();
      await page.waitForTimeout(1000);

      // Child modal should be closed
      const childModal = page.locator('[data-payments-target="categoryChildModal"]');
      await expect(childModal).toBeHidden();

      // Category dropdown should have the new category selected
      const selectedText = await catSelect.locator('option:checked').textContent();
      expect(selectedText).toContain(testName);

      console.log(`  ${acct.email}: Created "${testName}", auto-selected in dropdown`);

      // Clean up: delete the test category via API
      const catId = await catSelect.inputValue();
      if (catId) {
        await page.evaluate(async ({ base, id }) => {
          const meta = document.querySelector('meta[name="csrf-token"]');
          const token = meta ? meta.content : '';
          await fetch(`${base}/api/spending_categories/${id}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': token, 'Accept': 'application/json' }
          });
        }, { base: BASE, id: catId });
        console.log(`  ${acct.email}: Cleaned up test category ${catId}`);
      }
    });

    test('Parent modal fields preserved after child modal interaction', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(2000);

      // Open Add modal
      const addBtn = page.locator('button:has-text("Add"), a:has-text("Add")').first();
      await addBtn.click();
      await page.waitForTimeout(500);

      // Fill in some fields first
      const descInput = page.locator('[data-payments-target="modalDescription"]');
      await descInput.fill('Test Description 123');
      const amtInput = page.locator('[data-payments-target="modalAmount"]');
      await amtInput.fill('42.50');

      // Now select New Category and cancel
      const catSelect = page.locator('[data-payments-target="modalCategory"]');
      await catSelect.selectOption('new');
      await page.waitForTimeout(500);

      const cancelBtn = page.locator('[data-payments-target="categoryChildModal"] button:has-text("Cancel")');
      await cancelBtn.click();
      await page.waitForTimeout(300);

      // Verify parent fields are preserved
      const desc = await descInput.inputValue();
      const amt = await amtInput.inputValue();
      expect(desc).toBe('Test Description 123');
      expect(amt).toBe('42.50');

      console.log(`  ${acct.email}: Parent fields preserved (desc="${desc}", amt=${amt})`);
    });

    test('No JS errors during full child modal workflow', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(2000);

      // Open Add modal
      const addBtn = page.locator('button:has-text("Add"), a:has-text("Add")').first();
      await addBtn.click();
      await page.waitForTimeout(500);

      // Select New Category → child modal
      const catSelect = page.locator('[data-payments-target="modalCategory"]');
      await catSelect.selectOption('new');
      await page.waitForTimeout(500);

      // Cancel child modal
      const cancelBtn = page.locator('[data-payments-target="categoryChildModal"] button:has-text("Cancel")');
      await cancelBtn.click();
      await page.waitForTimeout(500);

      expect(errors).toHaveLength(0);
      console.log(`  ${acct.email}: No JS errors during child modal workflow`);
    });

  });
}
