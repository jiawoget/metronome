# Sheet Practice Integration

## Purpose

This is the integration contract for the v0 Sheet Practice workspace. It coordinates the smaller Sheet Practice submodules, but it is not a single large implementation target.

No agent should implement the entire Sheet Practice workspace from this document alone. Each submodule must have its own implementation and verification pass.

## User Value

- The user can open an imported sheet and practice from one workspace.
- The workspace keeps the sheet visually central.
- Practice controls, recording, replay, and error marking work together.
- Sheet-related practice creates the correct session and recording context.

## v0 Scope

The Sheet Practice workspace is split into these submodules:

```text
05a-sheet-viewer
05e-session-integration
05b-practice-controls
05c-sheet-recording-review
05d-error-markers
05-sheet-practice integration
```

Implementation order:

```text
1. 05a Sheet Viewer
2. 05e Session Integration
3. 05b Practice Controls
4. 05c Sheet Recording Review
5. 05d Error Markers
6. 05 Sheet Practice Integration
```

## Out of Scope for v0

- Automatic page turning.
- Automatic current-bar detection.
- Automatic audio alignment.
- Automatic mistake detection.
- Multi-take audio comping.
- Precise re-recording from any arbitrary bar.
- Automatic beat sync between reference audio and user recording.
- Reference system advanced controls.

## User Paths

```text
Open a sheet from Sheet Library
  -> Enter Sheet Practice
  -> View the sheet as the main workspace
  -> Use bottom practice controls
  -> Record a sheet-linked take
  -> Replay the latest take
  -> Add manual error markers
  -> Return later through Continue Practice
```

## Product Decisions

- The sheet is always the visual priority in Sheet Practice.
- Basic transport and recording controls should stay available at the bottom.
- Detailed metronome settings can live in a side panel.
- Recording replay details, waveform, and recording history can live in a side panel or lower drawer.
- Error markers bind to recording timestamps in v0, not automatically detected bars.
- Reference sources are handled by `06-reference-system`, not by this integration module.

## Data Boundary

This integration reads and coordinates:

- Sheet metadata and file artifact.
- Practice Session for the active sheet.
- Metronome state.
- Sheet-linked recordings.
- Error markers linked to recordings.

This integration should not own low-level persistence directly. Each submodule should use the appropriate service boundary.

## State Boundary

Shared state coordinated by this integration:

- Active sheet.
- Active sheet practice session.
- Current metronome settings.
- Current recording state.
- Latest sheet recording.
- Selected recording for marker display.
- Global playback or recording status.

Submodules should own their internal UI state where possible.

## Architecture Boundary

The Sheet Practice page may compose submodule components and call high-level hooks/services.

It must not directly call:

- Tone.js.
- MediaRecorder.
- wavesurfer.js.
- IndexedDB / Dexie.
- PDF parser internals.
- Image decoding internals.
- Future WASM modules.

## Dependencies

- `04-sheet-library` for imported sheet data.
- `05a-sheet-viewer` for rendering the sheet.
- `05e-session-integration` for sheet practice session context.
- `05b-practice-controls` for metronome and transport controls.
- `05c-sheet-recording-review` for sheet recording and replay.
- `05d-error-markers` for manual marker display and persistence.
- `03-recordings-review` for full review after recordings exist.

## Acceptance Criteria

- [ ] Sheet Practice cannot be marked complete until all five submodules are verified.
- [ ] The integrated workspace opens from a Sheet Library sheet.
- [ ] The sheet remains the visual priority.
- [ ] Bottom practice controls remain available.
- [ ] Sheet session context is active.
- [ ] Sheet-linked recording flow works through the integrated UI.
- [ ] Manual error markers can be used with the latest recording.
- [ ] Continue Practice returns to the correct sheet context.
- [ ] No reference-system advanced behavior is implemented here.
- [ ] No v1 automatic analysis or bar detection appears in v0.

## Test Plan

### Unit Tests

- Active sheet context selection.
- Submodule composition state wiring.
- Route target handling for missing or invalid sheetId.

### Integration Tests

- Sheet Library opens Sheet Practice with the selected sheet.
- Session integration receives the active sheet.
- Practice controls use sheet defaults when available.
- Recording links to active sheet and session.
- Error markers link to the selected recording.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Import or seed a real sheet.
- Open it from Sheet Library.
- Verify the sheet is visible.
- Use practice controls.
- Record a sheet-linked recording with controlled synthetic input.
- Replay the recording.
- Add an error marker.
- Reload and verify sheet context, recording metadata, and marker persistence.
- Use Continue Practice and verify return to the sheet context.
- Check browser console errors during the tested flows.

### Manual QA

- Confirm sheet remains visually central on desktop and mobile.
- Confirm bottom controls do not overlap the sheet.
- Confirm side panels or drawers do not obscure core practice controls.

### Specialized Verification

Final integration verification must include evidence from each verified submodule:

- Sheet rendering evidence.
- Session persistence evidence.
- Metronome timing evidence in Sheet Practice.
- Synthetic recording evidence.
- Error marker persistence evidence.

## QA Checklist

- [ ] All Sheet Practice submodules were implemented and verified separately.
- [ ] Real browser E2E testing was performed.
- [ ] The sheet opens from Sheet Library.
- [ ] Sheet-linked recording was verified.
- [ ] Error marker persistence was verified.
- [ ] Continue Practice target was verified.
- [ ] No v1 automatic analysis behavior was implemented.
- [ ] No console errors appeared during tested flows.

## Failure / Edge Cases

- Missing sheetId: show clear not-found or recovery state.
- Missing sheet artifact: show clear file error.
- Missing session: create or restore sheet session through the session module.
- Recording without sheetId: fail sheet recording verification.
- Marker without recordingId: fail marker verification.

## Implementation Contract

This parent module may only implement integration glue after submodules are ready.

The implementation agent may build:

- Sheet Practice page composition.
- Route-level active sheet loading.
- Wiring between verified submodules.
- Final integrated layout.

The implementation agent must not build:

- Any entire submodule that lacks its own contract.
- Reference system advanced controls.
- Automatic page turning.
- Automatic bar detection.
- Automatic mistake detection.

Implementation handoff must include:

- Which submodules were composed.
- Integration tests run.
- E2E path run.
- Known integration risks.

## Verification Contract

The verification agent must:

- Be a separate agent pass from the implementation agent.
- Confirm each submodule has already been verified.
- Run the full integrated Sheet Practice user path through real browser interaction.
- Verify persistence after reload.
- Check browser console errors.
- Fail if any unverified submodule behavior is claimed complete.

## Implementation Handoff Requirements

- Summary of composition and route changes.
- Submodules integrated.
- Test commands run.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Full Sheet Practice E2E evidence.
- Evidence that submodules are verified.
- Persistence evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This parent module is complete only when:

- `05a-sheet-viewer` is verified.
- `05e-session-integration` is verified.
- `05b-practice-controls` is verified.
- `05c-sheet-recording-review` is verified.
- `05d-error-markers` is verified.
- Integrated E2E passes.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- Automatic or assisted page turning.
- Current-bar tracking.
- Bar-aware error markers.
- Segment-aware practice setup.
- More precise re-recording from a selected bar.
- Countdown before recording from a segment.
- Multiple takes attached to the same sheet or segment.
- Active take selection by bar range.
- Better reference-to-recording comparison.
- Optional beat sync between reference audio and user recording.

Do not implement these in v0.
