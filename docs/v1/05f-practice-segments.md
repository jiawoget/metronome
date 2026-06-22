# Practice Segments v1 Feature Definition

## Purpose

Practice Segments make Sheet Practice measure-aware without requiring automatic score recognition. The user can define a focused passage by measure range, then record, review, and repeat takes against that passage.

## Builds On

- v0 sheets already store BPM and time signature.
- v0 Sheet Practice controls initialize from sheet BPM and time signature.
- v0 sheet recordings link to sheetId and sessionId.
- v0 sessions and recordings are local-first.
- v0 markers use recording timestamps.

## v1 Scope

- Measure grid from BPM, time signature, first-measure offset, and optional pickup beats.
- "Set measure 1 here" calibration.
- Practice Segment CRUD for one sheet.
- Segment selection in Sheet Practice.
- Segment start/end time calculation from measure range.
- Segment context passed to recordings and sessions in later feature contracts.

## Out of Scope for v1

- Automatic PDF or image bar-line recognition.
- Automatic score following.
- Automatic mistake detection.
- Cloud-synced segments.
- Visual box selection on the sheet as the first segment definition method.

## User Paths

```text
Open a sheet in Sheet Practice
  -> Confirm or edit BPM and time signature
  -> Play or scrub to the first measure
  -> Click Set measure 1 here
  -> Create a segment from measures 5-12
  -> Select that segment for practice
```

```text
Open Sheet Practice
  -> Select an existing segment
  -> Start recording
  -> Stop recording
  -> See the recording linked to the selected segment in review
```

## Product Decisions

- Segments are measure-aware through `MeasureGrid`, not image-recognition-aware.
- Measure numbers are user-entered in v1.
- The first implementation should prefer deterministic time math over visual overlays.
- Existing sheet recordings without segment metadata remain valid.
- Timestamp markers remain valid even when a segment exists.
- Segment UI must follow `docs/v1/ui-design.md` and the reference image style.

## UI Design Requirements

Practice Segments should appear as a compact extension of the Sheet Practice workspace shown in `Design Notes/design_pictures/overall_style_design.png`.

- Keep the sheet centered and visually dominant.
- Put segment selection and MeasureGrid details in the title area or right-side practice panel.
- Use a compact measure range editor for start and end measures.
- Show BPM, time signature, and measure-one offset as concise calibration metadata.
- Provide a visible "Set measure 1 here" action near playback or scrub context.
- Use yellow for active segment, current measure, and primary practice emphasis.
- Use purple only for secondary creation/edit affordances.
- Do not introduce a large setup wizard, marketing panel, or text-heavy explanation area.
- On mobile, collapse segment details into a drawer or tab while keeping transport controls reachable.

## Data Boundary

This feature creates:

- Measure grid metadata for a sheet.
- Practice Segment metadata linked to a sheet.

This feature reads:

- Sheet BPM.
- Sheet time signature.
- Current metronome BPM and time signature where the UI lets the user override defaults.

This feature must not create:

- Cloud sync records.
- Automatic analysis results.
- Fake recording artifacts.

## Acceptance Criteria

- [ ] A sheet can have a measure grid with BPM, time signature, and measure-one offset.
- [ ] The user can calibrate measure one through a visible action.
- [ ] The system can calculate measure start and end timestamps from the grid.
- [ ] The user can create a segment by entering start and end measure numbers.
- [ ] The user can edit and delete a segment.
- [ ] The user can select a segment in Sheet Practice.
- [ ] Segment UI follows the v1 UI design requirements and the reference image direction.
- [ ] Segment controls do not obscure the sheet or bottom transport controls.
- [ ] Segment data persists after reload.
- [ ] Existing sheets without segments still open normally.
- [ ] Existing recordings without segment metadata remain visible in Review.
- [ ] The UI does not claim automatic PDF measure detection.

## Test Plan

### Unit Tests

- 120 BPM, 4/4, measures 1-4 calculate as 0-8000 ms.
- 120 BPM, 4/4, with 1000 ms offset calculates measures 1-4 as 1000-9000 ms.
- 90 BPM, 3/4 calculates measure duration from three quarter-note beats.
- 6/8 calculation uses the approved beat duration policy defined in the full contract.
- Invalid start/end measure ranges are rejected.
- Offset and pickup values are validated and clamped or rejected according to the full contract.

### Integration Tests

- Segment CRUD persists through the local repository boundary.
- Segment selection is scoped to one sheet.
- Deleted sheets do not leave usable segment links.

### E2E / Playwright Tests

- Import or open a sheet.
- Calibrate measure one.
- Create a segment.
- Reload and verify the segment remains.
- Select the segment in Sheet Practice.
- Resize desktop, tablet-like, and narrow mobile viewports and verify the segment UI remains usable.

### Specialized Verification

- Time calculations must use deterministic tolerances.
- Visual verification must compare the segment UI against `docs/v1/ui-design.md` and the reference image.
- Segment-linked recording verification belongs to the later segment recording contract.

## Done Definition

This feature is complete only when the full contract is written, all acceptance criteria pass, segment persistence is verified after reload, and a separate verification pass reports PASS.
