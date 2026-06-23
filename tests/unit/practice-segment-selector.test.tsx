import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PracticeSegmentSelectorPanel } from "@/components/sheet-practice/segments/practice-segment-selector-panel";
import {
  createPracticeSegmentGridAssociation,
  type MeasureGrid,
  type PracticeSegment
} from "@/domain/practice";
import type { MeasureGridService } from "@/services/measure-grid";
import type { PracticeSegmentService } from "@/services/practice-segments";

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
  error = null
}: {
  segments?: PracticeSegment[];
  error?: Error | null;
} = {}) {
  const service: PracticeSegmentService = {
    listSegments: vi.fn(async () => {
      if (error) {
        throw error;
      }

      return segments;
    }),
    getSegment: vi.fn(async () => null),
    saveSegment: vi.fn(async (segment) => segment),
    deleteSegment: vi.fn(async () => undefined)
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

describe("PracticeSegmentSelectorPanel", () => {
  it("loads to an empty state without showing create/edit/delete UI", async () => {
    const { practiceSegmentService, measureGridService } = await renderPanel();

    expect(practiceSegmentService.listSegments).toHaveBeenCalledWith("sheet-alpha");
    expect(measureGridService.getGrid).toHaveBeenCalledWith("sheet-alpha");
    expect(screen.getByTestId("practice-segment-selector-status")).toHaveTextContent("0 saved");
    expect(screen.getByText("No saved segments yet.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /create|edit|delete/i })).not.toBeInTheDocument();
  });

  it("shows service errors locally", async () => {
    await renderPanel({
      practiceSegmentService: createPracticeSegmentService({ error: new Error("segment read failed") })
    });

    expect(screen.getByTestId("practice-segment-selector-status")).toHaveTextContent("Unavailable");
    expect(screen.getByText("segment read failed")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start metronome" })).not.toBeInTheDocument();
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
    expect(practiceSegmentService.saveSegment).not.toHaveBeenCalled();
    expect(practiceSegmentService.deleteSegment).not.toHaveBeenCalled();
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
