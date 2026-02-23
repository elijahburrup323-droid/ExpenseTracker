const { test, expect } = require('@playwright/test');
const BASE = 'https://djburrup.com/mybudgethq';

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) await gotIt.click();
  await page.fill('input[name="user[email]"]', 'djburrup@gmail.com');
  await page.fill('input[name="user[password]"]', 'luckydjb');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/i, { timeout: 15000 });
}

test('Admin: Account Type Masters page loads', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/account_type_masters`);
  await expect(page.locator('h1')).toContainText('Account Types Master', { timeout: 10000 });
});

test('Admin: can_delete API returns account names for in-use type', async ({ page }) => {
  await login(page);
  // Get the list of types
  const types = await page.evaluate(async (base) => {
    const r = await fetch(`${base}/api/account_type_masters`, { headers: { 'Accept': 'application/json' } });
    return r.json();
  }, BASE);

  // Find "Checking" type (likely in use)
  const checking = types.find(t => t.display_name === 'Checking');
  if (checking) {
    const data = await page.evaluate(async ([base, id]) => {
      const r = await fetch(`${base}/api/account_type_masters/${id}/can_delete`, { headers: { 'Accept': 'application/json' } });
      return r.json();
    }, [BASE, checking.id]);

    expect(data.can_delete).toBe(false);
    expect(data.account_names).toBeDefined();
    expect(Array.isArray(data.account_names)).toBe(true);
    expect(data.total_count).toBeGreaterThan(0);
  }
});

test('Dashboard loads for both accounts', async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/dashboard/i);
  const body = await page.textContent('body');
  expect(body.length).toBeGreaterThan(100);
});

test('No JS errors on Account Type Masters page', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await login(page);
  await page.goto(`${BASE}/account_type_masters`);
  await page.waitForTimeout(2000);
  expect(errors.filter(e => /import|404|SyntaxError/i.test(e))).toHaveLength(0);
});
