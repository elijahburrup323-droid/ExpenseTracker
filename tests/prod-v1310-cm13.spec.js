// Post-deploy verification for v1.3.10 — CM-013 Spending Limits
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
  } catch (e) { /* no overlay */ }
}

for (const acct of ACCOUNTS) {
  test.describe(`Account: ${acct.email}`, () => {
    test('Version check — v1.3.10', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      const footer = page.locator('p:has-text("v1.3.10")');
      await expect(footer).toBeVisible({ timeout: 10000 });
    });

    test('Spending Types page loads with Monthly Limit % column', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/spending_types`);
      await page.waitForLoadState('networkidle');

      // Check the column header exists
      const header = page.locator('th:has-text("Monthly Limit %")');
      await expect(header).toBeVisible({ timeout: 10000 });

      // Table should have rows (Set button or data)
      const tableBody = page.locator('[data-spending-types-target="tableBody"]');
      await expect(tableBody).toBeVisible({ timeout: 10000 });
    });

    test('Spending Categories page loads with Monthly Limit column', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.goto(`${BASE}/spending_categories`);
      await page.waitForLoadState('networkidle');

      // Check the column header exists
      const header = page.locator('th:has-text("Monthly Limit")');
      await expect(header).toBeVisible({ timeout: 10000 });

      // Table should have rows
      const tableBody = page.locator('[data-spending-categories-target="tableBody"]');
      await expect(tableBody).toBeVisible({ timeout: 10000 });
    });

    test('Spending Limits API — GET returns JSON', async ({ page }) => {
      await login(page, acct.email, acct.pass);

      const res = await page.evaluate(async (base) => {
        const r = await fetch(`${base}/api/spending_limits?scope_type=CATEGORY&yyyymm=202602`, {
          headers: { 'Accept': 'application/json' }
        });
        return { status: r.status, ok: r.ok };
      }, BASE);

      expect(res.status).toBe(200);
      expect(res.ok).toBe(true);
    });

    test('Spending Limits API — POST creates a limit', async ({ page }) => {
      await login(page, acct.email, acct.pass);

      // Get CSRF token
      const csrf = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.content : '';
      });

      // First get a category to use
      const categories = await page.evaluate(async (base) => {
        const r = await fetch(`${base}/api/spending_categories`, {
          headers: { 'Accept': 'application/json' }
        });
        return r.ok ? await r.json() : [];
      }, BASE);

      if (categories.length > 0) {
        const catId = categories[0].id;

        // Create a limit
        const createRes = await page.evaluate(async ({ base, csrf, catId }) => {
          const r = await fetch(`${base}/api/spending_limits`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-CSRF-Token': csrf
            },
            body: JSON.stringify({ spending_limit: {
              scope_type: 'CATEGORY',
              scope_id: catId,
              limit_value: 999.99
            }})
          });
          return { status: r.status, ok: r.ok, body: await r.json() };
        }, { base: BASE, csrf, catId });

        expect(createRes.ok).toBe(true);
        expect(createRes.body.success).toBe(true);

        // Verify the limit was created by fetching limits
        const yyyymm = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);
        const fetchRes = await page.evaluate(async ({ base, yyyymm }) => {
          const r = await fetch(`${base}/api/spending_limits?scope_type=CATEGORY&yyyymm=${yyyymm}`, {
            headers: { 'Accept': 'application/json' }
          });
          return r.ok ? await r.json() : {};
        }, { base: BASE, yyyymm });

        // The limit should exist for our category
        const limitEntry = fetchRes[String(catId)];
        expect(limitEntry).toBeDefined();
        expect(limitEntry.limit_value).toBe(999.99);

        // Clean up — delete the limit
        if (limitEntry && limitEntry.id) {
          await page.evaluate(async ({ base, csrf, id }) => {
            await fetch(`${base}/api/spending_limits/${id}`, {
              method: 'DELETE',
              headers: {
                'X-CSRF-Token': csrf,
                'Accept': 'application/json'
              }
            });
          }, { base: BASE, csrf, id: limitEntry.id });
        }
      }
    });

    test('Dashboard loads without JS errors', async ({ page }) => {
      const jsErrors = [];
      page.on('pageerror', (err) => jsErrors.push(err.message));

      await login(page, acct.email, acct.pass);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      expect(jsErrors).toEqual([]);
    });

    test('Dashboard Spending Overview flip card works', async ({ page }) => {
      await login(page, acct.email, acct.pass);
      await page.waitForLoadState('networkidle');

      // Find the spending overview card — look for "Spent" or "spent this month"
      const spentText = page.locator('text=spent this month').first();
      await expect(spentText).toBeVisible({ timeout: 10000 });

      // Find flip button and click it
      const flipBtn = page.locator('[data-action*="flip"]').first();
      if (await flipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await flipBtn.click({ force: true });
        await page.waitForTimeout(800);

        // Verify the back content shows categories
        const byCategory = page.locator('text=By Category');
        await expect(byCategory).toBeVisible({ timeout: 5000 });
      }
    });
  });
}
