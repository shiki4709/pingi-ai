import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("landing page loads with hero text", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("Show up early")
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Sound like yourself")).toBeVisible();
  });

  test("auth page loads with Google sign-in", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /start free/i }).first().click();
    await page.waitForURL(/\/auth/, { timeout: 15_000 });
    await expect(
      page.getByText(/create your account/i)
    ).toBeVisible({ timeout: 10_000 });
    // Supabase Auth UI renders a Google button
    await expect(
      page.getByRole("button", { name: /google/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("pricing page shows $19 and trial button", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("$19").first()).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /start 3-day free trial/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("dashboard redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/auth/, { timeout: 15_000 });
    await expect(page.getByText(/create your account/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("onboarding redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForURL(/\/auth/, { timeout: 15_000 });
    await expect(page.getByText(/create your account/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
