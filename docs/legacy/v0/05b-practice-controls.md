# Sheet Practice Controls

## Purpose

This submodule provides the bottom practice controls and metronome settings inside Sheet Practice. It lets the user control tempo and metronome playback while viewing a sheet.

It must reuse the metronome foundation from Quick Metronome and must not couple metronome playback to recording.

## User Value

- The user can practice a sheet with a metronome.
- The user can start and stop the metronome without leaving the sheet.
- The user can adjust BPM, meter, subdivision, and accent for the current practice context.
- The controls remain usable across desktop and mobile layouts.

## v0 Scope

- Bottom practice controls in Sheet Practice.
- Metronome play and stop.
- BPM setting.
- Time signature setting.
- Basic subdivision setting.
- Basic accent setting.
- Countdown if the shared Quick Metronome logic makes it available.
- Side panel or settings area for detailed metronome settings.
- Playing and stopped state display.
- Initialize from sheet default BPM and time signature.
- Trigger sheet session activity when metronome starts.
- Preserve independence from recording controls.

## Out of Scope for v0

- Auto Increase.
- Mute Training.
- Complex rhythm patterns.
- Custom metronome sounds.
- Practice templates.
- Reference playback controls.
- Recording audio capture.
- Error marker creation.
- Segment-level tempo.
- Bar-aware count-in.

## User Paths

```text
Open a sheet in Sheet Practice
  -> See bottom practice controls
  -> Confirm BPM and time signature initialize from sheet defaults
  -> Start metronome
  -> Stop metronome
```

```text
Open Sheet Practice
  -> Change BPM, meter, subdivision, or accent
  -> Start metronome
  -> Hear or verify timing for the selected settings
```

```text
Open Sheet Practice
  -> Start recording in another submodule
  -> Start or stop metronome
  -> Recording remains independent
```

## Product Decisions

- Bottom basic controls should remain available in Sheet Practice.
- Detailed metronome settings can live in a side panel.
- Sheet Practice and Quick Metronome should reuse the same metronome foundation.
- Recording and metronome playback are independent controls.
- Sheet default BPM and time signature initialize controls.
- User changes affect the current practice context.
- Starting metronome counts as practice activity and triggers sheet session integration.
- Starting metronome alone must not create a recording.

## Data Boundary

This module reads:

- Active sheet default BPM.
- Active sheet default time signature.
- User default metronome settings when sheet values are missing.
- Current recording activity state only for independence checks.

This module updates:

- Current practice BPM.
- Current practice time signature.
- Current subdivision.
- Current accent setting.
- Metronome playback state.
- Practice activity trigger for session integration.

This module must not create:

- Recording artifacts.
- Recording metadata.
- Error markers.
- Reference sources.
- Practice Segments.

## State Boundary

Module-owned state:

- BPM.
- Time signature.
- Subdivision.
- Accent.
- Countdown if included.
- Metronome playing/stopped state.
- Settings panel state if needed.

Shared state:

- Active sheet metadata.
- Sheet practice session activity trigger.
- Global playback state.
- Recording active state for independence behavior.

## Architecture Boundary

The UI may call metronome and session activity services or hooks.

The UI must not directly call:

- Tone.js.
- Web Audio scheduler internals.
- MediaRecorder.
- Recording adapter internals.
- IndexedDB / Dexie.

Metronome timing must sit behind a service or adapter boundary.

## Dependencies

- `05a-sheet-viewer` for integrated layout context.
- `05e-session-integration` for session activity trigger.
- `02-quick-metronome` metronome foundation and timing expectations.
- `05c-sheet-recording-review` for recording independence integration.

## Acceptance Criteria

- [ ] Sheet Practice displays bottom practice controls.
- [ ] Controls initialize from sheet default BPM when available.
- [ ] Controls initialize from sheet default time signature when available.
- [ ] The user can modify BPM.
- [ ] The user can modify time signature.
- [ ] The user can modify subdivision.
- [ ] The user can modify accent.
- [ ] The user can start and stop the metronome.
- [ ] Metronome timing matches the current BPM within the approved tolerance.
- [ ] Metronome timing changes after BPM changes.
- [ ] Time signature and accent settings affect the accent cycle.
- [ ] Subdivision changes click density.
- [ ] Playing and stopped states are visible.
- [ ] Starting metronome triggers sheet session activity.
- [ ] Starting metronome alone does not create a recording.
- [ ] Starting/stopping metronome does not implicitly start or stop recording.
- [ ] Controls remain usable after resizing the browser window.
- [ ] Controls do not incoherently overlap the sheet viewer on desktop or mobile.
- [ ] No fake metronome playback or stub-only controls are accepted.

## Test Plan

### Unit Tests

- Sheet default BPM initialization.
- Sheet default time signature initialization.
- Fallback default initialization.
- BPM min, max, and step behavior.
- Time signature selection.
- Subdivision selection.
- Accent selection.
- Metronome control state transitions.

### Integration Tests

- Sheet metadata initializes controls.
- BPM change is propagated to the metronome service.
- Time signature and accent are propagated to the metronome service.
- Subdivision is propagated to the metronome service.
- Start calls metronome service play.
- Stop calls metronome service stop.
- Start triggers sheet session activity.
- Metronome-only activity creates no recording.
- Recording active plus metronome stop leaves recording active.
- Recording active plus metronome start keeps recording active.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Import or seed a sheet with BPM 72 and 4/4.
- Open Sheet Practice.
- Verify controls initialize to BPM 72 and 4/4.
- Click Play and verify playing state.
- Verify metronome timing evidence for 72 BPM.
- Change BPM to 90 through visible controls.
- Verify timing evidence changes to 90 BPM.
- Change time signature, accent, and subdivision through visible controls.
- Verify accent cycle and click density evidence.
- Click Stop and verify stopped state.
- Verify no recording was created by metronome-only practice.
- With recording active from the recording submodule or test harness, start and stop metronome and verify recording remains active.
- Resize browser from desktop to narrow mobile and verify controls remain visible and usable.
- Resize back to desktop and verify controls remain visible and usable.
- Check browser console errors during the tested flows.

### Manual QA

- Confirm controls are reachable without covering the sheet.
- Confirm mobile layout keeps main controls usable.
- Confirm playing and stopped states are visually clear.
- Confirm settings panel does not dominate the sheet.

### Specialized Verification

#### Metronome Timing Verification

Verification must reuse the timing standard from Quick Metronome.

The verifier must inspect one or more of:

- Offline rendered metronome audio.
- Captured click buffer from a test metronome adapter.
- Deterministic scheduler trace from the metronome service.

The verifier must check:

- Click intervals match selected BPM within documented tolerance.
- BPM changes produce changed intervals.
- Time signature changes produce expected accent cycle.
- Subdivision changes expected click density.
- Stop does not leave stray scheduled clicks.

#### Independence Verification

The verifier must check:

- Metronome only: session activity yes, recording no.
- Recording active then metronome start: recording remains active.
- Recording active then metronome stop: recording remains active.
- Metronome active then recording stop: metronome remains active when integrated with recording submodule.

#### Layout Resize Verification

The verifier must check:

- Desktop viewport.
- Tablet-like or iPad landscape viewport.
- Narrow mobile viewport.
- Resize while stopped.
- Resize while playing.
- No incoherent overlap with the sheet viewer.

## QA Checklist

- [ ] Real browser E2E testing was performed.
- [ ] Sheet default BPM and time signature initialization were tested.
- [ ] BPM, meter, subdivision, and accent were changed through UI.
- [ ] Metronome timing was verified beyond UI state.
- [ ] BPM change was verified to change timing.
- [ ] Accent cycle and subdivision density were verified.
- [ ] Session activity trigger was tested.
- [ ] Metronome-only flow did not create a recording.
- [ ] Recording independence was tested.
- [ ] Window resize behavior was tested.
- [ ] No console errors appeared during tested flows.

## Failure / Edge Cases

- Sheet has no BPM: use user default or documented fallback.
- Sheet has invalid BPM: use fallback and expose recoverable state if needed.
- Sheet has no time signature: use user default or documented fallback.
- Metronome start fails: show error and do not fake playing state.
- Resize while playing: controls remain usable and state remains clear.
- Recording active: metronome start/stop must not change recording state.
- Metronome active: recording stop must not change metronome state.

## Implementation Contract

The implementation agent may build:

- Bottom controls UI.
- Metronome settings UI.
- Sheet default initialization.
- Metronome service integration.
- Session activity trigger.
- Layout behavior for desktop and mobile.
- Test adapter or fixture hooks needed for timing verification.

The implementation agent must not build:

- Recording capture.
- Error marker UI.
- Reference playback controls.
- Auto Increase.
- Mute Training.
- Complex rhythm patterns.
- Custom metronome sounds.
- Segment-level tempo.
- Fake playback controls.

Implementation handoff must include:

- Controls, metronome integration, layout, and session trigger areas changed.
- Tests run.
- Timing evidence from implementer self-test.
- Resize behavior checked.
- Independence cases tested when possible.
- Known limitations or risks.

## Verification Contract

The verification agent must:

- Be a separate agent pass from the implementation agent.
- Run relevant automated tests.
- Use real browser interaction for controls and settings.
- Verify metronome timing with audio render, scheduler trace, or test adapter evidence.
- Verify BPM, accent, and subdivision behavior.
- Verify metronome-only session activity does not create recording.
- Verify independence from recording state using the recording submodule or test harness.
- Resize the browser window or viewport and verify controls remain usable.
- Check browser console errors.

The verifier must report FAIL if timing is not inspected, if controls only change UI state, if metronome and recording are coupled, or if resize behavior is not checked.

## Implementation Handoff Requirements

- Summary of UI, metronome service, session trigger, and layout changes.
- Test commands run.
- Timing evidence and tolerance used.
- Resize checks performed.
- Independence checks performed.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Real browser E2E evidence.
- Metronome timing evidence.
- Session trigger evidence.
- Recording independence evidence.
- Resize evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This module is complete only when:

- All acceptance criteria pass.
- Real browser E2E covers the controls path.
- Metronome timing evidence is provided.
- Session activity trigger is verified.
- Recording independence is verified.
- Resize behavior is verified.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- Auto Increase.
- Mute Training.
- Complex rhythm patterns.
- Custom metronome sounds.
- Practice templates.
- Segment-level tempo.
- Bar-aware count-in.

Do not implement these in v0.
