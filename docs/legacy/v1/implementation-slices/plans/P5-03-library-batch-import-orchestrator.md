# P5-03 Library Batch Import Orchestrator Plan

## Slice

- Slice id: P5-03 `library-batch-import-orchestrator`
- Pack: Pack 5 Library / Viewer Upgrade
- Product feature: `library.batch-import`
- Product contract: `docs/v1/04-sheet-library.md`
- Slice file: `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- Builds on: P5-01 `library-tags-favorites-domain` and P5-02 `library-tags-favorites-ui`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Ponytail mode: full; smallest working batch flow, no queue framework
- Status: planning artifact only; no product source code changed by this plan

## Refined Scope

Add batch import for multiple selected sheet files with a clear mixed success/failure summary.

The smallest safe behavior is:

- keep the existing single-sheet import path working for one PDF or one multi-image sheet;
- add a batch path that treats each selected file as one independent import candidate;
- support mixed PDFs and images in one batch;
- save every valid candidate through the existing preview/import adapter, service, and repository path;
- report each failed candidate without rolling back successful imports;
- refresh the library list with imported sheets and preserve existing tag/favorite UI from P5-02.

No background jobs, retry queue, import history table, progress persistence, folder assignment, tag assignment, or metadata enrichment belongs in this slice.

## Product Behavior

### Single Import Remains

Existing behavior must continue:

- selecting one valid PDF previews and saves one PDF sheet;
- selecting one or more valid images through the existing single import flow must still save one image sheet with `imageCount` equal to the selected image count;
- unsupported files, bad PDFs, and bad images still show existing validation messages;
- the existing metadata form still applies to the current single import path.

P5-03 must not break current real PDF/image artifact evidence already covered by `tests/e2e/sheet-library.spec.ts`.

This single-import behavior must coexist with the new batch action. In particular:

- if the user selects multiple valid images, `Save Imported Sheet` remains available and saves those images as one multi-image sheet through the current preview/import path;
- the new batch action, for example `Import files separately`, is an additional choice that saves each selected image as its own sheet;
- if the user selects mixed files such as PDF + image, unsupported files, or bad files, the existing single-import preview/save path may keep showing the current unsupported/error behavior, while the batch action owns mixed partial success.

### Batch Import

When the user selects multiple files and chooses the batch action:

- each selected file is analyzed independently by calling the existing import adapter with `[file]`;
- each valid PDF becomes one imported PDF sheet;
- each valid PNG/JPG/JPEG becomes one imported image sheet with `imageCount: 1`;
- unsupported files fail only that file;
- a bad PDF fails only that file;
- a bad image fails only that file;
- successful sheets appear in the library without requiring a reload;
- successful sheets persist across reload with readable artifacts;
- failed files do not create sheet rows, artifact rows, or placeholder entries;
- the final visible summary includes counts and per-file results, for example `Imported 2 of 5 files. 3 failed.`;
- per-file rows identify the original filename and either the created sheet name or the failure message.

Partial success is expected, not exceptional. If `real-a.pdf`, `bad.pdf`, and `real-b.png` are selected, the two real files save and `bad.pdf` reports failure.

### Naming Defaults

Batch import should not ask for metadata per file in P5-03.

Use simple defaults:

- `name`: filename stem, trimmed, with extension removed;
- blank stem fallback: `Untitled sheet`;
- duplicate names in the same batch may remain duplicated, but appending ` (2)`, ` (3)` inside the batch is acceptable if it is a tiny helper;
- `category`: current selected category from the import form, defaulting to `song`;
- `bpm`: current selected BPM from the import form, defaulting to `120`;
- `timeSignature`: current selected time signature from the import form, defaulting to `4/4`;
- `tags`: existing P5-01 default `[]`;
- `favorite`: existing P5-01 default `false`.

Do not add batch tag assignment, batch favorite assignment, folder placement, inferred BPM, inferred time signature, or automatic category detection.

## Boundary Decision

Batch orchestration belongs in the Sheet Library service, not in domain and not only in React.

Reasons:

- domain helpers should stay pure and should not know about `File`, `Blob`, PDF parsing, image decoding, or repository writes;
- React should not own the business rule that each candidate must either save through `repository.saveSheet(...)` or fail without creating rows;
- the existing `createSheetLibraryService(...)` already owns validation, adapter calls, ID creation, artifact construction, repository writes, and `SheetListItem` conversion;
- the UI can stay thin: choose files, call one service method, render the returned summary.

Smallest safe boundary:

- add a service method such as `importSheetsBatch(input)`;
- reuse the existing private logic behind `importSheet(...)` by extracting one private helper if needed;
- do not add repository batch methods;
- do not add an import queue, domain aggregate, event bus, worker, or new storage table.

## Likely Files And Areas

Preferred production files:

- `src/services/sheet-library/types.ts`
  - Add `ImportSheetsBatchInput`, `SheetBatchImportItemResult`, and `SheetBatchImportResult`.
  - Add `importSheetsBatch(...)` to `SheetLibraryService`.
- `src/services/sheet-library/service.ts`
  - Implement the sequential batch loop.
  - Factor the existing `importSheet(...)` internals into a small private `importOneSheet(...)` helper only if it avoids duplication.
  - Keep `previewImport(...)` and `importSheet(...)` behavior unchanged.
- `src/components/sheet-library/sheet-library-experience.tsx`
  - Add the smallest UI trigger and summary display for batch import.
  - Reuse existing `selectedFiles`, metadata defaults, message area, and `setSheets(...)`.
  - Do not introduce a separate batch import page or wizard.
- `tests/unit/sheet-library-service.test.ts`
  - Add service-level batch behavior coverage.
- `tests/e2e/sheet-library.spec.ts`
  - Extend the existing sheet-library E2E with one focused mixed batch test using real fixtures.

Touch only if implementation proves necessary:

- `src/infrastructure/files/sheet-import-adapter.ts`
  - Prefer no change. The existing `analyzeFiles([file])` already supports one PDF or one image.
- `src/infrastructure/files/sheet-library-repository.ts`
  - Prefer no change. Existing `saveSheet(sheet, artifact)` is the only storage path needed.
- `src/app/sheet-library/page.tsx`
  - Not expected.

Avoid:

- `src/domain/sheet/**` unless a filename-stem helper is intentionally pure and tiny. Prefer keeping filename defaulting private in the service.
- Sheet Practice/viewer files.
- recording/session/review modules.
- storage contract changes, Dexie version changes, or new object stores.

## Service Contract

Suggested types:

```ts
export type SheetBatchImportMetadataDefaults = Omit<SheetMetadataInput, "name">;

export type ImportSheetsBatchInput = {
  files: File[];
  metadataDefaults: SheetBatchImportMetadataDefaults;
};

export type SheetBatchImportItemResult =
  | {
      ok: true;
      fileName: string;
      sheet: SheetListItem;
    }
  | {
      ok: false;
      fileName: string;
      message: string;
    };

export type SheetBatchImportResult =
  | {
      ok: true;
      total: number;
      importedCount: number;
      failedCount: number;
      items: SheetBatchImportItemResult[];
    }
  | {
      ok: false;
      message: string;
      total: number;
      importedCount: 0;
      failedCount: number;
      items: [];
    };
```

The exact names can follow local style, but the result must preserve per-file detail. Do not return only a string message; tests and UI need item-level evidence.

Suggested method:

```ts
importSheetsBatch(input: ImportSheetsBatchInput): Promise<SheetBatchImportResult>
```

Rules:

- `metadataDefaults` must not include `name`; each item name comes from its filename stem;
- validate shared `category`, `bpm`, and `timeSignature` before saving any candidates;
- for each file, build metadata by combining `metadataDefaults` with `name` from the filename stem;
- run the same metadata validation used by `importSheet(...)`;
- call the existing adapter with a one-file array: `importAdapter.analyzeFiles([file])`;
- on adapter failure, add a failed item and continue;
- on metadata failure for that candidate, add a failed item and continue;
- on repository save failure or unexpected exception for one candidate, add a failed item and continue if the failure is isolated to that item;
- do not report an item as success until both sheet row and artifact row have been saved through `repository.saveSheet(...)`;
- return imported sheets as full `SheetListItem` values using the existing artifact inspection path;
- process sequentially to keep IndexedDB and PDF/image decoding behavior boring and deterministic.

If shared defaults are invalid, return a top-level `{ ok: false, message, total, importedCount: 0, failedCount, items: [] }` result and do not analyze or save any candidate. Candidate-level adapter failures should return `{ ok: true, ...items }` with failed item rows, because partial success is a successful batch operation with per-file failures.

If implementation chooses to call public `importSheet(...)` for each candidate, that is acceptable only if it still returns per-file results and avoids double-analyzing successful files. A tiny private helper is likely clearer.

## UI Contract

Keep UI small:

- retain the current file input with `multiple`;
- when more than one file is selected, show a batch import action such as `Import files separately`;
- leave the existing `Save Imported Sheet` action for the current preview/import path, including multiple selected valid images saved as one multi-image sheet;
- for mixed selections where the existing preview/import path reports the current unsupported/error state, keep that error visible and still allow the batch action to attempt per-file imports;
- disable the batch action while importing;
- show a compact summary after completion;
- show per-file result rows or a short list under the summary;
- add successful sheets to the top of local `sheets` state;
- initialize tag drafts for successful sheets with `""` or `result.sheet.tags.join(", ")`;
- clear the file input only after the batch completes;
- keep failures visible after completion so the user can see which files were skipped.

Do not add:

- per-file metadata editing;
- drag reorder;
- resumable progress;
- cancellation;
- retry all failed;
- import history;
- thumbnails;
- folder/tag/favorite assignment in the import form;
- URL state.

Accessibility:

- the batch button must have a stable accessible name;
- the summary should reuse `role="status"` for mixed success and `role="alert"` only for all-failure or shared validation failure;
- per-file failure messages must be visible text, not console-only;
- disabled states must not trap keyboard users.

Responsive behavior:

- the batch summary can be a normal block inside the existing import card;
- per-file rows should wrap filenames and messages;
- no nested cards are needed.

## Artifact And Storage Guarantees

P5-03 must preserve the current storage contract:

- sheet metadata lives in the existing `sheets` object store;
- artifacts live in the existing `artifacts` object store;
- `repository.saveSheet(sheet, artifact)` remains the only save path for imported artifacts;
- no duplicate artifact storage path, no secondary localStorage copy, no data URL fallback;
- failed candidates must not create orphan artifacts;
- successful candidates must not be deleted or rolled back because a later file fails;
- existing sheets and artifacts must remain untouched by a failed batch;
- delete behavior remains one sheet plus its artifact, unchanged.

Real artifact evidence is required because Pack 5 notes say batch import and thumbnails require real artifacts.

## PDF, Image, Unsupported, And Bad File Handling

PDF:

- one valid PDF file imports as one PDF sheet;
- `pageCount` comes from the existing PDF adapter;
- bad/unreadable PDF reports the existing adapter message;
- multi-page PDF is still one sheet.

Image:

- one valid PNG/JPG/JPEG file imports as one image sheet;
- dimensions come from the existing image decode path;
- bad/undecodable image reports the existing adapter message;
- multiple images in batch are separate sheets, one per image.

Unsupported:

- unsupported extensions or MIME types fail per file;
- unsupported files do not block neighboring supported files.

Mixed selection:

- PDFs, images, unsupported files, bad PDFs, and bad images can be selected together;
- the batch result order should match selected file order;
- the summary must make partial success obvious.

## Out Of Scope

- Recent practice summaries.
- Review-by-sheet links.
- Viewer thumbnails.
- Viewer page jump.
- Viewer zoom/pan.
- Assisted page turning.
- Tag UI beyond existing P5-02 controls.
- Batch tag assignment or favorite assignment.
- Folder system.
- Import queue, background worker, resumable upload/import, cancellation, retry framework, import history table.
- Guitar Pro, MusicXML, automatic PDF recognition beyond current adapter parsing, automatic score following, automatic BPM/time-signature detection.
- Cloud sync, account features, sharing, backup/restore, cross-device merge.
- Product code changes by the planning agent.

## Acceptance Criteria

- Users can import multiple selected valid files in one batch action.
- A batch can contain both PDFs and images.
- Valid files save as separate sheets with real artifacts.
- Unsupported files fail with a visible per-file message.
- Bad PDFs fail with a visible per-file message.
- Bad images fail with a visible per-file message.
- Successful files remain saved when other files fail.
- Failed files do not create sheet rows or artifact rows.
- The final UI summary shows total/imported/failed counts.
- The final UI summary lists per-file success/failure details.
- New batch-imported sheets use filename-stem names by default.
- New batch-imported sheets use existing default `tags: []` and `favorite: false`.
- Existing single import behavior for one PDF and the current image flow still works.
- Existing P5-02 tag/favorite controls and filters still work on batch-imported sheets.
- No new storage table, duplicate artifact path, queue framework, or domain file/blob logic is introduced.

## Boundary And Negative Cases

- Empty file selection: return a zero-result or existing choose-file error; do not throw.
- One selected file: existing single import path should remain the primary UI path; service batch may still support one file for testability.
- Invalid shared metadata defaults: return the top-level failure result, fail before saving any candidates, and show a shared error.
- Candidate filename with only extension or whitespace: save as `Untitled sheet`.
- Two files with the same filename stem: both may import; names may duplicate or get simple suffixes, but storage ids must be unique.
- One candidate throws while decoding: that item fails and later candidates still run if the app remains healthy.
- Repository save failure for one candidate: report that item as failed and do not claim success.
- Existing sheets in the library before batch import: must remain visible and persisted after mixed failure.
- P5-02 favorite/tag updates after batch import: must still call existing service methods, not batch-specific logic.

## Test Coverage Plan

### Unit Coverage

Extend `tests/unit/sheet-library-service.test.ts`.

Required service tests:

- `importSheetsBatch` imports two valid candidates and returns two successful item results.
- Mixed success/failure: one valid PDF, one unsupported file, and one valid image returns two successes and one failure.
- A failed candidate does not create a fake row or artifact.
- Successful candidates remain in `listSheets()` after a later candidate fails.
- Generated metadata names come from filename stems.
- Blank/extension-only filenames fall back to `Untitled sheet`.
- Batch-imported sheets include `tags: []` and `favorite: false`.
- Shared invalid metadata defaults return the top-level failure result without analyzing or saving any candidates.
- The batch loop calls the adapter with one file per candidate.
- Result item order matches input file order.
- Imported artifacts remain retrievable through `getArtifact(sheetId)`.

The memory repository in this test file is enough for most service assertions. Add only the smallest adapter stub needed to return different results per filename.

Repository tests in `tests/unit/sheet-library-repository.test.ts` are not required unless production repository code changes. If it changes, add focused assertions that `saveSheet` still stores each sheet/artifact pair and no extra table/path is introduced.

Domain tests in `tests/unit/sheet-library-domain.test.ts` are not required unless domain code changes. Do not add batch concepts to domain just to test them.

### E2E Coverage

Extend `tests/e2e/sheet-library.spec.ts` with a focused batch test using real fixture files.

Required browser evidence:

- clear the Sheet Library IndexedDB before the test;
- select a mixed set, for example:
  - `real-sheet.pdf`;
  - `real-sheet.png`;
  - `unsupported-sheet.txt`;
  - `bad-sheet.pdf`;
  - `bad-sheet.png`;
- trigger the batch import action;
- assert the visible summary shows `2` imported and `3` failed;
- assert per-file messages identify the successful PDF and image and the failed unsupported/bad files;
- assert the imported PDF sheet is visible with `PDF artifact parsed: 1 page`;
- assert the imported image sheet is visible with `Image artifact decoded: 2 x 2`;
- inspect IndexedDB for both successful sheet ids and verify:
  - sheet row exists;
  - artifact row exists;
  - artifact blob sizes are greater than zero;
  - tags are `[]`;
  - favorite is `false`;
- reload the page and assert both successful sheets and artifact-readable labels remain visible;
- assert failed filenames did not create visible sheet rows;
- assert no browser console errors.

Keep the existing single import E2E assertions. If the file becomes too slow, split the new batch scenario into a second test in the same spec file while reusing existing helpers such as `clearSheetDatabase(...)` and `getSheetPersistence(...)`.

The E2E suite must also preserve evidence for the existing multi-image single-import path:

- selecting multiple valid images and clicking `Save Imported Sheet` still creates one image sheet;
- that sheet reports the combined image/page count and stores one artifact with multiple image files;
- this is separate from the batch action, which imports the same kind of image selection as separate sheets.

## Verification Commands For Coding Agent

Focused unit verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-library-service.test.ts tests/unit/sheet-library-repository.test.ts tests/unit/sheet-library-domain.test.ts
```

Browser verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-library.spec.ts
```

Type/lint/diff checks:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/services/sheet-library/types.ts src/services/sheet-library/service.ts src/components/sheet-library/sheet-library-experience.tsx tests/unit/sheet-library-service.test.ts tests/e2e/sheet-library.spec.ts
git diff --check
```

If actual changed files differ, run equivalent checks against the actual changed source/test files and explain the difference.

## Model Tier Recommendation

- Planning agent: `gpt-5.5`, medium effort, standard speed
- Coding agent: `gpt-5.5`, high effort, standard speed
- Review agent: `gpt-5.4-mini`, high effort, standard speed
- Verification agent: `gpt-5.4-mini`, high effort, standard speed

Rationale: this is a UI plus artifact import/storage slice. It touches real PDF/image decoding through existing adapter boundaries and needs browser E2E with real artifacts, but it should stay narrow because it does not add new storage schema, migration, viewer behavior, or media capture.

Escalate only if implementation discovers that existing adapter/service boundaries cannot import one file at a time, or if IndexedDB artifact persistence requires repository changes. The default plan expects neither.

## Planning Validation

For this planning-only slice:

```powershell
Get-Content -Raw docs/v1/status.json | ConvertFrom-Json | Out-Null
git diff --check
```

## Handoff Notes For P5-03 Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P5-03-library-batch-import-orchestrator.md`
- `docs/v1/implementation-slices/plans/P5-01-library-tags-favorites-domain.md`
- `docs/v1/implementation-slices/plans/P5-02-library-tags-favorites-ui.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/04-sheet-library.md`
- `src/components/sheet-library/sheet-library-experience.tsx`
- `src/app/sheet-library/page.tsx`
- `src/domain/sheet/**`
- `src/services/sheet-library/**`
- `src/infrastructure/files/sheet-import-adapter.ts`
- `src/infrastructure/files/sheet-library-repository.ts`
- `tests/unit/sheet-library-service.test.ts`
- `tests/unit/sheet-library-repository.test.ts`
- `tests/unit/sheet-library-domain.test.ts`
- `tests/e2e/sheet-library.spec.ts`

Implement P5-03 only. Add a service-level batch orchestrator and the smallest UI needed to trigger it and show mixed results. Reuse the existing adapter/service/repository save path. Do not add recent summaries, review links, viewer thumbnails, page jump, zoom/pan, tag UI beyond the existing P5-02 controls, new storage paths, or a queue framework.
