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

test.describe('BugStopper: PUT /api/theme endpoint', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    await api(page, 'PUT', '/api/theme', { accent_theme_key: 'purple' });
    await ctx.close();
  });

  test('valid theme "navy" returns 200 with correct key', async ({ page }) => {
    const res = await api(page, 'PUT', '/api/theme', { accent_theme_key: 'navy' });
    expect(res.status).toBe(200);
    expect(res.json.accent_theme_key).toBe('navy');
  });

  test('empty string returns 422', async ({ page }) => {
    const res = await api(page, 'PUT', '/api/theme', { accent_theme_key: '' });
    expect(res.status).toBe(422);
    expect(res.json.error).toBeTruthy();
  });

  test('null value returns 422', async ({ page }) => {
    const res = await api(page, 'PUT', '/api/theme', { accent_theme_key: null });
    expect(res.status).toBe(422);
    expect(res.json.error).toBeTruthy();
  });

  test('very long string (10000 chars) returns 422', async ({ page }) => {
    const longStr = 'x'.repeat(10000);
    const res = await api(page, 'PUT', '/api/theme', { accent_theme_key: longStr });
    expect(res.status).toBe(422);
    expect(res.json.error).toBeTruthy();
  });

  test('XSS payload returns 422', async ({ page }) => {
    const res = await api(page, 'PUT', '/api/theme', { accent_theme_key: '<script>alert(1)</script>' });
    expect(res.status).toBe(422);
    expect(res.json.error).toBeTruthy();
  });

  test('SQL injection string returns 422', async ({ page }) => {
    const res = await api(page, 'PUT', '/api/theme', { accent_theme_key: "'; DROP TABLE users; --" });
    expect(res.status).toBe(422);
    expect(res.json.error).toBeTruthy();
  });
});
