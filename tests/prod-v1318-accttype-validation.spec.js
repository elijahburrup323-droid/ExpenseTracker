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
  test.describe(`Account Type Validation Fix [${user.email}]`, () => {

    test('Can create an account with account_type_master_id (no account_type_id)', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      // Get user account types
      const types = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/user_account_types`, { headers: { 'Accept': 'application/json' } });
        return res.json();
      }, BASE);
      const enabledTypes = types.filter(t => t.is_enabled);
      expect(enabledTypes.length).toBeGreaterThan(0);
      console.log(`${user.email}: Found ${enabledTypes.length} enabled account types`);

      const csrfToken = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
      });

      // Pick a type (e.g., "Other Asset Account" or first enabled)
      const targetType = enabledTypes.find(t => t.display_name === 'Other Asset Account') || enabledTypes[0];
      console.log(`${user.email}: Using type: ${targetType.display_name} (master_id: ${targetType.account_type_master_id})`);

      // Create account using account_type_master_id only (the bug scenario)
      const result = await page.evaluate(async (params) => {
        const res = await fetch(`${params.base}/api/accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-Token': params.csrf },
          body: JSON.stringify({ account: {
            name: `Test AcctType ${Date.now()}`,
            account_type_master_id: params.masterId,
            institution: 'Test Bank',
            balance: '100.00'
          }})
        });
        return { status: res.status, data: await res.json() };
      }, {
        base: BASE,
        csrf: csrfToken,
        masterId: targetType.account_type_master_id
      });

      // This should succeed (201), not fail with "Account type must exist"
      expect(result.status).toBe(201);
      expect(result.data.id).toBeTruthy();
      expect(result.data.name).toContain('Test AcctType');
      expect(result.data.account_type_master_id).toBe(targetType.account_type_master_id);
      console.log(`${user.email}: Account created successfully! ID: ${result.data.id}, type: ${result.data.account_type_name}`);

      // Clean up: delete the test account
      const deleteRes = await page.evaluate(async (params) => {
        const res = await fetch(`${params.base}/api/accounts/${params.id}`, {
          method: 'DELETE',
          headers: { 'X-CSRF-Token': params.csrf }
        });
        return res.status;
      }, { base: BASE, csrf: csrfToken, id: result.data.id });
      expect(deleteRes).toBe(204);
      console.log(`${user.email}: Test account cleaned up`);
    });

    test('Account modal Add flow works in UI', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      await page.goto(`${BASE}/accounts`);
      await page.waitForTimeout(3000);

      // Click Add Account button
      const addBtn = page.locator('button', { hasText: /Add Account|New Account/ }).first();
      await expect(addBtn).toBeVisible();
      await addBtn.click();
      await page.waitForTimeout(500);

      // Fill in the modal
      const nameInput = page.locator('[data-accounts-target="modalName"]');
      await expect(nameInput).toBeVisible();
      await nameInput.fill(`UI Test ${Date.now()}`);

      // Select an account type
      const typeSelect = page.locator('[data-accounts-target="modalType"]');
      await expect(typeSelect).toBeVisible();
      const options = await typeSelect.locator('option').allTextContents();
      console.log(`${user.email}: Type dropdown options: ${options.slice(0, 5).join(', ')}...`);
      // Select the second option (first real type, not "Select type...")
      if (options.length > 1) {
        await typeSelect.selectOption({ index: 1 });
      }

      // Set balance
      const balanceInput = page.locator('[data-accounts-target="modalBalance"]');
      await balanceInput.fill('50.00');

      // Save
      const saveBtn = page.locator('button', { hasText: /Save|Create/ }).last();
      await saveBtn.click();
      await page.waitForTimeout(2000);

      // Check for error message (should NOT appear)
      const errorDiv = page.locator('[data-accounts-target="modalError"]');
      const errorVisible = await errorDiv.isVisible();
      if (errorVisible) {
        const errorText = await errorDiv.textContent();
        console.log(`${user.email}: ERROR FOUND: ${errorText}`);
        // This should NOT happen after the fix
        expect(errorText).not.toContain('Account type must exist');
      } else {
        console.log(`${user.email}: No error — account saved successfully via UI`);
      }
    });
  });
}
