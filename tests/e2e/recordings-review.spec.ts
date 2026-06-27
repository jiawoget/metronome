import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createWavDataUrl,
  decodeRecordingHistoryAudio,
  installSyntheticMicrophone
} from "./fixtures/audio";
import { importTestSheet } from "./fixtures/sheets";
import {
  clearDatabases,
  clearRecordingHistory,
  MEASURE_GRID_DB_NAME,
  PRACTICE_SEGMENT_DB_NAME,
  PRACTICE_SESSION_DB_NAME,
  readRecordingHistory,
  seedRecordingHistory,
  SHEET_LIBRARY_DB_NAME
} from "./fixtures/storage";

type WaveformEvidence = {
  source: string | null;
  peakCount: string | null;
  width: number;
  height: number;
  visibleBarCount: number;
  nonZeroBarCount: number;
  barHeights: number[];
};

type SegmentContextFixture = {
  segmentId?: string;
  segmentName?: string;
};

function createSegmentContext({
  segmentId = "segment-bridge",
  segmentName = "Bridge"
}: SegmentContextFixture = {}) {
  return {
    segmentId,
    segmentName,
    range: {
      startMeasure: 5,
      endMeasure: 12
    },
    targetBpm: 96,
    measureGridVersion:
      "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000",
    measureGridSnapshot: {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    },
    measureRangeMs: {
      startMs: 11_000,
      endMs: 31_000
    }
  };
}

async function saveMeasureGridThroughUi(page: Page) {
  await page.getByRole("spinbutton", { name: "Grid BPM" }).fill("96");
  await page.getByLabel("Grid time signature").selectOption("4/4");
  await page.getByRole("spinbutton", { name: "Pickup beats" }).fill("0");
  await page.getByRole("spinbutton", { name: "Measure 1 offset" }).fill("1000");
  await page.getByRole("button", { name: "Save grid" }).click();
  await expect(page.getByTestId("measure-grid-status")).toContainText("Calibrated");
}

async function createPracticeSegmentThroughUi(page: Page, name: string) {
  await page.getByRole("button", { name: "New segment" }).click();
  await page.getByLabel("Segment name").fill(name);
  await page.getByLabel("Start measure").fill("5");
  await page.getByLabel("End measure").fill("12");
  await page.getByLabel("Target BPM").fill("96");
  await page.getByLabel("Segment notes").fill("Return target.");
  await page.getByRole("button", { name: "Save segment" }).click();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("1 saved");
}

async function readPracticeSegments(page: Page, sheetId: string) {
  return page.evaluate(
    ({ databaseName, targetSheetId }) =>
      new Promise<
        {
          id: string;
          sheetId: string;
          name: string;
        }[]
      >((resolve, reject) => {
        const request = indexedDB.open(databaseName);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(["segments"], "readonly");
          const store = transaction.objectStore("segments");
          const index = store.index("sheetId");
          const getAllRequest = index.getAll(targetSheetId);

          getAllRequest.onerror = () => reject(getAllRequest.error);
          getAllRequest.onsuccess = () => {
            resolve(
              (getAllRequest.result as { segment?: unknown }[])
                .map((record) => record.segment)
                .filter(
                  (
                    segment
                  ): segment is { id: string; sheetId: string; name: string } =>
                    Boolean(
                      segment &&
                        typeof segment === "object" &&
                        "id" in segment &&
                        "sheetId" in segment &&
                        "name" in segment
                    )
                )
            );
            database.close();
          };
        };
      }),
    { databaseName: PRACTICE_SEGMENT_DB_NAME, targetSheetId: sheetId }
  );
}

async function expectVisibleDerivedWaveform({
  page,
  source,
  peakCount,
  label,
  testId = "derived-waveform"
}: {
  page: Page;
  source: "decoded-audio" | "trusted-peaks";
  peakCount: number;
  label: string;
  testId?: string;
}) {
  const waveform = page.getByTestId(testId);

  await expect(waveform, `${label}: waveform container visible`).toBeVisible();
  await waveform.scrollIntoViewIfNeeded();
  await expect(waveform, `${label}: waveform source`).toHaveAttribute(
    "data-waveform-source",
    source
  );
  await expect(waveform, `${label}: waveform peak count`).toHaveAttribute(
    "data-peak-count",
    String(peakCount)
  );

  const evidence = await waveform.evaluate((element): WaveformEvidence => {
    const bounds = element.getBoundingClientRect();
    const bars = Array.from(element.querySelectorAll("span")).map((bar) => {
      const rect = bar.getBoundingClientRect();

      return {
        width: rect.width,
        height: rect.height,
        visible:
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth
      };
    });

    return {
      source: element.getAttribute("data-waveform-source"),
      peakCount: element.getAttribute("data-peak-count"),
      width: bounds.width,
      height: bounds.height,
      visibleBarCount: bars.filter((bar) => bar.visible).length,
      nonZeroBarCount: bars.filter((bar) => bar.height > 0).length,
      barHeights: bars.map((bar) => Math.round(bar.height))
    };
  });

  expect(evidence.width, `${label}: waveform has layout width`).toBeGreaterThan(
    160
  );
  expect(
    evidence.height,
    `${label}: waveform has layout height`
  ).toBeGreaterThan(40);
  expect(
    evidence.visibleBarCount,
    `${label}: all waveform bars are visible`
  ).toBe(peakCount);
  expect(
    evidence.nonZeroBarCount,
    `${label}: all waveform bars have nonzero height`
  ).toBe(peakCount);
  expect(
    Math.max(...evidence.barHeights),
    `${label}: waveform bars have visible height`
  ).toBeGreaterThan(7);

  return evidence;
}

function expectStableWaveform(
  before: WaveformEvidence,
  after: WaveformEvidence,
  label: string
) {
  expect(after.source, `${label}: source stays stable`).toBe(before.source);
  expect(after.peakCount, `${label}: peak count stays stable`).toBe(
    before.peakCount
  );
  expect(
    after.visibleBarCount,
    `${label}: visible bar count stays stable`
  ).toBe(before.visibleBarCount);
  expect(
    after.nonZeroBarCount,
    `${label}: nonzero bar count stays stable`
  ).toBe(before.nonZeroBarCount);
  expect(after.barHeights, `${label}: bar geometry stays stable`).toEqual(
    before.barHeights
  );
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflowEvidence = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth
  }));

  expect(
    overflowEvidence.documentScrollWidth,
    `${label}: document has no horizontal overflow`
  ).toBeLessThanOrEqual(overflowEvidence.viewportWidth + 1);
  expect(
    overflowEvidence.bodyScrollWidth,
    `${label}: body has no horizontal overflow`
  ).toBeLessThanOrEqual(overflowEvidence.viewportWidth + 1);
}

async function expectReadableSummaryChips(summary: Locator, label: string) {
  const chips = summary.locator("span");

  await expect(chips, `${label}: summary chip count`).toHaveCount(7);

  const chipEvidence = await chips.evaluateAll((elements) =>
    elements.map((element) => {
      const style = window.getComputedStyle(element);
      const bounds = element.getBoundingClientRect();

      return {
        text: element.textContent?.trim() ?? "",
        width: bounds.width,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        viewportWidth: window.innerWidth,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
        overflowX: style.overflowX
      };
    })
  );

  for (const chip of chipEvidence) {
    expect(chip.text, `${label}: chip has text`).not.toBe("");
    expect(chip.width, `${label}: ${chip.text} has width`).toBeGreaterThan(0);
    expect(chip.height, `${label}: ${chip.text} has height`).toBeGreaterThan(0);
    expect(chip.left, `${label}: ${chip.text} stays inside left edge`).toBeGreaterThanOrEqual(
      -1
    );
    expect(chip.right, `${label}: ${chip.text} stays inside right edge`).toBeLessThanOrEqual(
      chip.viewportWidth + 1
    );
    expect(chip.scrollWidth, `${label}: ${chip.text} is not clipped horizontally`).toBeLessThanOrEqual(
      chip.clientWidth + 1
    );
    expect(chip.textOverflow, `${label}: ${chip.text} does not use ellipsis`).not.toBe(
      "ellipsis"
    );
    expect(chip.whiteSpace, `${label}: ${chip.text} can wrap`).not.toBe(
      "nowrap"
    );
    expect(chip.overflowX, `${label}: ${chip.text} is not hidden on x`).not.toBe(
      "hidden"
    );
  }
}

test("recordings review renders grouped take history, filters it, deletes a take, and survives reload", async ({
  page
}) => {
  await page.goto("/recordings");
  await page.evaluate(() => window.localStorage.clear());

  const artifact = await createWavDataUrl(page, 440, 0.8);
  const sheetArtifact = await createWavDataUrl(page, 330, 0.9);

  await seedRecordingHistory(page, {
    sessions: [
      { id: "session-quick-grouped", sourceType: "quick" },
      { id: "session-sheet-grouped", sourceType: "sheet" }
    ],
    recordings: [
      {
        id: "sheet-alpha-bridge-old",
        type: "sheet",
        origin: "user",
        name: "Bridge take 1",
        sessionId: "session-sheet-grouped",
        sheetId: "sheet-alpha",
        sheetName: "Alpha Etude",
        createdAt: "2026-06-21T09:00:00.000Z",
        durationMs: sheetArtifact.durationMs,
        sizeBytes: sheetArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: sheetArtifact.dataUrl,
        trustedPeaks: [0.1, 0.5, 0.8, 0.3],
        segmentContext: createSegmentContext({
          segmentId: "segment-bridge",
          segmentName: "Bridge"
        }),
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "sheet-alpha-bridge-new",
        type: "sheet",
        origin: "user",
        name: "Bridge take 2",
        sessionId: "session-sheet-grouped",
        sheetId: "sheet-alpha",
        sheetName: "Alpha Etude",
        createdAt: "2026-06-21T13:00:00.000Z",
        durationMs: sheetArtifact.durationMs,
        sizeBytes: sheetArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: sheetArtifact.dataUrl,
        trustedPeaks: [0.1, 0.5, 0.8, 0.3],
        segmentContext: createSegmentContext({
          segmentId: "segment-bridge",
          segmentName: "Bridge"
        }),
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "sheet-alpha-whole-legacy",
        type: "sheet",
        origin: "user",
        name: "Whole sheet legacy",
        sessionId: "session-sheet-grouped",
        sheetId: "sheet-alpha",
        sheetName: "Alpha Etude",
        createdAt: "2026-06-21T10:00:00.000Z",
        durationMs: sheetArtifact.durationMs,
        sizeBytes: sheetArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: sheetArtifact.dataUrl,
        trustedPeaks: [0.1, 0.4, 0.6, 0.2],
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "sheet-alpha-whole-null",
        type: "sheet",
        origin: "user",
        name: "Whole sheet current",
        sessionId: "session-sheet-grouped",
        sheetId: "sheet-alpha",
        sheetName: "Alpha Etude",
        createdAt: "2026-06-21T11:00:00.000Z",
        durationMs: sheetArtifact.durationMs,
        sizeBytes: sheetArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: sheetArtifact.dataUrl,
        trustedPeaks: [0.1, 0.4, 0.6, 0.2],
        segmentContext: null,
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "sheet-beta-bridge",
        type: "sheet",
        origin: "user",
        name: "Beta bridge take",
        sessionId: "session-sheet-grouped",
        sheetId: "sheet-beta",
        sheetName: "Beta Study",
        createdAt: "2026-06-21T12:00:00.000Z",
        durationMs: sheetArtifact.durationMs,
        sizeBytes: sheetArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: sheetArtifact.dataUrl,
        trustedPeaks: [0.2, 0.5, 0.7, 0.2],
        segmentContext: createSegmentContext({
          segmentId: "segment-bridge",
          segmentName: "Bridge"
        }),
        settings: {
          bpm: 102,
          timeSignature: "3/4"
        }
      },
      {
        id: "quick-grouped",
        type: "quick",
        origin: "user",
        name: "Grouped quick take",
        sessionId: "session-quick-grouped",
        sheetId: null,
        createdAt: "2026-06-21T14:00:00.000Z",
        durationMs: artifact.durationMs,
        sizeBytes: artifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: artifact.dataUrl,
        settings: {
          bpm: 120,
          timeSignature: "4/4"
        }
      },
      {
        id: "sheet-missing-link",
        type: "sheet",
        origin: "user",
        name: "Missing sheet link take",
        sessionId: "session-sheet-grouped",
        sheetId: null,
        sheetName: null,
        createdAt: "2026-06-21T08:00:00.000Z",
        durationMs: sheetArtifact.durationMs,
        sizeBytes: sheetArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: sheetArtifact.dataUrl,
        trustedPeaks: [0.1, 0.4, 0.6, 0.2],
        segmentContext: null,
        settings: {
          bpm: 88,
          timeSignature: "4/4"
        }
      }
    ],
    errorMarkers: [
      {
        id: "marker-alpha-bridge-old",
        recordingId: "sheet-alpha-bridge-old",
        timestampMs: 300,
        note: "Old bridge marker"
      },
      {
        id: "marker-alpha-bridge-new",
        recordingId: "sheet-alpha-bridge-new",
        timestampMs: 500,
        note: "New bridge marker"
      },
      {
        id: "marker-beta-bridge",
        recordingId: "sheet-beta-bridge",
        timestampMs: 400,
        note: "Beta marker"
      }
    ]
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Take History" })).toBeVisible();

  const alphaBridgeGroup = page.getByTestId(
    "take-group-sheet:sheet-alpha:segment:segment-bridge"
  );
  await expect(alphaBridgeGroup).toContainText("Segment take history");
  await expect(alphaBridgeGroup).toContainText("Alpha Etude");
  await expect(alphaBridgeGroup).toContainText("Bridge");
  await expect(alphaBridgeGroup).toContainText("2 takes");
  await expect(alphaBridgeGroup.getByTestId("take-history-summary")).toContainText(
    "Takes: 2 takes"
  );
  await expect(alphaBridgeGroup.getByTestId("take-history-summary")).toContainText(
    /Latest: .*Bridge take 2/
  );
  await expect(alphaBridgeGroup.getByTestId("take-history-summary")).toContainText(
    /Latest duration: 0:0[1-9]/
  );
  await expect(alphaBridgeGroup.getByTestId("take-history-summary")).toContainText(
    "BPM: 96 BPM"
  );
  await expect(alphaBridgeGroup.getByTestId("take-history-summary")).toContainText(
    "Time signature: 4/4"
  );
  await expect(alphaBridgeGroup.getByTestId("take-history-summary")).toContainText(
    "Markers: 2 markers"
  );
  await expect(
    alphaBridgeGroup.getByTestId("recording-row-sheet-alpha-bridge-new")
  ).toBeVisible();
  await expect(
    alphaBridgeGroup.getByRole("link", {
      name: "Return to practice for Bridge on Alpha Etude"
    })
  ).toHaveAttribute(
    "href",
    "/sheet-practice?recordingId=sheet-alpha-bridge-new&sheetId=sheet-alpha&segmentId=segment-bridge"
  );
  await expect(alphaBridgeGroup).toContainText("Best: none");
  await expect(alphaBridgeGroup).toContainText("Active: none");
  await expect(
    alphaBridgeGroup.getByTestId("best-take-control-sheet-alpha-bridge-old")
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    alphaBridgeGroup.getByTestId("active-take-control-sheet-alpha-bridge-new")
  ).toHaveAttribute("aria-pressed", "false");

  const alphaWholeGroup = page.getByTestId(
    "take-group-sheet:sheet-alpha:segment:none"
  );
  await expect(alphaWholeGroup).toContainText("Whole sheet / no segment");
  await expect(alphaWholeGroup).toContainText("2 takes");
  await expect(alphaWholeGroup.getByTestId("take-history-summary")).toContainText(
    "Markers: No markers"
  );
  await expect(
    alphaWholeGroup.getByRole("link", {
      name: "Return to sheet practice for Alpha Etude"
    })
  ).toHaveAttribute(
    "href",
    "/sheet-practice?recordingId=sheet-alpha-whole-null&sheetId=sheet-alpha"
  );
  await expect(
    page.getByTestId("take-group-sheet:sheet-beta:segment:segment-bridge")
  ).toContainText("Beta Study");
  await expect(page.getByTestId("quick-recordings-section")).toContainText(
    "Grouped quick take"
  );
  await expect(
    page.getByTestId("quick-recordings-section").getByTestId("take-history-summary")
  ).toHaveCount(0);
  await expect(page.getByTestId("best-take-control-quick-grouped")).toHaveCount(
    0
  );
  await expect(
    page.getByTestId("active-take-control-quick-grouped")
  ).toHaveCount(0);
  await expect(page.getByTestId("ungrouped-recordings-section")).toContainText(
    "Missing sheet link take"
  );
  await expect(
    page
      .getByTestId("ungrouped-recordings-section")
      .getByTestId("take-history-summary")
  ).toHaveCount(0);
  await expect(
    page.getByTestId("best-take-control-sheet-missing-link")
  ).toHaveCount(0);
  await expect(
    page.getByTestId("active-take-control-sheet-missing-link")
  ).toHaveCount(0);

  await page.getByTestId("recording-row-sheet-alpha-bridge-old").click();
  await expect(page.getByTestId("recording-details")).toHaveAttribute(
    "data-recording-id",
    "sheet-alpha-bridge-old"
  );
  await expect(
    page.getByRole("link", {
      name: "Practice again for Bridge on Alpha Etude"
    })
  ).toHaveAttribute(
    "href",
    "/sheet-practice?recordingId=sheet-alpha-bridge-old&sheetId=sheet-alpha&segmentId=segment-bridge"
  );

  await page.getByTestId("recording-row-quick-grouped").click();
  await expect(
    page.getByRole("link", {
      name: "Practice again in Quick Metronome for Grouped quick take"
    })
  ).toHaveAttribute("href", "/quick-metronome?recordingId=quick-grouped");

  await page
    .getByRole("button", { name: "Mark Bridge take 1 as best take" })
    .click();
  await expect(
    alphaBridgeGroup.getByTestId("best-take-control-sheet-alpha-bridge-old")
  ).toHaveAttribute("aria-pressed", "true");
  await expect(alphaBridgeGroup).toContainText("Best: Bridge take 1");
  await expect(alphaBridgeGroup.getByTestId("take-history-summary")).toContainText(
    /Latest: .*Bridge take 2/
  );
  await expect(alphaBridgeGroup).toContainText("Active: none");
  await expect(page.getByTestId("recording-details")).toHaveAttribute(
    "data-recording-id",
    "quick-grouped"
  );

  await page
    .getByRole("button", { name: "Mark Bridge take 2 as active take" })
    .click();
  await expect(
    alphaBridgeGroup.getByTestId("active-take-control-sheet-alpha-bridge-new")
  ).toHaveAttribute("aria-pressed", "true");
  await expect(alphaBridgeGroup).toContainText("Best: Bridge take 1");
  await expect(alphaBridgeGroup).toContainText("Active: Bridge take 2");

  await page
    .getByRole("button", { name: "Mark Bridge take 2 as best take" })
    .click();
  await expect(
    alphaBridgeGroup.getByTestId("best-take-control-sheet-alpha-bridge-new")
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    alphaBridgeGroup.getByTestId("active-take-control-sheet-alpha-bridge-new")
  ).toHaveAttribute("aria-pressed", "true");
  await expect(alphaBridgeGroup).toContainText("Best: Bridge take 2");
  await expect(alphaBridgeGroup).toContainText("Active: Bridge take 2");

  await page
    .getByRole("button", { name: "Clear best take for Bridge take 2" })
    .click();
  await expect(alphaBridgeGroup).toContainText("Best: none");
  await expect(alphaBridgeGroup).toContainText("Active: Bridge take 2");

  await page
    .getByRole("button", { name: "Clear active take for Bridge take 2" })
    .click();
  await expect(alphaBridgeGroup).toContainText("Best: none");
  await expect(alphaBridgeGroup).toContainText("Active: none");

  await page
    .getByRole("button", { name: "Mark Bridge take 1 as best take" })
    .click();
  await page
    .getByRole("button", { name: "Mark Bridge take 2 as active take" })
    .click();
  await expect(alphaBridgeGroup).toContainText("Best: Bridge take 1");
  await expect(alphaBridgeGroup).toContainText("Active: Bridge take 2");

  await page.reload();
  await expect(alphaBridgeGroup).toContainText("Best: Bridge take 1");
  await expect(alphaBridgeGroup).toContainText("Active: Bridge take 2");

  await page.getByRole("textbox", { name: "Search recordings" }).fill("Bridge");
  await expect(alphaBridgeGroup).toBeVisible();
  await expect(alphaWholeGroup).toBeHidden();
  await expect(page.getByTestId("quick-recordings-section")).toBeHidden();

  await page.getByRole("textbox", { name: "Search recordings" }).fill("");
  await page.getByLabel("Type filter").selectOption("quick");
  await expect(page.getByTestId("quick-recordings-section")).toBeVisible();
  await expect(page.getByTestId("best-take-control-quick-grouped")).toHaveCount(
    0
  );
  await expect(alphaBridgeGroup).toBeHidden();

  await page.getByLabel("Type filter").selectOption("sheet");
  await expect(alphaBridgeGroup).toBeVisible();
  await expect(alphaBridgeGroup).toContainText("Best: Bridge take 1");
  await expect(alphaBridgeGroup).toContainText("Active: Bridge take 2");
  await expect(page.getByTestId("quick-recordings-section")).toBeHidden();

  await page.getByRole("textbox", { name: "Search recordings" }).fill("nomatch");
  await expect(page.getByTestId("recordings-filter-empty-state")).toContainText(
    "No recording groups match"
  );
  await expect(alphaBridgeGroup).toBeHidden();

  await page.getByRole("textbox", { name: "Search recordings" }).fill("");
  await page.getByTestId("recording-row-sheet-alpha-bridge-old").click();
  await page.getByRole("button", { name: "Delete Recording" }).click();
  await page.getByRole("button", { name: "Confirm Delete" }).click();
  await expect(page.getByTestId("recording-row-sheet-alpha-bridge-old")).toBeHidden();
  await expect(alphaBridgeGroup).toContainText("1 take");
  await expect(alphaBridgeGroup).toContainText("Best: none");
  await expect(alphaBridgeGroup).toContainText("Active: Bridge take 2");
  await expect(alphaBridgeGroup).toContainText("Markers: 1 marker");

  await page.reload();
  await expect(page.getByTestId("recording-row-sheet-alpha-bridge-old")).toBeHidden();
  await expect(alphaBridgeGroup).toContainText("1 take");
  await expect(alphaBridgeGroup).toContainText("Best: none");
  await expect(alphaBridgeGroup).toContainText("Active: Bridge take 2");
  await expect(alphaBridgeGroup).toContainText("Markers: 1 marker");
  const groupedPageText = (await page.locator("body").innerText()).toLowerCase();

  expect(groupedPageText).not.toMatch(
    /score|accuracy|correct|best performance|cleanest|most accurate|recommended|improved|mistakes|timing quality/
  );

  for (const viewport of [
    { width: 1280, height: 900, label: "desktop" },
    { width: 1024, height: 768, label: "tablet" },
    { width: 390, height: 844, label: "mobile" }
  ]) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height
    });
    await expect(alphaBridgeGroup).toBeVisible();
    await expect(
      page.getByTestId("recording-row-sheet-alpha-bridge-new")
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, viewport.label);
  }
});

test("recordings review compares selected sheet takes with waveform evidence", async ({
  page
}) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/recordings");
  await page.evaluate(() => window.localStorage.clear());

  const decodedArtifact = await createWavDataUrl(page, 440, 0.9);
  const trustedArtifact = await createWavDataUrl(page, 330, 1);

  await seedRecordingHistory(page, {
    sessions: [
      { id: "session-waveform-sheet", sourceType: "sheet" },
      { id: "session-waveform-quick", sourceType: "quick" }
    ],
    recordings: [
      {
        id: "wave-decoded",
        type: "sheet",
        origin: "user",
        name: "Comparison decoded",
        sessionId: "session-waveform-sheet",
        sheetId: "sheet-wave",
        sheetName: "Waveform Study",
        createdAt: "2026-06-21T09:00:00.000Z",
        durationMs: decodedArtifact.durationMs,
        sizeBytes: decodedArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: decodedArtifact.dataUrl,
        segmentContext: createSegmentContext({
          segmentId: "segment-wave",
          segmentName: "Wave bridge"
        }),
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "wave-trusted",
        type: "sheet",
        origin: "user",
        name: "Comparison trusted",
        sessionId: "session-waveform-sheet",
        sheetId: "sheet-wave",
        sheetName: "Waveform Study",
        createdAt: "2026-06-21T10:00:00.000Z",
        durationMs: trustedArtifact.durationMs,
        sizeBytes: trustedArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: trustedArtifact.dataUrl,
        trustedPeaks: [0.15, 0.55, 0.95, 0.35],
        segmentContext: createSegmentContext({
          segmentId: "segment-wave",
          segmentName: "Wave bridge"
        }),
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "wave-missing",
        type: "sheet",
        origin: "user",
        name: "Comparison missing artifact",
        sessionId: "session-waveform-sheet",
        sheetId: "sheet-wave",
        sheetName: "Waveform Study",
        createdAt: "2026-06-21T11:00:00.000Z",
        durationMs: 1_000,
        sizeBytes: 0,
        mimeType: "audio/wav",
        audioDataUrl: null,
        segmentContext: createSegmentContext({
          segmentId: "segment-wave",
          segmentName: "Wave bridge"
        }),
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "wave-unsupported",
        type: "sheet",
        origin: "user",
        name: "Comparison unsupported artifact",
        sessionId: "session-waveform-sheet",
        sheetId: "sheet-wave",
        sheetName: "Waveform Study",
        createdAt: "2026-06-21T12:00:00.000Z",
        durationMs: trustedArtifact.durationMs,
        sizeBytes: trustedArtifact.sizeBytes,
        mimeType: "application/pdf",
        audioDataUrl: trustedArtifact.dataUrl,
        segmentContext: createSegmentContext({
          segmentId: "segment-wave",
          segmentName: "Wave bridge"
        }),
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "wave-invalid-peaks",
        type: "sheet",
        origin: "user",
        name: "Comparison invalid peaks",
        sessionId: "session-waveform-sheet",
        sheetId: "sheet-wave",
        sheetName: "Waveform Study",
        createdAt: "2026-06-21T13:00:00.000Z",
        durationMs: trustedArtifact.durationMs,
        sizeBytes: trustedArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: trustedArtifact.dataUrl,
        trustedPeaks: [0, 0],
        segmentContext: createSegmentContext({
          segmentId: "segment-wave",
          segmentName: "Wave bridge"
        }),
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "wave-quick",
        type: "quick",
        origin: "user",
        name: "Comparison quick take",
        sessionId: "session-waveform-quick",
        sheetId: null,
        createdAt: "2026-06-21T14:00:00.000Z",
        durationMs: decodedArtifact.durationMs,
        sizeBytes: decodedArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: decodedArtifact.dataUrl,
        settings: {
          bpm: 120,
          timeSignature: "4/4"
        }
      }
    ],
    errorMarkers: []
  });

  await page.reload();

  const group = page.getByTestId(
    "take-group-sheet:sheet-wave:segment:segment-wave"
  );
  await expect(group).toBeVisible();
  await expect(group.getByTestId("take-history-summary")).toContainText(
    /Latest: .*Comparison invalid peaks/
  );
  await expect(
    page
      .getByTestId("quick-recordings-section")
      .getByTestId("compare-take-control-wave-quick")
  ).toHaveCount(0);

  await group
    .getByRole("checkbox", {
      name: "Select Comparison decoded for waveform comparison"
    })
    .check();
  await expect(group).toContainText("Select another take to compare");

  await group
    .getByRole("checkbox", {
      name: "Select Comparison trusted for waveform comparison"
    })
    .check();

  await expect(group.getByTestId("waveform-comparison-results")).toBeVisible();
  await expectVisibleDerivedWaveform({
    page,
    source: "decoded-audio",
    peakCount: 48,
    label: "comparison decoded source",
    testId: "comparison-waveform-wave-decoded"
  });
  await expectVisibleDerivedWaveform({
    page,
    source: "trusted-peaks",
    peakCount: 4,
    label: "comparison trusted source",
    testId: "comparison-waveform-wave-trusted"
  });
  await expect(group).toContainText("Decoded audio");
  await expect(group).toContainText("Trusted peaks");

  await page.setViewportSize({ width: 768, height: 1024 });
  await group.scrollIntoViewIfNeeded();
  await expectNoHorizontalOverflow(page, "tablet waveform comparison");
  const tabletComparisonLayout = await group
    .getByTestId("waveform-comparison-results")
    .evaluate((element) => {
      const panelBounds = element.getBoundingClientRect();
      const rowBounds = Array.from(element.children).map((child) =>
        child.getBoundingClientRect()
      );

      return {
        panelWidth: panelBounds.width,
        overflowingRows: rowBounds.filter(
          (bounds) =>
            bounds.left < panelBounds.left - 1 ||
            bounds.right > panelBounds.right + 1
        ).length
      };
    });

  expect(
    tabletComparisonLayout.panelWidth,
    "tablet waveform comparison keeps layout width"
  ).toBeGreaterThan(280);
  expect(
    tabletComparisonLayout.overflowingRows,
    "tablet waveform comparison rows stay inside the panel"
  ).toBe(0);
  await page.setViewportSize({ width: 1280, height: 820 });

  await page
    .getByRole("button", { name: "Mark Comparison decoded as best take" })
    .click();
  await page
    .getByRole("button", { name: "Mark Comparison trusted as active take" })
    .click();
  await expect(group).toContainText("Best: Comparison decoded");
  await expect(group).toContainText("Active: Comparison trusted");
  await expect(
    group.getByRole("checkbox", {
      name: "Select Comparison decoded for waveform comparison"
    })
  ).toBeChecked();
  await expect(
    group.getByRole("checkbox", {
      name: "Select Comparison trusted for waveform comparison"
    })
  ).toBeChecked();

  await group
    .getByRole("checkbox", {
      name: "Select Comparison missing artifact for waveform comparison"
    })
    .check();
  await expect(group).toContainText(
    "This recording has no accessible local audio artifact."
  );
  await expect(group.getByTestId("comparison-waveform-wave-missing")).toHaveCount(
    0
  );
  await group
    .getByRole("checkbox", {
      name: "Select Comparison missing artifact for waveform comparison"
    })
    .uncheck();

  await group
    .getByRole("checkbox", {
      name: "Select Comparison unsupported artifact for waveform comparison"
    })
    .check();
  await group
    .getByRole("checkbox", {
      name: "Select Comparison invalid peaks for waveform comparison"
    })
    .check();
  await expect(group).toContainText(
    "This recording artifact is not a supported audio type."
  );
  await expect(group).toContainText(
    "This recording has invalid waveform peak data."
  );
  await expect(group.getByTestId("waveform-comparison-limit")).toContainText(
    "Up to 4 takes can be compared at once."
  );
  await expect(
    group.getByRole("checkbox", {
      name: "Select Comparison missing artifact for waveform comparison"
    })
  ).toBeDisabled();

  await page.setViewportSize({ width: 390, height: 844 });
  await group.scrollIntoViewIfNeeded();
  await expectVisibleDerivedWaveform({
    page,
    source: "trusted-peaks",
    peakCount: 4,
    label: "mobile comparison trusted source",
    testId: "comparison-waveform-wave-trusted"
  });
  await expectNoHorizontalOverflow(page, "mobile waveform comparison");

  const prohibitedText = (await page.locator("body").innerText()).toLowerCase();
  expect(prohibitedText).not.toMatch(
    /score|accuracy|correct|recommended|improved|cleanest|most accurate|mistakes|timing quality/
  );

  await page.setViewportSize({ width: 1280, height: 820 });
  await page.getByTestId("recording-row-wave-decoded").click();
  await page.getByRole("button", { name: "Delete Recording" }).click();
  await page.getByRole("button", { name: "Confirm Delete" }).click();
  await expect(
    group.getByTestId("waveform-comparison-row-wave-decoded")
  ).toHaveCount(0);
  await expect(
    group.getByTestId("waveform-comparison-row-wave-trusted")
  ).toBeVisible();

  await page.reload();
  const restoredGroup = page.getByTestId(
    "take-group-sheet:sheet-wave:segment:segment-wave"
  );
  await expect(restoredGroup).toContainText("Select takes to compare");
  await expect(
    restoredGroup.getByTestId("waveform-comparison-results")
  ).toHaveCount(0);
  await expect(
    restoredGroup.getByRole("checkbox", {
      name: "Select Comparison trusted for waveform comparison"
    })
  ).not.toBeChecked();
});

test("recordings review returns to sheet practice with segment validation and stale fallback", async ({
  page
}) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/sheet-library");
  await clearRecordingHistory(page);
  await clearDatabases(page, [
    SHEET_LIBRARY_DB_NAME,
    PRACTICE_SESSION_DB_NAME,
    MEASURE_GRID_DB_NAME,
    PRACTICE_SEGMENT_DB_NAME
  ]);
  await page.reload();

  const { sheetId } = await importTestSheet(page, {
    name: "Return Segment Sheet",
    bpm: "96",
    timeSignature: "4/4"
  });

  await page.goto(`/sheet-practice/${sheetId}`);
  await saveMeasureGridThroughUi(page);
  await createPracticeSegmentThroughUi(page, "Bridge");

  const segments = await readPracticeSegments(page, sheetId);
  const bridgeSegment = segments.find((segment) => segment.name === "Bridge");

  expect(bridgeSegment).toBeTruthy();

  const artifact = await createWavDataUrl(page, 330, 0.8);
  const segmentId = bridgeSegment?.id ?? "";

  await seedRecordingHistory(page, {
    sessions: [{ id: "session-return-sheet", sourceType: "sheet", sheetId }],
    recordings: [
      {
        id: "return-segment-old",
        type: "sheet",
        origin: "user",
        name: "Bridge return 1",
        sessionId: "session-return-sheet",
        sheetId,
        sheetName: "Return Segment Sheet",
        createdAt: "2026-06-21T09:00:00.000Z",
        durationMs: artifact.durationMs,
        sizeBytes: artifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: artifact.dataUrl,
        trustedPeaks: [0.1, 0.5, 0.8, 0.3],
        segmentContext: createSegmentContext({
          segmentId,
          segmentName: "Bridge"
        }),
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "return-segment-new",
        type: "sheet",
        origin: "user",
        name: "Bridge return 2",
        sessionId: "session-return-sheet",
        sheetId,
        sheetName: "Return Segment Sheet",
        createdAt: "2026-06-21T10:00:00.000Z",
        durationMs: artifact.durationMs,
        sizeBytes: artifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: artifact.dataUrl,
        trustedPeaks: [0.1, 0.5, 0.8, 0.3],
        segmentContext: createSegmentContext({
          segmentId,
          segmentName: "Bridge"
        }),
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "return-whole",
        type: "sheet",
        origin: "user",
        name: "Whole sheet return",
        sessionId: "session-return-sheet",
        sheetId,
        sheetName: "Return Segment Sheet",
        createdAt: "2026-06-21T11:00:00.000Z",
        durationMs: artifact.durationMs,
        sizeBytes: artifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: artifact.dataUrl,
        trustedPeaks: [0.1, 0.4, 0.7, 0.2],
        segmentContext: null,
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "return-stale",
        type: "sheet",
        origin: "user",
        name: "Deleted segment return",
        sessionId: "session-return-sheet",
        sheetId,
        sheetName: "Return Segment Sheet",
        createdAt: "2026-06-21T12:00:00.000Z",
        durationMs: artifact.durationMs,
        sizeBytes: artifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: artifact.dataUrl,
        trustedPeaks: [0.1, 0.4, 0.7, 0.2],
        segmentContext: createSegmentContext({
          segmentId: "segment-deleted",
          segmentName: "Deleted bridge"
        }),
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "return-missing-sheet",
        type: "sheet",
        origin: "user",
        name: "Missing sheet return",
        sessionId: "session-return-sheet",
        sheetId: "sheet-deleted",
        sheetName: "Deleted Return Sheet",
        createdAt: "2026-06-21T08:30:00.000Z",
        durationMs: artifact.durationMs,
        sizeBytes: artifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: artifact.dataUrl,
        trustedPeaks: [0.1, 0.4, 0.7, 0.2],
        segmentContext: createSegmentContext({
          segmentId: "segment-deleted-sheet",
          segmentName: "Deleted sheet segment"
        }),
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      },
      {
        id: "return-quick",
        type: "quick",
        origin: "user",
        name: "Quick return",
        sessionId: "session-return-quick",
        sheetId: null,
        createdAt: "2026-06-21T13:00:00.000Z",
        durationMs: artifact.durationMs,
        sizeBytes: artifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: artifact.dataUrl,
        settings: {
          bpm: 120,
          timeSignature: "4/4"
        }
      }
    ],
    errorMarkers: []
  });

  await page.goto("/recordings");

  const segmentGroup = page.getByTestId(
    `take-group-sheet:${sheetId}:segment:${segmentId}`
  );
  await expect(segmentGroup).toBeVisible();
  await expect(
    segmentGroup.getByRole("link", {
      name: "Return to practice for Bridge on Return Segment Sheet"
    })
  ).toHaveAttribute(
    "href",
    `/sheet-practice?recordingId=return-segment-new&sheetId=${sheetId}&segmentId=${segmentId}`
  );

  await segmentGroup
    .getByRole("link", {
      name: "Return to practice for Bridge on Return Segment Sheet"
    })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/sheet-practice");
  await expect.poll(() => new URL(page.url()).searchParams.get("sheetId")).toBe(sheetId);
  await expect.poll(() => new URL(page.url()).searchParams.get("segmentId")).toBe(segmentId);
  await expect(page.getByTestId(`practice-segment-row-${segmentId}`)).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText(
    "Active segment"
  );
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText(
    "Bridge"
  );

  await page.reload();
  await expect(page.getByTestId(`practice-segment-row-${segmentId}`)).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await page.goto("/recordings");
  await page.getByTestId("recording-row-return-segment-old").click();
  await expect(
    page.getByRole("link", {
      name: "Practice again for Bridge on Return Segment Sheet"
    })
  ).toHaveAttribute(
    "href",
    `/sheet-practice?recordingId=return-segment-old&sheetId=${sheetId}&segmentId=${segmentId}`
  );

  await page.goto("/recordings");
  const wholeGroup = page.getByTestId(`take-group-sheet:${sheetId}:segment:none`);
  await wholeGroup
    .getByRole("link", {
      name: "Return to sheet practice for Return Segment Sheet"
    })
    .click();
  await expect.poll(() => new URL(page.url()).searchParams.get("segmentId")).toBeNull();
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText(
    "Choose a segment"
  );
  await expect(page.getByTestId("practice-segment-return-status")).toHaveCount(0);

  await page.goto("/recordings");
  await page.getByTestId("recording-row-return-stale").click();
  await page
    .getByRole("link", {
      name: "Practice again for Deleted bridge on Return Segment Sheet"
    })
    .click();
  await expect.poll(() => new URL(page.url()).searchParams.get("segmentId")).toBe(
    "segment-deleted"
  );
  await expect(page.getByTestId("practice-segment-return-status")).toContainText(
    "Saved segment is no longer available. Sheet practice is ready without a selected segment."
  );
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText(
    "Choose a segment"
  );

  await page.goto("/recordings");
  await page.getByTestId("recording-row-return-missing-sheet").click();
  await page
    .getByRole("link", {
      name: "Practice again for Deleted sheet segment on Deleted Return Sheet"
    })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/sheet-practice");
  await expect.poll(() => new URL(page.url()).searchParams.get("sheetId")).toBe(
    "sheet-deleted"
  );
  await expect(
    page.getByRole("heading", { name: "Sheet not found" })
  ).toBeVisible();
  await expect(
    page.getByText(
      "This sheet is not in the local Sheet Library. Return to Sheet Library and choose an imported sheet."
    )
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Return to Sheet Library" })
  ).toBeVisible();

  await page.goto("/recordings");
  await page.getByTestId("recording-row-return-quick").click();
  await page
    .getByRole("link", {
      name: "Practice again in Quick Metronome for Quick return"
    })
    .click();
  await expect(page).toHaveURL(/\/quick-metronome\?recordingId=return-quick/);
});

test("recordings review keeps summary chips readable at a narrow viewport", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recordings");
  await page.evaluate(() => window.localStorage.clear());

  await seedRecordingHistory(page, {
    sessions: [{ id: "session-summary-readability", sourceType: "sheet" }],
    recordings: [
      {
        id: "summary-readable-old",
        type: "sheet",
        origin: "user",
        name: "Readability older take",
        sessionId: "session-summary-readability",
        sheetId: "sheet-readability",
        sheetName: "Narrow Summary Study",
        createdAt: "2026-06-21T09:00:00.000Z",
        durationMs: 11_000,
        sizeBytes: 128,
        mimeType: "audio/wav",
        audioDataUrl: "data:audio/wav;base64,UklGRg==",
        segmentContext: createSegmentContext({
          segmentId: "segment-readability",
          segmentName: "Narrow bridge"
        }),
        settings: {
          bpm: 88,
          timeSignature: "3/4"
        }
      },
      {
        id: "summary-readable-latest",
        type: "sheet",
        origin: "user",
        name: "Readability newest take",
        sessionId: "session-summary-readability",
        sheetId: "sheet-readability",
        sheetName: "Narrow Summary Study",
        createdAt: "2026-06-21T12:00:00.000Z",
        durationMs: 12_000,
        sizeBytes: 128,
        mimeType: "audio/wav",
        audioDataUrl: "data:audio/wav;base64,UklGRg==",
        segmentContext: createSegmentContext({
          segmentId: "segment-readability",
          segmentName: "Narrow bridge"
        }),
        settings: {
          bpm: 96,
          timeSignature: "   "
        }
      }
    ],
    errorMarkers: []
  });

  await page.reload();

  const group = page.getByTestId(
    "take-group-sheet:sheet-readability:segment:segment-readability"
  );
  const summary = group.getByTestId("take-history-summary");

  await expect(group).toBeVisible();
  await expect(summary).toContainText("Takes: 2 takes");
  await expect(summary).toContainText(/Latest: .*Readability newest take/);
  await expect(summary).toContainText("Best: none");
  await expect(summary).toContainText("Latest duration: 0:12");
  await expect(summary).toContainText("BPM: Mixed BPM, latest 96");
  await expect(summary).toContainText(
    "Time signature: Time signature unavailable"
  );
  await expect(summary).toContainText("Markers: No markers");

  await expectReadableSummaryChips(summary, "mobile take summary");
  await expectNoHorizontalOverflow(page, "mobile take summary");
});

test("recordings review lists, filters, plays, continues, deletes, and handles bad audio", async ({
  page
}) => {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  await installSyntheticMicrophone(page, 440, 0.2);
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("recordings-review-e2e-ready")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("recordings-review-e2e-ready", "true");
    }
    const e2eWindow = window as Window & {
      __recordingsPlaybackEvents?: unknown[];
      __recordingsPlaybackRejections?: string[];
      __recordingsSeekEvents?: {
        recordingId: string;
        timestampMs: number;
        currentTimeMs: number;
      }[];
    };

    e2eWindow.__recordingsPlaybackEvents = [];
    e2eWindow.__recordingsPlaybackRejections = [];
    e2eWindow.__recordingsSeekEvents = [];
    window.addEventListener("recordings-review:playback", (event) => {
      e2eWindow.__recordingsPlaybackEvents?.push((event as CustomEvent).detail);
    });
    window.addEventListener("recordings-review:seek", (event) => {
      e2eWindow.__recordingsSeekEvents?.push((event as CustomEvent).detail);
    });
    window.addEventListener("unhandledrejection", (event) => {
      e2eWindow.__recordingsPlaybackRejections?.push(String(event.reason));
    });
  });

  await page.goto("/recordings");
  await expect(page.getByRole("heading", { name: "Recordings" })).toBeVisible();
  await expect(page.getByTestId("recordings-empty-state")).toBeVisible();

  const quickArtifact = await createWavDataUrl(page, 440, 1);
  const sheetArtifact = await createWavDataUrl(page, 330, 1.2);
  const mismatchArtifact = await createWavDataUrl(page, 220, 1);
  const invalidPeaksArtifact = await createWavDataUrl(page, 260, 1);

  await seedRecordingHistory(page, {
    sessions: [
      { id: "session-quick-1", sourceType: "quick" },
      { id: "session-sheet-1", sourceType: "sheet" }
    ],
    recordings: [
      {
        id: "quick-alpha",
        type: "quick",
        origin: "user",
        name: "Alpha quick take",
        sessionId: "session-quick-1",
        sheetId: null,
        createdAt: "2026-06-21T09:00:00.000Z",
        durationMs: quickArtifact.durationMs,
        sizeBytes: quickArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: quickArtifact.dataUrl,
        artifactAnalysis: {
          decodedDurationMs: quickArtifact.durationMs,
          sampleRate: 8_000,
          peakAmplitude: 0.35,
          rmsAmplitude: 0.24,
          estimatedFrequencyHz: 440,
          isSilent: false
        },
        settings: {
          bpm: 120,
          timeSignature: "4/4"
        }
      },
      {
        id: "sheet-beta",
        type: "sheet",
        origin: "user",
        name: "Beta sheet take",
        sessionId: "session-sheet-1",
        sheetId: "sheet-42",
        sheetName: "Moonlight Etude",
        createdAt: "2026-06-21T10:00:00.000Z",
        durationMs: sheetArtifact.durationMs,
        sizeBytes: sheetArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: sheetArtifact.dataUrl,
        artifactAnalysis: {
          decodedDurationMs: sheetArtifact.durationMs,
          sampleRate: 8_000,
          peakAmplitude: 0.35,
          rmsAmplitude: 0.24,
          estimatedFrequencyHz: 330,
          isSilent: false
        },
        trustedPeaks: [0.1, 0.4, 0.9, 0.45, 0.2],
        settings: {
          bpm: 96,
          timeSignature: "3/4"
        }
      },
      {
        id: "bad-gamma",
        type: "quick",
        origin: "user",
        name: "Broken audio take",
        sessionId: "session-quick-1",
        sheetId: null,
        createdAt: "2026-06-21T11:00:00.000Z",
        durationMs: 900,
        sizeBytes: 12,
        mimeType: "audio/wav",
        audioDataUrl: "data:audio/wav;base64,bm90LWF1ZGlv",
        settings: {
          bpm: 72,
          timeSignature: "4/4"
        }
      },
      {
        id: "trusted-missing",
        type: "sheet",
        origin: "user",
        name: "Trusted peaks missing artifact",
        sessionId: "session-sheet-1",
        sheetId: "sheet-42",
        sheetName: "Moonlight Etude",
        createdAt: "2026-06-21T12:00:00.000Z",
        durationMs: 1_000,
        sizeBytes: 0,
        mimeType: "audio/wav",
        audioDataUrl: null,
        trustedPeaks: [0.1, 0.7, 0.2],
        settings: {
          bpm: 96,
          timeSignature: "3/4"
        }
      },
      {
        id: "trusted-bad",
        type: "sheet",
        origin: "user",
        name: "Trusted peaks bad artifact",
        sessionId: "session-sheet-1",
        sheetId: "sheet-42",
        sheetName: "Moonlight Etude",
        createdAt: "2026-06-21T13:00:00.000Z",
        durationMs: 1_000,
        sizeBytes: 12,
        mimeType: "audio/wav",
        audioDataUrl: "data:audio/wav;base64,bm90LWF1ZGlv",
        trustedPeaks: [0.1, 0.7, 0.2],
        settings: {
          bpm: 96,
          timeSignature: "3/4"
        }
      },
      {
        id: "mismatch-delta",
        type: "quick",
        origin: "user",
        name: "Duration mismatch take",
        sessionId: "session-quick-1",
        sheetId: null,
        createdAt: "2026-06-21T14:00:00.000Z",
        durationMs: 4_000,
        sizeBytes: mismatchArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: mismatchArtifact.dataUrl,
        settings: {
          bpm: 88,
          timeSignature: "4/4"
        }
      },
      {
        id: "invalid-peaks-epsilon",
        type: "sheet",
        origin: "user",
        name: "Invalid waveform peaks take",
        sessionId: "session-sheet-1",
        sheetId: "sheet-42",
        sheetName: "Moonlight Etude",
        createdAt: "2026-06-21T15:00:00.000Z",
        durationMs: invalidPeaksArtifact.durationMs,
        sizeBytes: invalidPeaksArtifact.sizeBytes,
        mimeType: "audio/wav",
        audioDataUrl: invalidPeaksArtifact.dataUrl,
        trustedPeaks: [0, 0],
        settings: {
          bpm: 96,
          timeSignature: "3/4"
        }
      }
    ],
    errorMarkers: [
      {
        id: "marker-late",
        recordingId: "quick-alpha",
        timestampMs: 900,
        note: "Late accent"
      },
      {
        id: "marker-early",
        recordingId: "quick-alpha",
        timestampMs: 500,
        note: "Early entrance"
      }
    ]
  });

  await page.reload();
  await expect(page.getByTestId("recordings-list")).toBeVisible();
  await expect(page.getByText("Alpha quick take")).toBeVisible();
  await expect(page.getByTestId("recording-row-sheet-beta")).toBeVisible();
  const decodedArtifactEvidence = {
    quick: await decodeRecordingHistoryAudio(page, "quick-alpha"),
    sheet: await decodeRecordingHistoryAudio(page, "sheet-beta")
  };

  expect(decodedArtifactEvidence.quick.decodedDurationMs).toBeGreaterThan(950);
  expect(decodedArtifactEvidence.quick.decodedDurationMs).toBeLessThan(1_050);
  expect(decodedArtifactEvidence.quick.peakAmplitude).toBeGreaterThan(0.2);
  expect(decodedArtifactEvidence.quick.rmsAmplitude).toBeGreaterThan(0.1);
  expect(decodedArtifactEvidence.sheet.decodedDurationMs).toBeGreaterThan(
    1_150
  );
  expect(decodedArtifactEvidence.sheet.decodedDurationMs).toBeLessThan(1_250);
  expect(decodedArtifactEvidence.sheet.peakAmplitude).toBeGreaterThan(0.2);
  expect(decodedArtifactEvidence.sheet.rmsAmplitude).toBeGreaterThan(0.1);

  const originalSnapshot = await readRecordingHistory(page);
  const originalRecording = originalSnapshot.recordings.find(
    (item: { id: string }) => item.id === "quick-alpha"
  );

  if (!originalRecording) {
    throw new Error("Expected quick-alpha recording to be seeded.");
  }

  const originalQuickAlphaSnapshot = {
    id: originalRecording.id,
    type: originalRecording.type,
    origin: originalRecording.origin,
    name: originalRecording.name,
    sessionId: originalRecording.sessionId,
    sheetId: originalRecording.sheetId,
    createdAt: originalRecording.createdAt,
    durationMs: originalRecording.durationMs,
    sizeBytes: originalRecording.sizeBytes,
    mimeType: originalRecording.mimeType,
    audioDataUrl: originalRecording.audioDataUrl,
    artifactAnalysis: originalRecording.artifactAnalysis,
    settings: {
      bpm: originalRecording.settings.bpm,
      timeSignature: originalRecording.settings.timeSignature
    }
  };

  await page.getByRole("textbox", { name: "Search recordings" }).fill("Alpha");
  await expect(page.getByTestId("recording-row-quick-alpha")).toBeVisible();
  await expect(page.getByText("Moonlight Etude")).toBeHidden();
  await page.getByLabel("Type filter").selectOption("quick");
  await expect(page.getByTestId("recording-row-quick-alpha")).toBeVisible();

  await page.getByTestId("recording-row-quick-alpha").click();
  await expect(page.getByTestId("recording-details")).toBeVisible();
  await expect(
    page.getByTestId("recording-details").getByText("120")
  ).toBeVisible();
  await expect(
    page.getByTestId("recording-details").getByText("4/4")
  ).toBeVisible();
  const quickWaveformBeforePlayback = await expectVisibleDerivedWaveform({
    page,
    source: "decoded-audio",
    peakCount: 48,
    label: "quick-alpha before playback"
  });
  await expect(page.getByTestId("recording-duration-warning")).toBeHidden();
  await expect(page.getByTestId("error-marker-list")).toContainText("0:01");
  await expect(page.getByTestId("error-marker-list")).toContainText(
    "Early entrance"
  );
  await expect(page.getByTestId("error-marker-list")).toContainText(
    "Late accent"
  );
  await page
    .getByTestId("error-marker-list")
    .getByRole("button", { name: "Seek to marker 0:01" })
    .first()
    .click();
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & {
      __recordingsSeekEvents?: {
        recordingId: string;
        timestampMs: number;
        currentTimeMs: number;
      }[];
    };

    return e2eWindow.__recordingsSeekEvents?.some(
      (event) =>
        event.recordingId === "quick-alpha" &&
        event.timestampMs === 500 &&
        Math.abs(event.currentTimeMs - 500) <= 80
    );
  });
  await expect(
    page.getByTestId("recording-error-marker-message")
  ).toContainText("Playback moved to 0:01.");

  const quickWaveformAdapter = page.getByTestId("waveform-adapter");

  await expect(quickWaveformAdapter).toHaveAttribute(
    "data-playback-ready",
    "true"
  );
  const quickSeekSurface = page.getByTestId("waveform-adapter-seek-surface");
  const quickWaveformBox = await quickSeekSurface.boundingBox();

  expect(quickWaveformBox).not.toBeNull();
  await quickSeekSurface.click({
    position: {
      x: (quickWaveformBox?.width ?? 0) * 0.75,
      y: (quickWaveformBox?.height ?? 0) / 2
    }
  });
  await expect
    .poll(async () =>
      Number(await quickWaveformAdapter.getAttribute("data-current-time-ms"))
    )
    .toBeGreaterThan(590);
  await expect
    .poll(async () =>
      Number(await quickWaveformAdapter.getAttribute("data-current-time-ms"))
    )
    .toBeLessThan(910);

  await page.getByRole("button", { name: "Play Recording" }).click();
  await expect(page.getByTestId("recording-playback-status")).toBeVisible();
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & {
      __recordingsPlaybackEvents?: { recordingId: string; state: string }[];
    };

    return e2eWindow.__recordingsPlaybackEvents?.some(
      (event) =>
        event.recordingId === "quick-alpha" && event.state === "playing"
    );
  });
  await page.getByRole("button", { name: "Pause Recording" }).click();
  await expect(page.getByTestId("recording-playback-status")).toBeHidden();
  const quickWaveformAfterPlayback = await expectVisibleDerivedWaveform({
    page,
    source: "decoded-audio",
    peakCount: 48,
    label: "quick-alpha after playback"
  });

  expectStableWaveform(
    quickWaveformBeforePlayback,
    quickWaveformAfterPlayback,
    "quick-alpha playback interaction"
  );

  await page
    .getByRole("link", {
      name: "Practice again in Quick Metronome for Alpha quick take"
    })
    .click();
  await expect(page).toHaveURL(/\/quick-metronome\?recordingId=quick-alpha/);
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText("Recording without metronome.")).toBeVisible();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText(/^Recording saved/)).toBeVisible();

  const continuedSnapshot = await readRecordingHistory(page);
  const originalAfterContinue = continuedSnapshot.recordings.find(
    (recording: { id: string }) => recording.id === "quick-alpha"
  );
  const continued = continuedSnapshot.recordings.find(
    (recording: { id: string; type: string; origin: string }) =>
      recording.id !== "quick-alpha" &&
      recording.type === "quick" &&
      recording.origin === "user"
  );
  const continuedRecordingEvidence = {
    original: originalAfterContinue
      ? {
          id: originalAfterContinue.id,
          type: originalAfterContinue.type,
          origin: originalAfterContinue.origin,
          name: originalAfterContinue.name,
          sessionId: originalAfterContinue.sessionId,
          sheetId: originalAfterContinue.sheetId,
          createdAt: originalAfterContinue.createdAt,
          durationMs: originalAfterContinue.durationMs,
          sizeBytes: originalAfterContinue.sizeBytes,
          mimeType: originalAfterContinue.mimeType,
          audioDataUrl: originalAfterContinue.audioDataUrl,
          artifactAnalysis: originalAfterContinue.artifactAnalysis,
          settings: {
            bpm: originalAfterContinue.settings.bpm,
            timeSignature: originalAfterContinue.settings.timeSignature
          }
        }
      : null,
    continued: continued
      ? {
          id: continued.id,
          durationMs: continued.durationMs,
          sessionId: continued.sessionId,
          decodedDurationMs:
            continued.artifactAnalysis?.decodedDurationMs ?? null,
          isSilent: continued.artifactAnalysis?.isSilent ?? null
        }
      : null
  };

  expect(continuedRecordingEvidence.original).toEqual(
    originalQuickAlphaSnapshot
  );
  expect(continuedRecordingEvidence.continued?.id).not.toBe("quick-alpha");
  expect(continuedRecordingEvidence.continued?.sessionId).not.toBe(
    "session-quick-1"
  );
  expect(
    continuedRecordingEvidence.continued?.decodedDurationMs
  ).toBeGreaterThan(600);
  expect(
    Math.abs(
      (continuedRecordingEvidence.continued?.durationMs ?? 0) -
        (continuedRecordingEvidence.continued?.decodedDurationMs ?? 0)
    )
  ).toBeLessThanOrEqual(1);
  expect(continuedRecordingEvidence.continued?.isSilent).toBe(false);

  await page.goto("/recordings");
  await page.getByRole("textbox", { name: "Search recordings" }).fill("Alpha");
  await expect(page.getByTestId("recording-row-quick-alpha")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search recordings" })
    .fill("Quick metronome");
  await page
    .getByTestId(`recording-row-${continuedRecordingEvidence.continued?.id}`)
    .click();
  await expectVisibleDerivedWaveform({
    page,
    source: "decoded-audio",
    peakCount: 48,
    label: "continued quick recording after filter"
  });
  await expect(page.getByTestId("recording-duration-warning")).toBeHidden();

  await page.goto("/recordings");
  await page.getByRole("textbox", { name: "Search recordings" }).fill("");
  await page.getByLabel("Type filter").selectOption("sheet");
  await expect(page.getByTestId("recording-row-sheet-beta")).toBeVisible();
  await expect(page.getByText("Alpha quick take")).toBeHidden();
  await page.getByTestId("recording-row-sheet-beta").click();
  await expect(
    page.getByTestId("recording-details").getByText("Moonlight Etude")
  ).toBeVisible();
  const sheetWaveformBeforePlayback = await expectVisibleDerivedWaveform({
    page,
    source: "trusted-peaks",
    peakCount: 5,
    label: "sheet-beta before playback"
  });
  await expect(page.getByTestId("recording-duration-warning")).toBeHidden();
  await page.getByRole("button", { name: "Play Recording" }).click();
  await expect(page.getByTestId("recording-playback-status")).toBeVisible();
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & {
      __recordingsPlaybackEvents?: { recordingId: string; state: string }[];
    };

    return e2eWindow.__recordingsPlaybackEvents?.some(
      (event) => event.recordingId === "sheet-beta" && event.state === "playing"
    );
  });
  await page.getByRole("button", { name: "Pause Recording" }).click();
  await expect(page.getByTestId("recording-playback-status")).toBeHidden();
  const sheetWaveformAfterPlayback = await expectVisibleDerivedWaveform({
    page,
    source: "trusted-peaks",
    peakCount: 5,
    label: "sheet-beta after playback"
  });

  expectStableWaveform(
    sheetWaveformBeforePlayback,
    sheetWaveformAfterPlayback,
    "sheet-beta playback interaction"
  );
  await page
    .getByRole("link", {
      name: "Practice again for whole-sheet practice on Moonlight Etude"
    })
    .click();
  await expect(page).toHaveURL(
    /\/sheet-practice\?recordingId=sheet-beta&sheetId=sheet-42/
  );

  await page.goto("/recordings");
  await page
    .getByRole("textbox", { name: "Search recordings" })
    .fill("Duration mismatch");
  await page.getByLabel("Type filter").selectOption("all");
  await page.getByTestId("recording-row-mismatch-delta").click();
  await expect(page.getByTestId("recording-duration-warning")).toContainText(
    "differs from saved metadata"
  );

  await page.goto("/recordings");
  await page.getByRole("textbox", { name: "Search recordings" }).fill("Alpha");
  await page.getByLabel("Type filter").selectOption("all");
  await page.getByTestId("recording-row-quick-alpha").click();
  await page.getByRole("button", { name: "Delete Recording" }).click();
  await page.getByRole("button", { name: "Confirm Delete" }).click();
  await expect(page.getByText("Alpha quick take")).toBeHidden();

  await page.reload();
  await expect(page.getByText("Alpha quick take")).toBeHidden();
  const afterDeleteSnapshot = await readRecordingHistory(page);
  const deletedEvidence = {
    hasDeletedRecording: afterDeleteSnapshot.recordings.some(
      (recording: { id: string }) => recording.id === "quick-alpha"
    ),
    hasDeletedMarker: afterDeleteSnapshot.errorMarkers.some(
      (marker: { recordingId: string }) => marker.recordingId === "quick-alpha"
    ),
    deletedArtifact:
      afterDeleteSnapshot.recordings.find(
        (recording: { id: string }) => recording.id === "quick-alpha"
      )?.audioDataUrl ?? null
  };

  expect(deletedEvidence).toEqual({
    hasDeletedRecording: false,
    hasDeletedMarker: false,
    deletedArtifact: null
  });

  await page.getByRole("textbox", { name: "Search recordings" }).fill("Broken");
  await page.getByTestId("recording-row-bad-gamma").click();
  await expect(page.getByTestId("recording-artifact-error")).toContainText(
    "cannot be decoded"
  );
  await expect(page.getByTestId("derived-waveform")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Play Recording" })
  ).toBeDisabled();

  await page
    .getByRole("textbox", { name: "Search recordings" })
    .fill("Trusted peaks missing");
  await page.getByTestId("recording-row-trusted-missing").click();
  await expect(page.getByTestId("recording-artifact-error")).toContainText(
    "no accessible audio artifact"
  );
  await expect(page.getByTestId("derived-waveform")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Play Recording" })
  ).toBeDisabled();

  await page
    .getByRole("textbox", { name: "Search recordings" })
    .fill("Trusted peaks bad");
  await page.getByTestId("recording-row-trusted-bad").click();
  await expect(page.getByTestId("recording-artifact-error")).toContainText(
    "cannot be decoded"
  );
  await expect(page.getByTestId("derived-waveform")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Play Recording" })
  ).toBeDisabled();

  await page
    .getByRole("textbox", { name: "Search recordings" })
    .fill("Invalid waveform peaks");
  await page.getByTestId("recording-row-invalid-peaks-epsilon").click();
  await expect(page.getByTestId("recording-artifact-error")).toContainText(
    "invalid waveform peak data"
  );
  await expect(page.getByTestId("derived-waveform")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Play Recording" })
  ).toBeDisabled();

  const playbackRejections = await page.evaluate(() => {
    const e2eWindow = window as Window & {
      __recordingsPlaybackRejections?: string[];
    };

    return e2eWindow.__recordingsPlaybackRejections ?? [];
  });

  expect(playbackRejections).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
