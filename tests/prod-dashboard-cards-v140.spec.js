// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'https://mybudgethq.com';

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
  // Wait for JS API refresh to complete
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

// === SECTION 1: Initial page load checks (independent tests) ===

test('pulse strip shows metric pills', async ({ page }) => {
  await login(page);
  const strip = page.locator('[data-dashboard-target="pulseStrip"]');
  await expect(strip).toBeVisible();
  const pills = strip.locator('[data-pulse-metric]');
  expect(await pills.count()).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < await pills.count(); i++) {
    await expect(pills.nth(i).locator('[data-pulse-value]')).toBeVisible();
  }
});

test('no expand icons or report icons', async ({ page }) => {
  await login(page);
  await expect(page.locator('[data-role="expand-btn"]')).toHaveCount(0);
  await expect(page.locator('[data-icon="expand"]')).toHaveCount(0);
  await expect(page.locator('.dash-card a[aria-label*="report"], .dash-card a[aria-label*="Report"]')).toHaveCount(0);
});

test('flip hint labels visible on all 6 cards', async ({ page }) => {
  await login(page);
  await expect(page.locator('text="Account Detail"').first()).toBeVisible();
  await expect(page.locator('text="Account History"').first()).toBeVisible();
  await expect(page.locator('text="Net Worth Breakdown"').first()).toBeVisible();
  await expect(page.locator('text="Category Breakdown"').first()).toBeVisible();
  await expect(page.locator('text="Recent Deposits"').first()).toBeVisible();
  await expect(page.locator('text="Bucket History"').first()).toBeVisible();
});

// === SECTION 2: Card-specific content after JS render ===

test('BUG1: accounts card shows grouped rows (not "Total Cash")', async ({ page }) => {
  await login(page);
  const card = page.locator('[data-card-type="accounts_overview"]');
  const front = card.locator('[data-role="front-content"]');
  await expect(front).toBeVisible();

  // After JS render, should NOT show "Total Cash" (old format)
  const totalCash = await front.locator(':text("Total Cash")').count();
  expect(totalCash).toBe(0);

  // Should have account type group headers (uppercase text) and individual account rows
  // The grouped format shows account names as individual rows
  const innerText = await front.innerText();
  // Should NOT contain "Across X liquid account" (that's the old format)
  expect(innerText).not.toContain('liquid account');
});

test('BUG2a: net worth card shows colored change arrow (not plain text)', async ({ page }) => {
  await login(page);
  const card = page.locator('[data-card-type="net_worth"]');
  const content = card.locator('[data-role="card-content"]');
  await expect(content).toBeVisible();

  const innerHtml = await content.innerHTML();
  // Should NOT contain "Change this month:" (old plain format)
  expect(innerHtml).not.toContain('Change this month:');

  // Should contain triangle arrow characters (▲ = 9650 or ▼ = 9660)
  const hasArrow = innerHtml.includes('▲') || innerHtml.includes('▼') ||
                   innerHtml.includes('&#9650;') || innerHtml.includes('&#9660;') ||
                   innerHtml.includes('\u25B2') || innerHtml.includes('\u25BC');
  expect(hasArrow).toBe(true);
});

test('BUG2b: net worth card shows sparkline SVG', async ({ page }) => {
  await login(page);
  const card = page.locator('[data-card-type="net_worth"]');
  const content = card.locator('[data-role="card-content"]');
  const svg = content.locator('svg');
  expect(await svg.count()).toBeGreaterThanOrEqual(1);
});

test('spending overview shows red spent + green cash', async ({ page }) => {
  await login(page);
  const card = page.locator('[data-card-type="spending_overview"]');
  await expect(card).toBeVisible();

  // Check for red and green colored amounts in the front
  const html = await card.locator('[data-role="front"]').innerHTML();
  expect(html).toContain('text-red-');
  expect(html).toContain('text-emerald-');
});

test('income & spending shows two-tone bar', async ({ page }) => {
  await login(page);
  const card = page.locator('[data-card-type="income_spending"]');
  await expect(card).toBeVisible();

  const html = await card.locator('[data-role="front"]').innerHTML();
  // Should have green and red bar segments
  expect(html).toContain('bg-emerald-500');
  expect(html).toContain('bg-red-500');
});

test('recent payments total in red', async ({ page }) => {
  await login(page);
  const card = page.locator('[data-card-type="recent_activity"]');
  await expect(card).toBeVisible();
  const html = await card.locator('[data-role="front"]').innerHTML();
  expect(html).toContain('text-red-500');
});

test('card flip works — click hint, back appears', async ({ page }) => {
  await login(page);
  const nwCard = page.locator('[data-card-type="net_worth"]');
  const flipBtn = nwCard.locator('button:has-text("Net Worth Breakdown")');
  await expect(flipBtn).toBeVisible();
  await flipBtn.click();
  await page.waitForTimeout(800);

  // Back side should show content
  const back = nwCard.locator('[data-role="back"]');
  const backText = await back.innerText();
  expect(backText.length).toBeGreaterThan(10);
});

// === SECTION 3: Month navigation regression tests ===

test('CRITICAL: month nav preserves accounts grouped format', async ({ page }) => {
  await login(page);
  const card = page.locator('[data-card-type="accounts_overview"]');
  const front = card.locator('[data-role="front-content"]');

  // Navigate back one month
  await page.locator('[data-dashboard-target="prevBtn"]').first().click();
  await page.waitForTimeout(2500);

  // After month nav, should NOT show "Total Cash" (old format)
  const innerText = await front.innerText();
  const hasTotalCash = innerText.includes('Total Cash');
  expect(hasTotalCash).toBe(false);
});

test('CRITICAL: month nav preserves net worth colored arrows', async ({ page }) => {
  await login(page);
  const card = page.locator('[data-card-type="net_worth"]');
  const content = card.locator('[data-role="card-content"]');

  // Navigate back
  await page.locator('[data-dashboard-target="prevBtn"]').first().click();
  await page.waitForTimeout(2500);

  const html = await content.innerHTML();
  // Should NOT have plain "Change this month:" text
  expect(html).not.toContain('Change this month:');
});

test('CRITICAL: month nav preserves pulse strip pill structure', async ({ page }) => {
  await login(page);
  const strip = page.locator('[data-dashboard-target="pulseStrip"]');
  expect(await strip.locator('[data-pulse-metric]').count()).toBeGreaterThanOrEqual(2);

  // Navigate back
  await page.locator('[data-dashboard-target="prevBtn"]').first().click();
  await page.waitForTimeout(2500);

  // Pills should still exist
  expect(await strip.locator('[data-pulse-metric]').count()).toBeGreaterThanOrEqual(2);
  // Values should not be empty
  const values = strip.locator('[data-pulse-value]');
  for (let i = 0; i < await values.count(); i++) {
    const text = await values.nth(i).textContent();
    expect(text.trim().length).toBeGreaterThan(0);
  }
});
