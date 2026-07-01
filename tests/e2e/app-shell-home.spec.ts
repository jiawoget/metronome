import { expect, test, type Page } from "@playwright/test";

import { importTestSheet } from "./fixtures/sheets";
import {
  clearDatabases,
  clearRecordingHistory,
  PRACTICE_SESSION_DB_NAME,
  SHEET_LIBRARY_DB_NAME
} from "./fixtures/storage";

async function seedMissingSheetActivity(page: Page) {
  await page.evaluate(
    (databaseName) =>
      new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName);

        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;

          if (!database.objectStoreNames.contains("sessions")) {
            database.close();
            reject(new Error("Practice sessions store is not available."));
            return;
          }

          const transaction = database.transaction(["sessions"], "readwrite");

          transaction.objectStore("sessions").put({
            id: "home-missing-sheet-session",
            sourceType: "sheet",
            sheetId: "home-deleted-sheet",
            startedAt: "2026-06-21T10:00:00.000Z",
            endedAt: null,
            durationMs: 90_000,
            bpm: 84,
            timeSignature: "3/4",
            recordingCount: 0,
            latestRecordingId: null,
            updatedAt: "2026-06-21T10:01:00.000Z",
            segmentContext: null
          });
          transaction.oncomplete = () => {
            database.close();
            window.dispatchEvent(new Event("practice-session-change"));
            resolve();
          };
          transaction.onerror = () => {
            database.close();
            reject(transaction.error);
          };
        };
      }),
    PRACTICE_SESSION_DB_NAME
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    )
    .toBe(true);
}

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
  await expect(page.getByRole("region", { name: "Recent Activity" })).toBeVisible();
  await expect(page.getByText("No local practice activity yet.")).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "No sheet selected" })).toBeVisible();
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
  await expect(page.getByRole("region", { name: "Recent Activity" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("desktop-sidebar")).toBeHidden();
  await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Recent Activity" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const mobileNav = page.getByTestId("mobile-bottom-nav");
  await mobileNav.getByLabel("Quick Metronome").click();
  await expect(page).toHaveURL(/\/quick-metronome$/);
  await expect(page.getByRole("heading", { name: "Quick Metronome" })).toBeVisible();
  await expect(mobileNav.getByLabel("Quick Metronome")).toHaveAttribute("aria-current", "page");

  await mobileNav.getByLabel("Sheet Practice").click();
  await expect(page).toHaveURL(/\/sheet-practice$/);
  await expect(page.getByRole("heading", { name: "No sheet selected" })).toBeVisible();
  await expect(mobileNav.getByLabel("Sheet Practice")).toHaveAttribute("aria-current", "page");

  await mobileNav.getByLabel("Recordings").click();
  await expect(page).toHaveURL(/\/recordings$/);
  await expect(page.getByRole("heading", { name: "Recordings" })).toBeVisible();

  await mobileNav.getByLabel("Settings").click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("home recent activity renders persisted rows as read-only across responsive viewports", async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  await page.goto("/");
  await clearRecordingHistory(page);
  await clearDatabases(page, [PRACTICE_SESSION_DB_NAME, SHEET_LIBRARY_DB_NAME]);
  await page.goto("/quick-metronome");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByText("Metronome playing.")).toBeVisible();
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByText("Metronome stopped.")).toBeVisible();

  const { sheetId } = await importTestSheet(page, {
    name: "Recent Activity Sheet",
    bpm: "72",
    timeSignature: "4/4"
  });

  await page.goto(`/sheet-practice/${sheetId}`);
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-session-source")).toHaveText("sheet");
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Stopped");
  await seedMissingSheetActivity(page);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Recent Activity" });

  await expect(panel).toBeVisible();
  await expect(panel.getByText("Quick Practice", { exact: true })).toBeVisible();
  await expect(panel.getByText("Recent Activity Sheet", { exact: true })).toBeVisible();
  await expect(panel.getByText("Deleted sheet", { exact: true })).toBeVisible();
  await expect(panel.getByText("Status: Quick practice")).toBeVisible();
  await expect(panel.getByText("Status: Ready")).toBeVisible();
  await expect(panel.getByText("Status: Missing sheet")).toBeVisible();
  await expect(panel.getByText("Stale: Sheet no longer exists.")).toBeVisible();

  const activityRows = panel.getByTestId("recent-activity-row");

  await expect(activityRows).toHaveCount(3);
  await expect(activityRows.locator("a,button")).toHaveCount(0);
  await expect(panel.locator("[data-testid='recent-activity-row'][tabindex]")).toHaveCount(0);
  await activityRows.first().click();
  await expect(page).toHaveURL(/\/$/);

  await page.reload();
  await expect(panel.getByText("Deleted sheet", { exact: true })).toBeVisible();
  await expect(panel.getByText("Stale: Sheet no longer exists.")).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Recent Activity Sheet", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Deleted sheet", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  expect(consoleErrors).toEqual([]);
});
