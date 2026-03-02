const { test, expect } = require('@playwright/test');

const BASE = 'https://mybudgethq.com';

test('Send kanban completion email', async ({ page }) => {
  test.setTimeout(30000);

  // Login first to get auth cookies
  await page.goto(BASE + '/users/sign_in');
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  try {
    const gotIt = page.getByRole('button', { name: 'Got it' });
    await gotIt.waitFor({ state: 'visible', timeout: 5000 });
    await gotIt.click();
  } catch (e) {}

  const subject = 'Kanban Complete — All Open Items Done (v1.3.41)';
  const body = [
    'All Open Items for MyBudgetHQ have been completed and moved to Ready for QA.',
    '',
    'Completed item:',
    '',
    '1. Dashboard: State Persistence Enhancements (MyBudgetHQ_Modifications_022726_1) — v1.3.41',
    '   - Extended sessionStorage state to include month/year and scroll positions',
    '   - Increased state expiry from 30 min to 2 hours for realistic sessions',
    '   - Re-clicking Dashboard while on it resets to canonical 6-card landing state',
    '   - Month restored client-side as safety net for server PUT race conditions',
    '   - Scroll positions saved per card container and restored after data fetch',
    '',
    'All items deployed to production (mybudgethq.com) and verified with:',
    '  - elijahburrup323@gmail.com (Eli)',
    '  - djburrup@gmail.com (DJ)',
    '',
    'Post-deploy checks passed: login, dashboard data presence, navigation,',
    'state persistence (AC1 flip + AC3 reset), no JS console errors,',
    'regression check on Accounts + Payments pages.',
    '',
    '— Claude Code',
  ].join('\n');

  const result = await page.evaluate(async ({ base, emails, notify, notifyBody }) => {
    const params = new URLSearchParams({ email: emails, notify, notify_body: notifyBody });
    const r = await fetch(base + '/api/diagnose_send?' + params.toString(), {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    });
    return { status: r.status, body: await r.text() };
  }, { base: BASE, emails: 'djburrup@gmail.com,elijahdburrup@gmail.com', notify: subject, notifyBody: body });

  console.log('Email send result:', result.status, result.body);
  expect(result.status).toBe(200);
  expect(result.body).toContain('SUCCESS');
});
