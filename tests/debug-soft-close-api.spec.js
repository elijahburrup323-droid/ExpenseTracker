// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('debug soft close API', async ({ page }) => {
  // Sign in
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });

  // Dismiss What's New overlay
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }

  // Fetch the API endpoint directly
  const result = await page.evaluate(async () => {
    try {
      const res = await fetch('/mybudgethq/api/soft_close/status', {
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
