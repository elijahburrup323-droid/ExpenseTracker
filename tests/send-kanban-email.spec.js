const { test, expect } = require("@playwright/test");

const PROD_BASE = "https://djburrup.com/mybudgethq";
const ACCOUNT = { email: "elijahburrup323@gmail.com", password: "Eli624462!" };

async function login(page, email, password) {
  await page.goto(`${PROD_BASE}/users/sign_in`);
  await page.fill('input[name="user[email]"]', email);
  await page.fill('input[name="user[password]"]', password);
  await Promise.all([
    page.waitForURL(`${PROD_BASE}/dashboard`),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test("Send kanban notification email", async ({ page }) => {
  await login(page, ACCOUNT.email, ACCOUNT.password);

  const recipients = "djburrup@gmail.com,Elijahdburrup@gmail.com";
  const subject = "All Items Are Done. Ready for More";
  const body = "All Items Are Done. Ready for More.\n\nThe BudgetHQ Open Items folder is empty. All items have been completed and moved to Ready for QA.";

  const url = `${PROD_BASE}/api/diagnose_send?email=${encodeURIComponent(recipients)}&notify=${encodeURIComponent(subject)}&notify_body=${encodeURIComponent(body)}`;

  const response = await page.goto(url);
  const json = await response.json();

  console.log("Response:", JSON.stringify(json, null, 2));

  // Check email send result
  expect(json.email.send_result).toContain("SUCCESS");
});
