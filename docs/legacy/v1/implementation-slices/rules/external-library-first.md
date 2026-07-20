# External Library First Rule

Pack F audio, music, recording, waveform, and timing work must check the mature primitive before adding local primitive logic.

## External Primitive Check

Every Pack F coding PR that touches audio, music theory, metronome timing, countdown/count-in execution, recording capture, decode, waveform, or reference playback must state:

- External primitive checked: Tone.js, TonalJS, wavesurfer.js, Web Audio, MediaRecorder, or another named existing dependency/platform API.
- Decision: `replace`, `keep-business-logic`, or `no-go-with-guardrail`.
- Why repo-owned code is still needed when the decision is not `replace`.
- Guardrail added or reused when a primitive remains repo-owned.

## Default Boundaries

- UI components must not import `@/infrastructure/**` directly. Temporary exceptions require a reviewed allowlist entry with a reason and Pack F cleanup stage.
- Do not add custom note, chord, scale, key, interval, pitch, MIDI, time-signature, subdivision, duration, or rhythm primitive tables in audio/music-related production files unless the path is an approved policy/facade allowlist entry in `tests/unit/architecture-boundaries.test.ts` or the file contains `PACK_F_APPROVED_PRIMITIVE_EXCEPTION` and the PR documents the approved no-go.
- Do not add production beat, countdown, count-in, or metronome runtime `setTimeout` scheduling unless the file contains `PACK_F_APPROVED_RUNTIME_TIMER_EXCEPTION` and the PR documents the approved no-go.

## Review Failure

Review must fail when the PR introduces a new local primitive without the External Primitive Check, widens a temporary allowlist without a reason, or moves business policy into infrastructure/browser singleton code.
