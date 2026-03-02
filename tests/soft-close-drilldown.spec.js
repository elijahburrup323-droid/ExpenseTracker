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
  // Dismiss any popups
  try {
    const gotIt = page.getByRole('button', { name: 'Got it' });
    await gotIt.waitFor({ state: 'visible', timeout: 3000 });
    await gotIt.click();
  } catch (e) {}
  // Close first-login wizard if present
  try {
    const finishBtn = page.locator('text=Finish');
    await finishBtn.waitFor({ state: 'visible', timeout: 2000 });
    await finishBtn.click();
  } catch (e) {}
}

for (const account of ACCOUNTS) {
  test.describe(`Soft Close Drill-Down — ${account.name}`, () => {
    test(`Checklist API returns enriched items with links and messages (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);

      // Fetch soft close status API directly
      const result = await page.evaluate(async (base) => {
        const res = await fetch(base + '/api/soft_close/status', {
          headers: { 'Accept': 'application/json' }
        });
        return { status: res.status, body: await res.json() };
      }, BASE);

      expect(result.status).toBe(200);
      expect(result.body.items).toBeDefined();
      expect(result.body.items.length).toBe(7);

      // Verify structure of each item
      for (const item of result.body.items) {
        expect(item.key).toBeDefined();
        expect(item.label).toBeDefined();
        expect(typeof item.passed).toBe('boolean');
        expect(typeof item.auto).toBe('boolean');
      }

      // Verify keys match expected set
      const keys = result.body.items.map(i => i.key);
      expect(keys).toContain('no_unsaved_edits');
      expect(keys).toContain('recurrings_processed');
      expect(keys).toContain('payments_accounts');
      expect(keys).toContain('payments_complete');
      expect(keys).toContain('deposits_complete');
      expect(keys).toContain('transfers_valid');
      expect(keys).toContain('dates_in_range');

      // Failing items should have link and user_message
      for (const item of result.body.items) {
        if (!item.passed && item.key !== 'no_unsaved_edits' && item.key !== 'dates_in_range') {
          expect(item.link).toBeTruthy();
          expect(item.user_message).toBeTruthy();
          expect(item.link).toContain('sc_fix=');
        }
      }

      console.log(`  [${account.name}] Checklist items:`, result.body.items.map(i =>
        `${i.key}: ${i.passed ? 'PASS' : 'FAIL'}${i.link ? ' -> ' + i.link : ''}`
      ).join('\n    '));
    });

    test(`Soft Close page renders clickable checklist rows (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);

      await page.goto(BASE + '/soft_close');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-soft-close-target="checklistBody"]', { timeout: 15000 });

      // Wait for checklist to load (polling interval is 5s)
      await page.waitForFunction(() => {
        const body = document.querySelector('[data-soft-close-target="checklistBody"]');
        return body && !body.textContent.includes('Loading');
      }, {}, { timeout: 20000 });

      // Check that checklist items rendered
      const itemCount = await page.locator('[data-soft-close-target="checklistBody"] > *').count();
      expect(itemCount).toBe(7);

      // Check that any failing items are rendered as <a> tags (clickable)
      const failedLinks = await page.locator('[data-soft-close-target="checklistBody"] > a').count();
      const passedDivs = await page.locator('[data-soft-close-target="checklistBody"] > div').count();
      expect(failedLinks + passedDivs).toBe(7);

      // If there are clickable rows, verify they have proper attributes
      if (failedLinks > 0) {
        const firstLink = page.locator('[data-soft-close-target="checklistBody"] > a').first();
        const href = await firstLink.getAttribute('href');
        const ariaLabel = await firstLink.getAttribute('aria-label');
        expect(href).toContain('sc_fix=');
        expect(ariaLabel).toContain('Fix:');
        console.log(`  [${account.name}] ${failedLinks} failing item(s) are clickable links`);
      } else {
        console.log(`  [${account.name}] All checklist items passed — no clickable links expected`);
      }

      // Verify green items are NOT links
      const greenDivs = page.locator('[data-soft-close-target="checklistBody"] > div');
      for (let i = 0; i < await greenDivs.count(); i++) {
        const tagName = await greenDivs.nth(i).evaluate(el => el.tagName);
        expect(tagName).toBe('DIV');
      }
    });

    test(`Soft Close Fix banner renders on destination page (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);

      // Navigate to transfers with sc_fix params to test the banner
      await page.goto(BASE + '/transfer_masters?sc_fix=transfers_valid&ids=99999');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#sc-fix-banner', { timeout: 15000 });

      const bannerText = await page.locator('#sc-fix-banner').textContent();
      expect(bannerText).toContain('Soft Close Fix');
      expect(bannerText).toContain('Back to Soft Close Month');
      expect(bannerText).toContain('transfer');

      // Verify back link
      const backLink = page.locator('#sc-fix-banner a[href="/soft_close"]');
      await expect(backLink).toBeVisible();

      // Verify dismiss button works
      const dismissBtn = page.locator('#sc-fix-banner button');
      await dismissBtn.click();
      await expect(page.locator('#sc-fix-banner')).toHaveCount(0);

      console.log(`  [${account.name}] Transfer fix banner: renders, has back link, dismissable`);
    });

    test(`Payments fix banner renders with date filtering (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);

      await page.goto(BASE + '/payments?sc_fix=payments_accounts&ids=99999&start_date=2026-03-01&end_date=2026-03-31');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#sc-fix-banner', { timeout: 15000 });

      const bannerText = await page.locator('#sc-fix-banner').textContent();
      expect(bannerText).toContain('Soft Close Fix');
      expect(bannerText).toContain('account');

      console.log(`  [${account.name}] Payments fix banner: renders with correct message`);
    });

    test(`Deposits fix banner renders (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);

      await page.goto(BASE + '/income_entries?sc_fix=deposits_complete&ids=99999');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#sc-fix-banner', { timeout: 15000 });

      const bannerText = await page.locator('#sc-fix-banner').textContent();
      expect(bannerText).toContain('Soft Close Fix');
      expect(bannerText).toContain('deposits');

      console.log(`  [${account.name}] Deposits fix banner: renders`);
    });

    test(`Recurring deposits fix banner renders (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      await login(page, account);

      await page.goto(BASE + '/income_recurrings?sc_fix=recurrings_processed');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#sc-fix-banner', { timeout: 15000 });

      const bannerText = await page.locator('#sc-fix-banner').textContent();
      expect(bannerText).toContain('Soft Close Fix');
      expect(bannerText).toContain('Recurring');

      console.log(`  [${account.name}] Recurrings fix banner: renders`);
    });

    test(`Version is 1.3.46 (${account.name})`, async ({ page }) => {
      test.setTimeout(20000);
      await login(page, account);

      // Check version from the page (shown in sidebar or footer)
      const pageContent = await page.content();
      const versionMatch = pageContent.match(/1\.3\.46/);
      expect(versionMatch).toBeTruthy();
      console.log(`  [${account.name}] Version 1.3.46 found on page`);
    });

    test(`No console errors on Soft Close page (${account.name})`, async ({ page }) => {
      test.setTimeout(30000);
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Ignore known WebKit false positives
          if (!text.includes('import') && !text.includes('module') && !text.includes('Failed to load resource')) {
            errors.push(text);
          }
        }
      });

      await login(page, account);
      await page.goto(BASE + '/soft_close');
      await page.waitForTimeout(6000); // Wait for at least one poll cycle

      if (errors.length > 0) {
        console.log(`  [${account.name}] Console errors:`, errors);
      }
      expect(errors).toHaveLength(0);
    });
  });
}
