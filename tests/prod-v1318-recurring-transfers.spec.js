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
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.evaluate(() => {
    const overlay = document.getElementById('whatsNewOverlay');
    if (overlay) overlay.remove();
  });
  await page.waitForTimeout(2000);
}

test.describe.configure({ mode: 'serial' });

for (const user of USERS) {
  test.describe(`Recurring Transfers [${user.email}]`, () => {

    test('Transfers page has tabs (Transfers + Recurring)', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      await page.goto(`${BASE}/transfer_masters`);
      await page.waitForTimeout(2000);

      // Check tabs exist within the sticky header (not sidebar)
      const tabBar = page.locator('.sticky .flex.space-x-6');
      await expect(tabBar).toBeVisible();

      const transfersTab = tabBar.locator('a', { hasText: 'Transfers' });
      const recurringTab = tabBar.locator('a', { hasText: 'Recurring' });
      await expect(transfersTab).toBeVisible();
      await expect(recurringTab).toBeVisible();
      console.log(`${user.email}: Both tabs visible on Transfers page`);

      // Transfers tab should be active (border-brand-600)
      const transfersClass = await transfersTab.getAttribute('class');
      expect(transfersClass).toContain('border-brand-600');
      console.log(`${user.email}: Transfers tab is active`);
    });

    test('Recurring Transfers page loads with correct tab state', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      await page.goto(`${BASE}/recurring_transfers`);
      await page.waitForTimeout(2000);

      // Check header
      const header = page.getByRole('heading', { name: 'Recurring Transfers' });
      await expect(header).toBeVisible();
      console.log(`${user.email}: Recurring Transfers header visible`);

      // Recurring tab should be active
      const tabBar = page.locator('.sticky .flex.space-x-6');
      const recurringTab = tabBar.locator('a', { hasText: 'Recurring' });
      const recurringClass = await recurringTab.getAttribute('class');
      expect(recurringClass).toContain('border-brand-600');
      console.log(`${user.email}: Recurring tab is active`);

      // Table should load (either empty state or data)
      const tableBody = page.locator('[data-recurring-transfers-target="tableBody"]');
      await expect(tableBody).toBeVisible({ timeout: 5000 });
      const text = await tableBody.textContent();
      const hasContent = text.includes('No recurring transfers yet') || text.trim().length > 0;
      expect(hasContent).toBe(true);
      console.log(`${user.email}: Table body loaded`);
    });

    test('Add Recurring Transfer modal opens and validates', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      await page.goto(`${BASE}/recurring_transfers`);
      await page.waitForTimeout(3000);

      // Click Add button
      const addBtn = page.locator('button', { hasText: 'Add Recurring Transfer' });
      await expect(addBtn).toBeVisible();
      await addBtn.click();
      await page.waitForTimeout(500);

      // Modal should be visible
      const modal = page.locator('[data-recurring-transfers-target="entryModal"]');
      await expect(modal).toBeVisible();
      console.log(`${user.email}: Add modal opened`);

      // Check modal title
      const modalTitle = page.locator('[data-recurring-transfers-target="modalTitle"]');
      await expect(modalTitle).toContainText('Add Recurring Transfer');

      // Check required fields exist
      const fromSelect = page.locator('[data-recurring-transfers-target="modalFrom"]');
      const toSelect = page.locator('[data-recurring-transfers-target="modalTo"]');
      const amountInput = page.locator('[data-recurring-transfers-target="modalAmount"]');
      const frequencySelect = page.locator('[data-recurring-transfers-target="modalFrequency"]');
      const nextDateInput = page.locator('[data-recurring-transfers-target="modalNextDate"]');

      await expect(fromSelect).toBeVisible();
      await expect(toSelect).toBeVisible();
      await expect(amountInput).toBeVisible();
      await expect(frequencySelect).toBeVisible();
      await expect(nextDateInput).toBeVisible();
      console.log(`${user.email}: All modal fields present`);

      // Account dropdowns should have options
      const fromOptions = await fromSelect.locator('option').count();
      expect(fromOptions).toBeGreaterThan(1); // At least "Select account..." + one real account
      console.log(`${user.email}: From account has ${fromOptions} options`);

      // Frequency dropdown should have options
      const freqOptions = await frequencySelect.locator('option').count();
      expect(freqOptions).toBeGreaterThan(1);
      console.log(`${user.email}: Frequency has ${freqOptions} options`);

      // Try to save without filling — should show error
      const saveBtn = modal.locator('button', { hasText: 'Save' });
      await saveBtn.click();
      await page.waitForTimeout(300);

      const errorDiv = page.locator('[data-recurring-transfers-target="modalError"]');
      const errorVisible = await errorDiv.isVisible();
      expect(errorVisible).toBe(true);
      console.log(`${user.email}: Validation error shown on empty save`);

      // Cancel
      const cancelBtn = modal.locator('button', { hasText: 'Cancel' });
      await cancelBtn.click();
      await page.waitForTimeout(300);
      await expect(modal).toBeHidden();
      console.log(`${user.email}: Modal closed on cancel`);
    });

    test('API CRUD for recurring transfers', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      // Get accounts and frequencies
      const accounts = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/accounts`, { headers: { 'Accept': 'application/json' } });
        return res.json();
      }, BASE);
      expect(accounts.length).toBeGreaterThan(1);

      const frequencies = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/income_user_frequencies`, { headers: { 'Accept': 'application/json' } });
        return res.json();
      }, BASE);
      const activeFreqs = frequencies.filter(f => f.use_flag);
      expect(activeFreqs.length).toBeGreaterThan(0);

      const csrfToken = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
      });

      // CREATE
      const created = await page.evaluate(async (params) => {
        const res = await fetch(`${params.base}/api/recurring_transfers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-Token': params.csrf },
          body: JSON.stringify({ recurring_transfer: {
            from_account_id: params.fromId,
            to_account_id: params.toId,
            amount: '100.00',
            frequency_master_id: params.freqId,
            next_date: '2026-03-01',
            use_flag: true,
            memo: 'Test recurring transfer'
          }})
        });
        return { status: res.status, data: await res.json() };
      }, {
        base: BASE,
        csrf: csrfToken,
        fromId: accounts[0].id,
        toId: accounts[1].id,
        freqId: activeFreqs[0].frequency_master_id
      });
      expect(created.status).toBe(201);
      expect(created.data.id).toBeTruthy();
      expect(created.data.from_account_name).toBeTruthy();
      expect(created.data.to_account_name).toBeTruthy();
      expect(created.data.frequency_name).toBeTruthy();
      console.log(`${user.email}: Created recurring transfer #${created.data.id}`);

      // READ
      const listed = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/recurring_transfers`, { headers: { 'Accept': 'application/json' } });
        return res.json();
      }, BASE);
      const found = listed.find(r => r.id === created.data.id);
      expect(found).toBeTruthy();
      expect(parseFloat(found.amount)).toBe(100.00);
      console.log(`${user.email}: Listed ${listed.length} recurring transfers, found created one`);

      // UPDATE
      const updated = await page.evaluate(async (params) => {
        const res = await fetch(`${params.base}/api/recurring_transfers/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-Token': params.csrf },
          body: JSON.stringify({ recurring_transfer: { amount: '250.00', memo: 'Updated memo' } })
        });
        return { status: res.status, data: await res.json() };
      }, { base: BASE, csrf: csrfToken, id: created.data.id });
      expect(updated.status).toBe(200);
      expect(parseFloat(updated.data.amount)).toBe(250.00);
      expect(updated.data.memo).toBe('Updated memo');
      console.log(`${user.email}: Updated recurring transfer amount to $250`);

      // TOGGLE use_flag
      const toggled = await page.evaluate(async (params) => {
        const res = await fetch(`${params.base}/api/recurring_transfers/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-Token': params.csrf },
          body: JSON.stringify({ recurring_transfer: { use_flag: false } })
        });
        return { status: res.status, data: await res.json() };
      }, { base: BASE, csrf: csrfToken, id: created.data.id });
      expect(toggled.data.use_flag).toBe(false);
      console.log(`${user.email}: Toggled use_flag to false`);

      // DELETE (soft delete)
      const deleteRes = await page.evaluate(async (params) => {
        const res = await fetch(`${params.base}/api/recurring_transfers/${params.id}`, {
          method: 'DELETE',
          headers: { 'X-CSRF-Token': params.csrf }
        });
        return res.status;
      }, { base: BASE, csrf: csrfToken, id: created.data.id });
      expect(deleteRes).toBe(204);
      console.log(`${user.email}: Deleted recurring transfer`);

      // Verify deletion
      const afterDelete = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/recurring_transfers`, { headers: { 'Accept': 'application/json' } });
        return res.json();
      }, BASE);
      const stillThere = afterDelete.find(r => r.id === created.data.id);
      expect(stillThere).toBeUndefined();
      console.log(`${user.email}: Verified soft delete — record no longer in list`);
    });

    test('Tab navigation between Transfers and Recurring', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      // Start on Transfers page
      await page.goto(`${BASE}/transfer_masters`);
      await page.waitForTimeout(2000);

      // Click Recurring tab
      const tabBar = page.locator('.sticky .flex.space-x-6');
      const recurringTab = tabBar.locator('a', { hasText: 'Recurring' });
      await recurringTab.click();
      await page.waitForURL(/recurring_transfers/, { timeout: 10000 });

      // Verify we're on Recurring Transfers page
      const header = page.getByRole('heading', { name: 'Recurring Transfers' });
      await expect(header).toBeVisible();
      console.log(`${user.email}: Navigated to Recurring Transfers via tab`);

      // Click Transfers tab to go back
      const tabBar2 = page.locator('.sticky .flex.space-x-6');
      const transfersTab = tabBar2.locator('a', { hasText: 'Transfers' });
      await transfersTab.click();
      await page.waitForURL(/transfer_masters/, { timeout: 10000 });

      // Verify we're back on Transfers page
      const header2 = page.getByRole('heading', { name: 'Account Transfers' });
      await expect(header2).toBeVisible();
      console.log(`${user.email}: Navigated back to Transfers via tab`);
    });

    test('Screenshot', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);
      await page.goto(`${BASE}/recurring_transfers`);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `tests/screenshots/recurring-transfers-${user.email.split('@')[0]}.png`, fullPage: false });
      console.log(`${user.email}: Screenshot saved`);
    });
  });
}
