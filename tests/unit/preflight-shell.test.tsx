import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PreflightShell } from "@/components/preflight/preflight-shell";

describe("PreflightShell", () => {
  it("renders the smoke shell without claiming product features are available", () => {
    render(<PreflightShell />);

    expect(
      screen.getByRole("heading", {
        name: "Metronome Practice"
      })
    ).toBeVisible();
    expect(screen.getByText("Smoke-ready shell")).toBeVisible();
    expect(screen.getByText(/Product modules are intentionally unavailable/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /play/i })).not.toBeInTheDocument();
  });
});
