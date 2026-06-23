import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MeasureGridCalibrationPanel } from "@/components/sheet-practice/measure-grid/measure-grid-calibration-panel";
import type { MeasureGrid } from "@/domain/practice";
import type { MeasureGridService } from "@/services/measure-grid";

const fallbackSettings = {
  bpm: 96,
  timeSignature: "4/4" as const
};

function createMeasureGridService({
  initialGrid = null,
  getError = null,
  saveError = null
}: {
  initialGrid?: MeasureGrid | null;
  getError?: Error | null;
  saveError?: Error | null;
} = {}) {
  let savedGrid = initialGrid;
  const service: MeasureGridService = {
    getGrid: vi.fn(async () => {
      if (getError) {
        throw getError;
      }

      return savedGrid;
    }),
    saveGrid: vi.fn(async (_sheetId, grid) => {
      if (saveError) {
        throw saveError;
      }

      savedGrid = grid;

      return grid;
    }),
    clearGrid: vi.fn(async () => {
      savedGrid = null;
    })
  };

  return service;
}

async function renderPanel({
  service = createMeasureGridService(),
  sheetId = "sheet-alpha",
  defaultBpm = 72,
  defaultTimeSignature = "4/4",
  currentTimestampMs = null
}: {
  service?: MeasureGridService;
  sheetId?: string;
  defaultBpm?: number | null;
  defaultTimeSignature?: string | null;
  currentTimestampMs?: number | null;
} = {}) {
  render(
    <MeasureGridCalibrationPanel
      sheetId={sheetId}
      defaultBpm={defaultBpm}
      defaultTimeSignature={defaultTimeSignature}
      fallbackSettings={fallbackSettings}
      currentTimestampMs={currentTimestampMs}
      measureGridService={service}
    />
  );

  await waitFor(() => {
    expect(screen.getByTestId("measure-grid-status")).not.toHaveTextContent("Loading");
  });

  return service;
}

describe("MeasureGridCalibrationPanel", () => {
  it("loads no-grid defaults and keeps save disabled until an offset exists", async () => {
    await renderPanel();

    expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Needs calibration");
    expect(screen.getByRole("spinbutton", { name: "Grid BPM" })).toHaveValue(72);
    expect(screen.getByLabelText("Grid time signature")).toHaveValue("4/4");
    expect(screen.getByRole("spinbutton", { name: "Pickup beats" })).toHaveValue(0);
    expect(screen.getByRole("spinbutton", { name: "Measure 1 offset" })).toHaveValue(null);
    expect(screen.getByRole("button", { name: "Set measure 1 here" })).toBeDisabled();
    expect(screen.getByText("No playback timestamp available.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save grid" })).toBeDisabled();
  });

  it("shows a recoverable load error when getGrid rejects", async () => {
    const service = createMeasureGridService({ getError: new Error("read failed") });

    await renderPanel({ service });

    expect(service.getGrid).toHaveBeenCalledWith("sheet-alpha");
    expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Needs calibration");
    expect(screen.getByText("read failed")).toBeVisible();
    expect(screen.getByRole("spinbutton", { name: "Grid BPM" })).toHaveValue(72);
    expect(screen.getByRole("spinbutton", { name: "Measure 1 offset" })).toHaveValue(null);
    expect(screen.getByRole("button", { name: "Save grid" })).toBeDisabled();
  });

  it("treats a malformed persisted grid that loaded as null like an uncalibrated draft", async () => {
    const user = userEvent.setup();
    const service = createMeasureGridService({ initialGrid: null });

    await renderPanel({
      service,
      defaultBpm: null,
      defaultTimeSignature: "5/4"
    });

    expect(service.getGrid).toHaveBeenCalledWith("sheet-alpha");
    expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Needs calibration");
    expect(screen.getByRole("spinbutton", { name: "Grid BPM" })).toHaveValue(96);
    expect(screen.getByLabelText("Grid time signature")).toHaveValue("4/4");
    expect(screen.getByRole("spinbutton", { name: "Measure 1 offset" })).toHaveValue(null);
    expect(screen.getByRole("button", { name: "Save grid" })).toBeDisabled();

    await user.type(screen.getByRole("spinbutton", { name: "Measure 1 offset" }), "1250");
    await user.click(screen.getByRole("button", { name: "Save grid" }));

    await waitFor(() => {
      expect(service.saveGrid).toHaveBeenCalledWith("sheet-alpha", {
        bpm: 96,
        timeSignature: "4/4",
        pickupBeats: 0,
        measureOneOffsetMs: 1250
      });
    });
    expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Calibrated");
  });

  it("loads a saved grid as calibrated and saves valid edits through the service", async () => {
    const user = userEvent.setup();
    const service = createMeasureGridService({
      initialGrid: {
        bpm: 110,
        timeSignature: "3/4",
        pickupBeats: 1,
        measureOneOffsetMs: 1250
      }
    });

    await renderPanel({ service });

    expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Calibrated");
    expect(screen.getByRole("spinbutton", { name: "Grid BPM" })).toHaveValue(110);
    expect(screen.getByLabelText("Grid time signature")).toHaveValue("3/4");
    expect(screen.getByRole("spinbutton", { name: "Pickup beats" })).toHaveValue(1);
    expect(screen.getByRole("spinbutton", { name: "Measure 1 offset" })).toHaveValue(1250);

    await user.clear(screen.getByRole("spinbutton", { name: "Grid BPM" }));
    await user.type(screen.getByRole("spinbutton", { name: "Grid BPM" }), "112");

    expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Unsaved changes");
    await user.click(screen.getByRole("button", { name: "Save grid" }));

    await waitFor(() => {
      expect(service.saveGrid).toHaveBeenCalledWith("sheet-alpha", {
        bpm: 112,
        timeSignature: "3/4",
        pickupBeats: 1,
        measureOneOffsetMs: 1250
      });
    });
    expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Calibrated");
  });

  it("uses an injected current timestamp when available", async () => {
    const user = userEvent.setup();

    await renderPanel({ currentTimestampMs: 1500.4 });

    await user.click(screen.getByRole("button", { name: "Set measure 1 here" }));

    expect(screen.getByRole("spinbutton", { name: "Measure 1 offset" })).toHaveValue(1500);
    expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Unsaved changes");
  });

  it("blocks invalid drafts and does not call saveGrid", async () => {
    const user = userEvent.setup();
    const service = await renderPanel();

    await user.clear(screen.getByRole("spinbutton", { name: "Measure 1 offset" }));
    await user.type(screen.getByRole("spinbutton", { name: "Measure 1 offset" }), "1250");
    await user.clear(screen.getByRole("spinbutton", { name: "Grid BPM" }));
    await user.type(screen.getByRole("spinbutton", { name: "Grid BPM" }), "29");

    expect(screen.getByText("Grid BPM must be an integer from 30 to 300.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save grid" })).toBeDisabled();
    expect(service.saveGrid).not.toHaveBeenCalled();
  });

  it("revalidates pickup beats when the time signature changes", async () => {
    const user = userEvent.setup();

    await renderPanel();

    await user.clear(screen.getByRole("spinbutton", { name: "Pickup beats" }));
    await user.type(screen.getByRole("spinbutton", { name: "Pickup beats" }), "3");
    expect(screen.queryByText("Pickup beats must be an integer from 0 to 3.")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Grid time signature"), "3/4");

    expect(screen.getByText("Pickup beats must be an integer from 0 to 2.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save grid" })).toBeDisabled();
  });

  it("shows save failures without replacing the previous saved snapshot", async () => {
    const user = userEvent.setup();
    const service = createMeasureGridService({
      initialGrid: {
        bpm: 100,
        timeSignature: "4/4",
        pickupBeats: 0,
        measureOneOffsetMs: 500
      },
      saveError: new Error("write failed")
    });

    await renderPanel({ service });

    await user.clear(screen.getByRole("spinbutton", { name: "Grid BPM" }));
    await user.type(screen.getByRole("spinbutton", { name: "Grid BPM" }), "101");
    await user.click(screen.getByRole("button", { name: "Save grid" }));

    await waitFor(() => {
      expect(screen.getByText("write failed")).toBeVisible();
    });
    expect(screen.getByRole("spinbutton", { name: "Grid BPM" })).toHaveValue(101);
    expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Unsaved changes");
  });

  it("reloads draft defaults when the sheet id changes", async () => {
    const bravoGrid: MeasureGrid = {
      bpm: 84,
      timeSignature: "6/8",
      pickupBeats: 2,
      measureOneOffsetMs: 640
    };
    const service: MeasureGridService = {
      getGrid: vi.fn(async (sheetId) => (sheetId === "sheet-bravo" ? bravoGrid : null)),
      saveGrid: vi.fn(async (_sheetId, grid) => grid),
      clearGrid: vi.fn(async () => undefined)
    };
    const { rerender } = render(
      <MeasureGridCalibrationPanel
        sheetId="sheet-alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        fallbackSettings={fallbackSettings}
        measureGridService={service}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Needs calibration");
    });
    expect(screen.getByRole("spinbutton", { name: "Grid BPM" })).toHaveValue(72);

    rerender(
      <MeasureGridCalibrationPanel
        sheetId="sheet-bravo"
        defaultBpm={96}
        defaultTimeSignature="4/4"
        fallbackSettings={fallbackSettings}
        measureGridService={service}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Calibrated");
    });
    expect(screen.getByRole("spinbutton", { name: "Grid BPM" })).toHaveValue(84);
    expect(screen.getByLabelText("Grid time signature")).toHaveValue("6/8");
    expect(screen.getByRole("spinbutton", { name: "Measure 1 offset" })).toHaveValue(640);
  });
});
