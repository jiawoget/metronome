import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeDashboard } from "@/components/home/home-dashboard";

describe("HomeDashboard", () => {
  it("renders zero summary values and empty states without fake practice data", () => {
    render(<HomeDashboard />);

    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    expect(screen.getByText("Today Practice Summary")).toBeVisible();
    expect(screen.getByText("Minutes")).toBeVisible();
    expect(screen.getByText("Sessions")).toBeVisible();
    expect(screen.getByText("Recordings")).toBeVisible();
    expect(screen.getAllByText("0")).toHaveLength(3);
    expect(screen.getByText(/No recent practice session yet/i)).toBeVisible();
    expect(screen.getByText(/No sheets imported yet/i)).toBeVisible();
    expect(screen.getByText(/Import workflow is not enabled yet/i)).toBeVisible();
    expect(screen.getByText(/No recordings yet/i)).toBeVisible();
    expect(screen.getByText(/No recording or playback active/i)).toBeVisible();
  });

  it("links primary and utility entries to route shells", () => {
    render(<HomeDashboard />);

    expect(screen.getByRole("link", { name: "Open Quick Metronome" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );
    expect(screen.getByRole("link", { name: "Open Sheet Library" })).toHaveAttribute("href", "/sheet-library");
    expect(screen.getByRole("link", { name: "Import Sheet" })).toHaveAttribute("href", "/sheet-library");
    expect(screen.getByRole("link", { name: "Open Recordings" })).toHaveAttribute("href", "/recordings");
    expect(screen.getByRole("link", { name: "Open Settings" })).toHaveAttribute("href", "/settings");
  });
});
