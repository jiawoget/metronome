# P3-05 Session Duration Rules Plan

## Slice

- Slice id: `P3-05 session-duration-rules`
- Pack: `pack-3-sessions-continue-practice`
- Current scheduler status: `planning_in_progress`
- Product feature:
  - `practice-session.duration-rules`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Coding/review/verification tier: Tier B - Local Persistence / Service Boundary, with extra-high effort per user instruction

## External Plan Review Gate

- This planning pass only writes the durable plan file.
- Leave `docs/v1/status.json` unchanged.
- Before coding, the scheduler must send this complete plan text, uncompressed, through the logged-in web ChatGPT `metronome` project review gate in Chinese and incorporate required changes.
- Do not mark this slice `ready_for_coding` until that review gate passes.

## External Review Notes

- Web ChatGPT metronome project plan review: `PASS_WITH_CHANGES`.
- Web ChatGPT metronome project delta review: `PASS`.
- Required changes applied in this plan revision:
  - Added explicit rollback-sensitive recording save/commit/link/cleanup boundaries and test/report requirements.
  - Upgraded legacy/global quick-session conversion from "if touched" to mandatory inspection and reporting.
  - Strengthened the guard that helper adoption must not become historical duration rewrite, batch normalization, reload-time normalization, read-time writeback, or hidden migration.
- Remaining required changes after delta review: none.
- Implementation is allowed after the delta review while preserving the reviewed boundary.

## Refined Scope

Centralize the existing local practice-session duration rules so all current service and summary consumers use one documented helper. This is a small rules/service-boundary slice, not an event replay or analytics slice.

P3-05 owns:

- A single domain-level duration rules module or equivalent extraction from the existing `src/domain/practice/rules.ts`.
- Exact semantics for deriving `PracticeSession.durationMs` from session timestamps when creating, updating, ending, restoring, linking, and committing local practice sessions.
- Reuse of existing persisted `PracticeSession.durationMs` for read models that summarize history, Today Summary, and P3-04 grouping.
- Narrow service rewiring so `createPracticeSessionService` calls the centralized helper instead of service-local duration math.
- Focused tests that lock active, ended, malformed, zero-duration, future timestamp, quick, sheet, and segment-linked session behavior.

The safe interpretation of the backlog phrase "from session events" is: define the centralized rule that would be used by future durable-event work, while continuing to compute current persisted session duration from `PracticeSession.startedAt`, `PracticeSession.endedAt`, and the injected service clock. P3-01/P3-02 event records are non-durable today and must not become a historical source of truth in P3-05.

## Explicit Out Of Scope

- Durable session event repository, event table, Dexie schema/index/version/migration, event backfill, or event replay.
- Computing duration from P3-01/P3-02 captured event pairs.
- Adding `events` arrays, active interval rows, pause intervals, or transport-state snapshots to `PracticeSession`.
- Home recent activity source/UI, Continue Practice target/routing, session history UI, dashboard analytics, goals, streaks, scoring, quality metrics, or automatic mistake detection.
- Segment duration partitioning, multi-segment session timelines, or per-segment active-time claims.
- Recording artifact duration rules, waveform duration warnings, media decode behavior, metronome timing internals, or reference playback timing internals.
- Broad UI changes, route changes, visual labels, package changes, or new dependencies.
- Mutating historical sessions only to "fix" duration values unless an existing service action already saves that session.
- Batch normalizing historical `durationMs`, reload-time normalization, read-time writeback, or any hidden migration through helper adoption.
- Cross-device reconciliation, background tracking, cloud merge, login, or v2 continuity behavior.

If implementation discovers that correct duration semantics require durable event persistence or event replay, stop and return to planning for a persistence slice. Do not add a workaround event store inside P3-05.

## Likely Files And Areas

Primary domain/service files:

- `src/domain/practice/rules.ts`
  - Extract or add centralized helpers near the existing `calculatePracticeDurationMs`.
  - Keep local-day helpers and Today Summary behavior intact.
- `src/domain/practice/index.ts`
  - Export new helper types/functions only if needed by existing project conventions.
- `src/services/practice-session/service.ts`
  - Replace the service-local `calculateActiveDuration` helper and direct end-session duration calls with the centralized helper.
  - Keep existing `now`, `createId`, repository, sheet gateway, and event sink injection.
- `src/domain/practice/session-history-groups.ts`
  - Touch only if replacing direct `session.durationMs` summing with a centralized summary helper stays narrow.
  - Do not recompute group duration from timestamps or events.
- `src/infrastructure/db/global-practice-session-repository.ts`
  - Must be inspected for legacy quick-session duration fallback behavior.
  - Touch only if legacy conversion currently duplicates timestamp-derived duration math and can use the centralized helper without widening behavior.
  - If not touched, the coding handoff must explain why it does not leave a parallel duration rule.

Likely tests:

- `tests/unit/practice-session-duration-rules.test.ts` or focused additions to an existing domain rules test file.
- `tests/unit/practice-session-service.test.ts` for service call paths that save updated durations.
- `tests/unit/practice-session-history-groups.test.ts` only if P3-04 grouping is rewired to a centralized summary helper.
- `tests/unit/practice-session-repository.test.ts` only if reload evidence is needed for persisted `durationMs` preservation and existing repository tests do not already cover it.

Avoid editing UI components, app routes, Playwright specs, Dexie schema files, package files, or unrelated recording/reference modules.

## Duration Semantics

The centralized helper should expose names that match local style, but it must make these rules explicit:

- `PracticeSession.durationMs` remains the persisted duration field for local sessions.
- Active session duration is `now - startedAt`, rounded to the nearest millisecond, clamped to `0`.
- Ended session duration is `endedAt - startedAt`, rounded to the nearest millisecond, clamped to `0`.
- If `endedAt` is non-null, the helper must ignore `now`; ended sessions are stable and do not keep growing.
- If `startedAt`, `endedAt`, or `now` cannot be parsed into a finite timestamp, derived duration is `0`.
- If `endedAt` or `now` is before `startedAt`, derived duration is `0`; do not throw for future timestamps in duration math.
- Existing validation should continue rejecting persisted sessions where `endedAt < startedAt`, but duration helpers must still be defensive for malformed raw or legacy inputs used in tests and conversion.
- Zero-duration sessions are valid and must not be filtered out of summaries or groups.
- Duration should be an integer number of milliseconds. Continue using `Math.round` unless the implementation finds an existing project-wide convention that already requires a different rounding rule.
- No upper cap is introduced in P3-05. Extremely long but finite local sessions remain finite computed values unless a later product contract adds idle/background caps.
- No timezone conversion is used for elapsed duration. Timestamps are absolute instants; browser-local day behavior remains only for grouping/today filtering.

Recommended domain contract shape:

```ts
type PracticeSessionDurationInput = Pick<PracticeSession, "startedAt" | "endedAt">;

function calculatePracticeSessionDurationMs(
  session: PracticeSessionDurationInput,
  now?: Date
): number;

function withUpdatedPracticeSessionDuration(
  session: PracticeSession,
  timestamp: string
): PracticeSession;
```

Exact names may differ, but there must be one authoritative helper for calculating the duration and, if useful, one helper for returning a session copy with `durationMs` and `updatedAt` updated together.

## Active, Ended, Malformed, Future, And Zero Cases

Active sessions:

- `endedAt: null` means active for duration purposes.
- Service update paths should pass the injected `now()` value and save `durationMs` based on `now - startedAt`.
- `updatePracticeSessionDuration`, `updateSheetSessionDuration`, `ensureQuickSession`, `ensureSheetSession`, `linkRecordingToSession`, `getRecordingSession`, and `prepareSheetRecordingMetadata` must preserve the current behavior of refreshing active duration through the same helper where they already update session rows or prepared session snapshots.

Ended sessions:

- `endPracticeSession` sets `endedAt` to the same service timestamp used to compute duration.
- Calling `endPracticeSession` on an already ended session remains idempotent and returns the existing session without recalculating from a later clock.
- Reusing sessions must still happen only for active same-day sessions. P3-05 must not reopen ended sessions.

Malformed timestamps:

- Helper returns `0` for invalid `startedAt`, invalid `endedAt`, invalid `now`, or non-finite parsed timestamps.
- Repository validation can continue filtering malformed persisted rows. P3-05 tests should cover the helper directly so future legacy conversion and service code do not accidentally produce `NaN`.

Future timestamps:

- Active session with `startedAt` after `now` returns `0`.
- Ended session with `endedAt` before `startedAt` returns `0` in the helper, even though validated persisted sessions should reject this shape.
- Future but ordered ended timestamps still return their elapsed difference; elapsed duration is absolute, not "must be before current wall clock."

Zero duration:

- Newly created quick and sheet sessions may have `durationMs: 0`.
- Immediate end or same-millisecond update returns `0`.
- Today Summary and P3-04 grouping include zero-duration sessions in session counts and sum `0` into duration.

## Quick, Sheet, And Segment-Linked Sessions

Quick sessions:

- Quick duration uses only `startedAt`, `endedAt`, and the injected service clock.
- Quick sessions always have `sheetId: null` and `segmentContext: null`; duration helpers must not require sheet context, recording context, or events.
- Quick recording linking may update `recordingCount`, `latestRecordingId`, `updatedAt`, and `durationMs` through the centralized helper.

Sheet sessions:

- Sheet duration uses the same timestamp rules as quick sessions.
- Sheet gateway updates to `lastPracticedAt` continue to use the same timestamp that caused the session save.
- Missing or deleted sheets affect Continue Practice and grouping target state, not duration math for already parsed sessions.
- Sheet sessions without recordings remain valid practice and may accumulate duration.

Segment-linked sessions:

- `segmentContext` is descriptive historical metadata from P3-03.
- Segment-linked session duration is still the full session `durationMs`.
- Do not infer that every millisecond belongs to the segment.
- Do not compute a segment duration from `segmentContext.measureRangeMs`, selected segment, recording duration, or transient event `segmentId`.
- P3-04 segment grouping should continue to sum existing session duration unless rewired to a helper that sums the same persisted field.

## Interaction With P3-01/P3-02 Events

P3-01 defined event records and P3-02 captures transport events through a non-durable sink. P3-05 must preserve that boundary:

- Do not query, persist, replay, backfill, or require captured event records.
- Do not calculate active time from `metronome_started/stopped`, `recording_started/stopped`, `reference_started/stopped`, or session lifecycle event pairs.
- Do not treat incomplete event pairs as errors for current persisted session duration.
- Do not add pause semantics from events. Existing duration remains elapsed session context time from `startedAt` to `endedAt` or `now`.
- Do not alter P3-02 sink failure behavior. Event capture failures must not affect duration updates.

Document the future rule for durable events without implementing it:

- If a future slice adds durable event persistence, it must define a separate replay contract before replacing or reconciling persisted `durationMs`.
- That future contract must specify incomplete pairs, overlapping transports, pause/resume semantics, and migrations. P3-05 should not guess those semantics.

## Interaction With P3-04 Grouping And Summaries

P3-04 grouping currently summarizes `durationMs` from existing `PracticeSession` rows. P3-05 should keep that read model honest and narrow:

- `getTodayPracticeSummary` should keep summing persisted `session.durationMs` for sessions whose `startedAt` is in the browser-local day.
- `groupPracticeSessionsByHistory` should keep summing persisted `session.durationMs`.
- It is acceptable to introduce a tiny shared summarizer such as `sumPracticeSessionDurationMs(sessions)` if both Today Summary and P3-04 grouping can use it without changing behavior.
- That summarizer must sum validated `durationMs` values and clamp only defensively if passed malformed direct objects in tests. It must not recompute from timestamps or events.
- Grouping target states, labels, local-day keys, sheet/segment gateway lookups, and sorting must remain unchanged.

## Acceptance Criteria

1. A centralized duration rules helper documents and implements elapsed local practice-session duration from `startedAt`, `endedAt`, and an injected `now`.
2. All current practice-session service duration update paths use the centralized helper rather than duplicating local math.
3. Ended sessions use `endedAt - startedAt` and do not keep growing when later clocks are passed.
4. Active sessions use `now - startedAt`, rounded to integer milliseconds and clamped to `0`.
5. Invalid timestamps, future active timestamps, and backwards ended timestamps produce `0` in the helper without leaking `NaN` or negative values.
6. Quick, sheet, and segment-linked sessions share the same duration semantics; segment context does not create segment-duration claims.
7. Today Summary and P3-04 grouping continue to summarize persisted `PracticeSession.durationMs` consistently and include zero-duration sessions.
8. P3-01/P3-02 events remain non-durable and are not replayed, queried, or required for duration.
9. Helper adoption does not introduce batch normalization, reload-time normalization, read-time writeback, hidden migration, or any rewrite of historical session duration outside an existing save/update action.
10. Recording save, commit, link, rollback, and artifact cleanup ordering/semantics are unchanged; if any rollback-sensitive path is touched, focused rollback tests prove recording count/latest id/session duration cleanup still roll back correctly.
11. Legacy/global quick-session conversion is inspected and either uses the centralized helper with tests, or the handoff explains why it does not duplicate duration rules.
12. No Home UI, Continue Practice routing, session history UI, analytics, goals, Dexie schema/index/migration, package, dependency, or product-code-adjacent feature changes are included.

## Test Coverage Plan

Unit duration rules:

- Active session started at `12:00:00.000Z` with `now` `12:00:04.400Z` returns `4_400`.
- Active duration rounds fractional millisecond differences consistently if testable through Date inputs.
- Ended session with later `now` still returns `endedAt - startedAt`.
- Ended session same millisecond returns `0`.
- Invalid `startedAt` returns `0`.
- Invalid `endedAt` returns `0`.
- Invalid `now` for an active session returns `0`.
- Active session with `startedAt` in the future relative to `now` returns `0`.
- Ended session with `endedAt` before `startedAt` returns `0`.
- Future but ordered ended timestamps return the elapsed difference.
- Zero-duration sessions remain valid inputs.

Service tests:

- `ensureQuickSession` creates a zero-duration session and later reuses the same active same-day quick session with duration from the centralized helper.
- `ensureSheetSession` creates and later reuses the same active same-day sheet session with duration from the centralized helper.
- `updatePracticeSessionDuration` updates quick and sheet sessions through the centralized helper and saves `updatedAt` using the same service timestamp.
- `updateSheetSessionDuration` rejects quick or missing sessions as today while using the shared helper for valid sheet sessions.
- `endPracticeSession` sets `endedAt`, `durationMs`, and `updatedAt` from one timestamp and does not recalculate already ended sessions.
- `linkRecordingToSession` and sheet recording prepared-session paths preserve existing recording count/latest id behavior while using centralized duration.
- If implementation touches `commitPreparedSheetRecordingSession`, quick/sheet recording link paths, save rollback paths, or artifact cleanup-adjacent paths, focused rollback tests must prove duration helper adoption does not change save ordering, cleanup ordering, rollback failure behavior, or recording count/latest id/session restoration semantics.
- If those rollback-sensitive paths are not touched, the coding report must explicitly say they were not touched.
- Event sink failure in `captureSessionEvent` still does not mutate duration or summaries.

Integration/reload tests:

- Existing Dexie-backed practice-session repository tests should continue to prove persisted `durationMs` survives save/read/reopen.
- Add a narrow reload assertion only if service/domain changes create a new helper used by repository-backed tests; otherwise rely on existing repository persistence coverage plus service tests.
- Legacy global quick-session conversion must be inspected:
  - if it has timestamp-derived duration fallback math that duplicates the centralized helper, either switch it to the centralized helper or explicitly justify why changing it would widen behavior;
  - if not touched, the coding report must explicitly state why it does not leave a parallel duration rule.
- If touched, add tests for:
  - latest recording duration wins when present;
  - otherwise timestamp-derived fallback uses centralized helper;
  - malformed legacy timestamps produce `0` instead of `NaN`.

P3-04 grouping and summary tests:

- Today Summary sums persisted durations and includes zero-duration sessions.
- Date/sheet/segment grouping sums persisted durations and includes zero-duration sessions.
- Segment-linked grouping does not use `measureRangeMs` or event `segmentId` to alter duration.
- If a shared summing helper is added, direct tests should cover malformed defensive inputs without changing validated repository behavior.

Browser E2E:

- No new browser E2E is required because P3-05 has no visible UI and no new persistence schema.
- Run existing focused quick/sheet session E2E only if implementation changes a user interaction path; otherwise unit/service/repository evidence is the expected verification surface.

Negative cases:

- `NaN`, negative, or infinite duration cannot be saved through service update paths.
- Malformed direct helper inputs return `0`.
- Future active timestamps clamp to `0`.
- Events are not used as a fallback when timestamps are malformed.
- Segment context and recording duration are not used as a fallback for session duration.
- Grouping implementation does not mutate sessions while summarizing.
- Centralized helper adoption does not trigger batch rewrite, reload-time rewrite, read-time writeback, or historical duration normalization.
- Recording rollback-sensitive paths are either untouched or have focused tests proving unchanged rollback and cleanup semantics.

## Verification Commands

Recommended focused commands for the coding agent:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-duration-rules.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-history-groups.test.ts tests/unit/practice-session-repository.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/rules.ts src/domain/practice/index.ts src/services/practice-session/service.ts src/domain/practice/session-history-groups.ts src/infrastructure/db/global-practice-session-repository.ts tests/unit/practice-session-duration-rules.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-history-groups.test.ts tests/unit/practice-session-repository.test.ts
git diff --check
```

Adjust the lint list to exactly match changed files. If no new `practice-session-duration-rules.test.ts` file is created, replace it with the actual focused rules test file. If `session-history-groups.ts`, `global-practice-session-repository.ts`, or repository tests are not touched, omit them from the focused lint/test commands.

The coding agent must report:

- Changed file list.
- Confirmation that `docs/v1/status.json` was not changed.
- Confirmation that no package files, Dexie schema/index/migration, durable event persistence, event replay, Home UI, Continue Practice routing, session history UI, analytics, goals, recording artifact, waveform, timing, or reference playback changes were added.
- Confirmation that legacy/global quick-session conversion was inspected, with either tests for centralized-helper adoption or a clear reason it does not leave parallel duration fallback logic.
- Confirmation that rollback-sensitive recording save/link/commit/cleanup paths were either not touched or covered by focused rollback tests.
- Confirmation that no batch normalization, reload-time normalization, read-time writeback, hidden migration, or historical duration rewrite was added.
- Focused unit/service/integration test output.
- Typecheck output.
- Lint output for changed files.
- `git diff --check` output.

## Model Tier And Handoff Notes

Use Tier B with extra-high effort for coding, review, and verification:

- Coding agent: `gpt-5.5`, extra-high effort, standard speed
- Review agent: `gpt-5.4-mini`, extra-high effort, standard speed
- Verification agent: `gpt-5.4-mini`, extra-high effort, standard speed

Reason:

- This is local practice-session service/domain behavior that affects persisted `durationMs` and read summaries.
- It needs strong boundary and regression coverage around existing service behavior.
- It should not touch media internals, browser UI, migrations, destructive operations, waveform/timing internals, or event persistence.
- The user explicitly instructed future coding agents to use `gpt-5.5` extra-high standard.

Coding handoff:

- Start by reading this plan, `docs/v1/START-HERE.md`, `docs/v1/implementation-slices/03-sessions-continue-practice.md`, `docs/v1/implementation-slices/plans/P3-01-session-event-model.md`, `docs/v1/implementation-slices/plans/P3-02-session-event-capture.md`, `docs/v1/implementation-slices/plans/P3-03-segment-session-metadata.md`, `docs/v1/implementation-slices/plans/P3-04-session-history-grouping.md`, `docs/v1/05e-session-integration.md`, `docs/v1/08-practice-session.md`, `docs/v1/remaining-feature-contracts.md`, `docs/v0/project-structure.md`, and `docs/v0/tech-stack-decisions.md`.
- Inspect only the current practice-session domain rules, service, repository conversion, grouping selectors, and focused tests needed for this slice.
- Reuse existing date/duration helpers and tests. Prefer extracting/renaming the existing `calculatePracticeDurationMs` rather than creating a parallel duration engine.
- Keep duration from persisted session timestamps and `PracticeSession.durationMs`; do not read transient captured events.
- Inspect legacy/global quick-session conversion and report whether it already has independent duration fallback logic.
- Treat recording save/link/commit/rollback/artifact cleanup paths as rollback-sensitive. Do not alter their ordering or cleanup semantics just to adopt a helper.
- Only update `durationMs` on paths that already save/update a session. Do not add batch normalization, reload-time normalization, read-time writeback, hidden migration, or historical duration rewrite.
- Keep the implementation small enough for one reviewable PR.
- Do not add package dependencies.
- Do not edit `docs/v1/status.json`.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Durable session event repository, event table, schema version, and migration | Future explicit persistence slice |
| Event replay duration from start/stop pairs and incomplete-pair handling | Future explicit duration-from-events slice after persistence |
| Pause/resume active-time semantics from session lifecycle events | Future lifecycle/persistence slice |
| Transport-specific duration, such as metronome-only or recording-only active intervals | Future analytics slice after durable events |
| Segment duration partitioning or multi-segment session timeline | Future explicit segment-session slice |
| Home recent activity source/UI | `P3-06`, `P3-07` |
| Continue Practice target construction, stale target rejection, and segment navigation | `P3-08`, `P3-09` |
| Goal completion, dashboard analytics, streaks, and UI labels | `P3-10` through `P3-15` |
| Full grouped session-history UI and cross-screen duration consistency E2E | Future explicit UI slice |
| Cross-device sync, cloud merge, login, background tracking, backup conflict resolution | v2 |

## Split Triggers

Stop and return to planning if implementation requires:

- More than roughly 300-400 lines of production code excluding focused tests.
- Any Dexie table, index, schema version, migration, or backfill.
- Any event persistence, event replay, or event-derived duration calculation.
- Any UI, route, Home, Continue Practice, history display, goals, analytics, or command palette changes.
- Any recording artifact, waveform, metronome timing, reference playback, MediaRecorder, or audio decode changes.
- Any package or dependency changes.
- Broad repository rewrites or shared architecture refactors.
- Recomputing historical sessions outside existing service save/update actions.
- Touching rollback-sensitive recording save/cleanup paths without focused rollback tests.

Safe splits if needed:

- `P3-05A duration-rules-domain`: pure helper extraction and unit tests only.
- `P3-05B duration-rules-service-adoption`: practice-session service rewiring and service tests.
- `P3-05C duration-summary-consumers`: Today Summary/P3-04 grouping adoption of a shared persisted-duration summarizer, if the consumer change is not tiny.

Do not silently expand P3-05A/B into event persistence, UI consistency work, analytics, or segment-duration behavior.
