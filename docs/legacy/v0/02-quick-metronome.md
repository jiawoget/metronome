# Quick Metronome

## Purpose

This module creates the first real v0 practice loop: open the metronome, set tempo and meter, play, record, stop, replay, and save a quick practice recording.

It must prove that the app can produce timed metronome audio and capture real recording output. Button state changes are not enough.

## User Value

- The user can start practicing immediately without choosing a sheet.
- The user can adjust tempo and meter.
- The user can record a quick practice take.
- The user can replay the recording after stopping.
- The recording can later be found in the unified recordings system.

## v0 Scope

- Quick Metronome page.
- BPM adjustment.
- Time signature.
- Subdivision.
- Accent setting.
- Countdown.
- Play and stop.
- Tap Tempo.
- Start recording.
- Stop recording.
- Replay latest recording.
- Create a Practice Session.
- Create a Recording with type `quick`.
- Keep quick recordings unlinked from sheets.
- Recent recording entry or minimal route to review the latest quick recording.

## Out of Scope for v0

- Auto Increase.
- Mute Training.
- Complex rhythm patterns.
- Custom metronome sounds.
- Preset practice templates.
- Practice plans.
- Automatic rhythm analysis.
- Automatic scoring.

## User Paths

```text
Open Quick Metronome
  -> Adjust BPM
  -> Adjust time signature, subdivision, accent, or countdown
  -> Start the metronome
  -> Stop the metronome
```

```text
Open Quick Metronome
  -> Start recording
  -> Practice against a controlled audio input
  -> Stop recording
  -> Replay the recording
  -> See the recording saved as a quick recording
```

```text
Open Quick Metronome
  -> Tap tempo several times
  -> See BPM update from tap timing
```

## Product Decisions

- Quick recordings do not need to be linked to a sheet.
- Quick recordings should appear in the same recordings system as sheet recordings.
- Recording type should distinguish `quick` and `sheet`.
- Quick Metronome and Sheet Practice should reuse metronome, recording, playback, and history foundations.
- Tap Tempo is part of v0.
- Auto Increase and Mute Training are v1.
- Metronome playback and recording are independent controls.
- Recording can start with or without the metronome playing.
- Metronome playback can start with or without recording active.
- Stopping the metronome must not stop recording unless the user explicitly stops recording.
- Stopping recording must not stop the metronome unless the user explicitly stops the metronome.

## Data Boundary

This module creates:

- Practice Session with sourceType `quick`.
- Recording with type `quick`.
- Recording audio file or blob.
- Recording metadata.

This module reads:

- Default BPM.
- Default time signature.
- Default subdivision.
- Metronome volume.
- Recording permission status.

This module must not create:

- Sheet.
- Sheet-linked recording.
- Practice Segment.
- v1 analysis result.

## State Boundary

Module-owned state:

- BPM.
- Time signature.
- Subdivision.
- Accent.
- Countdown.
- Tap tempo buffer.
- Current transport state.
- Recording state.
- Latest quick recording state.

Shared state:

- Global playback or recording status.
- Practice Session state.
- Recording persistence state.
- User settings defaults.

## Architecture Boundary

The UI may call metronome, recording, playback, session, and recording-history services.

The UI must not directly call:

- Tone.js.
- Web Audio low-level scheduler APIs.
- MediaRecorder.
- IndexedDB / Dexie.
- wavesurfer.js.

Metronome timing and recording capture must sit behind service or adapter boundaries.

## Dependencies

- App Shell / Home for route access.
- Practice Session for session creation.
- Local Data for saving recording metadata and audio.
- Recordings / Review for later full review behavior.

Phase 1 may provide a minimal latest-recording outlet before the full Recordings module is implemented.

## Acceptance Criteria

- [ ] The user can open Quick Metronome.
- [ ] The user can adjust BPM.
- [ ] The user can adjust time signature.
- [ ] The user can adjust subdivision.
- [ ] The user can adjust accent.
- [ ] The user can set countdown.
- [ ] Tap Tempo updates BPM from tap timing.
- [ ] The user can start and stop the metronome.
- [ ] Metronome audio timing matches the selected BPM within the approved tolerance.
- [ ] Metronome timing changes after BPM is adjusted.
- [ ] Metronome accent behavior reflects the selected meter/accent setting.
- [ ] The UI clearly shows playing and stopped states.
- [ ] The user can start recording.
- [ ] The user can stop recording.
- [ ] Recording can start while the metronome is stopped.
- [ ] Metronome playback can start while recording is active.
- [ ] Stopping the metronome does not stop active recording.
- [ ] Stopping recording does not stop active metronome playback.
- [ ] Recording tests use a controlled synthetic audio input.
- [ ] Stopping recording creates a non-empty recording artifact.
- [ ] The recorded artifact contains the expected synthetic input without obvious truncation or corruption.
- [ ] Recording type is `quick`.
- [ ] Recording is linked to a Practice Session.
- [ ] Recording is not linked to a sheet.
- [ ] The user can replay the latest recording.
- [ ] The recording is visible through the latest-recording outlet or Recordings route.
- [ ] Recording metadata persists after refresh or reload.
- [ ] Microphone permission denial shows a clear error state.
- [ ] No fake playback, fake recording, or stub-only behavior is accepted.

## Test Plan

### Unit Tests

- BPM min, max, and step behavior.
- Time signature validation.
- Subdivision selection.
- Accent selection.
- Countdown state transitions.
- Tap Tempo BPM calculation from deterministic tap intervals.
- Practice Session metadata creation for quick practice.
- Recording metadata creation with type `quick` and no sheetId.

### Integration Tests

- Start metronome calls the metronome service and enters playing state.
- Stop metronome calls the metronome service and enters stopped state.
- BPM changes are propagated to the metronome service.
- Time signature and accent changes are propagated to the metronome service.
- Start recording creates or resumes a quick Practice Session.
- Stop recording creates a Recording linked to that session.
- Starting recording while metronome is stopped leaves metronome stopped.
- Starting metronome while recording is active keeps recording active.
- Stopping metronome while recording is active keeps recording active.
- Stopping recording while metronome is playing keeps metronome playing.
- Recording is saved through the local data boundary.
- Permission denial from the recording adapter produces visible error state.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Open Quick Metronome from Home.
- Click BPM controls and verify visible BPM changes.
- Change time signature, subdivision, accent, and countdown through visible controls.
- Tap the Tap Tempo control several times and verify BPM changes.
- Click Play and verify visible playing state.
- Click Stop and verify visible stopped state.
- Start recording using browser interaction.
- Feed or provide controlled synthetic audio input during recording.
- Stop recording.
- Verify a latest recording appears.
- Replay the latest recording through visible controls.
- Navigate to the latest-recording outlet or Recordings route and verify the quick recording is visible.
- Reload the page and verify recording metadata still exists.
- Check browser console errors during the flow.
- Repeat independence checks through browser interaction:
  - record without metronome,
  - start metronome during recording,
  - stop metronome while recording continues,
  - stop recording while metronome continues.

### Manual QA

- Confirm controls remain usable on desktop and mobile.
- Confirm recording permission messaging is understandable.
- Confirm playback and recording states are visually distinct.

### Specialized Verification

#### Synthetic Recording Input

Recording verification must use a deterministic audio source, such as:

- Browser fake microphone audio file.
- Web Audio oscillator routed through a test media stream.
- A generated tone sequence with known frequency and duration.

The verifier must decode or inspect the recorded artifact and check:

- The artifact is non-empty.
- Duration is within tolerance of the requested recording window.
- RMS energy is present.
- Dominant frequency or tone pattern resembles the synthetic input.
- Start and end are not obviously truncated beyond tolerance.
- The output is not silence.

#### Metronome Timing Accuracy

Metronome verification must inspect real generated timing, using one or more of:

- Offline rendered metronome audio.
- Captured click buffer from a test metronome adapter.
- Deterministic scheduler trace from the metronome service.

The verifier must check:

- Click intervals match BPM within tolerance.
- BPM changes produce changed click intervals.
- Time signature changes produce the expected accent cycle.
- Subdivision changes produce the expected click density.
- Start and stop do not leave stray scheduled clicks after stop.

Suggested tolerance should be defined by implementation, but must be strict enough to catch visibly or audibly wrong tempo. The verifier must document the tolerance used.

## QA Checklist

- [ ] Real browser E2E testing was performed.
- [ ] BPM, meter, subdivision, accent, countdown, and Tap Tempo were interacted with through the UI.
- [ ] Metronome timing was verified beyond UI state.
- [ ] BPM adjustment was verified to change generated timing.
- [ ] Recording used controlled synthetic audio input.
- [ ] Recorded output was inspected for duration, energy, and expected signal.
- [ ] Latest recording was replayed through the UI.
- [ ] Quick recording persisted after reload.
- [ ] No quick recording was linked to a sheet.
- [ ] No console errors appeared during tested flows.

## Failure / Edge Cases

- Microphone permission denied: show clear error and do not create a fake recording.
- Recording produces silence: fail verification unless the synthetic input was actually silent.
- Recording stops too early or too late: fail if outside documented tolerance.
- BPM changes while playing: timing should update according to the selected behavior.
- Stop is clicked while recording: the app should leave recording and transport state clear.
- Metronome and recording controls are independent: stopping one must not implicitly stop the other.
- Page reload after recording: metadata should persist.
- No Recordings module yet: latest-recording outlet must still show the created quick recording.

## Implementation Contract

The implementation agent may build:

- Quick Metronome UI.
- Metronome service integration.
- Recording service integration.
- Playback of the latest recording.
- Quick Practice Session creation.
- Quick Recording creation.
- Minimal latest-recording outlet if full Recordings is not available.
- Test adapters or fixtures needed for deterministic audio verification.

The implementation agent must not build:

- Auto Increase.
- Mute Training.
- Complex rhythm patterns.
- Custom sound packs.
- Practice plans.
- Automatic scoring.
- Sheet-linked quick recordings.
- Fake recordings created only from metadata.

Implementation handoff must include:

- Metronome service and adapter areas changed.
- Recording service and adapter areas changed.
- Session and recording persistence areas changed.
- Audio timing tests run.
- Synthetic recording tests run.
- Real browser E2E checks run by the implementer.
- Known browser or permission limitations.

## Verification Contract

The verification agent must:

- Run relevant automated tests.
- Use real browser interaction for the user path.
- Verify metronome timing through audio render, scheduler trace, or test adapter evidence.
- Verify BPM changes affect generated timing.
- Verify accent and subdivision behavior.
- Verify metronome and recording independence rules.
- Record from controlled synthetic audio input.
- Inspect the recorded artifact for non-empty signal, expected duration, expected energy, and expected tone or pattern.
- Verify recording metadata persists after reload.
- Verify the quick recording is not linked to a sheet.
- Check browser console errors.

The verifier must report FAIL if recording is metadata-only, if metronome timing is not inspected, if synthetic input is not verified in the output, or if E2E interaction is skipped.

The verification agent must be a separate agent pass from the implementation agent.

## Implementation Handoff Requirements

- Summary of UI, service, adapter, and persistence changes.
- Test commands run.
- Metronome timing evidence from implementer self-test.
- Synthetic recording evidence from implementer self-test.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Real browser E2E evidence.
- Metronome timing evidence and tolerance used.
- Synthetic recording input/output evidence.
- Persistence reload evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This module is complete only when:

- All acceptance criteria pass.
- Real browser E2E covers the full quick practice path.
- Metronome timing evidence is provided.
- Synthetic recording input is captured and verified in the output.
- Recording metadata persists.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- Auto Increase.
- Mute Training.
- Complex rhythm patterns.
- Custom metronome sounds.
- Preset practice templates.
- Practice plans.
- Tempo progress tracking.
- Warmup routines.
- Advanced countdown options.

Do not implement these in v0.
