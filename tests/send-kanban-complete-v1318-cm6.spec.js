// Send completion email — all Open Items processed for 2026-02-21 batch
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('Send kanban completion email', async ({ page }) => {
  // Login as admin
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });

  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }

  const subject = encodeURIComponent('ET Kanban — All Open Items Complete (2026-02-21)');
  const body = encodeURIComponent(
    'All Open Items for the 2026-02-21 batch have been deployed and moved to Ready for QA.\n\n' +
    'Completed items:\n' +
    '  CM-022126-01: Dashboard Spending Overview expand fix\n' +
    '  CM-022126-02: Dashboard Spending Overview expand button\n' +
    '  CM-022126-03: Dashboard Buckets card grouped by account\n' +
    '  CM-022126-04: Buckets Priority column + account row banding\n' +
    '  CM-022126-05: Account Type Masters soft-delete fix\n' +
    '  CM-022126-06: Transfers bucket badge per-side\n' +
    '  CM-022126-07: Admin Legal Page Maintenance\n' +
    '  CM-022126-08: SS Benefit Planner UI improvements\n' +
    '  CM-022126-06: All 9 report tables — sortable column headers\n\n' +
    'Version: 1.3.18 (SEQ 29)\n' +
    'All items verified on production with Playwright tests (chromium + webkit, both accounts).'
  );

  // Send to djburrup@gmail.com
  const res1 = await page.evaluate(async ({ base, subject, body }) => {
    const url = `${base}/api/diagnose_send?email=djburrup@gmail.com&notify=${subject}&notify_body=${body}`;
    const res = await fetch(url);
    return { status: res.status, text: await res.text() };
  }, { base: BASE, subject, body });

  console.log('Email to djburrup@gmail.com:', res1.status, res1.text);
  expect(res1.status).toBe(200);

  // Send to elijahdburrup@gmail.com
  const res2 = await page.evaluate(async ({ base, subject, body }) => {
    const url = `${base}/api/diagnose_send?email=elijahdburrup@gmail.com&notify=${subject}&notify_body=${body}`;
    const res = await fetch(url);
    return { status: res.status, text: await res.text() };
  }, { base: BASE, subject, body });

  console.log('Email to elijahdburrup@gmail.com:', res2.status, res2.text);
  expect(res2.status).toBe(200);
});
