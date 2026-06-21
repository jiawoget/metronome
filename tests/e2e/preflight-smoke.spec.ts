import { expect, test } from "@playwright/test";

test("preflight shell renders on desktop and mobile without console errors", async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Metronome Practice" })).toBeVisible();
  await expect(page.getByText("Smoke-ready shell")).toBeVisible();
  await expect(page.getByText(/Product modules are intentionally unavailable/i)).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("main", { name: "Metronome Practice" })).toBeVisible();
  await expect(page.getByText("Foundation Boundaries")).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
