// Send completion email — Open Items is empty
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('Send completion email — all Open Items done', async ({ page }) => {
  // Login as admin
  await page.goto(`${BASE}/users/sign_in`);
  await page.locator('#user_email').fill('elijahburrup323@gmail.com');
  await page.locator('#user_password').fill('Eli624462!');
  await page.locator('input[type="submit"]').click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });

  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }

  const body = encodeURIComponent(
    'All Open Items for v1.3.18 have been completed and moved to Ready for QA.\n\n' +
    'Items completed this session:\n' +
    '1. SS Benefit Planner CM-1 — Full UI rework to match approved mockup\n' +
    '2. Account Type Masters CM-7 — Delete modal user-friendly messaging\n' +
    '3. Buckets CM-1 — Column reorder + sortable headers\n' +
    '4. Dashboard CM-8 — Spending Overview expand/collapse (already implemented, verified)\n\n' +
    'All items deployed to production and verified with both accounts (Elijah + DJ).'
  );

  // Send to djburrup@gmail.com
  const url1 = `${BASE}/api/diagnose_send?email=djburrup@gmail.com&notify=Open+Items+Complete+v1.3.18&notify_body=${body}`;
  const res1 = await page.evaluate(async (u) => {
    const r = await fetch(u);
    return { status: r.status, ok: r.ok };
  }, url1);
  console.log('Email to djburrup@gmail.com:', res1);
  expect(res1.ok).toBe(true);

  // Send to elijahdburrup@gmail.com
  const url2 = `${BASE}/api/diagnose_send?email=elijahdburrup@gmail.com&notify=Open+Items+Complete+v1.3.18&notify_body=${body}`;
  const res2 = await page.evaluate(async (u) => {
    const r = await fetch(u);
    return { status: r.status, ok: r.ok };
  }, url2);
  console.log('Email to elijahdburrup@gmail.com:', res2);
  expect(res2.ok).toBe(true);
});
