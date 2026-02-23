// @ts-check
// Post-deploy verification for v1.3.6 CM-8: Account Types Master/User pattern
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        pass: 'luckydjb'   },
];

async function login(page, email, pass) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', pass);
  await Promise.all([
    page.waitForURL(/\/mybudgethq\/dashboard/, { timeout: 15000 }),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  try {
    await gotIt.waitFor({ state: 'visible', timeout: 4000 });
    await gotIt.click();
    await page.waitForTimeout(500);
  } catch { /* no overlay */ }
}

for (const acct of ACCOUNTS) {
  test.describe(`Account: ${acct.email}`, () => {

    test('Version is 1.3.6', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const footer = page.locator('footer');
      await expect(footer).toContainText('1.3.6', { timeout: 10000 });
    });

    test('Account Types page loads with toggle switches', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/account_types`);
      await page.waitForLoadState('networkidle');

      const heading = page.locator('h1:has-text("Account Types")');
      await expect(heading).toBeVisible();

      // Toggle buttons for enabling/disabling types
      const toggles = page.locator('button.relative.inline-flex');
      await expect(toggles.first()).toBeVisible({ timeout: 10000 });
      const count = await toggles.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('Accounts API returns account_type_master_id', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const response = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/accounts`, { headers: { 'Accept': 'application/json' } });
        return res.json();
      }, BASE);

      expect(Array.isArray(response)).toBeTruthy();
      if (response.length > 0) {
        const withMaster = response.filter(a => a.account_type_master_id != null);
        expect(withMaster.length).toBeGreaterThan(0);
        expect(response[0]).toHaveProperty('account_type_name');
      }
    });

    test('User Account Types API returns master type data', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const response = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/user_account_types`, { headers: { 'Accept': 'application/json' } });
        return res.json();
      }, BASE);

      expect(Array.isArray(response)).toBeTruthy();
      expect(response.length).toBeGreaterThanOrEqual(3);
      const first = response[0];
      expect(first).toHaveProperty('account_type_master_id');
      expect(first).toHaveProperty('display_name');
      expect(first).toHaveProperty('is_enabled');
    });
  });
}
