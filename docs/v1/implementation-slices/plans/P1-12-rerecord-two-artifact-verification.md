# P1-12 Rerecord Two Artifact Verification Plan

## Slice

- Slice id: P1-12 `rerecord-two-artifact-verification`
- Pack: Pack 1 Practice Segment foundation
- Product contract: `practice.segment-rerecording` in `docs/v1/05f-practice-segments.md`
- Dependencies: P1-09 segment recording context, P1-10 rerecord workflow state, P1-11 `Record again` action
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier D, recording/media/timing verification hardening
- Status: planning artifact only; do not implement product code from this planning pass

## Goal

Complete Pack 1 foundation evidence by proving the manual practice-segment path with durable artifact evidence:

```text
Open sheet
  -> calibrate measure grid
  -> create/select segment
  -> record first take
  -> Record again
  -> record second take
  -> prove both recording artifacts exist, are distinct, survive reload/review, and carry correct segment context
```

This is the final verification/completion slice for the Pack 1 Practice Segment foundation. It should add missing acceptance coverage and only the smallest fixes needed to make the already implemented P1-09 through P1-11 behavior verifiable. Treat this slice as an evidence hardening pass, not a new product feature pass. It does not complete the full v1/MVP milestone: Pack 2 take review, Pack 7 reference/marker work, Pack 9 audio-analysis infrastructure, and full reference/review/audio-analysis MVP behavior remain deferred/not started.

## Scope

- Strengthen browser E2E coverage for the full Pack 1 happy path from sheet import/open through two saved segment-linked takes.
- Prove two persisted recordings exist for the same sheet and selected segment after first take plus `Record again`.
- Prove each saved recording has a real or accepted controlled audio artifact:
  - non-empty `audioDataUrl` with audio MIME prefix
  - `sizeBytes > 0`
  - non-empty finite `trustedPeaks`
  - decoded artifact evidence where existing helpers make that practical
- Prove the two recordings are distinct:
  - different recording ids
  - different persisted history entries
  - different artifact payloads or enough artifact evidence to rule out overwrite/reuse
  - separate session/latest-recording metadata where the existing service exposes it
- Prove both recordings carry matching segment context for the unchanged selected segment:
  - same `segmentId`
  - same `segmentName`
  - same inclusive measure range
  - same `targetBpm`
  - same `measureGridVersion`
  - same `measureGridSnapshot`
  - same deterministic `measureRangeMs`
- Prove `measureRangeMs` matches the saved grid and range, not a live grid lookup after the fact.
- Prove the first artifact and metadata remain immutable after the second take.
- Prove both recordings survive page reload and remain visible/readable through review affordances.
- Prove canceling or abandoning a second/repeated take, where the current UI exposes such a path, does not create a fake third take.
- Keep no-segment recording ineligible for segment `Record again`.
- Add focused unit/component tests only when E2E exposes a gap that is cheaper and more stable to lock below the browser layer.
- Apply small implementation fixes only if the added verification reveals a real Pack 1 acceptance defect.

## Non-Scope

- No take grouping, take list, take count, best/latest/active take semantics, comparison view, or waveform comparison.
- No Pack 2 review grouping or multi-take management UI.
- No new review-page segment badges, filters, or dedicated segment review screen.
- No new recording persistence schema, rerecord table, localStorage field, IndexedDB object store, or migration.
- No new segment CRUD, MeasureGrid calibration, segment tempo, count-in, looping, or assisted page-turning behavior.
- No automatic best-take selection, scoring, trimming, PDF measure detection, score following, or audio analysis claims.
- No cloud sync, account behavior, backup/restore, or cross-device behavior.
- No direct UI access to IndexedDB, Dexie, localStorage, MediaRecorder, Web Audio internals, or recording-history repositories.
- No status promotion in `docs/v1/status.json` unless the scheduler explicitly assigns status update work after verification.

## Current Coverage Baseline

Existing relevant coverage already includes:

- `tests/e2e/sheet-segment-recording.spec.ts`
  - segment-linked recording context persistence
  - `Record again` creating a second same-context recording in the current browser session
  - sheet isolation
  - renamed segment snapshot before recording
- `tests/e2e/sheet-recording-review.spec.ts`
  - synthetic recording artifacts, replay/latest recording, waveform persistence, review page navigation, bad artifact states, microphone denial
- `tests/e2e/measure-grid-calibration.spec.ts`
  - calibration save/reload/isolation and layout usability
- `tests/unit/sheet-practice-recording-workflow-store.test.ts`
  - rerecord readiness, cancel/failure, no-segment ineligibility, sheet switch, second source update
- `tests/unit/sheet-practice-controls.test.tsx`
  - `Record again` visibility/action, double-start prevention, missing source segment, permission denial, save failure
- `tests/unit/sheet-practice-recording.test.ts`
  - recording service artifact save, segment context forwarding, rollback behavior

P1-12 should extend or tighten these tests rather than duplicate them wholesale.

## Primary Acceptance Scenario

Add or extend a dedicated E2E scenario in `tests/e2e/sheet-segment-recording.spec.ts`:

1. Install the synthetic microphone fixture.
2. Clear recording history and Pack 1 databases through existing storage fixtures.
3. Import/open a sheet with deterministic defaults, for example BPM `96` and `4/4`.
4. Save a measure grid:
   - BPM `96`
   - time signature `4/4`
   - pickup beats `0`
   - measure-one offset `1000`
5. Create and select a segment:
   - name `Opening focus`
   - measures `5-12`
   - target BPM `96`
6. Record first take through visible UI:
   - click `Start recording`
   - wait long enough for non-silent synthetic artifact
   - click `Stop recording`
   - assert saved message for the segment
7. Snapshot the first persisted recording from recording history:
   - `id`
   - `sessionId`
   - `audioDataUrl`
   - `sizeBytes`
   - `durationMs`
   - `trustedPeaks`
   - `segmentContext`
   - full persisted object if stable enough for immutability comparison
8. Assert `Record again` is visible/enabled only after the eligible first take.
9. Click `Record again`.
10. Assert recording becomes active and the repeat button cannot start a duplicate recording while active.
11. Stop/save the second take.
12. Read recording history again and assert exactly two sheet recordings for that sheet.
13. Assert two distinct artifacts and records:
   - recording ids differ
   - history contains two separate entries
   - both `audioDataUrl` values are audio data URLs and non-empty
   - both `sizeBytes > 0`
   - both have finite non-empty `trustedPeaks`
   - if synthetic microphone produces byte-identical blobs, do not require `audioDataUrl` inequality; instead require distinct ids/history entries and decoded artifact validity for both. If payloads normally differ, assert they differ as an additional signal.
14. Assert both segment contexts equal the expected context:

```ts
{
  segmentName: "Opening focus",
  range: { startMeasure: 5, endMeasure: 12 },
  targetBpm: 96,
  measureGridVersion: "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000",
  measureGridSnapshot: {
    bpm: 96,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 1000
  },
  measureRangeMs: {
    startMs: 11000,
    endMs: 31000
  }
}
```

15. Assert both `segmentContext.segmentId` values are truthy and equal to each other.
16. Assert the first persisted recording still equals the first snapshot for immutable fields after the second save:
   - same `id`
   - same artifact fields
   - same `createdAt`
   - same `durationMs`
   - same `segmentContext`
   - same `sessionId` if current service contract keeps it stable
17. Reload the Sheet Practice page.
18. Read recording history and assert both recordings remain present with the same ids, artifact fields, and segment contexts.
19. Navigate to `/recordings`.
20. Filter/search for the sheet and assert both persisted rows are reachable, or at minimum assert both ids are present in review storage and the sheet review/latest recording UI can load without artifact errors.
21. Open each review row if current UI supports stable row ids and assert no decode/artifact error appears.
22. Check browser console and page errors are empty.

## Additional Edge Cases

### Must Verify In P1-12

- Cancel or abandon second take:
  - If the UI has an existing cancel/discard path, start `Record again`, cancel/discard, and assert recording count remains two and first two recordings are unchanged.
  - If the UI has no explicit cancel path, document that cancellation is deferred to the existing component/unit failure coverage and do not add new UI.
- Permission denial:
  - Covered in `sheet-recording-review.spec.ts` and `sheet-practice-controls.test.tsx`.
  - P1-12 should not add a second slow browser denial test unless the repeat path lacks direct coverage. If added, deny microphone before `Record again` and assert no new metadata/artifact is created.
- Renamed/deleted segment after first take:
  - Verify saved first take context remains immutable after segment deletion or rename.
  - For `Record again`, if the current P1-11 policy invalidates when live context differs, assert repeat is disabled/unavailable after rename/delete.
  - Do not mutate the first recording context to match live segment edits.
- Sheet switch/no leak:
  - Keep or strengthen the existing E2E that selecting a segment on Sheet A does not create segment context on Sheet B.
  - Verify Sheet A's two recordings remain scoped to Sheet A after returning.
- No-segment recording not eligible:
  - Record without a selected segment and assert saved recording has `segmentContext: null`.
  - Assert `Record again` is hidden/disabled for that no-segment source.

### Explicitly Defer Beyond Pack 1

- Take grouping and displaying both takes as a grouped set in Review.
- Best/latest take selection semantics.
- Comparing two waveforms.
- Naming takes as "Take 1" and "Take 2".
- Analytics, scoring, automatic quality judgment, trimming, or mistake detection.
- Restoring rerecord readiness after browser reload. P1-12 must prove recordings persist after reload, but the `Record again` affordance does not need to rehydrate from history unless already implemented.

## Expected Work Type

This slice should mostly add or tighten E2E tests.

Use this priority order:

1. E2E coverage in `tests/e2e/sheet-segment-recording.spec.ts` for the full two-artifact Pack 1 path.
2. Reuse existing E2E fixture helpers from `tests/e2e/fixtures/audio.ts`, `tests/e2e/fixtures/storage.ts`, and `tests/e2e/fixtures/sheets.ts`.
3. Small unit/component assertions only for missing negative cases that would make E2E flaky or too slow.
4. Small implementation fixes only if tests expose real defects in artifact persistence, segment context immutability, repeat eligibility, or no-segment ineligibility.
5. No product UI expansion.
6. No docs/status-only completion unless tests already fully cover every acceptance point and the coding agent can provide evidence.

## Likely Files To Change

- `tests/e2e/sheet-segment-recording.spec.ts`
  - Primary place for full Pack 1 two-artifact acceptance and reload/review persistence.
- `tests/e2e/sheet-recording-review.spec.ts`
  - Only if review-page assertions need a helper or existing artifact decode coverage must be extended to segment-linked recordings.
- `tests/e2e/fixtures/audio.ts`
  - Only if an existing decode/helper should be reused for two saved segment recordings.
- `tests/e2e/fixtures/storage.ts`
  - Only if reading recording history needs a small typed helper for segment artifacts.
- `tests/unit/sheet-practice-controls.test.tsx`
  - Only if repeat cancellation/permission/no-segment ineligibility has a missing stable component-level assertion.
- `tests/unit/sheet-practice-recording-workflow-store.test.ts`
  - Only if cancel/failure/source invalidation behavior is not already covered.
- `tests/unit/sheet-practice-recording.test.ts`
  - Only if first-artifact immutability or rollback behavior is missing below E2E.
- Small source fixes, only if needed:
  - `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - `src/components/sheet-practice/controls/transport-actions-panel.tsx`
  - `src/stores/sheet-practice-recording-workflow-store.ts`
  - `src/lib/sheet-practice/recording-service.ts`
  - `src/lib/recordings-review/repository.ts`

## Out Of Scope Files

- `src/components/recordings-review/*`, except a narrow test-id/null-safety fix if the existing review UI cannot verify persisted recordings.
- `src/infrastructure/audio/*`
- `src/infrastructure/db/browser-practice-segment-service.ts`
- `src/infrastructure/db/browser-measure-grid-service.ts`
- `src/lib/quick-metronome/*`
- New take-management, waveform-comparison, best-take, analytics, scoring, import/export, cleanup, or cloud modules.
- `docs/v1/status.json`, unless explicitly assigned after verification.

## Boundary Rules

- UI code may use only existing high-level service/store boundaries:
  - `useSheetPracticeRecordingWorkflowStore`
  - `SheetRecordingService`
  - `PracticeSegmentService`
  - `MeasureGridService`
  - `PracticeSessionService`
- UI must not directly query or mutate IndexedDB, Dexie, localStorage, recording history repository, MediaRecorder, or Web Audio internals.
- E2E fixtures may inspect browser storage for verification evidence; product code must not gain new direct storage access.
- Segment context must be built through the existing P1-09 live selected-segment context path, not by copying old source context into a new save.
- Persisted recordings remain the source of truth for reload/review checks.
- Do not weaken existing artifact validation to make tests pass.

## Verification Command Matrix

Use README Windows command style.

Focused unit/component checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-recording-workflow-store.test.ts tests/unit/sheet-practice-controls.test.tsx tests/unit/sheet-practice-recording.test.ts tests/unit/practice-session-service.test.ts tests/unit/recordings-review-repository.test.ts
```

Primary targeted E2E:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-segment-recording.spec.ts
```

Review/artifact regression E2E:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-recording-review.spec.ts
```

MeasureGrid regression E2E, if calibration helpers or Pack 1 full gate need explicit rerun:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/measure-grid-calibration.spec.ts
```

Static/build checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run typecheck
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run lint
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run build
```

Final Pack 1 acceptance gate:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/measure-grid-domain.test.ts tests/unit/measure-grid-repository.test.ts tests/unit/practice-segment-domain.test.ts tests/unit/practice-segment-repository.test.ts tests/unit/practice-segment-selector.test.tsx tests/unit/sheet-practice-recording-workflow-store.test.ts tests/unit/sheet-practice-controls.test.tsx tests/unit/sheet-practice-recording.test.ts tests/unit/practice-session-service.test.ts tests/unit/recordings-review-repository.test.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/measure-grid-calibration.spec.ts tests/e2e/sheet-segment-recording.spec.ts tests/e2e/sheet-recording-review.spec.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run typecheck
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run lint
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run build
```

If local Playwright browsers are missing:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run playwright:install
```

Playwright EPERM/escalation note: browser E2E and synthetic microphone paths may need browser binaries, dev-server binding, profile/cache writes, microphone fixture setup, or filesystem access that the sandbox blocks. If E2E fails with `EPERM`, browser launch, server binding, cache/profile, microphone fixture, or browser-install symptoms, rerun with approval/escalation and report the reason and exact failing command.

## Acceptance Checklist

- [ ] Full Pack 1 path is covered by real browser interaction: open sheet, calibrate grid, create/select segment, record first take, `Record again`, record second take.
- [ ] Two persisted sheet recording history entries exist for the target sheet after the second save.
- [ ] The two recordings have distinct ids.
- [ ] The first recording remains present after the second save and is not overwritten, deleted, merged, or mutated.
- [ ] Both recordings have real or accepted controlled artifact evidence: audio data URL, positive size, finite trusted peaks, and decode evidence where practical.
- [ ] The two artifacts are proven distinct by separate ids/history entries and, where stable, separate artifact payloads or durations/timestamps.
- [ ] Both recordings carry non-null segment context.
- [ ] Both segment contexts share the same `segmentId` for the unchanged selected segment.
- [ ] Both segment contexts match expected segment name, range, target BPM, grid version, grid snapshot, and `measureRangeMs`.
- [ ] `measureRangeMs` is consistent with the saved grid snapshot and inclusive measure range.
- [ ] Reload preserves both recordings, artifact fields, and segment contexts.
- [ ] Review route/storage can read both recordings after reload without artifact/decode errors.
- [ ] Cancel/discard of a repeated take, if exposed by current UI, does not create a fake third take.
- [ ] Permission denial/repeat start failure is covered by unit/component or E2E and creates no fake recording.
- [ ] Renamed/deleted segment after first take does not mutate saved context; repeat eligibility follows P1-11 policy.
- [ ] Sheet switch does not leak selected segment or segment context to another sheet's recording.
- [ ] No-segment recording remains valid and is not eligible for segment `Record again`.
- [ ] Browser console and page errors are empty for the happy path.
- [ ] No product code bypasses service/store boundaries.
- [ ] No Pack 2+ take grouping, best-take, comparison, scoring, trimming, cloud, or analysis scope is introduced.
- [ ] Focused unit/component tests, targeted E2E, typecheck, lint, and build pass or failures are documented with actionable evidence.

## Definition Of Pack 1 Foundation Complete

Pack 1 Practice Segment foundation can be presented for user acceptance when:

- P1-01 through P1-12 are verified in `docs/v1/status.json` by the normal lifecycle.
- The final Pack 1 acceptance gate passes:
  - deterministic measure-grid math and calibration persistence
  - segment CRUD/selection persistence
  - selected-segment recording metadata persistence
  - `Record again` action
  - two distinct persisted recording artifacts with correct segment context
  - reload/review survival
  - no-segment and sheet-isolation regressions
- Verification evidence includes real browser E2E, artifact evidence, reload persistence, console status, and source-boundary inspection.
- No adjacent Pack 2+ or v2 behavior is implemented as part of Pack 1.
- Pack 1 completion does not claim Pack 2 take grouping/review, Pack 7 reference/marker behavior, Pack 9 audio-analysis infrastructure, or the full reference/review/audio-analysis MVP milestone.

## Handoff Notes For Coding Agent

- Start by strengthening `tests/e2e/sheet-segment-recording.spec.ts`; it already has most of the right helpers and flow.
- Keep the test deterministic: use one sheet, one grid, one segment, and explicit expected `measureRangeMs`.
- Snapshot the first recording before the second save and compare immutable fields afterward.
- Be careful with ordering. If recording history is newest-first, find entries by id rather than assuming array order for immutability checks.
- Do not require synthetic audio payload inequality if the fixture can produce byte-identical data. Distinct recording ids plus separate persisted history entries and valid artifact evidence is the minimum acceptance proof; payload inequality is a useful extra assertion only when stable.
- Prefer browser-storage reads in E2E fixtures for evidence. Do not add direct storage reads to app UI code.
- Any source fix should be narrow and justified by a failing P1-12 acceptance assertion.
