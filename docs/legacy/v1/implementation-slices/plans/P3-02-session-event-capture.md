# P3-02 Session Event Capture Plan

## Slice

- Slice id: `P3-02 session-event-capture`
- Pack: `pack-3-sessions-continue-practice`
- Current scheduler status: `planning_in_progress`
- Product features:
  - `sessions.event-timeline`
  - `practice-session.event-timeline`
- Planning model: `gpt-5.5`, extra-high effort, standard speed
- Coding/review/verification tier: Tier D - Recording / Media / Timing / Waveform

## External Plan Review Gate

- Web ChatGPT metronome project plan review: `PASS_WITH_CHANGES`.
- Web ChatGPT metronome project delta review: `PASS`.
- Do not mark this slice `ready_for_coding` until the scheduler sends this complete plan text through the external review gate and incorporates any required changes.
- Leave `docs/v1/status.json` unchanged in this planning pass.
- Required changes applied in this plan revision:
  - Defined one capture failure and return semantic.
  - Required stopped events to come from successful stop transitions.
  - Locked sheet id derivation to the session record.
  - Added optional context id normalization rules.
  - Added a deferred work table.
  - Added size guardrails and split triggers.
  - Added no-session-summary-mutation assertions.
  - Required reference dedupe to track the previous playing local reference id.
- Remaining required changes after delta review: none.

## Implementation Evidence

- Implementation agent: fresh coding agent, extra-high effort.
- Review agent result: PASS after a test-only fix pass closed coverage gaps for metronome stop failures, reference no-capture paths, and recording rollback/failure no-capture assertions.
- Verification agent result: PASS.
- Changed implementation files:
  - `src/services/practice-session/types.ts`
  - `src/services/practice-session/service.ts`
  - `src/components/quick-metronome/quick-metronome-experience.tsx`
  - `src/lib/quick-metronome/recording-controller.ts`
  - `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - `src/components/sheet-practice/controls/types.ts`
  - `src/lib/sheet-practice/recording-service.ts`
  - `src/services/recording/index.ts`
  - `src/components/sheet-practice/reference/reference-panel.tsx`
- Changed focused test files:
  - `tests/unit/practice-session-service.test.ts`
  - `tests/unit/quick-metronome-session.test.ts`
  - `tests/unit/sheet-practice-controls.test.tsx`
  - `tests/unit/sheet-practice-recording.test.ts`
  - `tests/unit/reference-panel.test.tsx`
- Scheduler verification after fix pass:
  - `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-service.test.ts tests/unit/quick-metronome-session.test.ts tests/unit/sheet-practice-controls.test.tsx tests/unit/sheet-practice-recording.test.ts tests/unit/reference-panel.test.tsx` -> PASS, 5 files / 103 tests.
  - `& .\scripts\npm-local.ps1 --% run typecheck` -> PASS.
  - `& .\scripts\npm-local.ps1 --% run lint -- src/services/practice-session/service.ts src/services/practice-session/types.ts src/components/quick-metronome/quick-metronome-experience.tsx src/lib/quick-metronome/recording-controller.ts src/components/sheet-practice/controls/sheet-practice-controls.tsx src/lib/sheet-practice/recording-service.ts src/services/recording/index.ts src/components/sheet-practice/reference/reference-panel.tsx tests/unit/practice-session-service.test.ts tests/unit/quick-metronome-session.test.ts tests/unit/sheet-practice-controls.test.tsx tests/unit/sheet-practice-recording.test.ts tests/unit/reference-panel.test.tsx` -> PASS.
  - `git diff --check` -> PASS, with CRLF warnings only for existing Windows line-ending behavior.
- No browser E2E was added for P3-02 because event records are intentionally non-persistent and not visible in UI in this slice.

## Refined Scope

Add explicit, validated capture of P3-01 practice session event records at existing service boundaries for the transport actions that already create practice activity:

- Quick metronome start and stop.
- Quick recording start and successful save/stop.
- Sheet metronome start and stop.
- Sheet recording start and successful save/stop, including current segment id when one is available.
- Local reference audio playback start and stop for sheet practice.

This slice should make capture observable and testable through a practice-session event sink, but it must not add durable event persistence yet. The default browser app path may use a no-op sink until a later persistence slice defines the IndexedDB shape and migration strategy.

The implementation should reuse the P3-01 event model from `src/domain/practice/session-events.ts`. Callers must not construct raw persisted timeline rows. They should ask the practice-session service boundary to create a validated `PracticeSessionEvent` with an event id, session id, timestamp, kind, optional context fields, empty payload, and schema version.

## Out Of Scope

- Durable session event repository, IndexedDB table, Dexie schema version, migration, or localStorage timeline storage.
- Adding an `events` array or event cursor fields to `PracticeSession`.
- Computing duration from event records.
- Grouping session history by date, sheet, segment, recording, or reference.
- Home recent activity, dashboard analytics, streaks, goals, Continue Practice target ranking, or visible event timeline UI.
- Session lifecycle capture for `session_started`, `session_resumed`, `session_paused`, or `session_ended`. P3-02 owns transport event capture only: metronome, recording, and local reference playback events.
- Recording artifact capture, waveform decode, recording metadata schema changes, or audio analysis changes.
- Reference persistence changes, Bilibili external-player tracking, AB-loop capture, offset capture, waveform capture, or playback-source payload details.
- New generic event bus, global analytics pipeline, Zustand store, or app-wide logging framework.
- Package files, dependency changes, route redesign, or visual UI changes.
- v2 scope: cloud sync, login, cross-device merge, backup conflict handling, automatic score following, automatic mistake detection, or scoring.

## Likely Files And Areas

Primary service boundary:

- `src/services/practice-session/types.ts`
  - Add a narrow capture input type, such as `PracticeSessionEventCaptureInput`.
  - Add a narrow sink type, such as `PracticeSessionEventSink`.
  - Add `captureSessionEvent` to `PracticeSessionService`.
  - Derive the capture input `kind` from the P3-01 event kind type instead of hand-writing a second independent union if the local type system allows it cleanly.
- `src/services/practice-session/service.ts`
  - Build and validate `PracticeSessionEvent` records using the P3-01 schema.
  - Use injected `now`, `createId`, repository lookup, and optional event sink.
  - Keep event capture side-effect-only and non-persistent.
- `src/services/practice-session/index.ts`
  - Export any new service-boundary types.
- `src/infrastructure/db/browser-practice-session-service.ts`
  - Wire the service with the default no-op event sink or omit the sink if the factory provides a no-op default.
  - Do not edit `src/infrastructure/db/practice-session-repository.ts` unless a type import adjustment is unavoidable.

Capture call sites:

- `src/components/quick-metronome/quick-metronome-experience.tsx`
  - Capture quick metronome and quick recording start events after existing successful transitions.
- `src/lib/quick-metronome/recording-controller.ts`
  - Capture quick `recording_stopped` only after artifact save, session link, metadata save, and the existing end-session path succeed.
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - Capture sheet metronome and sheet recording start events after existing successful transitions.
  - Include selected segment id when the current recording workflow has one.
- `src/lib/sheet-practice/recording-service.ts`
  - Capture sheet `recording_stopped` only after artifact save, recording metadata save, and prepared-session commit succeed.
- `src/services/recording/index.ts`
  - Extend `SheetRecordingSessionService` only enough for recording save code to call `captureSessionEvent`.
- `src/components/sheet-practice/reference/reference-panel.tsx`
  - Capture local reference `reference_started` and `reference_stopped` from local audio playback state transitions.
  - Expand the injected session service pick only enough to include `captureSessionEvent`.

Likely tests:

- `tests/unit/practice-session-service.test.ts`
- `tests/unit/quick-metronome-session.test.ts`
- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/unit/sheet-practice-recording.test.ts`
- `tests/unit/reference-panel.test.tsx`

Do not create broad new directories or move existing code for this slice.

## Capture Contract

Add one service method with a shape close to:

```ts
type PracticeSessionEventCaptureInput = {
  sessionId: string | null | undefined;
  kind:
    | "metronome_started"
    | "metronome_stopped"
    | "recording_started"
    | "recording_stopped"
    | "reference_started"
    | "reference_stopped";
  sheetId?: string | null;
  segmentId?: string | null;
  recordingId?: string | null;
  referenceId?: string | null;
};
```

The exact name may follow local conventions, but the behavior must be:

- Return `Promise<PracticeSessionEvent | null>`.
- `captureSessionEvent` must never throw for non-durable capture failures.
- Return `null` without emitting when `sessionId` is missing, whitespace-only, or not found.
- Return `null` without emitting for invalid context combinations, validation failures, sink throw/reject, and repository lookup failures that occur only for capture.
- Return the validated event only after validation succeeds and sink capture has completed, or after the no-op sink is used.
- Derive `sheetId` from the existing session when the session is sheet-scoped. Do not require callers to pass `sheetId` for sheet sessions.
- For sheet-scoped sessions, the canonical `sheetId` is the persisted/current session record. Caller-supplied `sheetId` must either be ignored or validated against that session; a mismatch returns `null` and emits nothing.
- For quick sessions, caller-supplied `sheetId` must not create sheet context.
- Allow caller-supplied `segmentId`, `recordingId`, and `referenceId` only where the P3-01 event-kind matrix permits them.
- Normalize optional context ids before validation: `undefined`, `null`, empty strings, and whitespace-only strings are absent.
- `recording_stopped` must include a non-empty `recordingId` after normalization; otherwise return `null` and emit nothing.
- `reference_started` and `reference_stopped` must include a non-empty `referenceId` after normalization; otherwise return `null` and emit nothing.
- `segmentId` remains event context only. It must not create or update segment-session metadata.
- Generate event ids through the existing `createId` factory using an `event` prefix.
- Use the service `now()` clock for `occurredAt`.
- Use `payload: {}` and `schemaVersion: PRACTICE_SESSION_EVENT_SCHEMA_VERSION`.
- Validate with `validatePracticeSessionEvent` before calling the sink.
- Keep event capture independent from existing session duration and recording-count updates.

Add an optional sink to `createPracticeSessionService`, close to:

```ts
type PracticeSessionEventSink = {
  captureEvent: (event: PracticeSessionEvent) => Promise<void> | void;
};
```

The factory should default to a no-op sink. P3-02 must not persist events by default. If a sink throws or rejects, the implementation must contain that failure, return `null`, and preserve existing practice, metronome, recording, and reference flows. Unit tests should cover that containment.

## In-Scope Capture Points

Quick metronome:

- Emit `metronome_started` only from `QuickMetronomeExperience` after `useMetronomeTransport` calls `onStarted`, which happens after `metronomeService.start(settings)` succeeds.
- Do not emit `metronome_started` from `ensureQuickSession`, because that method runs before the transport start can fail.
- Emit `metronome_stopped` from the existing quick stop path only after the underlying stop transition succeeds, preferably from `useMetronomeTransport` `onStopped` or an equivalent successful stop callback, and only when there is a current session.
- Do not emit `metronome_stopped` from button click handlers, optimistic React state changes, cleanup effects, component unmount, or stop failure.
- Preserve current behavior where stopping the metronome while recording keeps the recording active.

Quick recording:

- Emit `recording_started` only after `recordingService.start()` succeeds and a quick session exists.
- Do not emit `recording_started` when microphone permission or capture start fails.
- Emit `recording_stopped` from `quickRecordingController.saveCapturedQuickRecording` only after the recording artifact is saved, the session is linked, recording metadata is saved, and any existing session end behavior has succeeded.
- Include `recordingId` on `recording_stopped`.
- Do not include `recordingId` on `recording_started` unless the implementation discovers an existing stable id before capture start. Do not create one just for this event.

Sheet metronome:

- Emit `metronome_started` from `SheetPracticeControls` only after `useMetronomeTransport` calls `onStarted` with a valid session context.
- Do not emit `metronome_started` when sheet context is missing or metronome start fails.
- Emit `metronome_stopped` from the existing stop path only after the underlying stop transition succeeds, preferably from `useMetronomeTransport` `onStopped` or an equivalent successful stop callback, and only when a sheet session is available.
- Do not emit `metronome_stopped` from button click handlers, optimistic React state changes, cleanup effects, component unmount, or stop failure.
- Preserve current rollback behavior for newly-created Practice Again sessions when Tone start fails.

Sheet recording:

- Emit `recording_started` only after `sheetRecordingService.startCapture()` succeeds and `sessionService.ensureSheetSession(...)` returns a valid session.
- Include `sheetId` through the session context and include `segmentId` when `selectedRecordingSegmentId` or record-again context is available.
- Do not emit `recording_started` if capture starts but sheet session creation fails and the capture is discarded.
- Emit `recording_stopped` from `BrowserSheetRecordingService.stopAndSave` only after artifact save, metadata write, and `commitPreparedSheetRecordingSession` succeed.
- Include `recordingId` from the saved recording metadata.
- Include `segmentId` from `metadata.segmentContext?.segmentId` when present.
- Do not emit `recording_stopped` on decode failure, empty/silent artifact rejection, missing session, invalid segment context, metadata save failure, commit failure, rollback, discard, or cancel.

Local reference audio:

- Emit `reference_started` only for local audio reference playback after a sheet session exists and the local audio player reports a transition into `playing`.
- Capture should be driven by `reference-audio:state-change` transitions, not by a successful reference save or Bilibili selection.
- Emit `reference_stopped` when a previously playing local reference transitions to `paused`, `idle`, or `error`.
- Include `referenceId` for both started and stopped events.
- Deduplication must track the last playing local `referenceId`, not only a boolean. `reference_stopped` must use the previous playing reference id, not the currently selected reference after a state refresh or reference switch.
- Do not emit reference events for saving local reference files, saving Bilibili URLs/search results, opening Bilibili in an external tab, search failures, missing artifacts, or browser-blocked playback.
- Deduplicate ticker events: local audio `playing` state updates every 100ms must not emit repeated `reference_started` events.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Durable event repository, IndexedDB table, Dexie schema version, and migration | Later session-event persistence slice |
| Session lifecycle events: `session_started`, `session_resumed`, `session_paused`, `session_ended` | Future lifecycle capture slice |
| Duration from event pairs and incomplete-pair handling | P3-05 or the named duration slice |
| Date, sheet, segment, recording, and reference grouping | Later grouping/history slice |
| Home recent activity, dashboard analytics, and Continue Practice ranking | Later Home/Continue slices |
| Segment session metadata | P3-03 |
| Reference payload details such as AB loop, offset, waveform, and playback source | Future reference-event enrichment slice |
| Bilibili external playback tracking | Explicitly deferred/no-go unless a reliable in-app playback signal exists |

## Size Guardrails And Split Triggers

P3-02 may proceed as one PR only while it remains narrow capture work around the listed service and call-site files. Stop and return to planning if implementation requires:

- New production files beyond the listed service/call-site files.
- Durable persistence, repository, DB schema, migration, or event replay logic.
- Visible UI flow changes.
- Recording save ordering changes outside placing capture after existing successful commits.
- A shared event bus, app-wide store, analytics pipeline, or generic logging framework.
- Broad test rewrites outside the listed unit files.
- Production diff that grows mainly from refactor instead of narrow capture calls.

If those triggers appear, split into smaller slices such as quick transport capture, sheet recording capture, and reference playback capture.

## Acceptance Criteria

1. The practice-session service exposes a validated event capture method for the six transport event kinds owned by this slice.
2. Captured records use the P3-01 event schema, generated event ids, service timestamps, empty payloads, schema version `1`, and strict kind-specific context validation.
3. Capture returns `null` and emits nothing for missing, blank, or unknown sessions.
4. Quick and sheet metronome start events are emitted only after the metronome service successfully starts.
5. Metronome start failures and existing rollback paths do not emit false `metronome_started` events.
6. Quick and sheet metronome stop events are emitted only after the underlying stop transition succeeds.
7. Metronome stop failures do not emit false `metronome_stopped` events.
8. Quick and sheet recording start events are emitted only after capture starts and a valid session exists.
9. Quick and sheet recording stopped events are emitted only after the existing successful save/commit paths complete, with `recordingId` included.
10. Sheet recording events include `segmentId` when a selected or record-again segment context is available, without implementing P3-03 segment session metadata.
11. Local reference playback emits started/stopped events from actual local audio player state transitions, with duplicate `playing` ticks ignored.
12. Bilibili save/open flows and reference metadata saves do not emit playback events.
13. Event capture failure does not break existing metronome, recording, reference, session, rollback, or cleanup behavior.
14. No durable event persistence, duration calculation, grouping selector, analytics source, Home UI, Practice Session UI, database schema, migration, package, or route changes are included.

## Boundary Conditions

- Viewing a sheet alone still does not count as practice; no event should be captured from sheet viewer load or reference panel render.
- Existing `ensureQuickSession` and `ensureSheetSession` are session-context boundaries, not proof that a transport started. Do not emit transport events from these methods alone.
- Recording and metronome remain independent. Starting or stopping one must not emit start/stop events for the other.
- Stopping recording must not emit metronome stop, and stopping metronome must not emit recording stop.
- Recording save rollback must not leave a successful `recording_stopped` event in the test sink when the recording is not actually saved.
- If recording starts successfully but the later save fails, a `recording_started` event may exist without `recording_stopped`; P3-05 duration rules must later handle incomplete pairs.
- Segment ids are event context only in this slice. Do not add segment-session records, segment history grouping, or segment duration semantics.
- Reference events are local-audio playback events only. Bilibili playback occurs outside the app and cannot be truthfully captured by this slice.
- The event sink is not a durable audit log in P3-02. Do not make product behavior depend on querying captured events.
- Event timestamps should come from the service clock, not `performance.now()`, audio element current time, Tone.js time, or test-local wall clock calls.
- Current v0 summary, Continue Practice, recording counts, and `lastPracticedAt` behavior must remain driven by existing session and recording metadata.

## Test Coverage Plan

Unit and service tests:

- Add a fake event sink to `tests/unit/practice-session-service.test.ts`.
- Verify `captureSessionEvent` emits a valid `metronome_started` event for an existing quick session.
- Verify it emits sheet-scoped events with derived `sheetId`.
- Verify it emits recording events with `recordingId` only for recording kinds.
- Verify it emits reference events with `referenceId` only for reference kinds.
- Verify missing, blank, and unknown `sessionId` return `null` without sink calls.
- Verify optional context ids normalize `undefined`, `null`, empty strings, and whitespace-only strings as absent.
- Verify required event-specific ids are enforced: `recording_stopped` without valid `recordingId` returns `null`; reference start/stop without valid `referenceId` returns `null`.
- Verify invalid context combinations return `null` and do not reach the sink.
- Verify sink failures return `null` and do not corrupt existing session data.
- Verify `captureSessionEvent` does not update `lastPracticedAt`, `endedAt`, duration, recording count, or session summary fields.
- Verify `captureSessionEvent` does not call repository save/update methods except the minimal lookup needed to validate session existence.
- Verify caller-supplied `sheetId` mismatches cannot override sheet context and quick sessions cannot be made sheet-scoped by caller input.

Quick metronome component/controller tests:

- In `tests/unit/quick-metronome-session.test.ts`, extend the mocked `browserPracticeSessionService` with `captureSessionEvent`.
- Verify `metronome_started` is captured after start success and not captured after start failure.
- Verify `metronome_stopped` is captured when a current session exists.
- Verify `metronome_stopped` is not captured after a stop failure or from an optimistic UI click path.
- Verify `recording_started` is captured after recording start success and not captured on permission/capture failure.
- Verify `recording_stopped` is captured after successful quick recording save with `recordingId`.
- Verify no `recording_stopped` is captured when artifact save, session link, metadata save, or session end rollback path fails.

Sheet controls and sheet recording tests:

- In `tests/unit/sheet-practice-controls.test.tsx`, extend mock session services with `captureSessionEvent`.
- Verify sheet `metronome_started`/`metronome_stopped` capture after successful transitions.
- Verify Tone start failure and Practice Again rollback do not emit false start events.
- Verify sheet stop failure does not emit false stop events.
- Verify sheet `recording_started` includes `segmentId` when a segment is active.
- Verify no sheet `recording_started` is emitted for missing sheet context, invalid record-again source, or capture-start failure.
- In `tests/unit/sheet-practice-recording.test.ts`, verify `BrowserSheetRecordingService.stopAndSave` emits `recording_stopped` only after commit success and includes recording and segment ids.
- Verify decode, silent/empty artifact, invalid segment, metadata preparation, artifact save, commit, and rollback failures do not emit `recording_stopped`.

Reference tests:

- In `tests/unit/reference-panel.test.tsx`, extend the mock session service with `captureSessionEvent`.
- Verify local audio transition into `playing` emits one `reference_started` event.
- Verify repeated `playing` ticker events do not emit duplicate starts.
- Verify transition from playing to `paused`, `idle`, or `error` emits one `reference_stopped`.
- Verify `reference_stopped` uses the previous playing local `referenceId` when the selected reference changes before the stopped transition.
- Verify missing artifacts, blocked playback/error state without a prior playing state, Bilibili saves, Bilibili search, Bilibili URL save, and local reference save do not emit playback events.

Integration tests:

- No new repository integration test is required because P3-02 intentionally does not add durable persistence.
- If implementation touches `src/infrastructure/db/browser-practice-session-service.ts`, add a narrow test only if an existing browser-service test pattern exists; otherwise rely on service unit tests and typecheck.

Browser E2E:

- No new event-specific E2E is required because events are not persisted or visible in UI in P3-02.
- Run existing quick/sheet/reference smoke E2E only if the coding diff changes user-visible interaction flow or if review asks for it.

Reload/persistence:

- No reload persistence assertion is required for event records because durable event storage is deferred.
- Existing session and recording persistence tests must continue to pass.

Negative cases:

- Metronome start failure after session preparation.
- Recording permission denial.
- Recording capture discard after missing sheet session.
- Recording save failure after artifact stop.
- Reference missing artifact.
- Reference playback error without previous playing state.
- Bilibili reference save/open incorrectly treated as playback.
- Event sink throwing or rejecting.
- Caller-supplied sheet id mismatch.
- Whitespace-only optional context ids.

## Verification Evidence Required

The coding agent should report:

- Changed file list confirming no package files, status files, Dexie schema/migration, app route redesign, persisted event repository, duration selectors, grouping selectors, analytics, or timeline UI.
- Focused unit test commands and passing output for:
  - `tests/unit/practice-session-service.test.ts`
  - `tests/unit/quick-metronome-session.test.ts`
  - `tests/unit/sheet-practice-controls.test.tsx`
  - `tests/unit/sheet-practice-recording.test.ts`
  - `tests/unit/reference-panel.test.tsx`
- Passing typecheck command.
- Passing lint or equivalent static check for changed source/test files if available.
- `git diff --check` result.
- A brief note explaining why no reload/persistence event test was added.

Recommended PowerShell command shape:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-service.test.ts tests/unit/quick-metronome-session.test.ts tests/unit/sheet-practice-controls.test.tsx tests/unit/sheet-practice-recording.test.ts tests/unit/reference-panel.test.tsx
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/services/practice-session/service.ts src/services/practice-session/types.ts src/components/quick-metronome/quick-metronome-experience.tsx src/lib/quick-metronome/recording-controller.ts src/components/sheet-practice/controls/sheet-practice-controls.tsx src/lib/sheet-practice/recording-service.ts src/services/recording/index.ts src/components/sheet-practice/reference/reference-panel.tsx tests/unit/practice-session-service.test.ts tests/unit/quick-metronome-session.test.ts tests/unit/sheet-practice-controls.test.tsx tests/unit/sheet-practice-recording.test.ts tests/unit/reference-panel.test.tsx
git diff --check
```

The verification agent should independently confirm:

- Event capture uses the P3-01 schema and does not create a parallel event type.
- Capture points align with successful service/transport transitions rather than early UI clicks.
- Failed or rolled-back paths do not emit successful stopped events.
- Stop events align with successful stop transitions rather than optimistic UI state.
- Existing v0 independence between metronome, recording, and reference is preserved.
- No persistence, duration, grouping, analytics, or UI behavior slipped into this slice.
- Returned captured events are not used as product state. Capture calls should be fire-and-contain or awaited only for containment; product behavior must not depend on the returned event.

## Model Tier

Use Tier D for coding, review, and verification:

- Coding agent: `gpt-5.5`, extra-high effort, standard speed
- Review agent: `gpt-5.4`, extra-high effort, standard speed
- Verification agent: `gpt-5.4`, extra-high effort, standard speed

Reason: although P3-02 should not implement low-level media or timing internals, it touches recording, metronome, and reference playback boundaries where false positives can corrupt future timeline semantics. It also spans shared service types, quick practice, sheet practice, recording save rollback, and reference playback state transitions. Tier B would be too low for the cross-boundary media/timing implications.

Escalate only if implementation discovers that event capture cannot be made observable without durable persistence or schema migration. In that case, stop and return to planning rather than adding persistence inside P3-02.

## Reuse Constraints

- Reuse `src/domain/practice/session-events.ts` and exported P3-01 event types/schemas.
- Reuse existing `now` and `createId` injection in `createPracticeSessionService`; do not introduce a new clock or id framework.
- Reuse existing service boundaries and callbacks:
  - `useMetronomeTransport` `onStarted` / `onStopped`
  - quick recording controller save path
  - sheet recording service save path
  - reference local audio state-change event
- Keep UI call sites from constructing full event rows. They may pass a narrow capture input to the service only.
- Do not add tempo, time-signature, Tone.js scheduler, audio current time, waveform, Bilibili, offset, AB-loop, or recording artifact payloads to session events.
- Do not add new npm dependencies.
- Do not hand-roll persistence or a generic event bus.
- Do not move files or perform broad refactors.
- Keep tests deterministic with fake clocks, fake services, and existing fixtures.

## Handoff Notes

- Start by reading this plan, `docs/v1/START-HERE.md`, `docs/v1/implementation-slices/03-sessions-continue-practice.md`, `docs/v1/implementation-slices/plans/P3-01-session-event-model.md`, `docs/v1/05e-session-integration.md`, `docs/v1/08-practice-session.md`, `docs/v0/project-structure.md`, `docs/v0/tech-stack-decisions.md`, and `src/domain/practice/session-events.ts`.
- Inspect only the service and test files needed for the capture points listed above.
- Implement exactly the six transport event capture kinds. Leave session lifecycle event capture for a future explicit plan.
- Keep event capture side-effect-only until a later plan defines event persistence.
- If durable persistence appears necessary, stop and return to planning.
- If reference capture cannot be made reliable for Bilibili external playback, keep Bilibili excluded and document that exclusion in the implementation notes.
- If size guardrails are triggered, stop and return to planning rather than squeezing broad refactor or persistence work into P3-02.
- Leave `docs/v1/status.json` unchanged; the scheduler will run the ChatGPT plan-review gate before coding.
