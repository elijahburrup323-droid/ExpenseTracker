const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('Send kanban-complete email for v1.3.15', async ({ browser }) => {
  const page = await browser.newPage();

  // Login as admin
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/);

  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }

  const subject = encodeURIComponent('ET Kanban Complete — v1.3.15 Tags');
  const body = encodeURIComponent(
    'All open items have been processed and moved to Ready for QA.\n\n' +
    'Version: 1.3.15\n' +
    'Feature: Payment Tags system (CM-001)\n\n' +
    'Changes deployed:\n' +
    '• Tags CRUD maintenance screen under Payments menu\n' +
    '• Multi-select tag picker in Add/Edit Payment modal with quick-create\n' +
    '• Tag filter on Payments list with filtered totals\n' +
    '• Tag badges displayed on payment rows\n' +
    '• Color picker with 10 color options for tags\n\n' +
    'All post-deploy tests passed (28/28).\n' +
    'QA_MODE set to false. Ready for manual QA.'
  );

  // Send to both emails
  const emails = ['djburrup@gmail.com', 'elijahdburrup@gmail.com'];
  for (const email of emails) {
    const url = `${BASE}/api/diagnose_send?email=${encodeURIComponent(email)}&notify=${subject}&notify_body=${body}`;
    const result = await page.evaluate(async (fetchUrl) => {
      const resp = await fetch(fetchUrl);
      return { status: resp.status, text: await resp.text() };
    }, url);
    console.log(`Email to ${email}: ${result.status} — ${result.text}`);
  }

  await page.close();
});
