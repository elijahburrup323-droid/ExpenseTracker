const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb' }
];

const ALL_THEMES = [
  'purple', 'navy', 'teal', 'charcoal', 'deep_green', 'burgundy',
  'royal_blue', 'slate_blue', 'sunset_orange', 'midnight', 'emerald', 'copper'
];

async function login(page, user) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', user.email);
  await page.fill('input[name="user[password]"]', user.pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.evaluate(() => {
    const overlay = document.getElementById('whatsNewOverlay');
    if (overlay) overlay.remove();
  });
  await page.waitForTimeout(1000);
}

// Run serially to avoid concurrent session issues
test.describe.configure({ mode: 'serial' });

for (const user of USERS) {
  test.describe(`Themes [${user.email}]`, () => {

    test('Theme Settings page shows all 12 themes', async ({ page }) => {
      test.setTimeout(45000);
      await login(page, user);

      const response = await page.goto(`${BASE}/settings/theme`);
      expect(response.status()).toBe(200);
      await page.waitForTimeout(2000);

      const cards = page.locator('[data-theme-key]');
      const count = await cards.count();
      expect(count).toBe(12);
      console.log(`${user.email}: ${count} theme cards`);

      for (const key of ALL_THEMES) {
        await expect(page.locator(`[data-theme-key="${key}"]`)).toBeVisible();
      }
      console.log(`${user.email}: all 12 themes visible`);
    });

    test('API accepts new theme keys', async ({ page }) => {
      test.setTimeout(45000);
      await login(page, user);

      const csrfToken = await page.evaluate(() =>
        document.querySelector('meta[name="csrf-token"]')?.content
      );

      // Try each new theme via API
      for (const key of ['royal_blue', 'emerald', 'copper']) {
        const result = await page.evaluate(async ({ key, token }) => {
          const resp = await fetch('/mybudgethq/api/theme', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
            body: JSON.stringify({ accent_theme_key: key })
          });
          return { status: resp.status, body: await resp.json() };
        }, { key, token: csrfToken });

        expect(result.status).toBe(200);
        expect(result.body.accent_theme_key).toBe(key);
        console.log(`${user.email}: ${key} -> ${result.body.changed ? 'saved' : 'already set'}`);
      }

      // Restore to purple
      await page.evaluate(async (token) => {
        await fetch('/mybudgethq/api/theme', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
          body: JSON.stringify({ accent_theme_key: 'purple' })
        });
      }, csrfToken);
      console.log(`${user.email}: restored to purple`);
    });

    test('CSS variables apply for new themes', async ({ page }) => {
      test.setTimeout(45000);
      await login(page, user);

      const checks = [
        { theme: 'royal_blue', expected600: '#4f46e5' },
        { theme: 'copper',     expected600: '#b8571c' },
        { theme: 'midnight',   expected600: '#3c4177' },
        { theme: 'emerald',    expected600: '#059669' },
      ];

      for (const { theme, expected600 } of checks) {
        await page.evaluate(t => { document.documentElement.dataset.accentTheme = t; }, theme);
        await page.waitForTimeout(300);
        const val = await page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue('--brand-600').trim()
        );
        expect(val).toBe(expected600);
        console.log(`${user.email}: ${theme} brand-600 = ${val}`);
      }
    });

    test('Dashboard still loads', async ({ page }) => {
      test.setTimeout(45000);
      await login(page, user);
      await expect(page).toHaveURL(/dashboard/);
      const content = await page.textContent('body');
      expect(content.length).toBeGreaterThan(100);
      console.log(`${user.email}: dashboard OK`);
    });
  });
}
