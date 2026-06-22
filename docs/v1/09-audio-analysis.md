# Audio Analysis v1 Roadmap

## Purpose

This v1 module defines bounded audio analysis infrastructure that should not shape v0 implementation too early.

v0 may preserve adapter boundaries for analysis, but it must not implement automatic analysis features unless explicitly promoted.

## Builds On

- v0 recordings are real audio artifacts.
- v0 waveform data is verified for stability.
- v0 metronome timing is verified.
- v0 keeps UI away from low-level audio and WASM internals.

## Candidate v1 Features

- Peak precomputation for faster waveform rendering.
- Onset detection infrastructure.
- Reference-to-recording comparison support.
- Analysis result boundaries for future review features.

## Product Value

- Make waveform rendering faster and more reliable.
- Prepare for future assisted practice feedback.
- Enable more precise comparison once reference and recording foundations are stable.

## Required v0 Boundaries to Preserve

- UI must not call analysis engines directly.
- Analysis remains optional and replaceable.
- v0 must not claim automatic mistake detection.
- Timestamp-based manual review remains valid.

## Possible Architecture Changes

- `AudioAnalysisEngine` interface.
- TypeScript analysis adapter for early experiments.
- Rust/WASM analysis adapter.
- Analysis result persistence model.
- Background analysis job queue.

## Testing Implications

- Analysis tests need controlled audio fixtures.
- Onset infrastructure needs known onset fixtures.
- WASM adapters need parity tests against expected results.
- E2E tests must avoid treating analysis as authoritative unless accuracy criteria are defined.

## Risks

- Analysis can create false confidence if accuracy is not measured.
- WASM can add build and performance complexity.
- Long-running analysis can affect UI responsiveness.
- Automatic feedback can distract from the simple v0 practice loop.

## Promotion Criteria

Promote v1 audio analysis only after:

- v0 recording and waveform modules are verified.
- Controlled fixture sets exist.
- Accuracy tolerances are defined.
- The selected analysis feature has a clear product decision and failure state.

User-facing timing deviation feedback, BPM detection, pitch detection, automatic scoring, and productized audio alignment are deferred to `docs/v2`.
