# F7-3 Final Pack F Scan Classification

Status: final F7-3 implementation closeout classification.

Branch: `codex/pack-f-f7-3-mutation-harness-closeout`

Pack F remains `implementation_in_progress`. This artifact supports moving
`F7-boundary-hardening-viewer-closeout` to `implementation_done`; it does not
mark Pack F verified.

## Verification Evidence

All commands were run from the repo root with `.\scripts\npm-local.ps1` where
applicable.

| Command | Result |
| --- | --- |
| `git diff --check` | PASS; only Git LF-to-CRLF working-copy warnings were printed. |
| `.\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts tests/unit/sheet-library-experience.test.tsx tests/unit/sheet-library-service.test.ts tests/unit/quick-metronome-session.test.ts tests/unit/sheet-practice-controls.test.tsx tests/unit/sheet-practice-recording.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts tests/unit/recordings-review-artifact-storage.test.ts` | PASS; 9 files, 235 tests. |
| `.\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-library.spec.ts tests/e2e/quick-metronome.spec.ts tests/e2e/sheet-practice-controls.spec.ts tests/e2e/sheet-segment-recording.spec.ts tests/e2e/sheet-viewer.spec.ts tests/e2e/recordings-review.spec.ts` | PASS; 25 Chromium tests. |
| `.\scripts\npm-local.ps1 --% run lint` | PASS. |
| `.\scripts\npm-local.ps1 --% run typecheck` | PASS. |
| `.\scripts\npm-local.ps1 --% run test:unit` | PASS; 66 files, 833 tests. |
| `.\scripts\npm-local.ps1 --% run build` | PASS. |
| `.\scripts\npm-local.ps1 --% run test:e2e` | PASS; 45 Chromium tests. |
| `.\scripts\npm-local.ps1 --% run smoke` | PASS; lint, typecheck, full unit, build, and full E2E all passed. |

## Scan 1: UI/App/Hook Infrastructure Imports

Command:

```powershell
rg -n "@/infrastructure" src/components src/app src/hooks
```

Result: `NO HITS`

Classification: `resolved`

Reason: PR #106's zero-hit UI/app/hook infrastructure boundary remains intact.
No F7-3 change reintroduced `@/infrastructure/**` imports into UI, app, or
hook files.

## Scan 2: Pack F Primitive And Timer Terms

Command:

```powershell
rg -n "timeSignature\.split|noteNames|chord|scale|interval|setTimeout|decodeAudioData|MediaRecorder" src
```

| Hit group | Classification | Owner | Reason | Closeout condition |
| --- | --- | --- | --- | --- |
| `src/lib/quick-metronome/control.ts` tap-tempo `interval` variables | approved exception | Quick Metronome tap-tempo control | Numeric intervals are user tap deltas, not a custom music-theory interval table or scheduler primitive. | Revisit only if tap-tempo moves into musical interval/domain policy. |
| `src/domain/music/README.md` policy text mentioning note/chord/scale/key/interval/pitch/MIDI/rhythm/duration | approved exception | Music domain policy docs | Documentation guardrail text, not executable primitive logic. | Keep as guardrail while Pack F primitive policy exists. |
| `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts` PDF/image `scale` math | approved exception | Sheet Viewer browser adapter | PDF/image thumbnail sizing uses pdfjs/image dimensions; this is viewer rendering math, not music scale logic. | Revisit only if viewer sizing leaves adapter ownership. |
| `src/domain/sheet/types.ts` sheet category `scale` | approved exception | Sheet Library domain | Product sheet category label, not music-scale primitive implementation. | Revisit only if categories become music-theory policy. |
| `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx` and `src/services/sheet-viewer/**` viewer transform `scale` | approved exception | Sheet Viewer transform service/UI | Zoom/pan transform state and bounds; not music scale logic. | Revisit only if custom viewer transform duplicates an installed primitive. |
| `src/components/app-shell/app-shell.tsx` `setTimeout` | approved exception | App shell navigation guard UI | Non-audio UI delay for route/navigation state settling. | Remove if navigation guard no longer needs a deferred UI tick. |
| `src/lib/recordings-review/browser-audio-download-adapter.ts` `setTimeout` | approved exception | Browser audio download adapter | Browser object URL revocation delay after download; not audio scheduling. | Remove if browser download API no longer requires deferred revocation. |
| `src/infrastructure/reference/local-reference-audio-player.ts` `intervalId`, `setInterval`, `clearInterval` | approved exception | Reference audio player infrastructure | UI playback progress polling for local reference audio; not metronome/countdown scheduler logic. | Replace if reference playback gains a browser-native progress event bridge that covers tests. |
| `src/services/sheet-viewer/manual-page-turn-timer.ts` `setTimeout` abstraction | approved exception | Sheet Viewer manual segment page-turn timer | Manually armed segment page-turn UI timer approved by F7; intentionally not reference-synced and not Tone countdown logic. | Remove if future product scope removes manual page turn or replaces it with reviewed semantics. |
| `src/components/sheet-practice/reference/reference-panel.tsx` `setTimeout` calls | approved exception | Reference panel UI | Non-audio UI reset/settling timers around reference playback controls. | Replace when reference UI state no longer needs delayed reset. |
| `src/components/quick-metronome/latest-quick-recording.tsx` playback reset `setTimeout` calls | approved exception | Quick latest-recording UI | Non-scheduler UI playback-state reset after latest recording duration. | Replace if playback state moves behind a service event. |
| `src/components/recordings-review/use-recordings-review-controller.ts` client-ready `setTimeout` | approved exception | Recordings Review controller UI | Non-audio hydration/client-ready delay. | Remove if hydration no longer needs a deferred client-ready tick. |
| `src/components/sheet-practice/controls/sheet-metronome-preset-control.tsx` `setTimeout` | approved exception | Sheet metronome preset UI | Non-audio UI feedback timer for preset status. | Remove if status feedback becomes event-driven. |
| `src/components/sheet-practice/controls/metronome-settings-panel.tsx` text `Tick interval` | approved exception | Metronome settings UI | Display text for computed tick interval, not a custom timing primitive. | Keep while the settings panel shows interval copy. |
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` hydration `setTimeout` | approved exception | Sheet Practice controls UI | Existing non-audio zero-delay session hydration refresh; guarded by architecture test allowlist through F7. | Revisit in a future cleanup if the hydration path can be synchronous. |
| `src/infrastructure/audio/browser-audio-decode-adapter.ts` `decodeAudioData` | approved exception | Shared browser audio decode adapter | Approved Web Audio decode boundary; architecture test keeps decode outside UI. | Keep as the single browser decode adapter. |
| `src/infrastructure/audio/browser-recording-capture.ts` `MediaRecorder` | approved exception | Browser recording capture adapter | Approved browser capture boundary; architecture test keeps MediaRecorder outside UI. | Keep as the single MediaRecorder capture adapter. |
| `src/infrastructure/audio/tone-metronome-adapter.ts` Tone loop `interval` | approved exception | Tone metronome adapter | Uses Tone.js loop interval primitive, satisfying external-library-first timing policy. | Keep while Tone owns metronome scheduling. |

Blocking hits: none.

## Scan 3: Escape Hatches And TODOs

Command:

```powershell
rg -n "eslint-disable|@ts-ignore|@ts-expect-error|TODO|FIXME" src tests
```

| Hit | Classification | Owner | Reason | Closeout condition |
| --- | --- | --- | --- | --- |
| `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx` `@next/next/no-img-element` disable | approved exception | Sheet Viewer UI | Imported image artifacts render from local Blob/object URLs with measured zoom/pan behavior. Next Image does not improve this local viewer path. | Remove only if the viewer changes to an image component that preserves object URL, sizing, zoom, and E2E behavior. |
| `src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx` `@next/next/no-img-element` disable | approved exception | Sheet Viewer thumbnail UI | Thumbnail images render local Blob/object URLs from the viewer thumbnail service. | Remove only if thumbnail rendering moves to an equivalent component without weakening local artifact behavior. |

Blocking hits: none.

## Final Classification Summary

- `resolved`: UI/app/hook infrastructure import scan is zero-hit.
- `approved exception`: all remaining primitive/timer/escape-hatch hits are
  existing, owned, and have a closeout condition above.
- `blocking`: none.

Pack F must still remain `implementation_in_progress` until the independent
review and verification gate marks the pack verified.
