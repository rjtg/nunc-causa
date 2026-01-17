import { test, expect } from "@playwright/test";

test("issue search owner badge does not navigate away", async ({ page }) => {
  const apiBaseUrl = process.env.PW_API_BASE_URL ?? "http://localhost:4011";

  await page.addInitScript((baseUrl) => {
    window.localStorage.setItem("causa.baseUrl", baseUrl);
    window.localStorage.setItem("causa.username", "dev");
    window.localStorage.setItem("causa.password", "dev");
  }, apiBaseUrl);

  await page.goto("/issues");

  const issueCard = page.locator('a[href="/issues/BEACON-1"]').first();
  await expect(issueCard).toBeVisible({ timeout: 15000 });
  const ownerButton = issueCard.getByRole("button", { name: /change owner/i }).first();
  await expect(ownerButton).toBeVisible();
  await ownerButton.dispatchEvent("click");

  await expect(page).toHaveURL(/\/issues$/);
});
