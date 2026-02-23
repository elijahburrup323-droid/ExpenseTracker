// Post-deploy verification for CM-1: Monthly Cash Flow New Account Handling
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

    test('Monthly Cash Flow API returns new_accounts_total field', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const data = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/reports/monthly_cash_flow?year=2026&month=2`);
        return res.json();
      }, BASE);

      expect(data).toHaveProperty('beginning_balance');
      expect(data).toHaveProperty('total_deposits');
      expect(data).toHaveProperty('new_accounts_total');
      expect(data).toHaveProperty('new_accounts');
      expect(data).toHaveProperty('total_payments');
      expect(data).toHaveProperty('net_cash_flow');
      expect(data).toHaveProperty('ending_balance');
      expect(typeof data.new_accounts_total).toBe('number');
      expect(Array.isArray(data.new_accounts)).toBe(true);

      console.log(`  ${acct.email}: new_accounts_total=$${data.new_accounts_total}, ${data.new_accounts.length} new accounts`);
    });

    test('Net cash flow = deposits + new_accounts_total - payments', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const data = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/reports/monthly_cash_flow?year=2026&month=2`);
        return res.json();
      }, BASE);

      const expected = parseFloat((data.total_deposits + data.new_accounts_total - data.total_payments).toFixed(2));
      expect(Math.abs(data.net_cash_flow - expected)).toBeLessThan(0.02);
    });

    test('Ending balance = beginning + net cash flow', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const data = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/reports/monthly_cash_flow?year=2026&month=2`);
        return res.json();
      }, BASE);

      const expected = parseFloat((data.beginning_balance + data.net_cash_flow).toFixed(2));
      expect(Math.abs(data.ending_balance - expected)).toBeLessThan(0.02);
    });

    test('Comparison mode includes new_accounts_total in variance', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const data = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/reports/monthly_cash_flow?year=2026&month=2&mode=comparison&compare_prev=1&include_ytd=1`);
        return res.json();
      }, BASE);

      expect(data.mode).toBe('comparison');
      expect(data.prev).toBeTruthy();
      expect(data.prev).toHaveProperty('new_accounts_total');
      expect(data.variance).toHaveProperty('new_accounts_total');
      expect(data.ytd).toHaveProperty('new_accounts_total');
      console.log(`  ${acct.email}: prev new_accts=$${data.prev.new_accounts_total}, ytd new_accts=$${data.ytd.new_accounts_total}`);
    });

    test('January 2026 report (Jaci regression)', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const data = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/reports/monthly_cash_flow?year=2026&month=1`);
        return res.json();
      }, BASE);

      // Verify the formula holds
      const expectedNet = parseFloat((data.total_deposits + data.new_accounts_total - data.total_payments).toFixed(2));
      expect(Math.abs(data.net_cash_flow - expectedNet)).toBeLessThan(0.02);

      const expectedEnd = parseFloat((data.beginning_balance + data.net_cash_flow).toFixed(2));
      expect(Math.abs(data.ending_balance - expectedEnd)).toBeLessThan(0.02);

      console.log(`  ${acct.email} Jan 2026: beg=$${data.beginning_balance}, dep=$${data.total_deposits}, new=$${data.new_accounts_total}, pay=$${data.total_payments}, net=$${data.net_cash_flow}, end=$${data.ending_balance}`);
    });

    test('Report page loads without JS errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/reports/monthly_cash_flow`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(3000);
      expect(errors.filter(e => /cash.flow|report|monthly/i.test(e))).toHaveLength(0);
    });

    test('No JS errors on dashboard (regression)', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await login(page, acct.email, acct.pass);
      await page.waitForTimeout(3000);
      expect(errors.filter(e => /dashboard/i.test(e))).toHaveLength(0);
    });
  });
}
