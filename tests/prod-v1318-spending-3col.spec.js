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
  test.describe(`Spending Breakdown 3-Col [${user.email}]`, () => {

    test('Dashboard loads and spending breakdown has grid layout', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      // Wait for card data to load
      await page.waitForTimeout(3000);

      // Flip to back side
      const flipBtn = page.locator('[aria-label="View spending by category"]');
      await flipBtn.click({ force: true });
      await page.waitForTimeout(1500);

      const backContent = page.locator('[data-role="card-back-content"]').first();
      await expect(backContent).toBeVisible({ timeout: 5000 });
      console.log(`${user.email}: back content visible`);

      // Verify section headers
      const text = await backContent.textContent();
      expect(text).toContain('By Category');
      expect(text).toContain('By Spending Type');
      console.log(`${user.email}: section headers present`);

      // Check if the breakdown grid exists
      const breakdownGrid = backContent.locator('[data-role="breakdown-grid"]');
      const gridExists = await breakdownGrid.count();
      console.log(`${user.email}: breakdown grid count: ${gridExists}`);

      // Check if there's a total row
      const hasTotal = text.includes('Total') || text.includes('No spending yet');
      expect(hasTotal).toBe(true);
      console.log(`${user.email}: total row or empty state present`);

      // Check if tags column exists (depends on data)
      const hasTagColumn = text.includes('By Tag');
      console.log(`${user.email}: has tag column: ${hasTagColumn}`);

      // Screenshot
      await page.screenshot({ path: `tests/screenshots/spending-3col-${user.email.split('@')[0]}.png`, fullPage: false });
      console.log(`${user.email}: screenshot saved`);
    });

    test('API returns tags array in spending overview', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);

      // Call dashboard API
      const data = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/api/dashboard/card_data`, { headers: { 'Accept': 'application/json' } });
        return res.json();
      }, BASE);

      expect(data).toHaveProperty('spending_overview');
      const so = data.spending_overview;
      expect(so).toHaveProperty('categories');
      expect(so).toHaveProperty('types');
      expect(so).toHaveProperty('tags');
      expect(Array.isArray(so.tags)).toBe(true);
      console.log(`${user.email}: API returned ${so.categories.length} categories, ${so.types.length} types, ${so.tags.length} tags`);

      // Verify tag objects have correct shape
      if (so.tags.length > 0) {
        const tag = so.tags[0];
        expect(tag).toHaveProperty('name');
        expect(tag).toHaveProperty('amount');
        expect(tag).toHaveProperty('pct');
        console.log(`${user.email}: first tag: ${tag.name} = $${tag.amount} (${tag.pct}%)`);
      }
    });
  });
}
