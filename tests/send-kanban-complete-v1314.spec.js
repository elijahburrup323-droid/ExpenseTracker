// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('Send completion email — Open Items empty', async ({ page }) => {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|reports/);

  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }

  const subject = 'BudgetHQ v1.3.14 — All Open Items Complete';
  const body = [
    'All items in the Open Items queue have been completed and moved to Ready for QA.',
    '',
    'Completed in v1.3.14 (CM-16):',
    '• New Spending by Category report — category breakdown with icon, spending type, amount, percentage, and transaction count',
    '• Report options popup with Regular and Comparison modes (same pattern as Monthly Cash Flow)',
    '• Comparison mode shows previous month variance ($, %) and optional YTD totals per category',
    '• Print button generates clean, print-optimized report with BudgetHQ branding and repeating headers',
    '• Report registered in reports table and accessible from Monthly > Reports menu',
    '• Monthly Cash Flow upgraded with options modal (Regular vs Comparison mode)',
    '',
    'Please QA at: https://djburrup.com/mybudgethq/reports/spending_by_category',
  ].join('\\n');

  const emails = ['djburrup@gmail.com', 'elijahdburrup@gmail.com'];

  for (const email of emails) {
    const url = `${BASE}/api/diagnose_send?email=${encodeURIComponent(email)}&notify=${encodeURIComponent(subject)}&notify_body=${encodeURIComponent(body)}`;
    const result = await page.evaluate(async (url) => {
      const res = await fetch(url);
      return { status: res.status, body: await res.text() };
    }, url);

    console.log(`Email to ${email}: status=${result.status}`);
    expect(result.status).toBeLessThan(300);
  }
});
