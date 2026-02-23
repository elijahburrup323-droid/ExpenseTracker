// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const DJ_EMAIL = 'djburrup@gmail.com';
const DJ_PASS = 'luckydjb';

test('Send Kanban completion email', async ({ page }) => {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', DJ_EMAIL);
  await page.fill('input[name="user[password]"]', DJ_PASS);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/);

  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }

  const subject = 'BudgetHQ v1.3.13 — All Open Items Complete';
  const body = `All items from the Open Items queue have been implemented, deployed, and moved to Ready for QA.\n\nCompleted items in this session (v1.3.13):\n- CM-9: Reconciliation Collapsible Groups\n- CM-11: Reports/Dashboard Grid Layout Fix\n- CM-12: Reports Monthly Cash Flow Routing Fix\n\nPreviously completed (also v1.3.13):\n- CM-23: Reports Maintenance Admin Screen\n- CM-7: Account Types View All + Edit Description\n- CM-8: Monthly Cash Flow Report\n\nAll verified on production with Playwright tests (both accounts, Chromium + WebKit).\n\nOpen Items folder is now empty.`;

  const djRes = await page.evaluate(async (params) => {
    const url = `${params.base}/api/diagnose_send?email=${encodeURIComponent(params.to)}&notify=${encodeURIComponent(params.subject)}&notify_body=${encodeURIComponent(params.body)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    return { status: res.status, ok: res.ok };
  }, { base: BASE, to: 'djburrup@gmail.com', subject, body });

  console.log('DJ email response:', djRes);
  expect(djRes.ok).toBe(true);

  const eliRes = await page.evaluate(async (params) => {
    const url = `${params.base}/api/diagnose_send?email=${encodeURIComponent(params.to)}&notify=${encodeURIComponent(params.subject)}&notify_body=${encodeURIComponent(params.body)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    return { status: res.status, ok: res.ok };
  }, { base: BASE, to: 'elijahdburrup@gmail.com', subject, body });

  console.log('Eli email response:', eliRes);
  expect(eliRes.ok).toBe(true);
});
