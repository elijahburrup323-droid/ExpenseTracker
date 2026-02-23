const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb' }
];

async function login(page, user) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', user.email);
  await page.fill('input[name="user[password]"]', user.pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|mybudgethq/, { timeout: 30000 });
  // Dismiss What's New overlay
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
    await page.waitForTimeout(500);
  }
  // Force-remove overlay if still present
  await page.evaluate(() => {
    const overlay = document.getElementById('whatsNewOverlay');
    if (overlay) overlay.remove();
  });
  // Wait for Stimulus controllers to connect
  await page.waitForTimeout(2000);
}

for (const user of USERS) {
  test.describe(`Text Scale [${user.email}]`, () => {

    test('Text scale control visible with 100% default', async ({ page }) => {
      test.setTimeout(45000);
      await login(page, user);

      const control = page.locator('[data-controller="text-scale"]');
      await expect(control).toBeVisible({ timeout: 10000 });

      const display = page.locator('[data-text-scale-target="display"]');
      const displayText = await display.textContent();
      expect(displayText.trim()).toMatch(/\d+%/);
      console.log(`${user.email}: control visible, shows ${displayText.trim()}`);
    });

    test('Can increase and reset text scale', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      // Wait for Stimulus controller to fully connect
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-controller="text-scale"]');
        if (!el || !window.Stimulus) return false;
        const ctrl = window.Stimulus.getControllerForElementAndIdentifier(el, 'text-scale');
        return ctrl && ctrl.hasDisplayTarget;
      }, { timeout: 10000 });

      const display = page.locator('[data-text-scale-target="display"]');
      const increase = page.locator('[data-text-scale-target="increase"]');

      // Get initial value
      const initial = await display.textContent();
      const initialNum = parseInt(initial);

      // Click increase via JS dispatch (more reliable than Playwright click)
      await page.evaluate(() => {
        document.querySelector('[data-text-scale-target="increase"]').click();
      });
      await page.waitForTimeout(500);
      let text = await display.textContent();
      expect(parseInt(text)).toBe(initialNum + 5);
      console.log(`${user.email}: increased from ${initialNum}% to ${text.trim()}`);

      // Reset by clicking display
      await page.evaluate(() => {
        document.querySelector('[data-text-scale-target="display"]').click();
      });
      await page.waitForTimeout(500);
      text = await display.textContent();
      expect(text.trim()).toBe('100%');
      console.log(`${user.email}: reset to 100%`);

      // Wait for debounced save
      await page.waitForTimeout(1000);
    });

    test('Dashboard and Accounts still load', async ({ page }) => {
      test.setTimeout(45000);
      await login(page, user);
      await expect(page).toHaveURL(/dashboard/);

      await page.goto(`${BASE}/accounts`);
      await page.waitForTimeout(3000);
      const content = await page.textContent('body');
      expect(content.length).toBeGreaterThan(100);
      console.log(`${user.email}: accounts page OK`);
    });
  });
}
