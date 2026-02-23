const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('Send kanban completion email', async ({ page }) => {
  test.setTimeout(60000);

  // Login as admin
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.evaluate(() => {
    const overlay = document.getElementById('whatsNewOverlay');
    if (overlay) overlay.remove();
  });
  await page.waitForTimeout(2000);

  const subject = 'ET Kanban Complete – v1.3.18 CM-11 (02/22/2026)';
  const body = `All Open Items have been processed and moved to Ready for QA.

Items completed this session:
1. Dashboard Spending Overview 3-Column (CM-022226-01) — Responsive grid layout with tag column
2. Recurring Transfers — Tab interface + new screen with modal CRUD, bucket support, auto-generation (CM-022226-03)
3. Account Type Validation Fix — Fixed 'Account type must exist' error, auto-resolve from master (CM-022226-06)
4. Mobile Responsive Standard — overflow-x-auto on table wrappers for iPad portrait (CM-022226-07)

All items verified on production with both test accounts (Chromium + WebKit).

— Claude Code`;

  // Send to both emails
  for (const email of ['djburrup@gmail.com', 'elijahdburrup@gmail.com']) {
    const result = await page.evaluate(async (params) => {
      const url = `${params.base}/api/diagnose_send?email=${encodeURIComponent(params.email)}&notify=${encodeURIComponent(params.subject)}&notify_body=${encodeURIComponent(params.body)}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      return { status: res.status, data: await res.text() };
    }, { base: BASE, email, subject, body });

    console.log(`Sent to ${email}: status=${result.status}`);
    expect(result.status).toBe(200);
  }
});
