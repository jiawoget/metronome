# Error Markers

## Purpose

This submodule lets the user manually mark problem points on a recording during Sheet Practice review.

v0 markers are timestamp-based and recording-scoped. They are not automatic mistake detection and are not bar-aware.

## User Value

- The user can mark where something went wrong.
- The user can add a short note to remember what to fix.
- The user can jump back to a marked point during replay.
- The user can return later and still see the markers.

## v0 Scope

- Add an error marker to the current recording.
- Bind marker to recordingId.
- Bind marker to recording timestamp.
- Optional note.
- Marker list.
- Sort markers by timestamp.
- Click marker to seek playback.
- Delete marker.
- Persist markers after refresh.
- Clear empty state when no recording exists.

## Out of Scope for v0

- Automatic mistake detection.
- Bar-aware markers.
- Marker attached directly to Practice Segment.
- Marker categories.
- Severity levels.
- Marker waveform overlay.
- Marker on sheet overlay.
- Automatic suggestions.

## User Paths

```text
Open Sheet Practice with a recording
  -> Play or scrub to a point
  -> Click Mark Error
  -> Enter optional note
  -> See marker in list
  -> Click marker later
  -> Playback seeks to marker time
```

```text
Open Sheet Practice with saved markers
  -> See markers for the selected recording
  -> Delete one marker
  -> Refresh
  -> Confirm deleted marker remains gone
```

```text
Open Sheet Practice with no recording
  -> See marker empty or disabled state
  -> Cannot create an invalid marker
```

## Product Decisions

- v0 markers bind to recording timestamps.
- v0 markers do not bind to automatically detected bars.
- v0 markers do not require sheet position recognition.
- Markers are manually created.
- Markers belong to recordings, not directly to sessions.
- A marker cannot exist without recordingId.

## Data Boundary

This module creates:

- ErrorMarker with recordingId.
- Timestamp.
- Optional note.

This module reads:

- Current recordingId.
- Current recording duration.
- Current playback time.
- Existing markers for selected recording.

This module updates:

- Marker note if editing is included.
- Playback seek target when marker is clicked.

This module deletes:

- ErrorMarker records.

This module must not create:

- Recordings.
- Practice Sessions.
- Sheet annotations.
- Automatic analysis results.

## State Boundary

Module-owned state:

- Marker creation form state.
- Marker list loading state.
- Marker validation errors.
- Delete confirmation state if needed.

Shared state:

- Selected/current recording.
- Current playback time.
- Playback seek service.
- Recording duration.

## Architecture Boundary

The UI may call marker, recording playback, and persistence services.

The UI must not directly call:

- IndexedDB / Dexie.
- Audio element internals as source of truth.
- wavesurfer.js internals.
- Analysis engines.

Seek behavior should go through a playback service boundary.

## Dependencies

- `05c-sheet-recording-review` for current recording and playback.
- Local Data for marker persistence.
- `03-recordings-review` for marker display in full review.

## Acceptance Criteria

- [ ] A marker can be added when a recording exists.
- [ ] Marker controls are disabled or show a clear empty state when no recording exists.
- [ ] Marker stores recordingId.
- [ ] Marker timestamp is captured from current playback time or an explicit user-selected time.
- [ ] Marker timestamp must be within recording duration.
- [ ] Marker can include an optional note.
- [ ] Marker notes are trimmed or validated according to documented rules.
- [ ] Marker list is sorted by timestamp.
- [ ] Clicking a marker seeks playback to the marker timestamp.
- [ ] Seek uses the real playback service, not only list highlighting.
- [ ] Marker persists after refresh or reload.
- [ ] Deleted marker disappears from the list.
- [ ] Deleted marker remains gone after refresh or reload.
- [ ] Switching recordings shows only markers for the selected recording.
- [ ] Invalid timestamp shows validation error.
- [ ] No marker can be created without recordingId.
- [ ] No automatic mistake detection or bar-aware behavior appears in v0.

## Test Plan

### Unit Tests

- recordingId required.
- Timestamp validation.
- Timestamp duration range validation.
- Marker sorting by timestamp.
- Note trimming and validation.
- Timestamp display formatting.
- Seek target calculation.

### Integration Tests

- Create marker and persist it.
- Load markers by recordingId.
- Delete marker and persist deletion.
- Switch selected recording and reload marker list.
- Click marker and call playback service seek(time).
- Invalid timestamp returns validation error.
- No recording blocks marker creation.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Seed or create a sheet recording with known duration.
- Open Sheet Practice.
- Play or set playback to a known time.
- Click Mark Error.
- Enter note text.
- Save marker.
- Verify marker appears with timestamp and note.
- Click marker and verify playback currentTime seeks near the marker timestamp.
- Add a second marker at a different time.
- Verify markers are sorted by timestamp.
- Reload and verify markers still appear.
- Delete a marker through the UI.
- Reload and verify deleted marker is gone.
- Switch to another recording and verify original markers are not shown.
- Open no-recording state and verify marker creation is disabled or blocked.
- Resize browser and verify marker list remains usable.
- Check browser console errors during the tested flows.

### Manual QA

- Confirm marker note input is understandable.
- Confirm long notes do not break layout.
- Confirm timestamp display is readable.
- Confirm marker list remains usable on mobile.

### Specialized Verification

#### Seek Verification

The verifier must check real seek behavior.

Required checks:

- Use a known marker timestamp, such as 1.2 seconds.
- Click the marker through the UI.
- Verify playback currentTime is within documented tolerance of the marker timestamp.
- Verify list highlighting alone is not treated as seek success.

#### Persistence Verification

The verifier must check:

- Created marker persists after reload.
- Deleted marker remains deleted after reload.
- Markers are scoped by recordingId.
- Invalid marker without recordingId is not persisted.

#### Layout Resize Verification

The verifier must check:

- Desktop viewport.
- Narrow mobile viewport.
- Resize from desktop to mobile and back.
- Long note display.
- Marker list remains usable and does not overlap core controls.

## QA Checklist

- [ ] Real browser E2E testing was performed.
- [ ] Marker creation was tested with a real recording.
- [ ] No-recording state was tested.
- [ ] recordingId binding was verified.
- [ ] Timestamp range validation was tested.
- [ ] Real playback seek was verified.
- [ ] Marker persistence after reload was tested.
- [ ] Marker deletion persistence after reload was tested.
- [ ] Recording-scoped marker filtering was tested.
- [ ] Resize behavior was tested.
- [ ] No console errors appeared during tested flows.

## Failure / Edge Cases

- No recording: block marker creation.
- Missing recordingId: validation failure.
- Timestamp below 0: validation failure.
- Timestamp beyond duration: validation failure.
- Playback seek fails: show recoverable error and do not claim seek succeeded.
- Marker save fails: show error and keep form state.
- Marker delete fails: keep marker visible and show error.
- Long note: wrap or truncate without breaking layout.

## Implementation Contract

The implementation agent may build:

- Marker creation UI.
- Marker list UI.
- Marker persistence integration.
- Marker deletion flow.
- Playback seek integration.
- No-recording empty or disabled state.
- Validation helpers.

The implementation agent must not build:

- Automatic mistake detection.
- Bar-aware markers.
- Sheet overlays.
- Waveform marker overlays.
- Marker categories or severity.
- Practice Segment marker binding.
- Fake seek behavior.

Implementation handoff must include:

- Marker UI, persistence, validation, and seek areas changed.
- Tests run.
- Seek behavior checked.
- Persistence behavior checked.
- Resize behavior checked.
- Known limitations or risks.

## Verification Contract

The verification agent must:

- Be a separate agent pass from the implementation agent.
- Run relevant automated tests.
- Use real browser interaction for marker create, seek, delete, reload, switch-recording, and resize flows.
- Verify marker recordingId binding.
- Verify timestamp range validation.
- Verify playback currentTime changes after marker click.
- Verify persistence after reload.
- Verify deletion persistence after reload.
- Verify no-recording state.
- Check browser console errors.

The verifier must report FAIL if marker seek is only visual highlighting, if markers are not scoped by recordingId, if invalid markers persist, or if E2E interaction is skipped.

## Implementation Handoff Requirements

- Summary of marker UI, persistence, validation, and playback seek changes.
- Test commands run.
- Seek evidence from implementer self-test.
- Persistence checks performed.
- Resize checks performed.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Real browser E2E evidence.
- Seek evidence with tolerance used.
- Persistence reload evidence.
- Delete persistence evidence.
- Recording scope evidence.
- Resize evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This module is complete only when:

- All acceptance criteria pass.
- Real browser E2E covers create, seek, delete, reload, and resize.
- Real playback seek is verified.
- Marker persistence and deletion persistence are verified.
- Marker recording scope is verified.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- Bar-aware markers.
- Marker attached to Practice Segment.
- Marker categories.
- Severity levels.
- Automatic mistake suggestions.
- Marker waveform overlay.
- Marker on sheet overlay.

Do not implement these in v0.
