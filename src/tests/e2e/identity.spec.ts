import { test, expect } from "@playwright/test";

test("local identity create, lock and unlock uses the current routes", async ({ page }) => {
  await page.goto("/demo/identity/create");
  await page.getByTestId("identity-dialog-mnemonic-confirmed").check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const password = "only-a-browser-test-identity";
  await page.getByTestId("identity-dialog-password").fill(password);
  await page.getByTestId("identity-dialog-password-confirm").fill(password);
  await page.getByTestId("identity-dialog-mfa-enabled").uncheck();
  await page.getByTestId("identity-dialog-create-submit").click();
  await expect(page.getByRole("button", { name: "Lock identity" })).toBeVisible();
  await page.getByRole("button", { name: "Lock identity" }).click();
  await page.getByTestId("identity-dialog-unlock-password").fill(password);
  await page.getByTestId("identity-dialog-unlock-submit").click();
  await expect(page.getByRole("button", { name: "Lock identity" })).toBeVisible();
});
