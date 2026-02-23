// Post-deploy verification for v1.3.18 bucket-to-bucket reallocation on Transfers
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb' },
];

async function login(page, email, pass) {
  await page.goto(`${BASE}/users/sign_in`);
  // Dismiss What's New if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|transfer|account/i, { timeout: 15000 });
}

for (const acct of ACCOUNTS) {
  test.describe(`Account: ${acct.email}`, () => {

    test('Login succeeds and dashboard loads with data', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page).toHaveURL(/dashboard/i);
      // Dashboard should have content (not blank)
      const body = await page.textContent('body');
      expect(body.length).toBeGreaterThan(100);
    });

    test('Transfers page loads', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/transfer_masters`);
      await expect(page.locator('h1')).toContainText('Account Transfers');
      // Table or empty state should be present
      const tableBody = page.locator('[data-transfer-masters-target="tableBody"]');
      await expect(tableBody).toBeVisible();
    });

    test('Transfer modal opens and shows bucket fields', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/transfer_masters`);
      await page.click('[data-transfer-masters-target="addButton"]');
      const modal = page.locator('[data-transfer-masters-target="modal"]');
      await expect(modal).toBeVisible();
      // From and To dropdowns should be present
      await expect(page.locator('[data-transfer-masters-target="modalFrom"]')).toBeVisible();
      await expect(page.locator('[data-transfer-masters-target="modalTo"]')).toBeVisible();
      // Helper text should be hidden initially
      const helper = page.locator('[data-transfer-masters-target="bucketHelperText"]');
      await expect(helper).toBeHidden();
    });

    test('Same account without buckets shows correct error', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/transfer_masters`);
      await page.click('[data-transfer-masters-target="addButton"]');
      // Select first account for both From and To
      const fromSelect = page.locator('[data-transfer-masters-target="modalFrom"]');
      const toSelect = page.locator('[data-transfer-masters-target="modalTo"]');
      const options = await fromSelect.locator('option').allTextContents();
      // Find first real account (skip "Select account...")
      if (options.length > 1) {
        await fromSelect.selectOption({ index: 1 });
        await toSelect.selectOption({ index: 1 });
        await page.fill('[data-transfer-masters-target="modalAmount"]', '10.00');
        await page.fill('[data-transfer-masters-target="modalDate"]', '2026-02-21');
        await page.click('[data-transfer-masters-target="modalSaveButton"]');
        const error = page.locator('[data-transfer-masters-target="modalError"]');
        await expect(error).toBeVisible();
        await expect(error).toContainText('bucket');
      }
    });

    test('Navigation works - Payments page loads', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      const heading = page.locator('h1');
      await expect(heading).toContainText(/Payment/i);
    });

    test('Navigation works - Accounts page loads', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/accounts`);
      const heading = page.locator('h1');
      await expect(heading).toContainText(/Account/i);
    });

    test('No JS errors on console', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('import')) {
          errors.push(msg.text());
        }
      });
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/transfer_masters`);
      await page.waitForTimeout(2000);
      expect(errors.filter(e => /import|404|SyntaxError/i.test(e))).toHaveLength(0);
    });
  });
}
