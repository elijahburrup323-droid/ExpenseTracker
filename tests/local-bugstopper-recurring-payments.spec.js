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

test.describe('BugStopper: Payment Recurring API', () => {
  let accountId;
  let categoryId;
  let createdRecurringId;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page);

    // Fetch a valid account ID
    const acctRes = await api(page, 'GET', '/api/accounts');
    expect(acctRes.status).toBe(200);
    expect(acctRes.json.length).toBeGreaterThan(0);
    accountId = acctRes.json[0].id;

    // Fetch a valid spending category ID
    const catRes = await api(page, 'GET', '/api/spending_categories');
    expect(catRes.status).toBe(200);
    expect(catRes.json.length).toBeGreaterThan(0);
    categoryId = catRes.json[0].id;

    await page.close();
  });

  test('1. Create with missing name returns 422', async ({ page }) => {
    await login(page);
    const res = await api(page, 'POST', '/api/payment_recurrings', {
      payment_recurring: {
        amount: 50.00,
        account_id: accountId,
        spending_category_id: categoryId,
        frequency_master_id: 1,
        next_date: '2026-03-01',
        use_flag: true,
      },
    });
    expect(res.status).toBe(422);
    expect(res.json.errors).toBeDefined();
    expect(res.json.errors.some(e => e.toLowerCase().includes('name'))).toBeTruthy();
  });

  test('2. Create with missing amount returns 422', async ({ page }) => {
    await login(page);
    const res = await api(page, 'POST', '/api/payment_recurrings', {
      payment_recurring: {
        name: 'BugStopper Missing Amount',
        account_id: accountId,
        spending_category_id: categoryId,
        frequency_master_id: 1,
        next_date: '2026-03-01',
        use_flag: true,
      },
    });
    expect(res.status).toBe(422);
    expect(res.json.errors).toBeDefined();
    expect(res.json.errors.some(e => e.toLowerCase().includes('amount'))).toBeTruthy();
  });

  test('3. Create with negative amount returns 422', async ({ page }) => {
    await login(page);
    const res = await api(page, 'POST', '/api/payment_recurrings', {
      payment_recurring: {
        name: 'BugStopper Negative Amount',
        amount: -25.00,
        account_id: accountId,
        spending_category_id: categoryId,
        frequency_master_id: 1,
        next_date: '2026-03-01',
        use_flag: true,
      },
    });
    expect(res.status).toBe(422);
    expect(res.json.errors).toBeDefined();
    expect(res.json.errors.some(e => e.toLowerCase().includes('amount'))).toBeTruthy();
  });

  test('4. Create with amount = 0 returns 422', async ({ page }) => {
    await login(page);
    const res = await api(page, 'POST', '/api/payment_recurrings', {
      payment_recurring: {
        name: 'BugStopper Zero Amount',
        amount: 0,
        account_id: accountId,
        spending_category_id: categoryId,
        frequency_master_id: 1,
        next_date: '2026-03-01',
        use_flag: true,
      },
    });
    expect(res.status).toBe(422);
    expect(res.json.errors).toBeDefined();
    expect(res.json.errors.some(e => e.toLowerCase().includes('amount'))).toBeTruthy();
  });

  test('5. Create with invalid frequency_master_id (999999) returns 422', async ({ page }) => {
    await login(page);
    const res = await api(page, 'POST', '/api/payment_recurrings', {
      payment_recurring: {
        name: 'BugStopper Bad Frequency',
        amount: 10.00,
        account_id: accountId,
        spending_category_id: categoryId,
        frequency_master_id: 999999,
        next_date: '2026-03-01',
        use_flag: true,
      },
    });
    expect(res.status).toBe(422);
  });

  test('6. Create valid recurring returns 201 with correct JSON', async ({ page }) => {
    await login(page);
    const res = await api(page, 'POST', '/api/payment_recurrings', {
      payment_recurring: {
        name: 'BugStopper Valid Recurring',
        amount: 99.95,
        account_id: accountId,
        spending_category_id: categoryId,
        frequency_master_id: 1,
        next_date: '2026-03-15',
        use_flag: true,
        memo: 'Created by BugStopper test',
      },
    });
    expect(res.status).toBe(201);
    expect(res.json.id).toBeDefined();
    expect(res.json.name).toBe('BugStopper Valid Recurring');
    expect(parseFloat(res.json.amount)).toBeCloseTo(99.95, 2);
    expect(res.json.account_id).toBe(accountId);
    expect(res.json.spending_category_id).toBe(categoryId);
    expect(res.json.frequency_master_id).toBe(1);
    expect(res.json.use_flag).toBe(true);
    expect(res.json.memo).toBe('Created by BugStopper test');
    createdRecurringId = res.json.id;
  });

  test('7. Toggle use_flag off returns 200', async ({ page }) => {
    await login(page);

    // Create a recurring to toggle (in case test 6 didn't run or order is not guaranteed)
    const createRes = await api(page, 'POST', '/api/payment_recurrings', {
      payment_recurring: {
        name: 'BugStopper Toggle Test',
        amount: 25.00,
        account_id: accountId,
        spending_category_id: categoryId,
        frequency_master_id: 1,
        next_date: '2026-04-01',
        use_flag: true,
      },
    });
    expect(createRes.status).toBe(201);
    const id = createRes.json.id;

    // Toggle use_flag off
    const updateRes = await api(page, 'PUT', `/api/payment_recurrings/${id}`, {
      payment_recurring: { use_flag: false },
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.json.use_flag).toBe(false);

    // Cleanup: soft-delete
    await api(page, 'DELETE', `/api/payment_recurrings/${id}`);
  });

  test('8. Soft delete returns 204', async ({ page }) => {
    await login(page);

    // Create a recurring to delete
    const createRes = await api(page, 'POST', '/api/payment_recurrings', {
      payment_recurring: {
        name: 'BugStopper Delete Test',
        amount: 15.00,
        account_id: accountId,
        spending_category_id: categoryId,
        frequency_master_id: 1,
        next_date: '2026-04-01',
        use_flag: true,
      },
    });
    expect(createRes.status).toBe(201);
    const id = createRes.json.id;

    // Soft delete
    const deleteRes = await api(page, 'DELETE', `/api/payment_recurrings/${id}`);
    expect(deleteRes.status).toBe(204);

    // Verify it no longer appears in the index (default scope excludes soft-deleted)
    const indexRes = await api(page, 'GET', '/api/payment_recurrings');
    expect(indexRes.status).toBe(200);
    const found = indexRes.json.find(r => r.id === id);
    expect(found).toBeUndefined();
  });
});
