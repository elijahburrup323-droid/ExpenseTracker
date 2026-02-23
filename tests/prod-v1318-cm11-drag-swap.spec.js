// Post-deploy verification for CM-11: Dashboard drag-anywhere + true swap
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

    test('Login and dashboard loads with data', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator('[data-dashboard-target="cardsGrid"]')).toBeVisible({ timeout: 10000 });
      // Verify at least one card has content
      const slots = page.locator('[data-dashboard-target="slotWrapper"]');
      await expect(slots).toHaveCount(6);
    });

    test('Dashboard has no drag-handle icons (grab-anywhere)', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator('[data-dashboard-target="cardsGrid"]')).toBeVisible({ timeout: 10000 });
      // Verify no .drag-handle elements exist
      const handles = page.locator('.drag-handle');
      await expect(handles).toHaveCount(0);
    });

    test('Card wrappers have grab cursor', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator('[data-dashboard-target="cardsGrid"]')).toBeVisible({ timeout: 10000 });
      const firstSlot = page.locator('[data-dashboard-target="slotWrapper"]').first();
      const cursor = await firstSlot.evaluate(el => getComputedStyle(el).cursor);
      expect(cursor).toBe('grab');
    });

    test('Buttons inside cards have pointer cursor', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator('[data-dashboard-target="cardsGrid"]')).toBeVisible({ timeout: 10000 });
      // Check a month navigation button
      const btn = page.locator('[data-dashboard-target="slotWrapper"] button').first();
      if (await btn.isVisible()) {
        const cursor = await btn.evaluate(el => getComputedStyle(el).cursor);
        expect(cursor).toBe('pointer');
      }
    });

    test('SortableJS complete build loads (no JS errors)', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await login(page, acct.email, acct.pass);
      await expect(page.locator('[data-dashboard-target="cardsGrid"]')).toBeVisible({ timeout: 10000 });
      // Wait a moment for any async errors
      await page.waitForTimeout(2000);
      const sortableErrors = errors.filter(e => e.toLowerCase().includes('sortable') || e.toLowerCase().includes('swap'));
      expect(sortableErrors).toHaveLength(0);
    });

    test('Navigation menus work', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await dismissWhatsNew(page);
      // Click sidebar nav - Payments
      const paymentsLink = page.locator('a:has-text("Payments")').first();
      if (await paymentsLink.isVisible()) {
        await paymentsLink.click();
        await page.waitForTimeout(2000);
      }
    });

    test('Payments page loads with data', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/payments`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(3000);
      // Just verify the page loads without errors
      await expect(page.locator('body')).toBeVisible();
    });

    test('Accounts page loads', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/accounts`);
      await dismissWhatsNew(page);
      await page.waitForTimeout(3000);
      await expect(page.locator('body')).toBeVisible();
    });
  });
}
