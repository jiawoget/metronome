# D1-05 Unit Recording Fixture Residual Audit Plan

## Purpose

This is the reviewed implementation plan for D1-05 in
`pack-d-codebase-slimming-follow-up`. It does not authorize coding until the
full plan is reviewed in the web ChatGPT `metronome` project and returns PASS,
or required changes are applied and re-reviewed.

D1-05 is an audit-first slice. Its job is to re-check residual
recordings-review unit fixture duplication after C2-07, C2-08, C2-10, and D1-04,
then either make one narrow real-deletion edit or close the remaining candidates
as no-go. It must not restart broad fixture cleanup.

## Baseline

- Branch: `codex/d1-05-unit-fixture-audit-plan`
- Baseline branch: `main`
- Baseline commit: `27046027` (`Merge pull request #21 from jiawoget/codex/d1-04-normalization-plan`)
- Previous slice: `D1-04 recordings-review-string-normalization-helper` is
  verified.
- Pack status: `pack-d-codebase-slimming-follow-up` is in progress.
- D1-05 status before this plan: `not_started`
- D1-05 status after this plan: `planning_in_progress`

## Prior Work To Preserve

- C2-07 added `tests/unit/factories/recordings-review.ts` with:
  - `makeQuickReviewRecording`
  - `makeSheetReviewRecording`
  - `makeSheetRecordingSegmentContext`
- C2-08 applied those factories to the larger `recordings-review-experience`
  and `recordings-review-history` tests.
- C2-10 added shared `tests/unit/fixtures/audio-context.ts` and explicitly
  re-scoped broad shared in-memory artifact repository/helper extraction out of
  Pack C because it would hide ownership, corruption, missing-body, and cleanup
  evidence.
- D1-04 only touched production recordings-review string normalization; it did
  not change unit fixtures.

## Residual Inventory

### `tests/unit/recordings-review-audio-export.test.ts`

Current state:

- Uses shared `makeQuickReviewRecording` and `makeSheetReviewRecording`.
- Keeps local `createQuickRecording(...)` and `createSheetRecording(...)`
  wrappers only to apply audio-export-specific defaults:
  - `createdAt`
  - `mimeType`
  - `audioDataUrl`
- Keeps local `createRepository(...)`, `createArtifactBody(...)`, and
  `createArtifactResolver(...)`.

Decision:

- No D1-05 code change.
- The wrappers preserve readable export-specific defaults and deleting them
  would churn call sites rather than remove fixture logic.
- The artifact resolver/body helper is export behavior evidence, especially for
  missing-artifact, unsupported-MIME, decode-failed, and empty-body cases.

### `tests/unit/recordings-review-take-groups.test.ts`

Current state:

- Uses shared factories.
- Local wrappers apply `withArtifactRef: false` so grouping tests do not gain
  irrelevant artifact refs.
- Segment context comes from `makeSheetRecordingSegmentContext`.

Decision:

- No D1-05 code change.
- The remaining wrappers are small semantic adapters for no-artifact grouping
  fixtures.

### `tests/unit/recordings-review-waveform-comparison-sources.test.ts`

Current state:

- Uses shared recording factories and shared `installAudioContextMock`.
- Keeps local `createSheetRecording(...)` wrapper for waveform-specific audio
  defaults.
- Keeps local `saveArtifactForRecording(...)` and `saveArtifactsForRecordings(...)`
  tied to the local `artifactBodies` map.

Decision:

- No D1-05 code change.
- The local artifact helpers make missing artifact, unsupported MIME, stale
  group membership, duplicate ids, and deleted-recording cases explicit.
  Extracting them would repeat the C2-10 no-go.

### `tests/unit/recordings-review-experience.test.tsx`

Current state:

- Uses shared recording factories and shared segment context factory.
- Keeps local `createQuickRecording(...)` and `createSheetRecording(...)`
  wrappers that directly delegate to shared factories.
- Keeps UI-specific helpers:
  - `createMixedSnapshot(...)`
  - `createComparisonResult(...)`
  - `createReadyComparisonSource(...)`
  - `createUnavailableComparisonSource(...)`
  - `createDeferred(...)`

Decision:

- No D1-05 code change.
- Removing the delegating wrapper names would touch many UI call sites for small
  or negative net value. The other helpers are UI behavior fixtures, not
  duplicate recording factory bodies.

### `tests/unit/recordings-review-history.test.ts`

Current state:

- Uses shared recording factories for top-level quick/sheet constants.
- Uses shared `installAudioContextMock`.
- Keeps local `loadTestArtifactDetails(...)` for artifact-detail body tests.

Decision:

- No D1-05 code change.
- `loadTestArtifactDetails(...)` keeps the explicit artifact body passed to
  `loadRecordingArtifactDetailsFromBody(...)`; extracting it would hide the
  missing-audio, decode-failed, invalid-peaks, and duration-mismatch cases.

### `tests/unit/recordings-review-take-history-summary.test.ts`

Current state:

- Uses shared `makeSheetReviewRecording`.
- Keeps local group, resolved-selection, marker, and sheet-recording helpers.

Decision:

- No D1-05 code change.
- The remaining helpers are summary-specific read-model fixtures. They are not
  duplicate quick/sheet recording factory bodies.

### `tests/unit/recordings-review-artifact-storage.test.ts`

Current state:

- Keeps local `createRecording(...)` and `createMemoryArtifactRepository(...)`.
- Exercises artifact ownership, corrupted refs, post-commit cleanup failure,
  retained artifacts, and old/new recording races.

Decision:

- No D1-05 code change.
- C2-10 already reviewed broad in-memory artifact repository/helper extraction
  and re-scoped it out. D1-05 must not reopen that no-go.

### `tests/unit/recordings-review-repository.test.ts`

Current state:

- Still owns local fixture bodies that duplicate the shared recording factory
  mechanics:
  - `createSegmentContext(...)`
  - `createReviewSheetRecording(...)`
  - `createQuickReviewRecording(...)`
- Also owns helpers that are not duplicate recording factories:
  - top-level raw `snapshot` literal for the local data boundary
  - `createSheetRecording(...)` for `SheetRecordingMetadata`
  - `createTakeSelectionSnapshot(...)` as the repository-specific fixture
  - `createSheetSession(...)` for `PracticeSession`

Decision:

- This is the only D1-05 implementation candidate.
- Replace only the three duplicate recording/segment helper bodies with the
  existing shared unit factories, while keeping wrapper names and call sites.
- Do not touch the raw `snapshot` literal because it is storage-boundary
  evidence.
- Do not touch the `SheetRecordingMetadata` or `PracticeSession` helpers
  because they are domain metadata fixtures, not `ReviewRecording` factories.

## Proposed Implementation

Allowed test edit:

- `tests/unit/recordings-review-repository.test.ts`

Exact allowed changes:

1. Import from `tests/unit/factories/recordings-review.ts`:
   - `makeQuickReviewRecording`
   - `makeSheetReviewRecording`
   - `makeSheetRecordingSegmentContext`
   - needed override types if TypeScript requires them
2. Delete the local `createSegmentContext(...)` body and alias or wrap
   `makeSheetRecordingSegmentContext` as `createSegmentContext`.
3. Replace the local `createReviewSheetRecording(...)` body with a wrapper
   around `makeSheetReviewRecording(...)`.
   - Preserve repository-specific defaults:
     - `id: "sheet-recording-with-segment"`
     - `name: "Alpha Sheet take"`
     - `sessionId: "session-sheet-1"`
     - `sheetName: "Alpha Sheet"`
   - Preserve no-default-artifact-ref behavior with `withArtifactRef: false`.
   - Preserve explicit `segmentContext`, including malformed `unknown`, `null`,
     and valid segment context values.
4. Replace the local `createQuickReviewRecording(...)` body with a wrapper
   around `makeQuickReviewRecording(...)`.
   - Preserve repository-specific defaults:
     - `id: "quick-review-recording"`
     - `name: "Quick review take"`
     - `sessionId: "session-quick-1"`
     - `createdAt: "2026-06-21T08:00:00.000Z"`
     - `durationMs: 9_000`
     - `sizeBytes: 64`
   - Preserve no-default-artifact-ref behavior with `withArtifactRef: false`.
5. Do not change assertion blocks, test names, repository calls, storage keys,
   raw JSON snapshot shapes, or expected values.

Expected implementation value:

- Remove three local duplicate helper bodies.
- Keep existing wrapper names to avoid broad call-site churn.
- Use the existing shared factory; do not add a new fixture module.
- Expected net test LOC reduction after imports and shorter wrappers:
  approximately 25-40 lines.

## Explicit Non-Scope

- No production code.
- No E2E code.
- No `recordings-review-artifact-storage.test.ts` changes.
- No shared in-memory artifact repository helper.
- No artifact body/resolver helper extraction.
- No AudioContext fixture changes.
- No call-site rewrite across large UI tests.
- No assertion deletion, weakening, broadening, or relocation for cosmetic
  reasons.
- No formatting-only, import-sorting-only, or line-wrapping-only churn.
- No changes to `audioDataUrl` legacy-path coverage.
- No changes to artifact-backed recording contracts.

## Verification Commands

Run targeted baseline before implementation and targeted verification after
implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-repository.test.ts
```

Run before PR review after implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-experience.test.tsx recordings-review-take-groups.test.ts recordings-review-waveform-comparison-sources.test.ts recordings-review-audio-export.test.ts recordings-review-repository.test.ts
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

Full E2E is not mandatory for D1-05 because this slice is unit-test fixture
only and the Pack D rule requires the next full E2E checkpoint after D1-06. If
implementation touches E2E, production, routing, storage contracts, or UI
behavior, it is out of scope and must return to planning.

## PR Review Evidence Required

The PR description must include:

- The per-file residual audit summary.
- Implementation files changed.
- Helper bodies removed.
- Shared factory functions adopted.
- Confirmation that raw repository snapshot literals remain local.
- Confirmation that `recordings-review-artifact-storage.test.ts` remains
  untouched.
- Assertions touched: expected no.
- Net test LOC excluding docs/status.
- Verification command results.

## Acceptance Criteria

- Web ChatGPT plan review returns PASS, or required changes are applied and
  re-reviewed before coding.
- Only `recordings-review-repository.test.ts`, this plan file, and
  `docs/v1/status.json` change.
- The three duplicate repository-test helper bodies are removed or replaced
  with wrappers around the existing shared recording-review factories.
- Raw storage-boundary literals and repository metadata helpers remain explicit.
- No behavior assertions change.
- Targeted unit, residual targeted unit set, full unit, typecheck, lint, and
  `git diff --check` pass.
- Web ChatGPT PR review returns PASS or PASS_WITH_NITS with no blockers.
- GitHub CI is green before merge.

## Review Questions For Web ChatGPT

1. Is it safe and worthwhile to implement only the
   `recordings-review-repository.test.ts` helper delegation candidate?
2. Should the repository raw `snapshot` literal stay local as storage-boundary
   evidence?
3. Are the no-go decisions for artifact-storage, waveform artifact helpers, and
   UI helper wrappers correctly scoped?
4. Is the targeted verification set sufficient for this unit-fixture-only
   change?
5. If this still smells like fake slimming or hidden behavior evidence, should
   D1-05 close as audit-only/no-go instead of touching tests?
