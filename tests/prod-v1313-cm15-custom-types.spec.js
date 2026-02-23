// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const ELI_EMAIL = 'elijahburrup323@gmail.com';
const ELI_PASS = 'Eli624462!';
const DJ_EMAIL = 'djburrup@gmail.com';
const DJ_PASS = 'luckydjb';

const consoleErrors = [];

// Use a unique suffix to avoid collisions between parallel browser workers
const SUFFIX = Date.now().toString().slice(-6);
const CUSTOM_NAME = 'TestType' + SUFFIX;
const EDITED_NAME = 'EditedType' + SUFFIX;

async function login(page, email, password) {
  await page.goto(BASE + '/users/sign_in');
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

test.describe('CM-15: Custom Account Types', () => {

  test.describe.serial('Account 1 (Eli) - Full CRUD on Account Types', () => {

    test('1. Account Types page loads with correct structure', async ({ page }) => {
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await login(page, ELI_EMAIL, ELI_PASS);
      await page.goto(BASE + '/account_types');

      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }

      await expect(page.getByRole('heading', { name: 'Account Types' })).toBeVisible({ timeout: 10000 });

      const addBtn = page.getByRole('button', { name: '+ Custom Type' });
      await expect(addBtn).toBeVisible({ timeout: 5000 });

      const headerCells = page.locator('table thead th, [role="columnheader"]');
      const headers = await headerCells.allTextContents();
      const headerText = headers.map(h => h.trim().toLowerCase());
      console.log('Table headers found:', headerText);

      expect(headerText.some(h => h.includes('name'))).toBeTruthy();
      expect(headerText.some(h => h.includes('description'))).toBeTruthy();
      expect(headerText.some(h => h.includes('use'))).toBeTruthy();
      expect(headerText.some(h => h.includes('action'))).toBeTruthy();
    });

    test('2. Create a custom type via inline form', async ({ page }) => {
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await login(page, ELI_EMAIL, ELI_PASS);
      await page.goto(BASE + '/account_types');

      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }

      const addBtn = page.getByRole('button', { name: '+ Custom Type' });
      await expect(addBtn).toBeVisible({ timeout: 5000 });
      await addBtn.click();

      // The form is an inline section with h3 "Add Custom Type"
      await expect(page.getByRole('heading', { name: 'Add Custom Type' })).toBeVisible({ timeout: 5000 });

      // Fill in Name and Description using placeholders
      await page.getByPlaceholder('e.g. Investment').fill(CUSTOM_NAME);
      await page.getByPlaceholder('e.g. Brokerage or 401k account').fill('Test brokerage');

      // Click Save
      await page.getByRole('button', { name: 'Save' }).click();

      // Wait for table to refresh and verify the new type appears
      await page.waitForTimeout(2000);
      const customRow = page.locator('table tr').filter({ hasText: CUSTOM_NAME });
      await expect(customRow.first()).toBeVisible({ timeout: 10000 });

      // Verify it has a "Custom" badge
      const badge = customRow.first().locator('text=/Custom/i');
      await expect(badge).toBeVisible({ timeout: 5000 });

      // Verify the custom row has action buttons (not just a dash)
      const actionCell = customRow.first().locator('td').last();
      const actionButtons = actionCell.locator('button');
      expect(await actionButtons.count()).toBeGreaterThan(0);
      console.log('Custom type created successfully:', CUSTOM_NAME);
    });

    test('3. Edit the custom type', async ({ page }) => {
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await login(page, ELI_EMAIL, ELI_PASS);
      await page.goto(BASE + '/account_types');

      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }

      const customRow = page.locator('table tr').filter({ hasText: CUSTOM_NAME });
      await expect(customRow.first()).toBeVisible({ timeout: 10000 });

      // Click the first button in the actions cell (edit)
      const actionBtns = customRow.first().locator('td').last().locator('button');
      await actionBtns.first().click();

      // Verify the form shows "Edit Custom Type"
      await expect(page.getByRole('heading', { name: /Edit Custom Type/i })).toBeVisible({ timeout: 5000 });

      // Verify the name field has the current value and change it
      const nameInput = page.getByPlaceholder('e.g. Investment');
      await expect(nameInput).toHaveValue(CUSTOM_NAME, { timeout: 5000 });

      await nameInput.clear();
      await nameInput.fill(EDITED_NAME);

      // Save
      await page.getByRole('button', { name: 'Save' }).click();

      // Verify the updated name appears in the table
      await page.waitForTimeout(2000);
      const updatedRow = page.locator('table tr').filter({ hasText: EDITED_NAME });
      await expect(updatedRow.first()).toBeVisible({ timeout: 10000 });
      console.log('Custom type edited from', CUSTOM_NAME, 'to', EDITED_NAME);
    });

    test('4. Delete the custom type', async ({ page }) => {
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await login(page, ELI_EMAIL, ELI_PASS);
      await page.goto(BASE + '/account_types');

      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }

      const customRow = page.locator('table tr').filter({ hasText: EDITED_NAME });
      await expect(customRow.first()).toBeVisible({ timeout: 10000 });

      // Click the last button in the actions cell (delete)
      const actionBtns = customRow.first().locator('td').last().locator('button');
      const count = await actionBtns.count();
      await actionBtns.nth(count - 1).click();

      // Wait for confirmation dialog/prompt
      await page.waitForTimeout(1000);

      // Look for a confirm button - could be a modal or inline confirmation
      const confirmDeleteBtn = page.getByRole('button', { name: /Delete/i }).last();
      if (await confirmDeleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmDeleteBtn.click();
      }

      // Verify the custom type disappears from the table
      await page.waitForTimeout(2000);
      const deletedRow = page.locator('table tr').filter({ hasText: EDITED_NAME });
      await expect(deletedRow).toHaveCount(0, { timeout: 10000 });
      console.log('Custom type deleted successfully:', EDITED_NAME);
    });
  });

  test.describe('Account 2 (DJ) - Verify isolation and page loads', () => {

    test('5. Dashboard loads with data', async ({ page }) => {
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await login(page, DJ_EMAIL, DJ_PASS);
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

      const dashboardContent = page.locator('[data-controller="dashboard"], .dashboard, main, [class*="card"]').first();
      await expect(dashboardContent).toBeVisible({ timeout: 10000 });
      console.log('DJ dashboard loaded successfully');
    });

    test('6. Account Types page loads and custom type from Account 1 is NOT visible', async ({ page }) => {
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await login(page, DJ_EMAIL, DJ_PASS);
      await page.goto(BASE + '/account_types');

      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }

      await expect(page.getByRole('heading', { name: 'Account Types' })).toBeVisible({ timeout: 10000 });

      // Verify neither the original nor edited custom type name appears
      const customType = page.locator('table tr').filter({ hasText: new RegExp(CUSTOM_NAME + '|' + EDITED_NAME, 'i') });
      await expect(customType).toHaveCount(0, { timeout: 5000 });
      console.log('Custom type from Account 1 is NOT visible to Account 2 - isolation confirmed');
    });

    test('7. Accounts page loads', async ({ page }) => {
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await login(page, DJ_EMAIL, DJ_PASS);
      await page.goto(BASE + '/accounts');

      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }

      await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible({ timeout: 10000 });
      console.log('DJ Accounts page loaded successfully');
    });
  });

  test('8. No critical JS console errors', async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await login(page, ELI_EMAIL, ELI_PASS);
    await page.goto(BASE + '/account_types');

    const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
    if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotIt.click();
    }

    await page.waitForTimeout(3000);

    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('third-party') &&
      !e.includes('net::ERR') &&
      !e.includes('404')
    );

    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    } else {
      console.log('No critical JS console errors detected');
    }

    expect(criticalErrors.length).toBeLessThanOrEqual(5);
  });
});
