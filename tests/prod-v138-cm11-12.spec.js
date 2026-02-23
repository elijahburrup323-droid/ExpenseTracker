// @ts-check
// Post-deploy verification for v1.3.8 CM-11 + CM-12
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
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  try {
    await gotIt.waitFor({ state: 'visible', timeout: 4000 });
    await gotIt.click();
    await page.waitForTimeout(500);
  } catch { /* no overlay */ }
}

for (const acct of ACCOUNTS) {
  test.describe(`Account: ${acct.email}`, () => {

    test('Version is 1.3.8', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator('footer')).toContainText('1.3.8', { timeout: 10000 });
    });

    // CM-11: Default sort is Date DESC (newest first)
    test('Payments default sort is Date DESC', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await page.waitForLoadState('networkidle');

      // Wait for table to render with data
      const rows = page.locator('table tbody tr');
      await expect(rows.first()).toBeVisible({ timeout: 10000 });

      // Get all payment dates
      const dateCells = page.locator('table tbody tr td:first-child');
      const count = await dateCells.count();
      if (count >= 2) {
        const firstDate = await dateCells.nth(0).textContent();
        const lastDate = await dateCells.nth(count - 1).textContent();
        // Parse dates (format: M/D/YYYY)
        const parseDate = (s) => {
          const parts = s.trim().split('/');
          return new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
        };
        const first = parseDate(firstDate);
        const last = parseDate(lastDate);
        // Newest first means first date >= last date
        expect(first.getTime()).toBeGreaterThanOrEqual(last.getTime());
      }

      // Check sort indicator is on Date column pointing down (DESC)
      const dateHeader = page.locator('th[data-sort-col="payment_date"]');
      const sortIndicator = dateHeader.locator('.sort-indicator svg');
      await expect(sortIndicator).toBeVisible();
    });

    // CM-12: Description autocomplete
    test('Description field has autocomplete attributes', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await page.waitForLoadState('networkidle');

      // Open Add Payment modal
      await page.click('button:has-text("Add Payment")');
      await page.waitForTimeout(300);

      // Check ARIA attributes on description input
      const descInput = page.locator('input[name="description"]');
      await expect(descInput).toHaveAttribute('role', 'combobox');
      await expect(descInput).toHaveAttribute('aria-autocomplete', 'list');
      await expect(descInput).toHaveAttribute('aria-expanded', 'false');

      // Check suggestion list exists but is hidden
      const suggestionsList = page.locator('#payments-suggestions-list');
      await expect(suggestionsList).toHaveAttribute('role', 'listbox');
      await expect(suggestionsList).toBeHidden();
    });

    // CM-12: Suggestions API endpoint responds
    test('Suggestions API returns results', async ({ page }) => {
      await login(page, acct.email, acct.pass);

      // Call the suggestions endpoint directly
      const response = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/payments/suggestions?q=pa`, {
          headers: { 'Accept': 'application/json' }
        });
        return { status: res.status, body: await res.json() };
      }, BASE);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Each result should have a description field
      for (const item of response.body) {
        expect(item).toHaveProperty('description');
      }
    });

  });
}
