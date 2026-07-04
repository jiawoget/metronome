# Pack F: Audio/Music Library Alignment and Tech-Debt Closeout

## Scope

This is the durable, repo-local planning artifact and source of truth for Pack F. The initial out-of-repo seed material has been folded into this file; future Pack F work must use this repository artifact rather than any local download path. A separate F1 file is not needed because F1 is not an implementation slice; it is the scan and review gate that freezes the Pack F debt map before F2-F7 coding starts.

Pack F is plan-first and library-first:

- UI must not import Tone.js, wavesurfer.js, Web Audio, MediaRecorder, Dexie, or other infrastructure browser singletons directly.
- Runtime and infrastructure code must check mature primitives before custom scheduling, recording, music-theory, waveform, or analysis logic.
- Business semantics stay in domain/services: accent policy, segment meaning, recording metadata, unavailable reasons, storage rollback, practice-session events, sheet-viewer product rules.
- F1 is not PASS until external ChatGPT plan review explicitly accepts this inventory and the no-go guardrails.

## Required Reads Completed

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/product-feature-map.md`
- `docs/v1/implementation-slices/02-segment-take-review.md`
- `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/implementation-slices/06-quick-metronome-training.md`
- `docs/v1/implementation-slices/09-audio-analysis-infrastructure.md`

The external seed plan was used only to initialize this repo-local artifact. It is not a normative dependency for future Pack F planning, coding, review, or status updates.

## F1 Scan Evidence

Repo areas scanned:

```text
src/infrastructure/audio/**
src/services/metronome/**
src/services/recording/**
src/lib/quick-metronome/**
src/domain/practice/**
src/lib/recordings-review/**
src/components/**
src/infrastructure/sheet-viewer/**
src/services/sheet-viewer/**
tests/unit/**
tests/e2e/**
package.json
```

Keyword scan:

```text
Tone Transport Loop Draw Sampler Synth Recorder MediaRecorder getUserMedia
AudioContext decodeAudioData setTimeout setInterval scheduleRepeat bpm
timeSignature subdivision measure beat countdown bar count-in note interval
chord scale key pitch midi peaks waveform wavesurfer Tonal @tonaljs
```

Commands used for local scan:

```text
rg --files src/infrastructure/audio src/services/metronome src/services/recording src/lib/quick-metronome src/domain/practice src/lib/recordings-review src/infrastructure/sheet-viewer src/services/sheet-viewer tests/unit tests/e2e package.json
rg -n "Tone|Transport|Loop|Draw|Sampler|Synth|Recorder|MediaRecorder|getUserMedia|AudioContext|decodeAudioData|setTimeout|setInterval|scheduleRepeat|bpm|timeSignature|subdivision|measure|beat|countdown|bar count-in|note|interval|chord|scale|key|pitch|midi|peaks|waveform|wavesurfer|Tonal|@tonaljs" src/infrastructure/audio src/services/metronome src/services/recording src/lib/quick-metronome src/domain/practice src/lib/recordings-review src/components src/infrastructure/sheet-viewer src/services/sheet-viewer tests/unit tests/e2e package.json
rg -n "@/infrastructure" src/components src/app src/hooks
rg -n "decodeAudioData|derivePeaksFromSamples|analyzeDecodedRecording|trustedPeaks|dataUrl|MediaRecorder|RecordingArtifact" src/lib src/services src/infrastructure src/domain tests/unit
rg -n "setTimeout|setInterval|schedulePreStartCountdown|scheduleBarCountIn|countdown|count-in|bar count" src/lib/quick-metronome src/services/metronome src/domain/practice src/components tests/unit tests/e2e
rg -n "timeSignature\.split|parseTimeSignature|TIME_SIGNATURES|SUBDIVISIONS|getMeterTimeSignatureParts|getTimeSignatureParts|note|interval|chord|scale|key|midi|pitch" src/domain src/lib src/services src/components tests/unit
```

External primitives checked:

- Tone.js docs and source:
  - `https://tonejs.github.io/`
  - `https://tonejs.github.io/docs/15.1.22/classes/Loop.html`
  - `https://tonejs.github.io/docs/15.1.22/classes/Recorder.html`
  - `https://tonejs.github.io/docs/15.1.22/classes/Sampler.html`
  - `https://tonejs.github.io/docs/15.1.22/classes/Synth.html`
  - `https://raw.githubusercontent.com/Tonejs/Tone.js/dev/Tone/core/clock/Transport.ts`
  - `https://raw.githubusercontent.com/Tonejs/Tone.js/dev/Tone/core/util/Draw.ts`
- TonalJS / `@tonaljs/*`:
  - `https://www.npmjs.com/package/@tonaljs/time-signature`
  - `https://raw.githubusercontent.com/tonaljs/tonal/main/packages/duration-value/index.ts`
  - `https://raw.githubusercontent.com/tonaljs/tonal/main/packages/note/README.md`
  - `https://raw.githubusercontent.com/tonaljs/tonal/main/packages/interval/README.md`
  - `https://raw.githubusercontent.com/tonaljs/tonal/main/packages/chord/README.md`
  - `https://raw.githubusercontent.com/tonaljs/tonal/main/packages/scale/README.md`
  - `https://raw.githubusercontent.com/tonaljs/tonal/main/packages/key/README.md`
- wavesurfer.js:
  - `https://wavesurfer.xyz/docs/`
  - `https://wavesurfer.xyz/docs/peaks/`
  - `https://wavesurfer.xyz/docs/plugins/regions/`
  - `https://wavesurfer.xyz/docs/plugins/record/`
  - `https://wavesurfer.xyz/docs/web-audio/`
- Web Audio / MediaRecorder native APIs:
  - `https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder`
  - `https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia`
  - `https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData`
  - `https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API`
- `chromatone/chromatone.center`:
  - `https://github.com/chromatone/chromatone.center`
  - `https://github.com/chromatone/chromatone.center/blob/master/use/tempo.js`
  - `https://github.com/chromatone/chromatone.center/blob/master/use/audio.js`
  - `https://github.com/chromatone/chromatone.center/blob/master/use/recorder.js`
  - `https://github.com/chromatone/chromatone.center/blob/master/use/theory.js`
- Other focused open-source references:
  - `https://github.com/cwilso/metronome`
  - `https://github.com/tambien/Metro.js`

External findings that affect Pack F:

- Tone.js already models the runtime primitives this repo is rebuilding around the edges: `Transport` owns tempo, looping, scheduled repeats, transport time, loop points, and BPM ramps; `Loop` exposes musical-notation intervals; `Draw` schedules DOM/UI callbacks against AudioContext time; `Sampler`/`Synth` cover click generation; `Recorder` wraps MediaRecorder but does not make MediaRecorder sample-accurate.
- TonalJS has directly relevant `time-signature`, `duration-value`, `note`, `interval`, `chord`, `scale`, and `key` modules. Current repo scope is mostly meter/time-signature and product policy, so F5 should use minimal `@tonaljs/*` modules or write a no-go guardrail, not install all of `tonal` by default.
- wavesurfer.js is already installed and used for playback rendering. Its docs cover pre-decoded peaks, `exportPeaks`, the Record plugin, and Regions playback/looping. That makes it a default candidate for waveform rendering, future A-B loop, and optional capture preview, but not necessarily the owner of product recording metadata or silence policy.
- MDN confirms raw MediaRecorder is still the browser-native capture primitive for microphone recording, and `decodeAudioData` is the native decode path for complete file data. The repo should own these through one adapter/service boundary instead of scattering decode and chunk lifecycle logic.
- `chromatone.center/use/tempo.js` uses Tone `getTransport`, `Loop`, `Sampler`, `getDraw`, and Tonal `Note` for a metronome-like tempo tool. `use/audio.js` centralizes Tone destination/channel/meter/limiter/reverb and creates a MediaStream destination. `use/recorder.js` uses Tone `Recorder`. `use/theory.js` also shows a warning sign: it mixes Tonal `ChordType` with local note-name tables, which is exactly the pattern Pack F must guard against.
- `cwilso/metronome` demonstrates the older Web Audio scheduler pattern: setTimeout/worker looks ahead while AudioContext schedules exact note times. It is useful as historical evidence for why custom scheduling exists, but this repo already depends on Tone.js, so Tone Transport/Loop/Draw should be the preferred modern owner.
- `tambien/Metro.js` is a narrow Web Audio metronome library with notation-like subdivisions and exact timetag callbacks. It reinforces the need for musical-notation intervals and scheduled timetags; in this repo, Tone should provide that primitive rather than importing another scheduler.

## F1 Path-Level Inventory

Candidate decision values are limited to `replace`, `keep-business-logic`, `no-go-with-guardrail`, and `unknown-blocking`. This draft contains no `unknown-blocking` rows.

| Area | Current files | Current custom logic | External primitive checked | Candidate decision | Required stage | Risk | Required tests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tone metronome runtime | `src/infrastructure/audio/tone-metronome-adapter.ts`; `src/services/metronome/browser-metronome-service.ts`; `src/lib/quick-metronome/control.ts`; `src/lib/quick-metronome/use-metronome-transport.ts`; `tests/unit/quick-metronome-metronome-service.test.ts`; `tests/unit/quick-metronome-transport.test.tsx`; `tests/e2e/quick-metronome.spec.ts` | Adapter exposes `scheduleRepeat(seconds)`, `startTransport`, `stopTransport`, `cancelTransport`, and `trigger`; service computes tick interval in ms, manages schedule tokens, clears/reschedules transport, and uses `window.setTimeout` to sync UI ticks. | Tone `Transport`, `Loop`, `Draw`, `Sampler`, `Synth`; Chromatone `use/tempo.js`; `cwilso/metronome`; `tambien/Metro.js`. | replace | F3 | Timing regressions; accent/subdivision behavior could drift; tests may overfit old `scheduleRepeat(seconds)` calls. | `npm run test:unit -- quick-metronome-control.test.ts quick-metronome-transport.test.tsx quick-metronome-metronome-service.test.ts sheet-practice-controls.test.tsx`; `npm run test:e2e -- quick-metronome.spec.ts sheet-practice-controls.spec.ts`; `npm run lint`; `npm run typecheck`. |
| Metronome product policy | `src/lib/quick-metronome/control.ts`; `src/lib/quick-metronome/types.ts`; `src/domain/settings/types.ts`; `src/domain/practice/sheet-metronome-presets.ts`; `src/components/sheet-practice/controls/metronome-settings-panel.tsx`; settings and preset tests | Product-owned allowed BPM, allowed time signatures, subdivisions, accent modes, countdown options, preset serialization, and tap-tempo averaging. | Tonal time-signature/duration-value; Tone notation; Chromatone `use/tempo.js`. | keep-business-logic | F5 | Over-replacing simple policy with library calls could hide product constraints or widen accepted settings accidentally. | `npm run test:unit -- quick-metronome-control.test.ts sheet-metronome-preset-domain.test.ts sheet-metronome-preset-service.test.ts settings-experience.test.tsx`; `npm run lint`; `npm run typecheck`. |
| Meter parser and duration helpers | `src/domain/practice/meter-timing.ts`; `src/domain/practice/measure-grid/index.ts`; `src/lib/quick-metronome/pre-start-countdown.ts`; `tests/unit/measure-grid.test.ts`; `tests/unit/bar-count-in-domain.test.ts`; `tests/unit/pre-start-countdown.test.ts` | `timeSignature.split("/")`, denominator math, beat/measure/tick durations, and derived counts are implemented locally. | `@tonaljs/time-signature`; `@tonaljs/duration-value`; Tone notation conversion; Tonal note/interval modules for future guardrail. | replace | F5 | Tonal may parse broader signatures than product supports; denominator-aware 6/8 and 12/8 behavior must remain exact. | `npm run test:unit -- quick-metronome-control.test.ts meter-timing*.test.ts measure-grid.test.ts pre-start-countdown.test.ts bar-count-in-domain.test.ts`; architecture scan for scattered `timeSignature.split`; `npm run lint`; `npm run typecheck`; `npm run build`. |
| Countdown and bar count-in runtime | `src/lib/quick-metronome/pre-start-countdown.ts`; `src/lib/quick-metronome/bar-count-in-scheduler.ts`; `src/lib/quick-metronome/use-metronome-transport.ts`; `src/domain/practice/bar-count-in.ts`; `src/components/sheet-practice/controls/sheet-practice-controls.tsx`; `tests/unit/pre-start-countdown.test.ts`; `tests/unit/bar-count-in-scheduler.test.ts`; `tests/unit/sheet-practice-controls.test.tsx`; `tests/e2e/sheet-practice-controls.spec.ts` | Pure countdown/count-in plans are mixed with production `setTimeout` schedulers. UI passes `window.setTimeout`/`window.clearTimeout`; visible bar count-in state is tied to the hook orchestration. | Tone `Transport`, `Loop`, `Draw`; Tone time notation; Chromatone `use/tempo.js`; `cwilso/metronome` look-ahead scheduler as historical fallback. | replace | F4 | Behavior could shift for cancellation, stale grid blocking, countdown state, and start-failure rollback. | `npm run test:unit -- pre-start-countdown.test.ts bar-count-in-domain.test.ts bar-count-in-scheduler.test.ts quick-metronome-transport.test.tsx sheet-practice-controls.test.tsx`; `npm run test:e2e -- sheet-practice-controls.spec.ts sheet-segment-recording.spec.ts sheet-viewer.spec.ts`; `npm run lint`; `npm run typecheck`. |
| Quick and sheet recording capture | `src/infrastructure/audio/browser-recording-capture.ts`; `src/services/recording/index.ts`; `src/services/recording/browser.ts`; `src/lib/quick-metronome/recording-service.ts`; `src/lib/quick-metronome/recording-controller.ts`; `src/lib/sheet-practice/recording-service.ts`; recording tests | Raw `MediaRecorder` chunks, MIME selection, `getUserMedia` constraints, track cleanup, Blob-to-dataUrl, decode-on-stop analysis, silence detection, and recording metadata handoff. | Tone `Recorder`; wavesurfer Record plugin; MDN MediaRecorder/getUserMedia; Chromatone `use/audio.js` and `use/recorder.js`. | no-go-with-guardrail | F6 | Tone Recorder/wavesurfer Record do not by themselves preserve current microphone constraints, session rollback, artifact storage, unavailable reasons, or product metadata. Raw MediaRecorder can remain only behind one adapter boundary. | Tone Recorder spike test or documented no-go; `npm run test:unit -- quick-metronome-recording-analysis.test.ts quick-metronome-session.test.ts sheet-practice-recording.test.ts recordings-review-artifact-storage.test.ts`; `npm run test:e2e -- quick-metronome.spec.ts sheet-segment-recording.spec.ts`; architecture test that raw MediaRecorder appears only in approved adapter paths; `npm run lint`; `npm run typecheck`. |
| Decode, analysis, silence, and peaks | `src/infrastructure/audio/browser-recording-capture.ts`; `src/lib/recordings-review/artifact-details.ts`; `src/lib/sheet-practice/recording-service.ts`; `src/lib/recordings-review/waveform-comparison-sources.ts`; `src/infrastructure/reference/local-audio-inspection-adapter.ts`; `tests/unit/recordings-review-history.test.ts`; `tests/unit/recordings-review-waveform-comparison-sources.test.ts`; `tests/unit/sheet-practice-recording.test.ts` | `decodeAudioData` appears in multiple adapters; capture analysis computes peak/rms/zero-crossing/silence; review path re-decodes Blob and derives 48 normalized peaks; sheet save decodes again for trusted peaks. | MDN `decodeAudioData`; wavesurfer pre-decoded peaks and `exportPeaks`; wavesurfer Web Audio advanced docs; wavesurfer Record plugin; no heavy Meyda/Aubio adoption for current simple peaks. | replace | F6 | Centralizing decode could change error mapping or duration warnings; using wavesurfer-generated peaks in services could couple analysis to UI rendering. | `npm run test:unit -- recording*.test.ts recordings-review-artifact*.test.ts recordings-review-history.test.ts recordings-review-waveform-comparison-sources.test.ts sheet-practice-recording.test.ts audio-export*.test.ts`; targeted test for one decode adapter and one peaks service; `npm run lint`; `npm run typecheck`; `npm run build`. |
| Waveform playback and future A-B loop | `src/lib/recordings-review/wavesurfer-adapter.ts`; `src/lib/recordings-review/artifact-review-controller.ts`; `src/lib/recordings-review/waveform-comparison-sources.ts`; `src/components/sheet-practice/reference/reference-panel.tsx`; `src/infrastructure/reference/local-reference-audio-player.ts`; `tests/unit/recording-artifact-review.test.tsx`; `tests/e2e/reference-system.spec.ts` | wavesurfer is used for playback rendering and timeupdate dispatch, while comparison peaks are separately derived. Reference audio uses a custom player path; future A-B loop is still Pack 7 scope. | wavesurfer waveform rendering, pre-decoded peaks, Regions, `region.play(true)`, `region-out` looping, Web Audio advanced docs. | keep-business-logic | F6/F7 | Replacing current simple playback with Regions before the reference feature exists would expand scope. Guardrail must require wavesurfer Regions for future A-B loop instead of custom `timeupdate` boundary detection. | `npm run test:unit -- recording-artifact-review.test.tsx recordings-review-waveform-comparison-sources.test.ts reference-panel.test.tsx reference-service.test.ts`; `npm run test:e2e -- recordings-review.spec.ts reference-system.spec.ts`; architecture guardrail for future reference A-B loop. |
| UI to infrastructure direct imports | `src/components/quick-metronome/quick-metronome-experience.tsx`; `src/components/settings/settings-experience.tsx`; `src/components/sheet-library/sheet-library-experience.tsx`; `src/components/sheet-practice/**`; `src/hooks/use-practice-session-dashboard.ts`; `src/hooks/use-command-palette-continue-targets.ts`; `tests/unit/architecture-boundaries.test.ts` | Components and hooks import browser DB/file/sheet-viewer/reference services and hooks directly. Existing boundary tests block concrete audio adapters and some recordings-review repositories, but not all `src/components/** -> @/infrastructure/**` imports. | Ports/adapters project rule; existing architecture test pattern; Dexie and browser APIs as infrastructure-only primitives. | replace | F7 | Large import churn could hide behavior changes; broad allowlists would make the guardrail toothless. | `npm run test:unit -- architecture-boundaries.test.ts sheet-library-experience.test.tsx sheet-practice-controls.test.tsx sheet-viewer-thumbnails-ui.test.tsx home-dashboard.test.tsx settings-experience.test.tsx`; `rg '@/infrastructure' src/components src/app src/hooks`; `npm run lint`; `npm run typecheck`. |
| Sheet Viewer service and assisted page-turn timer | `src/services/sheet-viewer/service.ts`; `src/infrastructure/sheet-viewer/**`; `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`; `tests/unit/sheet-viewer-service.test.ts`; `tests/unit/sheet-viewer-assisted-page-turning.test.tsx`; `tests/e2e/sheet-viewer.spec.ts` | One service file owns load state, thumbnail cache, object URLs, transform math, page label formatting, and assisted page-turn delay. UI uses `window.setTimeout` for assisted page turn. | Tone countdown executor from F4 for timer ownership; no external primitive for sheet-viewer product transforms; pdfjs/react-pdf remain existing rendering primitives. | replace | F7 | Splitting too aggressively can create new abstractions without reducing risk; assisted page turn must stay manual segment timer and not imply score following. | `npm run test:unit -- sheet-viewer-service.test.ts sheet-viewer-assisted-page-turning.test.tsx sheet-viewer-page-jump.test.tsx sheet-viewer-thumbnails-ui.test.tsx`; `npm run test:e2e -- sheet-viewer.spec.ts`; `npm run lint`; `npm run typecheck`. |
| Mutation error hardening | `src/components/sheet-library/sheet-library-experience.tsx`; `src/components/quick-metronome/quick-metronome-experience.tsx`; `src/components/sheet-practice/controls/sheet-practice-controls.tsx`; practice/session/sheet services and tests | Some UI flows directly call service mutations and rely on local try/catch/finally shapes. Pack F needs consistent catch/finally or Result-returning contracts for import/delete/update/favorite/tags/session/recording rollback paths. | Zod validation remains preferred for data shape; Dexie repositories stay behind services; no third-party library replaces product mutation semantics. | keep-business-logic | F7 | Converting every mutation contract at once can sprawl; missing one path can leave stale loading or optimistic UI state. | Targeted unit tests for import sheet, batch import, delete sheet, update metadata, favorite/tags, session event capture, duration update/end session, recording save/rollback; existing E2E `sheet-library.spec.ts`, `quick-metronome.spec.ts`, `sheet-practice-controls.spec.ts`; `npm run lint`; `npm run typecheck`. |
| Test harness and production event coupling | `src/services/metronome/browser-metronome-service.ts`; `src/components/sheet-practice/controls/sheet-practice-controls.tsx`; `src/lib/recordings-review/wavesurfer-adapter.ts`; tests listening to `METRONOME_TRACE_EVENT`, `sheet-practice-controls:*`, and `recordings-review:*` events | Production code dispatches browser events used by tests and some UI synchronization. Some events are useful diagnostics, but Pack F should isolate test-only protocol from product behavior. | Tone `Draw` for UI sync; existing architecture-boundary test pattern; no library replacement for product diagnostics. | keep-business-logic | F7 | Removing events blindly can break E2E evidence; leaving all events as implicit API lets test harness protocols spread. | `npm run test:unit -- architecture-boundaries.test.ts quick-metronome-transport.test.tsx sheet-practice-controls.test.tsx recording-artifact-review.test.tsx`; `npm run test:e2e -- quick-metronome.spec.ts sheet-practice-controls.spec.ts recordings-review.spec.ts`; documented diagnostics/test-only boundary. |

## Unknown-Blocking Status

No `unknown-blocking` candidate remains in this F1 draft inventory.

This is not an F1 PASS claim. F1 can pass only after external ChatGPT plan review verifies:

- every path-level row has enough source evidence;
- `no-go-with-guardrail` rows are accepted;
- no Pack F known debt is hidden or deferred outside Pack F;
- F2-F7 stage map fully covers the inventory.

## Pack F Stage Map

### F2: Guardrails and Review Template

Debts addressed:

- UI-to-infrastructure import recurrence.
- Future custom Tone/Tonal/wavesurfer/Web Audio primitives without evidence.
- Future note/chord/scale/key/timeSignature/rhythm tables.
- Future production beat/countdown `setTimeout` expansion.

Decisions:

- replace: no direct replacement of runtime code in F2; replace weak review process with executable guardrails.
- keep-business-logic: product settings policy, recording metadata semantics, session semantics.
- no-go-with-guardrail: no broad allowlist; documented exceptions only, with owner and expiration.

Required changes:

- Add `docs/v1/implementation-slices/rules/external-library-first.md`.
- Update PR/agent checklist with `External Primitive Check`.
- Extend `tests/unit/architecture-boundaries.test.ts`:
  - default block `src/components/**` importing `@/infrastructure/**`, with narrow temporary allowlist only if externally reviewed;
  - block new custom music primitive tables outside approved domain/music or policy files;
  - block new production beat/countdown/metronome `setTimeout` schedulers without an exception marker.

### F3: Tone Runtime Alignment

Debts addressed:

- Tone adapter is a low-level wrapper.
- Browser metronome service owns transport cancellation/rescheduling and UI delay math.
- Tone notation, `Loop`, `Draw`, BPM ramp, and click instrument ownership are underused.

Decisions:

- replace: runtime scheduling and UI sync move to a higher-level Tone runtime adapter.
- keep-business-logic: accent mode, tick trace, session event callbacks, settings validation, test harness evidence.
- no-go-with-guardrail: no new non-Tone metronome scheduler unless Tone spike fails and F1 is updated.

Required result:

- `tone-metronome-adapter.ts` exposes `setBpm`, notation interval mapping, `createLoop`, `draw`, `triggerClick`, transport stop/cancel/dispose.
- `BrowserMetronomeService` no longer computes scheduling interval in seconds for Tone or uses `window.setTimeout` to align UI ticks.
- Tests assert Tone notation such as `4n`, `8n`, `8t`, `16n` rather than only raw seconds.

### F4: Countdown Executor Unification

Debts addressed:

- `schedulePreStartCountdown` and `scheduleBarCountIn` are production `setTimeout` schedulers.
- `use-metronome-transport.ts` passes `window.setTimeout` directly.
- Assisted page-turn timer needs naming and ownership alignment.

Decisions:

- replace: production countdown/bar-count-in execution moves behind a countdown executor that can use Tone runtime primitives.
- keep-business-logic: pure countdown plans, bar count-in plan labels, stale segment-grid blocking, visible countdown state.
- no-go-with-guardrail: fake/timeout executor allowed only for tests or documented non-audio UI delays.

Required result:

- Pure plan code stays deterministic.
- Production beat/countdown scheduling flows through a runtime executor.
- Assisted page turn is either explicitly a manual segment timer in F7 or routed through the same executor.

### F5: TonalJS and Music-Domain Policy

Debts addressed:

- `timeSignature.split("/")` and local meter helpers are scattered.
- Time signature and subdivision policy are not separated from primitive parsing/duration logic.
- Future note/interval/chord/scale/key primitive tables have no guardrail.

Decisions:

- replace: parser/duration primitive should move through `src/domain/music/**` facade using minimal `@tonaljs/time-signature` and `@tonaljs/duration-value` if the spike preserves current semantics.
- keep-business-logic: allowed time signatures, allowed subdivisions, accent behavior, countdown options, BPM policy.
- no-go-with-guardrail: if Tonal duration/time-signature cannot exactly preserve current simple-meter constraints, keep local helper only inside `src/domain/music/**` with architecture scan preventing more scattered parsing.

Required result:

- No direct `timeSignature.split("/")` outside approved facade/helper.
- No new note/chord/scale/key/interval table outside approved policy/facade.
- F5 package decision must prefer minimal `@tonaljs/*`, not full `tonal`, unless bundle evidence supports full package.

### F6: Recording, Waveform, Decode, and Analysis Alignment

Debts addressed:

- Raw MediaRecorder lifecycle is mixed with analysis and data URL generation.
- Capture and review paths duplicate `decodeAudioData`.
- Peaks and silence detection are not owned by one service boundary.
- wavesurfer is used for rendering but not evaluated as a peak/record/regions owner.

Decisions:

- replace: duplicated decode/analysis/peaks logic with one `audio-analysis` service plus browser decode adapter.
- keep-business-logic: recording metadata, artifact storage refs, unavailable reason mapping, rollback semantics, silence policy thresholds where still product-owned.
- no-go-with-guardrail: do not replace the whole capture contract with Tone Recorder or wavesurfer Record unless the stage spike proves it preserves permissions, constraints, metadata, analysis, storage, and rollback. If no-go stands, raw MediaRecorder remains only in the approved capture adapter.

Required result:

- One decode adapter for `decodeAudioData`.
- One peaks service.
- One silence/analysis service.
- Capture result should not require `dataUrl` if all production storage is Blob/artifactRef.
- wavesurfer `exportPeaks` and pre-decoded peaks are evaluated for rendering/review, but service analysis must not depend on a UI-only waveform instance unless F6 explicitly proves that boundary.

### F7: Boundary Hardening, Viewer Split, Mutation Hardening, and Closeout

Debts addressed:

- Components/hooks import infrastructure browser singletons directly.
- Sheet Viewer service is a mixed responsibility module.
- Assisted page turn semantics are ambiguous.
- Mutation error handling is inconsistent across library, quick, practice session, and recording save paths.
- Test harness browser event protocols leak into production surfaces.
- Final Pack F source scan is required.

Decisions:

- replace: component infrastructure imports with service/hook/composition boundaries; split sheet-viewer leaf modules; move assisted timer to explicit manual timer or executor.
- keep-business-logic: sheet load errors, thumbnail cache semantics, transform math behavior, mutation product semantics, diagnostics that are product-useful.
- no-go-with-guardrail: reference-synced page turn and automatic score following remain out of v1 Pack F unless separately scheduled; A-B loop future work must use wavesurfer Regions rather than custom boundary polling.

Required result:

- `tests/unit/architecture-boundaries.test.ts` default-blocks `src/components/** -> @/infrastructure/**`.
- `src/services/sheet-viewer/service.ts` becomes an orchestrator over smaller leaf modules or otherwise shrinks to clear ownership.
- Assisted page turn is named and documented as manual segment timer if retained.
- Final scan classifies every hit as resolved, approved exception with reason, or blocking.

## Review Gate for This F1 PR

External ChatGPT review must fail this plan if any of the following are true:

- It only scans local repo code and not external primitives.
- It gives generic recommendations without path-level inventory.
- It does not distinguish business policy from replaceable library/runtime primitives.
- It accepts `no-go-with-guardrail` without evidence and a future guardrail.
- It leaves any `unknown-blocking` row.
- It lets any known Pack F debt escape to a later pack.
- It marks F1 PASS before reviewer explicitly accepts the inventory.

## Coding Handoff Rules After F1

- Start only F2 after F1 external plan review passes.
- One stage PR at a time.
- Every Pack F coding PR must include:

```markdown
## Pack F Checklist

- Stage:
- Problems from F1 addressed:
- External primitives checked:
- Decision: replace / keep-business-logic / no-go-with-guardrail
- Production LOC before/after:
- Tests added/updated:
- Guardrail added:
- Remaining known issues in this stage:
```

- `Remaining known issues in this stage` must be `none` or `blocking; Pack F cannot be verified`.
- New audio/music/timing/recording/waveform primitive not listed in F1 must return to F1 inventory before implementation proceeds.

## Status Evidence

`docs/v1/status.json` records Pack F without advancing any coding stage:

- Adds `pack-f-audio-music-library-alignment` so Pack F is visible in the v1 source-of-truth status ledger.
- Sets the Pack F pack status to `planning_in_progress`, reflecting that only the F1 plan/review gate is active.
- Adds `F1-library-first-rescan-plan` as `planning_in_progress` with its `plan` pointer set to this file.
- Keeps F2-F7 as `not_started`; no Pack F implementation slice is marked planning-ready, coding-ready, or complete.
- Leaves existing pack statuses unchanged.

## Plan-PR Verification

For this F1 plan-only PR, do not run broad product test suites as proof of quality. Required verification is:

```text
git diff --check
node or PowerShell JSON parse for docs/v1/status.json
```

If JSON is not changed, JSON parse can be skipped. Since this PR updates `docs/v1/status.json`, JSON parse is required.
