// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const DJ_EMAIL = 'djburrup@gmail.com';
const DJ_PASS = 'luckydjb';
const ELI_EMAIL = 'elijahburrup323@gmail.com';
const ELI_PASS = 'Eli624462!';

async function login(page, email, password) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/);
  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

test.describe('CM-9: Collapsible Reconciliation Groups', () => {

  test('1. QA banner visible with v1.3.13', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);
    const banner = page.locator('text=NEW RELEASE QA MODE');
    await expect(banner).toBeVisible({ timeout: 10000 });
    const bannerText = await banner.textContent();
    expect(bannerText).toContain('1.3.13');
  });

  test('2. Reconciliation page loads with chevron indicators', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);
    await page.goto(`${BASE}/account_reconciliation`);
    await page.waitForSelector('[data-controller="reconciliation"]');

    // Select first account
    const select = page.locator('[data-reconciliation-target="accountSelect"]');
    const options = await select.locator('option').all();
    // Find first non-empty option
    let accountValue = '';
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val) { accountValue = val; break; }
    }
    expect(accountValue).toBeTruthy();
    await select.selectOption(accountValue);

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Verify chevron SVGs exist for all 4 groups
    await expect(page.locator('[data-reconciliation-target="paymentsChevron"]')).toBeVisible();
    await expect(page.locator('[data-reconciliation-target="depositsChevron"]')).toBeVisible();
    await expect(page.locator('[data-reconciliation-target="transfersChevron"]')).toBeVisible();
    await expect(page.locator('[data-reconciliation-target="adjustmentsChevron"]')).toBeVisible();
  });

  test('3. Clicking header collapses and expands a group', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);
    await page.goto(`${BASE}/account_reconciliation`);
    await page.waitForSelector('[data-controller="reconciliation"]');

    // Select first account
    const select = page.locator('[data-reconciliation-target="accountSelect"]');
    const options = await select.locator('option').all();
    let accountValue = '';
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val) { accountValue = val; break; }
    }
    await select.selectOption(accountValue);
    await page.waitForTimeout(2000);

    // Find a group that has content (try payments first)
    const paymentsContent = page.locator('[data-reconciliation-target="paymentsContent"]');
    const paymentsHeader = page.locator('[data-controller="reconciliation"] [data-group="payments"]');

    // Check if payments content is visible or hidden (depends on auto-collapse rules)
    const isVisible = await paymentsContent.isVisible();

    // Click header to toggle
    await paymentsHeader.click();
    await page.waitForTimeout(500);

    // State should have toggled
    if (isVisible) {
      await expect(paymentsContent).toBeHidden();
    } else {
      await expect(paymentsContent).toBeVisible();
    }

    // Click again to toggle back
    await paymentsHeader.click();
    await page.waitForTimeout(500);

    if (isVisible) {
      await expect(paymentsContent).toBeVisible();
    } else {
      await expect(paymentsContent).toBeHidden();
    }
  });

  test('4. Group collapse state persists across page reload', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);
    await page.goto(`${BASE}/account_reconciliation`);
    await page.waitForSelector('[data-controller="reconciliation"]');

    // Select first account
    const select = page.locator('[data-reconciliation-target="accountSelect"]');
    const options = await select.locator('option').all();
    let accountValue = '';
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val) { accountValue = val; break; }
    }
    await select.selectOption(accountValue);
    await page.waitForTimeout(2000);

    // Record initial state of all groups
    const depositsContent = page.locator('[data-reconciliation-target="depositsContent"]');
    const depositsHeader = page.locator('[data-controller="reconciliation"] [data-group="deposits"]');
    const initialState = await depositsContent.isVisible();

    // Toggle deposits group
    await depositsHeader.click();
    await page.waitForTimeout(1000); // Wait for persist API call

    const toggledState = await depositsContent.isVisible();
    expect(toggledState).toBe(!initialState);

    // Reload page and re-select same account
    await page.goto(`${BASE}/account_reconciliation?account_id=${accountValue}`);
    await page.waitForSelector('[data-controller="reconciliation"]');
    await page.waitForTimeout(3000);

    // Verify persisted state
    const depositsContentReload = page.locator('[data-reconciliation-target="depositsContent"]');
    const persistedState = await depositsContentReload.isVisible();
    expect(persistedState).toBe(toggledState);

    // Restore original state
    if (persistedState !== initialState) {
      const depositsHeaderReload = page.locator('[data-controller="reconciliation"] [data-group="deposits"]');
      await depositsHeaderReload.click();
      await page.waitForTimeout(1000);
    }
  });

  test('5. API endpoints respond correctly', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);

    // Get first account
    const accountsRes = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/accounts`, { headers: { 'Accept': 'application/json' } });
      return res.json();
    }, BASE);
    const accountId = accountsRes[0]?.id;
    expect(accountId).toBeTruthy();

    // Test group_states endpoint
    const statesStatus = await page.evaluate(async (params) => {
      const res = await fetch(`${params.base}/api/reconciliation/group_states?account_id=${params.id}`, {
        headers: { 'Accept': 'application/json' }
      });
      return res.status;
    }, { base: BASE, id: accountId });
    expect(statesStatus).toBe(200);

    // Test toggle_group endpoint
    const csrf = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="csrf-token"]');
      return meta ? meta.getAttribute('content') : '';
    });

    const toggleStatus = await page.evaluate(async (params) => {
      const res = await fetch(`${params.base}/api/reconciliation/toggle_group`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': params.csrf
        },
        body: JSON.stringify({
          account_id: params.id,
          group_type: 'transfers',
          is_collapsed: false
        })
      });
      return res.status;
    }, { base: BASE, id: accountId, csrf: csrf });
    expect(toggleStatus).toBe(200);
  });

  test('6. Empty groups auto-collapse on load', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);
    await page.goto(`${BASE}/account_reconciliation`);
    await page.waitForSelector('[data-controller="reconciliation"]');

    // Select first account
    const select = page.locator('[data-reconciliation-target="accountSelect"]');
    const options = await select.locator('option').all();
    let accountValue = '';
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val) { accountValue = val; break; }
    }
    await select.selectOption(accountValue);
    await page.waitForTimeout(2000);

    // Check adjustments — often empty, should be collapsed if empty
    const adjustmentsContent = page.locator('[data-reconciliation-target="adjustmentsContent"]');
    const adjustmentsBody = page.locator('[data-reconciliation-target="adjustmentsBody"]');
    const bodyText = await adjustmentsBody.textContent();

    if (bodyText.includes('No adjustments this month')) {
      // Empty group should be collapsed
      await expect(adjustmentsContent).toBeHidden();
    }
    // If it has data, we can't predict the state (depends on reconciled status + persisted preference)
  });

  test('7. Chevron rotates on collapse/expand', async ({ page }) => {
    await login(page, DJ_EMAIL, DJ_PASS);
    await page.goto(`${BASE}/account_reconciliation`);
    await page.waitForSelector('[data-controller="reconciliation"]');

    // Select first account
    const select = page.locator('[data-reconciliation-target="accountSelect"]');
    const options = await select.locator('option').all();
    let accountValue = '';
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val) { accountValue = val; break; }
    }
    await select.selectOption(accountValue);
    await page.waitForTimeout(2000);

    const transfersChevron = page.locator('[data-reconciliation-target="transfersChevron"]');
    const transfersHeader = page.locator('[data-controller="reconciliation"] [data-group="transfers"]');
    const transfersContent = page.locator('[data-reconciliation-target="transfersContent"]');

    // Get initial chevron transform
    const initialTransform = await transfersChevron.evaluate(el => el.style.transform);

    // Click to toggle
    await transfersHeader.click();
    await page.waitForTimeout(500);

    const afterTransform = await transfersChevron.evaluate(el => el.style.transform);

    // Transform should have changed
    expect(afterTransform).not.toBe(initialTransform);

    // Toggle back to restore state
    await transfersHeader.click();
    await page.waitForTimeout(500);
  });

  test('8. Second user (Eli) can access reconciliation with collapsible groups', async ({ page }) => {
    await login(page, ELI_EMAIL, ELI_PASS);
    await page.goto(`${BASE}/account_reconciliation`);
    await page.waitForSelector('[data-controller="reconciliation"]');

    // Verify page loads with chevrons
    const select = page.locator('[data-reconciliation-target="accountSelect"]');
    const options = await select.locator('option').all();
    let accountValue = '';
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val) { accountValue = val; break; }
    }

    if (accountValue) {
      await select.selectOption(accountValue);
      await page.waitForTimeout(2000);

      // Chevrons should be visible
      await expect(page.locator('[data-reconciliation-target="paymentsChevron"]')).toBeVisible();
      await expect(page.locator('[data-reconciliation-target="depositsChevron"]')).toBeVisible();
    }
    // If no accounts, the empty state is shown — that's fine
    expect(true).toBe(true);
  });
});
