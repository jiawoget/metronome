import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ContinuePracticeTargetIdentity,
  ContinuePracticeTargetsResult
} from "@/domain/practice";
import { useCommandPaletteContinueTargets } from "@/hooks/use-command-palette-continue-targets";

const serviceMocks = vi.hoisted(() => ({
  getContinuePracticeTargets: vi.fn(),
  subscribe: vi.fn()
}));

vi.mock("@/infrastructure/db/browser-practice-session-service", () => ({
  browserPracticeSessionService: serviceMocks
}));

function createSegmentTarget(): ContinuePracticeTargetIdentity {
  return {
    kind: "segment",
    sourceType: "sheet",
    activitySource: "session",
    label: "Bridge Focus",
    sessionId: "session-alpha",
    recordingId: null,
    occurredAt: "2026-06-21T12:00:00.000Z",
    sortTimestamp: "2026-06-21T12:00:00.000Z",
    targetKey: "segment:sheet-alpha:segment-alpha",
    sheetId: "sheet-alpha",
    sheetName: "Alpha Sheet",
    segmentId: "segment-alpha",
    segmentName: "Bridge Focus",
    segmentRangeLabel: "m5-8"
  };
}

function createContinueTargetsResult(
  targets: ContinuePracticeTargetIdentity[]
): ContinuePracticeTargetsResult {
  return {
    targets,
    generatedAt: "2026-06-21T12:30:00.000Z",
    limit: 5,
    rejected: []
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function HookHarness() {
  const {
    continueTargets,
    continueTargetsStatus,
    refreshContinueTargets
  } = useCommandPaletteContinueTargets();

  return (
    <div>
      <p data-testid="status">{continueTargetsStatus}</p>
      <p data-testid="targets">
        {continueTargets.targets.map((target) => target.targetKey).join(",")}
      </p>
      <button
        type="button"
        onClick={() => void refreshContinueTargets({ clearTargets: true })}
      >
        Refresh on open
      </button>
    </div>
  );
}

describe("useCommandPaletteContinueTargets", () => {
  beforeEach(() => {
    serviceMocks.getContinuePracticeTargets.mockReset();
    serviceMocks.subscribe.mockReset();
    serviceMocks.subscribe.mockReturnValue(vi.fn());
  });

  it("clears existing targets during an explicit palette-open refresh", async () => {
    const user = userEvent.setup();
    const reload = createDeferred<ContinuePracticeTargetsResult>();

    serviceMocks.getContinuePracticeTargets
      .mockResolvedValueOnce(createContinueTargetsResult([createSegmentTarget()]))
      .mockReturnValueOnce(reload.promise);

    render(<HookHarness />);

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("loaded"));
    expect(screen.getByTestId("targets")).toHaveTextContent(
      "segment:sheet-alpha:segment-alpha"
    );

    await user.click(screen.getByRole("button", { name: "Refresh on open" }));

    expect(screen.getByTestId("status")).toHaveTextContent("loading");
    expect(screen.getByTestId("targets")).toHaveTextContent("");

    await act(async () => {
      reload.resolve(createContinueTargetsResult([]));
      await reload.promise;
    });

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("loaded"));
    expect(screen.getByTestId("targets")).toHaveTextContent("");
    expect(serviceMocks.getContinuePracticeTargets).toHaveBeenCalledWith({
      limit: 5
    });
  });
});
