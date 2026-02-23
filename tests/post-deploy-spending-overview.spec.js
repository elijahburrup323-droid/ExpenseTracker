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

for (const user of USERS) {
  test.describe(`Spending Overview [${user.email}]`, () => {

    test('Dashboard loads and spending breakdown has grid layout', async ({ page }) => {
      test.setTimeout(60000);
      await login(page, user);
      await expect(page).toHaveURL(/dashboard/);
      console.log(`${user.email}: dashboard loaded`);

      // Wait for AJAX card data to load
      await page.waitForTimeout(3000);

      // Flip the spending overview card to see breakdown
      const flipBtn = page.locator('[aria-label="View spending by category"]');
      await flipBtn.click({ force: true });
      await page.waitForTimeout(1500);

      // Check the back side content
      const backContent = page.locator('[data-role="card-back-content"]').first();
      await expect(backContent).toBeVisible({ timeout: 5000 });

      // Verify section headers with uppercase tracking
      await expect(backContent.locator('text=BY CATEGORY')).toBeVisible();
      await expect(backContent.locator('text=BY SPENDING TYPE')).toBeVisible();
      console.log(`${user.email}: section headers OK`);

      // Check back-side text content
      const text = await backContent.textContent();
      console.log(`${user.email}: back content snippet: "${text.substring(0, 120).trim()}"`);

      // Verify grid structure exists (either data rows or "No spending yet")
      const hasGrid = text.includes('Total') || text.includes('No spending yet');
      expect(hasGrid).toBe(true);
      console.log(`${user.email}: content structure OK`);

      // Screenshot
      await page.screenshot({ path: `tests/screenshots/spending-breakdown-${user.email.split('@')[0]}.png`, fullPage: false });
      console.log(`${user.email}: screenshot saved`);
    });
  });
}
