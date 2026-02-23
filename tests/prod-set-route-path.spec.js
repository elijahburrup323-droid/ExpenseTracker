// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('Set spending_by_category route_path via Reports Maintenance API', async ({ page }) => {
  // Login as admin
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|reports/);

  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }

  // Get all reports to find the spending_by_category record
  const reportsJson = await page.evaluate(async (base) => {
    const res = await fetch(`${base}/api/reports_masters`, { headers: { 'Accept': 'application/json' } });
    return await res.json();
  }, BASE);

  const report = reportsJson.find(r => r.report_key === 'spending_by_category');
  expect(report).toBeTruthy();
  console.log('Found report id:', report.id, 'current route_path:', report.route_path);

  // Update route_path with CSRF token
  const updateResult = await page.evaluate(async ({ base, id }) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const res = await fetch(`${base}/api/reports_masters/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-Token': csrfToken || ''
      },
      body: JSON.stringify({ reports_master: { route_path: '/reports/spending_by_category' } })
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }, { base: BASE, id: report.id });

  console.log('Update result:', JSON.stringify(updateResult));
  expect(updateResult.status).toBe(200);
  expect(updateResult.body.route_path).toBe('/reports/spending_by_category');
});
