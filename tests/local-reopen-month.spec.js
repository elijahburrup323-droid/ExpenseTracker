// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', 'elijahburrup323@gmail.com');
  await page.fill('input[name="user[password]"]', 'Eli624462!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  // Dismiss What's New overlay if present
  const gotIt = page.locator('#whatsNewOverlay button:has-text("Got it")');
  if (await gotIt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gotIt.click();
  }
}

test.describe('Re-open Closed Month', () => {

  test('soft close status API returns is_reopened and has_prior_close fields', async ({ page }) => {
    await login(page);

    const result = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/soft_close/status`, {
        headers: { 'Accept': 'application/json' }
      });
      return await res.json();
    }, BASE);

    expect(result).toHaveProperty('is_reopened');
    expect(result).toHaveProperty('has_prior_close');
    expect(result).toHaveProperty('month_label');
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('summary');
    expect(typeof result.is_reopened).toBe('boolean');
    expect(typeof result.has_prior_close).toBe('boolean');
  });

  test('reopen API returns 409 when no prior closed month exists or already reopened', async ({ page }) => {
    await login(page);

    // First check current state
    const status = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/soft_close/status`, {
        headers: { 'Accept': 'application/json' }
      });
      return await res.json();
    }, BASE);

    // If no prior close exists, reopen should return 409
    if (!status.has_prior_close) {
      const result = await page.evaluate(async (base) => {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
        const res = await fetch(`${base}/api/soft_close/reopen`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-Token': csrf
          },
          body: JSON.stringify({})
        });
        return { status: res.status, body: await res.json() };
      }, BASE);

      expect(result.status).toBe(409);
      expect(result.body.error).toContain('REOPEN_BLOCKED');
    }

    // If already reopened, should also be blocked
    if (status.is_reopened) {
      const result = await page.evaluate(async (base) => {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
        const res = await fetch(`${base}/api/soft_close/reopen`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-Token': csrf
          },
          body: JSON.stringify({})
        });
        return { status: res.status, body: await res.json() };
      }, BASE);

      expect(result.status).toBe(409);
      expect(result.body.error).toBe('REOPEN_BLOCKED_ALREADY_REOPENED');
    }
  });

  test('soft close page loads and shows correct UI elements', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/soft_close`);
    await page.waitForLoadState('networkidle');

    // Page should have the soft close heading
    await expect(page.getByRole('heading', { name: 'Soft Close Month' })).toBeVisible();

    // Close button should exist
    const closeBtn = page.locator('[data-soft-close-target="closeButton"]');
    await expect(closeBtn).toBeVisible();

    // Status API provides data - checklist should render
    await page.waitForTimeout(2000); // Wait for first poll
    const checklistBody = page.locator('[data-soft-close-target="checklistBody"]');
    await expect(checklistBody).not.toContainText('Loading checklist...');
  });

  test('soft close page shows reopen button when prior closed month exists', async ({ page }) => {
    await login(page);

    // Check status first
    const status = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/soft_close/status`, {
        headers: { 'Accept': 'application/json' }
      });
      return await res.json();
    }, BASE);

    await page.goto(`${BASE}/soft_close`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for status poll

    const reopenSection = page.locator('[data-soft-close-target="reopenSection"]');

    if (status.has_prior_close && !status.is_reopened) {
      // Should show reopen button
      await expect(reopenSection).toBeVisible();
      await expect(page.locator('[data-soft-close-target="reopenButtonLabel"]')).toContainText('Re-open Prior Month');
    } else if (status.is_reopened) {
      // Should show yellow banner instead
      await expect(page.locator('[data-soft-close-target="reopenBanner"]')).toBeVisible();
      await expect(reopenSection).toBeHidden();
    }
  });

  test('navbar shows Re-open Prior Month when closed months exist', async ({ page }) => {
    await login(page);

    // Check if user has closed months
    const hasClosed = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/soft_close/status`, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      return data.has_prior_close;
    }, BASE);

    await page.goto(`${BASE}/soft_close`);
    await page.waitForLoadState('networkidle');

    const reopenNavItem = page.locator('nav a:has-text("Re-open Prior Month")');
    if (hasClosed) {
      await expect(reopenNavItem).toBeVisible();
    } else {
      await expect(reopenNavItem).toHaveCount(0);
    }
  });
});
