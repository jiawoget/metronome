# P2 Review Hardening Plan

## Purpose

This is the mother hardening plan for Pack 2 review issues. It is intentionally split into two gated substages so the immediate merge blockers can be fixed without bundling a recording artifact storage migration into the same coding assignment.

Hard rule: Stage A is the immediate coding target. Stage B must not be implemented by the Stage A coding agent. Stage B is a separate migration substage, separate PR, and independent review/verification gate unless the user explicitly changes that gate.

Stage A can be merged before Stage B only if Pack 2 accepts temporary localStorage artifact storage with an explicit known risk. If data-loss/quota risk is considered blocking, Stage B must complete before Pack 2 verification.

Do not implement product code from this planning pass. Do not update `docs/v1/status.json`.

## Shared Product Constraints

- Preserve the Pack 2 user path: review grouped takes, play takes, mark useful takes, inspect history, and return to practice the same sheet/segment.
- No cloud sync, account login, backend storage, backup/restore, remote sharing, or cross-device resume.
- No automatic scoring, automatic timing feedback, beat alignment, mistake detection, onset detection UI, or DAW-like editing.
- Do not replace Recordings Review, Sheet Practice, Quick Metronome, or local persistence broadly.
- UI components may compose hooks/controllers and render states. They must not call Dexie/localStorage, MediaRecorder, Tone.js, Web Audio decode, wavesurfer internals, raw data URL parsing, or raw download APIs directly.
- Server components/routes may parse and pass query params only. Browser local repositories and client storage are not available there.
- Use existing project patterns, Dexie where persistence is needed, Zustand where shared client state already exists, and wavesurfer behind adapter boundaries.
- Do not modify E2E process manager utilities during Stage A unless required to verify the stage. Any such change must remain test-only and documented.

## Architecture Classification

| Area | Classification | Required direction |
|---|---|---|
| wavesurfer playback | should reuse existing library/helper | Keep `wavesurfer.js` behind `RecordingWaveformPlaybackAdapter` or an equivalent playback port. UI receives a controller/factory, not the concrete adapter. |
| custom peak derivation | should move to lower-level service | Keep decoded/trusted peak validation in artifact/waveform services. UI may render already-provided peaks only. |
| custom peak rendering | necessary UI when rendering deterministic derived evidence | Keep lightweight rendering in UI only for display of validated peaks. Do not decode, analyze, or invent peaks in React. |
| MIME parsing | should move to lower-level service/helper | Split export-known MIME mapping from potentially decodable MIME checks with unambiguous helper names. |
| data URL to Blob conversion | should move to lower-level service/adapter | Stage A may keep existing localStorage artifact storage but export conversion stays in export service. Stage B moves body resolution/migration into artifact services. |
| filename sanitizer | should reuse existing helper or become shared helper | Keep one deterministic sanitizer with Windows-safe cases covered by tests. |
| take/comparison selection controller | necessary UI/controller boundary | Keep state orchestration in a controller/hook or repository-backed service. Avoid spreading selection mutation logic across render components. |
| E2E process manager | workaround to remove or test-only helper | Keep only under tests/scripts if still needed. Product code must not depend on it. Stage A coding must not modify it unless verification truly requires a test-only documented fix. |

## Stage A: Merge-Blocker Fixes

### Stage A Goal

Fix the Pack 2 merge blockers without changing the storage model for recording audio bodies. Stage A should be small enough for one high-risk-capable coding agent and should leave artifact migration for Stage B.

Stage A must not implement Dexie artifact migration, artifact ids/refs, async artifact body resolution redesign, or localStorage audio-body removal.

### Stage A Scope

- Practice Again from Review hydrates the existing rerecord workflow:
  - validate the source recording in a client-side Sheet Practice entry controller/hook after browser repositories are available
  - validate source sheet id, current sheet id, segment id, and live segment context
  - call `setRerecordReady(sheetId, { recordingId, sheetId, segmentContext })`
  - select or confirm the matching segment
  - show clear invalid source states
- Quick recording clear is safe:
  - `quickRecordingRepository.clear()` must not delete shared sheet data
  - only delete sessions explicitly identifiable as quick sessions and not referenced by retained recordings
  - preserve ambiguous sessions
  - preserve unknown top-level/future snapshot fields
- 12/8 metadata is preserved:
  - first determine whether current meter timing can schedule `12/8` with correct scheduler, tick, and accent behavior
  - if it can, add `12/8` to quick runtime support instead of falling back
  - only introduce `QuickMetronomeSupportedTimeSignature` if playback truly cannot support `12/8`
  - sheet/practice metadata must never use the quick parser
- Export MIME fallback is corrected:
  - unknown `audio/*` must not fallback to `.webm`
  - export eligibility must use a known MIME/extension map only
  - `audio/flac`, `audio/aiff`, `audio/x-custom`, and `audio/anything` are unsupported unless explicitly mapped later
- RecordingArtifactReview boundary is corrected:
  - UI does not directly `new` the concrete playback adapter
  - UI does not directly call artifact details service
  - double seek is collapsed to a single path

### Stage A Out Of Scope

- No recording artifact storage migration.
- No new `artifactId`/artifact-ref metadata snapshot model.
- No Dexie recording artifact body repository unless it is only a pre-existing dependency needed by current code.
- No legacy `audioDataUrl` migration.
- No async redesign of recording review `getSnapshot()`.
- No changes to Pack 8 import/export/backup/restore.
- No E2E process manager changes unless strictly required for Stage A verification and kept test-only.

### Stage A Ownership Boundaries

- Server pages under `src/app/sheet-practice/**` may only parse and pass `sourceRecordingId` and `segmentId`/return segment params to client components.
- Actual source recording lookup, sheet/segment metadata validation, live segment validation, and `setRerecordReady` must happen in a client-side Sheet Practice entry controller/hook after browser repositories are available.
- Do not require source audio artifact availability to enable Practice Again or Record Again. Missing/corrupt source audio affects playback/export only, not segment rerecord readiness when sheet and segment metadata are valid.
- For whole-sheet sheet recordings without `segmentContext`, Practice Again may return to Sheet Practice for the sheet, but Record Again must remain unavailable unless a valid segment source is selected or whole-sheet rerecord is explicitly supported.
- Do not access localStorage, Dexie, recording repositories, or browser artifact services from server components.
- `sourceRecordingId` may still force a new session, but that is separate from rerecord readiness and is not sufficient by itself.
- Quick clear/write paths must preserve unknown snapshot fields even if current TypeScript types do not name them.
- When preserving unknown top-level fields, keep the raw parsed object as the base and overwrite only the known arrays that are intentionally changed. Do not rebuild the snapshot solely from normalized known fields.
- Export MIME helpers must have names that prevent accidental reuse of broad playback/decode checks for export eligibility.
- RecordingArtifactReview controller owns artifact review state and playback controls only. It must not own tags, export, delete, markers, take selections, or recording organization state.

### Stage A Likely Files And Areas

Likely touch:

- `src/app/sheet-practice/page.tsx`
- `src/app/sheet-practice/[sheetId]/page.tsx`
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/controls/types.ts`
- `src/stores/sheet-practice-recording-workflow-store.ts`
- `src/lib/quick-metronome/persistence.ts`
- `src/lib/quick-metronome/control.ts`
- `src/lib/quick-metronome/types.ts`
- `src/domain/practice/types.ts`
- `src/domain/practice/validation.ts`
- `src/domain/practice/meter-timing.ts`
- `src/infrastructure/db/recording-history-metadata-repository.ts`
- `src/lib/recordings-review/repository.ts`
- `src/lib/recordings-review/audio-mime.ts`
- `src/lib/recordings-review/audio-export.ts`
- `src/lib/recordings-review/artifact-service.ts`
- `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/lib/recordings-review/wavesurfer-adapter.ts`
- `src/components/recordings-review/recording-artifact-review.tsx`

Likely tests:

- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/unit/sheet-practice-recording-workflow-store.test.ts`
- `tests/unit/quick-metronome-control.test.ts`
- `tests/unit/measure-grid.test.ts`
- `tests/unit/recordings-review-repository.test.ts`
- `tests/unit/recordings-review-audio-export.test.ts`
- `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
- `tests/unit/recordings-review-experience.test.tsx`
- `tests/e2e/recordings-review.spec.ts`
- `tests/e2e/sheet-recording-review.spec.ts`
- `tests/e2e/sheet-segment-recording.spec.ts`

### Stage A Implementation Steps

1. Establish baseline.
   - Run `git status --short --branch` and preserve unrelated user changes.
   - Inspect current uses of `sourceRecordingId`, `setRerecordReady`, `quickRecordingRepository.clear`, `parseTimeSignature`, export MIME helpers, and `RecordingArtifactReview`.
   - Run focused baseline tests where feasible.

2. Add client-side Practice Again entry hydration.
   - Keep server route/page logic limited to parsing query params and passing strings to client components.
   - Add a client-side entry controller/hook, for example `useSheetPracticeAgainEntry`, near Sheet Practice controls/viewer code.
   - The hook should run after browser repositories/services are available and should accept `sheetId`, `sourceRecordingId`, and optional return segment id.
   - Resolve the source recording through the existing browser recording history/sheet recording service boundary.
   - Validate:
     - source exists
     - source is a sheet recording
     - source sheet id matches route sheet id
     - source has segment context when Record Again is expected
     - live segment exists for the sheet
     - live segment context still matches the stored source segment context
   - On valid source, call `setRerecordReady(sheetId, { recordingId, sheetId, segmentContext })` and select/confirm the segment.
   - On invalid source, show a clear unavailable status and do not enable Record Again.
   - Keep session-forcing behavior for Practice Again only as a separate concern.

3. Make quick clear conservative and field-preserving.
   - Replace raw `storage.removeItem(RECORDING_HISTORY_STORAGE_KEY)` behavior.
   - Read and normalize the current shared snapshot while retaining unknown top-level fields.
   - Remove quick recordings.
   - Remove markers linked only to removed quick recordings.
   - Remove sessions only when explicitly identifiable as quick sessions and not referenced by any retained recording.
   - Preserve ambiguous sessions.
   - Preserve sheet recordings, sheet sessions, retained-recording markers, take selections, recording organization, and unknown/future fields.
   - If a full clear is needed by tests, create an explicitly named test-only helper and ensure product code cannot call it accidentally.

4. Resolve 12/8 decisively at the timing boundary.
   - Inspect current meter timing and scheduler logic to determine whether `12/8` can be scheduled correctly.
   - For `12/8`, verify both timing and displayed/accent behavior:
     - measure duration is correct
     - downbeat accent remains correct
     - subdivision/tick interval does not regress existing `6/8` behavior
     - UI parser/options match runtime support
   - Decide whether the current runtime treats `12/8` as 12 eighth-note beats or 4 dotted-quarter pulses; document the Stage A choice in tests or code comments.
   - If current timing and accent behavior support `12/8`, add it to quick runtime support and update quick UI/parser tests accordingly.
   - If playback truly cannot support `12/8`, introduce a clearly named quick runtime type such as `QuickMetronomeSupportedTimeSignature` and keep fallback behavior only inside quick runtime controls.
   - If `12/8` timing is mathematically supported but compound-meter accent semantics are not, preserve sheet/practice metadata as `12/8` but keep quick runtime UI fallback explicit.
   - Add a practice metadata parser, for example `parsePracticeTimeSignature(value): PracticeTimeSignature | null`, that accepts all `PracticeTimeSignature` values including `12/8`.
   - Update recording-history metadata repository and any sheet/practice metadata persistence to use the practice parser, never quick parser.

5. Split MIME helper APIs.
   - Add or rename helpers so export and decode intent are unambiguous:
     - `getKnownExportAudioMimeInfo(mimeType): ExportAudioMimeInfo | null`
     - `isPotentiallyDecodableAudioMime(mimeType): boolean`
   - Equivalent names are acceptable only if they preserve the same separation.
   - Export code must call the known export helper only.
   - Playback/waveform/decode code may call the potentially decodable helper if it intentionally supports broader `audio/*`.
   - Remove reliance on ambiguous `getSupportedRecordingAudioMimeInfo` for export eligibility.
   - Add negative export coverage for unknown audio MIME values.

6. Introduce a small RecordingArtifactReview controller.
   - Keep the interface narrow. Suggested shape:

```ts
type RecordingArtifactReviewController = {
  state: ArtifactReviewState;
  controls: {
    play(): Promise<void>;
    pause(): void;
    seekToRatio(ratio: number): void;
  };
};
```

   - The default production hook/factory may compose artifact details loading and `RecordingWaveformPlaybackAdapter`.
   - UI renders `state` and calls `controls`.
   - The controller must not own tags/export/delete/markers/take selection/organization behavior.
   - Remove direct `new RecordingWaveformPlaybackAdapter()` from `RecordingArtifactReview`.
   - Remove direct `loadRecordingArtifactDetails(...)` calls from `RecordingArtifactReview`.

7. Collapse seek handling.
   - Choose one seek event path.
   - Preferred path: a single overlay seek surface handles pointer/click, computes ratio, and calls `controls.seekToRatio(ratio)` once.
   - Remove duplicate native capture plus React capture listeners unless the adapter/controller owns exactly one adapter-level event subscription.
   - Add unit/component coverage proving one user event causes one seek call.

8. Verify Stage A and prepare handoff evidence.
   - Run the Stage A commands below.
   - Browser-check Practice Again valid/invalid states, export unsupported states, and RecordingArtifactReview seek behavior.
   - Document that artifact body storage remains localStorage-backed until Stage B, if Stage A is merged first.

### Stage A Acceptance Criteria

- Practice Again from a segment-linked sheet take enters Sheet Practice and, after client-side repository validation, initializes `rerecord.status === "ready"` with `rerecord.source.recordingId` matching the source take.
- Record Again is available only when the selected/live segment matches the validated source segment.
- Invalid Practice Again sources show clear status and do not enable Record Again:
  - source recording missing
  - source is not a sheet recording
  - source sheet mismatch
  - source segment missing
  - stored segment context mismatch
  - selected segment changed
- Server components do not read localStorage, Dexie, recording repositories, or browser artifact services.
- `quickRecordingRepository.clear()` cannot delete sheet recordings, retained-recording markers, take selections, recording organization, unknown top-level/future snapshot fields, or ambiguous sessions.
- Quick clear deletes only sessions explicitly identifiable as quick sessions and not referenced by retained recordings.
- New Stage A snapshot writes preserve unknown top-level fields.
- A `12/8` sheet recording metadata record roundtrips through recording-history metadata without becoming null or falling back to `4/4`.
- If current meter timing supports `12/8`, quick runtime supports `12/8`; otherwise quick runtime fallback is isolated to a clearly named quick-supported type/parser.
- Sheet/practice metadata does not use quick parser.
- Audio export uses `getKnownExportAudioMimeInfo` or equivalent known-export helper and never exports unknown `audio/*` as `.webm`.
- `audio/flac`, `audio/aiff`, `audio/x-custom`, and `audio/anything` are unsupported for export unless explicitly mapped later.
- Metadata-only sheet recordings remain visible but playback/export are unavailable with clear status.
- Whole-sheet/no-segment sheet recordings may Practice Again to the sheet context, but Record Again remains unavailable unless whole-sheet rerecord support is explicitly designed and accepted.
- `RecordingArtifactReview` renders artifact review state from an injected controller/hook/factory and does not directly instantiate the concrete adapter or call artifact details service.
- One pointer/click seek action triggers one seek path.
- Stage A does not implement artifact migration, artifact refs, or async snapshot redesign.
- Missing or corrupt source audio artifact does not block Practice Again or Record Again when source sheet and segment metadata are valid.
- Architecture boundary tests prevent Recordings Review UI components from importing concrete playback adapters, artifact detail loaders, or repositories directly.
- The `12/8` support decision includes scheduler/tick/accent behavior, not parser acceptance only.

### Stage A Negative Cases

- `sourceRecordingId` is blank, malformed, or not found.
- Source recording is quick, metadata-only, missing `sheetId`, or missing segment context.
- Source segment was deleted after recording.
- Source segment exists but grid/range context no longer matches.
- User changes selected segment before clicking Record Again.
- Shared recording snapshot contains quick and sheet recordings plus take selections, organization, markers, unknown fields, and ambiguous sessions.
- Snapshot is partial or has unknown future top-level fields.
- Sheet metadata contains `12/8`.
- Export MIME has uppercase letters or parameters.
- Export MIME is unknown audio or non-audio.
- Metadata-only sheet recording has no audio artifact.
- RecordingArtifactReview unmounts while loading or while adapter initialization is pending.
- Rapid waveform pointer/click does not double seek.

### Stage A Test Plan

Unit/component tests:

- Practice Again entry hook resolves valid source and calls `setRerecordReady`.
- Practice Again entry hook returns distinct invalid states.
- Store tests cover `setRerecordReady`, invalidation, selection changes, and source retention.
- Quick clear preserves sheet data, ambiguous sessions, and unknown top-level fields.
- Quick clear removes only safe quick data.
- Practice parser accepts `12/8`.
- Quick runtime parser/support tests reflect the timing decision.
- Recording-history metadata repository preserves `12/8`.
- Export MIME helper maps known export types and rejects unknown audio.
- Metadata-only recordings remain visible but playback/export unavailable.
- RecordingArtifactReview uses injected controller and one seek event produces one seek call.
- Architecture boundary test fails if files under `src/components/recordings-review/**` import:
  - `RecordingWaveformPlaybackAdapter`
  - `loadRecordingArtifactDetails`
  - `recordingHistoryRepository`
  - `recordingAudioExportService`
- If artifact review hooks/controllers are placed outside `src/components/recordings-review/**`, add the same forbidden-import boundary coverage for that location.

Integration/E2E tests:

- Recordings Review Practice Again to Sheet Practice hydrates Record Again for a valid segment take.
- Missing source, missing segment, and sheet mismatch cases show unavailable status.
- Mixed quick/sheet history survives quick clear.
- `12/8` sheet metadata survives reload/roundtrip.
- Export known MIME downloads; unknown audio MIME does not download and shows unsupported status.
- RecordingArtifactReview playback/seek remains usable and does not double seek.
- Check browser console errors.

Manual QA:

- Confirm invalid Practice Again messages are understandable.
- Confirm Record Again appears only for the matching validated segment.
- Confirm metadata-only recordings remain visible and honest about unavailable playback/export.
- Confirm RecordingArtifactReview controls do not overlap or clip on desktop/tablet/mobile.

### Stage A Verification Commands

Use the repo-local wrapper from the repository root:

```powershell
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run test:e2e -- recordings-review.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-recording-review.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-segment-recording.spec.ts
```

If these spec files do not exist yet, create focused E2E specs for the listed flows, or use the current repository's exact existing spec filenames and document the mapping in the coding/verification handoff. Do not create thin placeholder specs just to satisfy a command name.

Focused loops may run narrower Vitest files first, but final Stage A verification must include the commands above or document an environment blocker.

### Stage A Model And Tier Assignment

Use high-risk capable agents, but do not assign Tier E migration work to Stage A.

- Planning agent: GPT-5.5, medium effort, standard speed
- Coding agent: GPT-5.5, high effort, standard speed
- Review agent: GPT-5.4 or GPT-5.5, high effort, standard speed
- Verification agent: GPT-5.4, high effort, standard speed

Rationale: Stage A touches data-loss prevention, media export eligibility, sheet practice rerecord state, and UI/service boundaries. It is not allowed to perform the artifact migration.

### Stage A Handoff Instructions

Coding agent:

- Implement only Stage A.
- Do not implement Stage B.
- Do not update `docs/v1/status.json`.
- Do not redesign recording artifact storage.
- Fix data-loss and correctness blockers first: quick clear, Practice Again hydration, `12/8` metadata, and export MIME. Then refactor RecordingArtifactReview boundary and seek path.
- Preserve unrelated user changes.
- Handoff must explicitly say artifact storage remains temporary localStorage risk until Stage B.

Review agent:

- Fail review if Stage A includes artifact migration work.
- Fail review if server components access browser repositories/storage.
- Fail review if quick clear can still remove shared sheet data or unknown fields.
- Fail review if export still falls back unknown audio to `.webm`.
- Fail review if `RecordingArtifactReview` still directly constructs the adapter or calls artifact details service.

Verification agent:

- Verify all Stage A acceptance criteria.
- Explicitly report whether Stage A left localStorage artifact storage unchanged as planned.
- Do not require Stage B migration evidence for Stage A PASS.

## Stage B: Recording Artifact Storage Migration

### Stage B Goal

Move recording audio bodies out of the localStorage JSON recording snapshot into Dexie/IndexedDB or an existing artifact repository, while preserving the synchronous metadata snapshot semantics that Recordings Review currently relies on.

Stage B is Tier E and requires separate planning/review/verification before coding. It should be a separate PR with an independent review gate.

### Stage B Scope

- Use Dexie or an existing artifact repository for recording audio bodies.
- Metadata snapshot stores artifact id/ref and small factual metadata only.
- Existing legacy `audioDataUrl` records migrate safely.
- Playback/export/waveform/delete resolve artifacts through artifact services/controllers.
- Migration is idempotent and rollback-aware.
- Storage QA proves localStorage no longer contains new audio bodies after migration.

### Stage B Out Of Scope

- No Stage A merge-blocker rerecord/quick clear/MIME/parser/controller work unless Stage A was not completed.
- No cloud backup/restore/import/export.
- No user-facing storage management UI beyond necessary error/status states.
- No async rewrite of the whole recording review subscription model unless separately planned and approved.
- No automatic analysis/scoring/alignment.

### Stage B Ownership Boundaries

- Preserve existing synchronous metadata snapshot semantics if UI depends on `useSyncExternalStore`.
- Do not make `getSnapshot()` async unless the whole review subscription model is deliberately redesigned in this separate stage.
- Artifact body resolution and migration are async through artifact services/controllers.
- Metadata snapshot reads remain fast and synchronous: list/group/filter UI should still be able to render metadata-only states.
- Playback/export/waveform controllers load artifact bodies asynchronously by artifact id/ref.
- Metadata-only sheet recordings remain visible and playback/export unavailable.
- Missing artifact lookup must produce a specific missing-artifact error, not a generic decode-failed state.

### Stage B Likely Files And Areas

Likely touch/add:

- `src/lib/recordings-review/types.ts`
- `src/lib/recordings-review/repository.ts`
- `src/lib/recordings-review/artifact-service.ts`
- `src/lib/recordings-review/audio-export.ts`
- `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/lib/recordings-review/wavesurfer-adapter.ts`
- `src/services/recording/index.ts`
- `src/lib/sheet-practice/recording-service.ts`
- `src/lib/quick-metronome/session.ts`
- `src/infrastructure/audio/browser-recording-capture.ts`
- new or reused artifact repository under `src/infrastructure/db/` or `src/infrastructure/files/`
- tests for artifact repository, migration, playback/export/waveform/delete, and storage QA

### Stage B Implementation Requirements

1. Design artifact storage without async metadata snapshot breakage.
   - Define artifact record shape:
     - artifact id/ref
     - recording id
     - MIME type
     - size bytes
     - created/updated timestamp
     - Blob or bytes
   - Keep metadata snapshot synchronous and small.
   - Store `artifactId`/ref on recordings that have local audio.
   - Preserve metadata-only recordings as visible records without artifact refs.

2. Add artifact repository/service.
   - Prefer Dexie or an existing local artifact adapter.
   - Add save/load/delete/list migration helpers as needed.
   - Return specific errors:
     - missing artifact ref
     - missing artifact body
     - unsupported MIME
     - decode failed
     - empty audio
   - Do not let UI components call Dexie directly.

3. Migrate legacy `audioDataUrl`.
   - Detect legacy records with `audioDataUrl`.
   - Save the audio body to artifact storage first.
   - Rewrite metadata snapshot to `artifactId`/ref only after artifact save succeeds.
   - Preserve original localStorage bytes if migration fails.
   - Make migration idempotent.
   - Preserve unknown top-level fields during migration writes.

4. Update save paths to be artifact-ref-first.
   - New quick recording saves write artifact body through artifact repository first.
   - New sheet recording saves write artifact body through artifact repository first.
   - Metadata snapshot write follows with artifact ref and factual metadata.
   - If artifact save fails, do not write metadata that claims a saved recording artifact exists.

5. Update consumers.
   - Playback resolves artifact body through artifact service/controller.
   - Export resolves artifact body through artifact service/controller and still uses known-export MIME mapping.
   - Waveform/artifact details resolve artifact body through artifact service/controller.
   - Delete removes or makes inaccessible both metadata and artifact body.
   - Missing artifact lookup shows a specific missing-artifact state.

6. Preserve rollback.
   - Keep legacy `audioDataUrl` read support during the migration window.
   - Never remove legacy bytes before the new artifact body is saved.
   - If artifact storage is unavailable, keep records readable through legacy data where present and show clear artifact storage errors where not.

### Stage B Acceptance Criteria

- Metadata snapshot stores artifact id/ref instead of audio body for new recording saves.
- All new save paths are artifact-ref-first.
- Existing synchronous metadata snapshot semantics are preserved; `getSnapshot()` remains synchronous unless a separate approved redesign exists.
- Legacy `audioDataUrl` records migrate to artifact storage without losing playback/export/waveform behavior.
- Migration failure preserves original localStorage bytes.
- Migration writes preserve unknown top-level fields.
- Migration is idempotent.
- Metadata-only sheet recordings remain visible but playback/export unavailable.
- Artifact lookup missing produces a specific missing-artifact error, not generic decode failed.
- If another tab migrates or deletes an artifact while this tab holds stale metadata, artifact services surface a missing-artifact state and trigger a metadata refresh where possible.
- Playback resolves artifact bodies through artifact services/controllers.
- Export resolves artifact bodies through artifact services/controllers.
- Waveform/artifact details resolve artifact bodies through artifact services/controllers.
- Delete removes metadata and artifact body, or fails visibly without silently orphaning data.
- After successful migration/new save, localStorage recording snapshot does not contain audio body data.

### Stage B Negative Cases

- Legacy snapshot has valid `audioDataUrl` but artifact repository write fails.
- Legacy snapshot has malformed `audioDataUrl`.
- Legacy snapshot has unknown top-level fields.
- Artifact id exists but body is missing.
- Artifact body exists but MIME metadata is unsupported.
- Delete succeeds for metadata but artifact delete fails.
- Browser IndexedDB/Dexie is unavailable or quota-limited.
- Multiple tabs observe migration/write events; stale tabs must not show generic decode failure when an artifact was migrated/deleted elsewhere.
- `useSyncExternalStore` subscribers render while artifact body migration is pending.

### Stage B Test Plan

Unit/integration tests:

- Artifact repository save/load/delete.
- Legacy migration success.
- Legacy migration failure preserves original bytes.
- Migration preserves unknown top-level fields.
- Migration idempotency.
- New quick and sheet save paths are artifact-ref-first.
- Artifact service returns specific missing-artifact errors.
- Metadata-only recordings remain visible with playback/export unavailable.
- Playback/export/waveform services load through artifact service.
- Delete removes artifact body or reports failure safely.

E2E/manual tests:

- Seed legacy `audioDataUrl`, open Recordings Review, trigger migration, verify playback/waveform/export still work.
- Inspect localStorage after migration: no audio body in JSON snapshot.
- Inspect IndexedDB/Dexie: artifact body exists.
- Create new quick and sheet recordings: metadata uses artifact refs, audio body stored in artifact repository.
- Delete migrated and newly saved recordings: artifact body no longer accessible.
- Simulate missing artifact body: visible recording shows specific missing-artifact status.
- Simulate another tab migrating or deleting an artifact while this tab holds stale metadata: this tab shows missing-artifact state and refreshes metadata where possible.
- Simulate quota/storage failure if feasible through test harness or service fake.

### Stage B Verification Commands

Stage B should include the Stage A commands plus migration/storage-specific tests once they exist:

```powershell
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run test:e2e -- recordings-review.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-recording-review.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-segment-recording.spec.ts
```

Add focused migration test commands in the Stage B refined plan.

### Stage B Model And Tier Assignment

Use Tier E: Risky Data Operations / Migration / Cleanup.

- Planning agent: GPT-5.5, medium effort, standard speed
- Coding agent: GPT-5.5, high effort, standard speed
- Review agent: GPT-5.5, high effort, standard speed
- Verification agent: GPT-5.4, high effort, standard speed

Rationale: Stage B changes storage and migration behavior for user recording artifacts. A false pass could lose audio data or corrupt review playback/export.

### Stage B Handoff Instructions

Stage B planning agent:

- Create a separate implementation-ready Stage B migration plan before coding starts.
- Re-check current Stage A implementation and storage state.
- Decide exact artifact repository location and migration trigger.
- Define rollback and multi-tab behavior precisely.

Stage B coding agent:

- Implement only the approved Stage B migration plan.
- Preserve synchronous metadata snapshot semantics unless an approved redesign says otherwise.
- Do not use Stage B to add Pack 8 backup/restore or new Pack 2 feature scope.

Stage B review agent:

- Review data-loss, idempotency, rollback, unknown-field preservation, async/sync boundary, and delete/orphan behavior first.
- Fail review if new save paths still write audio bodies into localStorage snapshots.

Stage B verification agent:

- Verify migration with real storage inspection.
- Verify legacy failure preserves bytes.
- Verify new saves are artifact-ref-first.
- Verify playback/export/waveform/delete all resolve through artifact services.
- Report PASS only with storage evidence, not only UI behavior.
