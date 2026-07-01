import { expect, test, type Page } from "@playwright/test";

import { importTestSheet } from "./fixtures/sheets";
import {
  clearDatabases,
  clearRecordingHistory,
  MEASURE_GRID_DB_NAME,
  PRACTICE_SESSION_DB_NAME,
  PRACTICE_SEGMENT_DB_NAME,
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

async function installFakeMicrophone(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          const audioWindow = window as Window &
            typeof globalThis & { webkitAudioContext?: typeof AudioContext };
          const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
          const audioContext = new AudioContextConstructor();
          const destination = audioContext.createMediaStreamDestination();
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();

          oscillator.frequency.value = 440;
          gain.gain.value = 0.2;
          oscillator.connect(gain);
          gain.connect(destination);
          oscillator.start();

          return destination.stream;
        }
      }
    });
  });
}

async function saveMeasureGridThroughUi(page: Page) {
  await page.getByRole("spinbutton", { name: "Grid BPM" }).fill("96");
  await page.getByLabel("Grid time signature").selectOption("4/4");
  await page.getByRole("spinbutton", { name: "Pickup beats" }).fill("0");
  await page.getByRole("spinbutton", { name: "Measure 1 offset" }).fill("1000");
  await page.getByRole("button", { name: "Save grid" }).click();
  await expect(page.getByTestId("measure-grid-status")).toContainText("Calibrated");
}

async function createPracticeSegmentThroughUi(page: Page) {
  await page.getByRole("button", { name: "New segment" }).click();
  await page.getByLabel("Segment name").fill("Bridge focus");
  await page.getByLabel("Start measure").fill("5");
  await page.getByLabel("End measure").fill("8");
  await page.getByLabel("Target BPM").fill("96");
  await page.getByLabel("Segment notes").fill("Keep the bridge even.");
  await page.getByRole("button", { name: "Save segment" }).click();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("1 saved");
  await expect(page.getByText("Bridge focus").first()).toBeVisible();
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Bridge focus");

  const row = page.locator("[data-testid^='practice-segment-row-']").filter({ hasText: "Bridge focus" }).first();
  const rowTestId = await row.getAttribute("data-testid");
  const segmentId = rowTestId?.replace("practice-segment-row-", "") ?? "";

  expect(segmentId).toBeTruthy();

  return segmentId;
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
  await expect(page.getByText("No recent practice targets yet.")).toBeVisible();
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

test("home Continue Practice recommendations navigate to quick, sheet, and segment targets", async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  await installFakeMicrophone(page);
  await page.goto("/");
  await clearRecordingHistory(page);
  await clearDatabases(page, [
    PRACTICE_SESSION_DB_NAME,
    SHEET_LIBRARY_DB_NAME,
    MEASURE_GRID_DB_NAME,
    PRACTICE_SEGMENT_DB_NAME
  ]);

  await page.goto("/quick-metronome");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByText("Metronome playing.")).toBeVisible();
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByText("Metronome stopped.")).toBeVisible();

  const { sheetId } = await importTestSheet(page, {
    name: "Continue Practice Sheet",
    bpm: "96",
    timeSignature: "4/4"
  });

  await page.goto(`/sheet-practice/${sheetId}`);
  await expect(page.getByRole("heading", { name: "Continue Practice Sheet" })).toBeVisible();
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText("Recording without metronome.")).toBeVisible();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText(/^Recording saved/)).toBeVisible();

  await saveMeasureGridThroughUi(page);
  const segmentId = await createPracticeSegmentThroughUi(page);
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText("Recording without metronome.")).toBeVisible();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText("Recording saved for Bridge focus.")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Continue Practice" });

  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: "Continue quick practice" })).toHaveAttribute(
    "href",
    "/quick-metronome"
  );
  await expect(
    panel.getByRole("link", { name: "Continue sheet practice Continue Practice Sheet" })
  ).toHaveAttribute("href", `/sheet-practice/${sheetId}`);
  await expect(
    panel.getByRole("link", { name: /Continue segment Bridge focus .* Continue Practice Sheet/ })
  ).toHaveAttribute("href", `/sheet-practice?sheetId=${sheetId}&segmentId=${segmentId}`);
  await expect(page.getByRole("link", { name: "Continue Practice", exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await panel.getByRole("link", { name: "Continue quick practice" }).click();
  await expect(page).toHaveURL(/\/quick-metronome$/);
  await expect(page.getByRole("heading", { name: "Quick Metronome" })).toBeVisible();

  await page.goto("/");
  await panel.getByRole("link", { name: "Continue sheet practice Continue Practice Sheet" }).click();
  await expect(page).toHaveURL(new RegExp(`/sheet-practice/${sheetId}$`));
  await expect(page.getByRole("heading", { name: "Continue Practice Sheet" })).toBeVisible();

  await page.goto("/");
  await panel.getByRole("link", { name: /Continue segment Bridge focus .* Continue Practice Sheet/ }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("sheetId")).toBe(sheetId);
  await expect.poll(() => new URL(page.url()).searchParams.get("segmentId")).toBe(segmentId);
  await expect(page.getByRole("heading", { name: "Continue Practice Sheet" })).toBeVisible();
  await expect(page.getByTestId(`practice-segment-row-${segmentId}`)).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Bridge focus");

  await page.getByRole("button", { name: "Delete Bridge focus" }).click();
  await page.getByRole("button", { name: "Confirm delete Bridge focus" }).click();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("0 saved");

  await page.goto("/");
  await page.reload();
  await expect(panel.getByRole("link", { name: /Continue segment Bridge focus/ })).toHaveCount(0);
  await expect(
    panel.getByRole("link", { name: "Continue sheet practice Continue Practice Sheet" })
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: "Continue quick practice" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
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
