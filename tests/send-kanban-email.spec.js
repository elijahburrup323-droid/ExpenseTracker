const { test, expect } = require('@playwright/test');

const BASE = 'https://mybudgethq.com';

test('Send kanban completion email', async ({ page }) => {
  test.setTimeout(30000);

  // Login as Eli (budgethq_agent)
  await page.goto(BASE + '/users/sign_in');
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForTimeout(3000);

  // Send completion email via diagnose API (GET with query params)
  const subject = 'Open Items Complete — v1.3.39';
  const body = [
    'All Open Items for MyBudgetHQ have been completed and moved to Ready for QA.',
    '',
    'Completed items:',
    '',
    '1. Assets: Unit-Based Lot Tracking (v1.3.38) — verified on production',
    '   - Precious Metals and Crypto assets support quantity, unit label, purchase lots',
    '   - Asset Detail page has Purchase Lots tab with lot management',
    '   - Rollups (total quantity, cost basis) maintained automatically',
    '   - Net Worth integration working correctly',
    '   - All 18 verification tests passed for both accounts',
    '',
    '2. Text Scale: Sidebar Exclusion (v1.3.39)',
    '   - Text scaling (80-130%) now only affects main content area',
    '   - Replaced root html font-size scaling with CSS zoom on <main> element',
    '   - Sidebar <aside> sits outside zoom scope — completely unaffected',
    '   - Verified with Playwright: sidebar text stays fixed at all scale levels',
    '   - Main content zoom confirmed at correct values (1.3 at 130%)',
    '   - All 16 verification tests passed for both accounts',
    '',
    'Post-deploy verification (both accounts — Eli + DJ):',
    '- Login succeeds',
    '- Dashboard loads with data',
    '- Navigation menus functional',
    '- Payments, Accounts, Assets pages load correctly',
    '- No JavaScript console errors',
    '',
    '— Claude (Automated Kanban Workflow)'
  ].join('\n');

  const result = await page.evaluate(async ({ base, emailAddrs, notify, notifyBody }) => {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
    const params = new URLSearchParams({
      email: emailAddrs,
      notify: notify,
      notify_body: notifyBody
    });
    const r = await fetch(base + '/api/diagnose_send?' + params.toString(), {
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-CSRF-Token': csrf,
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    return { status: r.status, body: await r.text() };
  }, { base: BASE, emailAddrs: 'djburrup@gmail.com,elijahdburrup@gmail.com', notify: subject, notifyBody: body });

  console.log('Email result:', JSON.stringify(result));
  expect(result.status).toBe(200);
  const data = JSON.parse(result.body);
  expect(data.email.send_result).toContain('SUCCESS');
});
