// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';

test('Create release notes for v1.3.14 on production', async ({ page }) => {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard|reports/);

  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }

  const entries = [
    { screen_name: "Reports", description: "New Spending by Category report with Regular and Comparison modes, print support (CM-16)" },
    { screen_name: "Reports", description: "Report options popup for Spending by Category matching Monthly Cash Flow pattern (CM-16)" },
    { screen_name: "Reports", description: "Monthly Cash Flow upgraded with options modal — Regular vs Comparison mode with variance and YTD (CM-16)" },
  ];

  for (const entry of entries) {
    const result = await page.evaluate(async ({ base, entry }) => {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      const res = await fetch(`${base}/api/bug_reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({ bug_report: { screen_name: entry.screen_name, description: entry.description, processed_date: new Date().toISOString().split('T')[0] } })
      });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    }, { base: BASE, entry });

    console.log(`Created: ${entry.description} (status: ${result.status})`);
    expect(result.status).toBeLessThan(300);
  }
});
