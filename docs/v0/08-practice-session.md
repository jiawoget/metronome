# Practice Session

## Purpose

This module defines the global v0 Practice Session model and behavior. It supports Quick Metronome, Sheet Practice, Continue Practice, Today Summary, and basic practice history.

It records practice context even when the user does not create a recording.

## User Value

- The user can practice without recording and still see practice history.
- The user can continue the most recent practice context.
- The app can show a simple Today Summary.
- Recordings have a session context.

## v0 Scope

- Practice Session domain model.
- `sourceType`: `quick` or `sheet`.
- Optional sheetId for sheet sessions.
- startedAt.
- Optional endedAt.
- Duration.
- BPM.
- Time signature.
- Recording count.
- Latest recordingId.
- Recent session.
- Today Summary.
- Basic practice history.
- Session persistence.
- Continue Practice target.
- Clear local data integration.

## Out of Scope for v0

- Precise event timeline.
- Play and pause event tracking.
- Practice goal completion tracking.
- Practice Segment-level sessions.
- Multi-take comp sessions.
- Automatic analysis result attachments.
- Cross-device session merging.
- Session comparison over time.
- Detailed duration rules beyond basic v0 calculation.

## User Paths

```text
Open Quick Metronome
  -> Start metronome or recording
  -> Create quick session
  -> Continue Practice later
  -> Return to Quick Metronome
```

```text
Open Sheet Practice
  -> Start metronome or recording
  -> Create sheet session linked to sheetId
  -> Continue Practice later
  -> Return to that sheet
```

```text
Practice today
  -> Open Home
  -> See today's practice time, session count, and recording count
```

## Product Decisions

- v0 has a Practice Session concept.
- A session can exist without any recording.
- Quick sessions have `sourceType = quick`.
- Quick sessions do not have sheetId.
- Sheet sessions have `sourceType = sheet`.
- Sheet sessions require a valid sheetId.
- Every recording must be linked to a session.
- Error markers link to recordings, not directly to sessions.
- Continue Practice uses the most recent session.
- If the most recent session has sheetId, continue into Sheet Practice.
- If the most recent session has no sheetId, continue into Quick Metronome.
- Session can be triggered by metronome start, recording start, or future reference playback.
- Session triggers are independent and must not couple metronome, recording, or reference controls.
- Today Summary uses the browser local day in v0.
- Clear All Local Data removes session/history data.

## Data Boundary

This module creates:

- Practice Session.
- Practice history summary data when needed.

This module reads:

- Sessions.
- Recordings linked to sessions.
- Sheet metadata for sheet session validity and continue target.

This module updates:

- Session duration.
- endedAt.
- recording count.
- latest recordingId.
- recent session state.

This module deletes:

- Sessions and practice history during Clear All Local Data.

This module must not create:

- Recording artifacts.
- Error markers.
- Sheet artifacts.
- Reference artifacts.
- Analysis results.

## State Boundary

Module-owned state:

- Active session.
- Recent session.
- Session lifecycle state.
- Today Summary aggregation state.

Shared state:

- Active sheet context.
- Current BPM and time signature from practice modules.
- Recording metadata events.
- Clear local data event.

## Architecture Boundary

The UI may call session hooks or services.

This module must not directly call:

- Tone.js.
- MediaRecorder.
- wavesurfer.js.
- IndexedDB / Dexie from UI.
- Future sync APIs.

Persistence should sit behind a session repository or local data service boundary.

## Dependencies

- `02-quick-metronome` for quick session triggers.
- `05e-session-integration` for sheet session triggers.
- `03-recordings-review` and recording services for recording count/latest updates.
- `01-app-shell-home` for Today Summary and Continue Practice.
- `07-settings-local-data` for cleanup.
- `04-sheet-library` for sheet validity.

## Acceptance Criteria

- [ ] Quick session can be created.
- [ ] Quick session has sourceType `quick`.
- [ ] Quick session has no sheetId.
- [ ] Sheet session can be created.
- [ ] Sheet session has sourceType `sheet`.
- [ ] Sheet session requires a valid sheetId.
- [ ] Invalid sheetId cannot create a sheet session.
- [ ] Session can exist without any recording.
- [ ] Recording creation requires sessionId.
- [ ] Recording count updates when a recording is added.
- [ ] latest recordingId updates when a recording is added.
- [ ] Duration can be calculated and persisted.
- [ ] endedAt can be set and persisted.
- [ ] Recent session can be read.
- [ ] Continue Practice routes to Quick Metronome for recent quick session.
- [ ] Continue Practice routes to Sheet Practice for recent sheet session.
- [ ] Today Summary reports today's practice time.
- [ ] Today Summary reports today's session count.
- [ ] Today Summary reports today's recording count.
- [ ] Today Summary uses browser local day.
- [ ] Sessions persist after refresh or reload.
- [ ] Clear All Local Data removes sessions and practice history.
- [ ] Future reference trigger can be added without coupling transports.
- [ ] Error markers are not directly linked to sessions.

## Test Plan

### Unit Tests

- Quick session creation rules.
- Sheet session creation rules.
- sourceType validation.
- sheetId required for sheet sessions.
- sheetId absent for quick sessions.
- Invalid sheet guard.
- Duration calculation.
- endedAt update.
- Recording count update.
- latest recordingId update.
- Recent session sorting.
- Continue target calculation.
- Today Summary aggregation.
- Browser local day boundary for Today Summary.

### Integration Tests

- Create quick session and persist it.
- Create sheet session and persist it.
- Reject sheet session with invalid sheetId.
- Add recording and update count/latest.
- End session and persist duration/endedAt.
- Reload and read sessions.
- Read recent session and calculate Continue Practice target.
- Aggregate Today Summary from today and previous-day sessions.
- Clear local data and verify sessions/history are gone.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Open Quick Metronome.
- Start metronome or recording.
- Verify quick session is created with no sheetId.
- Verify Continue Practice returns to Quick Metronome.
- Import or seed a sheet.
- Open Sheet Practice.
- Start metronome or recording.
- Verify sheet session is created with the correct sheetId.
- Verify Continue Practice returns to Sheet Practice for that sheet.
- Create a metronome-only session and verify Today Summary updates without recording.
- Create a recording and verify session recording count/latest updates.
- Refresh and verify recent session and Today Summary persist.
- Use Settings Clear All Local Data.
- Verify sessions/history are removed after reload.
- Check browser console errors during the tested flows.

### Manual QA

- Confirm Continue Practice target feels clear.
- Confirm Today Summary numbers are understandable.
- Confirm practice without recording still feels counted only after real activity.

### Specialized Verification

#### Today Summary Verification

The verifier must seed or create:

- At least one session from today.
- At least one session from a previous browser-local day.
- At least one session with recording count.
- At least one session without recording.

The verifier must check:

- Only today's sessions count toward Today Summary.
- Practice time sum is correct within documented tolerance.
- Session count is correct.
- Recording count is correct.

#### Continue Practice Verification

The verifier must check:

- Recent quick session routes to Quick Metronome.
- Recent sheet session routes to the correct Sheet Practice sheet.
- Missing sheet for recent sheet session shows recovery or not-found state, not a broken route.

#### Recording Link Verification

The verifier must check:

- Recordings cannot be saved without sessionId.
- Adding a recording updates recording count.
- Adding a recording updates latest recordingId.

## QA Checklist

- [ ] Real browser E2E testing was performed.
- [ ] Quick session creation was tested.
- [ ] Sheet session creation was tested.
- [ ] Invalid sheet guard was tested.
- [ ] Session without recording was tested.
- [ ] Recording link to session was tested.
- [ ] Continue Practice quick target was tested.
- [ ] Continue Practice sheet target was tested.
- [ ] Today Summary browser-local day behavior was tested.
- [ ] Persistence after reload was tested.
- [ ] Clear local data session cleanup was tested.
- [ ] No console errors appeared during tested flows.

## Failure / Edge Cases

- Invalid sheetId: reject sheet session.
- Missing sheet for Continue Practice: show recovery/not-found state.
- Recording without sessionId: reject recording metadata save.
- Duration negative or invalid: clamp or reject according to service rules.
- Browser local day boundary: use local day consistently.
- Clear local data fails: do not claim sessions are cleared.
- Multiple triggers in same context: reuse current session where appropriate.

## Implementation Contract

The implementation agent may build:

- Practice Session domain model.
- Session service.
- Session repository/local persistence integration.
- Continue Practice target calculation.
- Today Summary aggregation.
- Recording count/latest update logic.
- Clear local data integration for sessions/history.
- Test helpers for deterministic session dates.

The implementation agent must not build:

- Recording audio capture.
- Metronome audio logic.
- Error marker creation.
- Practice Segment sessions.
- Event timeline tracking.
- Cloud sync.
- Automatic analysis attachments.

Implementation handoff must include:

- Session model, service, repository, summary, and continue-practice areas changed.
- Tests run.
- Date boundary cases tested.
- Clear local data integration tested.
- Known limitations or risks.

## Verification Contract

The verification agent must:

- Be a separate agent pass from the implementation agent.
- Run relevant automated tests.
- Use real browser interaction for Quick, Sheet, Continue Practice, Today Summary, and Clear Data flows where UI exists.
- Verify quick and sheet session differences.
- Verify recording session links.
- Verify Today Summary with today and previous-day sessions.
- Verify Clear All Local Data removes sessions/history.
- Check browser console errors.

The verifier must report FAIL if sessions only exist as UI state, if recordings can save without sessionId, if Today Summary counts wrong days, or if E2E interaction is skipped.

## Implementation Handoff Requirements

- Summary of session model, persistence, summary, and routing changes.
- Test commands run.
- Today Summary date fixture details.
- Continue Practice checks performed.
- Clear local data checks performed.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Real browser E2E evidence.
- Quick session evidence.
- Sheet session evidence.
- Continue Practice evidence.
- Today Summary evidence.
- Recording link evidence.
- Clear data evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This module is complete only when:

- All acceptance criteria pass.
- Real browser E2E covers quick and sheet session flows.
- Today Summary is verified across browser-local date boundaries.
- Recording links to session are verified.
- Continue Practice targets are verified.
- Clear local data removes sessions/history.
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
- Session comparison over time.
- More detailed practice duration rules.

Do not implement these in v0.
