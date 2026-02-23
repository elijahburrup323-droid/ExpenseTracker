// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        password: 'luckydjb'   },
];

for (const user of USERS) {
  test.describe(`Diagnostic CM-5 — ${user.email}`, () => {

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

    test('Diagnostic panel exists in DOM', async ({ page }) => {
      await page.goto(`${BASE}/account_reconciliation`);
      await expect(page.locator('[data-reconciliation-target="diagnosticPanel"]')).toBeAttached();
    });

    test('Diagnostics API endpoint responds', async ({ page }) => {
      await page.goto(`${BASE}/account_reconciliation`);
      const accountId = await page.locator('[data-reconciliation-target="accountSelect"] option:not([value=""])').first().getAttribute('value');
      if (!accountId) return;
      const response = await page.evaluate(async ({ base, acctId }) => {
        const res = await fetch(`${base}/api/reconciliation/diagnostics?account_id=${acctId}`, {
          headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        return { status: res.status, ok: res.ok, hasKeys: 'count_issues' in data && 'amount_issues' in data && 'cross_account' in data };
      }, { base: BASE, acctId: accountId });
      expect(response.ok).toBe(true);
      expect(response.hasKeys).toBe(true);
    });

    test('Diagnostic panel initially hidden', async ({ page }) => {
      await page.goto(`${BASE}/account_reconciliation`);
      const panel = page.locator('[data-reconciliation-target="diagnosticPanel"]');
      await expect(panel).toBeHidden();
    });

    test('Release notes mention CM-5 diagnostic', async ({ page }) => {
      await page.goto(`${BASE}/documentation/release-notes`);
      await expect(page.locator('body')).toContainText('Diagnostic Assistant');
      await expect(page.locator('body')).toContainText('CM-5');
    });

    test('Diagnostic assistant heading in panel', async ({ page }) => {
      await page.goto(`${BASE}/account_reconciliation`);
      await expect(page.locator('text=Reconciliation Diagnostic Assistant')).toBeAttached();
    });
  });
}
