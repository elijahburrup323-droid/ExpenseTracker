// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

const ACCOUNT1 = { email: 'elijahburrup323@gmail.com', password: 'Eli624462!' };
const ACCOUNT2 = { email: 'djburrup@gmail.com', password: 'luckydjb' };

function trackConsoleErrors(page, errors) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push('[console.error] ' + msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push('[pageerror] ' + err.message);
  });
}

function criticalErrors(errors) {
  return errors.filter((e) => {
    if (e.includes('favicon')) return false;
    if (e.includes('Failed to load resource')) return false;
    if (e.includes('404')) return false;
    if (e.includes('Failed to fetch')) return false;
    if (e.includes('Load failed')) return false;
    if (e.includes('turbo')) return false;
    return true;
  });
}

async function signIn(page, { email, password }) {
  await page.goto(BASE + '/users/sign_in');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

async function dismissWhatsNew(page) {
  try {
    const btn = page.locator('#whatsNewOverlay button:has-text("Got it")');
    await btn.waitFor({ state: 'visible', timeout: 3000 });
    await btn.click();
    await page.waitForTimeout(500);
  } catch (e) {
    // overlay not present
  }
}

// --- Account 1 ---
test.describe('Account 1 - Agent (elijahburrup323)', () => {
  let jsErrors = [];
  test.beforeEach(() => { jsErrors = []; });

  test('Sign in succeeds', async ({ page }) => {
    trackConsoleErrors(page, jsErrors);
    await signIn(page, ACCOUNT1);
    await expect(page).not.toHaveURL(/sign_in/, { timeout: 10000 });
  });

  test('Reports Maintenance - Route Path is a dropdown with correct options', async ({ page }) => {
    trackConsoleErrors(page, jsErrors);
    await signIn(page, ACCOUNT1);
    await dismissWhatsNew(page);

    await page.goto(BASE + '/reports_masters');
    await page.waitForLoadState('networkidle');
    await dismissWhatsNew(page);

    const h1 = page.getByRole('heading', { name: 'Reports Maintenance' });
    await expect(h1).toBeVisible({ timeout: 10000 });

    // Add Report modal
    const addBtn = page.locator('button:has-text("Add Report"), a:has-text("Add Report")');
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Route Path must be a <select>
    const routeSelect = page.locator('[data-reports-masters-target="modalRoutePath"]');
    // fallback not needed with Stimulus target
    const selectLocator = routeSelect;
    await expect(selectLocator).toBeVisible({ timeout: 5000 });

    // First option contains None
    const firstOption = selectLocator.locator('option').first();
    const firstText = await firstOption.textContent();
    expect(firstText.trim()).toContain('None');

    // Monthly Cash Flow option exists
    const options = selectLocator.locator('option');
    const allTexts = await options.allTextContents();
    const hasMCF = allTexts.some((t) => t.includes('Monthly Cash Flow'));
    expect(hasMCF).toBeTruthy();
    console.log('Add modal dropdown options:', allTexts);

    // Close the add modal
    const closeBtn = page.getByRole('button', { name: 'Cancel' });
    await closeBtn.click();
    await page.waitForTimeout(500);

    // Edit Monthly Cash Flow row
    const mcfRow = page.locator('tr:has-text("Monthly Cash Flow")').first();
    await expect(mcfRow).toBeVisible({ timeout: 5000 });

    const editBtn = mcfRow.getByRole('button', { name: 'Edit' });
    await editBtn.click();
    await page.waitForTimeout(1000);

    // Verify route path dropdown shows monthly_cash_flow selected
    const editSelect = page.locator('[data-reports-masters-target="modalRoutePath"]');
    await expect(editSelect).toBeVisible({ timeout: 5000 });

    const selectedValue = await editSelect.inputValue();
    console.log('Edit modal selected route value:', selectedValue);
    expect(selectedValue).toContain('monthly_cash_flow');

    // Close edit modal
    const closeBtn2 = page.getByRole('button', { name: 'Cancel' });
    await closeBtn2.click();

    const critical = criticalErrors(jsErrors);
    if (critical.length > 0) console.log('Critical JS errors:', critical);
    expect(critical).toHaveLength(0);
  });
});

// --- Account 2 ---
test.describe('Account 2 - Owner (djburrup)', () => {
  let jsErrors = [];
  test.beforeEach(() => { jsErrors = []; });

  test('Sign in succeeds and dashboard shows data', async ({ page }) => {
    trackConsoleErrors(page, jsErrors);
    await signIn(page, ACCOUNT2);
    await dismissWhatsNew(page);
    await expect(page).not.toHaveURL(/sign_in/, { timeout: 10000 });
    const dashContent = page.locator('.card, .dashboard-card, [data-controller="dashboard"], main').first();
    await expect(dashContent).toBeVisible({ timeout: 10000 });
    console.log('Dashboard loaded for Account 2');
    const critical = criticalErrors(jsErrors);
    if (critical.length > 0) console.log('Critical JS errors on Dashboard:', critical);
    expect(critical).toHaveLength(0);
  });

  test('Navigate to Payments page - no regressions', async ({ page }) => {
    trackConsoleErrors(page, jsErrors);
    await signIn(page, ACCOUNT2);
    await dismissWhatsNew(page);
    await page.goto(BASE + '/payments');
    await page.waitForLoadState('networkidle');
    await dismissWhatsNew(page);
    const heading = page.locator('h1, h2, .page-title').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    console.log('Payments page loaded - heading:', await heading.textContent());
    const critical = criticalErrors(jsErrors);
    if (critical.length > 0) console.log('Critical JS errors on Payments:', critical);
    expect(critical).toHaveLength(0);
  });

  test('Navigate to Reports page - no regressions', async ({ page }) => {
    trackConsoleErrors(page, jsErrors);
    await signIn(page, ACCOUNT2);
    await dismissWhatsNew(page);
    await page.goto(BASE + '/reports');
    await page.waitForLoadState('networkidle');
    await dismissWhatsNew(page);
    const heading = page.locator('h1, h2, .page-title').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    console.log('Reports page loaded - heading:', await heading.textContent());
    const critical = criticalErrors(jsErrors);
    if (critical.length > 0) console.log('Critical JS errors on Reports:', critical);
    expect(critical).toHaveLength(0);
  });
});
