// Post-deploy verification: Buckets table column reorder + sortable headers (CM-1)
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

async function dismissWhatsNew(page) {
  try {
    const btn = page.locator('#whatsNewOverlay button:has-text("Got it")');
    await btn.click({ timeout: 3000 });
    await page.waitForTimeout(500);
  } catch {}
}

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|mybudgethq/, { timeout: 15000 });
  await dismissWhatsNew(page);
}

for (const acct of ACCOUNTS) {
  test.describe(`Account: ${acct.email}`, () => {
    test('Login succeeds and dashboard shows data', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await expect(page.locator('body')).toBeVisible();
      // Dashboard should show spending data or cards
      const dashCards = page.locator('[data-controller="dashboard"]');
      await expect(dashCards).toBeVisible({ timeout: 10000 });
    });

    test('Buckets page loads with Account column first', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/buckets`);
      await page.waitForTimeout(2000);

      // Check header order: Account should be first, Name second
      const headers = page.locator('thead th');
      const headerTexts = [];
      const count = await headers.count();
      for (let i = 0; i < count; i++) {
        headerTexts.push(await headers.nth(i).innerText());
      }
      console.log('Header order:', headerTexts);
      expect(headerTexts[0].trim().toUpperCase()).toContain('ACCOUNT');
      expect(headerTexts[1].trim().toUpperCase()).toContain('NAME');
    });

    test('Buckets headers are sortable with clickable indicators', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/buckets`);
      await page.waitForTimeout(2000);

      // Click Account header to sort
      const acctHeader = page.locator('th[data-sort-field="account_name"]');
      await expect(acctHeader).toBeVisible();
      await acctHeader.click();
      await page.waitForTimeout(500);

      // Check sort icon appears
      const sortIcon = page.locator('[data-sort-icon="account_name"] svg');
      await expect(sortIcon).toBeVisible();

      // Click again to reverse
      await acctHeader.click();
      await page.waitForTimeout(500);
      await expect(sortIcon).toBeVisible();

      // Click Name header
      const nameHeader = page.locator('th[data-sort-field="name"]');
      await nameHeader.click();
      await page.waitForTimeout(500);
      const nameIcon = page.locator('[data-sort-icon="name"] svg');
      await expect(nameIcon).toBeVisible();

      // Click Balance header
      const balHeader = page.locator('th[data-sort-field="current_balance"]');
      await balHeader.click();
      await page.waitForTimeout(500);
      const balIcon = page.locator('[data-sort-icon="current_balance"] svg');
      await expect(balIcon).toBeVisible();
    });

    test('Buckets default sort is Account then Name', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/buckets`);
      await page.waitForTimeout(3000);

      // Get all rows
      const rows = page.locator('tbody tr');
      const rowCount = await rows.count();
      if (rowCount > 1) {
        // Read account names from first column
        const accounts = [];
        for (let i = 0; i < rowCount; i++) {
          const acctCell = await rows.nth(i).locator('td').first().innerText();
          accounts.push(acctCell.trim());
        }
        console.log('Account column values (should be A-Z):', accounts);
        // Verify accounts are in ascending order
        for (let i = 1; i < accounts.length; i++) {
          expect(accounts[i].toLowerCase() >= accounts[i - 1].toLowerCase()).toBeTruthy();
        }
      }
    });

    test('Other pages still work (regression check)', async ({ page }) => {
      await login(page, acct.email, acct.password);

      // Check Payments page
      await page.goto(`${BASE}/payments`);
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toBeVisible();

      // Check Accounts page
      await page.goto(`${BASE}/accounts`);
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toBeVisible();

      // Check no JS errors in console
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(`${BASE}/buckets`);
      await page.waitForTimeout(3000);
      if (errors.length > 0) {
        console.log('JS errors found:', errors);
      }
      expect(errors.length).toBe(0);
    });
  });
}
