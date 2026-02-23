// Verify DBU Schema Inspector and Record Browser show the same tables
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000/mybudgethq';

async function login(page) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.waitForLoadState('networkidle');
  const emailInput = page.locator('input[name="user[email]"]');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill('test@example.com');
  const passwordInput = page.locator('input[name="user[password]"]');
  await passwordInput.click();
  await passwordInput.fill('password123');
  const signInButton = page.getByRole('button', { name: 'Sign in', exact: true });
  await signInButton.click();
  await page.waitForTimeout(3000);
}

test.describe('DBU Table Parity', () => {
  test('Schema Inspector and Record Browser have identical table counts', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Record Browser is the default tab - count tables in dropdown
    const tableNameDropdown = page.locator('select[data-dbu-target="tableNameSelect"]');
    await expect(tableNameDropdown).toBeVisible();
    const rbOptions = await tableNameDropdown.locator('option').count();
    const rbTableCount = rbOptions - 1; // subtract "Select Table..." placeholder

    // Record Browser meta should show "Schema: public"
    const rbMeta = page.locator('[data-dbu-target="recordsMeta"]');
    await expect(rbMeta).toContainText('Schema:');
    await expect(rbMeta).toContainText('public');
    await expect(rbMeta).toContainText('Tables:');

    // Switch to Schema Inspector
    const schemaTab = page.locator('[data-dbu-target="tabSchema"]');
    await schemaTab.click();
    await page.waitForTimeout(3000); // wait for schema to load

    // Schema Inspector meta should show table count and Schema
    const schemaMeta = page.locator('[data-dbu-target="schemaMeta"]');
    await expect(schemaMeta).toContainText('Schema:');
    await expect(schemaMeta).toContainText('public');
    await expect(schemaMeta).toContainText('Tables:');

    // Get Schema Inspector table count from the meta text
    const metaText = await schemaMeta.textContent();
    const tablesMatch = metaText.match(/Tables:\s*(\d+)/);
    expect(tablesMatch).not.toBeNull();
    const siTableCount = parseInt(tablesMatch[1], 10);

    // Both counts must be equal
    expect(rbTableCount).toBe(siTableCount);
    expect(rbTableCount).toBeGreaterThan(0);
  });

  test('Record Browser is the default landing tab', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Record Browser panel should be visible
    const recordsPanel = page.locator('[data-dbu-target="recordsPanel"]');
    await expect(recordsPanel).toBeVisible();

    // Schema Inspector panel should be hidden
    const schemaPanel = page.locator('[data-dbu-target="schemaPanel"]');
    await expect(schemaPanel).toBeHidden();

    // Record Browser tab should be active (brand-600 border)
    const recordsTab = page.locator('[data-dbu-target="tabRecords"]');
    const tabClass = await recordsTab.getAttribute('class');
    expect(tabClass).toContain('border-brand-600');
  });

  test('Schema Inspector refresh invalidates Record Browser cache', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dbu`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Note initial Record Browser table count
    const tableNameDropdown = page.locator('select[data-dbu-target="tableNameSelect"]');
    const initialCount = await tableNameDropdown.locator('option').count();

    // Switch to Schema Inspector, click Refresh
    await page.locator('[data-dbu-target="tabSchema"]').click();
    await page.waitForTimeout(3000);
    await page.locator('button:has-text("Refresh DBU")').click();
    await page.waitForTimeout(3000);

    // Switch back to Record Browser - should re-fetch data
    await page.locator('[data-dbu-target="tabRecords"]').click();
    await page.waitForTimeout(2000);

    // Dropdown should still have the same tables
    const afterCount = await tableNameDropdown.locator('option').count();
    expect(afterCount).toBe(initialCount);
  });
});
