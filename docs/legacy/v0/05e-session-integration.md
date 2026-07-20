# Sheet Practice Session Integration

## Purpose

This submodule connects Sheet Practice to Practice Session history. It defines when a sheet practice session is created or restored, how it links to the current sheet, and how Continue Practice returns to the right context.

This module must not couple metronome playback and recording. Session is a practice context, not a transport lock.

## User Value

- The user can practice a sheet and have that practice counted.
- The user can practice without recording and still have a session.
- The user can record with or without the metronome.
- The user can return to the most recent sheet practice through Continue Practice.
- The sheet's last practiced state updates after real practice activity.

## v0 Scope

- Load active sheet context in Sheet Practice.
- Create or restore a sheet Practice Session when practice activity begins.
- Use `sourceType = sheet`.
- Link session to the active sheetId.
- Allow sessions without recordings.
- Define recording-to-session linking rules.
- Update basic practice duration.
- Update sheet last practiced state.
- Drive Continue Practice target for sheet sessions.
- Persist session metadata.
- Guard against invalid or missing sheet context.

Practice activity can be triggered by:

- Metronome start.
- Recording start.
- Reference playback start when Reference System exists.

These triggers are independent. One trigger must not require another.

## Out of Scope for v0

- Precise play/pause event timeline.
- Practice goal completion tracking.
- Practice Segment-level sessions.
- Multi-take comp sessions.
- Automatic analysis result attachments.
- Cross-device session merging.
- Binding recording lifecycle to metronome lifecycle.

## User Paths

```text
Open Sheet Practice
  -> View the sheet
  -> Do not start metronome, recording, or reference
  -> No practice session is created yet
```

```text
Open Sheet Practice
  -> Start metronome
  -> Create or restore sheet session
  -> Stop metronome
  -> Save session history without creating a recording
```

```text
Open Sheet Practice
  -> Start recording while metronome is stopped
  -> Create or restore sheet session
  -> Stop recording
  -> Save recording linked to session and sheet
```

```text
Open Sheet Practice
  -> Start metronome
  -> Start recording
  -> Stop metronome while recording continues
  -> Stop recording
  -> Save one sheet session and one sheet recording
```

## Product Decisions

- Entering Sheet Practice only to view a sheet does not create a session.
- Starting metronome, recording, or reference playback counts as practice activity.
- Metronome and recording are independent controls.
- Recording can start with or without the metronome playing.
- Metronome playback can start with or without recording active.
- Stopping metronome must not stop recording unless the user explicitly stops recording.
- Stopping recording must not stop metronome unless the user explicitly stops metronome.
- A sheet session can exist without any recording.
- Every sheet recording must link to the active session and active sheetId.
- Continue Practice uses the most recent session.
- If the most recent session has a sheetId, Continue Practice routes to Sheet Practice for that sheet.

## Data Boundary

This module creates:

- Practice Session with sourceType `sheet`.
- Session metadata linked to sheetId.

This module updates:

- Session duration.
- Session endedAt or inactive state when applicable.
- Sheet last practiced date.
- Recording sessionId and sheetId association rules.
- Recent practice context for Continue Practice.

This module reads:

- Active sheet metadata.
- Existing recent session for the sheet.
- Global playback or recording activity events.

This module must not create:

- Recording audio artifacts.
- Error markers.
- Reference sources.
- Practice Segments.
- Analysis results.

## State Boundary

Module-owned state:

- Active sheet session id.
- Session creation/restoration status.
- Session timing status.
- Last practiced update status.

Shared state:

- Active sheetId.
- Metronome activity state.
- Recording activity state.
- Reference playback activity state when available.
- Recording metadata creation flow.
- Continue Practice state.

## Architecture Boundary

The UI or Sheet Practice composition may call a session service or hook.

This module must not directly call:

- Tone.js.
- MediaRecorder.
- Recording adapter internals.
- Reference adapter internals.
- IndexedDB / Dexie.

It should listen to high-level practice activity events or service calls, not low-level audio implementation details.

## Dependencies

- `04-sheet-library` for active sheet metadata.
- `08-practice-session` for core session model.
- `05b-practice-controls` for metronome activity trigger.
- `05c-sheet-recording-review` for recording activity and recording metadata linking.
- `06-reference-system` for future reference playback trigger.
- `01-app-shell-home` for Continue Practice entry.

## Acceptance Criteria

- [ ] Opening Sheet Practice for a valid sheet does not immediately create a session.
- [ ] Starting metronome creates or restores a sheet session.
- [ ] Starting recording creates or restores a sheet session.
- [ ] Reference playback can be added later as a session trigger without changing the core model.
- [ ] Session sourceType is `sheet`.
- [ ] Session sheetId matches the active sheet.
- [ ] A session can exist without recordings.
- [ ] Starting metronome alone does not create a recording.
- [ ] Starting recording does not require metronome playback.
- [ ] Starting metronome while recording keeps recording active.
- [ ] Stopping metronome while recording keeps recording active.
- [ ] Stopping recording while metronome is playing keeps metronome playing.
- [ ] Sheet recording metadata must link to sessionId and sheetId.
- [ ] Continue Practice uses the most recent sheet session.
- [ ] Continue Practice routes to Sheet Practice for the correct sheetId.
- [ ] Sheet last practiced updates after real practice activity.
- [ ] Session metadata persists after refresh or reload.
- [ ] Missing or unknown sheet does not create an invalid session.

## Test Plan

### Unit Tests

- Practice activity trigger creates session only when active sheet is valid.
- Session sourceType creation rule.
- sheetId binding rule.
- Continue Practice target calculation.
- Basic duration calculation.
- last practiced update rule.
- Missing sheet guard.
- Metronome/recording independence state rules.

### Integration Tests

- Open Sheet Practice without activity and verify no session is created.
- Start metronome and verify sheet session is created.
- Start metronome and stop without recording; verify session persists and no recording exists.
- Start recording while metronome is stopped; verify session and recording metadata links.
- Start metronome while recording; verify same session and recording remains active.
- Stop metronome while recording; verify recording remains active.
- Stop recording while metronome plays; verify metronome remains active.
- Reload and verify session metadata still exists.
- Continue Practice routes to the active sheet.
- Unknown sheet does not create session.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Import or seed a real sheet.
- Open Sheet Practice.
- Verify no session is created before practice activity.
- Click metronome Play and verify session creation.
- Stop metronome and verify no recording was created.
- Reload and verify Continue Practice points to the sheet.
- Start recording while metronome is stopped.
- Stop recording and verify recording metadata has sessionId and sheetId.
- Start metronome, then start recording.
- Stop metronome while recording continues.
- Stop recording and verify metronome state remains as expected if still playing.
- Open an unknown sheet route and verify no invalid session is created.
- Check browser console errors during the tested flows.

If `05b` or `05c` are not implemented yet, this module may use a minimal test trigger or harness for contract verification, but final Sheet Practice integration must repeat these checks through real controls and recording UI.

### Manual QA

- Confirm session behavior feels natural: viewing a sheet alone does not count as practice.
- Confirm metronome and recording controls feel independent.
- Confirm Continue Practice copy or target is clear.

### Specialized Verification

#### Session Persistence

The verifier must check:

- Session metadata persists after reload.
- Recent session drives Continue Practice.
- last practiced persists after reload.

#### Independence Verification

The verifier must check these combinations:

- Metronome only: session yes, recording no.
- Recording only: session yes, recording yes, metronome remains stopped.
- Metronome then recording: same session, both can be active.
- Stop metronome during recording: recording continues.
- Stop recording during metronome: metronome continues if it was playing.

#### Invalid Context Verification

The verifier must check:

- Missing sheetId does not create session.
- Unknown sheetId does not create session.
- Recording cannot be linked to a missing sheet session.

## QA Checklist

- [ ] Real browser E2E testing was performed.
- [ ] Viewing a sheet without activity did not create a session.
- [ ] Metronome-only session was tested.
- [ ] Recording-only session was tested.
- [ ] Metronome plus recording independence was tested.
- [ ] Recording metadata linked to sessionId and sheetId.
- [ ] Continue Practice target was tested.
- [ ] Session persistence after reload was tested.
- [ ] Invalid sheet guard was tested.
- [ ] No console errors appeared during tested flows.

## Failure / Edge Cases

- Missing sheetId: do not create session.
- Unknown sheetId: do not create session.
- Recording starts before session exists: create session first, then link recording.
- Session persistence fails: show recoverable state and do not fake history.
- last practiced update fails: do not block active practice, but expose error if needed.
- Stop one transport while another is active: preserve independent state.

## Implementation Contract

The implementation agent may build:

- Sheet session service or hook.
- Practice activity trigger handling.
- Continue Practice target update.
- last practiced update.
- Recording metadata linking rules.
- Test harness triggers if dependent UI modules are not ready.

The implementation agent must not build:

- Metronome audio logic.
- Recording audio capture.
- Error marker UI.
- Reference playback UI.
- Segment-level sessions.
- Event timeline tracking.
- Any behavior that couples metronome and recording lifecycles.

Implementation handoff must include:

- Session and continue-practice areas changed.
- Tests run.
- Independence cases tested.
- Persistence behavior checked.
- Any temporary harness trigger used.
- Known limitations or risks.

## Verification Contract

The verification agent must:

- Be a separate agent pass from the implementation agent.
- Run relevant automated tests.
- Use real browser interaction for session trigger flows when UI exists.
- Verify metronome and recording independence.
- Verify no session is created by passive viewing.
- Verify session and last practiced persistence after reload.
- Verify Continue Practice target.
- Verify invalid sheet guard.
- Check browser console errors.

The verifier must report FAIL if session creation is tied only to metronome, if recording requires metronome, if stopping one control stops the other implicitly, or if invalid sheets create sessions.

## Implementation Handoff Requirements

- Summary of session, persistence, and continue-practice changes.
- Test commands run.
- Independence cases tested.
- Persistence checks performed by implementer.
- Temporary harness details if used.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Real browser E2E evidence.
- Session persistence evidence.
- Continue Practice evidence.
- Independence evidence.
- Invalid context evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This module is complete only when:

- All acceptance criteria pass.
- Session creation is verified for independent practice triggers.
- Metronome and recording independence is verified.
- Session persistence is verified after reload.
- Continue Practice target is verified.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- Precise event timeline.
- Play and pause event tracking.
- Practice goal completion tracking.
- Practice Segment-level sessions.
- Multi-take comp sessions.
- Automatic analysis result attachments.
- Cross-device session merging.
- Session history grouped by sheet or segment.

Do not implement these in v0.
