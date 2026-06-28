# P2 Stage B Recording Artifact Storage Plan

## Purpose

Stage B moves recording audio bodies out of the shared localStorage recording history JSON and into an IndexedDB/Dexie-backed artifact store. The localStorage snapshot remains the synchronous metadata/history source used by Recordings Review, Sheet Practice, Quick Metronome history, take grouping, selections, organization metadata, and markers.

This is a separate storage migration stage after PR #3 Stage A. Do not re-plan or re-implement Stage A work here. Stage A fixed immediate Pack 2 blockers and may have left audio bodies in localStorage as a known temporary risk. Stage B is the migration PR that removes that risk for new saves and safely migrates legacy bytes.

Do not implement production code from this planning pass. Do not update `docs/v1/status.json`.

## Source Context

Required scheduling and mapping docs:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/product-feature-map.md`
- `docs/v1/implementation-slices/02-segment-take-review.md`
- `docs/v1/implementation-slices/plans/P2-review-hardening.md`

Product and technical contracts used for this plan:

- `docs/v1/03-recordings-review.md`
- `docs/v1/05c-sheet-recording-review.md`
- local-first storage patterns from existing Dexie repositories and storage constants

Current implementation facts checked before writing this plan:

- `src/lib/recordings-review/types.ts` stores audio bodies on `ReviewRecording.audioDataUrl`.
- `src/lib/recordings-review/repository.ts` reads and writes the shared localStorage snapshot through `RECORDING_HISTORY_STORAGE_KEY`; `getSnapshot()` is synchronous.
- `src/components/recordings-review/use-recordings-review-controller.ts` uses `useSyncExternalStore(service.subscribe, service.getSnapshot, ...)`.
- `src/lib/quick-metronome/session.ts` creates quick recordings with `audioDataUrl: artifact.dataUrl`.
- `src/lib/quick-metronome/persistence.ts` saves quick recordings into the shared localStorage snapshot.
- `src/lib/sheet-practice/recording-service.ts` creates sheet review recordings with `audioDataUrl: artifact.dataUrl` and writes them into the shared snapshot after capture and validation.
- `src/lib/recordings-review/artifact-service.ts`, `audio-export.ts`, `waveform-comparison-sources.ts`, and `wavesurfer-adapter.ts` currently resolve bodies from `recording.audioDataUrl`.
- Existing Dexie examples live in `src/infrastructure/files/sheet-library-repository.ts`, `src/infrastructure/reference/reference-repository.ts`, and `src/infrastructure/db/*`.

## Stage B Goal

Move recording audio bodies/artifacts out of the localStorage recording history JSON into IndexedDB/Dexie storage, while preserving the existing synchronous metadata snapshot/subscription model.

The intended end state:

- New quick and sheet recording save paths write the audio body to IndexedDB first, then write localStorage metadata containing an artifact ref.
- Legacy records with `audioDataUrl` migrate idempotently and safely.
- The localStorage snapshot remains small metadata plus compatibility fields, not base64 audio bodies.
- Review, playback, export, waveform, delete, quick clear, and sheet metadata flows stay usable.
- Metadata-only and legacy unsupported records remain visible with specific unavailable states.

## Non-Goals

- No broad rewrite of recording history persistence.
- No async redesign of `getSnapshot()` or Recordings Review subscription state.
- No server storage, backend storage, cloud sync, account login, backup/restore, cross-device resume, remote sharing, or localStorage-as-artifact-store replacement.
- No Pack 8 import/export/restore/storage-management UI.
- No automatic scoring, beat alignment, mistake detection, onset detection UI, or DAW-like editing.
- No changes that weaken Stage A boundary tests, MIME/export behavior, quick clear safety, 12/8 metadata preservation, or Practice Again behavior.
- No replacing WaveSurfer, MediaRecorder, or Dexie with new libraries unless a direct local dependency already exists and the reviewer accepts it.

## Model And Tier

This is Tier E: risky data operation, migration, cleanup, and media persistence.

- Planning agent: GPT-5.5, medium effort, standard speed
- Coding agent: GPT-5.5, high effort, standard speed
- Internal review agent: GPT-5.5, high effort, standard speed
- Verification agent: GPT-5.4 or GPT-5.5, high effort, standard speed

Rationale: a false pass can lose user recording audio, orphan metadata, or hide take history. Verification must include real storage inspection, not only UI behavior.

## Data Model

### Recording Metadata Snapshot

Keep `RecordingReviewSnapshot` in localStorage as the synchronous review metadata source:

```ts
type RecordingReviewSnapshot = {
  sessions: unknown[];
  recordings: ReviewRecording[];
  errorMarkers: RecordingErrorMarker[];
  takeSelections?: RecordingTakeSelectionMetadata[];
  recordingOrganization?: RecordingOrganizationMetadata[];
  [futureKey: string]: unknown;
};
```

Update `ReviewRecording` to support artifact refs without requiring bodies:

```ts
type RecordingArtifactRef = {
  kind: "indexeddb";
  artifactId: string;
  storageVersion: 1;
};

type ReviewRecording = {
  id: string;
  type: "quick" | "sheet";
  origin?: "user" | "demo";
  name?: string;
  sessionId: string;
  sheetId: string | null;
  sheetName?: string | null;
  createdAt: string;
  durationMs: number;
  sizeBytes: number;
  mimeType: string;
  artifactRef?: RecordingArtifactRef | null;
  audioDataUrl?: string | null; // legacy read-only compatibility during migration
  artifactAnalysis?: RecordingArtifactAnalysis | null;
  trustedPeaks?: number[];
  segmentContext?: SheetRecordingSegmentContext | null;
  settings: Pick<MetronomeSettings, "bpm" | "timeSignature"> &
    Partial<Omit<MetronomeSettings, "bpm" | "timeSignature">>;
};
```

Important metadata rules:

- `artifactRef` means "there should be a local audio body in artifact storage."
- `audioDataUrl` means "legacy body still present and eligible for migration."
- `artifactRef: null` or missing plus `audioDataUrl: null` means metadata-only or missing artifact.
- Do not use `mimeType: "metadata/session"` as an artifact MIME.
- Keep `sizeBytes`, `durationMs`, `artifactAnalysis`, and `trustedPeaks` as factual metadata in the snapshot.
- Preserve unknown top-level snapshot fields when reading and writing.

### IndexedDB Artifact Record

Add a Dexie-backed artifact repository. Suggested file:

- `src/infrastructure/db/recording-artifact-repository.ts`

Add a storage constant:

- `RECORDING_ARTIFACT_DB_NAME = "metronome-practice-v1-recording-artifacts"` in `src/infrastructure/storage/storage-contracts.ts`

Suggested Dexie schema:

```ts
type LocalRecordingArtifact = {
  artifactId: string;
  recordingId: string;
  recordingType: "quick" | "sheet";
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  createdAt: string;
  updatedAt: string;
  legacyMigratedFrom?: "audioDataUrl";
};
```

Dexie table:

```ts
recordingArtifacts: Table<LocalRecordingArtifact, string>;

this.version(1).stores({
  recordingArtifacts: "artifactId, recordingId, recordingType, createdAt, updatedAt"
});
```

Artifact id:

- Stage B default requirement: deterministic `artifactId = recording.id` for every recording-owned artifact.
- Random UUID artifact ids are not a normal Stage B path and must not be used merely as a convenience.
- Only if implementation proves that real duplicate recording ids can exist may it add explicit collision handling. That collision handling must include tests proving:
  - duplicate metadata ids do not generate duplicate artifact bodies silently;
  - a metadata row cannot point to another recording's artifact body;
  - retrying migration does not create a new artifact id for the same recording;
  - delete/clear cannot delete a retained recording's artifact because of an id collision.
- Do not allow one recording metadata row to point to an artifact owned by another recording id.

## Service Boundary

Add a small artifact service layer between UI/controllers and Dexie:

Suggested files:

- `src/lib/recordings-review/artifact-storage.ts`
- `src/infrastructure/db/recording-artifact-repository.ts`

Suggested ports:

```ts
type RecordingArtifactBody = {
  artifactId: string;
  recordingId: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  objectUrl?: string;
};

type RecordingArtifactRepository = {
  saveArtifact(input: LocalRecordingArtifact): Promise<LocalRecordingArtifact>;
  getArtifact(artifactId: string): Promise<LocalRecordingArtifact | null>;
  deleteArtifact(artifactId: string): Promise<void>;
  deleteArtifacts(artifactIds: string[]): Promise<void>;
  listArtifactsForRecordings(recordingIds: string[]): Promise<LocalRecordingArtifact[]>;
  clear(): Promise<void>;
  subscribe?(listener: () => void): () => void;
};

type RecordingArtifactResolver = {
  resolveArtifactBody(recording: ReviewRecording): Promise<RecordingArtifactBody>;
  saveCapturedArtifact(input: {
    recordingId: string;
    recordingType: "quick" | "sheet";
    artifact: RecordingArtifact;
    createdAt: string;
  }): Promise<RecordingArtifactRef>;
  migrateLegacyArtifact(recording: ReviewRecording): Promise<RecordingArtifactRef | null>;
  deleteArtifactForRecording(recording: ReviewRecording): Promise<void>;
};
```

Error taxonomy should be explicit:

```ts
type RecordingArtifactUnavailableReason =
  | "missing-artifact-ref"
  | "missing-artifact-body"
  | "legacy-artifact-malformed"
  | "unsupported-mime"
  | "decode-failed"
  | "empty-audio"
  | "storage-unavailable"
  | "quota-exceeded";
```

UI-facing messages should remain specific:

- Missing ref: "This recording has no local audio artifact."
- Missing body: "This recording's local audio artifact is missing."
- Unsupported MIME: "This recording artifact is not a supported audio type."
- Decode failed: "This recording artifact could not be decoded locally."
- Empty audio: "This recording artifact decoded as empty audio."
- Storage unavailable/quota: "Local recording artifact storage is unavailable in this browser."

## Architecture Boundaries

- `getSnapshot()` stays synchronous and returns metadata only.
- `subscribe()` stays event based and can still listen to the localStorage snapshot events.
- Artifact body resolution is async and happens in services/controllers only.
- Dexie, localStorage, artifact migration, and artifact cleanup must execute only inside browser-only functions/effects/controllers after runtime availability checks.
- No module-top-level Dexie opening, localStorage reads/writes, migration scans, artifact cleanup, or browser API side effects.
- SSR imports must be safe: importing a module from an app route, server component, or test environment must not touch `window`, `indexedDB`, Dexie instances, localStorage, Blob URL APIs, or MediaRecorder at import time.
- React UI components do not import Dexie repositories, localStorage repositories, MediaRecorder, WaveSurfer adapters, raw data URL conversion helpers, or download adapters directly.
- `RecordingArtifactReview` continues to receive an injected/hook-created controller.
- `recordingsReviewService` can expose async methods for artifact-backed playback/export/waveform operations.
- Server components and routes must not access localStorage, Dexie, recording repositories, or artifact services.

Keep or extend `tests/unit/architecture-boundaries.test.ts` so Recordings Review UI cannot import:

- `@/lib/recordings-review/repository`
- `recordingHistoryRepository`
- `recordingAudioExportService`
- `RecordingWaveformPlaybackAdapter`
- `loadRecordingArtifactDetails`
- new `recordingArtifactRepository`
- Dexie

Also add boundary coverage for app/server layers:

- files under `src/app/**/page.tsx`, route handlers, server components, and server-only entry modules must not import the artifact repository, migration service, Dexie, `recordingHistoryRepository`, or browser artifact services;
- importing `src/services/recordings-review/index.ts` or route/page modules in SSR-like tests must not perform browser storage side effects.

## LocalStorage Concurrent Write Protection

Every Stage B code path that rewrites the shared recording history localStorage snapshot must protect against stale writes. This applies to migration, review delete, quick clear, sheet clear, metadata cleanup, settings/local data cleanup when it rewrites the snapshot, and any helper that writes from a raw parsed snapshot.

Required write protocol:

1. Read the current raw localStorage value and store it as `originalRawSnapshot`.
2. Parse `originalRawSnapshot` into a raw object.
3. Prepare the mutation from that raw parsed object as the base, preserving unknown top-level fields and unknown retained per-record fields.
4. Immediately before `localStorage.setItem`, read the current raw localStorage value again.
5. If the current raw value differs from `originalRawSnapshot`, abort the write and either:
   - retry from the new raw value, or
   - return a typed stale-snapshot/concurrent-write result for the caller to retry.
6. Never write a snapshot derived from stale bytes.

Additional rules:

- The stale-write guard must wrap metadata writes, not only artifact writes.
- A failed or aborted stale write must not remove legacy `audioDataUrl`, metadata rows, take selections, organization entries, markers, sessions, or unknown fields.
- Retry loops must be bounded and observable in tests; after retry exhaustion, return a failure result instead of writing stale data.
- The protocol is required even when tests are single-tab, because browser `storage` events do not protect against lost updates between two localStorage read/write flows.

## Migration Algorithm

Migration must be idempotent, failure-safe, and non-destructive.

Recommended trigger:

- Run migration from a browser-only artifact migration service when Recordings Review initializes and when quick/sheet recording services initialize, after runtime checks confirm `window`, `localStorage`, `indexedDB`, Blob, and Dexie are available.
- Do not run migration from server components.
- Do not run migration at module import time.
- Do not block metadata list rendering while migration runs.
- Publish a review/service event after a successful metadata rewrite so subscribers refresh.

Algorithm for each recording in current snapshot:

1. Read the raw localStorage string and keep it in memory as `originalRawSnapshot`.
2. Parse to a raw object, not only normalized known fields, so unknown future fields can be preserved.
3. Select legacy records where:
   - `audioDataUrl` is a non-empty string,
   - `artifactRef` is missing or invalid, and
   - `id`, `type`, `mimeType`, `sizeBytes`, and `createdAt` are valid enough to create an artifact.
4. For each selected record:
   - Convert `audioDataUrl` to a `Blob`.
   - Validate that the data URL MIME matches the recording MIME when the MIME is a known export/decodable type.
   - Save the Blob to Dexie under a recording-owned artifact id.
   - Read back the artifact or otherwise confirm the save resolved successfully.
   - Prepare a metadata update that sets `artifactRef` and removes `audioDataUrl` from the persisted snapshot or writes it as `null`.
5. Add the record to the rewrite batch only after conversion, validation, artifact save, and artifact readback/confirmation all succeed.
6. Failed records stay out of the rewrite batch, keep their original `audioDataUrl`, and produce a per-record failure result. They must not block other records whose artifact save/readback succeeded.
7. Only after every record in the current rewrite batch has confirmed artifact storage, write the metadata snapshot for that batch.
8. The metadata write must use the raw parsed object as base and replace only:
   - migrated `recordings`,
   - any normalized fields that are intentionally updated.
9. Immediately before writing, re-read localStorage and compare it to `originalRawSnapshot`. If it changed, abort/retry from the new raw value and do not write the stale mutation.
10. If any artifact save, conversion, validation, or metadata rewrite fails for a specific record:
   - do not remove or modify that record's `audioDataUrl`;
   - preserve that record's original localStorage bytes;
   - do not clear the artifact table;
   - return a migration result with per-record failure details.
11. If metadata rewrite fails after artifact saves:
   - keep original localStorage bytes;
   - leave any saved artifact bodies in Dexie as harmless duplicates/orphans for a later idempotent retry;
   - on retry, overwrite the same deterministic artifact id or reuse an existing matching artifact.

Migration result:

- Return a structured result with `migrated`, `skipped`, `failed`, and `orphaned` counts plus per-record entries.
- `migrated` means artifact save/readback succeeded and metadata now points to `artifactRef` without a persisted body.
- `skipped` means no work was needed, such as already migrated, metadata-only, unsupported non-audio metadata, or no legacy body.
- `failed` means the legacy record remains unchanged with its original `audioDataUrl`.
- `orphaned` means artifact save succeeded but metadata rewrite could not commit because of write failure or stale snapshot; retry must reuse deterministic `artifactId = recording.id`.

Idempotency rules:

- A record with a valid `artifactRef` and no `audioDataUrl` is already migrated.
- A record with both `artifactRef` and `audioDataUrl` should verify the artifact body exists, then remove the legacy body if the artifact is readable.
- A record with `artifactRef` whose body is missing should not delete legacy `audioDataUrl` if the legacy body still exists; it should restore/save the artifact first.
- A malformed legacy `audioDataUrl` should remain in localStorage and the record should surface an unsupported/malformed state, not be deleted.

Migration batching:

- It is acceptable to scan all currently loaded legacy artifacts in one Stage B run.
- The rewrite batch must contain only records that validate and whose artifact save/readback succeeded.
- One bad record must not block safe migration of other records. Failed records keep their original `audioDataUrl` and appear in the migration result as failed.
- If quota pressure is likely, migrate one record at a time or in small batches, but still preserve original bytes until each record's artifact save/readback and metadata rewrite both succeed.
- Do not partially rewrite a single recording to remove `audioDataUrl` before its artifact body is confirmed.
- If a batch rewrite aborts because localStorage changed, retry from the latest raw snapshot and rebuild the batch against current metadata.

## New Save Path Requirements

New recordings must be artifact-ref-first. They must not write `audioDataUrl` into the shared localStorage blob and rely on later migration.

### Quick Recording Save

Likely files:

- `src/lib/quick-metronome/session.ts`
- `src/lib/quick-metronome/persistence.ts`
- `src/components/quick-metronome/quick-metronome-experience.tsx`
- `src/components/quick-metronome/latest-quick-recording.tsx`

Required flow:

1. Capture returns `RecordingArtifact` with `blob`, `dataUrl`, `durationMs`, `mimeType`, `sizeBytes`, and analysis.
2. Create a recording id before metadata construction.
3. Save `artifact.blob` to the artifact repository using that recording id.
4. Build `QuickRecording` metadata with `artifactRef`, `sizeBytes`, `mimeType`, `artifactAnalysis`, and no persisted `audioDataUrl`.
5. Save metadata to the shared snapshot.
6. If artifact save fails, do not write the recording metadata as if the artifact exists.

The capture service may keep returning `dataUrl` during the migration, but the save path must not persist it to the shared recording history snapshot for new recordings.

### Sheet Recording Save

Likely files:

- `src/lib/sheet-practice/recording-service.ts`
- `src/services/recording/index.ts`
- `src/services/recording/browser.ts`
- `src/infrastructure/audio/browser-recording-capture.ts`

Required flow:

1. Capture returns a `RecordingArtifact`.
2. Validate non-empty and non-silent audio as today.
3. Decode or derive trusted peaks from the captured Blob/data URL before metadata commit. Prefer reusing a Blob-capable artifact details helper so this does not require metadata persistence first.
4. Create sheet recording metadata/session through `sessionService`.
5. Save the artifact Blob to Dexie.
6. Write the shared review metadata with `artifactRef`, trusted peaks, analysis, and no persisted `audioDataUrl`.
7. If metadata/session creation succeeds but artifact save or metadata write fails, rollback session metadata and local review metadata as the current sheet recording service already attempts.
8. If artifact save succeeds but metadata write fails, delete the newly saved artifact if possible; if artifact delete also fails, report rollback failure rather than silently succeeding.

## Consumer Updates

### Artifact Details And Playback

Likely files:

- `src/lib/recordings-review/artifact-service.ts`
- `src/lib/recordings-review/artifact-review-controller.ts`
- `src/lib/recordings-review/wavesurfer-adapter.ts`
- `src/components/recordings-review/recording-artifact-review.tsx`

Requirements:

- `loadRecordingArtifactDetails(recording)` should resolve the Blob through `artifactRef` or legacy `audioDataUrl` via a resolver, then decode.
- The WaveSurfer adapter should load an object URL or Blob-backed URL supplied by the controller/service, not read `recording.audioDataUrl`.
- The controller owns object URL lifecycle and revokes URLs on recording change/unmount.
- Missing ref/body produces missing-artifact states, not generic decode failures.
- Unsupported MIME remains separate from decode failure.

### Export

Likely files:

- `src/lib/recordings-review/audio-export.ts`
- `src/lib/recordings-review/audio-mime.ts`
- `src/lib/recordings-review/browser-audio-download-adapter.ts`
- `src/services/recordings-review/index.ts`

Requirements:

- Export looks up metadata synchronously, then resolves the artifact body asynchronously.
- Export eligibility still uses the Stage A known-export MIME helper only.
- Unknown `audio/*` must not fall back to `.webm`.
- Do not parse data URLs in UI.
- Legacy `audioDataUrl` export can remain supported through the artifact resolver during migration.

### Waveform Comparison

Likely files:

- `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/components/recordings-review/waveform-comparison-panel.tsx`
- `src/components/recordings-review/recording-comparison-panel.tsx`

Requirements:

- Eligibility checks should no longer require `recording.audioDataUrl`.
- A recording with `artifactRef` is eligible for artifact lookup; a recording with no ref and no legacy body is unavailable as missing artifact.
- Resolution and decode failures map to the existing specific unavailable reasons or an extended reason set.
- Metadata-only sheet recordings stay visible and unavailable for waveform comparison with a clear message.

### Delete And Clear

Likely files:

- `src/lib/recordings-review/repository.ts`
- `src/services/recordings-review/index.ts`
- `src/lib/quick-metronome/persistence.ts`
- `src/infrastructure/db/recording-history-metadata-repository.ts`
- `src/infrastructure/db/browser-settings-local-data-service.ts`

Requirements:

- Deleting a recording from Recordings Review removes its metadata, markers, relevant take selection refs, organization metadata, and its artifact body.
- Deleting one recording must not remove artifact bodies for retained recordings.
- Quick clear removes artifact bodies only for removed quick recordings.
- Sheet metadata clear removes artifact bodies only for removed sheet recordings.
- Selective/global local data clear should clear recording metadata and recording artifacts together.
- Preserve retained recordings, take selections, organization, markers, ambiguous sessions, and unknown future snapshot fields unless they belong to deleted recordings.
- Delete, quick clear, sheet clear, metadata cleanup, and any partial local data cleanup must use the same raw-base and stale-write protocol as migration.
- Delete/clear writes must use the raw parsed object as base and preserve unknown top-level fields, unknown retained per-record fields, ambiguous sessions, retained markers, retained take selections, and retained organization metadata.
- Failure or stale-snapshot aborts must not write partial snapshots.
- If a concurrent tab adds a recording while delete/clear is preparing a write, the stale-write guard must abort/retry so the new recording is preserved.

Failure behavior:

- If artifact delete fails but metadata delete has not happened yet, surface a delete failure and keep metadata visible.
- If metadata delete succeeds and artifact delete fails afterward, surface a warning/failure state if the caller can display one, and leave a cleanup path/test for orphaned artifact deletion.
- Prefer deleting artifact first for single-record deletes, then metadata. For clear operations, compute intended deleted recording ids first, delete corresponding artifacts, then write metadata.
- If the artifact store is unavailable, delete/clear must not delete retained metadata merely because artifact cleanup could not run. Single-record delete should fail visibly before metadata removal unless the target is metadata-only or legacy-body-only and no artifact cleanup is required.

## Likely Files To Change

Core types and storage:

- `src/lib/recordings-review/types.ts`
- `src/infrastructure/storage/storage-contracts.ts`
- `src/infrastructure/db/recording-artifact-repository.ts` new
- `src/lib/recordings-review/artifact-storage.ts` new or equivalent service file
- `src/lib/recordings-review/repository.ts`

Save paths:

- `src/lib/quick-metronome/session.ts`
- `src/lib/quick-metronome/persistence.ts`
- `src/lib/sheet-practice/recording-service.ts`
- `src/services/recording/index.ts`
- `src/infrastructure/audio/browser-recording-capture.ts` only if a Blob-first helper needs a small type/API adjustment

Consumers:

- `src/lib/recordings-review/artifact-service.ts`
- `src/lib/recordings-review/artifact-review-controller.ts`
- `src/lib/recordings-review/wavesurfer-adapter.ts`
- `src/lib/recordings-review/audio-export.ts`
- `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/services/recordings-review/index.ts`
- `src/components/recordings-review/recording-artifact-review.tsx` only if controller props need minimal adjustment
- `src/components/recordings-review/recordings-review-experience.tsx` only for delete/export status messaging if needed

Cleanup/settings:

- `src/infrastructure/db/browser-settings-local-data-service.ts`
- `src/infrastructure/db/recording-history-metadata-repository.ts`

Tests:

- `tests/unit/recordings-review-repository.test.ts`
- `tests/unit/recordings-review-audio-export.test.ts`
- `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
- `tests/unit/recording-artifact-review.test.tsx`
- `tests/unit/sheet-practice-recording.test.ts`
- `tests/unit/quick-metronome-session.test.ts`
- `tests/unit/quick-metronome-control.test.ts`
- `tests/unit/architecture-boundaries.test.ts`
- new `tests/unit/recording-artifact-repository.test.ts`
- new `tests/unit/recording-artifact-migration.test.ts`
- `tests/e2e/fixtures/storage.ts`
- `tests/e2e/recordings-review.spec.ts`
- `tests/e2e/sheet-recording-review.spec.ts`
- `tests/e2e/sheet-segment-recording.spec.ts`
- `tests/e2e/quick-metronome.spec.ts`

## Implementation Phases

### Phase 0: Baseline And Diff Guard

Checkpoint:

- Run `git status --short --branch`.
- Confirm the branch is `codex/v1-pack2-stage-b-artifact-storage`.
- Inspect whether Stage A is already merged in the current branch. Do not revert or weaken Stage A work.
- Run focused baseline tests if feasible before edits:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-repository.test.ts recordings-review-audio-export.test.ts recordings-review-waveform-comparison-sources.test.ts recording-artifact-review.test.tsx
```

If baseline tests are already failing, document exact failures before coding.

### Phase 1: Add Artifact Types, Storage Constant, And Dexie Repository

Work:

- Add artifact ref/body types.
- Add `RECORDING_ARTIFACT_DB_NAME`.
- Implement Dexie repository with save/get/delete/list/clear.
- Dispatch a browser event such as `recording-artifact-store-change` after writes.
- Follow local Dexie style from sheet library/reference repositories.

Acceptance:

- Repository can save, load, overwrite, delete, and clear Blob artifacts.
- Repository validates required ids, MIME, size, and ownership.
- Unit tests cover Dexie connection reset if the existing test setup supports it.

### Phase 2: Add Artifact Resolver And Legacy Data URL Helpers

Work:

- Add a resolver that can load from `artifactRef` or legacy `audioDataUrl`.
- Move data URL to Blob conversion out of export-only code or share a lower-level helper.
- Keep known-export MIME checks distinct from broader decodable MIME checks.
- Add specific error classes/reasons.

Acceptance:

- Missing ref/body, malformed legacy body, unsupported MIME, decode failure, and empty audio are distinguishable.
- Legacy records remain playable/exportable before migration completes.
- UI-facing services do not depend on concrete Dexie classes.

### Phase 3: Implement Failure-Safe Migration

Work:

- Add an async migration service, likely near `src/lib/recordings-review/artifact-storage.ts`.
- Use raw snapshot preservation for unknown fields.
- Implement the localStorage stale-write guard and use it for migration metadata commits.
- Save artifacts before metadata rewrite.
- Remove or null legacy `audioDataUrl` only after artifact save succeeds.
- Return `migrated`, `skipped`, `failed`, and `orphaned` migration stats.
- Publish snapshot change after successful rewrite.

Acceptance:

- Migration success removes audio bodies from localStorage and writes artifact refs.
- Migration failure leaves the exact original localStorage bytes intact.
- Running migration twice produces the same metadata and one valid artifact per recording id.
- Unknown top-level fields survive migration.
- One malformed or quota-failed legacy record does not block other valid records from migrating.
- A stale localStorage write caused by another tab adding/deleting/clearing records aborts or retries without overwriting the other tab's change.

### Phase 4: Convert New Save Paths To Artifact-Ref-First

Work:

- Update quick recording creation/save to allocate recording id, save artifact, then write metadata.
- Update sheet recording service to save artifact before final metadata write and handle rollback.
- Keep capture service changes minimal; prefer adapting at service/save boundary.

Acceptance:

- New quick recordings do not write `audioDataUrl` into the localStorage snapshot.
- New sheet recordings do not write `audioDataUrl` into the localStorage snapshot.
- If artifact save fails, no metadata row claims the recording was saved.
- If metadata write fails after artifact save, rollback deletes the newly saved artifact or reports failure.

### Phase 5: Update Playback, Details, Export, And Waveform Consumers

Work:

- Update artifact details service to resolve bodies through the resolver.
- Update artifact review controller and WaveSurfer adapter to use Blob/object URL.
- Update export service to resolve Blob through artifact service.
- Update waveform comparison source loading to check `artifactRef`/legacy fallback instead of `audioDataUrl` only.

Acceptance:

- Migrated recordings play, show waveform details, export, and compare.
- Metadata-only recordings remain visible and show missing-artifact states.
- Unsupported MIME remains unsupported, not `.webm`.
- UI components remain behind service/controller boundaries.

### Phase 6: Update Delete, Clear, Settings Cleanup, And Fixtures

Work:

- Make review delete remove artifact bodies for deleted recordings.
- Make quick clear remove artifacts only for deleted quick recordings.
- Make sheet metadata clear remove artifacts only for deleted sheet recordings.
- Make settings local data clear remove recording artifact DB along with recording history.
- Route delete/clear/metadata cleanup snapshot writes through the raw-base stale-write helper.
- Add E2E helpers to clear/read the recording artifact DB.

Acceptance:

- Retained recordings keep their artifacts.
- Deleted recordings' artifacts are inaccessible.
- Unknown future snapshot fields, retained take selections, organization metadata, markers, and ambiguous sessions are preserved.
- Local data clear removes both metadata and IndexedDB artifact bodies.
- Concurrent stale delete/clear writes abort/retry and never overwrite a newer recording history snapshot.

### Phase 7: End-To-End Storage QA And Documentation Handoff

Work:

- Add or update E2E coverage for legacy migration, new saves, delete, missing artifact, and localStorage inspection.
- Add manual Chrome acceptance steps.
- Ensure final verification includes storage evidence.

Acceptance:

- localStorage recording history contains no new audio body data after migration or new saves.
- IndexedDB contains artifact bodies for migrated and newly saved recordings.
- Delete/clear behavior matches the data-loss constraints.

## Edge Cases

Migration:

- Valid legacy `audioDataUrl`, artifact save succeeds, metadata rewrite succeeds.
- Valid legacy `audioDataUrl`, artifact save fails.
- Valid legacy `audioDataUrl`, artifact save succeeds, metadata rewrite fails.
- Mixed legacy records where one bad record fails but other safe records migrate.
- Malformed data URL.
- MIME mismatch between data URL metadata and recording `mimeType`.
- Legacy `audioDataUrl` is empty string.
- Recording has both `artifactRef` and `audioDataUrl`.
- Recording has `artifactRef` but missing body.
- Snapshot has unknown top-level fields and unknown future per-record fields.
- Snapshot is partially invalid but contains some valid recordings.

New saves:

- Quick capture creates valid audio.
- Sheet capture creates valid audio with trusted peaks.
- Artifact save quota failure.
- IndexedDB unavailable.
- Metadata save failure after artifact save.
- Duplicate recording ids.

Review:

- Metadata-only sheet recording from session metadata.
- Missing artifact body after another tab deletes it.
- Unsupported MIME.
- Decode failure.
- Empty audio.
- Invalid trusted peaks.
- Stale take selection after delete.

Delete/clear:

- Delete selected best/active take.
- Delete unselected take in same group.
- Delete quick recording only.
- Quick clear with mixed quick and sheet recordings.
- Sheet metadata clear with mixed quick and sheet recordings.
- Ambiguous sessions without explicit `sourceType`.
- Global local data cleanup.
- Delete/clear raw write sees current localStorage changed since `originalRawSnapshot`.
- Delete/clear preserves unknown top-level fields and unknown retained per-record fields byte/deep-equivalent where possible.

Multi-tab:

- Tab A migrates while Tab B has old snapshot.
- Tab A starts migration from stale snapshot while Tab B creates a new quick or sheet recording.
- Tab A starts delete/clear from stale snapshot while Tab B creates/deletes/clears another recording.
- Tab A deletes artifact while Tab B tries playback/export.
- `storage` event updates metadata snapshot; artifact resolver still reports missing body specifically if stale metadata remains.

## Rollback And Failure Behavior

Migration rollback:

- Never delete legacy localStorage bytes before the replacement artifact is saved and the metadata snapshot rewrite succeeds.
- On any migration error, leave original localStorage bytes untouched.
- On per-record validation/save/readback failure, leave that record's original `audioDataUrl` intact and continue migrating other safe records.
- On stale localStorage detection before metadata commit, abort/retry and never overwrite the current raw snapshot.
- Orphan artifact writes caused by a later metadata write failure are acceptable only if a later retry can overwrite or clean them safely.

New save rollback:

- If artifact save fails, do not write recording metadata.
- If session metadata is created and later artifact/metadata persistence fails, restore/delete session state using the existing sheet recording rollback pattern.
- If artifact save succeeds and metadata write fails, attempt artifact delete and report rollback failure if cleanup cannot be confirmed.

Delete rollback:

- Prefer artifact delete before metadata delete for single-record delete.
- If artifact delete fails, keep metadata visible and surface failure.
- If metadata delete succeeds but artifact delete fails due to race or unavailable storage, report failure and leave a cleanup path.
- Delete/clear metadata writes must use raw parsed base preservation and stale-write protection.
- If stale localStorage is detected before delete/clear commit, do not write a partial snapshot; retry from the newest raw value or return a concurrent-write failure.

Unavailable storage:

- Legacy records with `audioDataUrl` remain readable through the legacy resolver.
- New saves fail clearly rather than pretending a recording was saved.
- Metadata-only records remain visible.
- If IndexedDB/Dexie/private-mode storage is unavailable, migration leaves the exact raw localStorage value untouched.
- Legacy resolver can still play/export from `audioDataUrl` when present and the browser can decode/download it.
- Delete and clear must not delete retained metadata just because artifact storage is unavailable.
- Single-record delete of an artifact-backed recording should fail visibly before metadata removal if artifact storage cannot be opened. Metadata-only or legacy-body-only delete can proceed through guarded localStorage rewrite because no IndexedDB artifact body needs deletion.
- Quick clear/sheet clear should remove only metadata and legacy bodies for target records when artifact storage is unavailable if no retained artifact-backed records are endangered; otherwise return a clear failure rather than risk orphaning or deleting retained data.
- Global local data clear is explicit destructive cleanup: if the user invokes full local data clear, it may remove the recording history localStorage snapshot even when IndexedDB artifact cleanup fails, but it must report partial cleanup failure and keep retry instructions/status visible to the caller. Selective cleanup must be conservative and fail before metadata removal when artifact cleanup is required but unavailable.

## Test Matrix

### Unit Tests

Artifact repository:

- Saves and loads Blob artifact with metadata.
- Overwrites deterministic artifact id safely.
- Deletes one artifact without deleting another.
- Lists artifacts for recording ids.
- Clears all artifacts for local data cleanup.
- Rejects invalid artifact id, recording id, empty Blob, invalid MIME, or ownership mismatch.

Artifact resolver:

- Resolves `artifactRef` to Blob.
- Resolves legacy `audioDataUrl`.
- Returns missing-ref for metadata-only recordings.
- Returns missing-body for missing Dexie row.
- Returns malformed legacy error for bad data URL.
- Keeps unsupported MIME distinct from decode failure.

Migration:

- Successful migration writes artifact refs and removes/nulls `audioDataUrl`.
- Failure during artifact save preserves exact original localStorage raw string.
- Failure during metadata rewrite preserves exact original localStorage raw string.
- Failed legacy records do not block successful migration of other valid records in the same scan.
- Migration result reports migrated/skipped/failed/orphaned counts and per-record details.
- Migration is idempotent.
- Migration preserves unknown top-level fields.
- Migration preserves unknown per-record fields.
- Both quick and sheet legacy recordings migrate.
- Records with valid `artifactRef` are skipped.
- Records with both `artifactRef` and `audioDataUrl` verify artifact body and clean legacy body.
- Stale snapshot during migration aborts/retries and preserves Tab B's new recording/delete/clear.
- IndexedDB unavailable/private-mode migration leaves exact raw localStorage untouched.

Repository/metadata:

- `recordingHistoryRepository.getSnapshot()` remains synchronous.
- `saveSnapshot()` and migration writes preserve `sessions`, `errorMarkers`, `takeSelections`, `recordingOrganization`, and unknown future fields.
- `deleteRecording()` removes only the target recording metadata and refs.
- `recordingHistoryMetadataRepository.clear()` removes only sheet recording artifact bodies.
- `quickRecordingRepository.clear()` removes only quick recording artifact bodies.
- Delete, quick clear, sheet clear, metadata cleanup, and raw snapshot helpers preserve unknown top-level and retained per-record fields.
- Delete/clear stale snapshot tests cover Tab A stale snapshot versus Tab B new recording, delete, and clear.
- Delete/clear failure/concurrency cases do not write partial snapshots.
- Raw string equality or deep preservation tests prove retained unknown data survives migration/delete/clear.
- Deterministic `artifactId = recording.id` is used by default; collision handling exists only if real duplicate ids are proven and is covered by no-cross-record pointer tests.

Save paths:

- Quick save is artifact-ref-first and writes no `audioDataUrl`.
- Quick save failure does not write metadata.
- Sheet save is artifact-ref-first and writes no `audioDataUrl`.
- Sheet rollback restores previous metadata/session state and deletes new artifact where possible.
- IndexedDB unavailable/private-mode quick and sheet saves fail and do not write recording metadata.

Consumers:

- Artifact details load through resolver.
- Artifact review controller loads object URL and revokes it.
- WaveSurfer adapter no longer requires `audioDataUrl`.
- Export resolves Blob through resolver and rejects unknown `audio/*`.
- Waveform comparison treats `artifactRef` as eligible and metadata-only as missing artifact.
- Object URL lifecycle tests cover rapid recording switching, component unmount, and concurrent export/playback so URLs are not revoked while still needed by active playback or export.

Architecture:

- Recordings Review UI does not import Dexie, repositories, concrete playback adapters, artifact details loaders, or raw artifact storage services.
- App route/server-layer files do not import artifact repositories, migration services, Dexie, or browser storage modules.
- SSR imports do not perform module-top-level browser storage side effects.
- No file-wide eslint suppressions.

### Integration Tests

- Seed mixed legacy quick/sheet history with take selections, organization, markers, sessions, unknown fields; run migration; assert metadata and all review metadata are retained.
- Save a new quick recording through service fakes; assert localStorage has artifact ref only and Dexie has body.
- Save a new sheet recording through service fakes; assert localStorage has artifact ref only, trusted peaks, segment context, and Dexie body.
- Delete a migrated selected best take; assert selection refs update and only that artifact is deleted.
- Quick clear with mixed history preserves sheet recordings, sheet artifact bodies, sheet take selections, organization, markers, ambiguous sessions, and unknown fields.
- Local data cleanup clears recording history and recording artifact DB.

### E2E Tests

Update or add tests in:

- `tests/e2e/recordings-review.spec.ts`
- `tests/e2e/sheet-recording-review.spec.ts`
- `tests/e2e/sheet-segment-recording.spec.ts`
- `tests/e2e/quick-metronome.spec.ts`
- `tests/e2e/fixtures/storage.ts`

Required E2E acceptance:

- Seed legacy `audioDataUrl` recordings, open Recordings Review, trigger migration, and verify playback/waveform/export still work.
- Inspect localStorage after migration: no `audioDataUrl` values remain for migrated records.
- Inspect IndexedDB: artifact body rows exist and have non-zero Blob size.
- Create a new quick recording: localStorage has artifact ref only, IndexedDB has body, latest recording remains visible after reload.
- Create a new sheet segment recording: localStorage has artifact ref only, IndexedDB has body, take appears in grouped review after reload.
- Export migrated and newly saved recordings.
- Delete a migrated recording: its artifact body is gone and retained recordings' bodies remain.
- Simulate missing artifact body by deleting IndexedDB row while metadata remains: review shows specific missing-artifact state for playback/export/waveform.
- Run quick clear with mixed seeded quick/sheet history: quick artifacts are gone, sheet artifacts remain.
- Simulate stale localStorage in page context: Tab A prepares migration/delete/clear from old raw bytes, Tab B writes a new recording/delete/clear, Tab A commit aborts or retries and preserves Tab B's change.
- Browser console has no uncaught storage/migration errors.

Quota/private-mode automation:

- Unit/integration coverage may rely on fake artifact repositories that throw storage unavailable/quota errors.
- Automated browser tests should cover practical IndexedDB failure hooks when feasible, but real Chrome manual acceptance remains the confidence check for private-mode/quota behavior.

### Manual Chrome E2E Acceptance

Use a real Chrome run after automated tests:

1. Start the app with the repo-local wrapper.
2. Seed or create one legacy recording with localStorage `audioDataUrl`.
3. Open Recordings Review and confirm migration completes without blocking the list.
4. In DevTools Application panel:
   - localStorage recording history contains no large `audioDataUrl` body for migrated/new records.
   - IndexedDB `metronome-practice-v1-recording-artifacts` contains non-zero Blob artifacts.
5. Play, seek, view waveform, export, tag/favorite/archive, and delete the migrated recording.
6. Create a new quick recording and a new sheet segment recording.
7. Reload and verify both remain visible and playable/exportable.
8. Delete one recording and verify only its artifact row disappears.
9. Force a missing artifact row and verify the UI message is specific, not a generic decode failure.
10. In a two-tab or scripted page-context scenario, make one tab change recording history while the other tab is about to migrate/delete/clear; verify the stale writer aborts/retries and the newer change remains.
11. If possible in Chrome, test an IndexedDB unavailable/quota-like failure by using a fake repository build/test hook or private-mode equivalent and confirm migration leaves localStorage unchanged while new saves fail cleanly.

## Verification Commands

Use the repo-local wrapper from repository root:

```powershell
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run test:e2e -- recordings-review.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-recording-review.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-segment-recording.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- quick-metronome.spec.ts
```

Focused loops may run narrower Vitest files first, but final verification must include the full unit suite and the focused E2E files above, or document an environment blocker with exact command output.

## No-Workaround Constraints

- Do not rewrite the whole recording history system.
- Do not make `getSnapshot()` async.
- Do not persist new recording audio bodies in localStorage.
- Do not write a localStorage snapshot if the current raw value differs from the `originalRawSnapshot` used to prepare the mutation.
- Do not use server storage or API routes for local artifacts.
- Do not use localStorage, sessionStorage, or JSON blobs as the new artifact body store.
- Do not run Dexie/localStorage/migration code at module top level.
- Do not fallback unknown audio MIME to `.webm`.
- Do not weaken Stage A boundary tests or MIME/export tests.
- Do not let UI components import Dexie, concrete repositories, WaveSurfer adapters, or raw artifact body helpers.
- Do not let app routes/server components import artifact repository or migration modules.
- Do not silently delete or hide metadata-only/legacy recordings.
- Do not delete artifacts for retained recordings during quick clear, sheet clear, or review delete.
- Do not drop `takeSelections`, `recordingOrganization`, markers, ambiguous sessions, or unknown future snapshot fields.
- Do not use random artifact ids as the normal path.
- Do not add file-wide eslint suppressions.

## Coding Agent Checklist

- Read this plan, `P2-review-hardening.md`, `02-segment-take-review.md`, `03-recordings-review.md`, and `05c-sheet-recording-review.md`.
- Confirm Stage A is present and do not rework it except where Stage B integration requires small adapter changes.
- Add Dexie artifact storage and a service boundary first.
- Keep metadata snapshots synchronous.
- Implement legacy migration before switching consumers fully, so old data stays readable.
- Implement raw localStorage stale-write protection before migration/delete/clear code starts rewriting snapshots.
- Convert quick and sheet save paths to artifact-ref-first.
- Update playback/export/waveform/delete through services/controllers.
- Preserve unknown fields by writing from raw snapshot base where migration/cleanup touches localStorage.
- Use deterministic `artifactId = recording.id` unless real duplicate ids force explicit tested collision handling.
- Add storage inspection helpers for E2E.
- Run focused tests during work and final verification commands before handoff.

## Internal Review Agent Checklist

Review data safety first:

- New quick and sheet saves never write `audioDataUrl` into localStorage.
- Legacy migration saves artifact body before removing localStorage body.
- Migration failure preserves exact original localStorage bytes.
- Migration moves safe records even when another legacy record fails.
- Migration is idempotent.
- All raw localStorage rewrites re-read current raw bytes before setItem and abort/retry on mismatch.
- Delete and clear remove only artifacts for deleted recordings.
- Unknown future snapshot fields survive.
- IndexedDB/private-mode unavailable cases leave legacy data readable and prevent fake-success metadata writes.

Review boundaries:

- `getSnapshot()` is still synchronous.
- UI does not import concrete storage/audio libraries.
- Server components do not access browser storage.
- App/server routes do not import artifact repository or migration modules.
- No module-top-level Dexie/localStorage side effects exist.
- Artifact resolution is async through services/controllers.
- Export still uses known MIME mapping only.

Review user behavior:

- Metadata-only recordings remain visible.
- Missing artifact and unsupported artifact states are specific.
- Playback/export/waveform work for migrated and newly saved recordings.
- Take selections, organization metadata, markers, and ambiguous sessions are preserved.

Fail the PR if:

- It introduces a broad storage rewrite.
- It persists new audio bodies in localStorage.
- It makes review metadata rendering depend on async artifact body reads.
- It weakens Stage A tests or constraints.
- It hides data-loss risks behind generic decode errors.
- It can overwrite another tab's newer localStorage snapshot.
- It uses random artifact ids as the ordinary artifact id strategy.

## Verification Agent Checklist

- Verify with real localStorage and IndexedDB inspection.
- Verify new saves are artifact-ref-first.
- Verify legacy migration success and failure cases.
- Verify migration result stats include migrated/skipped/failed/orphaned.
- Verify stale localStorage write protection for migration/delete/quick clear/sheet clear/metadata cleanup.
- Verify playback/export/waveform/delete after migration.
- Verify quick clear and sheet clear preserve retained artifacts.
- Verify missing artifact body surfaces a specific missing-artifact state.
- Verify IndexedDB unavailable/private-mode behavior with fakes and manual Chrome confidence checks.
- Report PASS only with test command evidence and storage evidence.

## Open Risks

- Existing `RecordingCaptureService` returns both Blob and data URL. Stage B can keep this shape initially, but new persistence must ignore `dataUrl` for snapshot writes.
- Current repository normalization rebuilds snapshots from known fields in some paths. Migration and cleanup code must preserve unknown fields deliberately.
- Dexie quota and browser private-mode behavior may be hard to simulate in automated E2E; fake repositories are acceptable for unit/integration coverage, with real Chrome manual acceptance for confidence.
- Object URL lifecycle in playback must be tested for rapid recording switching, unmount, and concurrent export/playback, not only the normal playback path.

## Complexity Budget / Reviewer Note

Approximate diff split after the Stage B complexity pass:

- Production: roughly 20+ source files, about +1.9k/-0.7k lines versus `origin/codex/v1-pack-2-segment-take-review`. The largest added production files are now the bounded IndexedDB adapter, artifact migration, recording history repository, and focused artifact/body modules instead of one artifact service god-file.
- Tests: roughly +1.5k/-0.2k lines. Most test LOC is migration/data-safety coverage: legacy data URL migration, storage failure handling, stale-write protection, clear/delete cleanup, and UI-facing unavailable states.
- Docs: roughly +1k lines in this plan. The plan is intentionally detailed because Stage B touches persistence, migration, and rollback semantics.

Production module budget:

- `recording-artifact-repository.ts` is the concrete IndexedDB/Dexie adapter. It is necessary because metadata snapshots must stay synchronous while artifact bodies move out of localStorage.
- `artifact-data-url.ts` owns legacy data URL parsing, MIME validation, and byte conversion only.
- `artifact-storage.ts` owns artifact refs, save/resolve body behavior, committed-artifact cleanup, and storage error mapping.
- `artifact-details.ts` owns browser audio decode, duration warnings, and waveform peak derivation.
- `artifact-migration.ts` owns legacy migration orchestration and the metadata rewrite retry loop.
- `artifact-service.ts` is now a compatibility facade/barrel so existing callers keep a stable import while responsibilities live in focused modules.
- `recording-history-snapshot.ts` owns pure snapshot cleanup/normalization helpers used by write operations.
- `recording-history-operations.ts` owns typed save/delete/rollback/clear operations. `repository.ts` remains the localStorage snapshot/query/normalization boundary and composes those operations without exposing a raw generic write API.
- `quick-metronome/artifact-controller.ts` is a thin UI boundary adapter only. It should not grow into a second artifact service; new artifact behavior belongs in the recordings-review artifact modules.

Required complexity:

- Migration must save artifact bodies before removing legacy `audioDataUrl`, must preserve the exact legacy bytes on failure, and must report migrated/skipped/failed/orphaned entries.
- Stale-write protection is required for localStorage rewrites so another tab's newer snapshot is not overwritten during migration, clear, delete, or rollback.
- Cleanup returns candidate artifact ids from metadata mutations and then deletes only artifacts no longer retained in the latest snapshot.
- Quick/sheet saves must persist artifact bodies before metadata points at `artifactRef`; metadata must omit new `audioDataUrl` bodies.

Follow-up TODOs that should not block this slice:

- Move error-marker mutation methods out of `repository.ts` if the repository grows again.
- Consider moving take-selection and recording-organization write methods to their own operation modules after Pack 2 stabilizes.
- Revisit object URL lifecycle with broader interaction coverage after the storage migration is merged.
