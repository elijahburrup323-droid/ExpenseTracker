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

// Track tag IDs created during tests for cleanup
const createdTagIds = [];

test.describe('BugStopper: Tag API CRUD boundary conditions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterAll(async ({ browser }) => {
    // Clean up all tags created during tests
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    for (const tagId of createdTagIds) {
      await api(page, 'DELETE', `/api/tags/${tagId}`);
    }
    await ctx.close();
  });

  test('create tag with empty name returns 422', async ({ page }) => {
    const res = await api(page, 'POST', '/api/tags', { tag: { name: '', color_key: 'blue' } });
    expect(res.status).toBe(422);
    expect(res.json.errors).toBeTruthy();
  });

  test('create tag with name > 80 chars returns 422', async ({ page }) => {
    const longName = 'A'.repeat(81);
    const res = await api(page, 'POST', '/api/tags', { tag: { name: longName, color_key: 'blue' } });
    expect(res.status).toBe(422);
    expect(res.json.errors).toBeTruthy();
  });

  test('create tag with XSS name stores exact string', async ({ page }) => {
    const xssName = '<script>alert("xss")</script>';
    const res = await api(page, 'POST', '/api/tags', { tag: { name: xssName, color_key: 'blue' } });
    expect(res.status).toBe(201);
    expect(res.json.name).toBe(xssName);
    if (res.json.id) createdTagIds.push(res.json.id);
  });

  test('create duplicate tag name (case insensitive) returns 422', async ({ page }) => {
    // Create the first tag
    const res1 = await api(page, 'POST', '/api/tags', { tag: { name: 'BugStopperDupe', color_key: 'green' } });
    expect(res1.status).toBe(201);
    if (res1.json.id) createdTagIds.push(res1.json.id);

    // Attempt duplicate with different case
    const res2 = await api(page, 'POST', '/api/tags', { tag: { name: 'bugstopperdupe', color_key: 'red' } });
    expect(res2.status).toBe(422);
    expect(res2.json.errors).toBeTruthy();
  });

  test('delete tag returns 204', async ({ page }) => {
    // Create a tag to delete
    const createRes = await api(page, 'POST', '/api/tags', { tag: { name: 'BugStopperDelete', color_key: 'orange' } });
    expect(createRes.status).toBe(201);
    const tagId = createRes.json.id;

    const deleteRes = await api(page, 'DELETE', `/api/tags/${tagId}`);
    expect(deleteRes.status).toBe(204);
    // No need to track for cleanup since it is already deleted
  });

  test('after delete, GET /api/tags does not include deleted tag', async ({ page }) => {
    // Create a tag then delete it
    const createRes = await api(page, 'POST', '/api/tags', { tag: { name: 'BugStopperGone', color_key: 'purple' } });
    expect(createRes.status).toBe(201);
    const tagId = createRes.json.id;

    await api(page, 'DELETE', `/api/tags/${tagId}`);

    // Verify it is not in the list
    const listRes = await api(page, 'GET', '/api/tags');
    expect(listRes.status).toBe(200);
    const found = listRes.json.find(t => t.id === tagId);
    expect(found).toBeUndefined();
  });

  test('create tag with valid name returns 201 with id/name/color_key', async ({ page }) => {
    const res = await api(page, 'POST', '/api/tags', { tag: { name: 'BugStopperValid', color_key: 'teal' } });
    expect(res.status).toBe(201);
    expect(res.json.id).toBeTruthy();
    expect(res.json.name).toBe('BugStopperValid');
    expect(res.json.color_key).toBe('teal');
    if (res.json.id) createdTagIds.push(res.json.id);
  });

  test('update tag name returns 200', async ({ page }) => {
    // Create a tag to update
    const createRes = await api(page, 'POST', '/api/tags', { tag: { name: 'BugStopperOld', color_key: 'blue' } });
    expect(createRes.status).toBe(201);
    const tagId = createRes.json.id;
    if (tagId) createdTagIds.push(tagId);

    // Update name
    const updateRes = await api(page, 'PUT', `/api/tags/${tagId}`, { tag: { name: 'BugStopperNew' } });
    expect(updateRes.status).toBe(200);
    expect(updateRes.json.name).toBe('BugStopperNew');
  });
});
