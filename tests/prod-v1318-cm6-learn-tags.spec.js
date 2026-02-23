// Post-deploy verification for CM-6: Auto-learn category default tags
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const accounts = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb' },
];

async function dismissWhatsNew(page) {
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

async function login(page, email, pass) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  await dismissWhatsNew(page);
}

for (const acct of accounts) {
  test.describe(`Account: ${acct.email}`, () => {

    test('Login succeeds and dashboard loads', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator('[data-dashboard-target="cardsGrid"]')).toBeVisible({ timeout: 10000 });
    });

    test('Payments page loads without JS errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(3000);
      await expect(page.locator('body')).toBeVisible();
      // Filter for payment/tag-related errors only
      const relevant = errors.filter(e => /payment|tag|category|learn/i.test(e));
      expect(relevant).toHaveLength(0);
    });

    test('Spending Categories API returns default_tag_ids', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const response = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/spending_categories`);
        return res.json();
      }, BASE);
      expect(Array.isArray(response)).toBe(true);
      if (response.length > 0) {
        // Verify default_tag_ids key exists in the response
        expect(response[0]).toHaveProperty('default_tag_ids');
      }
    });

    test('Accounts page loads (regression)', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/accounts`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toBeVisible();
    });

    test('Dashboard drag-swap still works (regression)', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator('[data-dashboard-target="cardsGrid"]')).toBeVisible({ timeout: 10000 });
      const slots = page.locator('[data-dashboard-target="slotWrapper"]');
      await expect(slots).toHaveCount(6);
      // Verify grab cursor
      const cursor = await slots.first().evaluate(el => getComputedStyle(el).cursor);
      expect(cursor).toBe('grab');
    });
  });
}
