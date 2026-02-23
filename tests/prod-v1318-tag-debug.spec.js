// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('Debug: Login and check report page', async ({ page }) => {
  const allLogs = [];
  page.on('console', msg => allLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => allLogs.push('PAGE ERROR: ' + err.message));

  // Go to sign-in page
  await page.goto(`${BASE}/users/sign_in`, { waitUntil: 'networkidle' });
  console.log('Sign-in page URL:', page.url());

  // Fill form
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');

  // Submit via promise.all to handle navigation
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }).catch(e => console.log('Nav error:', e.message)),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);

  console.log('After login URL:', page.url());

  // Check if we landed on dashboard
  if (page.url().includes('sign_in')) {
    // Login failed - check for error messages
    const flash = await page.locator('.alert, .flash, [role="alert"]').textContent().catch(() => 'no alert');
    console.log('Flash message:', flash);

    // Check for inline errors
    const bodyText = await page.locator('body').textContent();
    console.log('Contains "Invalid":', bodyText.includes('Invalid'));
    console.log('Contains "error":', bodyText.toLowerCase().includes('error'));

    // Try clicking submit button directly (maybe it's a different selector)
    const buttons = await page.locator('input[type="submit"], button[type="submit"]').count();
    console.log('Submit buttons found:', buttons);

    // Try form submission via JS
    console.log('Trying JS form submit...');
    await page.evaluate(() => {
      document.querySelector('form')?.submit();
    });
    await page.waitForTimeout(5000);
    console.log('After JS submit URL:', page.url());
  }

  // Dump logs
  for (const log of allLogs) console.log('CONSOLE:', log);

  expect(page.url()).toContain('dashboard');
});
