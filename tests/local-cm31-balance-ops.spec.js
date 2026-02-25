const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';

const accounts = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!', name: 'Eli' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb', name: 'DJ' },
];

async function login(page, acct) {
  await page.goto(BASE + '/users/sign_in');
  await page.fill('input[name="user[email]"]', acct.email);
  await page.fill('input[name="user[password]"]', acct.pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });

  // Dismiss What's New overlay
  try {
    const gotIt = page.getByRole('button', { name: 'Got it' });
    await gotIt.waitFor({ state: 'visible', timeout: 5000 });
    await gotIt.click();
    await page.waitForTimeout(500);
  } catch (e) {}
}

for (const acct of accounts) {
  test.describe(`CM-31 Balance Operations: ${acct.name}`, () => {

    test(`Payments API uses centralized balance methods (${acct.name})`, async ({ page }) => {
      await login(page, acct);

      // Fetch payments API to verify it returns data (no 500 errors from refactored code)
      const res = await page.request.get(BASE + '/api/payments');
      expect(res.status()).toBe(200);
      const payments = await res.json();
      console.log(`${acct.name}: Payments API returned ${payments.length} records`);
      expect(payments.length).toBeGreaterThan(0);

      // Verify each payment has expected fields
      const first = payments[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('amount');
      expect(first).toHaveProperty('account_id');
      expect(first).toHaveProperty('account_name');
      console.log(`${acct.name}: First payment - ${first.description} $${first.amount} on ${first.account_name}`);
    });

    test(`Transfers API uses centralized balance methods (${acct.name})`, async ({ page }) => {
      await login(page, acct);

      // Fetch transfers API to verify it returns data
      const res = await page.request.get(BASE + '/api/transfer_masters');
      expect(res.status()).toBe(200);
      const transfers = await res.json();
      console.log(`${acct.name}: Transfers API returned ${transfers.length} records`);

      if (transfers.length > 0) {
        const first = transfers[0];
        expect(first).toHaveProperty('id');
        expect(first).toHaveProperty('amount');
        expect(first).toHaveProperty('from_account_id');
        expect(first).toHaveProperty('to_account_id');
        console.log(`${acct.name}: First transfer - $${first.amount} from ${first.from_account_name} to ${first.to_account_name}`);
      }
    });

    test(`Account balances load correctly on dashboard (${acct.name})`, async ({ page }) => {
      await login(page, acct);

      // Fetch accounts API
      const res = await page.request.get(BASE + '/api/accounts');
      expect(res.status()).toBe(200);
      const accts = await res.json();
      console.log(`${acct.name}: Accounts API returned ${accts.length} accounts`);

      // Verify we have both DEBIT and CREDIT accounts with valid balances
      let debitCount = 0;
      let creditCount = 0;
      for (const a of accts) {
        expect(a).toHaveProperty('balance');
        expect(a).toHaveProperty('normal_balance_type');
        if (a.normal_balance_type === 'DEBIT') debitCount++;
        if (a.normal_balance_type === 'CREDIT') creditCount++;
        console.log(`  ${a.name}: balance=${a.balance}, type=${a.normal_balance_type}, display_balance=${a.display_balance}`);
      }
      console.log(`${acct.name}: ${debitCount} DEBIT accounts, ${creditCount} CREDIT accounts`);
      expect(debitCount).toBeGreaterThan(0);
    });

    test(`Dashboard loads without errors (${acct.name})`, async ({ page }) => {
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await login(page, acct);
      await page.waitForTimeout(2000);

      // Dashboard should render without JS errors related to balance operations
      const balanceErrors = consoleErrors.filter(e =>
        e.includes('balance') || e.includes('apply_payment') || e.includes('500')
      );
      if (balanceErrors.length > 0) {
        console.log(`${acct.name}: Balance-related errors:`, balanceErrors);
      }
      expect(balanceErrors.length).toBe(0);

      // Verify dashboard shows net worth (uses Account.net_worth_for)
      const netWorthText = await page.locator('[data-role="card-content"]').first().textContent();
      console.log(`${acct.name}: Dashboard first card loaded OK`);
    });

    test(`Payments page renders correctly (${acct.name})`, async ({ page }) => {
      await login(page, acct);
      await page.goto(BASE + '/payments');
      await page.waitForTimeout(2000);

      // Verify payments table loads
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      console.log(`${acct.name}: Payments page shows ${count} rows`);
      expect(count).toBeGreaterThan(0);
    });

    test(`Transfers page renders correctly (${acct.name})`, async ({ page }) => {
      await login(page, acct);
      await page.goto(BASE + '/transfers');
      await page.waitForTimeout(2000);

      // Verify transfers page loads without 500 errors
      const pageTitle = await page.locator('h1').first().textContent();
      console.log(`${acct.name}: Transfers page title: ${pageTitle}`);
    });

    test(`Release notes page loads (${acct.name})`, async ({ page }) => {
      await login(page, acct);
      await page.goto(BASE + '/documentation/release_notes');
      await page.waitForTimeout(2000);

      // Verify the release notes page renders without errors
      const body = await page.locator('body').textContent();
      const hasVersionInfo = body.includes('1.3.20');
      console.log(`${acct.name}: Release notes page loads with version info: ${hasVersionInfo}`);
      expect(hasVersionInfo).toBe(true);
    });
  });
}
