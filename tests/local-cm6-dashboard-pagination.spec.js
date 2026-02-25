const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';

const accounts = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!', name: 'Eli' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb', name: 'DJ' },
];

async function login(page, acct) {
  await page.goto(BASE + '/users/sign_in');
  await page.fill('input[name="user[email]"]', acct.email);
  await page.fill('input[name="user[password]"]', acct.pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  try {
    const gotIt = page.getByRole('button', { name: 'Got it' });
    await gotIt.waitFor({ state: 'visible', timeout: 5000 });
    await gotIt.click();
    await page.waitForTimeout(500);
  } catch (e) {}
}

for (const acct of accounts) {
  test.describe(`CM-6 Dashboard Pagination: ${acct.name}`, () => {

    test(`Dashboard loads with consistent card heights (${acct.name})`, async ({ page }) => {
      await login(page, acct);
      await page.waitForTimeout(2000);

      // Verify dashboard loaded
      const cards = page.locator('[data-dashboard-target="slotWrapper"]');
      const count = await cards.count();
      console.log(`${acct.name}: Dashboard has ${count} cards`);
      expect(count).toBeGreaterThanOrEqual(3);

      // Check that the Recent Payments card content has max-height: 320px
      const recentContent = page.locator('[data-card-type="recent_activity"] [data-role="card-content"]');
      if (await recentContent.count() > 0) {
        const maxHeight = await recentContent.evaluate(el => el.style.maxHeight);
        console.log(`${acct.name}: Recent Payments maxHeight = ${maxHeight}`);
        expect(maxHeight).toBe('320px');
      }
    });

    test(`Recent Payments shows limited rows with Load More (${acct.name})`, async ({ page }) => {
      await login(page, acct);
      await page.waitForTimeout(2000);

      const recentContent = page.locator('[data-card-type="recent_activity"] [data-role="card-content"]');
      if (await recentContent.count() === 0) {
        console.log(`${acct.name}: No recent_activity card found, skipping`);
        return;
      }

      const items = recentContent.locator('li:not([data-role="load-more-sentinel"])');
      const itemCount = await items.count();
      console.log(`${acct.name}: Recent Payments shows ${itemCount} items initially`);
      expect(itemCount).toBeLessThanOrEqual(11); // 10 items + possible empty message

      // Check for Load More button
      const loadMore = recentContent.locator('[data-role="load-more-sentinel"]');
      const hasLoadMore = await loadMore.count() > 0;
      const totalCount = await recentContent.getAttribute('data-total-count');
      console.log(`${acct.name}: Total payments = ${totalCount}, has Load More = ${hasLoadMore}`);

      if (parseInt(totalCount) > 10) {
        expect(hasLoadMore).toBe(true);
        const btnText = await loadMore.textContent();
        console.log(`${acct.name}: Load More text = "${btnText.trim()}"`);
        expect(btnText).toContain('remaining');
      }
    });

    test(`Load More fetches additional payments (${acct.name})`, async ({ page }) => {
      await login(page, acct);
      await page.waitForTimeout(2000);

      const recentContent = page.locator('[data-card-type="recent_activity"] [data-role="card-content"]');
      if (await recentContent.count() === 0) return;

      const loadMore = recentContent.locator('[data-role="load-more-sentinel"] button');
      if (await loadMore.count() === 0) {
        console.log(`${acct.name}: No Load More button (fewer than 10 payments), skipping`);
        return;
      }

      const beforeCount = await recentContent.locator('li:not([data-role="load-more-sentinel"])').count();
      console.log(`${acct.name}: Items before Load More = ${beforeCount}`);

      await loadMore.click();
      await page.waitForTimeout(2000);

      const afterCount = await recentContent.locator('li:not([data-role="load-more-sentinel"])').count();
      console.log(`${acct.name}: Items after Load More = ${afterCount}`);
      expect(afterCount).toBeGreaterThan(beforeCount);

      // Check pagination state updated
      const currentPage = await recentContent.getAttribute('data-current-page');
      console.log(`${acct.name}: Current page after load = ${currentPage}`);
      expect(parseInt(currentPage)).toBeGreaterThanOrEqual(2);
    });

    test(`Recent Activity API pagination works (${acct.name})`, async ({ page }) => {
      await login(page, acct);

      // Test page 1
      const res1 = await page.request.get(BASE + '/api/dashboard/recent_activity_page?month=2&year=2026&page=1');
      expect(res1.status()).toBe(200);
      const data1 = await res1.json();
      console.log(`${acct.name}: Page 1 - ${data1.recent.length} items, total=${data1.total_count}, has_more=${data1.has_more}`);
      expect(data1.recent.length).toBeLessThanOrEqual(10);
      expect(data1).toHaveProperty('total_count');
      expect(data1).toHaveProperty('has_more');

      if (data1.has_more) {
        // Test page 2
        const res2 = await page.request.get(BASE + '/api/dashboard/recent_activity_page?month=2&year=2026&page=2');
        expect(res2.status()).toBe(200);
        const data2 = await res2.json();
        console.log(`${acct.name}: Page 2 - ${data2.recent.length} items`);
        expect(data2.recent.length).toBeGreaterThan(0);
        expect(data2.page).toBe(2);
      }
    });

    test(`No JS errors on dashboard (${acct.name})`, async ({ page }) => {
      const errors = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      await login(page, acct);
      await page.waitForTimeout(3000);
      const criticalErrors = errors.filter(e => e.includes('500') || e.includes('loadMore') || e.includes('recentActivity'));
      if (criticalErrors.length > 0) console.log(`${acct.name}: Critical errors:`, criticalErrors);
      expect(criticalErrors.length).toBe(0);
      console.log(`${acct.name}: Dashboard - no critical JS errors`);
    });
  });
}
