// Post-deploy verification for CM-7 — Account Types View All + Custom Description
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const ACCOUNTS = [
  { email: 'djburrup@gmail.com',        pass: 'luckydjb'   },
  { email: 'elijahburrup323@gmail.com',  pass: 'Eli624462!' },
];

async function login(page, email, pass) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', pass);
  await Promise.all([
    page.waitForURL(/\/mybudgethq\/dashboard/, { timeout: 15000 }),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  try {
    await gotIt.waitFor({ state: 'visible', timeout: 4000 });
    await gotIt.click();
    await page.waitForTimeout(500);
  } catch (e) { /* no overlay */ }
}

for (const acct of ACCOUNTS) {
  test.describe(`CM-7 Account Types — ${acct.email}`, () => {

    test('Account Types page loads with View All toggle', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/account_types`);
      await page.waitForLoadState('networkidle');

      // Page title
      await expect(page.locator('h1:has-text("Account Types")')).toBeVisible();

      // View All toggle button exists
      const viewAllBtn = page.locator('[data-account-types-target="toggleAllButton"]');
      await expect(viewAllBtn).toBeVisible();
      await expect(viewAllBtn).toHaveAttribute('aria-checked', 'false');

      // Table loaded (not "Loading...")
      const tableBody = page.locator('[data-account-types-target="tableBody"]');
      await expect(tableBody).not.toContainText('Loading...');
    });

    test('View All toggle shows all types including disabled', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/account_types`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const tableBody = page.locator('[data-account-types-target="tableBody"]');
      const enabledRows = await tableBody.locator('tr').count();

      // Toggle View All ON
      const viewAllBtn = page.locator('[data-account-types-target="toggleAllButton"]');
      await viewAllBtn.click();
      await page.waitForTimeout(500);

      const allRows = await tableBody.locator('tr').count();
      expect(allRows).toBeGreaterThanOrEqual(enabledRows);

      // Toggle back OFF
      await viewAllBtn.click();
      await page.waitForTimeout(500);
      const filteredRows = await tableBody.locator('tr').count();
      expect(filteredRows).toBe(enabledRows);
    });

    test('Description click-to-edit shows inline editor', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/account_types`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Toggle View All to ensure we have rows
      const viewAllBtn = page.locator('[data-account-types-target="toggleAllButton"]');
      await viewAllBtn.click();
      await page.waitForTimeout(500);

      // Click on the first description text to enter edit mode
      const firstDesc = page.locator('[data-action="click->account-types#editDescription"]').first();
      await firstDesc.click();
      await page.waitForTimeout(500);

      // Input should appear
      const input = page.locator('input.desc-input').first();
      await expect(input).toBeVisible();

      // Save and Cancel buttons should appear
      await expect(page.locator('button:has-text("Save")').first()).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")').first()).toBeVisible();

      // Click cancel to close
      await page.locator('button:has-text("Cancel")').first().click();
      await page.waitForTimeout(500);

      // Input should be gone
      await expect(page.locator('input.desc-input')).toHaveCount(0);
    });

    test('QA Mode banner visible (v1.3.13)', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator('text=NEW RELEASE QA MODE')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=NEW RELEASE QA MODE — v1.3.13')).toBeVisible();
    });
  });
}
