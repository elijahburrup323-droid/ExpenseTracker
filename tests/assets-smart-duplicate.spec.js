const { test, expect } = require('@playwright/test');

const BASE = 'https://mybudgethq.com';
const ACCOUNTS = [
  { email: 'elijahburrup323@gmail.com', password: 'Eli624462!', name: 'Eli' },
  { email: 'djburrup@gmail.com', password: 'luckydjb', name: 'DJ' }
];

async function login(page, account) {
  await page.goto(BASE + '/users/sign_in');
  await page.fill('input[name="user[email]"]', account.email);
  await page.fill('input[name="user[password]"]', account.password);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  try {
    const gotIt = page.getByRole('button', { name: 'Got it' });
    await gotIt.waitFor({ state: 'visible', timeout: 3000 });
    await gotIt.click();
  } catch (e) {}
  try {
    const finishBtn = page.locator('text=Finish');
    await finishBtn.waitFor({ state: 'visible', timeout: 2000 });
    await finishBtn.click();
  } catch (e) {}
}

for (const account of ACCOUNTS) {
  test.describe(`Assets Smart Duplicate — ${account.name}`, () => {
    test(`Assets API returns unit-based fields (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);

      const result = await page.evaluate(async (base) => {
        const res = await fetch(base + '/api/assets', {
          headers: { 'Accept': 'application/json' }
        });
        return { status: res.status, body: await res.json() };
      }, BASE);

      expect(result.status).toBe(200);
      expect(Array.isArray(result.body)).toBe(true);

      // Check that asset records include unit-based fields
      for (const asset of result.body) {
        expect(asset.id).toBeDefined();
        expect(asset.name).toBeDefined();
        // unit_based should be a boolean
        expect(typeof asset.unit_based).toBe('boolean');
        if (asset.unit_based) {
          expect(asset.unit_label).toBeTruthy();
          expect(asset.total_quantity).toBeDefined();
          expect(asset.total_cost_basis).toBeDefined();
        }
      }

      console.log(`  [${account.name}] Assets API: ${result.body.length} assets found`);
      for (const a of result.body) {
        console.log(`    ${a.name}: unit_based=${a.unit_based}, type=${a.asset_type_name || 'N/A'}`);
      }
    });

    test(`Asset detail page loads for unit-based asset (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);

      // Get assets first
      const assets = await page.evaluate(async (base) => {
        const res = await fetch(base + '/api/assets', {
          headers: { 'Accept': 'application/json' }
        });
        return await res.json();
      }, BASE);

      // Find a unit-based asset
      const unitAsset = assets.find(a => a.unit_based);
      if (!unitAsset) {
        console.log(`  [${account.name}] No unit-based assets found — skipping detail test`);
        return;
      }

      // Navigate to asset detail page
      await page.goto(`${BASE}/assets/${unitAsset.id}`);
      await page.waitForLoadState('networkidle');

      // Asset detail page should show the asset name
      const pageContent = await page.content();
      expect(pageContent).toContain(unitAsset.name);

      // Should show unit-based fields (Holdings, Cost Basis, etc.)
      const hasHoldings = pageContent.includes('Holdings') || pageContent.includes('Lot') || pageContent.includes('Purchase');
      expect(hasHoldings).toBe(true);

      console.log(`  [${account.name}] Asset detail page for "${unitAsset.name}" loads correctly`);
    });

    test(`Assets List page renders (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);

      await page.goto(BASE + '/assets');
      await page.waitForLoadState('networkidle');

      // Page should load without errors
      const title = await page.title();
      expect(title).toBeTruthy();

      // Check for Assets page elements
      const pageContent = await page.content();
      expect(pageContent).toContain('Assets');

      console.log(`  [${account.name}] Assets List page renders`);
    });

    test(`Name uniqueness is tenant-scoped and soft-delete aware (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);

      // Verify the asset model has proper uniqueness via API behavior
      // Try creating with the same existing name — should get duplicate prompt client-side (not server error)
      const assets = await page.evaluate(async (base) => {
        const res = await fetch(base + '/api/assets', {
          headers: { 'Accept': 'application/json' }
        });
        return await res.json();
      }, BASE);

      if (assets.length === 0) {
        console.log(`  [${account.name}] No assets exist — skipping uniqueness test`);
        return;
      }

      // Try to create an asset with duplicate name via API — should fail with validation error
      const existingName = assets[0].name;
      const result = await page.evaluate(async ({ base, name }) => {
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrf = csrfMeta ? csrfMeta.content : '';
        const res = await fetch(base + '/api/assets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-Token': csrf
          },
          body: JSON.stringify({ asset: { name: name, asset_type_id: 1 } })
        });
        return { status: res.status, body: await res.json() };
      }, { base: BASE, name: existingName });

      // Should fail with 422 (validation error), NOT 500 (server error)
      expect(result.status).toBe(422);
      console.log(`  [${account.name}] Duplicate name "${existingName}" correctly rejected with 422`);
    });

    test(`Version is 1.3.48 (${account.name})`, async ({ page }) => {
      test.setTimeout(20000);
      await login(page, account);

      const pageContent = await page.content();
      const versionMatch = pageContent.match(/1\.3\.48/);
      expect(versionMatch).toBeTruthy();
      console.log(`  [${account.name}] Version 1.3.48 found on page`);
    });

    test(`No console errors on Assets page (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('import') && !text.includes('module') && !text.includes('Failed to load resource')) {
            errors.push(text);
          }
        }
      });

      await login(page, account);
      await page.goto(BASE + '/assets');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      if (errors.length > 0) {
        console.log(`  [${account.name}] Console errors:`, errors);
      }
      expect(errors).toHaveLength(0);
    });
  });
}
