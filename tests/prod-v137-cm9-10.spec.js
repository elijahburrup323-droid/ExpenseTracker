// @ts-check
// Post-deploy verification for v1.3.7 CM-9 + CM-10
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

    test('Version is 1.3.7', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator('footer')).toContainText('1.3.7', { timeout: 10000 });
    });

    // CM-9: Recurring Deposits rename
    test('Recurring Deposits shows Deposit Sources heading', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/income_recurrings`);
      await page.waitForLoadState('networkidle');
      // Use specific page heading, not the header "Hello" h1
      const heading = page.locator('h1:has-text("Deposit Sources")');
      await expect(heading).toBeVisible({ timeout: 10000 });
      // Add button should say "Add Deposit Source"
      const addBtn = page.locator('button:has-text("Add Deposit Source")');
      await expect(addBtn).toBeVisible();
    });

    // CM-10: Reconciliation no month navigation
    test('Reconciliation has no month navigation arrows', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/account_reconciliation`);
      await page.waitForLoadState('networkidle');

      // Month label should be visible (static text)
      const monthLabel = page.locator('[data-reconciliation-target="monthLabel"]');
      await expect(monthLabel).toBeVisible();
      const text = await monthLabel.textContent();
      expect(text.trim()).toMatch(/\w+ \d{4}/);

      // No prev/next month buttons
      const prevBtn = page.locator('button[data-action*="prevMonth"]');
      const nextBtn = page.locator('button[data-action*="nextMonth"]');
      await expect(prevBtn).toHaveCount(0);
      await expect(nextBtn).toHaveCount(0);
    });
  });
}
