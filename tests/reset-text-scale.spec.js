const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb' }
];

async function login(page, user) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', user.email);
  await page.fill('input[name="user[password]"]', user.pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|mybudgethq/, { timeout: 30000 });
  await page.evaluate(() => {
    const overlay = document.getElementById('whatsNewOverlay');
    if (overlay) overlay.remove();
  });
}

for (const user of USERS) {
  test(`Reset text scale to 100% [${user.email}]`, async ({ page }) => {
    test.setTimeout(45000);
    await login(page, user);
    await page.waitForTimeout(2000);

    // Reset via API
    const csrfToken = await page.evaluate(() => {
      return document.querySelector('meta[name="csrf-token"]')?.content;
    });

    const result = await page.evaluate(async (token) => {
      const resp = await fetch('/mybudgethq/api/text_scale', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify({ text_scale_percent: 100 })
      });
      return { status: resp.status, body: await resp.json() };
    }, csrfToken);

    console.log(`${user.email}: reset result:`, JSON.stringify(result));
    expect(result.status).toBe(200);
    expect(result.body.text_scale_percent).toBe(100);
  });
}
