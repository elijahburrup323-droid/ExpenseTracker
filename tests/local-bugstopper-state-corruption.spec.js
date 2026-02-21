// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000/expensetracker';
const EMAIL = 'test@example.com';
const PASS = 'password123';

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', EMAIL);
  await page.fill('input[name="user[password]"]', PASS);
  await Promise.all([
    page.waitForURL(/dashboard/),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
  await page.evaluate(() => document.getElementById('whatsNewOverlay')?.remove());
}

async function api(page, method, path, body = null) {
  return page.evaluate(async ({ base, method, path, body }) => {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-Token': csrf },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${base}${path}`, opts);
    let json;
    try { json = await res.json(); } catch { json = null; }
    return { status: res.status, json };
  }, { base: BASE, method, path, body });
}

test.describe('BugStopper: State Corruption & Edge Cases', () => {
  let accountId;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page);

    // Fetch a valid account ID for transfer tests
    const acctRes = await api(page, 'GET', '/api/accounts');
    expect(acctRes.status).toBe(200);
    expect(acctRes.json.length).toBeGreaterThan(0);
    accountId = acctRes.json[0].id;

    await page.close();
  });

  test('1. Create transfer to self (same from/to account) returns 422', async ({ page }) => {
    await login(page);
    const today = new Date().toISOString().slice(0, 10);
    const res = await api(page, 'POST', '/api/transfer_masters', {
      transfer_master: {
        from_account_id: accountId,
        to_account_id: accountId,
        amount: 100.00,
        transfer_date: today,
      },
    });
    expect(res.status).toBe(422);
    expect(res.json.errors).toBeDefined();
    expect(res.json.errors.some(e => e.toLowerCase().includes('different'))).toBeTruthy();
  });

  test('2. Create transfer with amount = 0 returns 422', async ({ page }) => {
    await login(page);

    // Need a second account for a valid from/to pair
    const acctRes = await api(page, 'GET', '/api/accounts');
    expect(acctRes.json.length).toBeGreaterThanOrEqual(2);
    const fromId = acctRes.json[0].id;
    const toId = acctRes.json[1].id;

    const today = new Date().toISOString().slice(0, 10);
    const res = await api(page, 'POST', '/api/transfer_masters', {
      transfer_master: {
        from_account_id: fromId,
        to_account_id: toId,
        amount: 0,
        transfer_date: today,
      },
    });
    expect(res.status).toBe(422);
    expect(res.json.errors).toBeDefined();
    expect(res.json.errors.some(e => e.toLowerCase().includes('amount'))).toBeTruthy();
  });

  test('3. Create transfer with negative amount returns 422', async ({ page }) => {
    await login(page);

    const acctRes = await api(page, 'GET', '/api/accounts');
    expect(acctRes.json.length).toBeGreaterThanOrEqual(2);
    const fromId = acctRes.json[0].id;
    const toId = acctRes.json[1].id;

    const today = new Date().toISOString().slice(0, 10);
    const res = await api(page, 'POST', '/api/transfer_masters', {
      transfer_master: {
        from_account_id: fromId,
        to_account_id: toId,
        amount: -50.00,
        transfer_date: today,
      },
    });
    expect(res.status).toBe(422);
    expect(res.json.errors).toBeDefined();
    expect(res.json.errors.some(e => e.toLowerCase().includes('amount'))).toBeTruthy();
  });

  test('4. GET /api/payments loads successfully (200 + is array)', async ({ page }) => {
    await login(page);
    const res = await api(page, 'GET', '/api/payments');
    expect(res.status).toBe(200);
    expect(res.json).toBeInstanceOf(Array);
  });

  test('5. GET /api/buckets loads successfully (200 + is array)', async ({ page }) => {
    await login(page);
    const res = await api(page, 'GET', '/api/buckets');
    expect(res.status).toBe(200);
    expect(res.json).toBeInstanceOf(Array);
  });

  test('6. GET /api/tags loads successfully (200 + is array)', async ({ page }) => {
    await login(page);
    const res = await api(page, 'GET', '/api/tags');
    expect(res.status).toBe(200);
    expect(res.json).toBeInstanceOf(Array);
  });

  test('7. Theme persists after page reload', async ({ page }) => {
    await login(page);

    // Set theme to teal
    const setRes = await api(page, 'PUT', '/api/theme', { accent_theme_key: 'teal' });
    expect(setRes.status).toBe(200);
    expect(setRes.json.accent_theme_key).toBe('teal');

    // Reload the page
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => document.getElementById('whatsNewOverlay')?.remove());

    // Verify theme is applied in the DOM
    const themeAttr = await page.locator('html').getAttribute('data-accent-theme');
    expect(themeAttr).toBe('teal');

    // Reset theme back to purple
    const resetRes = await api(page, 'PUT', '/api/theme', { accent_theme_key: 'purple' });
    expect(resetRes.status).toBe(200);
    expect(resetRes.json.accent_theme_key).toBe('purple');
  });

  test('8. GET /api/reports/soft_close_summary for current (unclosed) month returns exists=false', async ({ page }) => {
    await login(page);
    // No year/month params means the API defaults to the current open month
    const res = await api(page, 'GET', '/api/reports/soft_close_summary');
    expect(res.status).toBe(200);
    expect(res.json.exists).toBe(false);
    expect(res.json.message).toContain('No soft close snapshot');
  });
});
