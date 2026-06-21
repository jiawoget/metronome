import { expect, test } from "@playwright/test";

test("app shell home navigation works on desktop and mobile without console errors", async ({ page }) => {
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
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
  await expect(page.getByTestId("mobile-bottom-nav")).toBeHidden();
  await expect(page.getByText("Today Practice Summary")).toBeVisible();
  await expect(page.getByText(/No recent practice session yet/i)).toBeVisible();
  await expect(page.getByText(/No sheets imported yet/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Import Sheet" })).toBeVisible();
  await expect(page.getByText(/Opens the Sheet Library import flow/i)).toBeVisible();
  await expect(page.getByText(/Quick takes appear after recording/i)).toBeVisible();
  await expect(page.getByText(/No recording or playback active/i).first()).toBeVisible();

  const sidebar = page.getByTestId("desktop-sidebar");
  await expect(sidebar.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("diagnostics-panel")).toBeVisible();

  await page.getByRole("button", { name: "Hide devtools for this session" }).click();
  await expect(page.getByTestId("diagnostics-panel")).toHaveCount(0);
  await expect(page.getByTestId("diagnostics-restore")).toBeVisible();
  await expect(page.getByRole("button", { name: "Restore diagnostics" })).toBeVisible();

  await page.getByRole("button", { name: "Restore diagnostics" }).click();
  await expect(page.getByTestId("diagnostics-panel")).toBeVisible();
  await expect(page.getByTestId("diagnostics-restore")).toHaveCount(0);

  await page.getByRole("link", { name: "Open Quick Metronome" }).click();
  await expect(page).toHaveURL(/\/quick-metronome$/);
  await expect(page.getByRole("heading", { name: "Quick Metronome" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Quick Metronome" })).toHaveAttribute("aria-current", "page");

  await sidebar.getByRole("link", { name: "Home" }).click();
  await page.getByRole("link", { name: "Import Sheet" }).click();
  await expect(page).toHaveURL(/\/sheet-library$/);
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
  await expect(page.getByText(/Import Sheet entry lands here/i)).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Sheet Library" })).toHaveAttribute("aria-current", "page");

  await sidebar.getByRole("link", { name: "Sheet Library" }).click();
  await expect(page).toHaveURL(/\/sheet-library$/);
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();

  await sidebar.getByRole("link", { name: "Sheet Practice" }).click();
  await expect(page).toHaveURL(/\/sheet-practice$/);
  await expect(page.getByRole("heading", { name: "Sheet Practice" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Sheet Practice" })).toHaveAttribute("aria-current", "page");

  await sidebar.getByRole("link", { name: "Recordings" }).click();
  await expect(page).toHaveURL(/\/recordings$/);
  await expect(page.getByRole("heading", { name: "Recordings" })).toBeVisible();

  await sidebar.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  await expect(page.getByTestId("desktop-sidebar")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("desktop-sidebar")).toBeHidden();
  await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  const mobileNav = page.getByTestId("mobile-bottom-nav");
  await mobileNav.getByLabel("Quick Metronome").click();
  await expect(page).toHaveURL(/\/quick-metronome$/);
  await expect(page.getByRole("heading", { name: "Quick Metronome" })).toBeVisible();
  await expect(mobileNav.getByLabel("Quick Metronome")).toHaveAttribute("aria-current", "page");

  await mobileNav.getByLabel("Sheet Practice").click();
  await expect(page).toHaveURL(/\/sheet-practice$/);
  await expect(page.getByRole("heading", { name: "Sheet Practice" })).toBeVisible();
  await expect(mobileNav.getByLabel("Sheet Practice")).toHaveAttribute("aria-current", "page");

  await mobileNav.getByLabel("Recordings").click();
  await expect(page).toHaveURL(/\/recordings$/);
  await expect(page.getByRole("heading", { name: "Recordings" })).toBeVisible();

  await mobileNav.getByLabel("Settings").click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
