// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`, { waitUntil: 'networkidle' });
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

for (const account of ACCOUNTS) {
  test.describe(`Recurring Deposits Modal CRUD — ${account.email}`, () => {
    test.beforeEach(async ({ page }) => {
      await login(page, account.email, account.password);
    });

    test('Page loads with table and Add button', async ({ page }) => {
      await page.goto(`${BASE}/income_recurrings`, { waitUntil: 'networkidle' });
      await expect(page.locator('h1:has-text("Deposit Sources")')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-income-recurrings-target="addButton"]')).toBeVisible();
      await expect(page.locator('[data-income-recurrings-target="tableBody"]')).toBeVisible();
    });

    test('Add button opens modal with correct title', async ({ page }) => {
      await page.goto(`${BASE}/income_recurrings`, { waitUntil: 'networkidle' });
      await expect(page.locator('h1:has-text("Deposit Sources")')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000); // Wait for data fetch

      await page.click('[data-income-recurrings-target="addButton"]');
      const modal = page.locator('[data-income-recurrings-target="entryModal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });

      const title = page.locator('[data-income-recurrings-target="modalTitle"]');
      await expect(title).toHaveText('Add Deposit Source');
    });

    test('Add modal has all required fields', async ({ page }) => {
      await page.goto(`${BASE}/income_recurrings`, { waitUntil: 'networkidle' });
      await expect(page.locator('h1:has-text("Deposit Sources")')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      await page.click('[data-income-recurrings-target="addButton"]');
      await expect(page.locator('[data-income-recurrings-target="entryModal"]')).toBeVisible({ timeout: 3000 });

      // Check all modal targets exist
      await expect(page.locator('[data-income-recurrings-target="modalName"]')).toBeVisible();
      await expect(page.locator('[data-income-recurrings-target="modalDescription"]')).toBeVisible();
      await expect(page.locator('[data-income-recurrings-target="modalAmount"]')).toBeVisible();
      await expect(page.locator('[data-income-recurrings-target="modalAccount"]')).toBeVisible();
      await expect(page.locator('[data-income-recurrings-target="modalFrequency"]')).toBeVisible();
      await expect(page.locator('[data-income-recurrings-target="modalNextDate"]')).toBeVisible();

      // Next Date should default to today
      const dateVal = await page.locator('[data-income-recurrings-target="modalNextDate"]').inputValue();
      const today = new Date().toISOString().split('T')[0];
      expect(dateVal).toBe(today);
    });

    test('Cancel button closes modal', async ({ page }) => {
      await page.goto(`${BASE}/income_recurrings`, { waitUntil: 'networkidle' });
      await expect(page.locator('h1:has-text("Deposit Sources")')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      await page.click('[data-income-recurrings-target="addButton"]');
      const modal = page.locator('[data-income-recurrings-target="entryModal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });

      await page.click('[data-income-recurrings-target="entryModal"] button:has-text("Cancel")');
      await expect(modal).toBeHidden({ timeout: 3000 });
    });

    test('Validation errors shown for missing required fields', async ({ page }) => {
      await page.goto(`${BASE}/income_recurrings`, { waitUntil: 'networkidle' });
      await expect(page.locator('h1:has-text("Deposit Sources")')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      await page.click('[data-income-recurrings-target="addButton"]');
      await expect(page.locator('[data-income-recurrings-target="entryModal"]')).toBeVisible({ timeout: 3000 });

      // Click Save without filling anything
      await page.click('[data-income-recurrings-target="entryModal"] button:has-text("Save")');

      // Error should be visible
      const error = page.locator('[data-income-recurrings-target="modalError"]');
      await expect(error).toBeVisible({ timeout: 3000 });
      await expect(error).toContainText('Name is required');
    });

    test('Edit button opens modal with pre-filled data', async ({ page }) => {
      await page.goto(`${BASE}/income_recurrings`, { waitUntil: 'networkidle' });
      await expect(page.locator('h1:has-text("Deposit Sources")')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(3000); // Wait for data fetch

      // Check if there are any rows
      const rows = page.locator('[data-income-recurrings-target="tableBody"] tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Click the first edit button
        const editBtn = page.locator('button[data-action="click->income-recurrings#startEditing"]').first();
        if (await editBtn.isVisible().catch(() => false)) {
          await editBtn.click();

          const modal = page.locator('[data-income-recurrings-target="entryModal"]');
          await expect(modal).toBeVisible({ timeout: 3000 });

          const title = page.locator('[data-income-recurrings-target="modalTitle"]');
          await expect(title).toHaveText('Edit Deposit Source');

          // Name should be pre-filled (not empty)
          const nameVal = await page.locator('[data-income-recurrings-target="modalName"]').inputValue();
          expect(nameVal.length).toBeGreaterThan(0);
        }
      }
    });

    test('Use toggle works inline without modal', async ({ page }) => {
      await page.goto(`${BASE}/income_recurrings`, { waitUntil: 'networkidle' });
      await expect(page.locator('h1:has-text("Deposit Sources")')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(3000);

      const toggles = page.locator('.use-toggle');
      const toggleCount = await toggles.count();

      if (toggleCount > 0) {
        const firstToggle = toggles.first();
        const wasBefore = await firstToggle.getAttribute('data-checked');

        await firstToggle.click();
        await page.waitForTimeout(1000);

        const isAfter = await firstToggle.getAttribute('data-checked');
        expect(isAfter).not.toBe(wasBefore);

        // Toggle back
        await firstToggle.click();
        await page.waitForTimeout(1000);
        const isRestored = await firstToggle.getAttribute('data-checked');
        expect(isRestored).toBe(wasBefore);
      }
    });

    test('Delete button opens delete confirmation modal (not entry modal)', async ({ page }) => {
      await page.goto(`${BASE}/income_recurrings`, { waitUntil: 'networkidle' });
      await expect(page.locator('h1:has-text("Deposit Sources")')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(3000);

      const deleteBtn = page.locator('button[data-action="click->income-recurrings#confirmDelete"]').first();
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();

        const deleteModal = page.locator('[data-income-recurrings-target="deleteModal"]');
        await expect(deleteModal).toBeVisible({ timeout: 3000 });

        // Entry modal should NOT be visible
        const entryModal = page.locator('[data-income-recurrings-target="entryModal"]');
        await expect(entryModal).toBeHidden();

        // Cancel the delete
        await page.click('[data-income-recurrings-target="deleteModal"] button:has-text("Cancel")');
        await expect(deleteModal).toBeHidden({ timeout: 3000 });
      }
    });

    test('No inline editing rows exist (modal only)', async ({ page }) => {
      await page.goto(`${BASE}/income_recurrings`, { waitUntil: 'networkidle' });
      await expect(page.locator('h1:has-text("Deposit Sources")')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(3000);

      // There should be no inline input fields in the table body
      const inlineInputs = page.locator('[data-income-recurrings-target="tableBody"] input[name="name"]');
      expect(await inlineInputs.count()).toBe(0);

      const inlineSelects = page.locator('[data-income-recurrings-target="tableBody"] select[name="frequency_master_id"]');
      expect(await inlineSelects.count()).toBe(0);
    });

    test('Frequency dropdown populated in modal', async ({ page }) => {
      await page.goto(`${BASE}/income_recurrings`, { waitUntil: 'networkidle' });
      await expect(page.locator('h1:has-text("Deposit Sources")')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      await page.click('[data-income-recurrings-target="addButton"]');
      await expect(page.locator('[data-income-recurrings-target="entryModal"]')).toBeVisible({ timeout: 3000 });

      const freqOptions = page.locator('[data-income-recurrings-target="modalFrequency"] option');
      const count = await freqOptions.count();
      // At minimum: "Select frequency..." + at least one real frequency
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });
}
