// @ts-check
// Send completion email — all Open Items processed
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('Send completion email', async ({ page }) => {
  // Login as admin
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await Promise.all([
    page.waitForURL(/\/mybudgethq\/dashboard/, { timeout: 15000 }),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  try {
    await gotIt.waitFor({ state: 'visible', timeout: 4000 });
    await gotIt.click();
    await page.waitForTimeout(500);
  } catch { /* no overlay */ }

  const subject = 'MyBudgetHQ — All Open Items Complete (v1.3.8)';
  const body = [
    'All Open Items have been processed and deployed to production.',
    '',
    'Completed in this session:',
    '- CM-11: Payments default sort changed to Date DESC (newest first)',
    '- CM-12: Payments description autocomplete with typeahead suggestions',
    '',
    'Current version: v1.3.8',
    'All items moved to Ready for QA.',
  ].join('\\n');

  // Send to both recipients
  const emails = ['djburrup@gmail.com', 'elijahdburrup@gmail.com'];

  for (const email of emails) {
    const url = `${BASE}/api/diagnose_send?email=${encodeURIComponent(email)}&notify=${encodeURIComponent(subject)}&notify_body=${encodeURIComponent(body)}`;
    const result = await page.evaluate(async (fetchUrl) => {
      const res = await fetch(fetchUrl);
      return { status: res.status, body: await res.text() };
    }, url);
    console.log(`Email to ${email}: status=${result.status}`);
    expect(result.status).toBe(200);
  }
});
