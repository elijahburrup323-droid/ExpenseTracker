// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        password: 'luckydjb'   },
];

for (const user of USERS) {
  test.describe(`Recurring Payments Modal CRUD — ${user.email}`, () => {

    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE}/users/sign_in`);
      await page.fill('input[name="user[email]"]', user.email);
      await page.fill('input[name="user[password]"]', user.password);
      await Promise.all([
        page.waitForNavigation(),
        page.click('input[type="submit"], button[type="submit"]'),
      ]);
      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }
    });

    test('Page loads with h1 and table', async ({ page }) => {
      await page.goto(`${BASE}/payment_recurrings`);
      await expect(page.locator('h1:has-text("Recurring Payments")')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });

    test('Add button opens modal with correct title', async ({ page }) => {
      await page.goto(`${BASE}/payment_recurrings`);
      // Wait for data to load (table body should not show Loading...)
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-payment-recurrings-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      await page.click('button:has-text("Add Recurring Payment")');
      const modal = page.locator('[data-payment-recurrings-target="entryModal"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('h3')).toHaveText('Add Recurring Payment');
    });

    test('Add modal has all required fields', async ({ page }) => {
      await page.goto(`${BASE}/payment_recurrings`);
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-payment-recurrings-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      await page.click('button:has-text("Add Recurring Payment")');
      const modal = page.locator('[data-payment-recurrings-target="entryModal"]');
      await expect(modal.locator('[data-payment-recurrings-target="modalName"]')).toBeVisible();
      await expect(modal.locator('[data-payment-recurrings-target="modalDescription"]')).toBeVisible();
      await expect(modal.locator('[data-payment-recurrings-target="modalAmount"]')).toBeVisible();
      await expect(modal.locator('[data-payment-recurrings-target="modalAccount"]')).toBeVisible();
      await expect(modal.locator('[data-payment-recurrings-target="modalCategory"]')).toBeVisible();
      await expect(modal.locator('[data-payment-recurrings-target="modalFrequency"]')).toBeVisible();
      await expect(modal.locator('[data-payment-recurrings-target="modalNextDate"]')).toBeVisible();
    });

    test('Cancel closes modal', async ({ page }) => {
      await page.goto(`${BASE}/payment_recurrings`);
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-payment-recurrings-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      await page.click('button:has-text("Add Recurring Payment")');
      const modal = page.locator('[data-payment-recurrings-target="entryModal"]');
      await expect(modal).toBeVisible();
      await modal.locator('button:has-text("Cancel")').click();
      await expect(modal).toBeHidden();
    });

    test('Validation shows error for empty name', async ({ page }) => {
      await page.goto(`${BASE}/payment_recurrings`);
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-payment-recurrings-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      await page.click('button:has-text("Add Recurring Payment")');
      const modal = page.locator('[data-payment-recurrings-target="entryModal"]');
      await modal.locator('button:has-text("Save")').click();
      const errorBox = modal.locator('[data-payment-recurrings-target="modalError"]');
      await expect(errorBox).toBeVisible();
      await expect(errorBox).toContainText('Name is required');
    });

    test('Account dropdown is populated', async ({ page }) => {
      await page.goto(`${BASE}/payment_recurrings`);
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-payment-recurrings-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      await page.click('button:has-text("Add Recurring Payment")');
      const modal = page.locator('[data-payment-recurrings-target="entryModal"]');
      const accountSelect = modal.locator('[data-payment-recurrings-target="modalAccount"]');
      const options = await accountSelect.locator('option').count();
      expect(options).toBeGreaterThan(1); // At least placeholder + 1 account
    });

    test('Category dropdown is populated', async ({ page }) => {
      await page.goto(`${BASE}/payment_recurrings`);
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-payment-recurrings-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      await page.click('button:has-text("Add Recurring Payment")');
      const modal = page.locator('[data-payment-recurrings-target="entryModal"]');
      const catSelect = modal.locator('[data-payment-recurrings-target="modalCategory"]');
      const options = await catSelect.locator('option').count();
      expect(options).toBeGreaterThan(1);
    });

    test('Frequency dropdown is populated', async ({ page }) => {
      await page.goto(`${BASE}/payment_recurrings`);
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-payment-recurrings-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      await page.click('button:has-text("Add Recurring Payment")');
      const modal = page.locator('[data-payment-recurrings-target="entryModal"]');
      const freqSelect = modal.locator('[data-payment-recurrings-target="modalFrequency"]');
      const options = await freqSelect.locator('option').count();
      expect(options).toBeGreaterThan(1);
    });

    test('Edit button opens modal with pre-populated values', async ({ page }) => {
      await page.goto(`${BASE}/payment_recurrings`);
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-payment-recurrings-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      // Check if there are any rows with edit buttons
      const editButtons = page.locator('button[title="Edit"]');
      const count = await editButtons.count();
      if (count === 0) return; // Skip if no data

      await editButtons.first().click();
      const modal = page.locator('[data-payment-recurrings-target="entryModal"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('h3')).toHaveText('Edit Recurring Payment');
      // Name should be pre-populated (not empty)
      const nameValue = await modal.locator('[data-payment-recurrings-target="modalName"]').inputValue();
      expect(nameValue.length).toBeGreaterThan(0);
    });

    test('No inline add/edit rows in table', async ({ page }) => {
      await page.goto(`${BASE}/payment_recurrings`);
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-payment-recurrings-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      // Should NOT have any input elements inside the table body (no inline editing)
      const inlineInputs = page.locator('[data-payment-recurrings-target="tableBody"] input:not(.use-toggle)');
      await expect(inlineInputs).toHaveCount(0);
    });

    test('Use toggle works on existing rows', async ({ page }) => {
      await page.goto(`${BASE}/payment_recurrings`);
      await page.waitForFunction(() => {
        const tbody = document.querySelector('[data-payment-recurrings-target="tableBody"]');
        return tbody && !tbody.textContent.includes('Loading...');
      }, { timeout: 10000 });
      const toggles = page.locator('.use-toggle');
      const count = await toggles.count();
      if (count === 0) return;

      const toggle = toggles.first();
      const wasBg = await toggle.getAttribute('class');
      await toggle.click();
      await page.waitForTimeout(500);
      const nowBg = await toggle.getAttribute('class');
      // Class should have changed (toggled)
      expect(wasBg).not.toEqual(nowBg);
    });

    test('Release notes mention CM-2 modal conversion', async ({ page }) => {
      await page.goto(`${BASE}/documentation/release-notes`);
      await expect(page.locator('body')).toContainText('modal-based Add/Edit CRUD');
      await expect(page.locator('body')).toContainText('CM-2');
    });
  });
}
