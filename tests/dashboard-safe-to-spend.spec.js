const { test, expect } = require('@playwright/test');

const BASE = 'https://mybudgethq.com';
const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!', name: 'Eli' },
  { email: 'djburrup@gmail.com', password: 'luckydjb', name: 'DJ' }
];

async function login(page, account) {
  await page.goto(BASE + '/users/sign_in');
  await page.fill('input[name="user[email]"]', account.email);
  await page.fill('input[name="user[password]"]', account.password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  // Dismiss any popups
  try {
    const gotIt = page.getByRole('button', { name: 'Got it' });
    await gotIt.waitFor({ state: 'visible', timeout: 3000 });
    await gotIt.click();
  } catch (e) {}
  // Close first-login wizard if present
  try {
    const finishBtn = page.locator('text=Finish');
    await finishBtn.waitFor({ state: 'visible', timeout: 2000 });
    await finishBtn.click();
  } catch (e) {}
}

for (const account of ACCOUNTS) {
  test.describe(`Dashboard Safe to Spend — ${account.name}`, () => {
    test(`API returns new spending overview keys (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);

      const result = await page.evaluate(async (base) => {
        const res = await fetch(base + '/api/dashboard/card_data', {
          headers: { 'Accept': 'application/json' }
        });
        return { status: res.status, body: await res.json() };
      }, BASE);

      expect(result.status).toBe(200);

      const so = result.body.spending_overview;
      expect(so).toBeDefined();

      // New keys must be present
      expect(so.safe_to_spend).toBeDefined();
      expect(so.operating_balance).toBeDefined();
      expect(so.scheduled_deposits).toBeDefined();
      expect(so.scheduled_payments).toBeDefined();
      expect(so.reserved_savings).toBeDefined();

      // Types should be numbers
      expect(typeof so.safe_to_spend).toBe('number');
      expect(typeof so.operating_balance).toBe('number');
      expect(typeof so.scheduled_deposits).toBe('number');
      expect(typeof so.scheduled_payments).toBe('number');
      expect(typeof so.reserved_savings).toBe('number');

      // Formula: safe_to_spend = operating_balance + scheduled_deposits - scheduled_payments
      const expected = parseFloat((so.operating_balance + so.scheduled_deposits - so.scheduled_payments).toFixed(2));
      expect(so.safe_to_spend).toBeCloseTo(expected, 1);

      // Backward compat alias
      expect(so.available_to_spend).toBe(so.safe_to_spend);

      // Existing keys still present
      expect(so.spent).toBeDefined();
      expect(so.safe_daily_spend).toBeDefined();
      expect(so.days_remaining).toBeDefined();
      expect(so.categories).toBeDefined();
      expect(so.types).toBeDefined();

      console.log(`  [${account.name}] API: safe_to_spend=${so.safe_to_spend}, operating=${so.operating_balance}, deposits=${so.scheduled_deposits}, payments=${so.scheduled_payments}, reserved=${so.reserved_savings}`);
    });

    test(`Dashboard renders Safe to Spend layout (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);

      await page.waitForLoadState('networkidle');

      // Check "Safe to Spend" label exists
      const safeToSpendLabel = page.locator('text=Safe to Spend');
      await expect(safeToSpendLabel.first()).toBeVisible({ timeout: 10000 });

      // Check breakdown rows exist
      const operatingLabel = page.locator('text=Current Operating Balance');
      await expect(operatingLabel.first()).toBeVisible();

      const depositsLabel = page.locator('text=Scheduled Deposits');
      await expect(depositsLabel.first()).toBeVisible();

      const paymentsLabel = page.locator('text=Scheduled Payments');
      await expect(paymentsLabel.first()).toBeVisible();

      // Check safe/day still shows
      const safeDayLabel = page.locator('text=safe / day');
      await expect(safeDayLabel.first()).toBeVisible();

      // Donut SVG should NOT exist anymore
      const donutCircle = page.locator('circle[stroke="#a855f7"][stroke-dasharray="100 0"]');
      await expect(donutCircle).toHaveCount(0);

      console.log(`  [${account.name}] Dashboard renders new Safe to Spend layout`);
    });

    test(`Tooltip shows on hover (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);
      await page.waitForLoadState('networkidle');

      // Find tooltip trigger (info icon near Safe to Spend)
      const tooltipTrigger = page.locator('.group.cursor-help').first();
      await expect(tooltipTrigger).toBeVisible({ timeout: 10000 });

      // Hover to show tooltip
      await tooltipTrigger.hover();

      // Check tooltip text appears
      const tooltipText = page.locator('text=Safe to Spend includes only operating accounts');
      await expect(tooltipText.first()).toBeVisible({ timeout: 3000 });

      console.log(`  [${account.name}] Tooltip visible on hover`);
    });

    test(`Version is 1.3.47+ (${account.name})`, async ({ page }) => {
      test.setTimeout(20000);
      await login(page, account);

      const pageContent = await page.content();
      // Should be at least 1.3.47 (may be 1.3.48 due to hook bump)
      const versionMatch = pageContent.match(/1\.3\.4[7-9]/);
      expect(versionMatch).toBeTruthy();
      console.log(`  [${account.name}] Version ${versionMatch[0]} found on page`);
    });

    test(`No console errors on Dashboard (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('import') && !text.includes('module') && !text.includes('Failed to load resource')) {
            errors.push(text);
          }
        }
      });

      await login(page, account);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      if (errors.length > 0) {
        console.log(`  [${account.name}] Console errors:`, errors);
      }
      expect(errors).toHaveLength(0);
    });

    test(`Month navigation updates Safe to Spend via API (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);
      await page.waitForLoadState('networkidle');

      // Wait for initial render
      await expect(page.locator('text=Safe to Spend').first()).toBeVisible({ timeout: 10000 });

      // Click prev month
      const prevBtn = page.locator('[data-action="click->dashboard#prevMonth"]').first();
      await prevBtn.click();

      // Wait for re-render (API call)
      await page.waitForTimeout(2000);

      // Safe to Spend label should still be there
      await expect(page.locator('text=Safe to Spend').first()).toBeVisible();
      await expect(page.locator('text=Current Operating Balance').first()).toBeVisible();

      console.log(`  [${account.name}] Month navigation works correctly`);
    });
  });
}
