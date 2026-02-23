const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) await gotIt.click();
}

test.describe('Post-Deploy: SSBP Layout + Per-Person FRA — CM-022226-04', () => {
  test.setTimeout(180000);

  test('Account 1 login (djburrup)', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await expect(page.locator('body')).toContainText('Hello');
  });

  test('Account 2 login (elijah)', async ({ page }) => {
    await login(page, 'elijahburrup323@gmail.com', 'Eli624462!');
    await expect(page.locator('body')).toContainText('Hello');
  });

  test('COLA is above Participants section', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await page.goto(`${BASE}/social_security_planner`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // COLA dropdown should be visible
    const colaSelect = page.locator('[data-ss-planner-target="colaRate"]');
    await expect(colaSelect).toBeVisible();
    console.log('COLA dropdown visible');

    // Default should be 2.6%
    const colaVal = await colaSelect.inputValue();
    expect(colaVal).toBe('2.6');
    console.log('COLA default = 2.6%');

    // COLA should appear BEFORE the "Participants" heading
    const colaBox = await colaSelect.boundingBox();
    const participantsHeading = page.locator('h2:has-text("Participants")');
    const participantsBox = await participantsHeading.boundingBox();
    expect(colaBox.y).toBeLessThan(participantsBox.y);
    console.log('COLA is above Participants heading');

    await page.screenshot({ path: 'tests/screenshots/ssbp-cola-above.png', fullPage: true });
  });

  test('Working Before FRA? is per-person (You + Spouse)', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await page.goto(`${BASE}/social_security_planner`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Your Working Before FRA field
    const yourFRA = page.locator('[data-ss-planner-target="yourWorkingBeforeFRA"]');
    await expect(yourFRA).toBeVisible();
    console.log('"Your" Working Before FRA text input visible');

    // It should be a text input (not dropdown)
    const tagName = await yourFRA.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('input');
    console.log('Working Before FRA is a text input (not dropdown)');

    // Type "Yes" and verify it normalizes
    await yourFRA.fill('yes');
    await yourFRA.blur();
    await page.waitForTimeout(500);
    const normalizedVal = await yourFRA.inputValue();
    expect(normalizedVal).toBe('Yes');
    console.log('Input "yes" normalized to "Yes"');

    // Type "N" and verify it normalizes
    await yourFRA.fill('n');
    await yourFRA.blur();
    await page.waitForTimeout(500);
    const normalizedN = await yourFRA.inputValue();
    expect(normalizedN).toBe('No');
    console.log('Input "n" normalized to "No"');

    // Type invalid value — should show error
    await yourFRA.fill('maybe');
    await yourFRA.blur();
    await page.waitForTimeout(500);
    const errorMsg = page.locator('[data-ss-planner-target="yourWorkingFRAError"]');
    await expect(errorMsg).toBeVisible();
    console.log('Invalid input shows error message');

    // Clear and verify error goes away
    await yourFRA.fill('');
    await yourFRA.blur();
    await page.waitForTimeout(500);
    await expect(errorMsg).toBeHidden();
    console.log('Empty input clears error');

    // Add spouse and check spouse field
    await page.locator('button:has-text("Add Spouse")').click();
    await page.waitForTimeout(500);

    const spouseFRA = page.locator('[data-ss-planner-target="spouseWorkingBeforeFRA"]');
    await expect(spouseFRA).toBeVisible();
    console.log('"Spouse" Working Before FRA text input visible');

    await page.screenshot({ path: 'tests/screenshots/ssbp-per-person-fra.png', fullPage: true });
  });

  test('Old global Assumptions section is removed', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await page.goto(`${BASE}/social_security_planner`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // The old "Assumptions" heading should NOT exist
    const assumptionsHeading = page.locator('h2:has-text("Assumptions")');
    const count = await assumptionsHeading.count();
    expect(count).toBe(0);
    console.log('Old Assumptions section heading removed');

    // Old global workingBeforeFRA dropdown should NOT exist
    const oldDropdown = page.locator('select[data-ss-planner-target="workingBeforeFRA"]');
    expect(await oldDropdown.count()).toBe(0);
    console.log('Old global Working Before FRA dropdown removed');
  });

  test('Regression: Dashboard loads', async ({ page }) => {
    await login(page, 'djburrup@gmail.com', 'luckydjb');
    await expect(page.locator('body')).toContainText('Hello');
  });
});
