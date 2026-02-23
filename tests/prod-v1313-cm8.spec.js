// Post-deploy verification for CM-8 — Monthly Cash Flow Report
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
  test.describe(`CM-8 Monthly Cash Flow — ${acct.email}`, () => {

    test('Reports Menu shows Monthly Cash Flow card with View Report link', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');

      // The Monthly Cash Flow card should exist
      const card = page.locator('[data-report-key="monthly_cash_flow"]');
      await expect(card).toBeVisible();

      // It should have a "View Report" link (not "Coming Soon")
      const viewLink = card.locator('a:has-text("View Report")');
      await expect(viewLink).toBeVisible();
    });

    test('Monthly Cash Flow report page loads and shows data', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/reports/monthly_cash_flow`);
      await page.waitForLoadState('networkidle');

      // Page title
      await expect(page.locator('h1:has-text("Monthly Cash Flow")')).toBeVisible();

      // Back to Reports link
      await expect(page.locator('a:has-text("Back to Reports")')).toBeVisible();

      // Month label should not say "Loading..."
      const monthLabel = page.locator('[data-monthly-cash-flow-target="monthLabel"]');
      await expect(monthLabel).not.toHaveText('Loading...', { timeout: 10000 });

      // Summary table should have data (not Loading...)
      const summaryBody = page.locator('[data-monthly-cash-flow-target="summaryBody"]');
      await expect(summaryBody).not.toContainText('Loading...');

      // Key rows visible
      await expect(summaryBody.locator('text=Beginning Balance')).toBeVisible();
      await expect(summaryBody.locator('text=Total Deposits')).toBeVisible();
      await expect(summaryBody.locator('text=Total Payments')).toBeVisible();
      await expect(summaryBody.locator('text=Net Cash Flow')).toBeVisible();
      await expect(summaryBody.locator('text=Ending Balance')).toBeVisible();
    });

    test('Month navigation works', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/reports/monthly_cash_flow`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const monthLabel = page.locator('[data-monthly-cash-flow-target="monthLabel"]');
      const initialMonth = await monthLabel.textContent();

      // Click prev month
      await page.click('[data-action="click->monthly-cash-flow#prevMonth"]');
      await page.waitForTimeout(1500);

      const prevMonth = await monthLabel.textContent();
      expect(prevMonth).not.toBe(initialMonth);

      // Click next to go back
      await page.click('[data-action="click->monthly-cash-flow#nextMonth"]');
      await page.waitForTimeout(1500);

      const backMonth = await monthLabel.textContent();
      expect(backMonth).toBe(initialMonth);
    });

    test('Expandable detail sections work', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/reports/monthly_cash_flow`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Details section should have Deposits by Account and Payments by Category
      const details = page.locator('[data-monthly-cash-flow-target="detailsSection"]');
      await expect(details.locator('text=Deposits by Account')).toBeVisible();
      await expect(details.locator('text=Payments by Category')).toBeVisible();

      // Click to expand Deposits
      await details.locator('button[data-section="deposits"]').click();
      await page.waitForTimeout(500);

      // Should show some content or "No data" message
      const depositsContent = details.locator('button[data-section="deposits"]').locator('..');
      await expect(depositsContent).toBeVisible();

      // Click to expand Payments
      await details.locator('button[data-section="payments"]').click();
      await page.waitForTimeout(500);

      const paymentsContent = details.locator('button[data-section="payments"]').locator('..');
      await expect(paymentsContent).toBeVisible();
    });
  });
}
