# v1 Feature Inventory

## Purpose

This inventory defines the v1 feature set before implementation. A feature listed here is not implementation-ready until it has a full v0-style contract and is marked `contract_ready` in `docs/v1/module-status.json`.

## Core Practice Spine

All user-facing features must follow `docs/v1/ui-design.md` and the reference image at `Design Notes/design_pictures/overall_style_design.png`.

### `practice.measure-grid`

Defines a musical time grid for a sheet from BPM, time signature, first-measure offset, and optional pickup beats. This supports measure-aware practice without automatic PDF score recognition.

Initial behavior:

- Use sheet defaults or current metronome BPM and time signature.
- Let the user calibrate measure one with a "Set measure 1 here" action.
- Derive measure start/end timestamps from the grid.
- Keep all calculations deterministic and unit-tested.

Not included:

- Automatic bar-line recognition from PDF or image content.
- Automatic score following.

### `practice.practice-segments`

Lets the user create named practice segments from measure ranges, such as measures 5-12. A segment belongs to one sheet and stores the selected measure range, target tempo, notes, and current grid association.

Initial behavior:

- Create, edit, delete, and select segments for a sheet.
- Compute segment start/end timestamps from `practice.measure-grid`.
- Preserve segment data locally.

### `practice.segment-recording`

Carries the selected segment context into Sheet Practice recording and session metadata.

Initial behavior:

- Recording metadata can link to `sheetId`, `sessionId`, and `segmentId`.
- Segment recording uses the selected grid-derived time range for count-in and review context.
- Existing sheet recordings without segment metadata remain valid.

### `practice.segment-rerecording`

Lets the user repeat the same selected segment without manually recreating the setup.

Initial behavior:

- Keep the active segment after a take is saved.
- Start another take against the same sheet, grid, and segment context.
- Do not overwrite previous takes.

## Review And Takes

### `takes.multi-take-management`

Groups multiple recordings under the same sheet and segment so repeated practice can be reviewed together.

Initial behavior:

- Store and read take groups by `sheetId` and `segmentId`.
- Preserve every real recording artifact.
- Keep quick recordings in the unified review system without forcing segment metadata.

### `takes.active-best-take`

Lets the user mark one take as active, best, or latest within a segment.

Initial behavior:

- Latest is derived from recording time.
- Best/active is user-selected.
- Deleting a take updates the group safely.

### `takes.take-history`

Shows take history for a sheet or segment.

Initial behavior:

- Display take count, latest take, best take, duration, BPM, time signature, and marker summary.
- Support navigation from Review back to the segment practice context.

### `takes.waveform-comparison`

Adds a review view for comparing takes with waveform evidence.

Initial behavior:

- Compare real decoded artifacts or trusted peaks.
- Do not claim automatic scoring.
- Keep waveform rendering behind review or analysis services.

## Sessions And History

### `sessions.event-timeline`

Records meaningful practice events such as metronome start, stop, recording start, recording stop, reference play, and reference pause.

Initial behavior:

- Timeline events attach to a practice session.
- Events are deterministic enough for unit and E2E verification.
- Timeline does not couple transport controls together.

### `sessions.segment-sessions`

Associates sessions with selected practice segments.

Initial behavior:

- Sheet sessions can optionally include `segmentId`.
- Continue Practice can return to a sheet and selected segment.
- Sessions without recordings remain valid.

### `sessions.session-history-grouping`

Groups session history by sheet, segment, or practice date.

Initial behavior:

- Use local session data only.
- Avoid cloud or cross-device merge assumptions.

### `sessions.goal-completion`

Tracks completion of practice goals that can be checked from local session activity.

Initial behavior:

- Support simple local goals such as minutes practiced, sessions completed, or takes recorded.
- Do not require notifications or cloud identity.

## Home And Navigation

### `home.dashboard-analytics`

Adds more detailed local practice summaries to Home.

Initial behavior:

- Derive analytics from local sessions and recordings.
- Avoid precision that the data cannot support.

### `home.practice-streaks`

Shows local practice streaks based on browser-local practice days.

Initial behavior:

- Use the same local-day policy as v0 Today Summary.
- Handle empty history and cleared data explicitly.

### `home.goal-management`

Lets users create and track local practice goals.

Initial behavior:

- Use local goal storage.
- Connect to session and segment history where available.

### `home.recent-activity-timeline`

Shows recent practice activity across quick practice, sheet practice, recordings, and segments.

Initial behavior:

- Use local activity data.
- Preserve fast entry to Quick Metronome and Sheet Practice.

### `home.continue-practice-recommendations`

Improves Continue Practice from a single recent session to useful recommendations.

Initial behavior:

- Recommend recent quick practice, sheet practice, and segment practice targets.
- Validate deleted sheets or stale references before linking.

### `home.command-palette`

Adds a keyboard-driven navigation and action surface.

Initial behavior:

- Route to existing pages and valid practice targets.
- Do not expose actions that are not implemented.

## Quick Metronome Training

### `quick.auto-increase`

Automatically ramps BPM during a quick practice session.

Initial behavior:

- User chooses starting BPM, target BPM, step size, and interval.
- Timing verification must prove tempo changes affect generated clicks.

### `quick.mute-training`

Alternates audible and silent measures for internal time training.

Initial behavior:

- User chooses audible/silent measure pattern.
- Verification must distinguish intentional silence from broken audio.

### `quick.practice-templates`

Stores reusable quick metronome settings.

Initial behavior:

- Save, load, rename, and delete local templates.
- Templates include BPM, meter, subdivision, accent, countdown, and training mode settings when available.

### `quick.warmup-routines`

Chains metronome templates into a local warmup flow.

Initial behavior:

- Run one routine step after another.
- Keep recording independent from routine playback.

### `quick.tempo-progress-history`

Tracks tempo progress for quick practice over time.

Initial behavior:

- Summarize practiced BPM ranges from local sessions and recordings.
- Do not claim skill improvement automatically.

### `quick.advanced-countdown`

Adds richer count-in options.

Initial behavior:

- Support count-in by beats or measures.
- Keep countdown behavior testable through the metronome service.

## Sheet Library

### `library.tags-favorites`

Adds local organization metadata for sheets.

Initial behavior:

- Support tags and favorite state.
- Preserve existing category behavior.

### `library.batch-import`

Imports multiple supported sheet files in one flow.

Initial behavior:

- Handle mixed success and failure without losing successful imports.
- Keep artifact inspection behind existing import boundaries.

### `library.recent-practice-summary`

Shows recent local practice information on sheet rows or details.

Initial behavior:

- Use sessions, recordings, and segments.
- Avoid fake summaries for sheets with no practice data.

### `library.review-by-sheet`

Links from a sheet to review views grouped by that sheet.

Initial behavior:

- Use unified recordings review.
- Include segment grouping when segments exist.

## Sheet Viewer

### `viewer.page-thumbnails`

Creates visual page navigation from real sheet artifacts.

Initial behavior:

- Generate thumbnails through viewer/artifact services.
- Verify thumbnails against PDF and image fixtures.

### `viewer.multi-page-jump`

Lets users jump to a page in longer sheets.

Initial behavior:

- Support page number entry and thumbnail selection.
- Clamp invalid page choices clearly.

### `viewer.advanced-zoom-pan`

Improves sheet navigation at different viewport sizes.

Initial behavior:

- Preserve sheet-first layout.
- Verify zoom and pan state across desktop and mobile.

### `viewer.assisted-page-turning`

Offers practice-aware page turning without automatic score following.

Initial behavior:

- Use manual timing or segment boundaries where available.
- Never turn pages based on unverified score recognition.

## Practice Controls

### `controls.segment-tempo`

Uses segment-specific target tempo inside Sheet Practice controls.

Initial behavior:

- Selecting a segment can apply its target BPM.
- The user can override the current BPM without mutating the segment unless they save the change.

### `controls.bar-aware-count-in`

Counts in based on measure grid settings.

Initial behavior:

- Count in by beats or measures before a selected segment starts.
- Use measure grid calculations for timing.

### `controls.per-sheet-metronome-presets`

Stores sheet-specific metronome presets.

Initial behavior:

- Presets belong to one sheet.
- Presets can optionally attach to a segment.

## Markers

### `markers.categories-severity`

Adds manual marker category and severity metadata.

Initial behavior:

- Keep marker timestamps and recording scope.
- Support filtering and visible labels.

### `markers.segment-markers`

Associates markers with the segment context of a recording.

Initial behavior:

- Marker remains recording-scoped.
- Segment relation is derived from the recording or selected review context.

### `markers.waveform-overlay`

Displays markers on waveform views.

Initial behavior:

- Overlay positions come from timestamps.
- Seek behavior remains behind playback services.

## Reference

### `reference.ab-loop`

Loops a selected reference range.

Initial behavior:

- Store start and end time for local references and allowed Bilibili metadata.
- Playback loop is local for local audio; Bilibili remains lightweight metadata and external playback.

### `reference.playback-speed`

Controls local reference playback rate.

Initial behavior:

- Support safe speed values.
- Preserve independent reference playback state.

### `reference.manual-offset-alignment`

Stores manual offset between a reference and the practice grid or recording.

Initial behavior:

- User adjusts offset explicitly.
- Do not claim automatic alignment.

### `reference.segment-binding`

Attaches a reference range to a practice segment.

Initial behavior:

- Segment can point to one active reference range.
- Reference remains scoped to the sheet.

### `reference.waveform-display`

Shows waveform data for local reference audio.

Initial behavior:

- Use real local audio artifacts.
- Keep waveform generation behind services or analysis boundaries.

## Settings And Local Data

### `settings.audio-device-selection`

Lets the user choose browser audio input/output devices where supported.

Initial behavior:

- Handle missing browser support and permission denial clearly.

### `settings.theme-system`

Adds local theme preferences.

Initial behavior:

- Preserve the v0 visual direction.
- Keep theme state local.

### `settings.notification-settings`

Stores local notification preferences.

Initial behavior:

- Do not depend on account or cloud services.
- Request browser permissions only through explicit user action.

### `settings.data-import-export`

Supports local backup and restore files.

Initial behavior:

- Export local metadata and supported artifacts with integrity checks.
- Import validates data before writing.

### `settings.storage-usage-breakdown`

Shows storage usage by sheets, recordings, references, markers, sessions, and settings.

Initial behavior:

- Use storage services rather than direct UI storage calls.

### `settings.selective-cleanup`

Allows cleanup by data type.

Initial behavior:

- Prevent dangling references.
- Keep Clear All Local Data available.

## Audio Analysis Infrastructure

### `analysis.engine-boundary`

Defines `AudioAnalysisEngine` so analysis can be replaced or moved to WASM later.

Initial behavior:

- UI never calls analysis engines directly.
- TypeScript implementation is acceptable for early bounded work.

### `analysis.peak-precomputation`

Precomputes waveform peaks for review performance.

Initial behavior:

- Peaks are derived from real audio.
- Invalid trusted peaks are rejected after decode verification.

### `analysis.onset-detection-infrastructure`

Introduces onset detection as an internal capability.

Initial behavior:

- Use controlled fixtures.
- Do not expose automatic scoring claims.

### `analysis.reference-recording-support`

Provides analysis support for reference-to-recording comparison.

Initial behavior:

- Support waveform/time alignment inputs.
- Do not claim automatic correctness without explicit tolerances.

## Explicitly Deferred To v2

Deferred items are tracked in `docs/v2`.

- User login.
- Supabase-backed cloud sync.
- Cross-device resume.
- Cross-device settings, sheet, recording, reference, marker, and session sync.
- Recording and reference artifact upload.
- Device sync status.
- Conflict handling.
- Backup and restore.
- Cross-device session merging.
- Automatic score following.
- Automatic PDF bar-line recognition.
- Automatic mistake detection and user-facing scoring.
- Guitar Pro and MusicXML import.
- Automatic BPM or time-signature detection from imported files.
