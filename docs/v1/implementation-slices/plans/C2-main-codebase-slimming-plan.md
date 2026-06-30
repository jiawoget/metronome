# C2 Main Codebase Slimming Plan

## Purpose

This is a docs-only planning PR for codebase slimming on current `main`.

It does not implement refactors, delete production code, or change tests. Its
goal is to define a reviewable, executable slimming sequence before coding
starts.

## Analysis Baseline

- Base branch: `origin/main`
- Base commit: `19824d1e5090723d586d7d7d8c9b83b53ea98f44`
- Commit title: `Merge pull request #2 from jiawoget/codex/v1-pack-2-segment-take-review`
- Current v1 status: Pack 1 and Pack 2 are verified; Pack 3-9 are not started.
- Analysis mode: read-only source review plus focused explorer subagent review.

The analysis intentionally used `origin/main`, not the working feature branch.
The current working branch at the time of analysis was
`codex/v1-pack2-stage-b-artifact-storage`, but the report baseline was the
freshly fetched `origin/main`.

## A. Basic Statistics

Measured TypeScript/TSX/CSS/JS/MJS line counts:

- `src`: 19,627 lines across 154 files
- `tests`: 23,518 lines across 61 files

Largest source files:

| Lines | File |
| ---: | --- |
| 1492 | `src/components/recordings-review/recordings-review-experience.tsx` |
| 903 | `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` |
| 842 | `src/components/sheet-practice/controls/sheet-practice-controls.tsx` |
| 783 | `src/lib/recordings-review/repository.ts` |
| 647 | `src/components/sheet-practice/reference/reference-panel.tsx` |
| 616 | `src/components/sheet-library/sheet-library-experience.tsx` |
| 489 | `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` |
| 419 | `src/components/app-shell/app-shell.tsx` |
| 409 | `src/components/settings/settings-experience.tsx` |
| 361 | `src/components/quick-metronome/quick-metronome-experience.tsx` |
| 329 | `src/services/practice-session/service.ts` |
| 328 | `src/components/recordings-review/recording-artifact-review.tsx` |
| 295 | `src/lib/recordings-review/waveform-comparison-sources.ts` |
| 285 | `src/lib/recordings-review/audio-export.ts` |
| 282 | `src/lib/recordings-review/artifact-storage.ts` |
| 265 | `src/stores/sheet-practice-recording-workflow-store.ts` |
| 265 | `src/lib/sheet-practice/recording-service.ts` |
| 256 | `src/components/recordings-review/recording-comparison-panel.tsx` |
| 254 | `src/lib/recordings-review/recording-history-operations.ts` |

Largest test files:

| Lines | File |
| ---: | --- |
| 2368 | `tests/e2e/recordings-review.spec.ts` |
| 1937 | `tests/unit/recordings-review-experience.test.tsx` |
| 1893 | `tests/unit/sheet-practice-controls.test.tsx` |
| 1011 | `tests/unit/practice-segment-selector.test.tsx` |
| 945 | `tests/unit/recordings-review-repository.test.ts` |
| 899 | `tests/unit/practice-session-service.test.ts` |
| 810 | `tests/unit/recordings-review-artifact-storage.test.ts` |
| 749 | `tests/unit/practice-segment-repository.test.ts` |
| 696 | `tests/e2e/sheet-recording-review.spec.ts` |
| 578 | `tests/unit/sheet-practice-recording.test.ts` |

Hot directory counts:

| Lines | Files | Directory |
| ---: | ---: | --- |
| 15982 | 43 | `tests/unit` |
| 7536 | 18 | `tests/e2e` |
| 4193 | 23 | `src/lib/recordings-review` |
| 4083 | 15 | `src/components/sheet-practice` |
| 2626 | 7 | `src/components/recordings-review` |
| 1605 | 29 | `src/services` |
| 920 | 9 | `src/infrastructure/db` |
| 747 | 12 | `src/lib/quick-metronome` |
| 497 | 2 | `src/components/quick-metronome` |

## B. Current Functional Boundary

Current `main` has verified Pack 1 and Pack 2:

- Practice Segment foundation.
- Manual measure grid calibration.
- Segment create/edit/delete/selection.
- Segment-linked sheet recording metadata.
- Record Again foundation and separate artifact evidence.
- Recordings Review grouping by sheet and segment.
- Best/active take metadata and UI.
- Take history summary and return-to-practice navigation.
- Waveform comparison using real artifacts or validated peaks.
- Tags, favorites, archive, and audio export.
- IndexedDB-backed recording artifacts with localStorage metadata snapshot.

Slimming must preserve these Pack 1/2 behaviors. It should not preserve
development-era compatibility solely because tests now encode it.

## C. Slimming Candidate Overview

| Priority | File/module | Current responsibility | Problem type | Necessary? | Suggested action | Estimated reduction | Risk | Required tests |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| P0 | `src/infrastructure/db/recording-history-metadata-repository.ts` | Converts metadata-only sheet rows into fake `ReviewRecording` | type pollution | No | Split metadata-only rows from real review recordings before artifactRef-only cleanup | 100-240 | session aggregation behavior | practice-session, repository, review grouping |
| P0 | `src/lib/sheet-practice/recording-service.ts` | Builds draft recording with `audioDataUrl` to decode captured audio | legacy dependency / duplicate decode | No | Decode from captured Blob/body before deleting data URL fallback | 30-70 | trusted peaks and duration | sheet recording tests |
| P0 | `src/lib/recordings-review/artifact-migration.ts`, `artifact-data-url.ts` | Migrate legacy localStorage `audioDataUrl` rows into IndexedDB | legacy compatibility | Needs explicit data policy | After metadata split and sheet direct decode, delete legacy migration and data URL parser if developer-era local data can be dropped | 250-450 | Old local data no longer migrates | artifact storage, waveform, export |
| P0 | `src/lib/recordings-review/artifact-storage.ts` | Resolve artifact bodies from `artifactRef` or legacy `audioDataUrl` | legacy fallback | Partly no | Make resolver artifactRef-only after no runtime path depends on `audioDataUrl` | 50-90 | Missing artifact handling regression | artifact storage unit |
| P1 | `src/lib/recordings-review/artifact-service.ts` | Re-export barrel for artifact modules | thin facade | No | Delete barrel and import concrete modules directly | 10-20 | Low | typecheck, artifact tests |
| P1 | `src/lib/quick-metronome/artifact-controller.ts` | Rename wrapper around recording-review artifact functions | thin facade / workaround | No | Delete or fold into a real quick controller API | 5-15 | Low | quick unit/e2e |
| P1 | `tests/unit/architecture-boundaries.test.ts` | Enforces UI boundaries by path and function names | over-specific boundary test | Partly | Keep module/path boundaries; remove function-name bans | 10-30 | Boundary gets too loose | architecture test |
| P2 | `src/lib/recordings-review/artifact-review-controller.ts` | Loads details and playback blob separately | duplicate IO/decode | No | Resolve body once and share details/playback body | 20-60 | playback lifecycle | artifact review tests |
| P2 | quick/sheet save controllers | Artifact-first save, metadata commit, rollback | duplicate flow | Partly | Extract leaf helpers only, not a transaction framework | 80-140 | rollback correctness | quick/sheet save failure tests |
| P3 | `src/lib/recordings-review/repository.ts` | Public API includes legacy `getArtifact()` and unused metadata save variant | stale public API | No | Delete stale methods | 20-30 | Tests need rewriting | repository tests |
| P4 | large unit/e2e tests | Repeated recording/audio/storage fixtures | test bloat | No | Shared factories and artifact seed helpers | 700-1200 | Coverage accidentally removed | full unit plus focused e2e |

## D. First Small PR

Recommended first implementation PR after this plan is reviewed:

### Required PR 1: safe wrapper/API cleanup

Do the low-risk deletion first. Do not delete legacy `audioDataUrl` migration
or fallback in PR 1.

Files to delete or simplify:

- `src/lib/recordings-review/artifact-service.ts`
- `src/lib/quick-metronome/artifact-controller.ts`

Files/APIs to remove if truly unused:

- `recordingHistoryRepository.getArtifact()`
- `saveSheetReviewRecordingMetadata`

Files/tests to update:

- import sites for the deleted wrapper modules
- `tests/unit/architecture-boundaries.test.ts`

Do not change:

- New quick/sheet artifactRef-first save paths.
- IndexedDB recording artifact repository.
- Legacy `audioDataUrl` migration and runtime fallback.
- Missing artifact body/ref states.
- Unsupported MIME, decode failed, empty audio states.
- Delete/clear artifact cleanup safety.
- Practice session or segment-linked recording behavior.

Verification commands:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run test:e2e -- recordings-review.spec.ts sheet-recording-review.spec.ts sheet-segment-recording.spec.ts quick-metronome.spec.ts
```

Regression risks:

- Boundary tests may get too loose if they only delete function-name bans.
- Import rewrites may accidentally bypass the service/repository boundary.

### Legacy deletion gate

Deleting legacy `audioDataUrl` migration and fallback is allowed only after the
plan or a follow-up decision records this data policy:

```text
Legacy data policy:
- This app has not been formally released.
- Existing developer-era localStorage `audioDataUrl` recordings may be dropped.
- No migration/fallback for `audioDataUrl` will be preserved.
- New persisted recording metadata must be artifactRef-only.
```

Even with that decision, legacy deletion must wait until:

- metadata-only sheet session rows are no longer fake `ReviewRecording` values;
- sheet recording no longer depends on draft `ReviewRecording.audioDataUrl` for
  pre-save decode.

## E. Phased Plan

### Phase 1: Low-Risk Deletion

- Delete pure re-export / rename wrapper modules:
  - `artifact-service.ts`
  - `quick-metronome/artifact-controller.ts`
- Remove stale public repository API:
  - `recordingHistoryRepository.getArtifact()`
  - `saveSheetReviewRecordingMetadata`
- Update `architecture-boundaries.test.ts`:
  - Keep bans on Dexie, concrete repositories, localStorage repositories,
    MediaRecorder, Tone, WaveSurfer adapter, raw artifact storage, and browser
    storage in app/server layers.
  - Remove bans based only on function names such as
    `loadRecordingArtifactDetails` or `resolveRecordingArtifactBody`.

### Phase 2: Type Model Cleanup

- Stop representing metadata-only sheet session rows as fake `ReviewRecording`
  with:
  - `sizeBytes: 0`
  - `mimeType: "metadata/session"`
  - `audioDataUrl: null`
- Add a separate metadata-only bucket/type for practice-session metadata.
- Keep real `ReviewRecording` for real quick/sheet recordings that have, or are
  expected to have, audio artifacts.
- Preserve practice-session aggregation, segment-linked recording metadata,
  clear behavior, and return-to-practice navigation.

### Phase 3: Sheet Recording Direct Blob/Body Decode

- Let sheet recording decode from captured `Blob` / `RecordingArtifactBody`
  instead of constructing a draft `ReviewRecording` with `audioDataUrl`.
- Keep duration extraction, trusted peaks, silent/empty audio rejection, and
  sheet prepared-session commit/rollback behavior.
- Add an invariant that newly persisted sheet recording metadata is
  artifactRef-only and does not persist `audioDataUrl`.

### Phase 4: Legacy Compatibility Decision And Deletion

If the explicit legacy data policy is recorded:

- Delete legacy `audioDataUrl` migration.
- Delete runtime legacy fallback.
- Remove `audioDataUrl` from persisted `ReviewRecording` shape, except for
  non-persisted demo/capture-only structures if still needed.
- Delete `legacy-artifact-malformed` and data URL MIME mismatch branches.
- Add artifactRef-only invariant tests for quick and sheet recordings.

Keep:

- `missing-artifact-ref`
- `missing-artifact-body`
- `unsupported-mime`
- `decode-failed`
- `empty-audio`
- storage/quota errors

If legacy data must stay:

- Delete only unused `persistLegacyFallback`.
- Keep migration tests but reduce duplicated E2E legacy seeding.

### Phase 5: Artifact Review Single Resolve

- Replace the parallel calls in `useRecordingArtifactReviewController`:
  - current: `loadRecordingArtifactDetails(recording)` plus
    `resolveRecordingArtifactBody(recording)`
  - target: one helper returns `{ details, body }`
- Do not create an `artifact-service.ts` replacement barrel or a generic
  facade.
- Verify rapid switching, unmount, object URL cleanup, playback state, and
  WaveSurfer lifecycle.
- Centralize artifact error reason-to-message mapping for waveform/export/details
  only if the helper stays small.

### Phase 6: Save/Rollback Flow Consolidation

- Compare quick and sheet save flows:
  - validate artifact
  - save artifact first
  - prepare/link session
  - write metadata
  - commit/end session
  - rollback metadata
  - cleanup artifact
  - restore/delete session snapshot
- Extract only leaf helpers:
  - `assertUsableCapturedArtifact`
  - `cleanupUnretainedRecordingArtifactsOrThrow`
  - explicit quick/session restore helpers only if they do not hide quick versus
    sheet differences
- Do not introduce a generic transaction framework.
- Keep retained-recording ownership checks visible and covered by tests.

### Phase 7: Test Slimming

- Unit helpers:
  - shared recording factories
  - shared AudioContext mock
  - shared memory artifact repository
- E2E helpers:
  - `seedRecordingArtifacts`
  - `readSheetRecordings`
  - `expectArtifactRefOnly`
  - `clearRecordingState`
- Slim `recordings-review.spec.ts`:
  - keep group/filter/delete reload
  - keep organization metadata
  - keep export
  - keep waveform comparison
  - keep return-to-practice
  - keep mobile readability
  - keep one list/play/continue/delete smoke
  - keep one missing artifact or migration smoke depending on legacy decision
  - move bad-audio matrices to unit tests
- Do not delete Pack 1/2 behavioral assertions just to reduce line count.

Phase 7 is intentionally split across multiple small PRs:

- `C2-07 test-fixture-slimming`
  - Status: verified.
  - Completed only the first narrow unit factory extraction for four
    recording-review unit tests.
  - Did not touch large UI-oriented unit tests or E2E tests.
- `C2-08 large-unit-fixture-follow-up`
  - Status: verified.
  - Follow-up for the larger recording-review unit tests that were explicitly
    deferred from C2-07.
  - This slice is limited to recording/segment factory adoption in
    `recordings-review-experience.test.tsx` and
    `recordings-review-history.test.ts`.
- `C2-09 e2e-fixture-and-spec-slimming`
  - Status: verified.
  - Follow-up for E2E fixture helpers such as `seedRecordingArtifacts`,
    `readSheetRecordings`, `expectArtifactRefOnly`, `clearRecordingState`, and
    the larger `recordings-review.spec.ts` slimming work.
- `C2-10 shared-unit-audio-artifact-fixtures`
  - Status: not_started.
  - Follow-up for shared AudioContext mock reuse and shared in-memory artifact
    fixture reuse across unit tests. This work is intentionally split out from
    C2-08 because it crosses more files and can otherwise turn into a generic
    test fixture framework.

Do not mark Pack C verified until C2-08, C2-09, and C2-10 are either completed
or explicitly re-scoped out in a reviewed plan.

## F. Areas Not Recommended For Early Slimming

- `src/lib/recordings-review/recording-history-snapshot.ts`
  - It owns pure snapshot cleanup and unknown-field preservation.
- `src/lib/recordings-review/recording-history-operations.ts`
  - It owns save/delete/rollback/clear operations and artifact cleanup id
    derivation.
- `src/services/recordings-review/index.ts`
  - It is thin, but protects UI from repository, export, waveform, and artifact
    cleanup internals.
- `src/infrastructure/db/recording-artifact-repository.ts`
  - Ownership checks prevent metadata from pointing at another recording's
    artifact body.

Do not collapse these just to reduce file count.

## G. Risk List

### Data Loss Risk

Deleting legacy `audioDataUrl` migration means old localStorage-only recordings
will no longer be recoverable. This must be explicitly accepted before coding.
If that policy is not recorded, the implementation must not delete migration or
fallback code.

### ArtifactRef Invariant Risk

After the metadata split and sheet direct decode, newly persisted quick and sheet
recording metadata must be artifactRef-only and must not store `audioDataUrl`.

### Artifact Orphan Risk

Delete/clear/rollback must continue to delete only artifacts for recordings that
are no longer retained.

### Missing Artifact Risk

Metadata can point at a missing IndexedDB body. Missing-body and missing-ref
states must remain specific and user-visible.

### Review Playback Risk

If body/details loading is bundled, object URL and WaveSurfer lifecycle must be
checked for rapid switching, unmount, and playback state.

### Quick/Sheet Save Risk

Shared helpers must not hide differences between quick session linking and sheet
prepared-session commit/rollback.

Helper names must stay domain-specific. Avoid generic helpers that become a new
facade or transaction framework.

### Test Coverage Risk

Test slimming must move repeated setup into helpers. It must not delete Pack 1
or Pack 2 behavioral contracts.
Keep explicit gates for sheet save duration/trusted peaks, missing artifact
states, delete/clear/rollback cleanup, segment-linked recording, tags,
favorites, archive, take selection, waveform comparison, export, and
return-to-practice.

## H. Agent Execution Order

Use small PRs, one at a time:

1. PR 1: safe wrapper/API cleanup.
2. PR 2: metadata/session type split.
3. PR 3: sheet recording direct Blob/body decode.
4. PR 4: legacy `audioDataUrl` deletion, only after data policy approval.
5. PR 5: artifact body/details single-resolve path.
6. PR 6: quick/sheet save leaf helpers.
7. PR 7: unit and E2E fixture slimming.

After each PR:

- run targeted tests first;
- run broad unit/typecheck/lint/build before merge;
- request web ChatGPT review in the `metronome` project;
- address review findings before moving to the next PR.

## Review Questions For Web ChatGPT

1. Is PR 1 now small enough as a pure safe wrapper/API/boundary-test cleanup?
2. Is splitting `metadata/session` before legacy cleanup sufficient to avoid
   artifactRef-only model pollution?
3. Does Phase 3 remove all runtime sheet recording dependence on
   `audioDataUrl` before deleting `artifact-data-url.ts`?
4. Is the legacy data policy explicit enough to approve dropping developer-era
   localStorage-only recordings?
5. Are any required Pack 1 or Pack 2 behaviors missing from the test matrix?
6. Is any proposed helper still at risk of becoming a facade or transaction
   framework?
