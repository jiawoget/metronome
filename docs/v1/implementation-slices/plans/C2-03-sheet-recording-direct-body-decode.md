# C2-03 Sheet Recording Direct Body Decode Plan

## Status

- Workstream: `pack-c-codebase-slimming`
- Slice: `C2-03 sheet-recording-direct-body-decode`
- Current lifecycle state: `verified`
- Parent plan: `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
- Baseline branch: `main`
- Baseline commit: `6f7ae8280076822014c4a8f00901cf485e8eeb4f`
- Previous slice: `C2-02 metadata-session-type-split` is `verified` and merged.
- Plan review: `PASS_WITH_CHANGES`, then `PASS` after the requested helper API
  and test-scope clarifications.
- PR review: `PASS`; no blocking findings.

## Decision

C2-03 is a narrow structural cleanup. It removes the runtime dependency where
sheet recording save decodes a captured artifact by first constructing a draft
`ReviewRecording` with `audioDataUrl`.

This PR must not delete legacy `audioDataUrl` migration or fallback. That is
C2-04 scope and still requires the explicit legacy data policy gate.

## Problem

`src/lib/sheet-practice/recording-service.ts` currently calls
`loadRecordingArtifactDetails(...)` with a draft `ReviewRecording`:

- `id: "sheet-recording-draft"`
- `artifactRef` absent
- `audioDataUrl: artifact.dataUrl`

That keeps the sheet save path dependent on the legacy `audioDataUrl` resolver
even though the captured `RecordingArtifact` already has the Blob body needed
for decode.

## C2-03 Scope

Do only the smallest direct-decode split:

1. Add a small exported artifact-details function that decodes a provided Blob
   directly. The intended shape is:

```ts
loadRecordingArtifactDetailsFromBody(input: {
  recordingId: string;
  blob: Blob;
  metadataDurationMs: number;
  trustedPeaks?: number[];
}): Promise<RecordingArtifactDetails>;
```

An equivalent narrow signature is acceptable, but it must stay in
`artifact-details.ts`, must not call `resolveRecordingArtifactBody(...)`, and
must not introduce a new artifact facade or model layer.
2. Keep `loadRecordingArtifactDetails(recording)` behavior by having it resolve
   the body and delegate to the direct-body decode helper.
3. Update `BrowserSheetRecordingService.stopAndSave(...)` to decode from the
   captured artifact Blob/body instead of constructing a draft
   `ReviewRecording` with `audioDataUrl`.
4. Remove `createDraftSheetReviewRecording(...)` if it becomes unused.
5. Keep final persisted sheet `ReviewRecording` artifactRef-backed and
   `audioDataUrl: null`.
6. Add a focused regression test proving sheet save no longer depends on
   `artifact.dataUrl` being a valid data URL.

## Explicit Non-Scope For C2-03

- No deletion of `artifact-data-url.ts`.
- No deletion of `artifact-migration.ts`.
- No deletion of legacy `resolveRecordingArtifactBody(...)` fallback branches.
- No removal of `audioDataUrl` from `ReviewRecording` or quick recording types.
- No C2-04 legacy data policy decision.
- No artifact resolver single-resolve refactor; that remains C2-05.
- No quick recording save rewrite.
- No UI, E2E flow, playback, waveform comparison UI, export, or migration
  behavior changes beyond preserving existing behavior.
- No new helper module or facade.

## Expected File Changes

Likely production files:

- `src/lib/recordings-review/artifact-details.ts`
- `src/lib/sheet-practice/recording-service.ts`

Likely existing test file:

- `tests/unit/sheet-practice-recording.test.ts`

Test additions there should stay narrow: prove sheet save no longer depends on
a valid `artifact.dataUrl`. Do not expand this into a new service rollback
matrix.

Potentially touched only if the direct-body helper needs narrower typing:

- `src/lib/recordings-review/artifact-model.ts`

If implementation needs more production files than this, stop and explain why
before continuing.

## Acceptance Criteria

- `BrowserSheetRecordingService.stopAndSave(...)` no longer constructs a draft
  `ReviewRecording` with `audioDataUrl` for pre-save decode.
- Captured sheet recording Blob decode still produces:
  - decoded duration for prepared metadata;
  - non-empty trusted peaks;
  - `empty-audio` and `decode-failed` errors through the existing error path.
- Persisted sheet recordings remain artifactRef-backed and persist
  `audioDataUrl: null`.
- Existing sheet save rollback/session behavior remains unchanged:
  - artifact save failure;
  - final history save failure;
  - prepared session commit failure;
  - previous/new session rollback.
- `loadRecordingArtifactDetails(recording)` remains compatible for review,
  waveform, export-adjacent callers, and legacy fallback callers.
- C2-03 does not remove or weaken any legacy runtime fallback outside the sheet
  save pre-decode path.

## Test Plan

Targeted unit:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- sheet-practice-recording.test.ts recordings-review-history.test.ts recordings-review-waveform-comparison-sources.test.ts architecture-boundaries.test.ts
```

Broad checks before PR:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:unit
```

Focused E2E only if implementation changes behavior beyond the pre-save decode
mechanism or touches UI-visible recording flows:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-recording-review.spec.ts sheet-segment-recording.spec.ts
```

Do not add a broad rollback matrix in C2-03 unless existing tests fail; rely on
existing coverage for unchanged rollback behavior.

## Implementation Guardrails

- Keep production changes narrow, ideally 2 files.
- Do not create a new module or barrel.
- Prefer moving existing decode logic behind a direct-body helper over copying
  decode logic into sheet recording service.
- The direct-body helper must accept only the body/blob data and metadata needed
  to build `RecordingArtifactDetails`; it must not resolve artifacts itself.
- Do not claim this PR deletes legacy `audioDataUrl`; it only removes one
  runtime dependency from sheet save.
- If direct sheet decode requires artifact resolver, migration, export, or UI
  changes, stop and split the work.

## Coding Handoff

Implement C2-03 only after this plan receives web ChatGPT review approval.
Start from current `main`, where C2-02 is already merged and verified.
