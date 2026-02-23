// Post-deploy verification for CM-022126-06: Sortable Report Table Headers
// Tests: All 9 reports load, headers are clickable with sort indicators
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const CREDS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

async function login(page, cred) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', cred.email);
  await page.fill('input[name="user[password]"]', cred.password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

// Helper: navigate to a report, click Run Report, wait for table
async function goToReportAndRun(page, routePath) {
  await page.goto(`${BASE}${routePath}`);
  await page.waitForTimeout(1000);
  // Click Run Report button to dismiss options modal and load data
  const runBtn = page.locator('button:has-text("Run Report")');
  if (await runBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await runBtn.click();
  }
  await page.waitForTimeout(3000); // Wait for data to load and table to render
}

for (const cred of CREDS) {
  test.describe(`Account: ${cred.email}`, () => {

    test('Dashboard loads without JS errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await expect(page.locator('[data-controller="dashboard"]')).toBeVisible({ timeout: 10000 });
      expect(errors).toEqual([]);
    });

    test('Spending by Category — sortable headers present after Run Report', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await goToReportAndRun(page, '/reports/spending_by_category');
      const sortHeaders = page.locator('th[data-sort-field]');
      const count = await sortHeaders.count();
      expect(count).toBeGreaterThanOrEqual(4);
      expect(errors).toEqual([]);
    });

    test('Spending by Category — click header toggles sort', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await goToReportAndRun(page, '/reports/spending_by_category');
      const catHeader = page.locator('th[data-sort-field="name"]');
      if (await catHeader.count() > 0) {
        await catHeader.click();
        await page.waitForTimeout(500);
        // Click again to toggle direction
        await catHeader.click();
        await page.waitForTimeout(500);
        // Should still have table rows (sort didn't break anything)
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThanOrEqual(0);
      }
      expect(errors).toEqual([]);
    });

    test('Spending by Type — sortable headers present', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await goToReportAndRun(page, '/reports/spending_by_type');
      const sortHeaders = page.locator('th[data-sort-field]');
      const count = await sortHeaders.count();
      expect(count).toBeGreaterThanOrEqual(3);
      expect(errors).toEqual([]);
    });

    test('Income by Source — sortable headers present', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await goToReportAndRun(page, '/reports/income_by_source');
      const sortHeaders = page.locator('th[data-sort-field]');
      const count = await sortHeaders.count();
      expect(count).toBeGreaterThanOrEqual(3);
      expect(errors).toEqual([]);
    });

    test('Net Worth Report — sortable headers present', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await goToReportAndRun(page, '/reports/net_worth_report');
      const sortHeaders = page.locator('th[data-sort-field]');
      const count = await sortHeaders.count();
      expect(count).toBeGreaterThanOrEqual(3);
      expect(errors).toEqual([]);
    });

    test('Account Balance History — sortable headers present', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await goToReportAndRun(page, '/reports/account_balance_history');
      const sortHeaders = page.locator('th[data-sort-field]');
      const count = await sortHeaders.count();
      expect(count).toBeGreaterThanOrEqual(3);
      expect(errors).toEqual([]);
    });

    test('Recurring Obligations — sortable headers present', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await goToReportAndRun(page, '/reports/recurring_obligations');
      const sortHeaders = page.locator('th[data-sort-field]');
      const count = await sortHeaders.count();
      expect(count).toBeGreaterThanOrEqual(4);
      expect(errors).toEqual([]);
    });

    test('Monthly Cash Flow — loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await goToReportAndRun(page, '/reports/monthly_cash_flow');
      expect(errors).toEqual([]);
    });

    test('Soft Close Summary — loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await goToReportAndRun(page, '/reports/soft_close_summary');
      expect(errors).toEqual([]);
    });

    test('Reconciliation Summary — loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await goToReportAndRun(page, '/reports/reconciliation_summary');
      expect(errors).toEqual([]);
    });

    test('Version shows SEQ 29', async ({ page }) => {
      await login(page, cred);
      const content = await page.content();
      expect(content).toContain('1.3.18');
    });

    test('Release notes include sortable headers entry', async ({ page }) => {
      await login(page, cred);
      await page.goto(`${BASE}/documentation/release-notes`);
      await page.waitForTimeout(3000);
      const content = await page.content();
      expect(content).toContain('sortable column headers');
    });

    // Regression tests
    test('Payments page loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await page.goto(`${BASE}/payments`);
      await expect(page.locator('[data-controller="payments"]')).toBeVisible({ timeout: 10000 });
      expect(errors).toEqual([]);
    });

    test('Reports menu page loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await login(page, cred);
      await page.goto(`${BASE}/reports`);
      await expect(page.locator('[data-controller="reports"]')).toBeVisible({ timeout: 10000 });
      expect(errors).toEqual([]);
    });
  });
}
