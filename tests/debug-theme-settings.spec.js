const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('Debug theme settings navigation', async ({ page }) => {
  test.setTimeout(60000);

  // Login
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 });

  console.log('Dashboard URL:', page.url());

  // Dismiss overlay
  await page.evaluate(() => {
    const overlay = document.getElementById('whatsNewOverlay');
    if (overlay) overlay.remove();
  });

  await page.waitForTimeout(2000);

  // Check we're on dashboard
  const dashContent = await page.textContent('h1');
  console.log('Dashboard h1:', dashContent);

  // Navigate to theme settings
  const response = await page.goto(`${BASE}/settings/theme`);
  console.log('Theme settings status:', response.status());
  console.log('Theme settings URL:', page.url());

  await page.waitForTimeout(2000);

  // Check what page we're on
  const bodyText = await page.textContent('body');
  const first200 = bodyText.substring(0, 200).trim();
  console.log('Body start:', first200);

  // Count theme cards
  const cards = await page.locator('[data-theme-key]').count();
  console.log('Theme cards found:', cards);

  // Also try the button class
  const buttons = await page.locator('button[data-theme-key]').count();
  console.log('Theme buttons found:', buttons);

  // Try API call
  const csrfToken = await page.evaluate(() => {
    return document.querySelector('meta[name="csrf-token"]')?.content || 'NONE';
  });
  console.log('CSRF token:', csrfToken.substring(0, 10) + '...');

  // Try a PUT to theme API
  const apiResult = await page.evaluate(async (token) => {
    try {
      const resp = await fetch('/mybudgethq/api/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify({ accent_theme_key: 'royal_blue' })
      });
      const text = await resp.text();
      return { status: resp.status, contentType: resp.headers.get('content-type'), body: text.substring(0, 200) };
    } catch(e) {
      return { error: e.message };
    }
  }, csrfToken);
  console.log('API result:', JSON.stringify(apiResult, null, 2));

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/debug-theme-settings.png', fullPage: true });
});
