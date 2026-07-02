import { expect, test, type Page } from "@playwright/test";

import { importTestSheet } from "./fixtures/sheets";
import {
  clearDatabases,
  clearRecordingHistory,
  MEASURE_GRID_DB_NAME,
  PRACTICE_SESSION_DB_NAME,
  PRACTICE_SEGMENT_DB_NAME,
  readPracticeSnapshot,
  SHEET_LIBRARY_DB_NAME
} from "./fixtures/storage";

const recordingHarnessEvent = "sheet-practice-controls:set-recording-harness-active";

type MetronomeTrace = {
  tickIndex: number;
  audioTime: number;
  accented: boolean;
  bpm: number;
  expectedIntervalMs: number;
  subdivision: string;
  timeSignature: string;
};

type PracticeSnapshot = {
  sessions: Array<{
    id: string;
    sourceType: string;
    sheetId: string | null;
    bpm: number | null;
    timeSignature: string | null;
    recordingCount: number;
    latestRecordingId: string | null;
  }>;
  recordings: Array<{
    id: string;
    type: string;
    sessionId: string;
    sheetId: string;
    audioDataUrl?: string | null;
  }>;
};

type BarCountInEvidence = {
  plans: Array<{
    beatCount: number;
    scope: string;
    startMeasure: number;
    segmentId: string | null;
  }>;
  ticks: Array<{
    count: number;
    remainingBeats: number;
    observedAt: number;
  }>;
  playback: Array<{
    bpm: number;
    observedAt: number;
  }>;
};

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function intervalsFromAudioTime(traces: MetronomeTrace[]) {
  return traces.slice(1).map((trace, index) => (trace.audioTime - traces[index].audioTime) * 1_000);
}

async function getPracticeSnapshot(page: Page) {
  return readPracticeSnapshot<PracticeSnapshot>(page);
}

async function saveMeasureGridThroughUi(
  page: Page,
  {
    bpm,
    timeSignature,
    pickupBeats,
    measureOneOffsetMs
  }: {
    bpm: number;
    timeSignature: string;
    pickupBeats: number;
    measureOneOffsetMs: number;
  }
) {
  await page.getByRole("spinbutton", { name: "Grid BPM" }).fill(String(bpm));
  await page.getByLabel("Grid time signature").selectOption(timeSignature);
  await page.getByRole("spinbutton", { name: "Pickup beats" }).fill(String(pickupBeats));
  await page.getByRole("spinbutton", { name: "Measure 1 offset" }).fill(String(measureOneOffsetMs));
  await page.getByRole("button", { name: "Save grid" }).click();
  await expect(page.getByTestId("measure-grid-status")).toContainText("Calibrated");
}

async function createPracticeSegmentThroughUi(
  page: Page,
  {
    name,
    startMeasure,
    endMeasure
  }: {
    name: string;
    startMeasure: number;
    endMeasure: number;
  }
) {
  await page.getByRole("button", { name: "New segment" }).click();
  await page.getByLabel("Segment name").fill(name);
  await page.getByLabel("Start measure").fill(String(startMeasure));
  await page.getByLabel("End measure").fill(String(endMeasure));
  await page.getByRole("button", { name: "Save segment" }).click();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("1 saved");
}

async function expectNoViewerOverlap(page: Page) {
  await expect(page.getByTestId("sheet-practice-controls")).toBeVisible();
  await expect(page.getByTestId("sheet-viewer-scroll")).toBeVisible();
  await page.getByTestId("sheet-practice-controls").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Start metronome" })).toBeVisible();

  const boxes = await page.evaluate(() => {
    const viewer = document.querySelector("[data-testid='sheet-viewer-scroll']")?.getBoundingClientRect();
    const controls = document.querySelector("[data-testid='sheet-practice-controls']")?.getBoundingClientRect();

    if (!viewer || !controls) {
      return null;
    }

    return {
      viewerBottom: viewer.bottom,
      controlsTop: controls.top,
      viewportHeight: window.innerHeight
    };
  });

  expect(boxes).not.toBeNull();
  expect(boxes?.controlsTop).toBeGreaterThanOrEqual((boxes?.viewerBottom ?? 0) - 1);
  expect(boxes?.controlsTop).toBeLessThan((boxes?.viewportHeight ?? 0) - 48);
}

test("sheet practice can run hidden bar-aware count-in before shared metronome playback", async ({
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

  await page.addInitScript(() => {
    const e2eWindow = window as Window & {
      __sheetPracticeControlsBarCountIn?: {
        enabled: boolean;
        countInMeasures: number;
      };
      __sheetPracticeControlsTestHarness?: boolean;
      __sheetBarCountInEvidence?: BarCountInEvidence;
    };

    e2eWindow.__sheetPracticeControlsTestHarness = true;
    e2eWindow.__sheetPracticeControlsBarCountIn = {
      enabled: true,
      countInMeasures: 1
    };
    e2eWindow.__sheetBarCountInEvidence = {
      plans: [],
      ticks: [],
      playback: []
    };
    window.addEventListener("sheet-practice-controls:bar-count-in-plan", (event) => {
      const plan = (event as CustomEvent<BarCountInEvidence["plans"][number]>).detail;

      e2eWindow.__sheetBarCountInEvidence?.plans.push({
        beatCount: plan.beatCount,
        scope: plan.scope,
        startMeasure: plan.startMeasure,
        segmentId: plan.segmentId
      });
    });
    window.addEventListener("sheet-practice-controls:bar-count-in-tick", (event) => {
      const tick = (event as CustomEvent<BarCountInEvidence["ticks"][number]>).detail;

      e2eWindow.__sheetBarCountInEvidence?.ticks.push({
        count: tick.count,
        remainingBeats: tick.remainingBeats,
        observedAt: performance.now()
      });
    });
    window.addEventListener("quick-metronome:scheduled-tick", (event) => {
      const trace = (event as CustomEvent<MetronomeTrace>).detail;

      e2eWindow.__sheetBarCountInEvidence?.playback.push({
        bpm: trace.bpm,
        observedAt: performance.now()
      });
    });
  });

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
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
  const { link } = await importTestSheet(page, {
    name: "Bar Count-In Controls Sheet",
    bpm: "120",
    timeSignature: "4/4"
  });

  await link.click();
  await expect(page.getByRole("heading", { name: "Bar Count-In Controls Sheet" })).toBeVisible();
  await saveMeasureGridThroughUi(page, {
    bpm: 240,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 0
  });
  await createPracticeSegmentThroughUi(page, {
    name: "Count-in bridge",
    startMeasure: 2,
    endMeasure: 4
  });

  await page.getByText("Count-in bridge").first().click();
  const startedAt = await page.evaluate(() => performance.now());

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Counting");
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __sheetBarCountInEvidence?: BarCountInEvidence };

    return (e2eWindow.__sheetBarCountInEvidence?.ticks.length ?? 0) >= 4;
  });
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing", {
    timeout: 5_000
  });
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __sheetBarCountInEvidence?: BarCountInEvidence };

    return (e2eWindow.__sheetBarCountInEvidence?.playback.length ?? 0) >= 1;
  });

  const evidence = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetBarCountInEvidence?: BarCountInEvidence };

    return e2eWindow.__sheetBarCountInEvidence;
  });
  const playingObservedAt = await page.evaluate(() => performance.now());

  expect(evidence?.plans).toHaveLength(1);
  expect(evidence?.plans[0]).toMatchObject({
    beatCount: 4,
    scope: "selected-segment",
    startMeasure: 2
  });
  expect(evidence?.plans[0]?.segmentId).toBeTruthy();
  expect(evidence?.ticks.map((tick) => tick.count)).toEqual([1, 2, 3, 4]);
  expect(evidence?.playback[0]?.bpm).toBe(120);
  expect(evidence?.ticks[0]?.observedAt).toBeLessThanOrEqual(
    evidence?.playback[0]?.observedAt ?? Number.POSITIVE_INFINITY
  );
  expect(playingObservedAt - startedAt).toBeGreaterThan(650);

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Stopped");
  expect(consoleErrors).toEqual([]);
});

test("sheet practice controls drive shared metronome timing, session activity, and recording independence", async ({
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

  await page.addInitScript(() => {
    const e2eWindow = window as Window & {
      __sheetMetronomeTraces?: MetronomeTrace[];
      __sheetPracticeControlsTestHarness?: boolean;
    };

    e2eWindow.__sheetPracticeControlsTestHarness = true;
    e2eWindow.__sheetMetronomeTraces = [];
    window.addEventListener("quick-metronome:scheduled-tick", (event) => {
      e2eWindow.__sheetMetronomeTraces?.push((event as CustomEvent<MetronomeTrace>).detail);
    });
  });

  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/sheet-library");
  await clearRecordingHistory(page);
  await clearDatabases(page, [SHEET_LIBRARY_DB_NAME, PRACTICE_SESSION_DB_NAME]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
  const { link, sheetId } = await importTestSheet(page, {
    name: "Controls Contract Sheet",
    bpm: "72",
    timeSignature: "4/4"
  });

  await link.click();
  await expect(page.getByRole("heading", { name: "Controls Contract Sheet" })).toBeVisible();
  await expect(page.getByTestId("sheet-practice-controls")).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "BPM", exact: true })).toHaveValue("72");
  await expect(page.getByLabel("Time signature", { exact: true })).toHaveValue("4/4");
  await expect(page.getByText("Defaults: 72 BPM, 4/4")).toBeVisible();
  await expect(page.getByTestId("sheet-session-id")).toContainText("none");
  await expect(page.getByTestId("sheet-recording-count")).toContainText("0");
  await expect(page.getByRole("button", { name: "Start recording harness" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop recording harness" })).toHaveCount(0);
  expect(await getPracticeSnapshot(page)).toEqual({ sessions: [], recordings: [] });
  await expectNoViewerOverlap(page);

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await expect(page.getByText("Metronome playing.")).toBeVisible();
  await expect(page.getByText(/locked while the metronome is running/i)).toBeVisible();
  await expect(page.getByLabel("Time signature", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Subdivision", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Countdown", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Every beat" })).toBeDisabled();
  await expect(page.getByRole("spinbutton", { name: "BPM", exact: true })).toBeEnabled();
  await expect(page.getByTestId("sheet-session-source")).toContainText("sheet");
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 72 && trace.subdivision === "quarter"
    ).length >= 4;
  });

  let snapshot = await getPracticeSnapshot(page);

  expect(snapshot.sessions).toHaveLength(1);
  expect(snapshot.sessions[0]).toMatchObject({
    sourceType: "sheet",
    sheetId,
    bpm: 72,
    timeSignature: "4/4",
    recordingCount: 0,
    latestRecordingId: null
  });
  expect(snapshot.recordings).toEqual([]);

  const bpm72Traces = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? [])
      .filter((trace) => trace.bpm === 72 && trace.subdivision === "quarter")
      .slice(-4);
  });
  const bpm72Intervals = intervalsFromAudioTime(bpm72Traces);

  expect(average(bpm72Intervals)).toBeGreaterThan(805);
  expect(average(bpm72Intervals)).toBeLessThan(860);
  expect(Math.max(...bpm72Intervals) - Math.min(...bpm72Intervals)).toBeLessThan(8);

  const bpmInput = page.getByRole("spinbutton", { name: "BPM", exact: true });

  await bpmInput.fill("90");
  await bpmInput.press("Enter");
  await expect(page.getByText(/Tick interval 667 ms/i)).toBeVisible();
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 90 && trace.subdivision === "quarter"
    ).length >= 4;
  });

  const bpm90Traces = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? [])
      .filter((trace) => trace.bpm === 90 && trace.subdivision === "quarter")
      .slice(-4);
  });
  const bpm90Intervals = intervalsFromAudioTime(bpm90Traces);

  expect(average(bpm90Intervals)).toBeGreaterThan(640);
  expect(average(bpm90Intervals)).toBeLessThan(695);
  expect(average(bpm90Intervals)).toBeLessThan(average(bpm72Intervals) - 120);

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Stopped");
  const traceCountAfterStop = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return e2eWindow.__sheetMetronomeTraces?.length ?? 0;
  });
  await page.waitForTimeout(700);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

        return e2eWindow.__sheetMetronomeTraces?.length ?? 0;
      })
    )
    .toBe(traceCountAfterStop);

  await page.getByLabel("Countdown", { exact: true }).selectOption("4");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Counting");
  await expect(page.getByText(/locked while the metronome is running/i)).toBeVisible();
  await expect(page.getByLabel("Time signature", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Subdivision", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Countdown", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Every beat" })).toBeDisabled();
  await expect(bpmInput).toBeEnabled();
  await bpmInput.fill("91");
  await bpmInput.press("Enter");
  await expect(bpmInput).toHaveValue("91");
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).some(
      (trace) => trace.bpm === 91 && trace.subdivision === "quarter"
    );
  });
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  snapshot = await getPracticeSnapshot(page);
  expect(snapshot.sessions[0]).toMatchObject({
    bpm: 91
  });
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByLabel("Countdown", { exact: true })).toBeEnabled();
  await page.getByLabel("Countdown", { exact: true }).selectOption("0");

  await bpmInput.fill("120");
  await bpmInput.press("Enter");
  await page.getByLabel("Time signature", { exact: true }).selectOption("3/4");
  await page.getByLabel("Subdivision", { exact: true }).selectOption("eighth");
  await page.getByRole("button", { name: "Downbeat" }).click();
  await page.getByRole("button", { name: "Start metronome" }).click();
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth"
    ).length >= 7;
  });

  const eighthTraces = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? [])
      .filter((trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth")
      .slice(-7);
  });
  const eighthIntervals = intervalsFromAudioTime(eighthTraces);

  expect(eighthTraces.map((trace) => trace.accented)).toEqual([true, false, false, false, false, false, true]);
  expect(eighthTraces.every((trace) => trace.expectedIntervalMs === 250)).toBe(true);
  expect(average(eighthIntervals)).toBeGreaterThan(235);
  expect(average(eighthIntervals)).toBeLessThan(265);

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await page.getByRole("button", { name: "Every beat" }).click();
  await expect(page.getByRole("button", { name: "Every beat" })).toHaveAttribute("aria-pressed", "true");
  const countBeforeEveryBeat = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth"
    ).length;
  });
  await page.getByRole("button", { name: "Start metronome" }).click();
  await page.waitForFunction((previousCount) => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth"
    ).length >= previousCount + 7;
  }, countBeforeEveryBeat);

  const everyBeatTraces = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? [])
      .filter((trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth")
      .slice(-7);
  });

  expect(everyBeatTraces.map((trace) => trace.accented)).toEqual([true, false, true, false, true, false, true]);

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await page.getByRole("button", { name: "Off" }).click();
  await expect(page.getByRole("button", { name: "Off" })).toHaveAttribute("aria-pressed", "true");
  const countBeforeOff = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth"
    ).length;
  });
  await page.getByRole("button", { name: "Start metronome" }).click();
  await page.waitForFunction((previousCount) => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth"
    ).length >= previousCount + 4;
  }, countBeforeOff);

  const offTraces = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? [])
      .filter((trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth")
      .slice(-4);
  });

  expect(offTraces.map((trace) => trace.accented)).toEqual([false, false, false, false]);

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-recording-count")).toContainText("0");

  await page.evaluate((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { active: true } }));
  }, recordingHarnessEvent);
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Stopped");
  await page.evaluate((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { active: false } }));
  }, recordingHarnessEvent);
  await expect(page.getByTestId("sheet-recording-state")).toContainText("stopped");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await page.evaluate((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { active: true } }));
    window.dispatchEvent(new CustomEvent(eventName, { detail: { active: false } }));
  }, recordingHarnessEvent);
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await page.getByRole("button", { name: "Stop metronome" }).click();

  snapshot = await getPracticeSnapshot(page);
  expect(snapshot.sessions).toHaveLength(1);
  expect(snapshot.recordings).toEqual([]);
  expect(snapshot.sessions[0]?.recordingCount).toBe(0);
  expect(snapshot.sessions[0]?.latestRecordingId).toBeNull();
  await expect(page.getByTestId("sheet-recording-count")).toContainText("0");

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoViewerOverlap(page);
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await expectNoViewerOverlap(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expectNoViewerOverlap(page);
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await page.setViewportSize({ width: 1280, height: 820 });
  await expectNoViewerOverlap(page);

  expect(consoleErrors).toEqual([]);
});
