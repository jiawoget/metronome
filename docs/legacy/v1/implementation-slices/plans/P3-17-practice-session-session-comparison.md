# P3-17 Practice Session Session Comparison Plan

## Slice

- Slice id: `P3-17 practice-session-session-comparison`
- Source feature: `practice-session.session-comparison`
- Acceptance pack: Pack 3, Sessions / Continue Practice
- Product contract: `docs/v1/08-practice-session.md` and `docs/v1/remaining-feature-contracts.md`
- Slice file: `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- Current dependency state: P3-01 through P3-16 are verified in `docs/v1/status.json`; P3-17 is `not_started`.
- Planning model: `gpt-5.5`, medium effort, standard speed.
- Coding/review/verification tier: Tier C - User-Facing UI With Browser E2E.

## External Plan Review Gate

- This planning pass only writes the durable plan file.
- Leave `docs/v1/status.json` unchanged.
- Before coding, the scheduler must send this complete plan text, uncompressed, through the logged-in web ChatGPT `metronome` project review gate in Chinese and incorporate required changes.
- Do not mark this slice `ready_for_coding` until that review gate passes.
- Coding must happen in a fresh coding agent using this reviewed plan.
- After coding, a separate `gpt-5.5` extra-high code review agent must review the implementation before a PR is opened or marked ready.
- Final PR review goes to web ChatGPT in the logged-in `metronome` project; address required feedback before merge.
- Pre-merge E2E must pass after PR feedback is addressed and before merge.

## Context Read

Planning was based on these repo sources:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- `docs/v1/implementation-slices/product-feature-map.md`
- `docs/v1/01-app-shell-home.md`
- `docs/v1/08-practice-session.md`
- `docs/v1/remaining-feature-contracts.md`
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- relevant P3-08 through P3-16 plan files
- current `src/domain/practice`, `src/services/practice-session`, `src/hooks/use-practice-session-dashboard.ts`, `src/components/home/home-dashboard.tsx`, App Shell, Continue Practice, recordings comparison references, and focused tests.

## Refined Goal

P3-17 adds a compact local session comparison experience that lets the user select two to three persisted practice sessions and compare honest metadata side by side. The comparison must use only local persisted data already available through practice-session and recording metadata boundaries. It must avoid scoring, ranking, recommendations, waveform/audio comparison, automatic analysis, or fake event detail.

The primary slice should be small enough for one reviewed PR:

1. Add a read-only comparison candidate/result model over persisted sessions and sheet recording metadata.
2. Expose a narrow `PracticeSessionService` read method for session comparison data.
3. Render a compact Home/Practice Session comparison region using that service data.
4. Verify selection, comparison, empty/missing data, reload, and responsive behavior.

If implementation starts needing a dedicated session-history route, durable event repository, charting/trend analytics, or broad Home/App Shell refactors, stop and split rather than expanding this slice.

## Contract Interpretation

`practice-session.session-comparison` says:

- Purpose: compare sessions using local metadata.
- Scope: compare duration, events, recordings, sheets, segments, and goals where data exists.
- Out of scope: skill scoring, audio comparison, automatic recommendations.
- User path: select sessions, then compare local metadata.
- Boundary: reads sessions and related metadata, owns comparison selection, must not mutate sessions.

Current code has durable `PracticeSession` rows, sheet recording metadata rows, session history grouping, Home dashboard reads, Continue Practice targets, and local goal evaluation. Current code does not expose durable event-list reads beyond event capture validation/sink behavior. Therefore P3-17 must interpret "where data exists" literally:

- Compare persisted session duration, source type, started/ended/updated timestamps, BPM, time signature, recording count, latest recording id, sheet id/name where resolvable, and segment snapshot metadata.
- Compare related sheet recording metadata counts and summaries for selected sessions.
- Compare goal-relevant contribution labels only when they can be derived without per-session goal attribution claims, for example whether the session contributes minutes/sessions and how many sheet takes are linked. Do not claim "this session completed goal X" unless a verified service already supports per-session goal attribution, which it currently does not.
- Event comparison in the primary slice should be an honest unavailable/unsupported state unless a durable event read repository already exists by coding time. Do not add event persistence, replay, or backfill in P3-17.
- Do not compare audio, waveform, detected mistakes, timing quality, pitch, onset accuracy, or practice quality.

## Primary Scope

P3-17 owns:

- A pure session comparison read model, likely in `src/domain/practice/session-comparison.ts`.
- A service method, likely `getSessionComparison(options?)`, that reads:
  - `PracticeSessionRepository.listSessions()`;
  - `PracticeRecordingMetadataRepository.listRecordingMetadata()`;
  - existing sheet/segment gateways for labels and stale-state resolution only if needed.
- A bounded comparison candidate list, sorted newest first, from valid persisted local sessions.
- UI selection state for two to three sessions.
- A compact comparison panel on Home near existing practice-history panels, or a similarly small existing practice-session surface if available at coding time.
- Metadata comparison rows/cards for selected sessions:
  - source type;
  - start/update time;
  - duration;
  - BPM;
  - time signature;
  - recordings count;
  - linked sheet;
  - linked segment/range;
  - local goal contribution indicators;
  - event availability state.
- Empty, loading, error, missing/stale sheet, missing/stale segment, one-selected, max-selected, and reload states.
- Unit tests for pure comparison model and service read behavior.
- Component/hook tests for selection and rendering states.
- Browser E2E for select/compare/reload/responsive behavior using existing persisted-session and recording-metadata test helpers.

## Explicit Non-Goals

P3-17 must not implement:

- Skill scoring, quality scores, rankings, "best session", "improved/worse" claims, automatic recommendations, AI interpretation, mistake detection, or predictive analytics.
- Audio comparison, waveform comparison, recording artifact decode, media blob reads, reference alignment, onset detection, or analysis engine use.
- Durable event persistence, event replay, event timeline backfill, new event tables, event migrations, or synthetic event fixtures presented as real history.
- New goal storage, goal writeback, per-session goal attribution, goal completion mutation, goal create/edit/delete UI, or goal command palette actions.
- New session storage schema, Dexie migration, localStorage key, backfill, cleanup, import/export, settings storage summary, package, lockfile, or config changes.
- Dedicated top-level route, App Shell navigation item, command-palette command, sidebar/bottom-nav entry, or route framework change.
- Recent Activity row interactivity, Continue Practice ranking/navigation changes, Home analytics/streak/goal rewrites, or command palette changes.
- Recording review comparison, take history comparison, waveform comparison, marker comparison, or recordings page behavior changes.
- Direct IndexedDB/Dexie reads from React components or hooks.
- `docs/v1/status.json` edits.

If any non-goal appears necessary, stop and return to planning or use one of the safe splits below.

## Safe Split Proposal

The full product phrase can grow quickly because it mentions events, recordings, sheets, segments, and goals. The primary P3-17 slice should stay narrow:

- `P3-17A session-comparison-metadata-source-and-home-ui`:
  - The primary slice described in this plan.
  - Compare persisted session and recording metadata only.
  - Render compact selection/comparison UI in an existing surface.

Only split if required by review or implementation blockers:

- `P3-17B session-comparison-dedicated-history-route`:
  - Add a dedicated route/detail surface if Home becomes too crowded or routing is required.
- `P3-17C durable-session-event-comparison`:
  - Add event repository/read support and compare real durable events.
  - Requires separate plan review because it changes storage/source boundaries.
- `P3-17D goal-attribution-comparison`:
  - Add verified per-session goal attribution if product wants exact goal contribution.
  - Requires separate plan review because current P3-10/P3-14 evaluation is aggregate, not session-attributed.

Do not silently combine these splits into the primary slice.

## Data And Read Model Shape

Prefer a pure model with names close to:

```ts
type SessionComparisonCandidate = {
  sessionId: string;
  label: string;
  sourceType: "quick" | "sheet";
  startedAt: string;
  updatedAt: string;
  sortTimestamp: string | null;
  durationMs: number;
  recordingCount: number;
  sheetId: string | null;
  sheetName: string | null;
  segmentId: string | null;
  segmentName: string | null;
  segmentRangeLabel: string | null;
  targetState: "quick" | "valid" | "missing-sheet" | "missing-segment" | "lookup-failed" | "no-target";
};

type SessionComparisonMetric = {
  key: string;
  label: string;
  values: Array<{
    sessionId: string;
    text: string;
    tone: "neutral" | "muted" | "warning";
  }>;
};

type SessionComparisonResult = {
  generatedAt: string;
  candidates: SessionComparisonCandidate[];
  selectedSessionIds: string[];
  comparedSessions: SessionComparisonCandidate[];
  metrics: SessionComparisonMetric[];
  unavailable: Array<{
    key: "events" | "goals" | "audio";
    label: string;
    reason: string;
  }>;
  limit: number;
  maxSelected: 3;
};
```

Exact names may vary, but the important boundaries are:

- The model contains display-ready local metadata, not raw repository rows passed directly into UI.
- The model compares selected sessions by id and ignores ids not found in current persisted rows.
- Candidate labels must be human-readable without icons or color.
- Missing sheet/segment states are represented honestly and never upgraded to valid links.
- `events` can appear only as unavailable unless durable event records are read from an existing verified repository.
- `goals` can appear only as broad contribution context unless per-session goal attribution already exists.
- The result contains no score, rank, recommendation, improvement percentage, or audio-derived value.

## Candidate And Selection Rules

- Candidate source is persisted `PracticeSession[]`.
- Sort candidates newest first by `updatedAt || startedAt`, with deterministic `session.id` tie-breaker.
- Default limit should be small, likely 8 to 12 candidates.
- Empty sessions return an empty candidate list and an honest empty UI state.
- Selectable sessions include quick and sheet sessions.
- Default selection should be empty, or optionally the two newest sessions only if the UI clearly still lets the user choose. Prefer empty selection if that keeps behavior simpler and avoids implied recommendations.
- User can select exactly two or three sessions for comparison.
- With one selected session, show a compact prompt such as `Select another session to compare.`
- Once `maxSelected` is reached, additional unchecked sessions are disabled until one selected session is unchecked.
- If a selected session disappears after reload/refresh, remove it from selection and show current persisted candidates only.
- Selection is UI state only. Do not persist selected sessions in storage.

## Comparison Metrics

Required metadata rows:

- `Session type`: Quick practice or Sheet practice.
- `Started`: formatted timestamp.
- `Last updated`: formatted timestamp.
- `Duration`: formatted from persisted `durationMs`.
- `BPM`: persisted BPM or `Not set`.
- `Time signature`: persisted value or `Not set`.
- `Recordings`: persisted `recordingCount`, plus linked sheet recording metadata count when available.
- `Sheet`: sheet name/id, `Quick metronome`, or missing/lookup-failed state.
- `Segment`: segment name/range, `Whole sheet / no segment`, `Quick metronome`, or missing/lookup-failed state.
- `Goal contribution`: conservative text such as `Counts as 1 session`, `Adds N min`, and `N sheet takes linked`; no goal-completion attribution.
- `Events`: `Event details not available yet` unless a durable event read repository already exists.

Formatting rules:

- Use persisted `durationMs`; do not recompute duration from timestamps.
- Use existing formatting helpers if available. If a small local formatter is needed, keep it UI-local or domain-local and tested.
- Do not use color to imply better/worse.
- Warning tone is allowed only for missing/stale/unavailable metadata, not for performance quality.
- Do not show deltas as improvement claims. If deltas are shown, keep them factual, for example `+2 min duration`, not `better`.

## Reuse Constraints And Boundaries

The coding agent must reuse:

- `PracticeSessionService` as the read boundary.
- Existing `PracticeSessionRepository.listSessions()`.
- Existing `PracticeRecordingMetadataRepository.listRecordingMetadata()` for linked sheet recording metadata.
- Existing sheet and segment gateway resolution patterns from `getSessionHistoryGroups()` / recent activity / Continue Practice where needed.
- Existing local-day/duration semantics from current practice rules.
- Existing Home hook guarded refresh pattern if the comparison panel is placed on Home.
- Existing Home card/region styling, compact rows, and responsive patterns.
- Existing E2E storage helpers/fixtures for sessions, sheets, segments, and recording metadata.

The coding agent must not:

- Read Dexie/IndexedDB directly from UI or hook code.
- Create a second practice-session repository or analytics subsystem.
- Rebuild Continue Practice target ranking or recent activity semantics.
- Import recordings review waveform/audio comparison services into session comparison.
- Couple comparison selection to command palette state.
- Add dependencies.

## UI And State Behavior

Recommended primary UI:

- Add a compact `Session Comparison` region on Home after `Practice Goals` or near `Recent Activity`.
- Render a candidate checklist/list with up to the bounded limit of recent sessions.
- Render selected comparison metadata in two or three columns on desktop/tablet and stacked cards on mobile.
- Keep Quick Metronome, Continue Practice, Today Summary, Practice Analytics, Practice Streaks, Practice Goals, Recent Activity, and utility links visible and usable.
- Do not create nested cards. Use one region/card and plain inner rows/divs.
- Use short copy:
  - `Session Comparison`
  - `Select sessions to compare`
  - `Select another session to compare.`
  - `Up to 3 sessions can be compared.`
  - `No local sessions yet.`
  - `Session comparison could not be loaded.`
- Loading and service errors are contained to the comparison region.
- A comparison read failure must not hide Home primary entries or existing panels.
- Selection state is reset or sanitized when candidate ids change.
- Reload should reproduce candidate data from persisted sessions; selected UI state does not need to persist.

If Home becomes visually crowded or requires more than a compact panel, split to `P3-17B` for a dedicated route instead of forcing a large Home redesign.

## Accessibility Requirements

- The comparison region must have `role="region"` and an accessible name such as `Session Comparison`.
- Candidate controls should be real checkboxes or buttons with pressed state; prefer checkboxes because selection is binary.
- Each candidate control needs a meaningful accessible name including session type and label.
- Selected-session columns/cards must have headings.
- Metric labels must be visible text and not icon-only.
- Missing/unavailable states must be text, not color alone.
- Keyboard users can select/unselect candidates and read comparison values in logical order.
- Do not use nested interactive elements inside candidate rows.
- Loading/error states should use contained `role="status"` where appropriate.

## Responsive Requirements

Verification must cover:

- Desktop width around 1280 px.
- Tablet width around 1024 px.
- Mobile width around 390 px.
- Resize/no-horizontal-overflow behavior.

The UI must:

- Avoid clipped labels, overlapping metric values, and horizontal overflow.
- Stack selected-session comparison cards cleanly on mobile.
- Let long sheet/segment names wrap or truncate cleanly without hiding controls.
- Keep row/control dimensions stable when selecting/unselecting sessions.
- Preserve primary practice actions and Home density.

## Risk And Edge Cases

- No sessions exist.
- Only one session exists.
- More than three sessions exist.
- Duplicate timestamps require deterministic sorting.
- Invalid timestamps should not crash; sort last and show `Unknown time`.
- Zero, negative, or invalid durations should display conservatively, not as performance claims.
- Quick sessions have no sheet/segment.
- Sheet session has blank/missing `sheetId`.
- Sheet lookup fails.
- Sheet is deleted/missing.
- Segment context exists but segment id is blank.
- Segment lookup fails.
- Segment is deleted/missing.
- Session has `recordingCount` but no matching recording metadata.
- Recording metadata exists for a selected session.
- Recording metadata exists with a missing linked session; it should not create a comparison candidate by itself.
- Goal service/evaluation is unavailable; comparison still works with conservative contribution text.
- Event details are unavailable because no durable event list exists.
- Refresh happens while selections are active; selected ids are sanitized.
- Existing Home dashboard reads must remain independent.

## Likely Production Files

Expected production files:

- `src/domain/practice/types.ts`
  - Add session comparison types only if they belong with shared practice contracts.
- `src/domain/practice/session-comparison.ts`
  - New pure selector/read-model helpers for candidates, selected comparison, metric rows, formatting-safe value normalization, and unavailable-state construction.
- `src/domain/practice/index.ts`
  - Export the new session-comparison module if needed.
- `src/services/practice-session/types.ts`
  - Add a narrow read method such as `getSessionComparison(options?)`.
- `src/services/practice-session/service.ts`
  - Implement the read by composing existing session and recording metadata reads, plus target label resolution if needed.
- `src/hooks/use-practice-session-dashboard.ts`
  - If the UI is on Home, add contained comparison read state using the existing latest-refresh guard.
- `src/components/home/home-dashboard.tsx`
  - If the UI is on Home, add the compact `SessionComparisonPanel`.

Possible production files only if justified:

- `src/components/home/session-comparison-panel.tsx`
  - Use only if extracting the panel keeps `home-dashboard.tsx` readable. Keep it Home-local.
- `src/domain/practice/format.ts`
  - Only for shared formatting if an existing helper is insufficient.

Avoid editing:

- `docs/v1/status.json`
- package files and lockfiles
- Dexie schema/storage contracts/repositories
- recording artifact, waveform, media, audio, analysis, and playback code
- recordings review comparison panels, unless only read as visual reference
- command palette files
- App Shell navigation files
- settings/import/export/cleanup files

## Likely Test Files

Expected tests:

- `tests/unit/session-comparison.test.ts`
  - New pure selector/model tests.
- `tests/unit/practice-session-service.test.ts`
  - Service read, read-only behavior, lookup containment, and recording metadata joins.
- `tests/unit/home-dashboard.test.tsx`
  - If Home UI is used, component/hook state, selection behavior, error containment, accessibility names, and existing Home regression coverage.
- `tests/e2e/app-shell-home.spec.ts`
  - If Home UI is used, browser select/compare/reload/responsive coverage with persisted local data.

Possible tests only if needed:

- `tests/unit/practice-session-repository.test.ts`
  - Reload evidence if service tests do not cover persisted sessions/recordings.
- A focused E2E spec if `app-shell-home.spec.ts` becomes too large; still use existing helper patterns.

## Unit Test Plan

Pure model tests:

1. Empty sessions returns no candidates, no selected sessions, and honest empty state.
2. One session returns one candidate and no comparison metrics until another session is selected.
3. Two selected sessions produce comparison metric rows.
4. Three selected sessions are supported.
5. More than three selected ids are trimmed or rejected according to the final helper contract.
6. Unknown selected ids are ignored.
7. Candidates sort newest first with deterministic id tie-breaker.
8. Quick session displays Quick metronome sheet/segment values.
9. Sheet session displays sheet id/name when available.
10. Segment session displays segment name and range label from persisted snapshot.
11. Missing sheet and missing segment states are represented honestly.
12. Lookup failure states do not crash the model.
13. Recording metadata is counted only when linked by `sessionId`.
14. Metadata-only recordings with missing sessions do not create candidates.
15. Goal contribution text is factual and does not claim goal completion.
16. Event unavailable state appears when no durable event data is supplied.
17. No metric label or value contains score/rank/improvement wording.

Service tests:

1. `getSessionComparison()` reads sessions and recording metadata.
2. It performs no writes: no save/delete/clear/update duration/update last-practiced/recording save calls.
3. Sheet/segment lookup failures are contained in target states and do not reject the whole read unless the existing service pattern requires rejection.
4. Deleted/missing sheet and segment states are represented.
5. Linked sheet recording metadata counts/summaries are included for selected sessions.
6. Empty repositories return an empty comparison result.
7. Repository read failure rejects or is contained according to the final service contract; tests must lock the chosen behavior.
8. Existing `getSessionHistoryGroups()`, `getHomeRecentActivity()`, `getContinuePracticeTargets()`, `getHomeDashboardAnalyticsSource()`, and `getHomePracticeStreaks()` tests remain valid.

Home/component tests if Home UI is used:

1. Empty data renders `Session Comparison` and honest empty copy.
2. Loading state is contained.
3. Service error is contained and existing Home panels remain visible.
4. Candidate checkboxes render meaningful accessible names.
5. Selecting one session shows prompt to select another.
6. Selecting two sessions renders comparison metrics.
7. Selecting three sessions renders comparison metrics and disables unchecked candidates.
8. Unselecting a session re-enables candidates.
9. Missing sheet/segment states render as text.
10. Event unavailable state renders as text.
11. Long labels wrap without relying on snapshots.
12. Existing Continue Practice, Practice Analytics, Practice Streaks, Practice Goals, and Recent Activity assertions are not weakened.

## Browser E2E Plan

If implemented on Home, extend `tests/e2e/app-shell-home.spec.ts` with a focused scenario:

1. Clear relevant local data using established helpers.
2. Seed or create at least:
   - one quick session;
   - one sheet session;
   - one segment-linked sheet session;
   - one sheet recording metadata row linked to one selected session.
3. Navigate to Home.
4. Assert the `Session Comparison` region is visible.
5. Select the quick and sheet sessions.
6. Assert comparison metrics show session type, duration, recordings, sheet, segment, and event-unavailable text.
7. Add/select the segment session and assert three-session comparison works or max-selected state is respected.
8. Reload Home and assert candidates are still available from persisted data.
9. Select sessions again after reload and assert comparison metrics still derive from persisted data.
10. Check desktop, tablet, and mobile widths.
11. Run existing no-horizontal-overflow checks if helpers are available.
12. Keep console/page errors empty.

E2E must not:

- Seed synthetic comparison rows.
- Add product-only test APIs.
- Use real microphone hardware.
- Read or mutate production storage from app code.
- Assert score/rank/improvement/audio/waveform behavior.

If E2E uses Playwright Chromium, verification must report it as Playwright Chromium, not real Chrome.

## Acceptance Criteria

P3-17 is complete when:

1. The practice domain exposes a deterministic local session comparison read model for persisted session metadata.
2. `PracticeSessionService` exposes a read-only comparison method or equivalent narrow service boundary.
3. Users can select two to three local sessions in the UI and see a side-by-side metadata comparison.
4. Comparison derives only from local persisted sessions and related sheet recording metadata.
5. Duration, recordings, sheet, segment, goal contribution, and event availability are handled honestly.
6. Missing data, deleted/stale sheet or segment references, and lookup failures do not become enabled navigation or fake values.
7. No scoring, audio comparison, waveform comparison, automatic recommendations, event persistence, goal writeback, schema/package/status changes, or direct UI storage reads are added.
8. Empty, loading, error, one-selected, max-selected, reload, and responsive states are covered.
9. Existing Home, Continue Practice, recent activity, analytics, streak, goal, command palette, session history grouping, and recordings review behavior do not regress.
10. Focused unit/component tests, targeted browser E2E, typecheck, lint, and `git diff --check` pass.

## Verification Commands

Recommended focused commands for the coding agent:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/session-comparison.test.ts tests/unit/practice-session-service.test.ts tests/unit/home-dashboard.test.tsx
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/app-shell-home.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/types.ts src/domain/practice/session-comparison.ts src/domain/practice/index.ts src/services/practice-session/types.ts src/services/practice-session/service.ts src/hooks/use-practice-session-dashboard.ts src/components/home/home-dashboard.tsx tests/unit/session-comparison.test.ts tests/unit/practice-session-service.test.ts tests/unit/home-dashboard.test.tsx tests/e2e/app-shell-home.spec.ts
git diff --check
```

Adjust file names to match the actual implementation. Omit lint/test targets for untouched files, and include any extracted panel/helper files.

Recommended regression if service or Home hook behavior is touched broadly:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-history-groups.test.ts tests/unit/continue-practice-targets.test.ts tests/unit/home-dashboard.test.tsx tests/unit/app-shell.test.tsx
```

The coding agent must report:

- Changed file list grouped by production/test/docs.
- Confirmation that `docs/v1/status.json` was not changed.
- Confirmation that no schema/migration/package/media/event-persistence/audio-analysis/waveform/scoring/recommendation/command-palette scope was added.
- Confirmation that comparison data is read through `PracticeSessionService` and not direct UI storage access.
- Confirmation that event comparison is unavailable unless backed by a durable event read source.
- Confirmation that goal-related text is contribution-only and does not claim per-session goal completion.
- Focused unit/component output.
- Targeted E2E output, including whether browser coverage was Playwright Chromium or real Chrome.
- Typecheck output.
- Lint output for changed files.
- `git diff --check` output.

## Agent Assignments

Planning:

- Model: `gpt-5.5`
- Effort: medium
- Speed: standard

Coding:

- Model: `gpt-5.5`
- Effort: high
- Speed: standard
- Reason: Tier C UI integration with browser E2E, service/source reuse, and Home responsive risk.

Code review:

- Model: `gpt-5.5`
- Effort: extra-high
- Speed: standard
- Review scope: planned slice, changed files, source boundaries, no scoring/audio/event-persistence creep, UI accessibility/responsive behavior, and test coverage.

Verification:

- Model: `gpt-5.4-mini`
- Effort: high
- Speed: standard
- Verification scope: focused commands above plus source inspection and browser E2E evidence.

## Coding Handoff

Coding should read only:

- `docs/v1/START-HERE.md`
- this plan
- `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- `docs/v1/08-practice-session.md`
- `docs/v1/remaining-feature-contracts.md` practice-session session-comparison section
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- current `src/domain/practice/types.ts`
- current `src/domain/practice/session-history-groups.ts`
- current `src/domain/practice/session-events.ts`
- current `src/services/practice-session/types.ts`
- current `src/services/practice-session/service.ts`
- current `src/hooks/use-practice-session-dashboard.ts`
- current `src/components/home/home-dashboard.tsx`
- current `tests/unit/practice-session-history-groups.test.ts`
- current `tests/unit/practice-session-service.test.ts`
- current `tests/unit/home-dashboard.test.tsx`
- current `tests/e2e/app-shell-home.spec.ts`

Keep the patch small. If implementation appears to require a dedicated route, event repository, schema migration, audio/waveform work, command palette integration, per-session goal attribution, or more than roughly 300-450 production LOC excluding tests, stop and return to planning with the exact blocker.

## Review Checklist

Review should explicitly check:

- Comparison uses only persisted local metadata and service boundaries.
- UI does not call Dexie/IndexedDB directly.
- No scoring, rank, quality, recommendation, automatic analysis, audio, waveform, or event-persistence claims appear.
- Event details are shown as unavailable unless backed by real durable event reads.
- Goal text does not imply exact per-session completion attribution.
- Missing/deleted/lookup-failed sheet and segment states are honest.
- Selection state is UI-only and not persisted.
- Existing Home panels and primary practice entries remain intact.
- Tests cover empty, selected, max-selected, stale/missing data, reload, responsive, and contained failure states.
- E2E uses established fixtures/helpers and does not add product-only seed APIs.
- No `docs/v1/status.json`, package, schema, migration, storage cleanup, command palette, recordings comparison, media, waveform, or analysis files are changed.

## Verification Handoff

Verification should run focused commands and inspect changed files. PASS requires:

- Pure model tests for candidate construction, selection, metrics, missing data, and no score wording.
- Service tests for read-only session/recording metadata composition and lookup containment.
- Component tests for accessible selection, two/three-session comparison, contained failure, and Home regression coverage.
- Browser E2E for persisted candidates, select/compare, reload, responsive no-overflow, and console cleanliness.
- Typecheck, lint, and `git diff --check` pass.
- Source inspection confirms no forbidden storage/schema/package/media/event/scoring/command-palette/status scope.
- Final PR receives web ChatGPT review and required fixes.
- Pre-merge E2E passes after PR review feedback is addressed.

## Deferred Work

| Deferred work | Future owner |
| --- | --- |
| Dedicated session comparison/history route | `P3-17B` or future reviewed practice-session route slice |
| Durable event repository/read model and event-by-session comparison | `P3-17C` or future event persistence slice |
| Per-session goal attribution and exact goal completion contribution | `P3-17D` or future goal attribution slice |
| Command palette command for session comparison | Future reviewed command/action slice after P3-17 UI is verified |
| Recording waveform/audio comparison | Existing recordings review comparison or future reviewed recording slice |
| Quality scoring, mistake detection, automatic recommendations, analysis-derived comparison | Future analysis feature, not v1 P3-17 |
| Cloud/cross-device comparison history | v2 |

