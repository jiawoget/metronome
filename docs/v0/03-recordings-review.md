# Recordings / Review

## Purpose

This module makes practice recordings findable, playable, reviewable, removable, and usable as a way back into practice.

It must prove that recordings are real persisted audio artifacts with metadata, not display-only list rows.

## User Value

- The user can find previous practice recordings.
- The user can replay a recording.
- The user can see basic context like BPM, meter, type, and linked sheet.
- The user can review manual error markers.
- The user can delete recordings.
- The user can practice again from a recording's saved context.

## v0 Scope

- Unified recordings list.
- Empty state.
- Search.
- Type filtering.
- Recording details.
- Play and pause.
- Basic waveform or simplified waveform.
- Error marker list.
- Delete recording.
- Practice Again.
- Bad or missing audio error state.

## Out of Scope for v0

- Recording comparison.
- Multi-take management.
- Bar-level navigation.
- Automatic scoring.
- Automatic timing analysis.
- Cloud backup.
- Tags.
- Favorites.
- Archive.
- Audio export.

## User Paths

```text
Open Recordings with no saved recordings
  -> See an empty state
```

```text
Open Recordings with saved recordings
  -> Search or filter recordings
  -> Open a recording
  -> Play and pause it
  -> View metadata and error markers
  -> Practice again from the recording context
```

```text
Open Recordings
  -> Delete a recording
  -> Refresh
  -> Confirm the recording is still gone
```

## Product Decisions

- Recordings should be one unified list, not separate pages for quick and sheet recordings.
- Quick recordings and sheet recordings should be separated by filters and metadata.
- Recording details should not support complex editing in v0.
- Error markers should display with timestamps and optional notes.
- `Practice Again` from a linked sheet recording should return to `Sheet Practice`.
- `Practice Again` from an unlinked quick recording should return to `Quick Metronome`.
- `Practice Again` is a Recordings Review action, not the global Home `Continue Practice` concept.
- `Practice Again` carries source context from a historical recording, but any later recording must create a new recording entry and new Practice Session. It must never reuse the source recordingId, overwrite the source audio artifact, or mutate immutable source metadata.
- v0 should not support audio export.

## Data Boundary

This module reads:

- Recording metadata.
- Recording audio artifacts.
- Error markers linked by recordingId.
- Practice Session context.
- Optional linked sheet metadata.

This module updates:

- Playback state.

This module deletes:

- Recording metadata.
- Recording audio artifact.
- Error markers linked to the deleted recording when applicable.

This module must not create:

- New recording takes.
- New sheets.
- New Practice Sessions, except through Practice Again navigation handled by the target module.
- v1 analysis results.

## State Boundary

Module-owned state:

- Search query.
- Type filter.
- Selected recording.
- Local playback UI state.
- Delete confirmation state if needed.
- Error state for bad or missing audio.

Shared state:

- Recording list.
- Playback service state.
- Practice Session context for Practice Again target.
- Global playback status.

## Architecture Boundary

The UI may call recording history, playback, waveform, and navigation services.

The UI must not directly call:

- IndexedDB / Dexie.
- Raw file storage APIs.
- Audio element internals as the source of truth.
- wavesurfer.js.
- Future analysis or WASM modules.

Waveform or peak generation must sit behind a service or adapter boundary.

## Dependencies

- Quick Metronome for quick recording Practice Again target.
- Sheet Practice route shell for sheet recording Practice Again target.
- Practice Session for recording context.
- Local Data for recording metadata and audio artifacts.
- Error Markers from Sheet Practice or recording flow.

## Acceptance Criteria

- [ ] The user can open Recordings.
- [ ] Empty recordings show a clear empty state.
- [ ] Saved recordings appear in a unified list.
- [ ] The list displays recording name, date, duration, BPM, time signature, and type.
- [ ] Linked sheet name is displayed when available.
- [ ] Search filters recordings by visible metadata.
- [ ] Type filter separates `quick` and `sheet` recordings.
- [ ] The user can open recording details.
- [ ] The user can play and pause a recording.
- [ ] Playback uses a real decodable recording artifact.
- [ ] Basic waveform or simplified waveform is derived from real audio or trusted test peaks.
- [ ] Error markers display timestamp and note.
- [ ] The user can delete a recording.
- [ ] Deleted recording disappears from the list.
- [ ] Deleted recording remains gone after refresh or reload.
- [ ] Deleted recording artifact is deleted or no longer accessible.
- [ ] Practice Again for quick recording routes to Quick Metronome.
- [ ] Practice Again for sheet recording routes to Sheet Practice or its route shell.
- [ ] Recording again after Practice Again creates a new recording/session and leaves the original recording metadata and artifact unchanged.
- [ ] Bad or missing audio shows a clear error state.
- [ ] No playback, delete, search, filter, or Practice Again action is stub-only.

## Test Plan

### Unit Tests

- Search matching.
- Type filtering.
- Combined search and filter behavior.
- Recording sort order.
- Duration formatting.
- Timestamp formatting.
- Practice Again target calculation.
- Error marker sorting.

### Integration Tests

- Load recordings from the local data boundary.
- Load recording artifact for playback.
- Decode or validate playback artifact before playback.
- Delete recording metadata and audio artifact together.
- Load error markers by recordingId.
- Combine filtering and search.
- Propagate bad or missing audio errors to UI state.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Open Recordings with no recordings and verify empty state.
- Seed or create a real decodable quick recording artifact.
- Reload and verify the recording appears.
- Search for the recording through the search field.
- Apply quick filter and verify the recording remains.
- Open recording details.
- Click Play and verify playback state.
- Click Pause and verify playback stops.
- Verify metadata is visible.
- Verify seeded error markers are visible.
- Click Practice Again and verify Quick Metronome route.
- After Practice Again, create another recording and verify the original recording's artifact and immutable metadata are unchanged while the new recording has its own id, session, metadata, and decodable artifact.
- Return to Recordings.
- Delete the recording through the UI.
- Reload and verify the recording is gone.
- Seed a sheet recording with sheetId and verify Practice Again routes to Sheet Practice route shell.
- Seed bad audio and verify the error state.
- Check browser console errors during the tested flows.

### Manual QA

- Confirm list layout works on desktop and mobile.
- Confirm destructive delete interaction is clear.
- Confirm bad audio error copy is understandable.

### Specialized Verification

#### Recording Artifact Verification

Verification must use a real decodable audio artifact, such as:

- A generated short WAV fixture.
- A recording created by Quick Metronome tests.
- A controlled fixture with known duration and energy.

The verifier must check:

- Artifact can be decoded.
- Duration matches metadata within tolerance or discrepancy is handled.
- Artifact is not empty.
- Playback service receives the real artifact.
- Waveform or simplified peaks are derived from the artifact or from trusted test peaks tied to it.

#### Delete Persistence

The verifier must check:

- Metadata is removed.
- Audio artifact is deleted or no longer accessible.
- Linked error markers are removed or handled according to the data contract.
- Reload does not restore deleted data.

#### Bad Audio Handling

The verifier must seed or provide bad audio and confirm:

- The app does not crash.
- The UI shows an error state.
- Playback is not falsely shown as successful.

## QA Checklist

- [ ] Real browser E2E testing was performed.
- [ ] Recording fixture or artifact was real and decodable.
- [ ] Playback was verified beyond button state.
- [ ] Search and type filtering were tested together.
- [ ] Deletion was tested through the UI.
- [ ] Deletion persisted after reload.
- [ ] Practice Again was tested for quick recording.
- [ ] Practice Again was tested for sheet recording route target.
- [ ] Bad audio state was tested.
- [ ] No console errors appeared during tested flows.

## Failure / Edge Cases

- No recordings: show empty state.
- Missing audio artifact: show error, do not fake playback.
- Corrupt audio artifact: show error, do not crash.
- Delete fails: keep item visible and show failure state.
- Recording has missing sheet: show fallback sheet label and route carefully.
- Error markers missing: show empty marker state.
- Long recording list: search and filter should remain usable.

## Implementation Contract

The implementation agent may build:

- Recordings list UI.
- Search and type filter.
- Recording details.
- Playback integration.
- Basic waveform or simplified waveform integration.
- Error marker display.
- Delete flow.
- Practice Again route logic.
- Test fixtures for real decodable audio.

The implementation agent must not build:

- Recording comparison.
- Multi-take management.
- Audio export.
- Automatic scoring.
- Tags, favorites, or archive.
- Fake recording rows without real artifacts.
- Playback controls that only change UI state.

Implementation handoff must include:

- Recording list, playback, delete, and Practice Again areas changed.
- Tests run.
- Audio artifact fixture used.
- Persistence behavior checked.
- Known limitations or risks.

## Verification Contract

The verification agent must:

- Be a separate agent pass from the implementation agent.
- Run relevant automated tests.
- Use real browser interaction for list, search, filter, playback, delete, and Practice Again flows.
- Use a real decodable recording artifact.
- Verify playback through the playback service or browser media state, not only button text.
- Verify waveform or peaks come from real audio or trusted fixture peaks.
- Verify deletion persists after reload.
- Verify bad audio error state.
- Check browser console errors.

The verifier must report FAIL if recordings are metadata-only, playback is UI-only, deletion does not remove persisted data, or E2E interaction is skipped.

## Implementation Handoff Requirements

- Summary of UI, service, storage, and playback changes.
- Test commands run.
- Recording fixtures used.
- Persistence checks performed by implementer.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Real browser E2E evidence.
- Recording artifact decode evidence.
- Playback evidence.
- Delete persistence evidence.
- Bad audio evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This module is complete only when:

- All acceptance criteria pass.
- Real browser E2E covers the review path.
- Real decodable audio artifact is verified.
- Playback, delete, search, filter, and Practice Again are verified.
- Delete persistence is verified after reload.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- Recording comparison.
- Multi-take management.
- Bar-level navigation.
- Automatic scoring.
- Automatic timing analysis.
- Cloud backup.
- Tags.
- Favorites.
- Archive.
- Audio export.
- Review grouped by sheet, segment, or date.
- Reference-to-recording comparison.

Do not implement these in v0.
