# Sheet Viewer

## Purpose

This submodule displays the selected sheet inside Sheet Practice. It is responsible only for loading and rendering already-imported sheet artifacts.

It must prove that real PDF and image artifacts can be displayed. It must not fake sheet content.

## User Value

- The user can open an imported sheet and see the actual sheet content.
- The user can view PDF or image sheets.
- The user can zoom and scroll while practicing.
- The user sees clear errors when a sheet or file cannot be loaded.

## v0 Scope

- Receive sheetId from Sheet Practice route.
- Load sheet metadata.
- Load sheet file artifact.
- Render PDF sheet.
- Render image sheet.
- Show current page and total page count.
- Basic zoom.
- Basic scroll.
- Loading state.
- Missing sheetId error state.
- Sheet not found state.
- Missing artifact error state.
- Bad PDF or bad image error state.

## Out of Scope for v0

- Automatic page turning.
- Current-bar tracking.
- Score recognition.
- Bar-line detection.
- Annotation editing.
- Handwritten notes.
- Multi-sheet side-by-side view.
- Advanced PDF tools.
- Page thumbnails.

## User Paths

```text
Open a PDF sheet from Sheet Library
  -> Enter Sheet Practice
  -> See the PDF render
  -> Zoom
  -> Scroll
  -> Refresh
  -> See the same sheet render again
```

```text
Open an image sheet from Sheet Library
  -> Enter Sheet Practice
  -> See the image render
  -> Zoom
  -> Scroll
  -> Refresh
  -> See the same sheet render again
```

```text
Open a missing or invalid sheet
  -> See a clear error state
```

## Product Decisions

- The sheet is the visual priority in Sheet Practice.
- PDF and image files come from real Sheet Library artifacts.
- Missing files must not be replaced with fake sheet content.
- This viewer can be implemented and verified independently from metronome, recording, reference, and error marker submodules.
- If other Sheet Practice modules are unfinished, this viewer may run inside a route shell.

## Data Boundary

This module reads:

- Sheet metadata.
- Sheet file artifact.
- Sheet page count when available.

This module updates:

- Local viewer UI state such as page and zoom.

This module must not create:

- Sheets.
- Recordings.
- Practice Sessions.
- Error markers.
- Reference sources.
- Analysis data.

## State Boundary

Module-owned state:

- Loading state.
- Render-ready state.
- Error state.
- Current page.
- Total pages display state.
- Zoom level.
- Scroll position if needed.

Shared state:

- Active sheetId from route.
- Sheet metadata from the sheet service.
- Sheet artifact from the file service.

## Architecture Boundary

The UI may call sheet and viewer services.

The UI must not directly call:

- IndexedDB / Dexie.
- Raw browser storage APIs.
- PDF parser internals.
- Image decoding internals as persistence source.

PDF rendering and image decoding should sit behind viewer or artifact service boundaries where feasible.

## Dependencies

- `04-sheet-library` for imported metadata and file artifacts.
- `05-sheet-practice` route shell for placement.
- Local Data for persisted artifacts.

## Acceptance Criteria

- [ ] The user can open a sheet from Sheet Library into Sheet Practice.
- [ ] The viewer loads sheet metadata by sheetId.
- [ ] The viewer loads the real sheet artifact.
- [ ] A PDF sheet renders at least the first page.
- [ ] An image sheet renders the actual image.
- [ ] Current page and total page count are visible when applicable.
- [ ] The user can zoom in and out.
- [ ] The user can scroll the sheet content.
- [ ] The viewer remains usable after resizing the browser window.
- [ ] Reloading the page renders the same sheet again.
- [ ] Missing sheetId shows a clear error state.
- [ ] Unknown sheetId shows a not found state.
- [ ] Missing artifact shows a file error state.
- [ ] Bad PDF shows an error state.
- [ ] Bad image shows an error state.
- [ ] No fake sheet content is accepted.

## Test Plan

### Unit Tests

- sheetId parsing.
- Viewer state transitions: loading, ready, error.
- Page count display formatting.
- Zoom min, max, and step behavior.
- Artifact type detection.
- Error type mapping.

### Integration Tests

- Load metadata by sheetId.
- Load artifact from metadata.
- PDF artifact is accepted by the viewer service.
- Image artifact is accepted by the viewer service.
- Missing artifact returns an error.
- Bad PDF returns an error.
- Bad image returns an error.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Import or seed a real PDF sheet.
- Open the PDF sheet from Sheet Library.
- Verify first page is visibly rendered.
- Zoom through visible controls.
- Scroll the sheet area.
- Resize the browser window from desktop to narrow mobile and verify the sheet remains visible and usable.
- Resize back to desktop and verify the sheet remains visible and usable.
- Reload and verify the same PDF sheet renders again.
- Return to Sheet Library.
- Import or seed a real image sheet.
- Open the image sheet.
- Verify the image is visibly rendered.
- Zoom through visible controls.
- Scroll the sheet area.
- Resize the browser window from desktop to narrow mobile and verify the image remains visible and usable.
- Resize back to desktop and verify the image remains visible and usable.
- Reload and verify the same image sheet renders again.
- Open a missing or unknown sheetId and verify error state.
- Seed a missing artifact sheet and verify file error state.
- Seed bad PDF and bad image fixtures and verify error states.
- Check browser console errors during tested flows.

### Manual QA

- Inspect desktop layout.
- Inspect mobile layout.
- Confirm the sheet remains visually central.
- Confirm zoomed content does not overlap essential controls.

### Specialized Verification

#### PDF Render Verification

Verification must use a real PDF fixture.

The verifier must check:

- PDF artifact is real and readable.
- The first page renders to a visible canvas, image, or text layer.
- Rendered output is non-empty.
- Page count matches the fixture when available, or is otherwise reasonable and documented.

#### Image Render Verification

Verification must use a real PNG or JPG fixture.

The verifier must check:

- Image artifact is real and readable.
- Image decodes successfully.
- Rendered image dimensions are non-zero.
- Visible rendered output matches the fixture at a basic level.

#### Layout Verification

The verifier must check:

- Desktop viewport.
- Tablet-like or iPad landscape viewport when feasible.
- Narrow mobile viewport.
- Resize transitions between desktop and mobile widths.
- Zoomed state.
- Scrolled state.
- No incoherent overlap with shell or placeholder practice controls.

## QA Checklist

- [ ] Real browser E2E testing was performed.
- [ ] Real PDF fixture was rendered.
- [ ] PDF rendered output was verified as non-empty.
- [ ] Real image fixture was rendered.
- [ ] Image decode and dimensions were verified.
- [ ] Zoom was tested through UI.
- [ ] Scroll was tested through UI.
- [ ] Window resize behavior was tested.
- [ ] Desktop and narrow mobile layouts were tested after resize.
- [ ] Reload persistence was tested.
- [ ] Missing and bad file error states were tested.
- [ ] No fake sheet content was displayed.
- [ ] No console errors appeared during tested flows.

## Failure / Edge Cases

- Missing sheetId: show clear route error.
- Unknown sheetId: show not found state.
- Missing artifact: show file error.
- Bad PDF: show file error, do not crash.
- Bad image: show file error, do not crash.
- Slow artifact load: show loading state.
- Very large page: keep layout usable.
- Long sheet title: do not break layout.
- Window resize after zoom or scroll: keep the sheet visible and controls usable.

## Implementation Contract

The implementation agent may build:

- Sheet viewer component.
- Sheet metadata loading integration.
- Sheet artifact loading integration.
- PDF render path.
- Image render path.
- Page count display.
- Basic zoom controls.
- Scrollable viewer area.
- Loading and error states.
- Real PDF and image viewer fixtures.

The implementation agent must not build:

- Metronome controls.
- Recording controls.
- Error marker creation.
- Reference playback.
- Automatic page turning.
- Bar detection.
- Annotation editing.
- Fake sheet rendering.

Implementation handoff must include:

- Viewer, artifact loading, and rendering areas changed.
- Tests run.
- PDF fixture used.
- Image fixture used.
- Reload behavior checked.
- Known limitations or risks.

## Verification Contract

The verification agent must:

- Be a separate agent pass from the implementation agent.
- Run relevant automated tests.
- Use real browser interaction for open, zoom, scroll, reload, and error flows.
- Resize the browser window or viewport during E2E checks and verify the sheet remains visible and usable.
- Use a real PDF fixture and verify non-empty rendering.
- Use a real image fixture and verify decode/render dimensions.
- Verify missing and bad file error states.
- Check desktop and mobile layout.
- Check browser console errors.

The verifier must report FAIL if the viewer renders fake content, only verifies file existence without rendered output, skips E2E interaction, or accepts broken reload behavior.

## Implementation Handoff Requirements

- Summary of UI, service, and rendering changes.
- Test commands run.
- PDF and image fixtures used.
- Reload checks performed by implementer.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Real browser E2E evidence.
- PDF render evidence.
- Image render evidence.
- Window resize evidence.
- Reload evidence.
- Error-state evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This module is complete only when:

- All acceptance criteria pass.
- Real browser E2E covers PDF and image sheet viewing.
- PDF render output is verified non-empty.
- Image decode and rendering are verified.
- Resize behavior is verified.
- Reload behavior is verified.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- Automatic or assisted page turning.
- Current-bar tracking.
- Bar-aware overlays.
- Annotation editing.
- More advanced zoom and pan.
- Page thumbnails.
- Multi-page quick jump.

Do not implement these in v0.
