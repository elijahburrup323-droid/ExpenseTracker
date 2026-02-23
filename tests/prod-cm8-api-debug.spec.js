const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('CM-8 API debug', async ({ page }) => {
  // Login
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'djburrup@gmail.com');
  await page.fill('input[name="user[password]"]', 'luckydjb');
  await Promise.all([
    page.waitForURL(/\/mybudgethq\/dashboard/, { timeout: 15000 }),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  try { await gotIt.waitFor({ state: 'visible', timeout: 4000 }); await gotIt.click(); } catch (e) {}

  // Hit the API endpoint directly
  const result = await page.evaluate(async () => {
    try {
      const res = await fetch('/mybudgethq/api/reports/monthly_cash_flow?year=2026&month=2', {
        headers: { 'Accept': 'application/json' }
      });
      const text = await res.text();
      return { status: res.status, statusText: res.statusText, body: text.substring(0, 2000) };
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('API Response:', JSON.stringify(result, null, 2));
  expect(result.status).toBe(200);
});
