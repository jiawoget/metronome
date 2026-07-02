import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/app-shell/app-shell";
import { ACTIVE_RECORDING_NAVIGATION_EVENT } from "@/lib/recording-navigation-guard";

let mockedPathname = "/";
const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
  useRouter: () => ({
    push: mockRouterPush
  })
}));

describe("AppShell", () => {
  beforeEach(() => {
    mockedPathname = "/";
    mockRouterPush.mockReset();
    window.history.replaceState(null, "", "/");
  });

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

  it("opens the command palette from the visible trigger and restores focus on Escape", async () => {
    const user = userEvent.setup();

    render(
      <AppShell>
        <main>Shell content</main>
      </AppShell>
    );

    const trigger = screen.getAllByRole("button", { name: "Open command palette" })[0];

    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Command palette" });
    const search = within(dialog).getByLabelText("Search commands");

    await waitFor(() => expect(search).toHaveFocus());
    expect(within(dialog).getByRole("option", { name: /Home/ })).toBeVisible();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Command palette" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("opens with Ctrl+K and Meta+K without hijacking ordinary inputs", async () => {
    const user = userEvent.setup();

    render(
      <AppShell>
        <main>
          <label htmlFor="goal-name">Goal name</label>
          <input id="goal-name" />
        </main>
      </AppShell>
    );

    await user.click(screen.getByLabelText("Goal name"));
    await user.keyboard("{Control>}k{/Control}");

    expect(screen.queryByRole("dialog", { name: "Command palette" })).not.toBeInTheDocument();

    await user.click(document.body);
    await user.keyboard("{Control>}k{/Control}");

    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeVisible();

    await user.keyboard("{Escape}");
    await user.keyboard("{Meta>}k{/Meta}");

    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  });

  it("updates the active result with arrow keys and ignores Enter when no result matches", async () => {
    const user = userEvent.setup();
    const pushStateSpy = vi.spyOn(window.history, "pushState");

    render(
      <AppShell>
        <main>Shell content</main>
      </AppShell>
    );

    await user.keyboard("{Control>}k{/Control}");

    const dialog = screen.getByRole("dialog", { name: "Command palette" });
    const search = within(dialog).getByLabelText("Search commands");

    await waitFor(() => expect(search).toHaveFocus());

    const firstActiveId = search.getAttribute("aria-activedescendant");

    await user.keyboard("{ArrowDown}");
    const secondActiveId = search.getAttribute("aria-activedescendant");

    expect(secondActiveId).toBeTruthy();
    expect(secondActiveId).not.toBe(firstActiveId);

    await user.keyboard("{ArrowUp}");
    expect(search.getAttribute("aria-activedescendant")).toBe(firstActiveId);

    await user.clear(search);
    await user.type(search, "definitely-no-command");
    await user.keyboard("{Enter}");

    expect(within(dialog).getByText("No commands found.")).toBeVisible();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.stringContaining("/"));
  });

  it("keeps click execution on the active-recording guarded navigation path", async () => {
    const user = userEvent.setup();

    render(
      <AppShell>
        <main>Shell content</main>
      </AppShell>
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(ACTIVE_RECORDING_NAVIGATION_EVENT, {
          detail: {
            sourceId: "unit-recording",
            label: "sheet recording",
            active: true
          }
        })
      );
    });

    await user.keyboard("{Control>}k{/Control}");
    const dialog = screen.getByRole("dialog", { name: "Command palette" });

    await user.type(within(dialog).getByLabelText("Search commands"), "recordings");
    await user.click(within(dialog).getByRole("option", { name: /Recordings/ }));

    expect(window.location.pathname).toBe("/");
    expect(screen.getByTestId("active-recording-navigation-guard")).toHaveTextContent(
      "Navigation blocked while sheet recording is active."
    );
  });

  it("keeps Enter execution on the active-recording guarded navigation path", async () => {
    const user = userEvent.setup();

    render(
      <AppShell>
        <main>Shell content</main>
      </AppShell>
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(ACTIVE_RECORDING_NAVIGATION_EVENT, {
          detail: {
            sourceId: "unit-recording",
            label: "sheet recording",
            active: true
          }
        })
      );
    });

    await user.keyboard("{Control>}k{/Control}");
    const dialog = screen.getByRole("dialog", { name: "Command palette" });

    await user.type(within(dialog).getByLabelText("Search commands"), "settings");
    await user.keyboard("{Enter}");

    expect(window.location.pathname).toBe("/");
    expect(screen.getByTestId("active-recording-navigation-guard")).toHaveTextContent(
      "Navigation blocked while sheet recording is active."
    );
  });
});
