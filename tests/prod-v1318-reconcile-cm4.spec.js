// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        password: 'luckydjb'   },
];

for (const user of USERS) {
  test.describe(`Reconciliation CM-4 — ${user.email}`, () => {

    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE}/users/sign_in`);
      await page.fill('input[name="user[email]"]', user.email);
      await page.fill('input[name="user[password]"]', user.password);
      await Promise.all([
        page.waitForNavigation(),
        page.click('input[type="submit"], button[type="submit"]'),
      ]);
      const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
      if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotIt.click();
      }
    });

    test('Reconciliation page loads with account selector', async ({ page }) => {
      await page.goto(`${BASE}/account_reconciliation`);
      await expect(page.locator('h1:has-text("Reconcile"), h2:has-text("Reconcile")')).toBeVisible();
      await expect(page.locator('[data-reconciliation-target="accountSelect"]')).toBeVisible();
    });

    test('Mark as Reconciled button exists', async ({ page }) => {
      await page.goto(`${BASE}/account_reconciliation`);
      const btn = page.locator('[data-reconciliation-target="markReconciledBtn"]');
      await expect(btn).toBeAttached();
    });

    test('Reconciliation API data endpoint responds', async ({ page }) => {
      await page.goto(`${BASE}/account_reconciliation`);
      // Get account options
      const accountId = await page.locator('[data-reconciliation-target="accountSelect"] option:not([value=""])').first().getAttribute('value');
      if (!accountId) return; // No accounts
      const response = await page.evaluate(async ({ base, acctId }) => {
        const res = await fetch(`${base}/api/reconciliation/data?account_id=${acctId}`, {
          headers: { 'Accept': 'application/json' }
        });
        return { status: res.status, ok: res.ok };
      }, { base: BASE, acctId: accountId });
      expect(response.ok).toBe(true);
    });

    test('Mark reconciled API endpoint exists', async ({ page }) => {
      await page.goto(`${BASE}/account_reconciliation`);
      const response = await page.evaluate(async (base) => {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
        const res = await fetch(`${base}/api/reconciliation/mark_reconciled`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-Token': csrfToken || '',
          },
          body: JSON.stringify({ account_id: 0 }),
        });
        return { status: res.status };
      }, BASE);
      // Should respond with 404 (account not found) not 500 or routing error
      expect([404, 422]).toContain(response.status);
    });

    test('Release notes mention CM-4 reconciliation fix', async ({ page }) => {
      await page.goto(`${BASE}/documentation/release-notes`);
      await expect(page.locator('body')).toContainText('Auto-reconcile');
      await expect(page.locator('body')).toContainText('CM-4');
    });

    test('Selecting account loads data sections', async ({ page }) => {
      await page.goto(`${BASE}/account_reconciliation`);
      const select = page.locator('[data-reconciliation-target="accountSelect"]');
      // Select first account with a value
      const firstOption = select.locator('option:not([value=""])').first();
      const val = await firstOption.getAttribute('value');
      if (!val) return;
      await select.selectOption(val);
      // Data sections should become visible
      await expect(page.locator('[data-reconciliation-target="dataSections"]')).toBeVisible({ timeout: 10000 });
    });
  });
}
