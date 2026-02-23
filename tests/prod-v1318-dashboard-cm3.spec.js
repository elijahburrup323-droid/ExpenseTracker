// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const accounts = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb' },
];

async function login(page, acct) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', acct.email);
  await page.fill('input[name="user[password]"]', acct.pass);
  await Promise.all([
    page.waitForURL(/dashboard/),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

for (const acct of accounts) {
  test.describe(`Dashboard CM-3 [${acct.email}]`, () => {
    test.beforeEach(async ({ page }) => {
      await login(page, acct);
    });

    test('1. Card wrappers have overflow-hidden class', async ({ page }) => {
      const cards = page.locator('[data-dashboard-target="slotWrapper"]');
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(3);

      for (let i = 0; i < count; i++) {
        const classes = await cards.nth(i).getAttribute('class');
        expect(classes).toContain('overflow-hidden');
      }
    });

    test('2. Grid has equal row heights on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${BASE}/dashboard`);
      await page.waitForSelector('[data-dashboard-target="cardsGrid"]');
      const grid = page.locator('[data-dashboard-target="cardsGrid"]');
      const classes = await grid.getAttribute('class');
      expect(classes).toContain('md:[grid-auto-rows:1fr]');
    });

    test('3. Cards in same row have equal height', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${BASE}/dashboard`);
      await page.waitForSelector('[data-dashboard-target="slotWrapper"]');
      await page.waitForTimeout(1000);

      const cards = page.locator('[data-dashboard-target="slotWrapper"]');
      const count = await cards.count();
      if (count >= 3) {
        const h0 = await cards.nth(0).boundingBox();
        const h1 = await cards.nth(1).boundingBox();
        const h2 = await cards.nth(2).boundingBox();
        expect(Math.abs(h0.height - h1.height)).toBeLessThanOrEqual(2);
        expect(Math.abs(h0.height - h2.height)).toBeLessThanOrEqual(2);
      }
    });

    test('4. Accounts overview pie legend has min-w-0', async ({ page }) => {
      const acctCard = page.locator('[data-card-type="accounts_overview"]');
      if (await acctCard.count() > 0) {
        const legendItems = acctCard.locator('[data-role="back"] .flex.items-center.text-xs');
        const legendCount = await legendItems.count();
        if (legendCount > 0) {
          const classes = await legendItems.first().getAttribute('class');
          expect(classes).toContain('min-w-0');
        }
      }
    });

    test('5. Screenshot for visual verification', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${BASE}/dashboard`);
      await page.waitForSelector('[data-dashboard-target="slotWrapper"]');
      await page.waitForTimeout(1500);

      const safeEmail = acct.email.replace(/[^a-z0-9]/gi, '_');
      await page.screenshot({
        path: `tests/screenshots/dashboard-cm3-${safeEmail}.png`,
        fullPage: false,
      });
    });
  });
}
