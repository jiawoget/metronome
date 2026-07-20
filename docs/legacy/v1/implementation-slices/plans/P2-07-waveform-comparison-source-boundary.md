# P2-07 Waveform Comparison Source Boundary Plan

## Slice

- Slice id: P2-07 `waveform-comparison-source-boundary`
- Pack: Pack 2 Segment Take Review
- Product contract: `takes.waveform-comparison` in `docs/v1/05c-sheet-recording-review.md`
- Related contracts: `recordings.recording-comparison` / `recordings.review-grouping` in `docs/v1/03-recordings-review.md` and bounded future analysis in `docs/v1/09-audio-analysis.md`
- Depends on:
  - P2-01 `take-grouping-domain`
  - P2-02 `take-grouping-review-ui`
  - P2-05 `take-history-summary`
  - P2-06 `take-history-return-to-practice`
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier D, recording/media/timing/waveform boundary
- Status: ready for a fresh coding agent after this planning artifact; no product code is changed by this plan

## Goal

Create a service/domain boundary that resolves waveform comparison sources for selected sheet takes using real local recording artifacts. The boundary must return structured readiness/error states for each selected take, and it must only expose waveform evidence that comes from decoded audio artifacts or validated trusted peaks. It must not add the comparison UI, scoring, automatic correctness, a broad analysis engine, or direct UI access to decode/wavesurfer/WASM internals.

## Refined Scope

- Add a reusable source service/helper for waveform comparison inputs for selected takes.
- Accept selected `ReviewRecording` records or a selected subset from an existing `RecordingTakeGroup`.
- Resolve each selected take independently into a structured source state:
  - ready from decoded audio derived peaks
  - ready from validated trusted peaks
  - unavailable/error with a stable reason
- Reuse `loadRecordingArtifactDetails(...)`, `hasUsablePeaks(...)`, `ReviewRecording`, `RecordingTakeGroup`, and repository/grouping APIs where possible.
- Preserve the existing rule that trusted peaks are accepted only after the real audio artifact decodes.
- Represent group-level readiness without hiding per-take errors.
- Keep quick, legacy, no-segment, missing-artifact, invalid-artifact, unsupported-mime, deleted/stale, and invalid-peak cases explicit.
- Add focused unit/integration tests around real artifact metadata, validated peaks, rejection paths, and no-scoring guarantees.

## Explicit Out Of Scope

- No UI waveform comparison panel, controls, overlay, selection widget, timeline sync, or responsive layout. P2-08 owns UI.
- No automatic scoring, correctness, accuracy, mistake detection, timing quality, ranking, recommendation, or "best performance" claims.
- No direct Tone.js, wavesurfer.js, Web Audio decoding, MediaRecorder, or future WASM calls from React UI.
- No new backend, cloud, network fetches, worker queue, or server API.
- No broad Pack 9 analysis engine, onset detection, alignment, BPM detection, pitch detection, or productized scoring.
- No recording capture, playback adapter rewrite, metronome changes, export, tags, favorites, archive, cleanup, import, migration, or storage schema change.
- No reference-to-recording comparison; this slice is take-to-take source readiness only.
- No repair or mutation of stale recording metadata during source resolution.

## Product Contracts Covered

This slice covers only the source boundary for `takes.waveform-comparison`:

- Sheet/segment take histories can later compare selected takes with waveform evidence.
- The evidence must come from real decoded artifacts or validated precomputed peaks.
- The UI must be able to ask a service whether selected takes are ready or unavailable without calling decode/analysis directly.
- The boundary must remain factual and local-first, with no scoring or correctness claims.

It also preserves the `recordings.review-grouping` boundary:

- Quick and sheet recordings stay in the unified review system.
- Quick recordings are not silently promoted to sheet take comparison sources.
- Legacy sheet recordings and no-segment take groups remain safe and explicit.
- Existing artifact playback/details/delete behavior remains untouched.

## Current Code Context

Known current seams:

- `src/lib/recordings-review/types.ts`
  - `ReviewRecording` includes `id`, `type`, `sheetId`, `segmentContext`, `durationMs`, `sizeBytes`, `mimeType`, `audioDataUrl`, `artifactAnalysis`, and optional `trustedPeaks`.
  - `RecordingArtifactDetails` includes decoded duration, metadata duration, duration warning, peaks, and source `"decoded-audio" | "trusted-peaks"`.
  - `RecordingTakeGroup` identifies sheet segment and sheet no-segment take groups.
- `src/lib/recordings-review/artifact-service.ts`
  - `loadRecordingArtifactDetails(recording)` decodes the saved `audioDataUrl`.
  - It derives peaks from decoded audio when trusted peaks are missing.
  - It validates trusted peaks only after decode succeeds.
  - It rejects missing audio, decode failures, empty decoded audio, and invalid peak arrays.
- `src/lib/recordings-review/repository.ts`
  - `recordingHistoryRepository.getSnapshot()`, `getRecording(id)`, `getTakeGroups()`, and delete behavior are the existing local review boundary.
- `src/lib/recordings-review/take-groups.ts`
  - P2-01 grouping output should be used for group membership and no-segment/segment semantics.
- `src/components/recordings-review/recording-artifact-review.tsx`
  - Current single-recording UI uses artifact details and wavesurfer adapter. P2-07 should not expand this UI.
- Existing tests:
  - `tests/unit/recordings-review-history.test.ts` already covers artifact helper decode and trusted peak validation.
  - `tests/unit/recordings-review-repository.test.ts` covers repository normalization, delete, quick/legacy cases, and stale take metadata.
  - `tests/e2e/recordings-review.spec.ts` has browser waveform evidence and negative artifact cases for current review UI.

## Service Boundary

Preferred implementation:

- Add a focused helper/service such as `src/lib/recordings-review/waveform-comparison-sources.ts`.
- Export structured types either from that file or, only if they need broad reuse, from `src/lib/recordings-review/types.ts`.
- Keep the service UI-agnostic and React-free.
- It may expose functions with names like:
  - `loadWaveformComparisonSource(recording)`
  - `loadWaveformComparisonSources(recordings)`
  - `loadWaveformComparisonSourcesForGroup(group, recordingIds)`
  - `getWaveformComparisonEligibility(recording)` for synchronous preflight reasons where useful
- The service should call `loadRecordingArtifactDetails(...)` for actual readiness. Do not duplicate decode logic unless a narrow validation wrapper is needed.
- The service should never call wavesurfer, Tone, MediaRecorder, WASM, route helpers, or React state.
- The service should never write to repository storage, repair metadata, or delete stale records.

Suggested returned model:

```ts
type WaveformComparisonSourceState =
  | {
      status: "ready";
      recordingId: string;
      recording: ReviewRecording;
      artifactDetails: RecordingArtifactDetails;
      source: "decoded-audio" | "trusted-peaks";
      peaks: number[];
      durationMs: number;
      durationWarning: string | null;
    }
  | {
      status: "unavailable";
      recordingId: string;
      recording: ReviewRecording | null;
      reason:
        | "not-sheet-take"
        | "missing-recording"
        | "missing-artifact"
        | "unsupported-mime"
        | "decode-failed"
        | "empty-audio"
        | "invalid-peaks"
        | "invalid-duration"
        | "stale-group-membership";
      message: string;
    };
```

The coding agent may adjust names to match local style, but the output must preserve:

- stable status discriminator
- recording id
- source kind for ready states
- peaks and decoded/metadata duration evidence for ready states
- explicit reason code plus user-safe message for unavailable states
- no scoring fields

For multiple selected takes, return a wrapper such as:

- `sources`: ordered per selected recording id
- `readySources`
- `unavailableSources`
- `allReady`
- `readyCount`
- `requestedCount`
- optional `groupId`, `sheetId`, `segmentId` when resolving from a group

Do not collapse the whole request to one generic failure when only one selected take is invalid.

## Validation Rules

Artifact and mime validation:

- A ready source requires a non-empty `audioDataUrl`.
- `mimeType` must be audio-like, preferably `mimeType.trim().toLowerCase().startsWith("audio/")`.
- `metadata/session`, blank mime types, PDF/image mime types, and other non-audio values are `unsupported-mime`.
- Missing or null `audioDataUrl` is `missing-artifact`, even if trusted peaks exist.
- Decode failure from `loadRecordingArtifactDetails` should map to `decode-failed` unless the thrown message clearly corresponds to invalid peaks or empty audio.
- Empty decoded audio should map to `empty-audio`.
- Non-finite, all-zero, empty, or otherwise unusable trusted peaks should map to `invalid-peaks`.
- Ready trusted peaks must still have decoded artifact evidence from the current service.
- Duration warnings are warnings on a ready source, not automatic failures, unless metadata duration is non-finite/invalid before decode.
- Negative, zero, or non-finite `durationMs` should produce `invalid-duration` unless the current artifact helper already handles it more safely. Add tests for whichever behavior is implemented.

Stale, missing, and deleted artifacts:

- If the caller resolves by recording ids, ids absent from `recordingHistoryRepository.getSnapshot().recordings` are `missing-recording`.
- If the caller resolves from a group and a requested recording id is not in that group's current `recordings`, return `stale-group-membership`.
- If a recording was deleted before resolution, return `missing-recording`; do not resurrect cached metadata.
- If a recording exists but its artifact is missing/null, return `missing-artifact`; do not trust peaks alone.

Quick, legacy, and grouping rules:

- Quick recordings are not valid sheet take comparison sources for `takes.waveform-comparison`; return `not-sheet-take` for this slice.
- Sheet recordings with valid `sheetId` and no `segmentContext` are valid no-segment take sources if their artifacts validate.
- Legacy sheet recordings with absent `segmentContext` are valid no-segment take sources if their artifacts validate.
- Sheet recordings with `segmentContext: null` are valid no-segment take sources if their artifacts validate.
- Segment take groups are valid only for recordings in that P2-01 group.
- No-segment groups are valid only for recordings in that P2-01 no-segment group.
- Unsupported/ungrouped sheet recordings with missing/blank `sheetId` should return `not-sheet-take` or `stale-group-membership` depending on the entry point; do not invent a fake group.

Selection rules:

- Preserve caller order for selected recording ids.
- Return duplicate selected ids deterministically; either preserve duplicates as separate requested entries or normalize to one entry, but document and test the chosen behavior.
- Do not require exactly two sources in P2-07. The boundary can support one or many so P2-08 can decide UI selection limits.
- Do not choose best/active/latest automatically. P2-08 may pass selected ids explicitly.

## Relationship To P2-08

P2-08 should consume this boundary instead of calling `loadRecordingArtifactDetails(...)`, `AudioContext`, wavesurfer, or analysis services directly from UI.

Handoff expectations for P2-08:

- Use the P2-07 wrapper to display readiness for selected takes.
- Render comparison only for `ready` sources.
- Show per-take unavailable messages from P2-07.
- Use `artifactDetails.source` to label evidence as decoded audio or trusted peaks.
- Keep no-scoring copy and tests.
- P2-08 owns UI state, responsive comparison layout, selection affordances, and browser E2E screenshots/pixel checks if it renders new waveform visuals.

P2-07 should leave P2-08 with enough data to render without re-decoding:

- recording id/name/date
- group id/sheet/segment context when available
- peaks
- duration metadata and decoded duration/warning
- source kind
- reason/message for unavailable sources

## Relationship To Pack 9 Analysis Infrastructure

This slice may validate and consume already-saved `trustedPeaks`, but it must not implement Pack 9:

- No `AudioAnalysisEngine` abstraction unless it already exists and is required by current helpers.
- No peak precomputation jobs.
- No peak cache persistence changes.
- No onset detection.
- No alignment, scoring, correctness, or timing deviation.
- No WASM adapter.

When Pack 9 later adds validated peak precomputation/cache infrastructure, P2-07's source boundary can become the consumer-facing adapter that accepts those validated peaks. Until then, the only accepted peak sources are existing trusted peaks validated through decoded local artifacts or peaks derived from decoding the local artifact.

## Expected Files And Areas To Touch

Likely touch:

- New `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/lib/recordings-review/types.ts` only if shared exported types are needed for P2-08
- `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
- `tests/unit/recordings-review-history.test.ts` only for narrow additional artifact-helper validation that belongs with existing helper tests
- `tests/unit/recordings-review-repository.test.ts` only if repository lookup convenience is added

Maybe touch:

- `src/lib/recordings-review/artifact-service.ts`
  - only to add narrow mime/duration/error-code validation helpers or typed error reasons if required
- `src/lib/recordings-review/repository.ts`
  - only for a thin convenience method that reads current recordings and delegates to the new source helper
- `tests/e2e/recordings-review.spec.ts`
  - only if a non-UI integration assertion is already easy through existing artifact evidence; P2-08 will own comparison UI E2E

Avoid:

- `src/components/recordings-review/recordings-review-experience.tsx`
- `src/components/recordings-review/recording-artifact-review.tsx`
- `src/lib/recordings-review/wavesurfer-adapter.ts`
- `src/app/*`
- recording capture services and MediaRecorder adapters
- metronome/Tone services
- sheet practice UI
- IndexedDB schema/migration files
- Pack 9 analysis engine files that do not already exist

## Acceptance Criteria

- A comparison source boundary exists for selected sheet takes and is reusable by P2-08.
- Ready sources are backed by real decoded local artifacts or trusted peaks that passed decoded-artifact validation.
- Each selected take gets a structured `ready` or `unavailable` state with stable reason codes.
- Missing/deleted/stale recordings, missing artifacts, unsupported mime types, decode failures, empty audio, invalid peaks, invalid duration, quick recordings, and stale group membership are explicit and tested.
- Legacy sheet recordings and no-segment sheet groups remain valid when artifact validation succeeds.
- Segment groups and no-segment groups use P2-01 group membership rather than live segment definitions.
- UI code does not call decode, analysis, wavesurfer, Tone, MediaRecorder, or WASM directly for comparison sources.
- No scoring/correctness/accuracy fields or user-facing claims are introduced.
- Existing artifact helper, repository, grouped review, playback, delete, and take-history tests remain passing.

## Test Plan

Unit tests for the new boundary:

- Ready decoded source:
  - sheet recording with valid `audioDataUrl`, `audio/wav`, no trusted peaks, decoded samples produce nonzero peaks.
- Ready trusted peaks:
  - sheet recording with valid `audioDataUrl`, `audio/wav`, trusted peaks, and successful decode returns `source: "trusted-peaks"`.
- Invalid/trusted peak rejection:
  - all-zero, empty, `NaN`, `Infinity`, and non-finite peaks return `invalid-peaks`.
  - trusted peaks with missing audio return `missing-artifact`, not ready.
  - trusted peaks with decode failure return `decode-failed`, not ready.
- Missing/stale/deleted:
  - requested id absent from repository snapshot returns `missing-recording`.
  - requested id not in supplied group returns `stale-group-membership`.
  - deleted recording is not served from stale cached input when resolving from repository.
- Unsupported artifact metadata:
  - `mimeType: "metadata/session"`, blank mime, image/PDF mime, and null/blank `audioDataUrl` return explicit unavailable states.
- Invalid audio:
  - decode failure maps to `decode-failed`.
  - decoded empty/silent samples map to `empty-audio` or the chosen artifact-helper equivalent.
  - invalid/non-finite/negative duration maps to `invalid-duration` or tested warning behavior if decode still succeeds.
- Quick/legacy/no-segment:
  - quick recordings return `not-sheet-take`.
  - legacy sheet recording with absent `segmentContext` can become ready.
  - sheet recording with `segmentContext: null` can become ready.
  - no-segment group accepts only its group members.
  - segment group accepts only its group members.
- No scoring claims:
  - returned objects do not contain keys such as `score`, `accuracy`, `correct`, `mistakes`, `recommended`, `timingQuality`, or ranking fields.
  - error messages do not claim correctness or automatic evaluation.

Integration-style tests:

- Seed `recordingHistoryRepository.saveSnapshot(...)` with:
  - two valid local sheet artifacts in the same segment group
  - one valid no-segment legacy sheet artifact
  - one quick recording
  - one missing-artifact sheet recording
  - one invalid trusted-peak recording
  - one unsupported mime recording
- Resolve selected ids through the repository/service boundary.
- Assert current repository state controls missing/deleted behavior.
- Assert ready/unavailable counts, order, group context, per-take reasons, and no mutation of the snapshot.

Fixtures:

- Reuse existing AudioContext mocks from `tests/unit/recordings-review-history.test.ts` or extract small local helpers.
- Use existing tiny data URL placeholders only for tests that mock decode.
- Use real browser-generated WAV data URLs in E2E only if P2-07 adds an E2E-level source assertion; otherwise keep P2-07 unit/integration-focused.

No browser comparison E2E is required for P2-07 because there is no comparison UI. P2-08 must add browser E2E for the visual comparison experience.

## Verification Commands

Use the local npm wrapper from the repo root:

```powershell
.\scripts\npm-local.ps1 run lint
.\scripts\npm-local.ps1 run typecheck
.\scripts\npm-local.ps1 run test:unit
```

For a narrower development loop:

```powershell
.\scripts\npm-local.ps1 exec vitest run tests/unit/recordings-review-waveform-comparison-sources.test.ts tests/unit/recordings-review-history.test.ts tests/unit/recordings-review-repository.test.ts
```

If no repository changes are made, the narrow command may omit `recordings-review-repository.test.ts`, but final verification should include lint, typecheck, and all unit tests.

## Model Tier Recommendation

- Coding agent: GPT-5.5, high effort, standard speed
- Review agent: GPT-5.4, high effort, standard speed
- Verification agent: GPT-5.4, high effort, standard speed

Rationale: Tier D is required because this slice defines recording/media/waveform evidence boundaries. A false pass could let P2-08 display fake or stale waveform comparison data. Do not use fast tier.

## Constraints For Coding Agent

- Reuse existing `ReviewRecording`, `RecordingTakeGroup`, `RecordingArtifactDetails`, `recordingHistoryRepository`, P2-01 grouping helpers, and `loadRecordingArtifactDetails(...)`.
- Keep source resolution deterministic, local-only, and side-effect free except for decoding the passed local artifact.
- Do not add packages.
- Do not add storage schema fields or migrations.
- Do not create a new backend or network/cloud path.
- Do not implement UI comparison.
- Do not introduce scoring, correctness, automatic feedback, analysis ranking, or v2 behavior.
- Do not let UI code call low-level audio, wavesurfer, Tone, MediaRecorder, or WASM for comparison.
- Do not trust precomputed peaks unless the real local artifact also decodes and the peaks pass validation.
- Keep changes scoped to recording review source helpers, narrow shared types, and tests.

## Handoff Notes For P2-08

- P2-08 should import and consume the P2-07 source boundary.
- P2-08 should pass explicit selected recording ids or selected `ReviewRecording` records; it should not infer selected takes from best/active/latest unless the UI explicitly asks for that behavior.
- P2-08 should show per-take readiness and unavailable messages from P2-07.
- P2-08 may render peaks from `ready` sources, but must not re-decode artifacts in React.
- P2-08 should keep comparison copy factual: "waveform evidence", "decoded audio artifact", "trusted peaks", "duration warning"; never score/accuracy/correctness language.
- P2-08 should add visual/browser E2E coverage for the comparison UI, including mobile layout and negative artifact states.
