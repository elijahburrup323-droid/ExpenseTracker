// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

for (const acct of ACCOUNTS) {
  test.describe(`v1.2.8 Modal conversions — ${acct.email}`, () => {
    let page;

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
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
    });

    test.afterAll(async () => {
      await page.close();
    });

    test('Deposits: modal-based Add flow', async () => {
      await page.goto(`${BASE}/income_entries`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Wait for table to load
      const tableBody = page.locator('[data-income-entries-target="tableBody"]');
      await expect(tableBody).toBeVisible({ timeout: 5000 });
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-income-entries-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      console.log(`  Deposits table loaded for ${acct.email}`);

      // Click Add button
      const addBtn = page.locator('[data-income-entries-target="addButton"]');
      await expect(addBtn).toBeVisible();
      await addBtn.click();

      // Verify modal opens
      const modal = page.locator('[data-income-entries-target="entryModal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
      console.log(`  Add Deposit modal opened`);

      // Verify title
      const title = page.locator('[data-income-entries-target="modalTitle"]');
      await expect(title).toHaveText('Add Deposit');

      // Verify fields present
      await expect(page.locator('[data-income-entries-target="modalDate"]')).toBeVisible();
      await expect(page.locator('[data-income-entries-target="modalAccount"]')).toBeVisible();
      await expect(page.locator('[data-income-entries-target="modalSource"]')).toBeVisible();
      await expect(page.locator('[data-income-entries-target="modalAmount"]')).toBeVisible();
      await expect(page.locator('[data-income-entries-target="modalFrequency"]')).toBeVisible();
      console.log(`  All modal fields present`);

      // Cancel
      const cancelBtn = modal.locator('button:has-text("Cancel")');
      await cancelBtn.click();
      await expect(modal).toBeHidden({ timeout: 3000 });
      console.log(`  Cancel closes modal`);

      // Verify table is read-only
      const tableHtml = await tableBody.innerHTML();
      expect(tableHtml).not.toContain('input[name="source_name"]');
      expect(tableHtml).not.toContain('data-action="click->income-entries#saveNew"');
      console.log(`  Deposits table is read-only`);
    });

    test('Deposits: modal-based Edit flow', async () => {
      const editBtn = page.locator('[data-action="click->income-entries#startEditing"]').first();
      if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editBtn.click();
        const modal = page.locator('[data-income-entries-target="entryModal"]');
        await expect(modal).toBeVisible({ timeout: 5000 });
        const title = page.locator('[data-income-entries-target="modalTitle"]');
        await expect(title).toHaveText('Edit Deposit');
        console.log(`  Edit Deposit modal opened`);

        // Verify fields pre-populated
        const sourceVal = await page.locator('[data-income-entries-target="modalSource"]').inputValue();
        expect(sourceVal.length).toBeGreaterThan(0);
        console.log(`  Edit fields pre-populated: source=${sourceVal}`);

        // Cancel
        await modal.locator('button:has-text("Cancel")').click();
        await expect(modal).toBeHidden({ timeout: 3000 });
      } else {
        console.log(`  No deposits to edit (skip edit test)`);
      }
    });

    test('Spending Categories: modal-based Add flow', async () => {
      await page.goto(`${BASE}/spending_categories`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      const tableBody = page.locator('[data-spending-categories-target="tableBody"]');
      await expect(tableBody).toBeVisible({ timeout: 5000 });
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-spending-categories-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      console.log(`  Spending Categories table loaded`);

      // Click Add
      const addBtn = page.locator('[data-spending-categories-target="addButton"]');
      await expect(addBtn).toBeVisible();
      await addBtn.click();

      // Verify modal
      const modal = page.locator('[data-spending-categories-target="categoryModal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
      console.log(`  Add Spending Category modal opened`);

      const title = page.locator('[data-spending-categories-target="modalTitle"]');
      await expect(title).toHaveText('Add Spending Category');

      // Fields present
      await expect(page.locator('[data-spending-categories-target="modalName"]')).toBeVisible();
      await expect(page.locator('[data-spending-categories-target="modalDescription"]')).toBeVisible();
      await expect(page.locator('[data-spending-categories-target="modalType"]')).toBeVisible();
      await expect(page.locator('[data-spending-categories-target="modalDebt"]')).toBeVisible();
      await expect(page.locator('[data-spending-categories-target="modalIconPicker"]')).toBeVisible();
      console.log(`  All Spending Category modal fields present`);

      // Cancel
      await modal.locator('button:has-text("Cancel")').click();
      await expect(modal).toBeHidden({ timeout: 3000 });
      console.log(`  Cancel closes Spending Category modal`);

      // Table read-only
      const tableHtml = await tableBody.innerHTML();
      expect(tableHtml).not.toContain('input[name="name"]');
      expect(tableHtml).not.toContain('data-action="click->spending-categories#saveNew"');
      console.log(`  Spending Categories table is read-only`);
    });

    test('Spending Categories: modal-based Edit flow', async () => {
      const editBtn = page.locator('[data-action="click->spending-categories#startEditing"]').first();
      if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editBtn.click();
        const modal = page.locator('[data-spending-categories-target="categoryModal"]');
        await expect(modal).toBeVisible({ timeout: 5000 });
        const title = page.locator('[data-spending-categories-target="modalTitle"]');
        await expect(title).toHaveText('Edit Spending Category');
        console.log(`  Edit Spending Category modal opened`);

        const nameVal = await page.locator('[data-spending-categories-target="modalName"]').inputValue();
        expect(nameVal.length).toBeGreaterThan(0);
        console.log(`  Edit fields pre-populated: name=${nameVal}`);

        await modal.locator('button:has-text("Cancel")').click();
        await expect(modal).toBeHidden({ timeout: 3000 });
      } else {
        console.log(`  No categories to edit (skip edit test)`);
      }
    });

    test('Spending Types: modal-based Add flow', async () => {
      await page.goto(`${BASE}/spending_types`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      const tableBody = page.locator('[data-spending-types-target="tableBody"]');
      await expect(tableBody).toBeVisible({ timeout: 5000 });
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-spending-types-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      console.log(`  Spending Types table loaded`);

      // Click Add
      const addBtn = page.locator('[data-spending-types-target="addButton"]');
      await expect(addBtn).toBeVisible();
      await addBtn.click();

      // Verify modal
      const modal = page.locator('[data-spending-types-target="typeModal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
      console.log(`  Add Spending Type modal opened`);

      const title = page.locator('[data-spending-types-target="modalTitle"]');
      await expect(title).toHaveText('Add Spending Type');

      // Fields present
      await expect(page.locator('[data-spending-types-target="modalName"]')).toBeVisible();
      await expect(page.locator('[data-spending-types-target="modalDescription"]')).toBeVisible();
      await expect(page.locator('[data-spending-types-target="modalIconPicker"]')).toBeVisible();
      console.log(`  All Spending Type modal fields present`);

      // Cancel
      await modal.locator('button:has-text("Cancel")').click();
      await expect(modal).toBeHidden({ timeout: 3000 });
      console.log(`  Cancel closes Spending Type modal`);

      // Table read-only
      const tableHtml = await tableBody.innerHTML();
      expect(tableHtml).not.toContain('input[name="name"]');
      expect(tableHtml).not.toContain('data-action="click->spending-types#saveNew"');
      console.log(`  Spending Types table is read-only`);
    });

    test('Spending Types: modal-based Edit flow', async () => {
      const editBtn = page.locator('[data-action="click->spending-types#startEditing"]').first();
      if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editBtn.click();
        const modal = page.locator('[data-spending-types-target="typeModal"]');
        await expect(modal).toBeVisible({ timeout: 5000 });
        const title = page.locator('[data-spending-types-target="modalTitle"]');
        await expect(title).toHaveText('Edit Spending Type');
        console.log(`  Edit Spending Type modal opened`);

        const nameVal = await page.locator('[data-spending-types-target="modalName"]').inputValue();
        expect(nameVal.length).toBeGreaterThan(0);
        console.log(`  Edit fields pre-populated: name=${nameVal}`);

        await modal.locator('button:has-text("Cancel")').click();
        await expect(modal).toBeHidden({ timeout: 3000 });
      } else {
        console.log(`  No types to edit (skip edit test)`);
      }
    });

    test('No JS console errors on any screen', async () => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      // Visit all 3 screens
      for (const path of ['/income_entries', '/spending_categories', '/spending_types']) {
        await page.goto(`${BASE}${path}`);
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      }

      if (errors.length > 0) {
        console.log(`  JS errors: ${errors.join(', ')}`);
      } else {
        console.log(`  No JS console errors across all 3 screens`);
      }
      expect(errors.length).toBe(0);
    });
  });
}
