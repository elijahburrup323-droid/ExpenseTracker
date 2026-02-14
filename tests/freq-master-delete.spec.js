const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000/expensetracker';
const EMAIL = 'elijahburrup323@gmail.com';
const PASSWORD = 'Eli624462!';

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', EMAIL);
  await page.fill('input[name="user[password]"]', PASSWORD);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.click('input[type="submit"], button[type="submit"]')
  ]);
  // Dismiss What's New overlay
  await page.evaluate(() => document.getElementById('whatsNewOverlay')?.remove());
  await page.evaluate(() => document.querySelector('[data-dashboard-target="whatsNewModal"]')?.remove());
}

test.describe('Frequency Masters - Delete with in-use protection', () => {

  test('Delete button visible, no Deactivate/Reactivate buttons', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_frequency_masters`);
    await page.waitForSelector('table tbody tr:not(:has-text("Loading"))');

    // Check that Delete buttons exist
    const deleteButtons = page.locator('button:has-text("Delete")');
    const count = await deleteButtons.count();
    expect(count).toBeGreaterThan(0);

    // Check that Deactivate/Reactivate buttons do NOT exist
    const deactivateButtons = page.locator('button:has-text("Deactivate")');
    expect(await deactivateButtons.count()).toBe(0);
    const reactivateButtons = page.locator('button:has-text("Reactivate")');
    expect(await reactivateButtons.count()).toBe(0);

    console.log(`PASS: ${count} Delete buttons found, no Deactivate/Reactivate`);
  });

  test('Cannot delete in-use frequency - shows cannot-delete modal', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_frequency_masters`);
    await page.waitForSelector('table tbody tr:not(:has-text("Loading"))');

    // Click Delete on the first row (most frequencies are in use)
    const firstDelete = page.locator('button:has-text("Delete")').first();
    await firstDelete.click();

    // Should show "Can't Delete Frequency" modal
    const modal = page.locator('#freqDeleteModal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    const title = modal.locator('h3');
    await expect(title).toHaveText("Can't Delete Frequency");

    const body = modal.locator('p');
    await expect(body).toContainText('currently in use');

    // Click OK to dismiss
    await modal.locator('#freqModalOk').click();
    await expect(modal).not.toBeVisible();

    console.log('PASS: Cannot-delete modal displayed and dismissed for in-use frequency');
  });

  test('Edit button still works', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_frequency_masters`);
    await page.waitForSelector('table tbody tr:not(:has-text("Loading"))');

    // Click Edit on the first row
    const firstEdit = page.locator('button:has-text("Edit")').first();
    await firstEdit.click();

    // Should show an edit row with input fields
    const editRow = page.locator('[data-edit-row]');
    await expect(editRow).toBeVisible();

    // Cancel - scope to the edit row
    await editRow.locator('button:has-text("Cancel")').click();
    await expect(editRow).not.toBeVisible();

    console.log('PASS: Edit still works correctly');
  });

  test('Active toggle still works', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/income_frequency_masters`);
    await page.waitForSelector('table tbody tr:not(:has-text("Loading"))');

    // Find a toggle switch
    const toggle = page.locator('button[role="switch"]').first();
    const initialState = await toggle.getAttribute('aria-checked');

    // Click to toggle
    await toggle.click();
    await page.waitForTimeout(500);

    const newState = await toggle.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);

    // Toggle back
    await toggle.click();
    await page.waitForTimeout(500);

    const restoredState = await toggle.getAttribute('aria-checked');
    expect(restoredState).toBe(initialState);

    console.log('PASS: Active toggle works correctly');
  });
});
