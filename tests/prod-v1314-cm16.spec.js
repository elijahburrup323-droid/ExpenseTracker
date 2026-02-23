// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
];

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|reports/);
  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

for (const acct of ACCOUNTS) {
  test.describe(`Account: ${acct.email}`, () => {

    test('Login succeeds and dashboard loads with data', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await expect(page).toHaveURL(/dashboard/);
      // Dashboard should have content
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('Reports page shows Spending by Category with View Report link', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');

      // Find the Spending by Category card
      const card = page.locator('text=Spending by Category');
      await expect(card).toBeVisible();

      // Should have "View Report" link, not "Coming Soon"
      const viewLink = page.locator('a:has-text("View Report")').filter({ has: page.locator('text=Spending by Category') });
      // Actually check by finding the card container and its View Report link
      const reportCards = page.locator('[data-report-key="spending_by_category"]');
      const link = reportCards.locator('a:has-text("View Report")');
      await expect(link).toBeVisible();
    });

    test('Spending by Category options modal appears', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/reports/spending_by_category`);
      await page.waitForLoadState('networkidle');

      // Options modal should be visible
      const modal = page.locator('text=Choose how you want to run this report.');
      await expect(modal).toBeVisible();

      // Radio buttons present
      await expect(page.locator('text=Regular (This Month)')).toBeVisible();
      await expect(page.locator('text=Comparison')).toBeVisible();

      // Run Report button present
      await expect(page.locator('button:has-text("Run Report")')).toBeVisible();
    });

    test('Regular report runs and shows category table', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/reports/spending_by_category`);
      await page.waitForLoadState('networkidle');

      // Click Run Report (default is Regular)
      await page.click('button:has-text("Run Report")');

      // Wait for report content to appear
      await page.waitForTimeout(2000);

      // Header should show
      await expect(page.locator('h1:has-text("Spending by Category")')).toBeVisible();

      // Total Spent stat should be visible
      await expect(page.locator('text=Total Spent')).toBeVisible();

      // Table should be visible
      const table = page.locator('table');
      await expect(table).toBeVisible();
    });

    test('Comparison mode shows comparison options and runs', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/reports/spending_by_category`);
      await page.waitForLoadState('networkidle');

      // Select Comparison
      await page.click('text=Comparison');

      // Comparison options should appear
      await expect(page.locator('text=Compare to Previous Month')).toBeVisible();
      await expect(page.locator('text=Include YTD Totals')).toBeVisible();

      // Run report
      await page.click('button:has-text("Run Report")');
      await page.waitForTimeout(2000);

      // Report should render
      await expect(page.locator('h1:has-text("Spending by Category")')).toBeVisible();
    });

    test('Change Options button reopens modal', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/reports/spending_by_category`);
      await page.waitForLoadState('networkidle');

      // Run Regular first
      await page.click('button:has-text("Run Report")');
      await page.waitForTimeout(1000);

      // Click Change Options
      await page.click('button:has-text("Change Options")');

      // Modal should reappear
      await expect(page.locator('text=Choose how you want to run this report.')).toBeVisible();
    });

    test('Print button is present on report', async ({ page }) => {
      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/reports/spending_by_category`);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("Run Report")');
      await page.waitForTimeout(1000);

      // Print button should be visible
      await expect(page.locator('button:has-text("Print")')).toBeVisible();
    });

    test('Navigation and other pages still work (regression)', async ({ page }) => {
      await login(page, acct.email, acct.password);

      // Check Payments page loads
      await page.goto(`${BASE}/payments`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).not.toBeEmpty();

      // Check Accounts page loads
      await page.goto(`${BASE}/accounts`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).not.toBeEmpty();

      // Check Monthly Cash Flow still works
      await page.goto(`${BASE}/reports/monthly_cash_flow`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Monthly Cash Flow')).toBeVisible();
    });

    test('No JS console errors on report page', async ({ page }) => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await login(page, acct.email, acct.password);
      await page.goto(`${BASE}/reports/spending_by_category`);
      await page.waitForLoadState('networkidle');
      await page.click('button:has-text("Run Report")');
      await page.waitForTimeout(2000);

      // Filter out known non-critical errors
      const critical = errors.filter(e => !e.includes('favicon') && !e.includes('404'));
      expect(critical).toEqual([]);
    });
  });
}
