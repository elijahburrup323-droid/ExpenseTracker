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

// Helper: fetch WITHOUT CSRF token (for CSRF protection tests)
async function apiNoCsrf(page, method, path, body = null) {
  return page.evaluate(async ({ base, method, path, body }) => {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${base}${path}`, opts);
    let json;
    try { json = await res.json(); } catch { json = null; }
    return { status: res.status, json };
  }, { base: BASE, method, path, body });
}

// Track IDs for cleanup
const createdTagIds = [];

test.describe('BugStopper: Security and edge-case tests', () => {

  test.afterAll(async ({ browser }) => {
    if (createdTagIds.length === 0) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    for (const tagId of createdTagIds) {
      await api(page, 'DELETE', `/api/tags/${tagId}`);
    }
    await ctx.close();
  });

  // --- Unauthenticated access tests (tests 1-2) ---

  test('access /api/buckets without login should not return 200', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    // Navigate to a page first so we can use fetch from the right origin
    await page.goto(`${BASE}/users/sign_in`);

    const res = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/buckets`, {
        headers: { 'Accept': 'application/json' },
        redirect: 'manual',
      });
      return { status: r.status, type: r.type, redirected: r.redirected };
    }, BASE);

    // Should be a redirect (302 -> opaqueredirect with manual) or 401, NOT 200
    expect(res.status).not.toBe(200);
    await ctx.close();
  });

  test('access /api/tags without login should not return 200', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/users/sign_in`);

    const res = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/tags`, {
        headers: { 'Accept': 'application/json' },
        redirect: 'manual',
      });
      return { status: r.status, type: r.type, redirected: r.redirected };
    }, BASE);

    expect(res.status).not.toBe(200);
    await ctx.close();
  });

  // --- CSRF protection test (test 3) ---

  test('PUT /api/theme without CSRF token should fail', async ({ page }) => {
    await login(page);
    const res = await apiNoCsrf(page, 'PUT', '/api/theme', { accent_theme_key: 'navy' });
    // Rails CSRF protection should reject: 422 or 403
    expect([422, 403]).toContain(res.status);
  });

  // --- Non-existent resource tests (tests 4-5) ---

  test('DELETE /api/buckets/999999 (non-existent) returns 404', async ({ page }) => {
    await login(page);
    const res = await api(page, 'DELETE', '/api/buckets/999999');
    expect(res.status).toBe(404);
  });

  test('DELETE /api/tags/999999 (non-existent) returns 404', async ({ page }) => {
    await login(page);
    const res = await api(page, 'DELETE', '/api/tags/999999');
    expect(res.status).toBe(404);
    expect(res.json.error).toBeTruthy();
  });

  // --- SQL injection in tag name (test 6) ---

  test('SQL injection in tag name does not crash server', async ({ page }) => {
    await login(page);
    const sqlPayload = "'; DROP TABLE tags; --";
    const res = await api(page, 'POST', '/api/tags', { tag: { name: sqlPayload, color_key: 'blue' } });
    // Should either save safely (201) or reject via validation (422), NOT crash (500)
    expect([201, 422]).toContain(res.status);
    if (res.status === 201 && res.json?.id) {
      createdTagIds.push(res.json.id);
    }
  });

  // --- Payment description length validation (test 7) ---

  test('create payment with description > 255 chars returns 422', async ({ page }) => {
    await login(page);

    // First, get a valid account_id and spending_category_id
    const accountsRes = await api(page, 'GET', '/api/accounts');
    expect(accountsRes.status).toBe(200);
    expect(accountsRes.json.length).toBeGreaterThan(0);
    const accountId = accountsRes.json[0].id;

    const categoriesRes = await api(page, 'GET', '/api/spending_categories');
    expect(categoriesRes.status).toBe(200);
    expect(categoriesRes.json.length).toBeGreaterThan(0);
    const categoryId = categoriesRes.json[0].id;

    const longDescription = 'A'.repeat(300);
    const res = await api(page, 'POST', '/api/payments', {
      payment: {
        description: longDescription,
        amount: 10,
        payment_date: '2026-02-20',
        account_id: accountId,
        spending_category_id: categoryId,
      },
    });
    expect(res.status).toBe(422);
    expect(res.json.errors).toBeTruthy();
  });

  // --- Verify JSON responses are proper JSON, not raw HTML (test 8) ---

  test('API responses are proper JSON, not raw HTML', async ({ page }) => {
    await login(page);

    // Fetch tags list and verify it is valid JSON with correct structure
    const res = await page.evaluate(async (base) => {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
      const r = await fetch(`${base}/api/tags`, {
        headers: {
          'Accept': 'application/json',
          'X-CSRF-Token': csrf,
        },
      });
      const contentType = r.headers.get('content-type');
      const text = await r.text();
      let isValidJson = false;
      let parsed = null;
      try {
        parsed = JSON.parse(text);
        isValidJson = true;
      } catch {
        isValidJson = false;
      }
      return {
        status: r.status,
        contentType,
        isValidJson,
        startsWithHtml: text.trimStart().startsWith('<'),
        parsed,
      };
    }, BASE);

    expect(res.status).toBe(200);
    expect(res.contentType).toContain('application/json');
    expect(res.isValidJson).toBe(true);
    expect(res.startsWithHtml).toBe(false);
    expect(Array.isArray(res.parsed)).toBe(true);
  });
});
