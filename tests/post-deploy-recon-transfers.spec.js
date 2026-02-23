const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'djburrup@gmail.com', password: 'luckydjb' },
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' }
];

test.describe('Post-Deploy: Reconcile Balance Transfers Count', () => {
  test.setTimeout(180000);

  for (const user of USERS) {
    test(`Login check (${user.email})`, async ({ page }) => {
      await page.goto(`${BASE}/users/sign_in`, { waitUntil: 'networkidle', timeout: 120000 });
      await page.fill('input[name="user[email]"]', user.email);
      await page.fill('input[name="user[password]"]', user.password);
      await page.click('input[type="submit"]');
      await page.waitForURL(/dashboard/, { timeout: 30000 });
      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) await gotIt.click();
      await expect(page.locator('body')).toContainText('Hello');
    });
  }

  test('Transfers count input exists on Reconcile Balance', async ({ page }) => {
    // Login
    await page.goto(`${BASE}/users/sign_in`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.fill('input[name="user[email]"]', 'djburrup@gmail.com');
    await page.fill('input[name="user[password]"]', 'luckydjb');
    await page.click('input[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 30000 });
    const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
    if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) await gotIt.click();

    // Navigate to Reconcile Balance
    await page.goto(`${BASE}/account_reconciliation`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Select first account (if available)
    const accountSelect = page.locator('[data-reconciliation-target="accountSelect"]');
    const options = await accountSelect.locator('option').allTextContents();
    console.log('Account options:', options);

    if (options.length > 1) {
      await accountSelect.selectOption({ index: 1 });
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'tests/screenshots/recon-transfers-count.png', fullPage: true });

    // Check that Transfers section has the count input
    const transferCountInput = page.locator('[data-reconciliation-target="transferStatementCount"]');
    const transferCountExists = await transferCountInput.isVisible().catch(() => false);
    console.log('Transfer count input visible:', transferCountExists);

    // Also check Payments count for comparison
    const paymentCountInput = page.locator('[data-reconciliation-target="paymentStatementCount"]');
    const paymentCountExists = await paymentCountInput.isVisible().catch(() => false);
    console.log('Payment count input visible:', paymentCountExists);

    // Check transfer count label
    const transferLabel = page.locator('[data-reconciliation-target="transferCountLabel"]');
    const labelText = await transferLabel.textContent().catch(() => '');
    console.log('Transfer count label:', labelText);

    // Verify consistency — if payments has count, transfers should too
    if (paymentCountExists) {
      expect(transferCountExists).toBe(true);
    }

    // Regression: Dashboard still loads
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Hello');

    // Regression: Payments still loads
    await page.goto(`${BASE}/payments`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Payment');
  });
});
