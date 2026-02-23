// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        password: 'luckydjb'   },
];

for (const user of USERS) {
  test.describe(`Buckets CM-1 — ${user.email}`, () => {

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

    test('Buckets screen loads and shows table', async ({ page }) => {
      await page.goto(`${BASE}/buckets`);
      await expect(page.locator('h1:has-text("Buckets")')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });

    test('Buckets screen has Add Bucket button', async ({ page }) => {
      await page.goto(`${BASE}/buckets`);
      const addBtn = page.locator('button:has-text("Add Bucket")');
      await expect(addBtn).toBeVisible();
    });

    test('Buckets Add modal opens with fields', async ({ page }) => {
      await page.goto(`${BASE}/buckets`);
      await page.waitForTimeout(2000);  // Wait for JS controller to connect
      const addBtn = page.locator('button:has-text("Add Bucket")');
      await addBtn.click();
      // Modal should appear — check for account and name fields
      await expect(page.locator('[data-buckets-target="modalAccount"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-buckets-target="modalName"]')).toBeVisible();
    });

    test('Buckets API returns JSON', async ({ page }) => {
      await page.goto(`${BASE}/buckets`);
      const response = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/buckets`, { headers: { 'Accept': 'application/json' } });
        return { status: res.status, ok: res.ok };
      }, BASE);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    test('Payments modal has bucket toggle in DOM', async ({ page }) => {
      await page.goto(`${BASE}/payments`);
      await expect(page.locator('h1:has-text("Payments")')).toBeVisible();
      const addBtn = page.locator('button:has-text("Add Payment")');
      await addBtn.click();
      await expect(page.locator('[data-payments-target="modalBucketRow"]')).toBeAttached();
    });

    test('Transfers modal has bucket dropdowns in DOM', async ({ page }) => {
      await page.goto(`${BASE}/transfer_masters`);
      await expect(page.locator('h1:has-text("Account Transfers")')).toBeVisible();
      const addBtn = page.locator('button:has-text("Transfer")').first();
      await addBtn.click();
      await expect(page.locator('[data-transfer-masters-target="modalFromBucketRow"]')).toBeAttached();
      await expect(page.locator('[data-transfer-masters-target="modalToBucketRow"]')).toBeAttached();
    });

    test('Navbar has Buckets link', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      const bucketsLink = page.locator('a[href*="buckets"]');
      await expect(bucketsLink).toBeAttached();
    });

    test('Version shows CM-1 buckets in release notes', async ({ page }) => {
      await page.goto(`${BASE}/documentation/release-notes`);
      await expect(page.locator('body')).toContainText('Buckets');
      await expect(page.locator('body')).toContainText('allocation-required');
    });

    test('Bucket fund modal exists in DOM', async ({ page }) => {
      await page.goto(`${BASE}/buckets`);
      await expect(page.locator('[data-buckets-target="fundModal"]')).toBeAttached();
    });

    test('Buckets info box visible', async ({ page }) => {
      await page.goto(`${BASE}/buckets`);
      await expect(page.locator('text=Buckets let you earmark')).toBeVisible();
    });
  });
}
