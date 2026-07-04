# F6 Recording, Waveform, and Audio Analysis Alignment Plan

## Planning Status

Status: `planning_in_progress`

Planning branch: `codex/pack-f-f6-recording-waveform-plan`

Scope type: Pack F plan-only stage for the next smallest F6 coding PR.

Implementation tier: recording, media, waveform, decode, and browser audio
analysis work is high-risk Pack F scope. Use `gpt-5.5` extra-high reasoning,
standard speed, and no fast-path assumptions for the future coding PR.

This plan PR must not edit production code, tests, package manifests, lockfiles,
dependency files, or installed packages.

## Status JSON Evidence

This plan PR makes only the minimal Pack F status update:

- Pack F remains `implementation_in_progress`.
- `F1-library-first-rescan-plan` remains `verified`.
- `F2-external-library-first-guardrails` remains `verified`.
- `F3-tone-runtime-metronome-alignment` remains `implementation_done`.
- `F4-countdown-executor-unification` remains `implementation_done`.
- `F5-tonaljs-music-domain-policy` remains `implementation_done`.
- `F6-recording-waveform-analysis-alignment` moves from `not_started` to
  `planning_in_progress` and points to this plan file.
- `F7-boundary-hardening-viewer-closeout` remains `not_started`.

Current `docs/v1/status.json` evidence expected on this branch:

```json
{
  "pack": "pack-f-audio-music-library-alignment",
  "status": "implementation_in_progress",
  "slices": [
    {
      "slice": "F1-library-first-rescan-plan",
      "status": "verified",
      "plan": "docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md"
    },
    {
      "slice": "F2-external-library-first-guardrails",
      "status": "verified"
    },
    {
      "slice": "F3-tone-runtime-metronome-alignment",
      "status": "implementation_done",
      "plan": "docs/v1/implementation-slices/plans/F3-tone-runtime-metronome-alignment.md"
    },
    {
      "slice": "F4-countdown-executor-unification",
      "status": "implementation_done",
      "plan": "docs/v1/implementation-slices/plans/F4-countdown-executor-unification.md"
    },
    {
      "slice": "F5-tonaljs-music-domain-policy",
      "status": "implementation_done",
      "plan": "docs/v1/implementation-slices/plans/F5-tonaljs-music-domain-policy.md"
    },
    {
      "slice": "F6-recording-waveform-analysis-alignment",
      "status": "planning_in_progress",
      "plan": "docs/v1/implementation-slices/plans/F6-recording-waveform-analysis-alignment.md"
    },
    {
      "slice": "F7-boundary-hardening-viewer-closeout",
      "status": "not_started"
    }
  ]
}
```

No F5 status, F6 coding/review/verification status, or F7 status is advanced by
this plan.

## Required Reads

Completed for this plan:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md`
- `docs/v1/implementation-slices/rules/external-library-first.md`
- `D:\Downloads\pack-f-audio-music-library-alignment-plan.md`, used only as
  seed/history. Repo-local F0 and `status.json` remain source of truth.
- `docs/v1/implementation-slices/plans/F4-countdown-executor-unification.md`
  and `docs/v1/implementation-slices/plans/F5-tonaljs-music-domain-policy.md`
  as local plan-shape references only.
- `package.json`
- `src/infrastructure/audio/browser-recording-capture.ts`
- `src/services/recording/index.ts`
- `src/services/recording/browser.ts`
- `src/lib/quick-metronome/session.ts`
- `src/lib/quick-metronome/types.ts`
- `src/lib/quick-metronome/recording-service.ts`
- `src/lib/quick-metronome/recording-controller.ts`
- `src/lib/quick-metronome/demo-recording.ts`
- `src/lib/sheet-practice/recording-service.ts`
- `src/lib/recordings-review/artifact-model.ts`
- `src/lib/recordings-review/artifact-storage.ts`
- `src/lib/recordings-review/artifact-details.ts`
- `src/lib/recordings-review/artifact-review-controller.ts`
- `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/lib/recordings-review/wavesurfer-adapter.ts`
- `src/lib/recordings-review/audio-mime.ts`
- `src/lib/recordings-review/audio-export.ts`
- `src/lib/recordings-review/types.ts`
- `src/infrastructure/reference/local-audio-inspection-adapter.ts`
- `tests/unit/quick-metronome-recording-analysis.test.ts`
- `tests/unit/quick-metronome-session.test.ts`
- `tests/unit/sheet-practice-recording.test.ts`
- `tests/unit/recordings-review-artifact-storage.test.ts`
- `tests/unit/recordings-review-history.test.ts`
- `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
- `tests/unit/recordings-review-audio-export.test.ts`
- `tests/unit/architecture-boundaries.test.ts`
- `tests/e2e/quick-metronome.spec.ts`
- `tests/e2e/recordings-review.spec.ts`
- `tests/e2e/sheet-segment-recording.spec.ts`
- `tests/e2e/sheet-recording-review.spec.ts`

Focused scans used:

```text
rg --files src\services\recording src\lib\recordings-review tests\unit tests\e2e | rg "(recording|waveform|audio-export|quick-metronome|sheet-segment|architecture-boundaries|artifact|history|wavesurfer|analysis)"
rg -n "decodeAudioData|MediaRecorder|dataUrl|derivePeaks|peaks|peak|rms|zeroCross|silence|empty-audio|decode-failed|unsupported-mime|missing-artifact|storage|artifactRef|RecordingArtifact|wavesurfer|Record" src\infrastructure\audio src\services\recording src\lib\quick-metronome src\lib\sheet-practice src\lib\recordings-review src\infrastructure\reference tests\unit tests\e2e package.json
rg -n "MediaRecorder|decodeAudioData|dataUrl|derivePeaks|trustedPeaks|wavesurfer|RecordPlugin|Meyda|Aubio|Essentia" tests\unit\architecture-boundaries.test.ts src package.json
rg -n "describe\(|it\(" tests\unit\quick-metronome-recording-analysis.test.ts tests\unit\quick-metronome-session.test.ts tests\unit\sheet-practice-recording.test.ts tests\unit\recordings-review-artifact-storage.test.ts tests\unit\recordings-review-history.test.ts tests\unit\recordings-review-waveform-comparison-sources.test.ts tests\unit\recordings-review-audio-export.test.ts tests\unit\architecture-boundaries.test.ts
rg -n "test\(|describe\(" tests\e2e\quick-metronome.spec.ts tests\e2e\recordings-review.spec.ts tests\e2e\sheet-segment-recording.spec.ts tests\e2e\sheet-recording-review.spec.ts
rg -n "class Recorder|Recorder|export .*Recorder" node_modules\tone\build\esm node_modules\tone\Tone -g "*.d.ts" -g "*.js"
rg -n "exportPeaks|loadBlob\(|peaks\?:|class Record|static create|startRecording|startMic|plugins/regions" node_modules/wavesurfer.js/dist -g "*.d.ts"
rg -n "Meyda|Aubio|Essentia|meyda|aubio|essentia" package.json package-lock.json src tests
```

## Current F6 Debt Inventory

| Area | Current path | Current debt | Required F6 direction |
| --- | --- | --- | --- |
| Browser capture | `src/infrastructure/audio/browser-recording-capture.ts` | Owns raw `MediaRecorder`, MIME selection, `getUserMedia` constraints, stop promise, chunk list, track cleanup, Blob-to-dataUrl, decode, RMS/peak/frequency/silence analysis. | Keep browser capture behind the approved adapter, but move decode and analysis out to shared audio-analysis services. |
| Captured artifact contract | `src/services/recording/index.ts`; `src/lib/quick-metronome/types.ts` | `RecordingArtifact` still requires `dataUrl` even current user saves persist `artifactRef` and set metadata `audioDataUrl: null`. | Delete captured-artifact `dataUrl` from production contract if no production save path needs it. Retain `ReviewRecording.audioDataUrl` only for legacy/demo metadata unless a separate migration proves deletion is safe. |
| Quick save semantics | `src/lib/quick-metronome/recording-controller.ts`; `src/lib/quick-metronome/session.ts` | Quick save rejects empty/silent captures, saves Blob artifact first, links session, saves metadata, ends session if needed, captures `recording_stopped`, and performs rollback cleanup. | Reuse shared analysis result without changing metadata, artifactRef, session link, rollback, cleanup, or event semantics. |
| Sheet save semantics | `src/lib/sheet-practice/recording-service.ts` | Sheet save stops capture, rejects empty/silent capture, then decodes the Blob again to derive trusted peaks before preparing metadata and committing session/history. | Reuse one decode/peaks path for trusted peaks while preserving pre-metadata rejection, session preparation, artifact save, final history save, commit, rollback, and event semantics. |
| Review artifact details | `src/lib/recordings-review/artifact-details.ts` | Has a second `decodeAudioData` path, local `derivePeaksFromSamples`, trusted-peak normalization, duration warnings, and empty-audio errors. | Move decode and peak derivation into shared audio-analysis service while preserving `RecordingArtifactDetails` behavior and error reasons. |
| Waveform comparison | `src/lib/recordings-review/waveform-comparison-sources.ts` | Maps artifact errors and eligibility into user-facing unavailable reasons. | Preserve `decode-failed`, `unsupported-mime`, `empty-audio`, `missing-artifact`, `invalid-peaks`, `invalid-duration`, and stale membership mapping. |
| Artifact storage | `src/lib/recordings-review/artifact-storage.ts` | Blob/artifactRef is the current user-recording body source. Storage failures map to `storage-unavailable` and `quota-exceeded`. | Do not move storage into audio-analysis. Preserve artifactRef ownership checks and storage failure mapping. |
| Waveform playback | `src/lib/recordings-review/wavesurfer-adapter.ts`; `src/lib/recordings-review/artifact-review-controller.ts` | wavesurfer owns rendering, playback, seek, and timeupdate events. It currently loads Blob without service-provided peaks. | Keep wavesurfer as rendering owner by default. Only use service-level peaks with wavesurfer if the spike proves `loadBlob(blob, peaks, duration)` or related API reduces decode work without UI coupling. |
| Reference audio inspection | `src/infrastructure/reference/local-audio-inspection-adapter.ts` | Uses another direct `decodeAudioData` path to validate reference audio duration. | F6 must route this duration-only decode through the shared browser decode adapter. Do not change reference feature semantics, reference A-B loop behavior, or Regions scope. |
| Architecture guardrails | `tests/unit/architecture-boundaries.test.ts` | Raw `MediaRecorder` and `getUserMedia` are already confined to `src/infrastructure/audio/**`; no equivalent guardrail exists for `decodeAudioData` or peak derivation. | Add boundary tests so raw `MediaRecorder`, `decodeAudioData`, and production peak derivation are owned by approved adapter/service paths. |

Current behavior that must not drift:

- `MediaRecorder` capture uses microphone constraints with echo cancellation,
  noise suppression, and auto gain control disabled.
- Permission denial still throws `RecordingPermissionError`.
- Empty Blob captures still fail before metadata/session commit.
- Silent captures still fail before metadata/session commit.
- Quick saves still leave persisted user recordings with `artifactRef` and
  `audioDataUrl: null`.
- Sheet saves still persist trusted peaks from decoded audio and leave
  `audioDataUrl: null`.
- Artifact body resolution still refuses to fall back to legacy `audioDataUrl`
  when `artifactRef` is missing or its body cannot be loaded.
- Review comparison still refuses quick recordings, missing artifacts,
  unsupported MIME, empty audio, invalid trusted peaks, invalid duration, and
  stale group membership with the existing reason vocabulary.
- Demo quick recording can keep its synthetic `audioDataUrl`; deleting captured
  artifact `dataUrl` must not erase demo/legacy metadata support by accident.

## External Primitive Check

| Primitive | Evidence checked | F6 decision | What repo code still owns |
| --- | --- | --- | --- |
| Tone `Recorder` | Installed Tone source describes `Recorder` as a MediaRecorder wrapper and states it does not provide sample-accurate scheduling because MediaRecorder does not. It exposes support/state/start/stop/pause behavior over a MediaStream destination. | `no-go-with-guardrail` for wholesale capture replacement unless a future spike proves current mic constraints, permissions, duration, metadata, analysis, artifact storage, rollback, and cleanup are preserved. A narrow adapter spike is allowed. | Product capture contract, permission error mapping, artifact metadata, analysis output, save ordering, session rollback, and storage cleanup. |
| wavesurfer Record plugin | Installed wavesurfer plugin exposes `startMic`, `startRecording`, `stopRecording`, pause/resume, device listing, optional live waveform rendering, and internally uses `getUserMedia` plus `MediaRecorder`. | `no-go-with-guardrail` for replacing the capture contract by default. It may be useful for future live recording preview, but F6 should not couple capture saves to a UI plugin unless the spike proves service-safe ownership. | Save semantics, artifactRef body storage, silence policy, unavailable reasons, and rollback. |
| wavesurfer peaks, `exportPeaks`, predecoded peaks | Installed wavesurfer types expose `peaks` options, `loadBlob(blob, channelData, duration)`, and `exportPeaks({ channels, maxLength, precision })`. README notes large clips may need pre-decoded peaks. | `keep-business-logic` for rendering owner, with a constrained `replace` spike for service-produced peaks passed into rendering. Do not move service analysis into a wavesurfer UI instance. | Review comparison semantics, trusted-peaks validation, duration warnings, and peak normalization policy. |
| Web Audio `decodeAudioData` | Current code uses `AudioContext.decodeAudioData` in capture, review artifact details, and reference inspection. This is the native browser decode primitive for complete file data. | `replace` scattered decode calls with one browser decode adapter. | Error vocabulary, service-level duration/peak/silence decisions, and caller-specific mapping. |
| MediaRecorder | Current capture adapter uses raw MediaRecorder chunks, MIME selection, timeslice, stop event, and track cleanup. Architecture tests already restrict `MediaRecorder` and `getUserMedia` to infrastructure audio. | `keep-business-logic` plus guardrail. If raw MediaRecorder remains, it must stay only inside the approved capture adapter. | Browser API binding only; no product policy in infrastructure. |
| Meyda, Aubio, Essentia, or other heavy analysis libraries | No dependency exists in `package.json` or the lockfile, and current F6 needs are normalized peaks, decoded duration, peak/RMS amplitude, rough zero-crossing frequency, and silence detection. | `no-go-with-guardrail` for F6. Do not add heavy DSP dependencies unless current v1 scope proves onset, pitch, spectral, or beat detection is needed. That belongs to P9/Future analysis planning, not F6. | Simple analysis policy remains repo-owned behind `src/services/audio-analysis/**`. |

## Decision Paths

F6 has three allowed decision paths:

1. Replace duplicated decode, analysis, and peaks:
   - Add one browser decode adapter for `decodeAudioData`.
   - Add one peaks service.
   - Add one silence/recording analysis service.
   - Route capture, review artifact details, and sheet save trusted peaks through
     the shared boundary.
2. Keep business logic in services/domain:
   - Recording metadata, artifact storage refs, unavailable reason mapping,
     rollback semantics, cleanup rules, session events, duration warnings,
     trusted-peak validation, and silence thresholds stay product-owned.
   - Storage and history writes do not move into browser audio adapters.
3. No-go with guardrail for capture replacement:
   - Do not replace the whole capture contract with Tone Recorder or wavesurfer
     Record unless a spike proves parity for permissions, constraints, metadata,
     analysis, storage, and rollback.
   - If raw MediaRecorder remains, it remains only in the approved capture
     adapter path.
   - wavesurfer remains rendering owner unless the spike proves service-level
     peaks can use wavesurfer APIs without depending on a mounted UI instance.

## Smallest Implementable F6 Coding PR

The smallest acceptable coding PR is one focused audio-analysis ownership PR. It
is not a broader recording product rewrite.

### 1. Add shared audio-analysis contracts

Likely new production files:

- `src/services/audio-analysis/types.ts`
- `src/services/audio-analysis/decode.ts`
- `src/services/audio-analysis/peaks.ts`
- `src/services/audio-analysis/silence.ts`
- `src/services/audio-analysis/index.ts`
- `src/infrastructure/audio/browser-audio-decode-adapter.ts`

Expected responsibilities:

- `browser-audio-decode-adapter.ts` is the only production owner of
  `AudioContext` and `decodeAudioData` for recording, review analysis, and the
  existing reference-audio duration inspection path.
- `peaks.ts` owns normalized peak derivation, default peak count, trusted-peak
  normalization, and `hasUsablePeaks`.
- `silence.ts` or equivalent owns peak/RMS/zero-crossing analysis and the
  current silence thresholds.
- Types preserve current facts:
  - decoded duration in milliseconds;
  - sample rate;
  - peak amplitude;
  - RMS amplitude;
  - estimated frequency in Hz or null;
  - `isSilent`;
  - normalized peaks.

Suggested shape:

```ts
export type AudioDecodeAdapter = {
  decodeBlob(blob: Blob): Promise<AudioBuffer>;
};

export type AudioAnalysisService = {
  analyzeBlob(blob: Blob): Promise<RecordingArtifactAnalysis>;
  derivePeaksFromBuffer(buffer: AudioBuffer, peakCount?: number): number[];
  normalizePeaks(peaks: number[]): number[];
  hasUsablePeaks(peaks: number[]): boolean;
};
```

Exact names can differ, but ownership must be one adapter plus one primitive
service boundary, not new parallel decode helpers.

The audio-analysis service must not return or import
`RecordingArtifactDetails`. It also must not own duration warning text,
artifact-specific error mapping, storage lookup, trusted-peak acceptance rules
that require an artifact body, or review unavailable reason mapping. Those
semantics stay composed in `src/lib/recordings-review/artifact-details.ts` and
`src/lib/recordings-review/waveform-comparison-sources.ts` over the low-level
decode, peaks, and silence primitives.

### 2. Route capture through shared analysis

Likely edited production file:

- `src/infrastructure/audio/browser-recording-capture.ts`

Required result:

- Raw `MediaRecorder`, `getUserMedia`, MIME selection, chunks, stop promise, and
  track cleanup remain in the capture adapter.
- `blobToDataUrl`, local `decodeBlob`, and local `analyzeDecodedRecording` are
  deleted or moved to shared service ownership.
- Capture returns Blob, duration, MIME, size, and shared analysis.
- Permission behavior and `RecordingPermissionError` messages do not change.
- No Tone Recorder or wavesurfer Record replacement lands without the spike
  evidence and guardrail described above.

### 3. Delete or retain production dataUrl path by evidence

F6 should first prove whether any production user-recording save path still uses
`RecordingArtifact.dataUrl`.

Expected decision:

- Delete `dataUrl` from `RecordingArtifact` and captured-artifact fakes if quick
  and sheet save paths only require Blob plus `artifactRef`.
- Keep `ReviewRecording.audioDataUrl?: string | null` for demo and legacy
  metadata unless a separate migration plan proves it is safe to remove.
- Keep artifact-storage tests that prove no fallback to legacy `audioDataUrl`
  occurs for user recording bodies.

No-go:

- Do not delete demo recording playback evidence in
  `src/lib/quick-metronome/demo-recording.ts` as part of F6.
- Do not add a new base64 path to replace the deleted captured-artifact
  `dataUrl`.

### 4. Route sheet save trusted peaks and review details through shared service

Likely edited production files:

- `src/lib/sheet-practice/recording-service.ts`
- `src/lib/recordings-review/artifact-details.ts`
- `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/lib/recordings-review/artifact-review-controller.ts` only if the import
  boundary changes are needed

Required result:

- Sheet save derives trusted peaks from the same service used by review.
- Review artifact details keep current duration tolerance and warning text.
- `src/lib/recordings-review/artifact-details.ts` remains the owner that composes
  decoded duration, metadata duration, duration warnings, trusted peak
  acceptance, and `RecordingArtifactError` reasons into
  `RecordingArtifactDetails`.
- Trusted peaks still require a decodable local artifact before being accepted.
- Invalid trusted peaks still map to the current invalid-peak/decode-failed
  behavior in tests.
- Empty decoded audio still throws `empty-audio`.
- Unsupported MIME is still caught before decode by artifact resolution.

### 5. Keep artifact storage and rollback out of audio-analysis

Likely unchanged or lightly edited production files:

- `src/lib/recordings-review/artifact-storage.ts`
- `src/lib/quick-metronome/recording-controller.ts`
- `src/lib/sheet-practice/recording-service.ts`

Required result:

- `saveCapturedRecordingArtifact` remains the only artifact body write path.
- Artifact ownership checks by recording id remain unchanged.
- Storage errors still map to `storage-unavailable` or `quota-exceeded`.
- Quick save rollback still cleans saved artifact and restores/deletes session
  snapshots when link/end/session operations fail.
- Sheet save rollback still handles metadata, artifact, prepared session commit,
  and previous session restoration.

### 6. Evaluate wavesurfer peaks without UI coupling

Spike allowed in coding PR:

- Verify whether current installed wavesurfer `exportPeaks` can be used from a
  service-safe, non-mounted instance without coupling business services to DOM.
- Verify whether service-produced peaks can be passed to current rendering via
  `loadBlob(blob, peaks, duration)` or a similar documented API without losing
  playback behavior.

Expected default:

- Keep local peak derivation in `src/services/audio-analysis/peaks.ts`.
- Keep `src/lib/recordings-review/wavesurfer-adapter.ts` as playback/rendering
  owner.
- Do not import wavesurfer into `src/services/audio-analysis/**` unless the spike
  proves no DOM/UI coupling and the PR records the evidence.

### 7. Route reference duration inspection through the shared decode adapter

Likely edited production file:

- `src/infrastructure/reference/local-audio-inspection-adapter.ts`

Required result:

- The reference inspection adapter no longer calls `decodeAudioData` directly.
- It uses the shared browser decode adapter only to obtain decoded duration.
- Its current user-facing result messages and duration validation remain
  unchanged.
- F6 does not implement reference A-B loop, Regions, playback-speed,
  manual-offset alignment, segment binding, or reference waveform display.
- Architecture tests have no temporary `decodeAudioData` exception for this
  file after F6.

### 8. Tighten architecture guardrails

Likely edited test file:

- `tests/unit/architecture-boundaries.test.ts`

Required guardrail result:

- Raw `MediaRecorder` and `navigator.mediaDevices.getUserMedia` remain allowed
  only in `src/infrastructure/audio/**`.
- `decodeAudioData` is allowed only in the approved browser decode adapter.
- Production `derivePeaksFromSamples` or equivalent peak derivation is allowed
  only in `src/services/audio-analysis/**`.
- Heavy DSP dependencies such as Meyda/Aubio/Essentia cannot be introduced for
  F6 without an explicit Pack F primitive check and plan update.

## Likely Files

Expected new production files:

- `src/services/audio-analysis/types.ts`
- `src/services/audio-analysis/decode.ts`
- `src/services/audio-analysis/peaks.ts`
- `src/services/audio-analysis/silence.ts`
- `src/services/audio-analysis/index.ts`
- `src/infrastructure/audio/browser-audio-decode-adapter.ts`

Expected edited production files:

- `src/infrastructure/audio/browser-recording-capture.ts`
- `src/services/recording/index.ts`
- `src/services/recording/browser.ts`
- `src/lib/quick-metronome/types.ts`
- `src/lib/quick-metronome/session.ts`
- `src/lib/quick-metronome/recording-service.ts`
- `src/lib/quick-metronome/recording-controller.ts`
- `src/lib/sheet-practice/recording-service.ts`
- `src/lib/recordings-review/artifact-details.ts`
- `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/lib/recordings-review/types.ts` if shared types move
- `src/infrastructure/reference/local-audio-inspection-adapter.ts`, limited to
  reusing the shared decode adapter for existing duration inspection

Expected test files:

- mandatory new `tests/unit/audio-analysis-service.test.ts`
- `tests/unit/quick-metronome-recording-analysis.test.ts`
- `tests/unit/quick-metronome-session.test.ts`
- `tests/unit/sheet-practice-recording.test.ts`
- `tests/unit/recordings-review-artifact-storage.test.ts`
- `tests/unit/recordings-review-history.test.ts`
- `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
- `tests/unit/recordings-review-audio-export.test.ts`
- `tests/unit/architecture-boundaries.test.ts`

The dedicated audio-analysis test is mandatory. It must cover at least:

- peak derivation and normalization;
- empty, all-zero, non-finite, and otherwise invalid peaks;
- current silence threshold behavior for peak and RMS analysis;
- decode adapter failure mapping or an injected fake decode path;
- service-level operation without wavesurfer, DOM containers, or a mounted
  waveform instance.

Expected E2E verification specs:

- `tests/e2e/quick-metronome.spec.ts`
- `tests/e2e/recordings-review.spec.ts`
- `tests/e2e/sheet-segment-recording.spec.ts`
- `tests/e2e/sheet-recording-review.spec.ts`

This plan PR must not edit any of those production or test files.

## No-Go And Out Of Scope

No-go for F6:

- No production code in this plan PR.
- No package installs, lockfile edits, or dependency changes.
- No wholesale capture replacement with Tone Recorder or wavesurfer Record
  without spike evidence that preserves current constraints and save semantics.
- No raw `MediaRecorder` outside the approved capture adapter.
- No scattered `decodeAudioData` helpers after F6; reference inspection must use
  the shared decode adapter.
- No wavesurfer import in services unless the spike proves service-level peaks
  can use it without DOM/UI coupling.
- No Meyda, Aubio, Essentia, spectrogram, onset, pitch, or spectral-analysis
  dependency for current F6 scope.
- No broad recording UI rewrite, playback redesign, or migration of persisted
  recording metadata.
- No weakening artifact review negative tests or unavailable reason vocabulary.

Explicitly out of scope:

- F7 UI-to-infrastructure boundary cleanup.
- F7 sheet-viewer split and assisted page-turn naming.
- F7 mutation hardening outside recording save rollback touched by F6.
- F7 final Pack F source scan and closeout.
- Reference A-B loop and wavesurfer Regions implementation.
- Reference-synced page turning, automatic score following, automatic mistake
  detection, onset detection, and P9 audio-analysis features.
- F3/F4/F5 status advancement or verification claims.

## Acceptance Criteria

The future F6 coding PR passes only when all of these are true:

- It documents the External Primitive Check result for Tone Recorder,
  wavesurfer Record, wavesurfer peaks/exportPeaks/predecoded peaks,
  Web Audio `decodeAudioData`, MediaRecorder, and heavy DSP libraries.
- `decodeAudioData` is owned by one browser decode adapter.
- Peak derivation is owned by one peaks service.
- Silence and recording amplitude/frequency analysis are owned by one
  analysis/silence service.
- `src/services/audio-analysis/**` owns only low-level decode, peaks, silence,
  and recording-analysis primitives. It does not own `RecordingArtifactDetails`,
  duration warning text, artifact-specific error mapping, storage lookup, or
  review unavailable reason mapping.
- Capture, review artifact details, waveform comparison, and sheet save trusted
  peaks reuse the shared analysis boundary.
- `src/lib/recordings-review/artifact-details.ts` remains the owner that
  composes low-level analysis facts into `RecordingArtifactDetails`, duration
  warnings, `RecordingArtifactError` reasons, and review-facing artifact detail
  behavior.
- `src/lib/recordings-review/waveform-comparison-sources.ts` remains the owner
  of review unavailable reason mapping.
- `src/infrastructure/reference/local-audio-inspection-adapter.ts` no longer
  calls `decodeAudioData` directly and uses the shared decode adapter only for
  its current duration-inspection behavior.
- Quick recording save still rejects empty and silent captures before metadata
  or session commit.
- Sheet recording save still rejects empty, silent, and un-peaked captures before
  final metadata/history commit.
- Sheet save still persists non-empty `trustedPeaks` for saved user recordings.
- Persisted user recordings still use `artifactRef` and `audioDataUrl: null`.
- Captured artifact `dataUrl` is deleted from production if unused, or retained
  with explicit evidence and a narrow owner if still required.
- Demo/legacy `ReviewRecording.audioDataUrl` behavior is not deleted as a side
  effect of removing captured-artifact `dataUrl`.
- Artifact body resolution still refuses to fall back to legacy `audioDataUrl`
  for missing artifact bodies.
- Error mapping preserves `decode-failed`, `unsupported-mime`, `empty-audio`,
  `missing-artifact`, and storage failure reasons.
- Storage failures still map to `storage-unavailable` or `quota-exceeded` where
  applicable and do not become generic decode failures.
- Rollback semantics for quick and sheet saves are unchanged and covered by
  tests.
- `tests/unit/architecture-boundaries.test.ts` blocks recurrence for raw
  `MediaRecorder`, scattered `decodeAudioData`, and scattered peak derivation.
- `tests/unit/audio-analysis-service.test.ts` exists and covers peaks,
  normalization, invalid/empty peaks, silence thresholds, fake decode/failure
  behavior, and no wavesurfer/DOM dependency.
- No production dependency on Meyda/Aubio/Essentia or another heavy DSP library
  is added.
- wavesurfer remains the rendering/playback owner unless spike evidence
  explicitly supports service-level peak reuse without UI coupling.

## Future Coding PR Verification Commands

Run from repo root after implementation:

```powershell
git diff --check
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/audio-analysis-service.test.ts tests/unit/quick-metronome-recording-analysis.test.ts tests/unit/quick-metronome-session.test.ts tests/unit/sheet-practice-recording.test.ts tests/unit/recordings-review-artifact-storage.test.ts tests/unit/recordings-review-history.test.ts tests/unit/recordings-review-waveform-comparison-sources.test.ts tests/unit/recordings-review-audio-export.test.ts tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run lint -- src/services/audio-analysis src/infrastructure/audio src/services/recording src/lib/quick-metronome src/lib/sheet-practice src/lib/recordings-review src/infrastructure/reference tests/unit/audio-analysis-service.test.ts tests/unit/quick-metronome-recording-analysis.test.ts tests/unit/quick-metronome-session.test.ts tests/unit/sheet-practice-recording.test.ts tests/unit/recordings-review-artifact-storage.test.ts tests/unit/recordings-review-history.test.ts tests/unit/recordings-review-waveform-comparison-sources.test.ts tests/unit/recordings-review-audio-export.test.ts tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/quick-metronome.spec.ts tests/e2e/recordings-review.spec.ts tests/e2e/sheet-segment-recording.spec.ts tests/e2e/sheet-recording-review.spec.ts
```

Also record the source scans:

```powershell
rg -n "decodeAudioData|new AudioContext|webkitAudioContext" src tests
rg -n "MediaRecorder|navigator\.mediaDevices\.getUserMedia" src tests
rg -n "derivePeaksFromSamples|trustedPeaks|exportPeaks|loadBlob\(.*peaks" src tests
rg -n "Meyda|Aubio|Essentia|meyda|aubio|essentia" package.json package-lock.json src tests
```

If F6 touches reference inspection, also run the relevant reference tests chosen
by the coding agent. Do not expand into reference A-B loop or Regions feature
implementation.

## Plan PR Verification Evidence

Required for this plan-only PR:

```powershell
git diff --check
Get-Content docs\v1\status.json -Raw | ConvertFrom-Json | Out-Null; Write-Output 'docs/v1/status.json parsed OK'
git diff --cached --check
```

Recorded evidence for this plan PR:

- `git diff --check`: PASS. The command returned exit code `0`; it printed
  only Git line-ending warnings for the edited docs files.
- `Get-Content docs\v1\status.json -Raw | ConvertFrom-Json | Out-Null; Write-Output 'docs/v1/status.json parsed OK'`: PASS, output
  `docs/v1/status.json parsed OK`.
- `git diff --cached --check`: PASS after staging.

Product tests are intentionally not required for this plan/status-only PR.

## Risks And Rollback

Risks:

- Centralized decode could flatten distinct error reasons. Mitigate with
  explicit error types/reason mapping and current negative tests.
- Moving analysis out of capture could accidentally delay empty/silent rejection
  until after metadata/session writes. Mitigate with quick and sheet save tests.
- Removing captured-artifact `dataUrl` could break tests or demo/legacy metadata
  if the coding PR deletes too broadly. Mitigate by distinguishing
  `RecordingArtifact.dataUrl` from `ReviewRecording.audioDataUrl`.
- wavesurfer peak reuse could couple service logic to DOM lifecycle. Mitigate by
  keeping wavesurfer in playback/rendering unless the spike proves otherwise.
- A Tone Recorder or wavesurfer Record replacement could lose microphone
  constraints, MIME behavior, duration, stop/cleanup, or rollback semantics.
  Mitigate by treating whole-capture replacement as no-go unless proven.
- Architecture tests could become too narrow if they only check one old helper
  name. Mitigate by scanning APIs and known derivation patterns, not only file
  names.

Rollback:

- If shared analysis causes behavior drift, revert the routing changes while
  keeping the plan evidence and add a no-go update before trying a narrower PR.
- If `dataUrl` deletion breaks a real production path, restore the field with a
  documented owner and a follow-up deletion condition. Do not reintroduce
  metadata body fallback.
- If wavesurfer service-level peaks require DOM coupling, keep local peak
  derivation in `src/services/audio-analysis/peaks.ts` and use wavesurfer only
  for rendering.
- If Tone Recorder or wavesurfer Record cannot preserve capture semantics, keep
  raw MediaRecorder in `src/infrastructure/audio/browser-recording-capture.ts`
  and strengthen the guardrail.

## Handoff Instructions For Coding Agent

Read only these files first:

```text
docs/v1/START-HERE.md
docs/v1/status.json
docs/v1/implementation-slices/plans/F6-recording-waveform-analysis-alignment.md
docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md
docs/v1/implementation-slices/rules/external-library-first.md
src/infrastructure/audio/browser-recording-capture.ts
src/services/recording/index.ts
src/services/recording/browser.ts
src/lib/quick-metronome/session.ts
src/lib/quick-metronome/types.ts
src/lib/quick-metronome/recording-controller.ts
src/lib/sheet-practice/recording-service.ts
src/lib/recordings-review/artifact-storage.ts
src/lib/recordings-review/artifact-details.ts
src/lib/recordings-review/waveform-comparison-sources.ts
src/lib/recordings-review/wavesurfer-adapter.ts
src/lib/recordings-review/audio-export.ts
src/infrastructure/reference/local-audio-inspection-adapter.ts
tests/unit/quick-metronome-recording-analysis.test.ts
tests/unit/quick-metronome-session.test.ts
tests/unit/sheet-practice-recording.test.ts
tests/unit/recordings-review-artifact-storage.test.ts
tests/unit/recordings-review-history.test.ts
tests/unit/recordings-review-waveform-comparison-sources.test.ts
tests/unit/recordings-review-audio-export.test.ts
tests/unit/architecture-boundaries.test.ts
package.json
```

Then:

1. Spike Tone Recorder and wavesurfer Record only as candidates. Do not replace
   capture unless parity is proven.
2. Add the shared decode, peaks, and silence/analysis service boundary.
3. Route capture, sheet save, and review details through that boundary.
4. Decide captured-artifact `dataUrl` deletion from current production usage.
5. Preserve artifact storage, rollback, unavailable reasons, and demo/legacy
   metadata behavior.
6. Add architecture guardrails for decode and peaks ownership.
7. Do not touch F7 viewer/boundary/mutation cleanup or reference A-B loop/Regions
   implementation.
8. Do not advance `docs/v1/status.json` beyond the lifecycle state explicitly
   requested for the coding PR.
