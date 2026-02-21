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

/** Get the first account_id from the user's accounts, or fail fast. */
async function getAccountId(page) {
  const res = await api(page, 'GET', '/api/accounts');
  expect(res.status).toBe(200);
  const accounts = Array.isArray(res.json) ? res.json : res.json?.accounts ?? res.json?.data;
  expect(accounts.length).toBeGreaterThan(0);
  return accounts[0].id;
}

/** Create a bucket and return the full response (status + json). */
async function createBucket(page, accountId, overrides = {}) {
  const payload = {
    bucket: {
      name: `Test Bucket ${Date.now()}`,
      account_id: accountId,
      current_balance: 0,
      target_amount: 100,
      is_active: true,
      ...overrides,
    },
  };
  return api(page, 'POST', '/api/buckets', payload);
}

/**
 * Create two buckets on the given account.
 * The first bucket auto-becomes default; the second is non-default.
 * Returns { defaultBucket, secondBucket }.
 */
async function createTwoBuckets(page, accountId) {
  const ts = Date.now();
  const r1 = await createBucket(page, accountId, { name: `Default ${ts}`, current_balance: 100 });
  expect(r1.status).toBe(201);
  const r2 = await createBucket(page, accountId, { name: `Second ${ts}`, current_balance: 50 });
  expect(r2.status).toBe(201);
  return { defaultBucket: r1.json, secondBucket: r2.json };
}

test.describe('BugStopper — Buckets', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ── 1. Create bucket with missing name → 422 ───────────────────────
  test('1. Create bucket with missing name returns 422', async ({ page }) => {
    const accountId = await getAccountId(page);
    const res = await createBucket(page, accountId, { name: '' });
    expect(res.status).toBe(422);
  });

  // ── 2. Create bucket with name > 80 chars → 422 ────────────────────
  test('2. Create bucket with name over 80 characters returns 422', async ({ page }) => {
    const accountId = await getAccountId(page);
    const longName = 'A'.repeat(81);
    const res = await createBucket(page, accountId, { name: longName });
    expect(res.status).toBe(422);
  });

  // ── 3. Create bucket with negative current_balance → 422 ───────────
  test('3. Create bucket with negative current_balance returns 422', async ({ page }) => {
    const accountId = await getAccountId(page);
    const res = await createBucket(page, accountId, { current_balance: -10 });
    expect(res.status).toBe(422);
  });

  // ── 4. Create bucket with duplicate name on same account → 422 ─────
  test('4. Create bucket with duplicate name on same account returns 422', async ({ page }) => {
    const accountId = await getAccountId(page);
    const dupName = `Dup Bucket ${Date.now()}`;
    const first = await createBucket(page, accountId, { name: dupName });
    expect(first.status).toBe(201);

    const second = await createBucket(page, accountId, { name: dupName });
    expect(second.status).toBe(422);
  });

  // ── 5. Create bucket OK → 201 with id in JSON ──────────────────────
  test('5. Create bucket returns 201 with id in response', async ({ page }) => {
    const accountId = await getAccountId(page);
    const res = await createBucket(page, accountId, { name: `OK Bucket ${Date.now()}` });
    expect(res.status).toBe(201);
    expect(res.json).toBeTruthy();
    expect(res.json.id).toBeDefined();
    expect(typeof res.json.id).toBe('number');
  });

  // ── 6. Create bucket with nonexistent account_id → 422 ─────────────
  test('6. Create bucket with nonexistent account_id returns 422', async ({ page }) => {
    const res = await createBucket(page, 999999, { name: `Ghost Acct ${Date.now()}` });
    expect(res.status).toBe(422);
  });

  // ── 7. Delete default bucket → 422 ─────────────────────────────────
  test('7. Delete default bucket returns 422', async ({ page }) => {
    const accountId = await getAccountId(page);
    // Ensure at least one bucket exists (which will be default)
    await createTwoBuckets(page, accountId);
    // Find the actual default bucket for this account
    const listRes = await api(page, 'GET', `/api/buckets?account_id=${accountId}`);
    const buckets = Array.isArray(listRes.json) ? listRes.json : [];
    const actualDefault = buckets.find(b => b.is_default === true);
    expect(actualDefault).toBeTruthy();
    const res = await api(page, 'DELETE', `/api/buckets/${actualDefault.id}`);
    expect(res.status).toBe(422);
  });

  // ── 8. Delete non-default bucket with positive balance → 204 ───────
  test('8. Delete non-default bucket with positive balance returns 204', async ({ page }) => {
    const accountId = await getAccountId(page);
    const { defaultBucket, secondBucket } = await createTwoBuckets(page, accountId);
    // Determine which is actually default vs non-default
    const listRes = await api(page, 'GET', `/api/buckets?account_id=${accountId}`);
    const buckets = Array.isArray(listRes.json) ? listRes.json : [];
    const created = buckets.filter(b => b.id === defaultBucket.id || b.id === secondBucket.id);
    const nonDefault = created.find(b => !b.is_default && Number(b.current_balance) > 0);
    if (nonDefault) {
      const res = await api(page, 'DELETE', `/api/buckets/${nonDefault.id}`);
      expect(res.status).toBe(204);
    } else {
      // If neither is non-default with balance, just verify delete of a fresh non-default
      const ts = Date.now();
      const fresh = await createBucket(page, accountId, { name: `DelTest ${ts}`, current_balance: 25 });
      expect(fresh.status).toBe(201);
      expect(fresh.json.is_default).toBeFalsy();
      const res = await api(page, 'DELETE', `/api/buckets/${fresh.json.id}`);
      expect(res.status).toBe(204);
    }
  });

  // ── 9. Delete non-default bucket with zero balance → 204 ───────────
  test('9. Delete non-default bucket with zero balance returns 204', async ({ page }) => {
    const accountId = await getAccountId(page);
    const ts = Date.now();
    // Create default bucket first
    const r1 = await createBucket(page, accountId, { name: `DefZero ${ts}`, current_balance: 0 });
    expect(r1.status).toBe(201);
    // Create second (non-default) bucket with zero balance
    const r2 = await createBucket(page, accountId, { name: `SecZero ${ts}`, current_balance: 0 });
    expect(r2.status).toBe(201);

    const res = await api(page, 'DELETE', `/api/buckets/${r2.json.id}`);
    expect(res.status).toBe(204);
  });

  // ── 10. Fund with amount=0 → 422 ───────────────────────────────────
  test('10. Fund with amount 0 returns 422', async ({ page }) => {
    const accountId = await getAccountId(page);
    const { defaultBucket, secondBucket } = await createTwoBuckets(page, accountId);
    const res = await api(page, 'POST', `/api/buckets/${secondBucket.id}/fund`, {
      from_bucket_id: defaultBucket.id,
      amount: 0,
    });
    expect(res.status).toBe(422);
  });

  // ── 11. Fund with negative amount → 422 ────────────────────────────
  test('11. Fund with negative amount returns 422', async ({ page }) => {
    const accountId = await getAccountId(page);
    const { defaultBucket, secondBucket } = await createTwoBuckets(page, accountId);
    const res = await api(page, 'POST', `/api/buckets/${secondBucket.id}/fund`, {
      from_bucket_id: defaultBucket.id,
      amount: -25,
    });
    expect(res.status).toBe(422);
  });

  // ── 12. Fund with amount > source balance → 422 ────────────────────
  test('12. Fund with amount exceeding source balance returns 422', async ({ page }) => {
    const accountId = await getAccountId(page);
    const { defaultBucket, secondBucket } = await createTwoBuckets(page, accountId);
    // defaultBucket has current_balance 100, try to transfer 999
    const res = await api(page, 'POST', `/api/buckets/${secondBucket.id}/fund`, {
      from_bucket_id: defaultBucket.id,
      amount: 999,
    });
    expect(res.status).toBe(422);
    // Check for "Insufficient balance" message in the error response
    const body = JSON.stringify(res.json);
    expect(body.toLowerCase()).toContain('insufficient');
  });

  // ── 13. Fund bucket to itself → 422 ────────────────────────────────
  test('13. Fund bucket to itself returns 422', async ({ page }) => {
    const accountId = await getAccountId(page);
    const { defaultBucket } = await createTwoBuckets(page, accountId);
    const res = await api(page, 'POST', `/api/buckets/${defaultBucket.id}/fund`, {
      from_bucket_id: defaultBucket.id,
      amount: 10,
    });
    expect(res.status).toBe(422);
  });

  // ── 14. Fund valid → 200 and balances change ───────────────────────
  test('14. Valid fund returns 200 and updates balances', async ({ page }) => {
    const accountId = await getAccountId(page);
    const { defaultBucket, secondBucket } = await createTwoBuckets(page, accountId);

    // Record starting balances
    const beforeDefault = Number(defaultBucket.current_balance);
    const beforeSecond = Number(secondBucket.current_balance);
    const transferAmount = 30;

    // Transfer 30 from default → second
    const res = await api(page, 'POST', `/api/buckets/${secondBucket.id}/fund`, {
      from_bucket_id: defaultBucket.id,
      amount: transferAmount,
    });
    expect(res.status).toBe(200);

    // Verify balances via GET
    const listRes = await api(page, 'GET', `/api/buckets?account_id=${accountId}`);
    expect(listRes.status).toBe(200);

    const buckets = Array.isArray(listRes.json) ? listRes.json : [];
    const updatedDefault = buckets.find(b => b.id === defaultBucket.id);
    const updatedSecond = buckets.find(b => b.id === secondBucket.id);

    // Verify relative changes: default lost 30, second gained 30
    expect(Number(updatedDefault.current_balance)).toBe(beforeDefault - transferAmount);
    expect(Number(updatedSecond.current_balance)).toBe(beforeSecond + transferAmount);
  });
});
