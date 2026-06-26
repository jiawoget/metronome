import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PracticeSegmentSelectorPanel } from "@/components/sheet-practice/segments/practice-segment-selector-panel";
import {
  createPracticeSegmentGridAssociation,
  type MeasureGrid,
  type PracticeSegment
} from "@/domain/practice";
import type { MeasureGridService } from "@/services/measure-grid";
import type { PracticeSegmentService } from "@/services/practice-segments";
import { useSheetPracticeRecordingWorkflowStore } from "@/stores/sheet-practice-recording-workflow-store";

const currentGrid: MeasureGrid = {
  bpm: 96,
  timeSignature: "4/4",
  pickupBeats: 0,
  measureOneOffsetMs: 1_000
};

const staleGrid: MeasureGrid = {
  bpm: 104,
  timeSignature: "4/4",
  pickupBeats: 0,
  measureOneOffsetMs: 1_000
};

function resetRecordingWorkflowStore() {
  useSheetPracticeRecordingWorkflowStore.setState({
    sheetId: null,
    activeSegmentId: null,
    status: "idle",
    error: null,
    rerecord: {
      readyRecordingId: null,
      error: null
    }
  });
}

function createSegment(overrides: Partial<PracticeSegment> = {}): PracticeSegment {
  return {
    id: "segment-alpha",
    sheetId: "sheet-alpha",
    name: "Measures 5 to 12",
    range: {
      startMeasure: 5,
      endMeasure: 12
    },
    targetBpm: 96,
    notes: null,
    grid: createPracticeSegmentGridAssociation(currentGrid),
    ...overrides
  };
}

function createPracticeSegmentService({
  segments = [],
  error = null,
  saveError = null,
  deleteError = null,
  getSegmentOverride,
  saveSegmentOverride,
  deleteSegmentOverride
}: {
  segments?: PracticeSegment[];
  error?: Error | null;
  saveError?: Error | null;
  deleteError?: Error | null;
  getSegmentOverride?: (sheetId: string, segmentId: string) => Promise<PracticeSegment | null>;
  saveSegmentOverride?: (segment: PracticeSegment) => Promise<PracticeSegment>;
  deleteSegmentOverride?: (sheetId: string, segmentId: string) => Promise<void>;
} = {}) {
  const segmentsBySheet = new Map<string, Map<string, PracticeSegment>>();

  for (const segment of segments) {
    const sheetSegments = segmentsBySheet.get(segment.sheetId) ?? new Map<string, PracticeSegment>();
    sheetSegments.set(segment.id, segment);
    segmentsBySheet.set(segment.sheetId, sheetSegments);
  }

  const service: PracticeSegmentService = {
    listSegments: vi.fn(async (sheetId) => {
      if (error) {
        throw error;
      }

      return Array.from(segmentsBySheet.get(sheetId)?.values() ?? []);
    }),
    getSegment: vi.fn(async (sheetId, segmentId) => {
      if (getSegmentOverride) {
        return getSegmentOverride(sheetId, segmentId);
      }

      return segmentsBySheet.get(sheetId)?.get(segmentId) ?? null;
    }),
    saveSegment: vi.fn(async (segment) => {
      if (saveError) {
        throw saveError;
      }

      if (saveSegmentOverride) {
        return saveSegmentOverride(segment);
      }

      const sheetSegments = segmentsBySheet.get(segment.sheetId) ?? new Map<string, PracticeSegment>();
      sheetSegments.set(segment.id, segment);
      segmentsBySheet.set(segment.sheetId, sheetSegments);

      return segment;
    }),
    deleteSegment: vi.fn(async (sheetId, segmentId) => {
      if (deleteError) {
        throw deleteError;
      }

      if (deleteSegmentOverride) {
        return deleteSegmentOverride(sheetId, segmentId);
      }

      segmentsBySheet.get(sheetId)?.delete(segmentId);
    })
  };

  return service;
}

function createMeasureGridService({
  grid = currentGrid,
  error = null
}: {
  grid?: MeasureGrid | null;
  error?: Error | null;
} = {}) {
  const service: MeasureGridService = {
    getGrid: vi.fn(async () => {
      if (error) {
        throw error;
      }

      return grid;
    }),
    saveGrid: vi.fn(async (_sheetId, nextGrid) => nextGrid),
    clearGrid: vi.fn(async () => undefined)
  };

  return service;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

async function renderPanel({
  sheetId = "sheet-alpha",
  practiceSegmentService = createPracticeSegmentService(),
  measureGridService = createMeasureGridService()
}: {
  sheetId?: string;
  practiceSegmentService?: PracticeSegmentService;
  measureGridService?: MeasureGridService;
} = {}) {
  render(
    <PracticeSegmentSelectorPanel
      sheetId={sheetId}
      practiceSegmentService={practiceSegmentService}
      measureGridService={measureGridService}
    />
  );

  await waitFor(() => {
    expect(screen.getByTestId("practice-segment-selector-status")).not.toHaveTextContent("Loading");
  });

  return { practiceSegmentService, measureGridService };
}

async function fillSegmentEditor({
  user,
  name = "Bridge polish",
  startMeasure = "5",
  endMeasure = "12",
  targetBpm = "96",
  notes = "Keep the shifts relaxed."
}: {
  user: ReturnType<typeof userEvent.setup>;
  name?: string;
  startMeasure?: string;
  endMeasure?: string;
  targetBpm?: string;
  notes?: string;
}) {
  await user.clear(screen.getByLabelText("Segment name"));
  await user.type(screen.getByLabelText("Segment name"), name);
  await user.clear(screen.getByLabelText("Start measure"));
  await user.type(screen.getByLabelText("Start measure"), startMeasure);
  await user.clear(screen.getByLabelText("End measure"));
  await user.type(screen.getByLabelText("End measure"), endMeasure);
  await user.clear(screen.getByLabelText("Target BPM"));
  if (targetBpm) {
    await user.type(screen.getByLabelText("Target BPM"), targetBpm);
  }
  await user.clear(screen.getByLabelText("Segment notes"));
  if (notes) {
    await user.type(screen.getByLabelText("Segment notes"), notes);
  }
}

describe("PracticeSegmentSelectorPanel", () => {
  beforeEach(() => {
    resetRecordingWorkflowStore();
  });

  it("loads to an empty state with a create affordance", async () => {
    const { practiceSegmentService, measureGridService } = await renderPanel();

    expect(practiceSegmentService.listSegments).toHaveBeenCalledWith("sheet-alpha");
    expect(measureGridService.getGrid).toHaveBeenCalledWith("sheet-alpha");
    expect(screen.getByTestId("practice-segment-selector-status")).toHaveTextContent("0 saved");
    expect(screen.getByText("No saved segments yet.")).toBeVisible();
    expect(screen.getByRole("button", { name: "New segment" })).toBeEnabled();
  });

  it("shows service errors locally", async () => {
    await renderPanel({
      practiceSegmentService: createPracticeSegmentService({ error: new Error("segment read failed") })
    });

    expect(screen.getByTestId("practice-segment-selector-status")).toHaveTextContent("Unavailable");
    expect(screen.getByText("segment read failed")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start metronome" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New segment" })).toBeDisabled();
  });

  it("creates a segment for the active sheet with normalized fields and selects it", async () => {
    const user = userEvent.setup();
    const practiceSegmentService = createPracticeSegmentService();

    await renderPanel({ practiceSegmentService });

    await user.click(screen.getByRole("button", { name: "New segment" }));
    await fillSegmentEditor({
      user,
      name: "  Bridge polish  ",
      startMeasure: "5",
      endMeasure: "12",
      targetBpm: "104",
      notes: "  Keep the shifts relaxed.  "
    });
    await user.click(screen.getByRole("button", { name: "Save segment" }));

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-selector-status")).toHaveTextContent("1 saved");
    });

    expect(practiceSegmentService.saveSegment).toHaveBeenCalledTimes(1);
    expect(practiceSegmentService.saveSegment).toHaveBeenCalledWith({
      id: expect.stringMatching(/^segment_/),
      sheetId: "sheet-alpha",
      name: "Bridge polish",
      range: {
        startMeasure: 5,
        endMeasure: 12
      },
      targetBpm: 104,
      notes: "Keep the shifts relaxed.",
      grid: createPracticeSegmentGridAssociation(currentGrid)
    });
    expect(screen.getAllByText("Bridge polish").length).toBeGreaterThan(0);
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Active segment");
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Bridge polish");
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: expect.stringMatching(/^segment_/)
    });
  });

  it("shows duplicate-name save rejection from the service without mutating the visible list", async () => {
    const user = userEvent.setup();
    const practiceSegmentService = createPracticeSegmentService({
      segments: [createSegment({ name: "Bridge" })],
      saveError: new Error("Segment name already exists.")
    });

    await renderPanel({ practiceSegmentService });
    await user.click(screen.getByRole("button", { name: "New segment" }));
    await fillSegmentEditor({
      user,
      name: " bridge ",
      startMeasure: "13",
      endMeasure: "16",
      targetBpm: "",
      notes: ""
    });
    await user.click(screen.getByRole("button", { name: "Save segment" }));

    await waitFor(() => {
      expect(screen.getByText("Segment name already exists.")).toBeVisible();
    });

    expect(screen.getByTestId("practice-segment-selector-status")).toHaveTextContent("1 saved");
    expect(screen.getByText("Bridge")).toBeVisible();
    expect(screen.getByTestId("practice-segment-editor")).toBeVisible();
  });

  it("blocks create when the current grid is missing or cannot be loaded", async () => {
    const missingGridService = createMeasureGridService({ grid: null });
    const gridErrorService = createMeasureGridService({ error: new Error("grid read failed") });
    const { rerender } = render(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={createPracticeSegmentService()}
        measureGridService={missingGridService}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-selector-status")).toHaveTextContent("0 saved");
    });

    expect(screen.getByRole("button", { name: "New segment" })).toBeDisabled();
    expect(screen.getByText("Save a measure grid before creating segments.")).toBeVisible();

    rerender(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={createPracticeSegmentService()}
        measureGridService={gridErrorService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/grid read failed/)).toBeVisible();
    });

    expect(screen.getByRole("button", { name: "New segment" })).toBeDisabled();
    expect(screen.getByText("Save a measure grid before creating segments.")).toBeVisible();
  });

  it("validates create drafts before calling save", async () => {
    const user = userEvent.setup();
    const practiceSegmentService = createPracticeSegmentService();

    await renderPanel({ practiceSegmentService });
    await user.click(screen.getByRole("button", { name: "New segment" }));

    expect(screen.getByText("Segment name is required.")).toBeVisible();
    expect(screen.getByText("Measures must be whole numbers starting at 1.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save segment" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Segment name"), {
      target: { value: "Invalid segment" }
    });
    fireEvent.change(screen.getByLabelText("Start measure"), {
      target: { value: "8" }
    });
    fireEvent.change(screen.getByLabelText("End measure"), {
      target: { value: "7" }
    });
    fireEvent.change(screen.getByLabelText("Target BPM"), {
      target: { value: "301" }
    });
    fireEvent.change(screen.getByLabelText("Segment notes"), {
      target: { value: "n".repeat(1001) }
    });

    expect(screen.getByText("End measure must be greater than or equal to start measure.")).toBeVisible();
    expect(screen.getByText("Target BPM must be an integer from 30 to 300.")).toBeVisible();
    expect(screen.getByText("Notes must be 1000 characters or fewer.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save segment" })).toBeDisabled();
    expect(practiceSegmentService.saveSegment).not.toHaveBeenCalled();
  });

  it("displays rows with range, target BPM, missing target BPM, and selection summary", async () => {
    const user = userEvent.setup();
    const primarySegment = createSegment();
    const secondarySegment = createSegment({
      id: "segment-beta",
      name: "Slow polish",
      range: {
        startMeasure: 2,
        endMeasure: 2
      },
      targetBpm: null
    });
    const practiceSegmentService = createPracticeSegmentService({
      segments: [primarySegment, secondarySegment]
    });

    await renderPanel({ practiceSegmentService });

    expect(screen.getByText("Measures 5 to 12")).toBeVisible();
    expect(screen.getByText("Measures 5-12")).toBeVisible();
    expect(screen.getByText("Target 96 BPM")).toBeVisible();
    expect(screen.getByText("Slow polish")).toBeVisible();
    expect(screen.getByText("Measure 2")).toBeVisible();
    expect(screen.getByText("No target BPM")).toBeVisible();
    expect(screen.getByText("Choose a segment")).toBeVisible();

    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));

    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Active segment");
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Measures 5 to 12");
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Measures 5-12");
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Target 96 BPM");
    expect(screen.getByTestId("practice-segment-active-status")).toHaveTextContent("Ready");
    expect(screen.getByText("Active")).toBeVisible();
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: "segment-alpha"
    });
    expect(practiceSegmentService.saveSegment).not.toHaveBeenCalled();
    expect(practiceSegmentService.deleteSegment).not.toHaveBeenCalled();
  });

  it("edits a segment while preserving id, sheet id, and active selection", async () => {
    const user = userEvent.setup();
    const practiceSegmentService = createPracticeSegmentService({ segments: [createSegment()] });

    await renderPanel({ practiceSegmentService });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Edit Measures 5 to 12" }));

    expect(screen.getByLabelText("Segment name")).toHaveValue("Measures 5 to 12");
    expect(screen.getByLabelText("Start measure")).toHaveValue(5);
    expect(screen.getByLabelText("End measure")).toHaveValue(12);
    expect(screen.getByLabelText("Target BPM")).toHaveValue(96);

    await fillSegmentEditor({
      user,
      name: "Bridge revision",
      startMeasure: "6",
      endMeasure: "9",
      targetBpm: "",
      notes: "Slower first."
    });
    await user.click(screen.getByRole("button", { name: "Save segment" }));

    await waitFor(() => {
      expect(screen.getAllByText("Bridge revision").length).toBeGreaterThan(0);
    });

    expect(practiceSegmentService.getSegment).toHaveBeenCalledWith("sheet-alpha", "segment-alpha");
    expect(practiceSegmentService.saveSegment).toHaveBeenCalledWith({
      id: "segment-alpha",
      sheetId: "sheet-alpha",
      name: "Bridge revision",
      range: {
        startMeasure: 6,
        endMeasure: 9
      },
      targetBpm: null,
      notes: "Slower first.",
      grid: createPracticeSegmentGridAssociation(currentGrid)
    });
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Active segment");
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Bridge revision");
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Measures 6-9");
  });

  it("does not resurrect a missing segment during edit save", async () => {
    const user = userEvent.setup();
    const practiceSegmentService = createPracticeSegmentService({
      segments: [createSegment()],
      getSegmentOverride: async () => null
    });

    await renderPanel({ practiceSegmentService });
    await user.click(screen.getByRole("button", { name: "Edit Measures 5 to 12" }));
    await fillSegmentEditor({ user, name: "Should not save" });
    await user.click(screen.getByRole("button", { name: "Save segment" }));

    await waitFor(() => {
      expect(screen.getByText("Segment no longer exists.")).toBeVisible();
    });

    expect(practiceSegmentService.saveSegment).not.toHaveBeenCalled();
    expect(screen.queryByTestId("practice-segment-editor")).not.toBeInTheDocument();
  });

  it("requires delete confirmation, clears active delete, and preserves non-active selection", async () => {
    const user = userEvent.setup();
    const primarySegment = createSegment();
    const secondarySegment = createSegment({
      id: "segment-beta",
      name: "Slow polish",
      range: {
        startMeasure: 2,
        endMeasure: 2
      }
    });
    const practiceSegmentService = createPracticeSegmentService({
      segments: [primarySegment, secondarySegment]
    });

    await renderPanel({ practiceSegmentService });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Delete Slow polish" }));
    expect(screen.getByText("Delete Slow polish (Measure 2)?")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(practiceSegmentService.deleteSegment).not.toHaveBeenCalled();
    expect(screen.getByText("Slow polish")).toBeVisible();
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Measures 5 to 12");

    await user.click(screen.getByRole("button", { name: "Delete Slow polish" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete Slow polish" }));

    await waitFor(() => {
      expect(screen.queryByText("Slow polish")).not.toBeInTheDocument();
    });

    expect(practiceSegmentService.deleteSegment).toHaveBeenCalledWith("sheet-alpha", "segment-beta");
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Measures 5 to 12");

    await user.click(screen.getByRole("button", { name: "Delete Measures 5 to 12" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete Measures 5 to 12" }));

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-selector-status")).toHaveTextContent("0 saved");
    });

    expect(screen.getByTestId("practice-segment-empty-state")).toBeVisible();
    expect(screen.queryByTestId("practice-segment-active-summary")).not.toBeInTheDocument();
    expect(useSheetPracticeRecordingWorkflowStore.getState().activeSegmentId).toBeNull();
  });

  it("does not lock new-sheet controls when switching sheets while a save is unresolved", async () => {
    const user = userEvent.setup();
    const saveDeferred = createDeferred<PracticeSegment>();
    const bravoSegment = createSegment({
      id: "segment-bravo",
      sheetId: "sheet-bravo",
      name: "Bravo only"
    });
    const practiceSegmentService = createPracticeSegmentService({
      segments: [bravoSegment],
      saveSegmentOverride: async () => saveDeferred.promise
    });
    const measureGridService = createMeasureGridService();
    const { rerender } = render(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={practiceSegmentService}
        measureGridService={measureGridService}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-selector-status")).toHaveTextContent("0 saved");
    });
    await user.click(screen.getByRole("button", { name: "New segment" }));
    await fillSegmentEditor({ user });
    await user.click(screen.getByRole("button", { name: "Save segment" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    });

    rerender(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-bravo"
        practiceSegmentService={practiceSegmentService}
        measureGridService={measureGridService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Bravo only")).toBeVisible();
      expect(screen.getByRole("button", { name: "New segment" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Edit Bravo only" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Delete Bravo only" })).toBeEnabled();
    });

    await act(async () => {
      saveDeferred.resolve(
        createSegment({
          id: "segment-alpha-saved",
          name: "Alpha saved late"
        })
      );
      await saveDeferred.promise;
    });

    await waitFor(() => {
      expect(screen.getByText("Bravo only")).toBeVisible();
      expect(screen.getByRole("button", { name: "New segment" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Edit Bravo only" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Delete Bravo only" })).toBeEnabled();
    });
    expect(screen.queryByText("Alpha saved late")).not.toBeInTheDocument();
  });

  it("does not lock new-sheet controls when switching sheets while a delete is unresolved", async () => {
    const user = userEvent.setup();
    const deleteDeferred = createDeferred<void>();
    const bravoSegment = createSegment({
      id: "segment-bravo",
      sheetId: "sheet-bravo",
      name: "Bravo only"
    });
    const practiceSegmentService = createPracticeSegmentService({
      segments: [createSegment(), bravoSegment],
      deleteSegmentOverride: async () => deleteDeferred.promise
    });
    const measureGridService = createMeasureGridService();
    const { rerender } = render(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={practiceSegmentService}
        measureGridService={measureGridService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Measures 5 to 12")).toBeVisible();
    });
    await user.click(screen.getByRole("button", { name: "Delete Measures 5 to 12" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete Measures 5 to 12" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
    });

    rerender(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-bravo"
        practiceSegmentService={practiceSegmentService}
        measureGridService={measureGridService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Bravo only")).toBeVisible();
      expect(screen.getByRole("button", { name: "New segment" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Edit Bravo only" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Delete Bravo only" })).toBeEnabled();
    });

    await act(async () => {
      deleteDeferred.resolve(undefined);
      await deleteDeferred.promise;
    });

    await waitFor(() => {
      expect(screen.getByText("Bravo only")).toBeVisible();
      expect(screen.getByRole("button", { name: "New segment" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Edit Bravo only" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Delete Bravo only" })).toBeEnabled();
    });
  });

  it("disables editor save while a delete is in flight", async () => {
    const user = userEvent.setup();
    const deleteDeferred = createDeferred<void>();
    const primarySegment = createSegment();
    const secondarySegment = createSegment({
      id: "segment-beta",
      name: "Slow polish",
      range: {
        startMeasure: 2,
        endMeasure: 2
      }
    });
    const practiceSegmentService = createPracticeSegmentService({
      segments: [primarySegment, secondarySegment],
      deleteSegmentOverride: async () => deleteDeferred.promise
    });

    await renderPanel({ practiceSegmentService });
    await user.click(screen.getByRole("button", { name: "Edit Measures 5 to 12" }));
    expect(screen.getByRole("button", { name: "Save segment" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Delete Slow polish" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete Slow polish" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save segment" })).toBeDisabled();
    });

    fireEvent.submit(screen.getByTestId("practice-segment-editor"));
    expect(practiceSegmentService.saveSegment).not.toHaveBeenCalled();

    await act(async () => {
      deleteDeferred.resolve(undefined);
      await deleteDeferred.promise;
    });
  });

  it("preserves the persisted list and selection when save or delete fails", async () => {
    const user = userEvent.setup();
    const saveFailureService = createPracticeSegmentService({
      segments: [createSegment()],
      saveError: new Error("write failed")
    });
    const { rerender } = render(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={saveFailureService}
        measureGridService={createMeasureGridService()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Measures 5 to 12")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Edit Measures 5 to 12" }));
    await fillSegmentEditor({ user, name: "Failed save" });
    await user.click(screen.getByRole("button", { name: "Save segment" }));

    await waitFor(() => {
      expect(screen.getByText("write failed")).toBeVisible();
    });
    expect(screen.getAllByText("Measures 5 to 12").length).toBeGreaterThan(0);
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Measures 5 to 12");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    const deleteFailureService = createPracticeSegmentService({
      segments: [createSegment()],
      deleteError: new Error("delete failed")
    });

    rerender(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={deleteFailureService}
        measureGridService={createMeasureGridService()}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText("Measures 5 to 12").length).toBeGreaterThan(0);
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Delete Measures 5 to 12" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete Measures 5 to 12" }));

    await waitFor(() => {
      expect(screen.getByText("delete failed")).toBeVisible();
    });
    expect(screen.getAllByText("Measures 5 to 12").length).toBeGreaterThan(0);
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Measures 5 to 12");
  });

  it("maps grid statuses through the domain helper", async () => {
    const invalidAssociationSegment = createSegment({
      id: "segment-invalid",
      name: "Bad association",
      grid: {
        measureGridVersion: "",
        measureGridSnapshot: currentGrid
      }
    });

    const { rerender } = render(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={createPracticeSegmentService({ segments: [createSegment()] })}
        measureGridService={createMeasureGridService({ grid: null })}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-status-segment-alpha")).toHaveTextContent("Needs calibration");
    });

    rerender(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={createPracticeSegmentService({ segments: [createSegment()] })}
        measureGridService={createMeasureGridService({ grid: staleGrid })}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-status-segment-alpha")).toHaveTextContent("Grid changed");
    });

    rerender(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={createPracticeSegmentService({ segments: [invalidAssociationSegment] })}
        measureGridService={createMeasureGridService({ grid: currentGrid })}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-status-segment-invalid")).toHaveTextContent("Needs review");
    });
  });

  it("keeps segment rows visible when the grid read fails", async () => {
    await renderPanel({
      practiceSegmentService: createPracticeSegmentService({ segments: [createSegment()] }),
      measureGridService: createMeasureGridService({ error: new Error("grid read failed") })
    });

    expect(screen.getByText(/grid read failed/)).toBeVisible();
    expect(screen.getByText("Measures 5 to 12")).toBeVisible();
    expect(screen.getByTestId("practice-segment-status-segment-alpha")).toHaveTextContent("Needs calibration");
  });

  it("clears active selection when the loaded list no longer contains the selected segment", async () => {
    const user = userEvent.setup();
    const firstService = createPracticeSegmentService({ segments: [createSegment()] });
    const secondService = createPracticeSegmentService({
      segments: [
        createSegment({
          id: "segment-beta",
          name: "Replacement segment"
        })
      ]
    });
    const measureGridService = createMeasureGridService();
    const { rerender } = render(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={firstService}
        measureGridService={measureGridService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Measures 5 to 12")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    expect(screen.getByText("Active segment")).toBeVisible();

    rerender(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={secondService}
        measureGridService={measureGridService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Replacement segment")).toBeVisible();
    });
    expect(screen.getByText("Choose a segment")).toBeVisible();
    expect(screen.queryByText("Active segment")).not.toBeInTheDocument();
    expect(useSheetPracticeRecordingWorkflowStore.getState().activeSegmentId).toBeNull();
  });

  it("clears active selection when switching away from a sheet and does not restore it on switch back", async () => {
    const user = userEvent.setup();
    const alphaSegment = createSegment();
    const bravoSegment = createSegment({
      id: "segment-bravo",
      sheetId: "sheet-bravo",
      name: "Bravo only"
    });
    const practiceSegmentService: PracticeSegmentService = {
      listSegments: vi.fn(async (nextSheetId) =>
        nextSheetId === "sheet-alpha" ? [alphaSegment] : [bravoSegment]
      ),
      getSegment: vi.fn(async () => null),
      saveSegment: vi.fn(async (segment) => segment),
      deleteSegment: vi.fn(async () => undefined)
    };
    const measureGridService = createMeasureGridService();
    const { rerender } = render(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={practiceSegmentService}
        measureGridService={measureGridService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Measures 5 to 12")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Active segment");

    rerender(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-bravo"
        practiceSegmentService={practiceSegmentService}
        measureGridService={measureGridService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Bravo only")).toBeVisible();
    });
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Choose a segment");
    expect(screen.getByTestId("practice-segment-active-summary")).not.toHaveTextContent("Active segment");
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-bravo",
      activeSegmentId: null
    });

    rerender(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={practiceSegmentService}
        measureGridService={measureGridService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Measures 5 to 12")).toBeVisible();
    });
    expect(screen.getByTestId("practice-segment-active-summary")).toHaveTextContent("Choose a segment");
    expect(screen.getByTestId("practice-segment-active-summary")).not.toHaveTextContent("Active segment");
  });

  it("reloads by sheet id and ignores late old-sheet results", async () => {
    const alphaSegments = createDeferred<PracticeSegment[]>();
    const alphaGrid = createDeferred<MeasureGrid | null>();
    const bravoSegments = createDeferred<PracticeSegment[]>();
    const bravoGrid = createDeferred<MeasureGrid | null>();
    const practiceSegmentService: PracticeSegmentService = {
      listSegments: vi.fn((sheetId) =>
        sheetId === "sheet-alpha" ? alphaSegments.promise : bravoSegments.promise
      ),
      getSegment: vi.fn(async () => null),
      saveSegment: vi.fn(async (segment) => segment),
      deleteSegment: vi.fn(async () => undefined)
    };
    const measureGridService: MeasureGridService = {
      getGrid: vi.fn((sheetId) => (sheetId === "sheet-alpha" ? alphaGrid.promise : bravoGrid.promise)),
      saveGrid: vi.fn(async (_sheetId, grid) => grid),
      clearGrid: vi.fn(async () => undefined)
    };
    const { rerender } = render(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-alpha"
        practiceSegmentService={practiceSegmentService}
        measureGridService={measureGridService}
      />
    );

    rerender(
      <PracticeSegmentSelectorPanel
        sheetId="sheet-bravo"
        practiceSegmentService={practiceSegmentService}
        measureGridService={measureGridService}
      />
    );

    bravoSegments.resolve([
      createSegment({
        id: "segment-bravo",
        sheetId: "sheet-bravo",
        name: "Bravo only"
      })
    ]);
    bravoGrid.resolve(currentGrid);

    await waitFor(() => {
      expect(screen.getByText("Bravo only")).toBeVisible();
    });

    alphaSegments.resolve([createSegment({ name: "Alpha late" })]);
    alphaGrid.resolve(currentGrid);

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(screen.getByText("Bravo only")).toBeVisible();
    expect(screen.queryByText("Alpha late")).not.toBeInTheDocument();
    expect(practiceSegmentService.listSegments).toHaveBeenCalledWith("sheet-alpha");
    expect(practiceSegmentService.listSegments).toHaveBeenCalledWith("sheet-bravo");
    expect(measureGridService.getGrid).toHaveBeenCalledWith("sheet-alpha");
    expect(measureGridService.getGrid).toHaveBeenCalledWith("sheet-bravo");
  });
});
