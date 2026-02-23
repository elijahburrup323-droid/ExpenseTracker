const { test, expect } = require("@playwright/test");

const LOCAL_BASE = "http://localhost:3000/mybudgethq";

async function login(page) {
  await page.goto(`${LOCAL_BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', "test@example.com");
  await page.fill('input[name="user[password]"]', "password123");
  await Promise.all([
    page.waitForURL(`${LOCAL_BASE}/dashboard`),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);
}

const viewports = [
  { name: "iPad-Pro-12.9-portrait", width: 1024, height: 1366 },
  { name: "iPad-Pro-12.9-landscape", width: 1366, height: 1024 },
  { name: "iPad-10.9-portrait", width: 820, height: 1180 },
  { name: "iPad-10.9-landscape", width: 1180, height: 820 },
  { name: "iPhone-14-Pro-Max", width: 430, height: 932 },
  { name: "iPhone-12-Mini", width: 375, height: 812 },
];

for (const vp of viewports) {
  test(`Screenshot: ${vp.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    await page.goto(`${LOCAL_BASE}/users/sign_in`);
    await page.fill('input[name="user[email]"]', "test@example.com");
    await page.fill('input[name="user[password]"]', "password123");
    await Promise.all([
      page.waitForURL(`${LOCAL_BASE}/dashboard`),
      page.click('input[type="submit"], button[type="submit"]'),
    ]);

    await page.goto(`${LOCAL_BASE}/payments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `test-results/payments-${vp.name}.png`,
      fullPage: true,
    });

    await context.close();
  });
}
