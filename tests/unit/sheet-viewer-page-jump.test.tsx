import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SheetPageJump } from "@/components/sheet-practice/viewer/sheet-page-jump";

function renderPageJump(options?: { currentPage?: number; totalPages?: number }) {
  const onJumpToPage = vi.fn();
  const result = render(
    <SheetPageJump
      currentPage={options?.currentPage ?? 1}
      totalPages={options?.totalPages ?? 2}
      onJumpToPage={onJumpToPage}
    />
  );

  return {
    ...result,
    input: screen.getByRole("textbox", { name: "Page number" }),
    button: screen.getByRole("button", { name: "Go" }),
    onJumpToPage
  };
}

describe("SheetPageJump", () => {
  it("renders accessible numeric text input and submit button", () => {
    const { input, button } = renderPageJump({ currentPage: 2 });

    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("pattern", "[0-9]*");
    expect(input).toHaveAttribute("placeholder", "2");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(button).toBeInTheDocument();
  });

  it("submits a valid page by clicking Go", async () => {
    const user = userEvent.setup();
    const { input, button, onJumpToPage } = renderPageJump();

    await user.type(input, "2");
    await user.click(button);

    expect(onJumpToPage).toHaveBeenCalledWith(2);
    expect(input).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("submits a valid page with Enter", async () => {
    const user = userEvent.setup();
    const { input, onJumpToPage } = renderPageJump();

    await user.type(input, "2");
    await user.keyboard("{Enter}");

    expect(onJumpToPage).toHaveBeenCalledWith(2);
  });

  it.each([
    ["blank", "", "Enter a page number from 1 to 2."],
    ["letters", "abc", "Enter a page number from 1 to 2."],
    ["decimal", "1.5", "Enter a page number from 1 to 2."],
    ["negative", "-1", "Enter a page number from 1 to 2."],
    ["zero", "0", "Page must be between 1 and 2."],
    ["out of range", "999", "Page must be between 1 and 2."]
  ])("rejects %s input without changing page", async (_name, value, message) => {
    const user = userEvent.setup();
    const { input, button, onJumpToPage } = renderPageJump();

    if (value) {
      await user.type(input, value);
    }
    await user.click(button);

    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent(message);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
    expect(onJumpToPage).not.toHaveBeenCalled();
  });

  it("recovers after invalid input with a later valid submit", async () => {
    const user = userEvent.setup();
    const { input, button, onJumpToPage } = renderPageJump();

    await user.type(input, "abc");
    await user.click(button);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "2");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(button);

    expect(onJumpToPage).toHaveBeenCalledWith(2);
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("uses the current page as the placeholder after prop changes", () => {
    const { input, rerender, onJumpToPage } = renderPageJump({ currentPage: 1 });

    rerender(<SheetPageJump currentPage={2} totalPages={2} onJumpToPage={onJumpToPage} />);

    expect(input).toHaveAttribute("placeholder", "2");
    expect(input).toHaveValue("");
  });
});
