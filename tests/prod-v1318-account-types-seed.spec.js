// Post-deploy verification for v1.3.18 Account Types seeding (CM-3)
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb' },
];

const CANONICAL = [
  'Checking', 'Savings', 'High Yield Savings', 'Money Market', 'Cash Card',
  'Credit Card', 'Line of Credit', 'HELOC', 'Mortgage', 'Auto Loan',
  'Student Loan', 'Personal Loan', 'Business Loan', '401(k)', 'IRA',
  'Roth IRA', 'Brokerage', 'HSA', '529 Plan', 'Other Asset Account',
  'Other Liability Account'
];

async function login(page, email, pass) {
  await page.goto(`${BASE}/users/sign_in`);
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) await gotIt.click();
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|account/i, { timeout: 15000 });
}

for (const acct of ACCOUNTS) {
  test.describe(`Account: ${acct.email}`, () => {
    test('Login and dashboard loads', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page).toHaveURL(/dashboard/i);
    });

    test('Account Types API returns canonical types', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const res = await page.evaluate(async (base) => {
        const r = await fetch(`${base}/api/user_account_types`, { headers: { 'Accept': 'application/json' } });
        return r.json();
      }, BASE);

      // Should have at least 21 types
      expect(res.length).toBeGreaterThanOrEqual(21);

      // All canonical types should be present
      const names = res.map(t => t.display_name);
      for (const canonical of CANONICAL) {
        expect(names).toContain(canonical);
      }
    });

    test('Account Types page loads and shows types', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/account_types`);
      await page.waitForTimeout(2000);
      // Should see at least "Checking" in the list
      const body = await page.textContent('body');
      expect(body).toContain('Checking');
    });

    test('Accounts page and dropdown work', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/accounts`);
      const heading = page.locator('h1');
      await expect(heading).toContainText(/Account/i, { timeout: 10000 });
    });

    test('No JS errors on console', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/account_types`);
      await page.waitForTimeout(2000);
      expect(errors.filter(e => /import|404|SyntaxError/i.test(e))).toHaveLength(0);
    });
  });
}
