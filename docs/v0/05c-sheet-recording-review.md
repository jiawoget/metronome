# Sheet Recording / Review

## Purpose

This submodule lets the user record a sheet-linked take inside Sheet Practice, replay the latest take, and see a basic waveform.

It must prove that recording artifacts are real, sheet/session-linked, replayable, and that waveform rendering is stable and derived from audio data.

## User Value

- The user can record while practicing a sheet.
- The user can record with or without the metronome.
- The user can replay the latest take immediately.
- The user can see a stable visual waveform for feedback.
- The recording is saved for later review.

## v0 Scope

- Recording button in Sheet Practice.
- Stop recording.
- Recording state display.
- Create recording with type `sheet`.
- Link recording to active sheetId.
- Link recording to active sessionId.
- Replay latest sheet recording.
- Basic waveform for latest recording.
- Recording error state.
- Microphone permission error state.
- Bad recording artifact error state.

## Out of Scope for v0

- Multi-take management.
- Active take selection.
- Recording comparison.
- Reference-to-recording comparison.
- Audio export.
- Automatic timing analysis.
- Automatic scoring.
- Error marker creation.
- Segment re-recording.

## User Paths

```text
Open Sheet Practice
  -> Start recording without metronome
  -> Stop recording
  -> Replay latest recording
  -> See stable waveform
```

```text
Open Sheet Practice
  -> Start metronome
  -> Start recording
  -> Stop metronome while recording continues
  -> Stop recording
  -> Replay latest recording
```

```text
Open Sheet Practice after recording
  -> Reload
  -> See latest recording metadata still available
  -> Open Recordings later and find the sheet recording
```

## Product Decisions

- Recording can start while metronome is stopped.
- Recording can start while metronome is playing.
- Stopping recording must not stop metronome.
- Stopping metronome must not stop recording.
- Sheet recording must link to sheetId and sessionId.
- The latest recording can be replayed inside Sheet Practice.
- Waveform is basic feedback in v0, not detailed analysis.

## Data Boundary

This module creates:

- Recording metadata with type `sheet`.
- Recording audio artifact.
- Latest sheet recording state.

This module updates:

- Recording playback state.
- Basic waveform or peaks for the latest recording.

This module reads:

- Active sheetId.
- Active sessionId.
- Current metronome state for independence checks.
- Recording permission status.

This module must not create:

- Error markers.
- Practice Segments.
- Reference sources.
- Analysis scores.

## State Boundary

Module-owned state:

- Recording idle/active/stopping/error state.
- Latest recording state.
- Playback state for latest recording.
- Waveform loading/ready/error state.

Shared state:

- Active sheet context.
- Active sheet Practice Session.
- Global recording status.
- Global playback status.
- Metronome state for independence behavior.

## Architecture Boundary

The UI may call recording, playback, waveform, and persistence services.

The UI must not directly call:

- MediaRecorder.
- wavesurfer.js.
- Raw Web Audio APIs.
- IndexedDB / Dexie.
- File storage internals.

Recording capture and waveform generation must sit behind service or adapter boundaries.

## Dependencies

- `05a-sheet-viewer` for Sheet Practice context.
- `05e-session-integration` for active sessionId.
- `05b-practice-controls` for metronome independence integration.
- `03-recordings-review` for later full review visibility.
- Local Data for recording metadata and artifact persistence.

## Acceptance Criteria

- [ ] The user can start recording in Sheet Practice.
- [ ] The user can stop recording.
- [ ] Recording can start while metronome is stopped.
- [ ] Recording can start while metronome is playing.
- [ ] Stopping recording does not stop active metronome playback.
- [ ] Stopping metronome does not stop active recording.
- [ ] Stopping recording creates a non-empty recording artifact.
- [ ] Recording tests use a controlled synthetic audio input.
- [ ] The recorded artifact contains the expected synthetic input without obvious truncation or corruption.
- [ ] Recording type is `sheet`.
- [ ] Recording sheetId matches the active sheet.
- [ ] Recording sessionId matches the active sheet session.
- [ ] The user can replay the latest recording.
- [ ] Replay uses the real recording artifact.
- [ ] Waveform is based on real audio data or trusted peaks derived from the artifact.
- [ ] Waveform peaks are non-empty and contain non-zero finite values.
- [ ] Waveform remains visible and non-empty after initial render.
- [ ] Waveform remains stable through play/pause.
- [ ] Waveform remains stable after resize.
- [ ] Waveform does not flash to blank during repeated samples.
- [ ] Recording metadata persists after refresh or reload.
- [ ] Sheet recording can be found through Recordings or a verified latest-recording outlet.
- [ ] Microphone permission denial shows a clear error state.
- [ ] Bad recording artifact shows a clear error state.
- [ ] No fake recording, fake playback, or fake waveform is accepted.

## Test Plan

### Unit Tests

- Recording state transitions.
- Recording metadata creation with type `sheet`.
- sheetId binding.
- sessionId binding.
- Playback state transitions.
- Waveform state transitions.
- Peak data validation helper: non-empty, finite, non-zero.
- Recording/metronome independence state rules.

### Integration Tests

- Start recording creates or uses active sheet session.
- Stop recording saves recording metadata and artifact.
- Recording metadata includes type `sheet`, sheetId, and sessionId.
- Replay loads the saved artifact.
- Waveform generation uses the recording artifact.
- Bad artifact produces waveform/playback error.
- Recording-only flow keeps metronome stopped.
- Stopping metronome during recording keeps recording active.
- Stopping recording during metronome keeps metronome active.
- Recording persists and is visible through recording history boundary.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Import or seed a real sheet.
- Open Sheet Practice.
- Start recording while metronome is stopped.
- Feed controlled synthetic audio input.
- Stop recording.
- Verify recording metadata has type `sheet`, sheetId, and sessionId.
- Replay latest recording through visible controls.
- Verify waveform appears.
- Sample waveform state repeatedly over a short interval and verify it does not become blank.
- Click play and pause and verify waveform remains stable.
- Resize browser from desktop to narrow mobile and verify waveform remains stable and controls usable.
- Reload and verify recording metadata remains available.
- Verify recording appears through Recordings or latest-recording outlet.
- Start metronome, then start recording.
- Stop metronome while recording continues.
- Stop recording and verify metronome independence.
- Test microphone permission denial.
- Seed bad recording artifact and verify error state.
- Check browser console errors during the tested flows.

### Manual QA

- Confirm recording and playback states are visually clear.
- Confirm waveform does not visibly flash or disappear.
- Confirm controls remain usable on desktop and mobile.
- Confirm permission error copy is understandable.

### Specialized Verification

#### Synthetic Recording Input

Recording verification must use a deterministic audio source, such as:

- Browser fake microphone audio file.
- Web Audio oscillator routed through a test media stream.
- A generated tone sequence with known frequency and duration.

The verifier must decode or inspect the recorded artifact and check:

- Artifact is non-empty.
- Duration is within tolerance of the requested recording window.
- RMS energy is present.
- Dominant frequency or tone pattern resembles the synthetic input.
- Start and end are not obviously truncated beyond tolerance.
- Output is not silence.

#### Waveform Data Verification

The verifier must inspect waveform data, not only screenshots.

The verifier must check:

- Peaks or waveform samples exist.
- Peak length is above a documented minimum threshold.
- Peaks contain non-zero energy.
- Peaks contain only finite values.
- A reasonable number of adjacent windows contain signal continuity.
- Recomputing or reloading peaks for the same artifact is stable within documented tolerance.

#### Waveform Render Stability

The verifier must repeatedly sample rendered waveform state.

If rendered with canvas, check:

- Non-background pixel count is above a documented threshold.
- Multiple samples over time do not drop to zero non-background pixels.
- Resize does not produce a blank waveform.

If rendered with SVG or DOM bars, check:

- Path/bar count remains above a documented threshold.
- Non-zero height or visible elements remain above a documented threshold.
- Multiple samples over time do not drop to zero visible waveform elements.
- Resize does not produce a blank waveform.

Required stability checks:

- Immediately after recording.
- After a short wait.
- During playback.
- After pause.
- After browser resize.
- After reload when waveform is reconstructed.

#### Independence Verification

The verifier must check:

- Recording only: metronome remains stopped.
- Metronome then recording: both can be active.
- Stop metronome during recording: recording continues.
- Stop recording during metronome: metronome continues if it was playing.

## QA Checklist

- [ ] Real browser E2E testing was performed.
- [ ] Controlled synthetic audio input was used.
- [ ] Recorded output was decoded or inspected.
- [ ] Recording type, sheetId, and sessionId were verified.
- [ ] Replay used the real artifact.
- [ ] Waveform data was inspected, not only screenshot.
- [ ] Waveform render stability was sampled repeatedly.
- [ ] Resize behavior was tested.
- [ ] Recording/metronome independence was tested.
- [ ] Recording persistence after reload was tested.
- [ ] Bad recording artifact state was tested.
- [ ] No console errors appeared during tested flows.

## Failure / Edge Cases

- Microphone permission denied: show clear error and do not create fake recording.
- Recording produces silence: fail unless synthetic input was silent.
- Recording stops too early or too late: fail if outside documented tolerance.
- Missing sheetId or sessionId: do not save invalid sheet recording.
- Bad recording artifact: show error and do not fake playback or waveform.
- Waveform peaks invalid: show waveform error rather than blank success.
- Waveform flashes blank: fail verification.
- Resize during waveform display: keep waveform visible and controls usable.
- Storage failure: show clear error and do not claim recording saved.

## Implementation Contract

The implementation agent may build:

- Sheet recording controls.
- Recording service integration.
- Latest recording replay.
- Waveform generation/display integration.
- Recording metadata persistence with sheetId and sessionId.
- Error states for permission and bad artifacts.
- Test fixtures or adapters for synthetic recording and waveform stability verification.

The implementation agent must not build:

- Error marker creation.
- Multi-take management.
- Recording comparison.
- Audio export.
- Automatic scoring.
- Reference comparison.
- Fake waveform display.
- Metadata-only recordings.

Implementation handoff must include:

- Recording, playback, waveform, and persistence areas changed.
- Tests run.
- Synthetic audio fixture used.
- Waveform data and stability self-test evidence.
- Independence cases tested.
- Known limitations or risks.

## Verification Contract

The verification agent must:

- Be a separate agent pass from the implementation agent.
- Run relevant automated tests.
- Use real browser interaction for recording, replay, waveform, resize, and error flows.
- Record from controlled synthetic audio input.
- Inspect the recorded artifact for non-empty signal, expected duration, expected energy, and expected tone or pattern.
- Verify recording metadata has type `sheet`, sheetId, and sessionId.
- Verify replay uses the real artifact.
- Inspect waveform data.
- Repeatedly sample waveform rendering to detect blank flashes.
- Resize the browser and verify waveform and controls remain usable.
- Verify recording/metronome independence.
- Verify persistence after reload.
- Check browser console errors.

The verifier must report FAIL if recording is metadata-only, if waveform is screenshot-only verified, if waveform flashes blank, if sheetId/sessionId are missing, or if E2E interaction is skipped.

## Implementation Handoff Requirements

- Summary of recording, playback, waveform, and persistence changes.
- Test commands run.
- Synthetic input details.
- Recording artifact evidence from implementer self-test.
- Waveform data and stability evidence.
- Resize checks performed.
- Independence checks performed.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Real browser E2E evidence.
- Synthetic input/output recording evidence.
- Metadata link evidence: type, sheetId, sessionId.
- Replay evidence.
- Waveform data evidence.
- Waveform multi-sample stability evidence.
- Resize evidence.
- Persistence reload evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This module is complete only when:

- All acceptance criteria pass.
- Real browser E2E covers recording, replay, waveform, and resize.
- Synthetic recording input is captured and verified in the output.
- Recording is linked to sheetId and sessionId.
- Waveform data is verified.
- Waveform render stability is verified across repeated samples.
- Recording persistence is verified after reload.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- Multi-take management.
- Active take selection.
- Recording comparison.
- Reference-to-recording comparison.
- Audio export.
- Automatic timing analysis.
- Automatic scoring.
- Segment re-recording.

Do not implement these in v0.
