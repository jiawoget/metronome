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
| P0 | `src/lib/recordings-review/artifact-migration.ts`, `artifact-data-url.ts` | Migrate legacy localStorage `audioDataUrl` rows into IndexedDB | legacy compatibility | Needs product confirmation | If not formally released, delete legacy migration and data URL parser | 250-450 | Old local data no longer migrates | artifact storage, waveform, export |
| P0 | `src/lib/recordings-review/artifact-storage.ts` | Resolve artifact bodies from `artifactRef` or legacy `audioDataUrl` | legacy fallback | Partly no | Make resolver artifactRef-only; delete `persistLegacyFallback` | 50-90 | Missing artifact handling regression | artifact storage unit |
| P0 | `src/infrastructure/db/recording-history-metadata-repository.ts` | Converts metadata-only sheet rows into fake `ReviewRecording` | type pollution | No | Split metadata-only rows from real review recordings | 100-240 | session aggregation behavior | practice-session, repository, review grouping |
| P1 | `src/lib/recordings-review/artifact-service.ts` | Re-export barrel for artifact modules | thin facade | No | Delete barrel and import concrete modules directly | 10-20 | Low | typecheck, artifact tests |
| P1 | `src/lib/quick-metronome/artifact-controller.ts` | Rename wrapper around recording-review artifact functions | thin facade / workaround | No | Delete or fold into a real quick controller API | 5-15 | Low | quick unit/e2e |
| P1 | `tests/unit/architecture-boundaries.test.ts` | Enforces UI boundaries by path and function names | over-specific boundary test | Partly | Keep module/path boundaries; remove function-name bans | 10-30 | Boundary gets too loose | architecture test |
| P2 | `src/lib/recordings-review/artifact-review-controller.ts` | Loads details and playback blob separately | duplicate IO/decode | No | Resolve body once and share details/playback body | 20-60 | playback lifecycle | artifact review tests |
| P2 | `src/lib/sheet-practice/recording-service.ts` | Builds draft recording with `audioDataUrl` to decode captured audio | duplicate IO/decode | No | Decode from captured Blob/body, not data URL | 30-70 | trusted peaks and duration | sheet recording tests |
| P2 | quick/sheet save controllers | Artifact-first save, metadata commit, rollback | duplicate flow | Partly | Extract leaf helpers only, not a transaction framework | 80-140 | rollback correctness | quick/sheet save failure tests |
| P3 | `src/lib/recordings-review/repository.ts` | Public API includes legacy `getArtifact()` and unused metadata save variant | stale public API | No | Delete stale methods | 20-30 | Tests need rewriting | repository tests |
| P4 | large unit/e2e tests | Repeated recording/audio/storage fixtures | test bloat | No | Shared factories and artifact seed helpers | 700-1200 | Coverage accidentally removed | full unit plus focused e2e |

## D. First Small PR

Recommended first implementation PR after this plan is reviewed:

### Option A: if product confirms no formal release / no real legacy local data obligation

Delete legacy `audioDataUrl` migration and fallback.

Files to delete or heavily simplify:

- `src/lib/recordings-review/artifact-migration.ts`
- `src/lib/recordings-review/artifact-data-url.ts`
- `src/lib/recordings-review/artifact-service.ts`
- `src/lib/quick-metronome/artifact-controller.ts`

Files to update:

- `src/lib/recordings-review/artifact-storage.ts`
- `src/lib/recordings-review/artifact-model.ts`
- `src/lib/recordings-review/audio-export.ts`
- `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/services/recordings-review/index.ts`
- `src/components/recordings-review/use-recordings-review-controller.ts`
- `src/components/quick-metronome/quick-metronome-experience.tsx`
- `src/components/quick-metronome/latest-quick-recording.tsx`
- legacy-heavy tests in `recordings-review-artifact-storage.test.ts` and
  `recordings-review.spec.ts`

Do not change:

- New quick/sheet artifactRef-first save paths.
- IndexedDB recording artifact repository.
- Missing artifact body/ref states.
- Unsupported MIME, decode failed, empty audio states.
- Delete/clear artifact cleanup safety.

Verification commands:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run test:e2e -- recordings-review.spec.ts sheet-recording-review.spec.ts sheet-segment-recording.spec.ts quick-metronome.spec.ts
```

Regression risk:

- Existing localStorage recordings with only `audioDataUrl` will stop playing.
- This is acceptable only if the project has not formally shipped and the user
  accepts dropping developer-era local data compatibility.

### Option B: if legacy compatibility must remain

Make the first PR a lower-risk cleanup:

- Delete `artifact-service.ts`.
- Delete or fold `quick-metronome/artifact-controller.ts` into a real quick
  controller boundary.
- Remove stale `recordingHistoryRepository.getArtifact()`.
- Remove unused `saveSheetReviewRecordingMetadata`.
- Rewrite boundary tests to forbid concrete module paths instead of function
  names.

This reduces less code, but avoids the data-retention decision.

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

### Phase 2: Legacy Compatibility Decision

If no formal release/user-data obligation exists:

- Delete legacy `audioDataUrl` migration.
- Delete runtime legacy fallback.
- Remove `audioDataUrl` from persisted `ReviewRecording` shape, except for
  non-persisted demo/capture-only structures if still needed.
- Delete `legacy-artifact-malformed` and data URL MIME mismatch branches.

Keep:

- `missing-artifact-ref`
- `missing-artifact-body`
- `unsupported-mime`
- `decode-failed`
- `empty-audio`
- storage/quota errors

If legacy must stay:

- Delete only unused `persistLegacyFallback`.
- Keep migration tests but reduce duplicated E2E legacy seeding.

### Phase 3: Duplicate Artifact IO/Decode

- Replace the parallel calls in `useRecordingArtifactReviewController`:
  - current: `loadRecordingArtifactDetails(recording)` plus
    `resolveRecordingArtifactBody(recording)`
  - target: one helper returns `{ details, body }`
- Let sheet recording decode from captured `Blob` / `RecordingArtifactBody`
  instead of constructing a draft `ReviewRecording` with `audioDataUrl`.
- Centralize artifact error reason-to-message mapping for waveform/export/details
  only if the helper stays small.

### Phase 4: Type Model Cleanup

- Stop representing metadata-only sheet session rows as fake `ReviewRecording`
  with:
  - `sizeBytes: 0`
  - `mimeType: "metadata/session"`
  - `audioDataUrl: null`
- Add a separate metadata-only bucket/type for practice-session metadata.
- Keep real `ReviewRecording` for real quick/sheet recordings that have, or are
  expected to have, audio artifacts.

### Phase 5: Save/Rollback Flow Consolidation

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
  - `cleanupArtifactsOrThrow`
  - `restoreOrDeleteSessionSnapshot`
- Do not introduce a generic transaction framework.

### Phase 6: Test Slimming

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

### Test Coverage Risk

Test slimming must move repeated setup into helpers. It must not delete Pack 1
or Pack 2 behavioral contracts.

## H. Agent Execution Order

Use small PRs, one at a time:

1. PR 1: legacy decision or safe wrapper/API cleanup.
2. PR 2: artifact body/details single-resolve path.
3. PR 3: sheet recording direct Blob/body decode.
4. PR 4: metadata/session type split.
5. PR 5: quick/sheet save leaf helpers.
6. PR 6: unit and E2E fixture slimming.

After each PR:

- run targeted tests first;
- run broad unit/typecheck/lint/build before merge;
- request web ChatGPT review in the `metronome` project;
- address review findings before moving to the next PR.

## Review Questions For Web ChatGPT

1. Is deleting legacy `audioDataUrl` migration acceptable for a private,
   unreleased `0.0.0` local-first app, or should it be kept until a formal data
   reset decision?
2. Should `metadata/session` be split before or after legacy cleanup?
3. Is the proposed first implementation PR small enough?
4. Are any required Pack 1 or Pack 2 behaviors missing from the test matrix?
5. Is any proposed helper at risk of becoming a facade or transaction framework?
