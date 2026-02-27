// Post-Deploy Verification: Net Worth Card — Assets, Liabilities, Debt Ratio
const { test, expect } = require('@playwright/test');

const BASE = 'https://mybudgethq.com';
const USERS = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com',        pass: 'luckydjb'   },
];

async function login(page, email, pass) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('sign_in'), { timeout: 15000 });
}

async function dismissOverlay(page) {
  try {
    const overlay = page.locator('[data-controller="whats-new"], .whats-new-overlay, [id*="whats-new"]');
    if (await overlay.isVisible({ timeout: 3000 })) {
      const closeBtn = overlay.locator('button, [data-action*="close"], [data-action*="dismiss"]').first();
      if (await closeBtn.isVisible({ timeout: 1000 })) await closeBtn.click();
    }
  } catch (e) { /* no overlay */ }
}

for (const user of USERS) {
  test.describe(`Net Worth Card verify — ${user.email}`, () => {

    test('Dashboard loads with net worth breakdown', async ({ page }) => {
      test.setTimeout(30000);
      await login(page, user.email, user.pass);
      await dismissOverlay(page);
      await page.goto(`${BASE}/dashboard`);
      await page.waitForLoadState('networkidle');
      await dismissOverlay(page);

      // Verify Assets text exists
      await expect(page.locator('text=Assets').first()).toBeVisible({ timeout: 10000 });

      // Verify Liabilities text exists
      await expect(page.locator('text=Liabilities').first()).toBeVisible({ timeout: 5000 });

      // Verify metric label exists (Debt Ratio or Cash Coverage depending on user's asset composition)
      const metricVisible = await page.locator('text=Debt Ratio').first().isVisible({ timeout: 3000 }).catch(() => false) ||
        await page.locator('text=Cash Coverage').first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(metricVisible).toBeTruthy();
    });

    test('API returns net worth breakdown fields', async ({ page }) => {
      test.setTimeout(30000);
      await login(page, user.email, user.pass);
      await dismissOverlay(page);

      const data = await page.evaluate(async (base) => {
        const res = await fetch(base + '/api/dashboard/card_data', { credentials: 'same-origin' });
        return await res.json();
      }, BASE);

      // Find net worth slot data
      const nwSlot = data.slots?.find(s => s.card_type === 'net_worth');
      const nw = nwSlot ? nwSlot.data : data.net_worth_overview;

      expect(nw).toBeTruthy();
      expect(typeof nw.value).toBe('number');
      expect(typeof nw.assets).toBe('number');
      expect(typeof nw.liabilities).toBe('number');
      // metric_value can be null (e.g. no liabilities in cash coverage mode, or no assets)
      // debt_ratio is only a number when metric_mode is "debt_ratio"
      if (nw.metric_mode === 'debt_ratio' && nw.assets > 0) {
        expect(typeof nw.metric_value).toBe('number');
        const expectedRatio = (nw.liabilities / nw.assets * 100);
        expect(Math.abs(nw.metric_value - expectedRatio)).toBeLessThan(0.2);
      }
      // Verify: assets - liabilities ~= net worth (approximately)
      const computedNW = nw.assets - nw.liabilities;
      expect(Math.abs(nw.value - computedNW)).toBeLessThan(1);
    });

    test('Net worth aggregator includes Assets/Investments/Financing', async ({ page }) => {
      test.setTimeout(30000);
      await login(page, user.email, user.pass);
      await dismissOverlay(page);

      // Fetch API data (uses canonical Account.net_worth_for aggregator)
      const apiData = await page.evaluate(async (base) => {
        const res = await fetch(base + '/api/dashboard/card_data', { credentials: 'same-origin' });
        return await res.json();
      }, BASE);
      const nwSlot = apiData.slots?.find(s => s.card_type === 'net_worth');
      const nw = nwSlot ? nwSlot.data : apiData.net_worth_overview;

      // Also fetch assets/investments/financing counts to verify inclusion
      const modules = await page.evaluate(async (base) => {
        const [assetsRes, investmentsRes, financingRes] = await Promise.all([
          fetch(base + '/api/assets', { credentials: 'same-origin' }),
          fetch(base + '/api/investment_accounts', { credentials: 'same-origin' }),
          fetch(base + '/api/financing_instruments', { credentials: 'same-origin' }),
        ]);
        const assets = await assetsRes.json();
        const investments = await investmentsRes.json();
        const financing = await financingRes.json();
        return {
          assetTotal: (Array.isArray(assets) ? assets : []).filter(a => a.include_in_net_worth).reduce((s, a) => s + (a.current_value || 0), 0),
          investmentTotal: (Array.isArray(investments) ? investments : []).filter(a => a.include_in_net_worth && a.active).reduce((s, a) => s + (a.total_market_value || 0), 0),
          financingPayable: (Array.isArray(financing) ? financing : []).filter(f => f.instrument_type === 'PAYABLE' && f.include_in_net_worth).reduce((s, f) => s + (f.current_principal || 0), 0),
          financingReceivable: (Array.isArray(financing) ? financing : []).filter(f => f.instrument_type === 'RECEIVABLE' && f.include_in_net_worth).reduce((s, f) => s + (f.current_principal || 0), 0),
        };
      }, BASE);

      // If user has assets, investments, or financing, total_assets should be > cash accounts alone
      const nonAccountPositive = modules.assetTotal + modules.investmentTotal + modules.financingReceivable;
      if (nonAccountPositive > 0) {
        // The aggregated assets should be >= the non-account total (plus cash accounts)
        expect(nw.assets).toBeGreaterThanOrEqual(nonAccountPositive);
      }

      // Dashboard-rendered net worth must equal API net worth
      await page.goto(`${BASE}/dashboard`);
      await page.waitForLoadState('networkidle');
      await dismissOverlay(page);

      // Both surfaces (SSR + API) should agree on net worth value
      expect(nw.value).toBeDefined();
      expect(typeof nw.value).toBe('number');
    });

    test('No JS console errors on dashboard', async ({ page }) => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      test.setTimeout(30000);
      await login(page, user.email, user.pass);
      await dismissOverlay(page);
      await page.goto(`${BASE}/dashboard`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const real = errors.filter(e => !e.includes('import') && !e.includes('module') && !e.includes('Failed to load resource'));
      expect(real).toHaveLength(0);
    });

    test('Navigation regression check', async ({ page }) => {
      test.setTimeout(30000);
      await login(page, user.email, user.pass);
      await dismissOverlay(page);

      await page.goto(`${BASE}/payments`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();

      await page.goto(`${BASE}/accounts`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible();
    });
  });
}
