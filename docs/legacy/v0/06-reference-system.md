# Reference System

## Purpose

This module lets the user attach a minimal reference source to a sheet in Sheet Practice. v0 references are for simple play/pause follow-along, not synchronization or analysis.

It must prove that local audio references are real playable artifacts and that Bilibili references can be found or added through a real user flow, saved, and shown again after reload.

## User Value

- The user can practice with a simple local audio reference.
- The user can search for a Bilibili video and save it as a reference.
- The user can paste a Bilibili link when search is not needed.
- The user can play or pause the active reference while practicing.
- The reference remains attached to the sheet later.

## v0 Scope

- Reference panel or drawer in Sheet Practice.
- Add local audio reference.
- Add Bilibili reference by URL.
- Search Bilibili videos through the app.
- Select a Bilibili search result as the sheet reference.
- Display active reference.
- Play and pause local audio reference.
- Display Bilibili embed or usable video link.
- Basic volume control for local audio when available.
- Save reference association with sheetId.
- Reload persisted references.
- Error state for invalid link, failed search, bad audio, or unavailable embed.

## Out of Scope for v0

- A-B loop.
- Playback speed control.
- Manual offset alignment.
- Reference-to-recording waveform comparison.
- Precise start and end segment binding.
- Automatic reference synchronization.
- Bilibili download.
- Bilibili audio extraction.
- Reference audio analysis.

## User Paths

```text
Open Sheet Practice
  -> Add local audio reference
  -> Play local reference
  -> Pause local reference
  -> Adjust volume
  -> Refresh
  -> See the reference still attached to the sheet
```

```text
Open Sheet Practice
  -> Search Bilibili by keyword
  -> See video results
  -> Select one result
  -> Save it as reference
  -> See Bilibili reference in the panel
  -> Refresh
  -> See the selected video reference still attached to the sheet
```

```text
Open Sheet Practice
  -> Paste Bilibili link
  -> Save it as reference
  -> See embed or usable video link
```

## Product Decisions

- Reference is secondary to the sheet and practice controls.
- Local audio is the more important v0 reference source.
- Bilibili is a lightweight watching and follow-along reference.
- v0 supports Bilibili search, but only enough to select and save a reference.
- v0 does not download Bilibili videos or extract audio.
- v0 does not require precise sync.
- Reference playback can trigger sheet session activity.
- Reference play/pause must not implicitly start or stop metronome or recording.

## Data Boundary

This module creates:

- Reference metadata linked to sheetId.
- Local audio artifact or local copy when possible.
- Bilibili reference metadata from URL or selected search result.

This module reads:

- Active sheetId.
- Existing references for the sheet.
- Local audio artifact.
- Bilibili search results.

This module updates:

- Active reference selection.
- Local reference playback state.
- Local reference volume.

This module must not create:

- Recordings.
- Error markers.
- Practice Segments.
- Extracted Bilibili audio.
- Analysis results.

## State Boundary

Module-owned state:

- Reference panel state.
- Local audio upload state.
- Bilibili URL input state.
- Bilibili search query.
- Bilibili search loading/error/results state.
- Active reference.
- Local reference playback state.
- Local reference volume.

Shared state:

- Active sheetId.
- Sheet session activity trigger.
- Global playback state.
- Metronome and recording states for independence checks.

## Architecture Boundary

The UI may call reference, local audio playback, Bilibili search, embed, and persistence services.

The UI must not directly call:

- IndexedDB / Dexie.
- Raw file storage APIs.
- Bilibili network/API internals.
- Audio element internals as source of truth.
- Media download or extraction logic.

Bilibili search must sit behind an adapter so tests can use deterministic search fixtures.

## Dependencies

- `05-sheet-practice` for Sheet Practice placement.
- `05e-session-integration` for reference playback session activity.
- Local Data for persisted references and local audio artifacts.

## Acceptance Criteria

- [ ] The user can add a local audio reference to the current sheet.
- [ ] Local audio reference uses a real decodable audio artifact.
- [ ] The user can play and pause local audio.
- [ ] Local audio playback uses the real artifact.
- [ ] Basic volume control affects local audio playback.
- [ ] The user can search Bilibili by keyword through the UI.
- [ ] Bilibili search shows selectable results.
- [ ] The user can select a Bilibili result and save it as reference.
- [ ] Selected Bilibili reference stores enough metadata to display or reopen it.
- [ ] The user can paste a Bilibili URL and save it as reference.
- [ ] Invalid Bilibili URL shows a clear error state.
- [ ] Failed Bilibili search shows a clear error state.
- [ ] Reference metadata is linked to sheetId.
- [ ] Reference persists after refresh or reload.
- [ ] Reference playback or viewing does not stop active recording.
- [ ] Reference playback or viewing does not stop active metronome.
- [ ] Reference playback can trigger sheet session activity.
- [ ] Resize keeps the reference panel or drawer usable without blocking core controls.
- [ ] No A-B loop, playback speed, offset, download, extraction, or analysis behavior appears in v0.

## Test Plan

### Unit Tests

- Reference type validation.
- Local audio file type validation.
- Bilibili URL parsing and validation.
- Bilibili search result normalization.
- Volume clamp.
- sheetId binding.
- Reference persistence payload creation.

### Integration Tests

- Add local audio and save metadata plus artifact.
- Decode local audio artifact.
- Play/pause service receives real local audio artifact.
- Volume changes propagate to playback service.
- Search Bilibili through search adapter and normalize results.
- Select Bilibili result and save metadata.
- Paste Bilibili URL and save metadata.
- Reload references by sheetId.
- Bad audio returns error.
- Invalid Bilibili URL returns error.
- Failed Bilibili search returns error.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Open Sheet Practice for a real or seeded sheet.
- Add a real local audio fixture.
- Play local audio and verify playback currentTime advances.
- Pause local audio and verify playback stops advancing beyond tolerance.
- Change volume and verify service or media state reflects the new volume.
- Refresh and verify local reference still exists and can play.
- Search Bilibili by keyword through the visible search field.
- Use deterministic Bilibili search fixture or test adapter results for automated E2E.
- Select a visible Bilibili result.
- Save it as the sheet reference.
- Verify selected Bilibili metadata or embed/link is visible.
- Refresh and verify the selected Bilibili reference remains attached to the sheet.
- Paste a Bilibili URL and verify it can be saved.
- Enter invalid Bilibili URL and verify error state.
- Trigger failed search fixture and verify error state.
- While recording is active, play/pause reference and verify recording remains active.
- While metronome is active, play/pause reference and verify metronome remains active.
- Resize browser from desktop to narrow mobile and verify reference panel/drawer remains usable.
- Check browser console errors during the tested flows.

Optional non-blocking smoke check when network is available:

- Search a real Bilibili query against the live adapter.
- Select a result.
- Verify metadata shape and embed/link target.

The live smoke check must not be required for deterministic CI or verifier PASS because external network and third-party behavior can be unstable.

### Manual QA

- Confirm the reference panel feels secondary to the sheet.
- Confirm Bilibili result titles do not break layout.
- Confirm mobile drawer/panel remains usable.
- Confirm errors are understandable.

### Specialized Verification

#### Local Audio Verification

The verifier must use a real short audio fixture and check:

- Audio decodes successfully.
- Duration is reasonable.
- RMS energy is non-zero.
- Playback currentTime advances while playing.
- Playback currentTime stops advancing after pause within documented tolerance.
- Volume change reaches playback service or media state.

#### Bilibili Search Verification

Automated E2E must test search through the visible UI using a deterministic Bilibili search adapter or fixture.

The verifier must check:

- Query is submitted through UI.
- Results are rendered from the adapter response.
- A result can be selected through UI.
- Selected result metadata is saved.
- Saved reference reloads by sheetId.
- Invalid and failed-search states are handled.

The verifier must not accept a hardcoded fake card that bypasses the search flow.

#### Independence Verification

The verifier must check:

- Reference play/pause does not stop active recording.
- Reference play/pause does not stop active metronome.
- Reference playback can trigger session activity without coupling transports.

#### Layout Resize Verification

The verifier must check:

- Desktop viewport.
- Tablet-like or iPad landscape viewport.
- Narrow mobile viewport.
- Resize while reference panel is open.
- Resize while local audio is playing.
- No incoherent overlap with sheet viewer or bottom controls.

## QA Checklist

- [ ] Real browser E2E testing was performed.
- [ ] Real local audio fixture was decoded and played.
- [ ] Local audio play/pause was verified beyond button state.
- [ ] Volume behavior was verified.
- [ ] Bilibili search was performed through visible UI.
- [ ] Bilibili result selection was tested through visible UI.
- [ ] Bilibili reference persisted after reload.
- [ ] Paste URL flow was tested.
- [ ] Invalid URL and failed search states were tested.
- [ ] Reference/metronome/recording independence was tested.
- [ ] Resize behavior was tested.
- [ ] No console errors appeared during tested flows.

## Failure / Edge Cases

- No sheetId: block reference save.
- Bad local audio: show error and do not save as playable reference.
- Local audio decode fails: show error.
- Invalid Bilibili URL: show error and do not save.
- Bilibili search fails: show error and keep query state.
- Bilibili result missing required metadata: disable save or show error.
- Embed blocked or unavailable: show usable fallback link.
- Storage quota failure: show clear error.
- Reference panel resize: keep controls usable.

## Implementation Contract

The implementation agent may build:

- Reference panel or drawer.
- Local audio reference upload and playback.
- Bilibili URL save flow.
- Bilibili search UI.
- Bilibili search adapter boundary.
- Select-search-result flow.
- Reference persistence linked to sheetId.
- Basic volume control.
- Error states.
- Test fixtures for local audio and deterministic Bilibili search.

The implementation agent must not build:

- A-B loop.
- Playback speed.
- Manual offset.
- Waveform comparison.
- Bilibili download.
- Bilibili audio extraction.
- Reference audio analysis.
- Hardcoded search result cards that bypass search adapter behavior.

Implementation handoff must include:

- Reference UI, local audio, Bilibili search, adapter, and persistence areas changed.
- Tests run.
- Local audio fixture used.
- Bilibili search fixture used.
- Persistence checks performed.
- Independence checks performed.
- Known limitations or risks.

## Verification Contract

The verification agent must:

- Be a separate agent pass from the implementation agent.
- Run relevant automated tests.
- Use real browser interaction for local audio, Bilibili search, result selection, URL paste, reload, resize, and error flows.
- Verify local audio decode/play/pause/volume with a real fixture.
- Verify Bilibili search through a visible UI using deterministic adapter results.
- Verify selected Bilibili result persists by sheetId.
- Verify invalid URL and failed-search states.
- Verify reference play/pause does not stop metronome or recording.
- Check browser console errors.

The verifier must report FAIL if local audio is metadata-only, if Bilibili result selection bypasses the search UI, if references do not persist after reload, or if E2E interaction is skipped.

## Implementation Handoff Requirements

- Summary of reference UI, adapter, playback, and persistence changes.
- Test commands run.
- Local audio fixture details.
- Bilibili search fixture details.
- Persistence checks performed.
- Independence checks performed.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Real browser E2E evidence.
- Local audio decode/playback evidence.
- Bilibili search and selection evidence.
- URL paste evidence.
- Persistence reload evidence.
- Independence evidence.
- Resize evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This module is complete only when:

- All acceptance criteria pass.
- Real browser E2E covers local audio and Bilibili search paths.
- Local audio artifact is decoded and playback is verified.
- Bilibili search, selection, and persistence are verified.
- Reference persistence by sheetId is verified after reload.
- Independence from metronome and recording is verified.
- Resize behavior is verified.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- A-B loop.
- Playback speed control.
- Manual offset alignment.
- Reference waveform display.
- Reference-to-recording waveform comparison.
- Precise start and end segment binding.
- Reference source attached to Practice Segment.
- Optional beat sync between reference audio and user recording.
- Richer Bilibili metadata.
- Reference audio analysis experiments.

Do not implement these in v0.
