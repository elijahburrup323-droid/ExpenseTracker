const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('Send completion email for v1.3.18 open items', async ({ page }) => {
  // Login as admin
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });

  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }

  const subject = encodeURIComponent('v1.3.18 Open Items Complete - All 10 CMs implemented');
  const body = encodeURIComponent(`All v1.3.18 Open Items have been implemented and moved to Ready for QA.

Items completed this session:
- CM-4: Spending by Type report
- CM-5: Account Balance History report
- CM-6: Income by Source report
- CM-7: Net Worth Report
- CM-8: Soft Close Summary report
- CM-9: Reconciliation Report
- CM-10: Recurring Payments CRUD with auto-generation engine

All items are in the Ready for QA folder.
Deploy is live at https://djburrup.com/mybudgethq`);

  // Send to djburrup@gmail.com
  const res1 = await page.evaluate(async ({ base, subj, bdy }) => {
    const r = await fetch(`${base}/api/diagnose_send?email=djburrup@gmail.com&notify=${subj}&notify_body=${bdy}`);
    return { status: r.status, text: await r.text() };
  }, { base: BASE, subj: subject, bdy: body });

  console.log('Email 1 (djburrup):', res1.status, res1.text);

  // Send to elijahdburrup@gmail.com
  const res2 = await page.evaluate(async ({ base, subj, bdy }) => {
    const r = await fetch(`${base}/api/diagnose_send?email=elijahdburrup@gmail.com&notify=${subj}&notify_body=${bdy}`);
    return { status: r.status, text: await r.text() };
  }, { base: BASE, subj: subject, bdy: body });

  console.log('Email 2 (elijahdburrup):', res2.status, res2.text);

  expect(res1.status).toBe(200);
  expect(res2.status).toBe(200);
});
