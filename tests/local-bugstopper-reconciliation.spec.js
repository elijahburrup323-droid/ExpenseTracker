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

test.describe('BugStopper: Reconciliation API', () => {
  let validAccountId;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page);

    // Fetch a valid account ID for tests that need one
    const acctRes = await api(page, 'GET', '/api/accounts');
    expect(acctRes.status).toBe(200);
    expect(acctRes.json.length).toBeGreaterThan(0);
    validAccountId = acctRes.json[0].id;

    await page.close();
  });

  test('1. GET /api/reconciliation/data with valid account_id returns reconciliation data', async ({ page }) => {
    await login(page);
    const res = await api(page, 'GET', `/api/reconciliation/data?account_id=${validAccountId}`);
    expect(res.status).toBe(200);
    expect(res.json.account).toBeDefined();
    expect(res.json.account.id).toBe(validAccountId);
    expect(res.json.account.name).toBeDefined();
    expect(res.json.budget_balance).toBeDefined();
    expect(res.json.payments).toBeInstanceOf(Array);
    expect(res.json.deposits).toBeInstanceOf(Array);
    expect(res.json.transfers).toBeInstanceOf(Array);
    expect(res.json.adjustments).toBeInstanceOf(Array);
    expect(res.json.unreconciled).toBeDefined();
    expect(res.json.totals).toBeDefined();
    expect(res.json.month_label).toBeDefined();
    expect(typeof res.json.year).toBe('number');
    expect(typeof res.json.month).toBe('number');
    expect(res.json.is_read_only).toBe(false);
  });

  test('2. GET /api/reconciliation/data with invalid account_id=999999 returns 404', async ({ page }) => {
    await login(page);
    const res = await api(page, 'GET', '/api/reconciliation/data?account_id=999999');
    expect(res.status).toBe(404);
    expect(res.json.error).toBe('Not found');
  });

  test('3. PATCH /api/reconciliation/toggle with invalid type "garbage" returns 404', async ({ page }) => {
    await login(page);
    const res = await api(page, 'PATCH', '/api/reconciliation/toggle', {
      type: 'garbage',
      id: 1,
      reconciled: true,
    });
    // The controller case statement returns nil for unknown type, then render_not_found
    expect(res.status).toBe(404);
    expect(res.json.error).toBe('Not found');
  });

  test('4. PATCH /api/reconciliation/toggle with non-existent id=999999 returns 404', async ({ page }) => {
    await login(page);
    const res = await api(page, 'PATCH', '/api/reconciliation/toggle', {
      type: 'payment',
      id: 999999,
      reconciled: true,
    });
    expect(res.status).toBe(404);
    expect(res.json.error).toBe('Not found');
  });

  test('5. GET /api/reconciliation/diagnostics without account_id returns 404', async ({ page }) => {
    await login(page);
    const res = await api(page, 'GET', '/api/reconciliation/diagnostics');
    // Controller does find_by(id: nil) which returns nil, then render_not_found
    expect(res.status).toBe(404);
    expect(res.json.error).toBe('Not found');
  });

  test('6. GET /api/reconciliation/diagnostics with valid account returns 200', async ({ page }) => {
    await login(page);
    const res = await api(page, 'GET', `/api/reconciliation/diagnostics?account_id=${validAccountId}`);
    expect(res.status).toBe(200);
    // Diagnostics returns an object with count_issues, amount_issues, cross_account arrays
    expect(res.json.count_issues).toBeInstanceOf(Array);
    expect(res.json.amount_issues).toBeInstanceOf(Array);
    expect(res.json.cross_account).toBeInstanceOf(Array);
  });
});
