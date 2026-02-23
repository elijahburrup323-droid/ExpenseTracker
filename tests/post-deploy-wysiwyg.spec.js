const { test, expect } = require('@playwright/test');

const BASE = 'https://djburrup.com/mybudgethq';
const USERS = [
  { email: 'elijahburrup323@gmail.com', pass: 'Eli624462!' },
  { email: 'djburrup@gmail.com', pass: 'luckydjb' }
];

const LEGAL_PAGES = [
  { slug: 'privacy', title: 'Privacy Policy' },
  { slug: 'terms', title: 'Terms of Service' }
];

async function login(page, user) {
  await page.goto(`${BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', user.email);
  await page.fill('input[name="user[password]"]', user.pass);
  await page.click('input[type="submit"], button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.evaluate(() => {
    const overlay = document.getElementById('whatsNewOverlay');
    if (overlay) overlay.remove();
  });
  await page.waitForTimeout(1000);
}

test.describe.configure({ mode: 'serial' });

for (const user of USERS) {
  test.describe(`WYSIWYG Legal Pages [${user.email}]`, () => {

    for (const lp of LEGAL_PAGES) {
      test(`${lp.title} admin page loads with Quill editor`, async ({ page }) => {
        test.setTimeout(60000);
        await login(page, user);

        const response = await page.goto(`${BASE}/admin/legal/${lp.slug}`);
        expect(response.status()).toBe(200);
        await page.waitForTimeout(3000);

        // Verify page title (second h1 — first is layout header "Hello ...")
        const pageTitle = await page.textContent('body');
        expect(pageTitle).toContain(`${lp.title} Maintenance`);
        console.log(`${user.email}: ${lp.title} admin page loaded`);

        // Verify Quill CSS is loaded
        const quillCss = await page.evaluate(() => {
          return !!document.querySelector('link[href*="quill"]');
        });
        expect(quillCss).toBe(true);
        console.log(`${user.email}: Quill CSS loaded`);

        // Verify Quill JS is available
        const quillAvailable = await page.evaluate(() => typeof Quill !== 'undefined');
        expect(quillAvailable).toBe(true);
        console.log(`${user.email}: Quill JS available`);

        // Click "Add Section" to open modal
        await page.locator('button:has-text("Add Section")').click();
        await page.waitForTimeout(1000);

        // Verify Quill editor is visible in modal
        const quillEditor = page.locator('.ql-editor');
        await expect(quillEditor).toBeVisible({ timeout: 5000 });
        console.log(`${user.email}: Quill editor visible in modal`);

        // Verify toolbar is visible
        const toolbar = page.locator('.ql-toolbar');
        await expect(toolbar).toBeVisible();
        console.log(`${user.email}: Quill toolbar visible`);

        // Verify "Show HTML" toggle exists
        const htmlToggle = page.locator('[data-legal-page-admin-target="htmlToggle"]');
        await expect(htmlToggle).toBeVisible();
        const toggleText = await htmlToggle.textContent();
        expect(toggleText.trim()).toBe('Show HTML');
        console.log(`${user.email}: HTML toggle present`);

        // Verify label says "Section Body" NOT "Section Body (HTML)"
        const labels = await page.locator('label').allTextContents();
        const bodyLabel = labels.find(l => l.includes('Section Body'));
        expect(bodyLabel).not.toContain('(HTML)');
        console.log(`${user.email}: label updated — no "(HTML)"`);

        // Click "Show HTML" to switch to raw mode
        await htmlToggle.click();
        await page.waitForTimeout(500);

        // Verify textarea is now visible, Quill is hidden
        const textarea = page.locator('[data-legal-page-admin-target="modalBody"]');
        await expect(textarea).toBeVisible();
        console.log(`${user.email}: HTML textarea visible after toggle`);

        // Click toggle back to editor
        const toggleAfter = await htmlToggle.textContent();
        expect(toggleAfter.trim()).toBe('Show Editor');
        await htmlToggle.click();
        await page.waitForTimeout(500);

        // Verify Quill is visible again
        await expect(quillEditor).toBeVisible();
        console.log(`${user.email}: Quill editor restored after toggle back`);

        // Close modal
        await page.locator('button:has-text("Cancel")').first().click();

        // Screenshot
        await page.screenshot({ path: `tests/screenshots/wysiwyg-${lp.slug}-${user.email.split('@')[0]}.png` });
        console.log(`${user.email}: ${lp.title} WYSIWYG test complete`);
      });
    }

    test('Public legal pages still render', async ({ page }) => {
      test.setTimeout(45000);
      await page.goto(`${BASE}/pages/privacy`);
      await page.waitForTimeout(2000);
      const ppContent = await page.textContent('body');
      expect(ppContent.length).toBeGreaterThan(100);
      console.log(`${user.email}: privacy policy public page OK`);

      await page.goto(`${BASE}/pages/terms`);
      await page.waitForTimeout(2000);
      const tosContent = await page.textContent('body');
      expect(tosContent.length).toBeGreaterThan(100);
      console.log(`${user.email}: terms of service public page OK`);
    });
  });
}
