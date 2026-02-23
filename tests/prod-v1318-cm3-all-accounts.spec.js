// Post-deploy verification for CM-3: All accounts on Accounts + Net Worth cards
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

    test('Login and dashboard loads', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator('[data-dashboard-target="cardsGrid"]')).toBeVisible({ timeout: 10000 });
    });

    test('Accounts card API returns accounts with totals', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      // Fetch card data via API
      const data = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/dashboard/card_data`);
        return res.json();
      }, BASE);

      expect(data).toHaveProperty('slots');
      const accountsSlot = data.slots.find(s => s.card_type === 'accounts_overview');
      expect(accountsSlot).toBeTruthy();
      expect(accountsSlot.data).toHaveProperty('accounts');
      expect(accountsSlot.data).toHaveProperty('total');
      expect(Array.isArray(accountsSlot.data.accounts)).toBe(true);

      // Verify total matches sum of accounts
      const sum = accountsSlot.data.accounts.reduce((acc, a) => acc + a.balance, 0);
      expect(Math.abs(accountsSlot.data.total - sum)).toBeLessThan(0.02); // floating point tolerance

      console.log(`  ${acct.email}: ${accountsSlot.data.accounts.length} accounts, total: $${accountsSlot.data.total}`);
    });

    test('Net Worth card API returns value', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const data = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/dashboard/card_data`);
        return res.json();
      }, BASE);

      const nwSlot = data.slots.find(s => s.card_type === 'net_worth');
      expect(nwSlot).toBeTruthy();
      expect(nwSlot.data).toHaveProperty('value');
      console.log(`  ${acct.email}: Net worth: $${nwSlot.data.value}`);
    });

    test('No JS errors on dashboard', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await login(page, acct.email, acct.pass);
      await page.waitForTimeout(3000);
      expect(errors.filter(e => /dashboard|account|net.worth/i.test(e))).toHaveLength(0);
    });

    test('Payments page loads (regression)', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toBeVisible();
    });
  });
}
