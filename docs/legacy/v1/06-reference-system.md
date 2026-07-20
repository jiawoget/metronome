# Reference System v1 Roadmap

## Purpose

This module extends v0 reference playback into more focused, segment-aware, and comparison-oriented practice references.

## Builds On

- v0 supports local audio references.
- v0 supports Bilibili references by URL and search result selection.
- v0 references persist by sheetId.
- v0 local audio playback is verified with real audio fixtures.
- v0 Bilibili search is verified through UI with deterministic fixtures.
- v0 does not download or extract Bilibili media.

## Candidate v1 Features

- A-B loop.
- Playback speed control.
- Manual offset alignment.
- Reference waveform display.
- Reference-to-recording waveform comparison.
- Precise start and end segment binding.
- Reference source attached to Practice Segment.
- Optional beat sync between reference audio and user recording.
- Bilibili start and end time saving.
- Richer Bilibili metadata.
- Reference audio analysis experiments.

## Product Value

- Help users focus on short difficult passages.
- Make reference practice more precise without requiring automatic analysis.
- Support richer review once recording and waveform foundations are stable.

## Required v0 Boundaries to Preserve

- Reference remains secondary to sheet and practice controls.
- Bilibili remains lightweight unless explicitly promoted.
- No Bilibili download or audio extraction by default.
- Reference play/pause remains independent from metronome and recording.
- Reference search stays behind an adapter boundary.

## Possible Architecture Changes

- Reference segment model.
- A-B loop playback service.
- Playback speed service.
- Manual offset model.
- Reference waveform service.
- Reference comparison service.
- Richer Bilibili metadata adapter.

## Testing Implications

- A-B loop needs precise time-bound playback tests.
- Playback speed needs audio duration and rate checks.
- Offset alignment needs paired reference/recording fixtures.
- Waveform comparison needs stable waveform data tests.
- Bilibili metadata tests need deterministic adapter fixtures.
- E2E tests must still use real browser interaction.

## Risks

- Reference controls can overcrowd Sheet Practice.
- Bilibili deeper integration can become brittle or policy-sensitive.
- Playback speed and loop controls can make state interactions complex.
- Comparison can imply accuracy beyond v0's intent.

## Promotion Criteria

Promote v1 reference features only after:

- v0 Reference System is verified.
- Sheet Recording / Review is verified.
- Waveform stability is reliable.
- The selected feature has deterministic media fixtures and E2E coverage.
