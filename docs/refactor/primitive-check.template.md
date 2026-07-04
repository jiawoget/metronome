# External Primitive Check

Status: draft

Use this before approving new custom logic in audio/music/waveform/recording/timing/domain validation.

## Matrix

| Capability | Existing/current implementation | Candidate primitive/library | Decision | No-go reason if custom | Guardrail |
|---|---|---|---|---|---|
| metronome scheduling | TODO | Tone.Transport / existing metronome adapter | TODO | TODO | TODO |
| waveform display/regions | TODO | wavesurfer.js + plugins | TODO | TODO | TODO |
| browser recording | TODO | MediaRecorder via adapter | TODO | TODO | TODO |
| audio graph/mix/offset | TODO | Web Audio via adapter | TODO | TODO | TODO |
| music theory note/chord/scale | TODO | Tonal / @tonaljs/* | TODO | TODO | TODO |
| PDF rendering | TODO | PDF.js / react-pdf | TODO | TODO | TODO |
| local persistence | TODO | Dexie/repository | TODO | TODO | TODO |
| runtime validation | TODO | Zod/domain schemas | TODO | TODO | TODO |
| server/cache async state | TODO | TanStack Query or current store/service boundary | TODO | TODO | TODO |
| ID generation | TODO | shared app ID helper or nanoid/crypto injected | TODO | TODO | TODO |
| date/time formatting | TODO | shared formatter policy / Intl | TODO | TODO | TODO |

## Rules

- Do not approve custom audio/music/waveform/timing primitives without checking this table.
- "Already written" is not a valid no-go reason.
- If custom code remains, add a guardrail:
  - tests,
  - owner,
  - allowed import boundary,
  - sunset condition.
