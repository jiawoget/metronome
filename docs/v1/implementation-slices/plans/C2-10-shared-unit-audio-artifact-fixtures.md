# C2-10 Shared Unit Audio Artifact Fixtures Plan

## Status

- Workstream: `pack-c-codebase-slimming`
- Slice: `C2-10 shared-unit-audio-artifact-fixtures`
- Current lifecycle state: `planning_in_progress`
- Parent plan: `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
- Baseline branch: `main`
- Baseline commit: `5188d82771a390d65fc005ef9d273a41ccc50568`
- Previous slice: `C2-09 e2e-fixture-and-spec-slimming` is `verified` and
  merged.
- Plan review: pending.

This plan covers one narrow unit-test fixture slimming PR. It does not cover
E2E fixture work, production code, recording storage contract changes, or a
generic test-fixture framework.

## Known Remaining Phase 7 Work

- `C2-07 test-fixture-slimming`: `verified`.
- `C2-08 large-unit-fixture-follow-up`: `verified`.
- `C2-09 e2e-fixture-and-spec-slimming`: `verified`.
- `C2-10 shared-unit-audio-artifact-fixtures`: this plan;
  `planning_in_progress`.
- `pack-c-codebase-slimming` remains `in_progress` until this slice is
  completed or explicitly re-scoped by review.

## Problem

The unit test suite still repeats two fixture mechanisms after C2-07 through
C2-09:

1. Several unit tests define local `installAudioContextMock(...)` helpers with
   the same `MockAudioContext`, `decodeAudioData`, `sampleRate`,
   `getChannelData`, `close`, `vi.stubGlobal("AudioContext", ...)`, and
   `window.AudioContext` setup shape.
2. Session/recording unit tests repeatedly construct small audio artifact
   bodies with `new Blob(["synthetic audio"])`, `dataUrl`, `durationMs`,
   `mimeType`, `sizeBytes`, and optional `analysis` fields.

The repeated code is test fixture scaffolding, not behavior under test. It
increases the size of already-large unit tests and makes future artifact-backed
storage changes easier to copy inconsistently.

## Evidence From Main

The current main branch has repeated `installAudioContextMock` implementations
in:

- `tests/unit/recordings-review-history.test.ts`
- `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
- `tests/unit/recording-artifact-review.test.tsx`
- `tests/unit/sheet-practice-recording.test.ts`

The current main branch also has repeated `RecordingArtifact` / Blob literal
construction in:

- `tests/unit/quick-metronome-session.test.ts`
- `tests/unit/sheet-practice-recording.test.ts`

Related but intentionally deferred:

- `tests/unit/recordings-review-artifact-storage.test.ts` owns repository
  ownership and cleanup behavior. Its `LocalRecordingArtifact` literals are
  part of the scenario evidence and should not be hidden behind a broad helper
  in this slice.
- `tests/unit/recordings-review-waveform-comparison-sources.test.ts` already
  has local `saveArtifactForRecording(...)` helpers tied to take-group
  scenarios. This PR may keep them unless a tiny helper removes duplication
  without hiding missing-artifact and unsupported-MIME cases.
- E2E artifact helpers from C2-09 stay in `tests/e2e/fixtures`; do not reuse
  or move them into unit tests.

## Scope

Allowed implementation files:

- New unit-only fixture helper:
  - `tests/unit/fixtures/audio-context.ts`
- Optional new unit-only artifact helper if it produces net simplification:
  - `tests/unit/fixtures/recording-artifacts.ts`
- Target unit tests only:
  - `tests/unit/recordings-review-history.test.ts`
  - `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
  - `tests/unit/recording-artifact-review.test.tsx`
  - `tests/unit/sheet-practice-recording.test.ts`
  - `tests/unit/quick-metronome-session.test.ts`
- Status and plan files:
  - `docs/v1/status.json`
  - this plan file
  - `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`

Out of scope:

- Any `src/**` production change.
- Any E2E test or E2E fixture change.
- Any broad scenario DSL, class-based fixture framework, fluent builder, or
  helper that embeds assertions.
- Any deletion or weakening of behavior assertions.
- Any attempt to normalize negative cases such as decode rejection,
  missing-artifact, unsupported MIME, duration mismatch, empty audio, or
  storage failure.
- Any cleanup of repository ownership/corruption matrix tests in
  `recordings-review-artifact-storage.test.ts`.

## Implementation Plan

1. Add `tests/unit/fixtures/audio-context.ts`.
   - Export `installAudioContextMock(options?)`.
   - Support existing options:
     - `durationSeconds`
     - `samples`
     - `sampleRate`
     - `reject`
   - Preserve current side effects:
     - `vi.stubGlobal("AudioContext", MockAudioContext)`
     - `Object.defineProperty(window, "AudioContext", { configurable: true,
       value: MockAudioContext })`
   - Keep cleanup owned by existing `afterEach(() => vi.unstubAllGlobals())`
     or equivalent test-local cleanup.

2. Replace local AudioContext mocks in target tests.
   - Remove duplicate local `installAudioContextMock` functions.
   - Keep each call site explicit about duration, samples, and rejection.
   - Do not change expected peak data, decoded duration, warnings, or error
     assertions.

3. Add a small artifact helper only if it removes real repeated fixture shape.
   - Candidate helper:
     - `makeRecordingArtifact(overrides?)`
   - Defaults may include:
     - `blob: new Blob(["synthetic audio"], { type: "audio/webm" })`
     - `dataUrl: "data:audio/webm;base64,c3ludGhldGlj"`
     - `durationMs`
     - `mimeType`
     - `sizeBytes`
     - optional `analysis`
   - Adopt only in `quick-metronome-session.test.ts` and
     `sheet-practice-recording.test.ts` where repeated capture artifact
     scaffolding is not itself the behavior under test.
   - Keep scenario-specific artifact values visible at call sites when the
     assertion depends on them.

4. Leave repository/storage matrix tests explicit.
   - Do not extract `createMemoryArtifactRepository` in this PR.
   - Do not replace ownership/corruption `LocalRecordingArtifact` literals
     where their IDs and recording IDs are the evidence being tested.

5. Run targeted baseline before implementation and targeted verification after
   implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-history.test.ts recordings-review-waveform-comparison-sources.test.ts recording-artifact-review.test.tsx sheet-practice-recording.test.ts quick-metronome-session.test.ts
```

6. Run required checks before PR:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:unit
git diff --check
```

7. In the PR description, include before/after accounting:
   - which duplicate AudioContext mock blocks were removed;
   - which artifact literal shapes were replaced;
   - which negative cases stayed explicit;
   - whether unit-test implementation code is net reduced after helper files.

## Acceptance Criteria

- `docs/v1/status.json` records:
  - Pack C = `in_progress`
  - C2-10 = `verified` after local verification
- `installAudioContextMock` is shared from a unit-only fixture helper and
  duplicate local copies are removed from target tests.
- Decode success and decode rejection behavior remains explicit at call sites.
- Any artifact helper remains a plain object factory and does not embed
  assertions, test names, scenario branches, repository operations, or storage
  cleanup.
- `quick-metronome-session.test.ts` and `sheet-practice-recording.test.ts`
  keep behavior-specific artifact analysis, MIME, duration, and failure
  overrides readable at call sites.
- `recordings-review-artifact-storage.test.ts` repository ownership and
  corruption matrix remains untouched unless a follow-up plan explicitly
  approves it.
- No production code changes.
- No E2E changes.
- No behavior assertions or user-facing coverage are deleted.
- The PR is real fixture duplication reduction, not formatting-only slimming.

## Verification

Targeted unit baseline and verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-history.test.ts recordings-review-waveform-comparison-sources.test.ts recording-artifact-review.test.tsx sheet-practice-recording.test.ts quick-metronome-session.test.ts
```

Required before PR:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:unit
git diff --check
```

If replacing a fixture helper would require changing assertions, hiding
negative cases, touching production code, or moving E2E helpers into unit
tests, stop and ask for review before continuing.
