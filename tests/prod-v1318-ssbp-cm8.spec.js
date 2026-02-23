// Post-deploy verification for SSBP CM-022126-08
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`, { waitUntil: 'networkidle' });
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 2000 }).catch(() => false)) await gotIt.click();
  await page.fill('input[name="user[email]"]', 'djburrup@gmail.com');
  await page.fill('input[name="user[password]"]', 'luckydjb');
  await Promise.all([
    page.waitForNavigation({ timeout: 30000 }),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
  await page.waitForTimeout(2000);
  const gotIt2 = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt2.isVisible({ timeout: 2000 }).catch(() => false)) await gotIt2.click();
}

test('SSBP page loads', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/social_security_planner`, { waitUntil: 'networkidle' });
  await expect(page.locator('h1:has-text("Social Security Benefit Planner")')).toBeVisible({ timeout: 10000 });
});

test('Claim age grid shows 3 text input rows with benefit column', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/social_security_planner`, { waitUntil: 'networkidle' });
  const container = page.locator('[data-ss-planner-target="yourClaimAgeList"]');
  await expect(container).toBeVisible({ timeout: 10000 });
  await expect(container.locator('text=Benefit')).toBeVisible();
  const yearsInputs = container.locator('input[data-claim-field="years"]');
  await expect(yearsInputs).toHaveCount(3);
  const benefitInputs = container.locator('input[data-claim-field="benefit"]');
  await expect(benefitInputs).toHaveCount(3);
});

test('PIA input is removed', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/social_security_planner`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const piaInput = page.locator('[data-ss-planner-target="yourPIA"]');
  await expect(piaInput).toHaveCount(0);
});

test('Full Name label shows (Optional)', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/social_security_planner`, { waitUntil: 'networkidle' });
  await expect(page.locator('label:has-text("Full Name (Optional)")').first()).toBeVisible({ timeout: 10000 });
});

test('Add Age button is removed', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/social_security_planner`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const addBtn = page.locator('button:has-text("Add Age")');
  await expect(addBtn).toHaveCount(0);
});

test('No JS console errors on SSBP page', async ({ page }) => {
  const jsErrors = [];
  page.on('pageerror', err => jsErrors.push(err.message));
  await login(page);
  await page.goto(`${BASE}/social_security_planner`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  expect(jsErrors).toEqual([]);
});
