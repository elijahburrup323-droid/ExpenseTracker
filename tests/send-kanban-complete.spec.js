// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('send kanban completion email', async ({ page }) => {
  // Sign in as admin
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/\/mybudgethq\/dashboard/, { timeout: 15000 });

  // Dismiss What's New overlay
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }

  const subject = 'BudgetHQ Kanban Complete — All Open Items Processed (v1.3.10-v1.3.12)';
  const body = [
    'All Open Items have been processed and moved to Ready for QA.',
    '',
    'Versions deployed this session:',
    '- v1.3.10: Spending Limits — history-aware monthly limits with dashboard integration (CM-13)',
    '- v1.3.11: Acct Type Masters toggle + description, Quotes sorting, Dashboard drag-drop (CM-16, CM-20, CM-2, CM-3)',
    '- v1.3.12: Reports Menu screen + User Menu cleanup (CM-21, CM-22)',
    '',
    'All post-deploy tests passed on Chrome and Safari/WebKit.',
    '',
    'v1.3.12 is live at https://djburrup.com/mybudgethq',
    '',
    '— Claude Code',
  ].join('\\n');

  // Send to djburrup@gmail.com
  const url1 = `${BASE}/api/diagnose_send?email=djburrup@gmail.com&notify=${encodeURIComponent(subject)}&notify_body=${encodeURIComponent(body)}`;
  const res1 = await page.evaluate(async (url) => {
    const r = await fetch(url);
    return { status: r.status, body: await r.text() };
  }, url1);
  console.log('Email 1 (djburrup):', res1.status, res1.body.substring(0, 200));
  expect(res1.status).toBe(200);

  // Send to elijahdburrup@gmail.com
  const url2 = `${BASE}/api/diagnose_send?email=elijahdburrup@gmail.com&notify=${encodeURIComponent(subject)}&notify_body=${encodeURIComponent(body)}`;
  const res2 = await page.evaluate(async (url) => {
    const r = await fetch(url);
    return { status: r.status, body: await r.text() };
  }, url2);
  console.log('Email 2 (elijahdburrup):', res2.status, res2.body.substring(0, 200));
  expect(res2.status).toBe(200);
});
