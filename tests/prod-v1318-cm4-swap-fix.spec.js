// Post-deploy verification for CM-4: Dashboard Card Swap Bug Fix
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

    test('Dashboard loads with cards grid', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await expect(page.locator('[data-dashboard-target="cardsGrid"]')).toBeVisible({ timeout: 10000 });
      // Verify all slot wrappers present
      const slots = page.locator('[data-dashboard-target="slotWrapper"]');
      const count = await slots.count();
      expect(count).toBeGreaterThanOrEqual(3);
      console.log(`  ${acct.email}: ${count} dashboard cards visible`);
    });

    test('No dashboard-swap-highlight class on any card at rest', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.waitForTimeout(2000);
      const highlighted = await page.locator('.dashboard-swap-highlight').count();
      expect(highlighted).toBe(0);
    });

    test('No sortable-drag class on any card at rest', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.waitForTimeout(2000);
      const dragging = await page.locator('.sortable-drag').count();
      expect(dragging).toBe(0);
    });

    test('Swap highlight CSS has no opacity property', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      // Check computed styles by temporarily adding the class
      const hasOpacity = await page.evaluate(() => {
        const el = document.querySelector('[data-dashboard-target="slotWrapper"]');
        if (!el) return null;
        el.classList.add('dashboard-swap-highlight');
        const style = getComputedStyle(el);
        const opacity = style.opacity;
        el.classList.remove('dashboard-swap-highlight');
        return opacity;
      });
      // Opacity should be 1 (default) — no explicit opacity set
      expect(hasOpacity).toBe('1');
    });

    test('Sortable drag CSS has no transform property', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const transform = await page.evaluate(() => {
        const el = document.querySelector('[data-dashboard-target="slotWrapper"]');
        if (!el) return null;
        el.classList.add('sortable-drag');
        const style = getComputedStyle(el);
        const t = style.transform;
        el.classList.remove('sortable-drag');
        return t;
      });
      // transform should be 'none' — no explicit transform set
      expect(transform).toBe('none');
    });

    test('Slot wrappers have grab cursor', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const cursor = await page.evaluate(() => {
        const el = document.querySelector('[data-dashboard-target="slotWrapper"]');
        return el ? getComputedStyle(el).cursor : null;
      });
      expect(cursor).toBe('grab');
    });

    test('No inline z-index or transform on slot wrappers', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.waitForTimeout(2000);
      const issues = await page.evaluate(() => {
        const wrappers = document.querySelectorAll('[data-dashboard-target="slotWrapper"]');
        const problems = [];
        wrappers.forEach((el, i) => {
          if (el.style.zIndex) problems.push(`slot ${i}: z-index=${el.style.zIndex}`);
          // Only flag inline transform on slotWrapper, not on inner flipper
          if (el.style.transform) problems.push(`slot ${i}: transform=${el.style.transform}`);
        });
        return problems;
      });
      expect(issues).toHaveLength(0);
    });

    test('Cards API returns valid data (regression)', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const data = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/dashboard/card_data`);
        return res.json();
      }, BASE);
      expect(data).toHaveProperty('slots');
      expect(Array.isArray(data.slots)).toBe(true);
      expect(data.slots.length).toBeGreaterThanOrEqual(3);
      console.log(`  ${acct.email}: ${data.slots.length} card slots in API`);
    });

    test('No JS errors on dashboard', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await login(page, acct.email, acct.pass);
      await page.waitForTimeout(3000);
      expect(errors.filter(e => /dashboard|sortable|swap|drag/i.test(e))).toHaveLength(0);
    });
  });
}
