# P3-04 Session History Grouping Plan

## Slice

- Slice id: `P3-04 session-history-grouping`
- Pack: `pack-3-sessions-continue-practice`
- Current scheduler status: `planning_in_progress`
- Product features:
  - `sessions.session-history-grouping`
  - `practice-session.segment-history`
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
  - Removed the production UI exception; P3-04 is locked to domain selector, service method, and repository/reload tests.
  - Fixed segment mode quick-session behavior: segment grouping includes a quick group so callers do not lose quick sessions.
  - Added an explicit `lookup-failed` target state and target-state priority for gateway failures.
  - Tightened local-day testing so an incorrect `startedAt.slice(0, 10)` implementation must fail.
  - Clarified reload evidence: when P3-04 has no production UI, Dexie repository/service reload tests are required and browser E2E is not required.
  - Added explicit deferred/split language so UI smoke cannot become an implicit P3-04 UI entrypoint.
- Remaining required changes after delta review: none.
- Implementation is allowed after the delta review, while preserving the reviewed boundary: no UI, no status edits by coding, no Dexie schema/migration/index, no P3-05 duration, no Home/Continue Practice routing, and no durable event persistence.

## Implementation Evidence

- Implemented the reviewed selector/service/reload boundary only.
- Changed production scope stayed within:
  - `src/domain/practice/session-history-groups.ts`
  - `src/domain/practice/index.ts`
  - `src/services/practice-session/types.ts`
  - `src/services/practice-session/service.ts`
  - `src/infrastructure/db/browser-practice-session-service.ts`
- Added grouped history read behavior for date, sheet, and segment modes.
- Segment mode includes a quick group with `targetState: "quick"`.
- Gateway failures are contained as `targetState: "lookup-failed"` rather than being mislabeled as deleted or missing.
- Date grouping uses browser-local calendar fields, and tests include a case that would fail under `startedAt.slice(0, 10)`.
- Reload evidence is covered by Dexie-backed repository/service tests for quick, sheet/no-segment, sheet/segment, legacy missing `segmentContext`, and malformed non-null row filtering.
- No production UI, package, dependency, Dexie schema/index/migration/backfill, durable event persistence, event replay, P3-05 duration recomputation, Home, Continue Practice routing, recording artifact, waveform, timing, reference playback, or MediaRecorder changes were added.
- Internal read-only review result: `PASS`.
- Independent verification result: initial `FAIL` only for scheduler-owned status bookkeeping being present in the dirty tree; after temporarily removing that status delta, delta verification returned `PASS` for the implementation.
- Local verification passed:
  - `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-history-groups.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts` -> 3 files / 48 tests passed.
  - `& .\scripts\npm-local.ps1 --% run typecheck` -> passed.
  - `& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/session-history-groups.ts src/domain/practice/index.ts src/services/practice-session/types.ts src/services/practice-session/service.ts src/infrastructure/db/browser-practice-session-service.ts tests/unit/practice-session-history-groups.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts` -> passed.
  - `git diff --check` -> passed with CRLF warnings only.

## Refined Scope

Build a local session-history grouping source that reads existing local session rows and returns deterministic groups by browser-local practice date, sheet, and segment snapshot. This slice should create the service/selector boundary that later Home, Continue Practice, and full history UI slices can consume.

P3-04 should be small and reviewable:

- Add pure grouping domain/selectors for `PracticeSession[]`.
- Add a narrow practice-session service method that returns grouped local session history.
- Resolve live sheet and segment availability only enough to label groups and mark stale/deleted references honestly.
- Reuse P3-03 `PracticeSession.segmentContext` snapshots for segment grouping.
- Preserve P3-01/P3-02 event boundaries: captured events are still non-durable and are not replayed.
- Add focused unit and repository/service integration tests.
- Keep production UI completely out of this slice.

The implementation is a selector/service boundary only. A full grouped history screen, route, filters toolbar, existing visible history host extension, grouped row/label display, Home card, sidebar entry, or navigation workflow belongs to a later explicit UI slice after its own plan review.

## Explicit Out Of Scope

- P3-05 duration rules or any new duration calculation from event pairs.
- Durable event persistence, event repository, event replay, event table, Dexie migration, or storing events on sessions.
- Home recent activity source/UI, dashboard analytics, streaks, goals, or Continue Practice target ranking/routing.
- Navigation to a segment practice context. P3-04 may expose whether a segment target is currently valid, but it must not route to it.
- Broad or narrow production session history UI, grouped rows/labels, existing visible surface extension, new app route, command palette entries, Home card, sidebar entry, or responsive visual redesign.
- Analytics scoring, quality metrics, detected mistakes, automatic score following, or inferred practice quality.
- Cloud sync, login, cross-device merge, backup conflict handling, or v2 continuity fields.
- New package dependencies.
- New Dexie stores, indexes, schema versions, migrations, backfills, cleanup jobs, or a `segmentSessions` child table.
- Mutating sessions, recordings, sheets, or segments while grouping.
- Using live segment records to rewrite historical `segmentContext` snapshots.

If any out-of-scope item appears necessary, stop and return to planning.

## Likely Files And Areas

Primary source boundary:

- `src/domain/practice/session-history-groups.ts` or a similarly named domain module
  - Define grouping output types and pure grouping helpers.
  - Reuse `PracticeSession`, `SheetRecordingSegmentContext`, and the existing browser-local-day behavior from `src/domain/practice/rules.ts`.
- `src/domain/practice/index.ts`
  - Export the new types/helpers if local conventions require it.
- `src/services/practice-session/types.ts`
  - Add read-only gateway types for optional live sheet/segment labels and availability.
  - Add `getSessionHistoryGroups` or a similarly named service method.
- `src/services/practice-session/service.ts`
  - Implement the read-only service method by calling `repository.listSessions()` and optional gateways.
  - Do not change existing write methods.
- `src/infrastructure/db/browser-practice-session-service.ts`
  - Wire existing sheet library and practice segment services only as read gateways if the service method needs browser live-target checks.

Likely tests:

- `tests/unit/practice-session-history-groups.test.ts` for pure grouping semantics.
- `tests/unit/practice-session-service.test.ts` for service joins and stale/missing target behavior.
- `tests/unit/practice-session-repository.test.ts` only if reload evidence is best proven through existing Dexie session rows.
- No browser E2E files are expected for P3-04 because this plan has no production UI. Dexie repository/service reload tests are the required reload evidence.

Avoid editing `src/app/`, `src/components/home/`, any visible UI component, and new route files in P3-04. If grouped history display is needed, stop and plan a later UI slice.

## Data Contracts And Grouping Semantics

The grouping source should expose a deterministic, local-only read model close to:

```ts
type SessionHistoryGroupingMode = "date" | "sheet" | "segment";

type SessionHistoryGroupTargetState =
  | "valid"
  | "lookup-failed"
  | "missing-sheet"
  | "missing-segment"
  | "no-segment"
  | "quick";

type SessionHistoryGroup = {
  id: string;
  mode: SessionHistoryGroupingMode;
  label: string;
  sortKey: string;
  targetState: SessionHistoryGroupTargetState;
  sheetId: string | null;
  sheetName: string | null;
  segmentId: string | null;
  segmentName: string | null;
  localDate: string | null;
  sessionCount: number;
  recordingCount: number;
  durationMs: number;
  latestUpdatedAt: string | null;
  sessions: PracticeSession[];
};
```

Exact names may follow local style, but the behavior must be stable:

- All groups are derived from parsed `PracticeSession` rows returned by the existing repository.
- Sort sessions within each group by existing recent-activity semantics: newest `updatedAt || startedAt` first, with deterministic id tiebreakers where needed.
- Sort groups by newest contained session first by default; for date groups, newest local date first.
- `sessionCount` is the number of included sessions.
- `recordingCount` is the sum of session `recordingCount`; do not query recordings to correct it in P3-04.
- `durationMs` is the sum of existing session `durationMs`; do not recompute active duration or implement P3-05 rules.
- `latestUpdatedAt` is the newest valid `updatedAt || startedAt` among contained sessions, or `null` when none parse.
- Invalid timestamps should not crash grouping; they sort last and use a clear fallback label.
- Do not mutate, normalize, or save sessions while building groups.

Target-state priority must be deterministic:

1. Quick sessions group with `targetState: "quick"`.
2. In segment mode, sheet sessions without `segmentContext` group with `targetState: "no-segment"`.
3. Sheet sessions with missing or blank `sheetId` group with `targetState: "missing-sheet"`.
4. If a live sheet or segment gateway throws/rejects before target existence can be known, group with `targetState: "lookup-failed"` rather than pretending the target is deleted.
5. If the sheet lookup succeeds and the sheet is missing, group with `targetState: "missing-sheet"`.
6. If the sheet exists but the segment lookup succeeds and the segment is missing, group with `targetState: "missing-segment"`.
7. If both live sheet and live segment checks succeed, group with `targetState: "valid"`.

### Date Groups

- Group by browser-local calendar date based on `session.startedAt`, matching the existing `isBrowserLocalDay` policy.
- Add or reuse a helper that returns a local date key in `YYYY-MM-DD` format from a valid timestamp.
- Date grouping must use the browser/runtime local timezone, not UTC slicing of ISO strings.
- Sessions with invalid `startedAt` go into an `unknown-date` group with an honest label and sort last.
- Date groups include quick sessions, sheet sessions, no-segment sessions, and segment-linked sessions.

### Sheet Groups

- Quick sessions group under one quick-practice group with `sheetId: null`, `targetState: "quick"`, and no sheet lookup.
- Sheet sessions group by `session.sheetId`.
- Sheet sessions with missing or blank `sheetId` group under a missing-sheet/unknown-sheet group and must not become quick sessions.
- For live sheets that still exist, use the current sheet name for the group label.
- For deleted/missing sheets, keep the sessions visible with `targetState: "missing-sheet"` and a fallback label such as `Deleted sheet` or the sheet id. Do not drop them.
- If a session snapshot has a segment but its sheet is missing, the sheet group is still missing-sheet; segment grouping may still use the historical segment snapshot.

### Segment Groups

- Only sheet sessions with non-null `segmentContext` and a non-empty `segmentContext.segmentId` group as segment groups.
- Group by the historical pair `{ sheetId, segmentContext.segmentId }` to avoid mixing same-id segments across sheets.
- Use `segmentContext.segmentName` as the historical display label by default.
- If the live segment still exists under the same sheet, mark the group `targetState: "valid"`. The label may include the live name only if the output also preserves the historical snapshot name; do not silently rewrite history.
- If the live segment is deleted or cannot be loaded, keep the group with `targetState: "missing-segment"` and the historical snapshot label.
- Sheet sessions with `segmentContext: null` group under a no-segment sheet group with `targetState: "no-segment"`.
- Quick sessions appear in a separate quick group in segment mode with `targetState: "quick"` so callers do not lose sessions when changing grouping mode.
- Segment grouping is a summary of latest committed segment snapshot on a session. It is not proof that all session time belongs to that segment.

## Stale Or Deleted Sheet And Segment Behavior

- Missing sheet records must never hide local session history.
- Missing segments must never hide local session history.
- Deleted or renamed segments must not cause old session snapshots to be rewritten.
- Group output should distinguish:
  - historical snapshot label, from `session.segmentContext.segmentName`;
  - live target validity, from optional current sheet/segment lookup;
  - navigation eligibility, as a boolean or `targetState`.
- If live lookup fails because a gateway throws or rejects, contain the failure and return groups with `targetState: "lookup-failed"` rather than failing the whole history read or mislabeling the target as deleted.
- P3-04 may expose target validity for later UI, but must not perform navigation or Continue Practice target resolution.

## Local-Day And Timezone Boundary Conditions

- Date grouping must be tested with timestamps that fall on different local dates even when their UTC date strings are adjacent.
- Do not group by `iso.slice(0, 10)` unless the code first proves that this is a local date string. ISO `Z` timestamps must be converted through `Date`.
- Tests should inject or construct local `Date` values using `new Date(year, monthIndex, day, hour, minute)` and compare generated local keys.
- The test plan must include at least one strategy that fails under an incorrect `startedAt.slice(0, 10)` implementation, even when CI runs in UTC:
  - force a non-UTC timezone for the relevant unit test process; or
  - construct offset-bearing ISO timestamps where the string date differs from the runtime local calendar date; or
  - unit-test the local-date helper directly and assert it derives the key with `Date#getFullYear`, `Date#getMonth`, and `Date#getDate`, not string slicing.
- Around midnight, a session at local `23:59` and a session at local `00:01` must land in different date groups.
- Invalid or unparsable timestamps must not throw and must not be counted as today.
- Daylight-saving transitions should be handled by the browser/runtime `Date` calendar fields; do not add custom timezone libraries.

## Empty, Legacy, No-Segment, And Quick Cases

- Empty repository result returns an empty group list plus any existing empty-state metadata the helper defines. It must not create placeholder persisted rows.
- Legacy rows without `segmentContext` are already parsed as `segmentContext: null`; grouping should treat them as no-segment sessions.
- Malformed non-null `segmentContext` rows are filtered by existing parse/repository behavior and should not be resurrected by grouping.
- Quick sessions:
  - appear in date grouping;
  - appear in a quick group for sheet grouping;
  - appear in a quick group for segment grouping.
- Sheet sessions without a segment:
  - appear in date grouping;
  - appear in their sheet group;
  - appear in a no-segment group in segment mode.
- Sessions without recordings are valid practice history and must appear.
- Sessions with `durationMs: 0` are valid and must not be filtered out.

## Acceptance Criteria

1. A new local session-history grouping source returns deterministic groups by date, sheet, and segment from existing parsed `PracticeSession` rows.
2. The grouping source reuses existing session repositories and P3-03 `segmentContext` snapshots without adding stores, indexes, migrations, event persistence, or a segment-session child table.
3. Date grouping uses browser-local day semantics and handles invalid timestamps with an honest fallback group.
4. Sheet grouping includes quick sessions, valid sheet sessions, and missing/deleted sheet sessions without mutating or dropping history.
5. Segment grouping uses historical `segmentContext` snapshots, keeps no-segment sessions visible, and handles deleted/missing segments safely.
6. Group summaries include stable counts, summed existing duration, summed existing recording count, newest session ordering, and deterministic group ids.
7. The service method contains live sheet/segment lookup failures and returns explicit `lookup-failed` target states.
8. Legacy sessions, no-segment sessions, quick sessions, zero-duration sessions, and sessions without recordings are covered by tests.
9. Reload/persistence evidence proves saved session rows with and without segment context group the same way after reopening local storage.
10. No Home recent activity, Continue Practice routing, P3-05 duration rules, production UI, package, DB schema, or status-file changes are included in the coding pass.

## Test Coverage Plan

Unit tests for pure grouping:

- Empty input returns no groups.
- Date grouping creates separate local-day groups across a local midnight boundary.
- Date grouping does not use UTC string slicing.
- Invalid `startedAt` lands in an unknown-date group and sorts last.
- Sheet grouping creates:
  - a quick-practice group;
  - a valid sheet group;
  - a missing-sheet group.
- Segment grouping creates:
  - a valid segment group using `{sheetId, segmentId}`;
  - a missing/deleted segment group that keeps the historical label;
  - a no-segment group for sheet sessions with `segmentContext: null`;
  - a quick group for quick sessions with `targetState: "quick"`.
- Multiple sessions in the same group are sorted newest first.
- Group ids are deterministic and encode ids safely, using an existing encode pattern such as the recordings take-group helper if useful.
- `durationMs`, `recordingCount`, `sessionCount`, and `latestUpdatedAt` summarize existing session fields without recomputing duration.
- Same `segmentId` under two sheets does not merge into one group.
- Renamed live segment does not erase historical snapshot name.

Service/integration tests:

- `getSessionHistoryGroups("date" | "sheet" | "segment")` reads from `repository.listSessions()` and does not call save/delete/update methods.
- Valid live sheet and segment gateways mark groups valid.
- Missing sheet returns a visible missing-sheet group.
- Missing segment returns a visible missing-segment group.
- Gateway throw/reject returns `lookup-failed` groups instead of throwing for the whole read or mislabeling targets as deleted.
- Legacy sessions without `segmentContext` group as no-segment.
- `captureSessionEvent` output is not queried or replayed.
- Existing `getTodaySummary`, `getRecentSession`, and `getContinuePracticeTarget` behavior remains unchanged.

Repository/reload tests:

- Save valid quick, sheet/no-segment, and sheet/segment sessions through the existing Dexie repository.
- Reset/reopen the Dexie connection.
- Verify grouping output after reload matches pre-reload grouping for date, sheet, and segment modes.
- Seed a legacy row without `segmentContext` and verify it groups as no-segment after reload.
- Seed a malformed non-null `segmentContext` row and verify existing repository filtering keeps it out of grouping.

Browser E2E:

- Not required for P3-04 because this slice has no production UI.
- Reload evidence must come from Dexie repository/service integration tests.
- Playwright display/reload coverage belongs to a later UI slice or only to a separate reviewed change that actually adds a visible grouped history surface.
- Do not add grouped rows, labels, a new route, an existing history host extension, or responsive QA in P3-04.

Negative cases:

- Missing sheet id on a sheet session.
- Deleted sheet.
- Deleted segment.
- Gateway lookup failure.
- Segment id collision across sheets.
- Invalid timestamp.
- Zero-duration session.
- Session without recordings.
- Attempted grouping implementation that writes or mutates sessions.

## Verification Commands

Recommended focused commands for the coding agent:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-history-groups.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/session-history-groups.ts src/domain/practice/index.ts src/services/practice-session/types.ts src/services/practice-session/service.ts src/infrastructure/db/browser-practice-session-service.ts tests/unit/practice-session-history-groups.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
git diff --check
```

Adjust the lint list to exactly match changed files. Do not run or add broad E2E solely to claim visual coverage. P3-04 has no production UI, so focused unit/integration/reload tests are the expected verification surface.

The coding agent must report:

- Changed file list.
- Confirmation that `docs/v1/status.json` was not changed.
- Confirmation that no package files, Dexie schema/index/migration, event repository, duration selector, Home UI, Continue Practice routing, new route, or broad UI was added.
- Focused unit/integration/reload test output.
- Typecheck output.
- Lint output for changed files.
- `git diff --check` output.

## Model Tier And Handoff Notes

Use Tier B with extra-high effort for coding, review, and verification:

- Coding agent: `gpt-5.5`, extra-high effort, standard speed
- Review agent: `gpt-5.4-mini`, extra-high effort, standard speed
- Verification agent: `gpt-5.4-mini`, extra-high effort, standard speed

Reason:

- This is local persistence/service-boundary read behavior with repository reload and stale local-target semantics.
- It should not touch media, recording internals, waveform, timing, destructive cleanup, migration, or broad UI.
- The user explicitly instructed future coding agents to use `gpt-5.5` extra-high standard.

Do not escalate this P3-04 implementation to Tier C by adding UI. If grouped history UI is required, stop and create a separate reviewed UI slice. Escalate to Tier E only if a Dexie migration, index, cleanup, or data-rewriting operation becomes necessary; in that case, stop and return to planning first.

Coding handoff:

- Start by reading this plan, `docs/v1/START-HERE.md`, `docs/v1/implementation-slices/03-sessions-continue-practice.md`, `docs/v1/implementation-slices/plans/P3-01-session-event-model.md`, `docs/v1/implementation-slices/plans/P3-02-session-event-capture.md`, `docs/v1/implementation-slices/plans/P3-03-segment-session-metadata.md`, `docs/v1/05e-session-integration.md`, `docs/v1/08-practice-session.md`, `docs/v1/remaining-feature-contracts.md`, `docs/v0/project-structure.md`, and `docs/v0/tech-stack-decisions.md`.
- Inspect only the current practice-session domain/service/repository, sheet gateway, practice-segment service, and focused tests needed for this grouping source.
- Implement the selector/service boundary before considering any UI.
- Keep grouping read-only. No method in this slice may save, delete, backfill, or rewrite sessions.
- Reuse existing local-day/date helpers, `sortSessionsByRecentActivity`, session validation/repository behavior, `segmentContext` snapshots, sheet library service, practice segment service, and recordings review grouping/id patterns where they fit.
- Do not add package dependencies.
- Do not edit `docs/v1/status.json`.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Duration rules from event pairs, active intervals, or incomplete pairs | `P3-05 session-duration-rules` |
| Home recent activity source and UI | `P3-06`, `P3-07` |
| Continue Practice target construction, stale target rejection, and segment navigation | `P3-08`, `P3-09` |
| Goal completion and dashboard analytics | `P3-10` through `P3-15` |
| Full grouped session-history UI with filters, responsive QA, and navigation | Future explicit UI slice |
| Any grouped rows/labels, existing history host extension, route/sidebar/Home entry, or UI smoke coverage | Future explicit UI slice |
| Durable session event repository, event replay, or event migration | Future explicit persistence slice |
| Segment duration partitioning or multi-segment session timeline | Future explicit segment-session slice |
| Segment-session child table or indexed segment query optimization | Future planning only if selector performance requires it |
| Cross-device sync, cloud merge, login, backup conflict resolution | v2 |

## Split Triggers

Stop and return to planning if implementation requires:

- More than roughly 500 lines of production code excluding focused tests.
- Any new Dexie table, index, schema version, migration, or data backfill.
- Any event persistence, event replay, or session duration calculation.
- Any new route or broad user-facing grouped history UI.
- Any narrow production UI, grouped rows/labels, existing history host extension, route/sidebar/Home entry, or browser UI smoke test.
- Home recent activity, dashboard analytics, Continue Practice routing, goals, or command palette changes.
- Recording artifact, waveform, metronome timing, reference playback, or MediaRecorder changes.
- A segment-session child table or multi-segment timeline model.
- Broad repository rewrites or shared architecture refactors.

Safe splits if needed:

- `P3-04A session-history-grouping-selectors`: pure grouping helpers and unit tests only.
- `P3-04B session-history-grouping-service`: service/gateway joins, stale target states, and reload tests.
- `P3-04C session-history-grouping-ui`: compact visible history UI and Playwright/responsive verification.

Do not silently expand P3-04A/B into P3-04C.
