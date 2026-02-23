const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`),
    page.click('input[type="submit"], button[type="submit"]')
  ]);
  // Dismiss What's New overlay
  await page.evaluate(() => document.getElementById('whatsNewOverlay')?.remove());
  await page.evaluate(() => document.querySelector('[data-dashboard-target="whatsNewModal"]')?.remove());
}

test.describe('v1.2.1 Production - Frequency Masters Delete', () => {

  test('QA banner shows v1.2.1', async ({ page }) => {
    await login(page, 'elijahburrup323@gmail.com', 'Eli624462!');
    const banner = page.locator('text=QA MODE');
    await expect(banner).toBeVisible({ timeout: 10000 });
    const bannerText = await banner.textContent();
    expect(bannerText).toContain('1.2.1');
    console.log('PASS: QA banner shows v1.2.1');
  });

  test('Delete button visible, no Deactivate/Reactivate on Frequency Masters', async ({ page }) => {
    await login(page, 'elijahburrup323@gmail.com', 'Eli624462!');
    await page.goto(`${BASE}/income_frequency_masters`);
    await page.waitForSelector('table tbody tr:not(:has-text("Loading"))');

    const deleteButtons = page.locator('button:has-text("Delete")');
    const count = await deleteButtons.count();
    expect(count).toBeGreaterThan(0);

    const deactivateButtons = page.locator('button:has-text("Deactivate")');
    expect(await deactivateButtons.count()).toBe(0);
    const reactivateButtons = page.locator('button:has-text("Reactivate")');
    expect(await reactivateButtons.count()).toBe(0);

    console.log(`PASS: ${count} Delete buttons, no Deactivate/Reactivate`);
  });

  test('Cannot-delete modal for in-use frequency', async ({ page }) => {
    await login(page, 'elijahburrup323@gmail.com', 'Eli624462!');
    await page.goto(`${BASE}/income_frequency_masters`);
    await page.waitForSelector('table tbody tr:not(:has-text("Loading"))');

    const firstDelete = page.locator('button:has-text("Delete")').first();
    await firstDelete.click({ force: true });

    const modal = page.locator('#freqDeleteModal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    const title = modal.locator('h3');
    await expect(title).toHaveText("Can't Delete Frequency");

    await modal.locator('#freqModalOk').click();
    await expect(modal).not.toBeVisible();

    console.log('PASS: Cannot-delete modal works on production');
  });

  test('Active toggle still works', async ({ page }) => {
    await login(page, 'elijahburrup323@gmail.com', 'Eli624462!');
    await page.goto(`${BASE}/income_frequency_masters`);
    await page.waitForSelector('table tbody tr:not(:has-text("Loading"))');

    const toggle = page.locator('button[role="switch"]').first();
    const initialState = await toggle.getAttribute('aria-checked');

    await toggle.click({ force: true });
    await page.waitForTimeout(1000);

    const newState = await toggle.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);

    // Toggle back
    await toggle.click({ force: true });
    await page.waitForTimeout(1000);

    const restoredState = await toggle.getAttribute('aria-checked');
    expect(restoredState).toBe(initialState);

    console.log('PASS: Active toggle works on production');
  });

  test('Info box text updated', async ({ page }) => {
    await login(page, 'elijahburrup323@gmail.com', 'Eli624462!');
    await page.goto(`${BASE}/income_frequency_masters`);
    await page.waitForSelector('table tbody tr:not(:has-text("Loading"))');

    const infoBox = page.locator('text=Frequencies in use by any user cannot be deleted');
    await expect(infoBox).toBeVisible();

    console.log('PASS: Info box text updated');
  });

  test('Secondary account - verify frequency masters page loads', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await page.goto(`${BASE}/income_frequency_masters`);
    await page.waitForSelector('table tbody tr:not(:has-text("Loading"))');

    const deleteButtons = page.locator('button:has-text("Delete")');
    const count = await deleteButtons.count();
    expect(count).toBeGreaterThan(0);

    console.log(`PASS: Secondary account sees ${count} Delete buttons`);
  });
});
