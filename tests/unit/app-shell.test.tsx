import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/app-shell/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

describe("AppShell", () => {
  it("keeps diagnostics recoverable after hiding devtools for the session", async () => {
    const user = userEvent.setup();

    render(
      <AppShell>
        <main>Shell content</main>
      </AppShell>
    );

    expect(screen.getByTestId("diagnostics-panel")).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: "Hide devtools for this session" })[0]);

    expect(screen.queryByTestId("diagnostics-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("diagnostics-restore")).toBeVisible();
    const restoreRegion = screen.getByTestId("diagnostics-restore");
    expect(within(restoreRegion).getByRole("button", { name: "Restore diagnostics" })).toBeVisible();

    await user.click(within(restoreRegion).getByRole("button", { name: "Restore diagnostics" }));

    expect(screen.getByTestId("diagnostics-panel")).toBeVisible();
    expect(screen.queryByTestId("diagnostics-restore")).not.toBeInTheDocument();
  });
});
