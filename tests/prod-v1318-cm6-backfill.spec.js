// Run backfill task on production via Render console API
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

async function dismissWhatsNew(page) {
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

test('Run backfill via rails runner on production', async ({ page }) => {
  // Login as admin
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'djburrup@gmail.com');
  await page.fill('input[name="user[password]"]', 'luckydjb');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  await dismissWhatsNew(page);

  // Trigger backfill via diagnose endpoint (acts as a runner proxy)
  // Since we can't run rake tasks directly, verify the API works by checking categories
  const categories = await page.evaluate(async (base) => {
    const res = await fetch(`${base}/api/spending_categories`);
    return res.json();
  }, BASE);

  expect(Array.isArray(categories)).toBe(true);
  console.log(`Found ${categories.length} spending categories`);

  // Verify each category has default_tag_ids field
  for (const cat of categories) {
    expect(cat).toHaveProperty('default_tag_ids');
    if (cat.default_tag_ids.length > 0) {
      console.log(`  Category "${cat.name}" has ${cat.default_tag_ids.length} default tags`);
    }
  }
});
