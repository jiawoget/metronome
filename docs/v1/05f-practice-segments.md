# Practice Segments v1 Feature Definition

## Purpose

Practice Segments make Sheet Practice measure-aware without requiring automatic score recognition. The user can define a focused passage by measure range, then record, review, and repeat takes against that passage.

## Builds On

- v0 sheets already store BPM and time signature.
- v0 Sheet Practice controls initialize from sheet BPM and time signature.
- v0 sheet recordings link to sheetId and sessionId.
- v0 sessions and recordings are local-first.
- v0 markers use recording timestamps.

---

# Feature Contract: `practice.measure-grid`

## Purpose

`practice.measure-grid` defines a deterministic musical time grid for a sheet from BPM, time signature, optional pickup beats, and a manually calibrated measure-one offset. It is the first v1 spine feature and exists so later Practice Segment features can convert measure numbers into timestamps without automatic score recognition.

## User Value

- The user can tell Sheet Practice where measure 1 begins.
- The app can translate measure ranges into stable start/end timestamps.
- Later segment, count-in, assisted page-turning, and review features can build on one shared grid instead of duplicating timing math.
- The user gets measure-aware practice support without waiting for PDF bar-line recognition.

## v1 Scope

- Store one active measure grid per sheet.
- Initialize grid BPM and time signature from sheet defaults when available, otherwise from the current Sheet Practice metronome settings, otherwise from documented app fallbacks.
- Let the user edit BPM and time signature in the MeasureGrid calibration UI without mutating the original sheet metadata unless a later contract explicitly adds that behavior.
- Let the user enter optional pickup beats before measure 1.
- Let the user set or update the measure-one offset through a visible `Set measure 1 here` action tied to the current playback/scrub time.
- Derive deterministic measure start and end timestamps from the saved grid.
- Expose a service or domain utility for converting a measure number or inclusive measure range into timestamps.
- Persist grid metadata locally and reload it with the sheet.
- Show calibration status in Sheet Practice: missing grid, needs calibration, calibrated, and unsaved changes.

## Out of Scope for v1

- Automatic PDF or image bar-line recognition.
- Automatic score following.
- Automatic BPM or time-signature detection from imported files.
- Guitar Pro or MusicXML import.
- Segment CRUD, segment selection, segment recording, rerecording, take grouping, and review comparison.
- Mutating sheet default BPM or time signature from the MeasureGrid UI.
- Drawing detected bar lines on the sheet.
- Cloud sync, account login, backup/restore, conflict handling, or cross-device resume.
- Automatic mistake detection, user-facing scoring, or audio-analysis claims.

## User Paths

```text
Open an imported sheet in Sheet Practice
  -> See MeasureGrid calibration row in the title area or right-side panel
  -> Confirm BPM and time signature initialized from the sheet or current metronome
  -> Play or scrub to the first full measure
  -> Click Set measure 1 here
  -> See calibrated state and measure-one offset
  -> Reload the page
  -> See the same grid restored
```

```text
Open a sheet without a saved grid
  -> Edit BPM or time signature in the compact calibration controls
  -> Optionally enter pickup beats
  -> Set measure 1 from current playback/scrub time
  -> Use the grid service to compute measures 5-12 for later segment setup
```

```text
Open Sheet Practice for a sheet with no grid
  -> Leave MeasureGrid uncalibrated
  -> Continue using existing v0 sheet practice controls
  -> No segment or automatic detection claims appear
```

## Product Decisions

- A measure grid belongs to one sheet.
- v1 supports one active grid per sheet; multiple alternate grids are deferred.
- Measure 1 means the first full numbered measure after any pickup.
- `measureOneOffsetMs` is the timestamp where measure 1 starts in the sheet/practice timeline.
- Pickup beats describe music before measure 1 and are stored for context, but measure range conversion for numbered measures starts at `measureOneOffsetMs`.
- Time signature math is literal and deterministic: measure duration is `beatsPerMeasure * beatDuration`, where `beatDurationMs = 60000 / bpm * (4 / denominator)`.
- For compound meters such as `6/8`, v1 uses the literal denominator policy above; it does not infer dotted-quarter conducting beats.
- Measure numbers are 1-based integers.
- A measure range is inclusive for user input and converts to `[startMs, endMs]`, where `endMs` is the end of the final included measure.
- The MeasureGrid UI must not imply that the app found measures in the PDF.

## Data Boundary

This feature reads:

- Active sheet id and sheet display metadata.
- Sheet default BPM and time signature when present.
- Current Sheet Practice metronome BPM and time signature when sheet defaults are missing or the UI explicitly initializes from current practice settings.
- Current playback/scrub timestamp from an existing viewer or transport boundary.

This feature creates or updates:

- Local measure grid metadata for a sheet.
- Calibration status derived from grid completeness and dirty UI state.

This feature deletes:

- Only the active sheet's measure grid if the UI exposes a reset or clear calibration action.

This feature must not create or update:

- Practice Segment records.
- Recording artifacts or recording metadata.
- Session history.
- Sheet import artifacts.
- Reference media, markers, waveform peaks, or analysis results.
- Cloud or account records.

## State Boundary

Module-owned state:

- Draft BPM.
- Draft time signature.
- Draft pickup beats.
- Draft measure-one offset.
- Dirty/saved/calibrated status.
- Validation errors for grid fields.

Shared state consumed through existing boundaries:

- Active sheet.
- Current practice BPM and time signature.
- Current playback/scrub timestamp.
- Sheet Practice panel or drawer open/closed state when needed for layout.

Shared state this feature may expose:

- Saved measure grid for the active sheet.
- Pure conversion results for measure starts, measure ends, and measure ranges.
- Calibration status for later `practice.practice-segments` and `controls.bar-aware-count-in` contracts.

This feature must not own:

- Metronome playback state.
- Recording state.
- Segment selection state.
- Review/take state.
- Audio analysis state.

## Architecture Boundary

The implementation may add:

- A `MeasureGrid` domain type.
- Pure measure-grid calculation utilities.
- A local repository/service for reading and writing a sheet's active measure grid.
- A Sheet Practice calibration component composed into the existing workspace.
- Integration points that read current transport time through an existing hook or an adapter-shaped boundary.

The UI may call only high-level hooks/services. It must not directly call:

- IndexedDB / Dexie internals.
- Tone.js or Web Audio scheduler internals.
- MediaRecorder.
- PDF parser internals.
- Image decoding internals.
- Audio analysis engines or future WASM modules.
- Cloud APIs.

Measure-grid calculations must remain deterministic and unit-testable without rendering the UI or playing audio.

## UI Design Requirements

This feature is user-facing and must follow `docs/v1/ui-design.md`, `docs/v0/design-style-guide.md`, and the reference image at `Design Notes/design_pictures/overall_style_design.png`.

- Keep the sheet image/PDF centered and visually dominant.
- Put MeasureGrid calibration in a compact row near the sheet title or inside the right-side practice panel.
- Show BPM, time signature, pickup beats, and measure-one offset as concise controls or metadata.
- Provide a visible `Set measure 1 here` action near playback/scrub context.
- Use yellow for calibrated/active measure emphasis and primary practice state.
- Use purple only for secondary creation/edit affordances if needed.
- Show status badges such as `Needs calibration`, `Calibrated`, and `Unsaved changes` without large explanatory copy.
- Avoid a setup wizard, marketing-style hero, decorative illustration, gradient background, or text-heavy help panel.
- Do not draw PDF bar lines or overlays for this feature.
- On desktop and iPad landscape, preserve the left sidebar pattern and keep calibration secondary to the sheet.
- On narrow mobile, collapse calibration controls into a drawer, tab, or compact panel while keeping bottom transport controls reachable.
- Resize behavior must be checked at desktop, tablet-like/iPad landscape, and narrow mobile widths.

## Dependencies

- `04-sheet-library` for active sheet metadata and sheet defaults.
- `05a-sheet-viewer` for the sheet timeline, viewer context, and current scrub/playback position if available.
- `05b-practice-controls` for current practice BPM/time signature defaults when sheet defaults are missing.
- `05-sheet-practice` integration for placement in the Sheet Practice workspace.
- `docs/v0/project-structure.md` and `docs/v0/tech-stack-decisions.md` for file and technology boundaries.

Later features that depend on this contract:

- `practice.practice-segments`
- `practice.segment-recording`
- `practice.segment-rerecording`
- `controls.bar-aware-count-in`
- `viewer.assisted-page-turning`
- `reference.manual-offset-alignment`

## Acceptance Criteria

- [ ] A sheet can have one locally persisted active measure grid.
- [ ] Grid defaults initialize from sheet BPM and time signature when available.
- [ ] Grid defaults can initialize from current Sheet Practice metronome BPM and time signature when sheet defaults are missing.
- [ ] The user can edit grid BPM through visible UI controls.
- [ ] The user can edit grid time signature through visible UI controls.
- [ ] The user can enter optional pickup beats through visible UI controls.
- [ ] The user can set measure 1 through a visible `Set measure 1 here` action tied to the current playback/scrub timestamp.
- [ ] The UI shows whether the grid needs calibration, is calibrated, or has unsaved changes.
- [ ] The saved grid persists after browser reload.
- [ ] Existing sheets with no grid still open and preserve v0 Sheet Practice behavior.
- [ ] Measure start and end timestamps are calculated deterministically from BPM, time signature, and measure-one offset.
- [ ] Inclusive measure ranges convert to start/end timestamps where the end is the end of the final included measure.
- [ ] 6/8 and other non-4-denominator meters follow the documented literal denominator policy.
- [ ] Invalid BPM, invalid time signatures, invalid pickup beats, missing offset, and invalid measure numbers are rejected with recoverable UI state.
- [ ] The MeasureGrid UI follows `docs/v1/ui-design.md` and the reference image direction.
- [ ] Calibration controls do not obscure the sheet or bottom transport controls on desktop, tablet-like, or narrow mobile viewports.
- [ ] The UI does not claim automatic PDF measure detection, automatic score following, automatic BPM detection, or automatic mistake detection.
- [ ] The implementation does not create Practice Segment, recording, session, marker, reference, cloud, or analysis records.

## Test Plan

### Unit Tests

- 120 BPM, 4/4, offset `0 ms`: measure 1 starts at `0 ms`, measure 4 ends at `8000 ms`.
- 120 BPM, 4/4, offset `1000 ms`: measures 1-4 convert to `1000-9000 ms`.
- 90 BPM, 3/4: measure duration is three quarter-note beats.
- 120 BPM, 6/8: measure duration follows the literal denominator policy and equals six eighth-note beats.
- Pickup beats are stored and validated without shifting numbered measure 1 away from `measureOneOffsetMs`.
- Measure `1` is valid; measure `0`, negative measures, fractional measures, and non-numeric measures are invalid.
- Inclusive ranges reject start greater than end.
- BPM below/above approved limits is rejected or clamped according to the implemented shared BPM policy.
- Time signatures with invalid numerator or denominator are rejected.
- Measure-one offset must be a finite non-negative timestamp.
- Conversion utilities produce stable integer millisecond results or documented rounding behavior.

### Integration Tests

- Measure grid repository saves, reads, updates, and clears a grid for one sheet.
- Measure grid data is scoped by `sheetId` and does not leak between sheets.
- Sheet defaults initialize the grid draft when no grid exists.
- Current Sheet Practice metronome settings initialize the grid draft when sheet defaults are absent.
- Saved grid reloads through the Sheet Practice page/service boundary.
- Deleting or missing sheets does not leave a usable grid in the UI.
- UI code uses the measure-grid service/repository boundary rather than direct storage calls.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Import or seed a real sheet with BPM and time signature defaults.
- Open the sheet in Sheet Practice.
- Verify the sheet remains visible and dominant.
- Verify MeasureGrid defaults display in the calibration UI.
- Move playback/scrub context to a deterministic timestamp, click `Set measure 1 here`, and save.
- Reload the browser and verify the same BPM, time signature, pickup beats, offset, and calibrated status remain.
- Edit BPM and time signature through visible controls and verify unsaved/saved status behavior.
- Open a sheet without a saved grid and verify it still opens normally with no automatic detection claims.
- Resize to desktop, tablet-like/iPad landscape, and narrow mobile viewports and verify calibration controls remain usable without covering the sheet or transport controls.
- Check browser console errors during tested flows.

### Manual QA

- Compare the Sheet Practice screen against `Design Notes/design_pictures/overall_style_design.png` and `docs/v1/ui-design.md`.
- Confirm the calibration UI feels like a compact workspace control, not a wizard or landing-page element.
- Confirm yellow emphasis is used for calibrated/active practice state and purple is secondary if present.
- Confirm text does not clip or overlap in the longest expected status labels.
- Confirm the user can understand that calibration is manual and PDF measure detection is not available.

### Specialized Verification

- Inspect deterministic calculation evidence from unit tests for 4/4, 3/4, and 6/8.
- Verify persistence after reload with real browser interaction.
- Verify no recording, session, marker, reference, cloud, or analysis artifacts are created during calibration.
- Verify the UI does not bypass storage/service boundaries through source inspection.
- Verify resize behavior with screenshots or equivalent visual evidence for desktop, tablet-like, and narrow mobile widths.

## QA Checklist

- [ ] No display-only calibration controls.
- [ ] No stubbed measure conversion.
- [ ] No direct UI calls to storage internals.
- [ ] No automatic score/PDF recognition claims.
- [ ] No adjacent Practice Segment CRUD implemented.
- [ ] No recording/session/review behavior implemented by this feature.
- [ ] Persistence after reload verified.
- [ ] Browser console checked.
- [ ] Responsive layout checked at required widths.

## Failure / Edge Cases

- Sheet has no BPM: initialize from current practice BPM or documented fallback and keep the field editable.
- Sheet has no time signature: initialize from current practice time signature or documented fallback and keep the field editable.
- Current playback/scrub timestamp is unavailable: disable `Set measure 1 here` or show recoverable state; do not save a fake offset.
- Offset is beyond known media/sheet timeline: allow only if the existing viewer/transport boundary treats the timestamp as valid.
- User edits a saved grid then navigates away: show unsaved state according to local app conventions.
- Invalid grid values: keep prior saved grid intact and show recoverable validation.
- Existing saved grid becomes invalid after schema changes: do not crash Sheet Practice; surface a needs-calibration state.
- Storage write fails: show failure state and do not claim calibrated persistence.

## Implementation Contract

The implementation agent may build only `practice.measure-grid`.

The implementation agent may create or modify:

- MeasureGrid domain types and pure calculation utilities.
- Local measure-grid repository/service code.
- Sheet Practice calibration UI required for measure-grid setup.
- Tests and fixtures for measure-grid math, persistence, and UI calibration.
- Minimal route/page composition needed to place the calibration UI inside Sheet Practice.

The implementation agent must not build:

- Practice Segment CRUD or segment selector.
- Segment-aware recording, rerecording, take grouping, take history, or review comparison.
- Bar-aware count-in.
- Assisted page turning.
- Reference alignment or reference segment binding.
- Automatic PDF/image bar-line detection.
- Automatic score following, BPM detection, mistake detection, or scoring.
- Cloud sync, accounts, backup/restore, or conflict handling.

The implementation agent must:

- Use a fresh coding agent for this feature only.
- Use `fork_context: false` and have the agent read required repository documents directly.
- Use standard speed.
- Preserve verified v0 Sheet Practice, Sheet Library, metronome, recording, and review behavior.
- Keep UI code behind service/repository boundaries for persistence and timing conversion.
- Run relevant unit, integration, and UI/E2E self-tests before handoff.
- Update only `practice.measure-grid` status and implementation notes if status changes are part of the assigned implementation pass.

## Verification Contract

The verification agent must:

- Be a fresh agent separate from the coding agent.
- Use `fork_context: false` and read required repository documents directly.
- Use standard speed.
- Verify only `practice.measure-grid`.
- Run the relevant automated tests.
- Exercise the calibration UI through real browser interaction.
- Verify persistence after reload.
- Verify deterministic measure math, including 4/4, 3/4, and 6/8.
- Verify invalid input and missing-default behavior.
- Verify the UI at desktop, tablet-like/iPad landscape, and narrow mobile widths.
- Check browser console errors.
- Inspect source boundaries enough to confirm UI does not bypass repositories/services or create adjacent feature records.
- Report PASS or FAIL with evidence for every acceptance criterion.

Verification must report FAIL if:

- Any acceptance criterion is untested.
- The UI is not tested through real browser interaction.
- Persistence after reload is not tested.
- Measure math is display-only, stubbed, or not deterministic.
- The implementation creates adjacent segment, recording, session, reference, marker, cloud, or analysis behavior.
- The UI claims automatic PDF measure detection or score following.
- The UI ignores `docs/v1/ui-design.md` or the reference image direction.
- A previously verified v0 core workflow is broken.

## Implementation Handoff Requirements

- Assigned feature: `practice.measure-grid`.
- Coding model, effort, and speed used.
- Implementation commit hash.
- Files or areas changed.
- Summary of domain, persistence, and UI work.
- Test commands run and results.
- Measure calculation evidence or fixtures used.
- Browser/self-test evidence for calibration and reload.
- Known limitations, risks, or boundary concerns.

## Verification Handoff Requirements

- Assigned feature: `practice.measure-grid`.
- Verification model, effort, and speed used.
- Verification commit hash.
- PASS or FAIL.
- Acceptance criteria checklist results.
- Unit/integration test evidence.
- Real browser E2E evidence.
- Persistence-after-reload evidence.
- Responsive layout evidence.
- Console error status.
- Boundary inspection notes.
- Repro steps for any failure.

## Done Definition

`practice.measure-grid` is done only when:

- The full contract is written and approved.
- `docs/v1/module-status.json` marks `practice.measure-grid` as `contract_ready` before implementation starts.
- A fresh coding agent implements only this feature.
- The implementation handoff is complete.
- A fresh review agent reviews the changed files against this contract.
- Any review findings are resolved or explicitly accepted by the user.
- A fresh verification agent verifies every acceptance criterion.
- Real browser E2E covers calibration, save, reload, and responsive layout.
- Deterministic measure-grid math is verified.
- Persistence after reload is verified.
- No adjacent v1 or v2 scope is implemented.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- `practice.practice-segments` to create named measure ranges from the grid.
- `controls.bar-aware-count-in` to count in by beats or measures.
- `viewer.assisted-page-turning` to use manual timing or segment boundaries.
- `reference.manual-offset-alignment` to align references manually to the grid.
- Future alternate grids or per-section meter changes if a later contract approves them.

Do not implement these hooks as product behavior in `practice.measure-grid`.

---

# Feature Contract: `practice.practice-segments`

## Purpose

`practice.practice-segments` lets the user create, edit, delete, and select named practice segments for one sheet using measure ranges backed by `practice.measure-grid`. It turns a calibrated measure grid into a reusable focused passage, such as measures 5-12, without introducing recording or review behavior.

## User Value

- The user can save a difficult passage instead of repeatedly remembering measure numbers.
- The user can quickly return to a focused range inside Sheet Practice.
- Later recording, rerecording, review, and Continue Practice features can attach to a stable segment id.
- Segment timing remains deterministic because start/end timestamps come from the approved MeasureGrid contract.

## v1 Scope

- Create a named practice segment for the active sheet.
- Edit a segment's name, start measure, end measure, target BPM, and notes.
- Delete a segment for the active sheet with a safe confirmation or equivalent undo-safe local pattern.
- Select one active segment in Sheet Practice.
- Show active segment state in the Sheet Practice workspace.
- Store segments locally, scoped to one sheet.
- Associate each segment with the active measure grid it was created against, including enough grid identity/version data to detect when the grid changed.
- Compute segment start/end timestamps from the selected measure range through the `practice.measure-grid` service/utilities.
- Show when a segment needs grid calibration or has stale grid-derived timing because the sheet grid changed.
- Preserve existing Sheet Practice behavior when no segments exist.

## Out of Scope for v1

- Recording with `segmentId`, segment-aware session metadata, and segment rerecording.
- Multi-take grouping, best/latest/active take selection, take history, waveform comparison, and review navigation.
- Bar-aware count-in or automatic transport looping for the selected segment.
- Reference binding, AB loop creation, reference alignment, or reference waveform display.
- Drawing detected PDF bar lines, automatic score following, or automatic PDF/image measure recognition.
- Automatic BPM, meter, or mistake detection.
- Cloud sync, account login, backup/restore, conflict handling, or cross-device resume.
- Multiple simultaneous active segments.
- Segment folders, tags, favorites, sharing, import/export, or analytics.

## User Paths

```text
Open a sheet with a calibrated MeasureGrid in Sheet Practice
  -> Open the compact segment selector or right-side segment panel
  -> Create a segment named "Bridge"
  -> Enter start measure 5 and end measure 12
  -> Optionally enter target BPM and notes
  -> Save the segment
  -> See it selected as the active segment
```

```text
Open Sheet Practice for a sheet with existing segments
  -> Choose a segment from the segment selector
  -> See the selected segment name, measure range, target BPM, and timing status
  -> Change the selected segment
  -> Sheet Practice remains on the same sheet and existing controls remain usable
```

```text
Open a sheet without a calibrated MeasureGrid
  -> See segment creation blocked or clearly marked as needing calibration
  -> Use MeasureGrid calibration first
  -> Return to create the segment from measure numbers
```

```text
Open a saved segment
  -> Edit its measure range or notes
  -> Save changes
  -> Reload the browser
  -> Verify the edited segment persists and remains scoped to the same sheet
```

## Product Decisions

- A segment belongs to exactly one sheet.
- A segment is defined by user-entered 1-based inclusive start and end measure numbers.
- A segment requires a calibrated MeasureGrid to compute usable start/end timestamps.
- Segment target BPM is optional and descriptive in this feature; applying it to transport controls belongs to `controls.segment-tempo`.
- Segment notes are plain local text only.
- Segment selection is local Sheet Practice UI state unless or until later session/continue-practice contracts persist it.
- If the underlying MeasureGrid changes after segment creation, the segment remains saved but its derived timing must be recomputed or marked as needing review according to the grid identity/version policy implemented for `practice.measure-grid`.
- Deleting a segment must not delete sheets, recordings, markers, references, sessions, or measure grids.
- Empty state copy should be concise and honest; it must not imply automatic measure detection or automatic scoring.

## Data Boundary

This feature reads:

- Active sheet id and sheet display metadata.
- The active sheet's saved MeasureGrid and calibration status.
- MeasureGrid conversion results for segment start/end timestamps.
- Existing practice segments for the active sheet.

This feature creates:

- Local Practice Segment metadata linked to `sheetId`.

This feature updates:

- Segment name.
- Start measure and end measure.
- Optional target BPM.
- Optional notes.
- Grid association metadata used to detect stale derived timing.
- Local active segment selection state where the UI owns it.

This feature deletes:

- Only Practice Segment metadata for the active sheet.

This feature must not create, update, or delete:

- MeasureGrid metadata, except reading its status and conversion utilities.
- Recording artifacts or recording metadata.
- Session history or Continue Practice targets.
- Markers, references, waveform peaks, or analysis results.
- Sheet import artifacts.
- Cloud or account records.

## State Boundary

Module-owned state:

- Segment list for the active sheet.
- Draft segment form state.
- Active selected segment id for the current Sheet Practice workspace.
- Segment validation errors.
- Segment stale/needs-calibration status derived from MeasureGrid state.
- Create/edit/delete panel or dialog state.

Shared state consumed through boundaries:

- Active sheet.
- Saved MeasureGrid and conversion service.
- Current Sheet Practice layout state for panel/drawer placement.
- Current metronome BPM only as an optional default for target BPM if the UI offers it.

Shared state this feature may expose:

- Selected segment id.
- Selected segment metadata.
- Derived segment start/end timestamps for later contracts.
- Segment availability/status for controls and future recording/session features.

This feature must not own:

- Metronome playback state.
- Recording state.
- Session lifecycle state.
- Review/take state.
- Reference playback state.
- Audio analysis state.

## Architecture Boundary

The implementation may add:

- Practice Segment domain types.
- Segment validation utilities.
- A local segment repository/service.
- A Sheet Practice segment selector and compact editor.
- Integration with `practice.measure-grid` services for range-to-timestamp conversion.
- Tests and fixtures for segment persistence, validation, selection, and derived timing.

The UI may call only high-level hooks/services. It must not directly call:

- IndexedDB / Dexie internals.
- Tone.js or Web Audio scheduler internals.
- MediaRecorder.
- PDF parser internals.
- Image decoding internals.
- Audio analysis engines or future WASM modules.
- Cloud APIs.

Segment timing must be derived from MeasureGrid services/utilities, not duplicated with ad hoc math in the UI.

## UI Design Requirements

This feature is user-facing and must follow `docs/v1/ui-design.md`, `docs/v0/design-style-guide.md`, and the reference image at `Design Notes/design_pictures/overall_style_design.png`.

- Keep the sheet image/PDF centered and visually dominant.
- Place segment selection near the sheet title or in the right-side practice panel.
- Use a compact measure range editor with numeric start/end measure controls.
- Show segment name, range, optional target BPM, and concise status badges.
- Show statuses such as `Active`, `Needs calibration`, `Grid changed`, and `Unsaved changes` as small badges or inline metadata.
- Use yellow for active segment and selected measure/range emphasis.
- Use purple only for secondary creation/edit affordances.
- Keep notes editing compact; do not let notes dominate the Sheet Practice workspace.
- Do not introduce a setup wizard, marketing panel, large explanatory card, decorative illustration, or gradient background.
- Do not draw detected bar lines on the PDF.
- A restrained measure timeline or tick strip may be used only if it stays secondary to the sheet and has stable dimensions.
- On desktop and iPad landscape, keep the left sidebar pattern and put segment details in the title area or right-side panel.
- On narrow mobile, collapse segment details into a drawer or tab while keeping bottom transport controls reachable.
- Resize behavior must be checked at desktop, tablet-like/iPad landscape, and narrow mobile widths.

## Dependencies

- `practice.measure-grid` must be `contract_ready` before this contract can be implemented, and its implementation must provide calibrated grid data plus conversion utilities before segment timestamp behavior can pass verification.
- `04-sheet-library` for active sheet metadata.
- `05a-sheet-viewer` for Sheet Practice layout context.
- `05b-practice-controls` only for optional current-BPM default display; applying segment tempo is out of scope.
- `05-sheet-practice` integration for composing the selector/editor into the workspace.
- `docs/v0/project-structure.md` and `docs/v0/tech-stack-decisions.md` for file and technology boundaries.

Later features that depend on this contract:

- `practice.segment-recording`
- `practice.segment-rerecording`
- `controls.segment-tempo`
- `controls.bar-aware-count-in`
- `sessions.segment-sessions`
- `takes.multi-take-management`
- `home.continue-practice-recommendations`
- `reference.segment-binding`

## Acceptance Criteria

- [ ] A user can create a practice segment for the active sheet by entering a name, start measure, and end measure.
- [ ] A user can optionally save target BPM and notes for a segment.
- [ ] A user can edit a saved segment's name, measure range, target BPM, and notes.
- [ ] A user can delete a segment without deleting sheet, grid, recording, session, marker, or reference data.
- [ ] A user can select one active segment in Sheet Practice.
- [ ] Segment list and active selection UI are scoped to the active sheet.
- [ ] Segment data persists after browser reload.
- [ ] Existing sheets with no segments still open normally.
- [ ] Segment creation is blocked or clearly marked unavailable when no calibrated MeasureGrid exists.
- [ ] Segment start/end timestamps are computed through `practice.measure-grid` from the inclusive measure range.
- [ ] If the underlying grid changes, existing segments remain saved and the UI marks or recomputes derived timing according to the documented grid association policy.
- [ ] Invalid ranges are rejected: start below 1, end below 1, start greater than end, fractional measures, non-numeric values, and empty required values.
- [ ] Duplicate segment names for the same sheet are either rejected or disambiguated by a documented local rule.
- [ ] Segment UI follows `docs/v1/ui-design.md` and the reference image direction.
- [ ] Segment controls do not obscure the sheet or bottom transport controls on desktop, tablet-like, or narrow mobile viewports.
- [ ] The UI does not claim automatic PDF measure detection, automatic score following, automatic BPM detection, or automatic mistake detection.
- [ ] The implementation does not create recording, session, take, marker, reference, cloud, or analysis behavior.

## Test Plan

### Unit Tests

- Segment validation accepts a name with start measure `5` and end measure `12`.
- Segment validation rejects empty names if the UI requires names, or applies the documented default naming rule if names are optional.
- Segment validation rejects start measure `0`, negative measures, fractional measures, non-numeric measures, and end before start.
- Optional target BPM follows the approved BPM validation policy.
- Notes length is bounded by a documented local limit and rejects or trims according to that rule.
- Duplicate-name behavior follows the documented rule for one sheet.
- Segment range conversion delegates to MeasureGrid utilities and returns expected timestamps for a fixture grid.
- Grid association/stale-status logic detects changed grid identity/version.

### Integration Tests

- Segment repository saves, reads, updates, and deletes segments for one sheet.
- Segments are scoped by `sheetId` and do not appear on other sheets.
- Selecting a segment does not mutate the segment record unless the user saves edits.
- Segment creation requires or clearly depends on a calibrated MeasureGrid.
- Segment derived timestamps update or stale status appears when the associated grid changes.
- Deleting a sheet prevents orphaned usable segment links in the UI.
- UI code uses segment and MeasureGrid service/repository boundaries rather than direct storage calls.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Import or seed a real sheet.
- Ensure or seed a calibrated MeasureGrid for that sheet.
- Open Sheet Practice and create a segment named `Bridge` with measures `5-12`, target BPM, and notes.
- Verify the segment appears in the selector/list and is selected.
- Reload the browser and verify the segment persists for the same sheet.
- Edit the segment's range and notes through visible controls and verify saved changes after reload.
- Delete the segment and verify it is removed while the sheet and MeasureGrid remain usable.
- Open another sheet and verify the first sheet's segment does not appear.
- Attempt segment creation without a calibrated grid and verify blocked/needs-calibration behavior.
- Resize to desktop, tablet-like/iPad landscape, and narrow mobile viewports and verify segment controls remain usable without covering the sheet or transport controls.
- Check browser console errors during tested flows.

### Manual QA

- Compare the Sheet Practice segment UI against `Design Notes/design_pictures/overall_style_design.png` and `docs/v1/ui-design.md`.
- Confirm the segment selector/editor feels compact and secondary to the sheet.
- Confirm active segment state is visible without making the panel dominate the workspace.
- Confirm longest expected segment names, status badges, and notes previews do not clip or overlap.
- Confirm empty states are honest and do not imply automatic PDF measure detection.

### Specialized Verification

- Verify derived segment timing against deterministic MeasureGrid fixtures.
- Verify persistence after reload with real browser interaction.
- Verify deletion does not remove sheet, MeasureGrid, recording, session, marker, reference, cloud, or analysis data.
- Verify no segment recording metadata is created by selecting or editing a segment.
- Verify source boundaries: UI does not bypass segment/MeasureGrid services and does not duplicate MeasureGrid math.
- Verify responsive layout with screenshots or equivalent visual evidence for desktop, tablet-like, and narrow mobile widths.

## QA Checklist

- [ ] No display-only segment controls.
- [ ] No stubbed segment persistence.
- [ ] No direct UI calls to storage internals.
- [ ] No duplicated MeasureGrid timing math in UI.
- [ ] No recording/session/take behavior implemented by this feature.
- [ ] No automatic score/PDF recognition claims.
- [ ] Persistence after reload verified.
- [ ] Segment scoping by sheet verified.
- [ ] Browser console checked.
- [ ] Responsive layout checked at required widths.

## Failure / Edge Cases

- No calibrated MeasureGrid: segment creation is blocked or clearly marked as needing calibration.
- Grid changes after segment creation: segment remains visible and is marked stale or recomputed according to grid association policy.
- Start/end range is invalid: save is blocked and existing saved segment remains intact.
- Target BPM is invalid: save is blocked or value is cleared according to documented validation.
- Notes are too long: enforce documented local behavior without crashing or layout overflow.
- Segment deletion fails: keep the segment visible and show recoverable failure state.
- Active segment is deleted: clear active selection and keep Sheet Practice usable.
- Active sheet changes: clear or reload selection for the new sheet.
- Existing saved segment references a missing grid: show needs-calibration/stale state without crashing.

## Implementation Contract

The implementation agent may build only `practice.practice-segments`.

The implementation agent may create or modify:

- Practice Segment domain types and validation utilities.
- Local segment repository/service code.
- Segment selector, list, create/edit/delete UI inside Sheet Practice.
- Integration with already implemented MeasureGrid services for derived timing.
- Tests and fixtures for segment validation, persistence, selection, and UI behavior.
- Minimal Sheet Practice composition needed to place segment UI.

The implementation agent must not build:

- MeasureGrid calibration or MeasureGrid persistence beyond using the existing MeasureGrid API.
- Segment-aware recording or session metadata.
- Segment rerecording.
- Multi-take grouping, best/latest/active take selection, take history, waveform comparison, or review navigation.
- Segment tempo application to metronome controls.
- Bar-aware count-in.
- Reference binding or AB looping.
- Automatic PDF/image bar-line detection, score following, BPM detection, mistake detection, or scoring.
- Cloud sync, accounts, backup/restore, or conflict handling.

The implementation agent must:

- Use a fresh coding agent for this feature only.
- Use `fork_context: false` and have the agent read required repository documents directly.
- Use standard speed.
- Preserve verified v0 Sheet Practice, Sheet Library, metronome, recording, review, and MeasureGrid behavior.
- Keep UI code behind service/repository boundaries for persistence and timing conversion.
- Run relevant unit, integration, and UI/E2E self-tests before handoff.
- Update only `practice.practice-segments` status and implementation notes if status changes are part of the assigned implementation pass.

## Verification Contract

The verification agent must:

- Be a fresh agent separate from the coding agent.
- Use `fork_context: false` and read required repository documents directly.
- Use standard speed.
- Verify only `practice.practice-segments`.
- Run relevant automated tests.
- Exercise create, edit, delete, select, reload, and sheet-scoping flows through real browser interaction.
- Verify persistence after reload.
- Verify derived timing uses MeasureGrid utilities/services.
- Verify no calibrated-grid behavior produces the required blocked/needs-calibration state.
- Verify the UI at desktop, tablet-like/iPad landscape, and narrow mobile widths.
- Check browser console errors.
- Inspect source boundaries enough to confirm UI does not bypass repositories/services, duplicate MeasureGrid math, or create adjacent feature records.
- Report PASS or FAIL with evidence for every acceptance criterion.

Verification must report FAIL if:

- Any acceptance criterion is untested.
- The UI is not tested through real browser interaction.
- Persistence after reload is not tested.
- Segment timing is display-only, stubbed, or not derived from MeasureGrid.
- Segment create/edit/delete only changes local component state and does not persist.
- The implementation creates recording, session, take, reference, marker, cloud, or analysis behavior.
- The UI claims automatic PDF measure detection or score following.
- The UI ignores `docs/v1/ui-design.md` or the reference image direction.
- A previously verified core v0 or `practice.measure-grid` workflow is broken.

## Implementation Handoff Requirements

- Assigned feature: `practice.practice-segments`.
- Coding model, effort, and speed used.
- Implementation commit hash.
- Files or areas changed.
- Summary of domain, persistence, MeasureGrid integration, and UI work.
- Test commands run and results.
- Segment timing evidence or fixtures used.
- Browser/self-test evidence for create/edit/delete/select/reload.
- Known limitations, risks, or boundary concerns.

## Verification Handoff Requirements

- Assigned feature: `practice.practice-segments`.
- Verification model, effort, and speed used.
- Verification commit hash.
- PASS or FAIL.
- Acceptance criteria checklist results.
- Unit/integration test evidence.
- Real browser E2E evidence.
- Persistence-after-reload evidence.
- Sheet-scoping evidence.
- MeasureGrid-derived timing evidence.
- Responsive layout evidence.
- Console error status.
- Boundary inspection notes.
- Repro steps for any failure.

## Done Definition

`practice.practice-segments` is done only when:

- The full contract is written and approved.
- `docs/v1/module-status.json` marks `practice.practice-segments` as `contract_ready` before implementation starts.
- `practice.measure-grid` is available as the dependency for derived timing.
- A fresh coding agent implements only this feature.
- The implementation handoff is complete.
- A fresh review agent reviews the changed files against this contract.
- Any review findings are resolved or explicitly accepted by the user.
- A fresh verification agent verifies every acceptance criterion.
- Real browser E2E covers create, edit, delete, select, reload, sheet scoping, and responsive layout.
- Segment timing is verified against MeasureGrid evidence.
- Persistence after reload is verified.
- No adjacent v1 or v2 scope is implemented.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- `practice.segment-recording` to attach selected segment id to recording/session metadata.
- `practice.segment-rerecording` to keep a selected segment active for repeated takes.
- `controls.segment-tempo` to apply optional target BPM to Sheet Practice controls.
- `controls.bar-aware-count-in` to count in before a selected segment.
- `takes.multi-take-management` and review contracts to group takes by segment.
- `home.continue-practice-recommendations` to return to a selected segment.
- `reference.segment-binding` to bind reference ranges to segments.

Do not implement these hooks as product behavior in `practice.practice-segments`.

---

# Feature Contract: `practice.segment-recording`

## Purpose

`practice.segment-recording` carries the selected Practice Segment context into Sheet Practice recording and session metadata. It ensures a real recording can be traced back to the sheet, session, selected segment, and grid-derived measure range without changing the recording artifact itself.

## User Value

- The user can record a take while practicing a selected passage.
- Later review screens can show which segment a recording belongs to.
- Existing sheet recording flows become segment-aware without losing local-first behavior.
- Recordings made before segments existed remain valid and visible.

## v1 Scope

- Detect the currently selected segment in Sheet Practice when recording starts.
- Persist `segmentId` on new sheet-linked recording metadata when a segment is selected.
- Persist enough segment snapshot metadata for review context, such as segment name, measure range, target BPM, and grid-derived start/end timestamps at recording time.
- Associate the active session or session activity with the selected segment when the existing session boundary supports optional segment context.
- Preserve recordings with no selected segment as valid sheet recordings.
- Show concise selected-segment recording context in the Sheet Practice recording area before and after a take.
- Ensure recording save, replay, and existing latest-recording behavior still work with and without segment metadata.
- Keep the real audio artifact creation path unchanged except for metadata/context.

## Out of Scope for v1

- Segment rerecording or automatically keeping the same segment active for another take after save.
- Multi-take grouping, best/latest/active take selection, take history, waveform comparison, or segment review pages.
- Bar-aware count-in implementation or automatically trimming recording artifacts to segment boundaries.
- Automatic transport looping for the selected segment.
- Applying target BPM to metronome controls.
- Reference binding, AB loop creation, reference alignment, or reference waveform display.
- Automatic PDF/image bar-line recognition, score following, BPM detection, mistake detection, or user-facing scoring.
- Cloud sync, account login, backup/restore, conflict handling, or cross-device resume.

## User Paths

```text
Open Sheet Practice for a sheet with a calibrated grid and saved segment
  -> Select the segment
  -> Start recording
  -> Stop recording
  -> Save the real recording artifact
  -> See recording context identify the selected segment
```

```text
Open Sheet Practice for the same sheet without selecting a segment
  -> Start recording
  -> Stop recording
  -> Save a normal sheet-linked recording with no segmentId
  -> Verify existing Review behavior still shows it
```

```text
Open a recording made before segments existed
  -> View or replay it normally
  -> No missing segment crash or fake segment label appears
```

## Product Decisions

- Segment metadata is optional on recordings.
- The recording audio artifact remains the source of truth for audio; segment metadata only describes practice context.
- Recording metadata should snapshot the selected segment's name, measure range, and derived timing at the time of recording so later segment edits do not rewrite history.
- The selected segment id may also be stored to support future grouping, but review must handle deleted or edited segments safely.
- A recording started with a selected segment keeps that segment context for the saved take even if the user changes selection before save, unless the existing recording UX explicitly cancels and restarts the take.
- Existing recordings without segment metadata must remain visible and playable.
- This feature may expose segment context to review metadata, but it must not build full multi-take review or comparison UI.

## Data Boundary

This feature reads:

- Active sheet id.
- Active Sheet Practice session id or session context.
- Selected Practice Segment metadata.
- Selected segment's MeasureGrid-derived start/end timestamps.
- Existing recording state and save flow through the recording service boundary.

This feature creates or updates:

- Recording metadata for newly saved sheet recordings.
- Optional session/activity metadata that references the selected segment when supported by the session boundary.
- UI state showing selected segment recording context.

This feature must not create, update, or delete:

- Recording audio artifacts outside the existing recording service.
- Practice Segment records.
- MeasureGrid records.
- Take groups, best/latest/active take metadata, or waveform comparison records.
- Markers, references, analysis results, cloud, or account records.

## State Boundary

Module-owned state:

- Segment context captured at recording start.
- Segment recording status display.
- Validation/recovery state when the selected segment becomes invalid before recording starts.

Shared state consumed through boundaries:

- Active sheet.
- Active session.
- Recording lifecycle state.
- Selected segment id and metadata from `practice.practice-segments`.
- MeasureGrid-derived segment timing from approved services.

Shared state this feature may expose:

- Recording metadata with optional `segmentId`.
- Recording metadata segment snapshot for review.
- Session/activity segment context for later session contracts.

This feature must not own:

- Segment CRUD state.
- Metronome playback state.
- Audio capture internals.
- Marker state.
- Review grouping state.
- Rerecording loop state.

## Architecture Boundary

The implementation may add:

- Recording metadata fields for optional segment context.
- A segment-context capture helper used by the Sheet Practice recording flow.
- Service-level validation for saving recordings with optional segment metadata.
- UI display of selected segment context in the recording panel.
- Tests and fixtures for recordings with and without segment metadata.

The UI may call only high-level hooks/services. It must not directly call:

- MediaRecorder.
- IndexedDB / Dexie internals.
- Tone.js or Web Audio scheduler internals.
- PDF parser internals.
- Image decoding internals.
- Audio analysis engines or future WASM modules.
- Cloud APIs.

Recording artifact creation must remain behind the existing recording service/adapter. Segment metadata must be attached through recording/session service boundaries, not by mutating storage directly from UI components.

## UI Design Requirements

This feature is user-facing and must follow `docs/v1/ui-design.md`, `docs/v0/design-style-guide.md`, and the reference image at `Design Notes/design_pictures/overall_style_design.png`.

- Keep the sheet image/PDF centered and visually dominant.
- Keep bottom recording and transport controls reachable and stable.
- Show selected segment context in a compact badge, metadata row, or right-side panel area.
- Use yellow for active selected segment state and recording emphasis.
- Use waveform color accents only for existing recording/replay affordances.
- Do not add a large review panel, comparison layout, setup wizard, or explanatory card.
- Do not imply the recording has been automatically scored or trimmed to the selected segment.
- On desktop and iPad landscape, preserve the left sidebar and keep recording context secondary to the sheet.
- On narrow mobile, keep segment recording context compact or in a drawer/tab while recording controls remain reachable.
- Resize behavior must be checked at desktop, tablet-like/iPad landscape, and narrow mobile widths.

## Dependencies

- `practice.measure-grid` for grid-derived segment timing.
- `practice.practice-segments` for selected segment metadata.
- `05c-sheet-recording-review` v0 behavior for real recording artifacts and replay.
- `05e-session-integration` v0 behavior for active Sheet Practice session context.
- `05-sheet-practice` integration for composing selected segment and recording controls.
- `docs/v0/project-structure.md` and `docs/v0/tech-stack-decisions.md` for file and technology boundaries.

Later features that depend on this contract:

- `practice.segment-rerecording`
- `takes.multi-take-management`
- `takes.active-best-take`
- `takes.take-history`
- `takes.waveform-comparison`
- `sessions.segment-sessions`
- `markers.segment-markers`
- `home.continue-practice-recommendations`

## Acceptance Criteria

- [ ] Starting a Sheet Practice recording with a selected segment captures that segment context for the take.
- [ ] Saving the recording persists a real audio artifact through the existing recording flow.
- [ ] Saved recording metadata includes `sheetId`, `sessionId` when available, and selected `segmentId`.
- [ ] Saved recording metadata includes a segment snapshot with name, measure range, optional target BPM, and grid-derived start/end timestamps.
- [ ] Starting a Sheet Practice recording with no selected segment saves a valid sheet recording without `segmentId`.
- [ ] Existing recordings without segment metadata remain visible and playable.
- [ ] Segment edits after recording do not erase the recording's segment snapshot.
- [ ] Deleted segments do not make linked recordings crash or disappear.
- [ ] Active session/activity context can include optional segment context without invalidating sessions that have no segment.
- [ ] Segment recording UI follows `docs/v1/ui-design.md` and the reference image direction.
- [ ] Segment recording context does not obscure the sheet or bottom recording/transport controls on desktop, tablet-like, or narrow mobile viewports.
- [ ] The UI does not claim automatic trimming, automatic scoring, automatic PDF measure detection, or automatic score following.
- [ ] The implementation does not create rerecording, multi-take grouping, review comparison, reference binding, cloud, or analysis behavior.

## Test Plan

### Unit Tests

- Segment context snapshot is created from a selected segment and MeasureGrid-derived timing.
- Snapshot creation rejects missing required segment range or invalid derived timing before recording starts.
- Recording metadata accepts optional `segmentId`.
- Recording metadata remains valid when `segmentId` is absent.
- Segment snapshot remains stable when the original segment object changes after capture.
- Deleted-segment display fallback derives from recording snapshot.

### Integration Tests

- Recording save with selected segment persists recording metadata with `segmentId` and segment snapshot.
- Recording save without selected segment persists valid sheet recording metadata without `segmentId`.
- Existing recording read paths tolerate missing segment metadata.
- Session/activity boundary accepts optional segment context and still accepts no-segment activity.
- Recording service boundary attaches metadata without UI direct storage calls.
- Segment deletion does not delete or corrupt linked recording metadata.

### E2E / Playwright Tests

These tests must use real browser interaction and a real or controlled recording artifact path.

- Seed or create a sheet, calibrated MeasureGrid, and practice segment.
- Open Sheet Practice, select the segment, start recording, stop recording, and save.
- Verify a real recording appears with segment context.
- Reload the browser and verify the recording artifact and segment metadata remain.
- Record again with no segment selected and verify the recording remains valid without segment context.
- Open or seed a legacy recording without segment metadata and verify it remains visible/playable.
- Edit or delete the segment after recording and verify the recording still shows safe snapshot/fallback context.
- Resize to desktop, tablet-like/iPad landscape, and narrow mobile viewports and verify segment recording context remains usable without covering the sheet or controls.
- Check browser console errors during tested flows.

### Manual QA

- Confirm selected segment context is visible but compact while recording.
- Confirm recording controls remain the primary reachable action area.
- Confirm legacy/no-segment recordings do not show confusing fake segment labels.
- Confirm the UI does not imply automatic scoring, trimming, or PDF recognition.
- Compare layout against `Design Notes/design_pictures/overall_style_design.png` and `docs/v1/ui-design.md`.

### Specialized Verification

- Inspect real recording artifact evidence or controlled artifact fixture evidence.
- Verify recording metadata persistence after reload.
- Verify segment snapshot immutability after segment edit/delete.
- Verify no direct UI calls to MediaRecorder or storage internals.
- Verify no review grouping, rerecording, cloud, or analysis records are created.
- Verify responsive layout with screenshots or equivalent visual evidence for desktop, tablet-like, and narrow mobile widths.

## QA Checklist

- [ ] Real recording artifact behavior verified.
- [ ] Segment metadata persists after reload.
- [ ] No-segment recording path verified.
- [ ] Legacy recording path verified.
- [ ] Deleted/edited segment fallback verified.
- [ ] No direct UI calls to recording/storage internals.
- [ ] No rerecording or multi-take behavior implemented.
- [ ] No automatic scoring/trimming/PDF recognition claims.
- [ ] Browser console checked.
- [ ] Responsive layout checked at required widths.

## Failure / Edge Cases

- Selected segment is deleted before recording starts: block segment-context recording or clear selection and record as no-segment according to documented UI behavior.
- Selected segment becomes stale because grid changed: show recoverable warning before recording; do not save misleading timing silently.
- Recording save fails: do not create metadata-only fake take.
- Segment metadata save fails after artifact capture: report recoverable error according to existing recording failure conventions.
- Session id is unavailable: save recording with sheetId and optional segment context if existing v0 behavior permits sessionless recordings.
- Legacy recording lacks segment fields: display and replay normally.
- User changes selected segment while recording: saved take keeps the captured start context unless the recording is cancelled and restarted.

## Implementation Contract

The implementation agent may build only `practice.segment-recording`.

The implementation agent may create or modify:

- Recording metadata types for optional segment context.
- Recording service/repository handling for optional segment metadata.
- Segment context capture logic at recording start.
- Sheet Practice UI that displays selected segment context during recording.
- Tests and fixtures for recordings with selected, no selected, edited, deleted, and legacy segment states.

The implementation agent must not build:

- Segment CRUD or MeasureGrid calibration except through existing APIs.
- Segment rerecording.
- Multi-take grouping, best/latest/active take selection, take history, waveform comparison, or review pages.
- Bar-aware count-in or automatic transport looping.
- Segment tempo application to metronome controls.
- Reference binding or AB looping.
- Automatic PDF/image bar-line detection, score following, BPM detection, mistake detection, or scoring.
- Cloud sync, accounts, backup/restore, or conflict handling.

The implementation agent must:

- Use a fresh coding agent for this feature only.
- Use `fork_context: false` and have the agent read required repository documents directly.
- Use standard speed.
- Preserve verified v0 recording, session, Sheet Practice, MeasureGrid, and Practice Segment behavior.
- Keep UI code behind recording/session/segment service boundaries.
- Verify real artifact persistence, not metadata-only behavior.
- Run relevant unit, integration, and UI/E2E self-tests before handoff.
- Update only `practice.segment-recording` status and implementation notes if status changes are part of the assigned implementation pass.

## Verification Contract

The verification agent must:

- Be a fresh agent separate from the coding agent.
- Use `fork_context: false` and read required repository documents directly.
- Use standard speed.
- Verify only `practice.segment-recording`.
- Run relevant automated tests.
- Exercise selected-segment recording, no-segment recording, legacy recording, reload, and edited/deleted segment fallback through real browser interaction.
- Inspect real recording artifact evidence or a controlled artifact fixture accepted by the existing recording contract.
- Verify persistence after reload.
- Verify source boundaries enough to confirm UI does not bypass recording/session/segment services.
- Verify the UI at desktop, tablet-like/iPad landscape, and narrow mobile widths.
- Check browser console errors.
- Report PASS or FAIL with evidence for every acceptance criterion.

Verification must report FAIL if:

- Any acceptance criterion is untested.
- Recording behavior is metadata-only or stubbed.
- No real artifact or accepted controlled artifact evidence is inspected.
- The UI is not tested through real browser interaction.
- Persistence after reload is not tested.
- Existing no-segment or legacy recordings break.
- The implementation creates rerecording, multi-take, review comparison, reference, cloud, or analysis behavior.
- The UI claims automatic trimming, scoring, PDF measure detection, or score following.
- A previously verified core v0, `practice.measure-grid`, or `practice.practice-segments` workflow is broken.

## Implementation Handoff Requirements

- Assigned feature: `practice.segment-recording`.
- Coding model, effort, and speed used.
- Implementation commit hash.
- Files or areas changed.
- Summary of metadata, recording service, session, segment context, and UI work.
- Test commands run and results.
- Recording artifact evidence from implementer self-test.
- Browser/self-test evidence for selected and no-segment recordings.
- Known limitations, risks, or boundary concerns.

## Verification Handoff Requirements

- Assigned feature: `practice.segment-recording`.
- Verification model, effort, and speed used.
- Verification commit hash.
- PASS or FAIL.
- Acceptance criteria checklist results.
- Unit/integration test evidence.
- Real browser E2E evidence.
- Real recording artifact or accepted fixture evidence.
- Persistence-after-reload evidence.
- Legacy/no-segment recording evidence.
- Edited/deleted segment fallback evidence.
- Responsive layout evidence.
- Console error status.
- Boundary inspection notes.
- Repro steps for any failure.

## Done Definition

`practice.segment-recording` is done only when:

- The full contract is written and approved.
- `docs/v1/module-status.json` marks `practice.segment-recording` as `contract_ready` before implementation starts.
- `practice.measure-grid` and `practice.practice-segments` are available as dependencies.
- A fresh coding agent implements only this feature.
- The implementation handoff is complete.
- A fresh review agent reviews the changed files against this contract.
- Any review findings are resolved or explicitly accepted by the user.
- A fresh verification agent verifies every acceptance criterion.
- Real browser E2E covers selected-segment recording, no-segment recording, legacy recording, reload, and responsive layout.
- Real recording artifact behavior is verified.
- Segment metadata persistence after reload is verified.
- No adjacent v1 or v2 scope is implemented.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- `practice.segment-rerecording` to repeat the same selected segment after saving a take.
- `takes.multi-take-management` to group recordings by sheet and segment.
- `takes.take-history` and waveform comparison to show segment-linked review.
- `markers.segment-markers` to derive marker segment context from recordings.
- `sessions.segment-sessions` to deepen session history grouping.
- `home.continue-practice-recommendations` to resume segment practice.

Do not implement these hooks as product behavior in `practice.segment-recording`.

---

# Feature Contract: `practice.segment-rerecording`

## Purpose

`practice.segment-rerecording` lets the user repeat the same selected practice segment after saving a take without rebuilding the setup. It keeps the active sheet, MeasureGrid, segment, and recording context stable while ensuring every attempt creates a separate real recording artifact.

## User Value

- The user can practice a hard passage repeatedly with less setup friction.
- Each attempt is preserved instead of overwritten.
- Later take-management and review features can compare repeated takes because the recordings share sheet and segment context.
- Sheet Practice feels like a focused practice loop without adding automatic scoring.

## v1 Scope

- After a segment-linked take is saved, keep the same active segment selected in Sheet Practice.
- Provide a visible `Record again` or equivalent action for the same selected segment.
- Start a new recording using the same sheet, session context where valid, MeasureGrid association, selected segment id, and segment snapshot policy from `practice.segment-recording`.
- Preserve previous takes and recording artifacts.
- Show concise state for last saved take and readiness to record the same segment again.
- Handle cancellation or failed save without losing the active segment.
- Keep no-segment recording behavior unchanged.
- Keep rerecording local-first and scoped to Sheet Practice.

## Out of Scope for v1

- Multi-take review grouping, take history, best/latest/active take selection, waveform comparison, or score-based comparison.
- Automatically deciding the best take.
- Automatic trimming, automatic looping playback, automatic count-in, or automatic transport repositioning beyond existing recording controls.
- Applying target BPM to metronome controls.
- Segment CRUD or MeasureGrid calibration.
- Reference binding, AB loop creation, reference alignment, or reference waveform display.
- Automatic PDF/image bar-line recognition, score following, BPM detection, mistake detection, or user-facing scoring.
- Cloud sync, account login, backup/restore, conflict handling, or cross-device resume.

## User Paths

```text
Open Sheet Practice for a sheet with a calibrated grid and selected segment
  -> Start recording
  -> Stop and save the take
  -> See the same segment remains active
  -> Click Record again
  -> Record a second take for the same segment
  -> Verify the first take was not overwritten
```

```text
Record a selected segment
  -> Cancel the recording before saving
  -> Return to ready state
  -> See the same segment is still selected
```

```text
Record a selected segment
  -> Save fails
  -> See recoverable failure state
  -> Retry without losing the selected segment context
```

## Product Decisions

- Rerecording is a Sheet Practice workflow convenience, not a review feature.
- Each rerecord attempt creates a separate recording record and real artifact.
- The active segment remains selected after save, cancel, and recoverable recording errors unless the user explicitly changes sheets or segment selection.
- Latest take can be displayed as simple immediate context, but formal latest/best/active take semantics belong to later take contracts.
- Rerecording reuses `practice.segment-recording` metadata behavior; it must not invent a second metadata path.
- A no-segment recording should not force the rerecord UI into segment mode.
- The feature should not auto-delete, overwrite, or merge recordings.

## Data Boundary

This feature reads:

- Active sheet id.
- Active selected segment metadata.
- Active MeasureGrid association and derived segment timing through existing services.
- Current recording lifecycle state.
- Last saved recording metadata for immediate Sheet Practice feedback.

This feature creates:

- New real recording artifacts through the existing recording service.
- New recording metadata for each repeated take through `practice.segment-recording` behavior.

This feature updates:

- Local Sheet Practice workflow state such as ready/recording/saved/error for the selected segment.
- Active segment selection only by preserving it or clearing it when the sheet/segment becomes invalid.

This feature must not create, update, or delete:

- Practice Segment records.
- MeasureGrid records.
- Take groups, best/latest/active take metadata, or waveform comparison records.
- Review pages or analytics summaries.
- Markers, references, analysis results, cloud, or account records.

## State Boundary

Module-owned state:

- Rerecord readiness state for the active selected segment.
- Last saved take summary for immediate feedback.
- Retry/error state for failed repeated recordings.
- Guard state that prevents double-starting overlapping recordings.

Shared state consumed through boundaries:

- Active sheet.
- Active selected segment.
- Recording lifecycle state and save results.
- Segment recording metadata behavior.
- Active session context where valid.

Shared state this feature may expose:

- A new recording request for the same segment context.
- Immediate latest saved take summary for the current Sheet Practice session.

This feature must not own:

- Segment CRUD state.
- MeasureGrid calibration state.
- Audio capture internals.
- Metronome playback state.
- Review grouping state.
- Best/latest/active take selection semantics.

## Architecture Boundary

The implementation may add:

- Rerecord workflow state/hooks for Sheet Practice.
- A `Record again` UI action wired to the existing recording service.
- Guard logic that prevents overwriting or double-starting recordings.
- Immediate last-take summary display for the current segment.
- Tests and fixtures for repeated recording flows.

The UI may call only high-level hooks/services. It must not directly call:

- MediaRecorder.
- IndexedDB / Dexie internals.
- Tone.js or Web Audio scheduler internals.
- PDF parser internals.
- Image decoding internals.
- Audio analysis engines or future WASM modules.
- Cloud APIs.

Repeated takes must go through the same recording service and segment metadata boundary used by `practice.segment-recording`.

## UI Design Requirements

This feature is user-facing and must follow `docs/v1/ui-design.md`, `docs/v0/design-style-guide.md`, and the reference image at `Design Notes/design_pictures/overall_style_design.png`.

- Keep the sheet image/PDF centered and visually dominant.
- Keep bottom recording and transport controls reachable and stable.
- Show `Record again` or equivalent as a compact action near the recording controls or right-side segment panel.
- Show last saved take feedback as concise metadata, not a full review surface.
- Use yellow for active segment and primary recording emphasis.
- Use restrained waveform accents only if existing recording controls already show them.
- Do not add multi-take cards, comparison panels, best-take badges, scoring summaries, or analytics.
- Do not imply automatic improvement detection, automatic trimming, or PDF measure detection.
- On desktop and iPad landscape, keep rerecord controls secondary to the sheet and transport.
- On narrow mobile, keep the repeat action reachable without covering transport controls.
- Resize behavior must be checked at desktop, tablet-like/iPad landscape, and narrow mobile widths.

## Dependencies

- `practice.measure-grid` for grid-derived selected segment timing.
- `practice.practice-segments` for active segment selection.
- `practice.segment-recording` for recording metadata and segment snapshot behavior.
- `05c-sheet-recording-review` v0 behavior for real recording artifacts.
- `05e-session-integration` v0 behavior for active Sheet Practice session context.
- `05-sheet-practice` integration for composing the rerecord action into the workspace.
- `docs/v0/project-structure.md` and `docs/v0/tech-stack-decisions.md` for file and technology boundaries.

Later features that depend on this contract:

- `takes.multi-take-management`
- `takes.active-best-take`
- `takes.take-history`
- `takes.waveform-comparison`
- `sessions.segment-sessions`
- `home.continue-practice-recommendations`

## Acceptance Criteria

- [ ] After saving a segment-linked recording, the same segment remains selected.
- [ ] A visible `Record again` or equivalent action starts a new recording for the same selected segment.
- [ ] Each repeated recording creates a separate real recording artifact.
- [ ] Each repeated recording creates separate metadata with the same sheet and segment context.
- [ ] Previous takes are not overwritten, deleted, or merged.
- [ ] Canceling a repeated recording keeps the active segment selected and does not create a fake take.
- [ ] A failed save shows recoverable state and keeps the active segment context available for retry.
- [ ] No-segment recording behavior remains valid and does not require segment rerecording UI.
- [ ] Existing recordings without segment metadata remain visible and playable.
- [ ] Rerecording UI follows `docs/v1/ui-design.md` and the reference image direction.
- [ ] Rerecording controls do not obscure the sheet or bottom recording/transport controls on desktop, tablet-like, or narrow mobile viewports.
- [ ] The UI does not claim automatic best-take selection, automatic scoring, automatic trimming, automatic PDF measure detection, or automatic score following.
- [ ] The implementation does not create take grouping, best/latest/active take selection, review comparison, reference, cloud, or analysis behavior.

## Test Plan

### Unit Tests

- Rerecord workflow keeps active segment after successful save.
- Rerecord workflow keeps active segment after cancel.
- Rerecord workflow keeps active segment after recoverable save failure.
- Guard logic rejects starting a second recording while one is already active.
- Repeated recording requests reuse segment-recording context capture.
- Last saved take summary is derived from the new recording metadata without assigning best/active semantics.

### Integration Tests

- First segment-linked recording saves a real artifact and metadata.
- `Record again` saves a second real artifact and second metadata record for the same sheet/segment.
- The first recording remains readable after the second save.
- Failed save does not create metadata-only take.
- No-segment recording path remains valid.
- Legacy recordings without segment metadata remain readable.
- UI code uses recording/segment services rather than direct storage or MediaRecorder calls.

### E2E / Playwright Tests

These tests must use real browser interaction and real or controlled recording artifact evidence.

- Seed or create a sheet, calibrated MeasureGrid, and selected segment.
- Record and save the first segment-linked take.
- Click `Record again`, record and save a second take.
- Verify two separate recordings exist and both have the same sheet/segment context.
- Verify the first take remains playable or otherwise valid through existing replay/review affordance.
- Cancel a repeated recording and verify no fake third take appears.
- Simulate or trigger a save failure where feasible and verify retry state preserves the segment context.
- Record with no selected segment and verify no forced segment rerecord state appears.
- Resize to desktop, tablet-like/iPad landscape, and narrow mobile viewports and verify rerecord controls remain usable without covering the sheet or transport controls.
- Check browser console errors during tested flows.

### Manual QA

- Confirm the repeat action feels like a compact workflow control, not a review dashboard.
- Confirm the active segment remains visible after each save/cancel/failure.
- Confirm the UI makes it clear previous takes are preserved.
- Confirm no best-take, scoring, comparison, or analytics claims appear.
- Compare layout against `Design Notes/design_pictures/overall_style_design.png` and `docs/v1/ui-design.md`.

### Specialized Verification

- Inspect evidence that repeated takes create separate real artifacts.
- Verify no metadata-only fake take appears on cancel or failed save.
- Verify persistence after reload for both recordings and their segment metadata.
- Verify no direct UI calls to MediaRecorder or storage internals.
- Verify no take-group, best-take, waveform-comparison, cloud, or analysis records are created.
- Verify responsive layout with screenshots or equivalent visual evidence for desktop, tablet-like, and narrow mobile widths.

## QA Checklist

- [ ] Two repeated recordings produce two real artifacts.
- [ ] Previous take preservation verified.
- [ ] Segment context persists across repeated saves.
- [ ] Cancel path verified.
- [ ] Save failure/retry path verified where feasible.
- [ ] No-segment recording path verified.
- [ ] No metadata-only fake take.
- [ ] No review grouping or best-take behavior implemented.
- [ ] Browser console checked.
- [ ] Responsive layout checked at required widths.

## Failure / Edge Cases

- Active segment is deleted after a take is saved: clear repeat readiness or show recoverable invalid-segment state; do not start recording with stale live segment metadata silently.
- Grid changes after a take is saved: preserve existing take metadata and require current selected segment timing to be valid before recording again.
- User switches sheets after saving: clear rerecord state for the previous sheet.
- User switches selected segment before clicking `Record again`: record the newly selected segment only if the UI clearly reflects the new selection.
- Recording is already active: disable repeat action or route to existing recording state.
- Save fails after artifact capture: follow existing recording recovery behavior and do not create duplicate metadata on retry.
- Browser reload after first take: previous take persists; repeat readiness may restore only if supported by local Sheet Practice state and must not fake a missing session.

## Implementation Contract

The implementation agent may build only `practice.segment-rerecording`.

The implementation agent may create or modify:

- Sheet Practice rerecord workflow state.
- Compact `Record again` UI action.
- Integration with existing recording and segment-recording services.
- Guard logic preventing overwrite, duplicate starts, and metadata-only takes.
- Tests and fixtures for repeated recording, cancel, failure, and no-segment paths.

The implementation agent must not build:

- Segment CRUD, MeasureGrid calibration, or segment recording metadata behavior except through existing APIs.
- Multi-take grouping, best/latest/active take selection, take history, waveform comparison, or review pages.
- Bar-aware count-in or automatic transport looping.
- Segment tempo application to metronome controls.
- Reference binding or AB looping.
- Automatic PDF/image bar-line detection, score following, BPM detection, mistake detection, or scoring.
- Cloud sync, accounts, backup/restore, or conflict handling.

The implementation agent must:

- Use a fresh coding agent for this feature only.
- Use `fork_context: false` and have the agent read required repository documents directly.
- Use standard speed.
- Preserve verified v0 recording, session, Sheet Practice, MeasureGrid, Practice Segment, and Segment Recording behavior.
- Keep UI code behind recording and segment service boundaries.
- Verify repeated recordings create real separate artifacts.
- Run relevant unit, integration, and UI/E2E self-tests before handoff.
- Update only `practice.segment-rerecording` status and implementation notes if status changes are part of the assigned implementation pass.

## Verification Contract

The verification agent must:

- Be a fresh agent separate from the coding agent.
- Use `fork_context: false` and read required repository documents directly.
- Use standard speed.
- Verify only `practice.segment-rerecording`.
- Run relevant automated tests.
- Exercise repeated segment recording, cancel, failure/retry where feasible, no-segment recording, reload, and responsive layout through real browser interaction.
- Inspect real recording artifact evidence or controlled artifact fixture evidence accepted by the existing recording contract.
- Verify two repeated takes produce two separate persisted recordings.
- Verify source boundaries enough to confirm UI does not bypass recording/segment services.
- Check browser console errors.
- Report PASS or FAIL with evidence for every acceptance criterion.

Verification must report FAIL if:

- Any acceptance criterion is untested.
- Repeated recordings overwrite, merge, or delete earlier takes.
- Recording behavior is metadata-only or stubbed.
- No real artifact or accepted controlled artifact evidence is inspected.
- The UI is not tested through real browser interaction.
- Persistence after reload is not tested for repeated recordings.
- Existing no-segment or legacy recordings break.
- The implementation creates take grouping, best/latest/active take selection, review comparison, reference, cloud, or analysis behavior.
- The UI claims automatic best-take selection, scoring, trimming, PDF measure detection, or score following.
- A previously verified core v0, `practice.measure-grid`, `practice.practice-segments`, or `practice.segment-recording` workflow is broken.

## Implementation Handoff Requirements

- Assigned feature: `practice.segment-rerecording`.
- Coding model, effort, and speed used.
- Implementation commit hash.
- Files or areas changed.
- Summary of rerecord workflow, recording service integration, guard logic, and UI work.
- Test commands run and results.
- Evidence that repeated recordings create separate artifacts.
- Browser/self-test evidence for repeat, cancel, and no-segment paths.
- Known limitations, risks, or boundary concerns.

## Verification Handoff Requirements

- Assigned feature: `practice.segment-rerecording`.
- Verification model, effort, and speed used.
- Verification commit hash.
- PASS or FAIL.
- Acceptance criteria checklist results.
- Unit/integration test evidence.
- Real browser E2E evidence.
- Real recording artifact or accepted fixture evidence for two repeated takes.
- Persistence-after-reload evidence.
- Cancel and failure/retry evidence.
- No-segment recording evidence.
- Responsive layout evidence.
- Console error status.
- Boundary inspection notes.
- Repro steps for any failure.

## Done Definition

`practice.segment-rerecording` is done only when:

- The full contract is written and approved.
- `docs/v1/module-status.json` marks `practice.segment-rerecording` as `contract_ready` before implementation starts.
- `practice.measure-grid`, `practice.practice-segments`, and `practice.segment-recording` are available as dependencies.
- A fresh coding agent implements only this feature.
- The implementation handoff is complete.
- A fresh review agent reviews the changed files against this contract.
- Any review findings are resolved or explicitly accepted by the user.
- A fresh verification agent verifies every acceptance criterion.
- Real browser E2E covers repeated recording, cancel, no-segment behavior, reload, and responsive layout.
- Two repeated takes are verified as separate real artifacts.
- No adjacent v1 or v2 scope is implemented.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- `takes.multi-take-management` to group repeated segment recordings.
- `takes.active-best-take` to let users select best or active take.
- `takes.take-history` to show take count, latest take, and segment summaries.
- `takes.waveform-comparison` to compare real audio evidence.
- `sessions.segment-sessions` to summarize repeated segment work in session history.
- `home.continue-practice-recommendations` to resume the same segment later.

Do not implement these hooks as product behavior in `practice.segment-rerecording`.

---

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
