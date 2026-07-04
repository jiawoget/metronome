# F7 UI Boundary, Sheet Viewer, Mutation Hardening, and Pack F Closeout Plan

## Planning Status

Status: `planning_in_progress`

Planning branch: `codex/pack-f-f7-boundary-closeout-plan`

Scope type: Pack F plan-only stage for UI/infrastructure boundary hardening,
Sheet Viewer split, mutation hardening, test harness boundary cleanup, and final
Pack F closeout scans.

Implementation tier: high-risk UI, persistence, timing, recording, and
architecture-boundary closeout work. Future coding PRs should use `gpt-5.5`
extra-high planning/review judgment, standard speed, and no fast-path
assumptions.

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
- `F6-recording-waveform-analysis-alignment` remains `implementation_done`.
- `F7-boundary-hardening-viewer-closeout` moves from `not_started` to
  `planning_in_progress` and points to this plan file.

No Pack F or F7 verification status is claimed by this plan.

Expected Pack F status excerpt after this plan PR:

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
      "status": "implementation_done",
      "plan": "docs/v1/implementation-slices/plans/F6-recording-waveform-analysis-alignment.md"
    },
    {
      "slice": "F7-boundary-hardening-viewer-closeout",
      "status": "planning_in_progress",
      "plan": "docs/v1/implementation-slices/plans/F7-boundary-hardening-viewer-closeout.md"
    }
  ]
}
```

Status handling for future F7 implementation PRs:

- After this plan receives the external plan-review gate and is merged, the
  first coding PR may move F7 to `coding_in_progress`.
- Intermediate F7 coding PRs should keep F7 `coding_in_progress`, keep the same
  plan pointer, and document which F7 substage they cover in the PR body.
- The final F7 closeout coding PR may move F7 to `implementation_done` only
  after all F7 substage code, final scans, and local verification pass.
- Pack F and F7 must not move to `verified` until all F2-F7 work has passed the
  review/verification pipeline and the final Pack F scan has no blocking hits.

## Required Reads

Completed for this plan:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md`
- `docs/v1/implementation-slices/rules/external-library-first.md`
- `D:\Downloads\pack-f-audio-music-library-alignment-plan.md`, used only as
  original seed/history. Repo-local F0 and `status.json` remain source of truth.
- `docs/v1/implementation-slices/plans/F3-tone-runtime-metronome-alignment.md`
- `docs/v1/implementation-slices/plans/F4-countdown-executor-unification.md`
- `docs/v1/implementation-slices/plans/F5-tonaljs-music-domain-policy.md`
- `docs/v1/implementation-slices/plans/F6-recording-waveform-analysis-alignment.md`
- `package.json`
- `tests/unit/architecture-boundaries.test.ts`
- `src/services/sheet-viewer/service.ts`
- `src/services/sheet-viewer/types.ts`
- `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts`
- `src/infrastructure/sheet-viewer/browser-sheet-viewer-service.ts`
- `src/infrastructure/sheet-viewer/use-browser-sheet-viewer-object-urls.ts`
- `src/infrastructure/sheet-viewer/use-browser-sheet-viewer-page-thumbnails.ts`
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx`
- `tests/unit/sheet-viewer-service.test.ts`
- `tests/unit/sheet-viewer-assisted-page-turning.test.tsx`
- `tests/unit/sheet-viewer-page-jump.test.tsx`
- `tests/unit/sheet-viewer-thumbnails-ui.test.tsx`
- `tests/e2e/sheet-viewer.spec.ts`
- `src/components/sheet-library/sheet-library-experience.tsx`
- `src/services/sheet-library/types.ts`
- `src/services/sheet-library/service.ts`
- `src/components/quick-metronome/quick-metronome-experience.tsx`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/services/practice-session/types.ts`
- `src/services/practice-session/service.ts`
- `src/lib/quick-metronome/recording-controller.ts`
- `src/lib/sheet-practice/recording-service.ts`
- `src/hooks/use-practice-session-dashboard.ts`
- `src/hooks/use-command-palette-continue-targets.ts`

Focused scans used:

```text
rg -n "@/infrastructure" src/components src/app src/hooks
rg -n "timeSignature\.split|noteNames|chord|scale|interval|setTimeout|decodeAudioData|MediaRecorder" src
rg -n "eslint-disable|@ts-ignore|@ts-expect-error|TODO|FIXME" src tests
rg -n "window\.|dispatchEvent|CustomEvent|__|TEST|test harness|harness|globalThis|setTimeout|addEventListener" src/components src/services src/lib tests/e2e
rg -n "async function handle(FileChange|Save|BatchImport|Delete|saveMetadataEdit|toggleFavorite|saveTags)|await browserSheetLibraryService|set(ImportState|DeletingId|FavoriteUpdatingId|TagSavingId)|try \{|catch|finally" src/components/sheet-library/sheet-library-experience.tsx
rg -n "ensureQuickSession|ensureSheetSession|captureSessionEvent|updatePracticeSessionDuration|updateSheetSessionDuration|endPracticeSession|try \{|catch|finally" src/components/quick-metronome/quick-metronome-experience.tsx src/components/sheet-practice/controls/sheet-practice-controls.tsx
```

## Current F7 Debt Inventory

| Area | Current path-level evidence | Current debt | Required F7 direction |
| --- | --- | --- | --- |
| Architecture test scope | `tests/unit/architecture-boundaries.test.ts` default-blocks UI infrastructure imports only under `src/components`; `src/app` and `src/hooks` are not part of that check. | Hooks can keep or add `@/infrastructure/**` imports while the architecture test still passes. | Expand the default boundary scan to `src/components`, `src/app`, and `src/hooks`, with no broad allowlist. |
| Components/hooks importing infrastructure | Current scan found direct imports in `src/components/settings/settings-experience.tsx`, `src/components/sheet-library/sheet-library-experience.tsx`, `src/components/quick-metronome/quick-metronome-experience.tsx`, `src/components/sheet-practice/controls/sheet-practice-controls.tsx`, `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`, `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`, `src/components/sheet-practice/reference/reference-panel.tsx`, `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`, `src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx`, `src/hooks/use-practice-session-dashboard.ts`, and `src/hooks/use-command-palette-continue-targets.ts`. | Browser DB/file/reference/sheet-viewer singletons are composed directly in UI-facing files. Existing allowlist entries expire at F7. | Move composition to service/browser or feature hook boundaries that are not `src/components/**`; UI should receive services by props or import from `src/services/**`, `src/lib/**`, or local feature hooks that do not expose infrastructure paths. |
| Sheet Viewer service responsibilities | `src/services/sheet-viewer/service.ts` owns load state, thumbnail cache, object URL creation/revocation, transform math, assisted-page-turn delay, and page label formatting. | One service file mixes orchestration with leaf primitives, which makes future viewer changes and boundary tests harder to reason about. | Keep public exports compatible, but move leaf logic into small modules such as `transform.ts`, `thumbnails.ts`, `manual-page-turn-timer.ts`, and `format.ts`; keep `service.ts` as the orchestrator. |
| Sheet Viewer browser hooks | `src/infrastructure/sheet-viewer/use-browser-sheet-viewer-object-urls.ts` and `src/infrastructure/sheet-viewer/use-browser-sheet-viewer-page-thumbnails.ts` are React hooks under infrastructure and are imported by viewer components. | The import direction makes UI depend on infrastructure even when the hook logic is UI/resource lifecycle orchestration. | Move or wrap these hooks behind `src/components/sheet-practice/viewer/*` or `src/services/sheet-viewer/browser-hooks.ts` without importing `@/infrastructure/**` from components. The browser singleton may remain in an infrastructure composition file. |
| Sheet Viewer E2E service global | `src/infrastructure/sheet-viewer/browser-sheet-viewer-service.ts` writes `window.__metronomeSheetViewerService` under `NEXT_PUBLIC_METRONOME_E2E`; `tests/e2e/sheet-viewer.spec.ts` reads it for thumbnail service checks. | This is useful test access, but it is an implicit product-global surface. | Move to a documented diagnostics/test adapter boundary or keep a narrow E2E-only exception with owner, name, and removal condition. |
| Assisted page turn semantics | `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx` names the feature "Assisted page turning", stores `referencePlaybackTimestampMs`, and uses `window.setTimeout` based on `getSheetViewerAssistedPageTurnDelayMs`; `tests/e2e/sheet-viewer.spec.ts` monkey-patches `window.setTimeout` through `__metronomeAssistedPageTurnTimer`. | The runtime behavior is a manually armed segment-duration timer, not reference-synced page turning or score following. The current naming and test harness can imply stronger semantics. | Rename or isolate the behavior as a manual segment page-turn timer. Retain a browser timer only as an approved manual UI timer if the coding PR documents why Tone countdown executor/reference timestamps are not involved. |
| Reference timestamp coupling | `SheetViewerReady` passes `setReferencePlaybackTimestampMs` to `ReferencePanel`, then forwards the value to `SheetPracticeControls` as `currentMeasureGridTimestampMs`. The assisted page-turn delay does not use reference playback timestamps. | Nearby reference timestamp wiring can be mistaken as assisted-page-turn synchronization. | Keep timestamp wiring only for measure-grid calibration context. F7 must not add reference-synced page-turn logic. |
| Sheet Library mutation hardening | In `src/components/sheet-library/sheet-library-experience.tsx`, `handleSave`, `handleBatchImport`, `handleDelete`, `saveMetadataEdit`, `toggleFavorite`, and `saveTags` await browser service calls. Some paths rely on `Result` values; several paths have no catch/finally around unexpected service/repository throws. | A thrown mutation can leave `importState`, `deletingId`, `favoriteUpdatingId`, or `tagSavingId` stuck and fail to show an error. | Either make service mutations consistently return `ok: false` for expected repository/import failures or add UI try/catch/finally. Prefer the smaller contract per method; do not convert the whole app to a new Result framework. |
| Sheet Library service contracts | `src/services/sheet-library/types.ts` returns `Result` for import/update/favorite/tags but `deleteSheet`, `updateLastPracticedAt`, `getArtifact`, and `clear` still throw through repository failures. `src/services/sheet-library/service.ts` catches per-file batch import failures but not every caller-level storage failure. | Result-returning and throw-through methods coexist without a documented mutation contract. | Document and test the boundary: Result-returning mutations should catch expected validation/import/repository failures; throw-through utility methods require UI catch/finally where called. |
| Quick Metronome session mutation hardening | `src/components/quick-metronome/quick-metronome-experience.tsx` catches recording start/stop, but `handleStopped` awaits `captureSessionEvent`, duration update, or end-session calls without a local failure fallback. `captureSessionEvent` currently swallows event-sink failure in the service, but duration/end can still throw. | Stop flows can lose UI recovery if session duration/end write fails. | Add targeted failure handling around stop/duration/end session calls so playback/recording UI state and user message still settle. Do not change recording rollback semantics already owned by `quickRecordingController`. |
| Sheet Practice session mutation hardening | `src/components/sheet-practice/controls/sheet-practice-controls.tsx` has strong start/recording try/finally paths, but stop and harness duration-update paths still await or chain session duration/event calls with limited UI failure handling. | Session event/duration failure can leave stale messages or unhandled rejections in stop/harness paths. | Harden stop and harness paths with narrow try/catch/finally or a small session-mutation helper. Preserve existing recording rollback and Record Again behavior. |
| Recording save and rollback | `src/lib/quick-metronome/recording-controller.ts` and `src/lib/sheet-practice/recording-service.ts` already implement body-first save and rollback cleanup. F6 added shared audio-analysis boundaries. | F7 should verify these remain covered while hardening callers; it should not rewrite rollback unless tests expose a concrete gap. | Add only targeted tests for save failure UI state and rollback preservation. Do not broaden into a recording architecture rewrite. |
| Test harness globals/events | Current production code dispatches or reads `quick-metronome:scheduled-tick`, `sheet-practice-controls:*`, `recordings-review:*`, `reference-audio:state-change`, `active-recording-navigation:*`, and E2E globals such as `__sheetPracticeControlsTestHarness`, `__sheetPracticeControlsBarCountIn`, and `__metronomeSheetViewerService`. | Some are product diagnostics, some are E2E controls, and some are implicit test APIs. The boundary is not documented in one place. | Centralize names/types or document a narrow diagnostics/test-only boundary. Product code should not grow new ad hoc globals/events outside that boundary. |
| Final scan escape hatches | Current escape-hatch scan found only two `eslint-disable-next-line @next/next/no-img-element` comments in Sheet Viewer image rendering/thumbnail UI. Current primitive scan also finds approved or false-positive terms such as `scale` fields, tap-tempo `interval`, approved `MediaRecorder`, approved `decodeAudioData`, and non-audio timers. | Pack F closeout needs classification, not a naive zero-hit requirement for broad terms like `scale`. | Final F7 closeout must classify every scan hit as resolved, approved exception with reason, or blocking. No unclassified hit can remain when Pack F is marked verified. |

## External Primitive Check And Boundary Decisions

| Primitive or boundary | Evidence checked | F7 decision | What repo code still owns |
| --- | --- | --- | --- |
| pdfjs/react-pdf | `package.json` has `pdfjs-dist` and `react-pdf`; `src/infrastructure/files/sheet-import-adapter.ts`, `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts`, and `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx` already use local `pdfjs-dist/build/pdf.worker.min.mjs`; architecture tests block CDN and legacy imports. | `keep-business-logic`. No package install and no viewer renderer rewrite. | Browser adapter owns PDF/image inspection and thumbnails; React viewer owns rendering. Service owns product load/error orchestration. |
| Dexie and Zod | `package.json` has `dexie` and `zod`; Dexie imports are infrastructure repository/service composition; Zod imports are domain/service validation. | `keep-business-logic` plus boundary hardening. Do not replace Dexie/Zod or move them into UI. | Repositories/adapters own Dexie; domain/services own validation; UI consumes services and Result/error states. |
| wavesurfer Regions for future A-B loop | F0/F6 record wavesurfer Regions as the future A-B loop primitive. Current F7 scope has no A-B loop implementation. | `no-go-with-guardrail` for F7 implementation. Do not implement A-B loop or custom boundary polling. Future A-B loop must use wavesurfer Regions unless a later reviewed spike records a no-go. | Reference product semantics remain in Pack 7/reference scope. F7 only documents the guardrail. |
| Tone countdown executor and assisted manual timer | F4 moved countdown/count-in execution to Tone-backed executor and explicitly deferred assisted page turn as a manually armed segment timer. | `keep-business-logic` for manual page-turn timer. Do not route it through Tone unless a future plan changes the product semantics. | Viewer owns a manual timer for a selected segment duration; Tone executor owns musical countdown/count-in. |
| Browser timers | Current guardrail blocks beat/countdown/metronome timers and has an F7-expiring exception for non-audio session hydration. Current viewer manual timer uses `window.setTimeout`. | `keep with narrow exception` only for non-audio UI delays and manual segment page-turn timer. | F7 must name each remaining browser timer reason, owner, and closeout condition. No audio/countdown scheduler may use browser timers. |
| Browser window events/globals | Existing E2E and diagnostics use several event names and `__*` globals. | `keep with documented diagnostics/test boundary`; remove or centralize only where it reduces spread without weakening E2E. | Product diagnostics and E2E adapters own event/global names. Business services should not learn test-only globals. |

## Recommended F7 Substage Split

F7 should be 3 small implementation PRs. Every sub-PR remains inside Pack F and
must pass the same plan/review/verification pipeline before merge. Do not stack
or merge a later F7 substage before the previous one is merged.

### F7-1: Sheet Viewer Boundary, Leaf Modules, and Manual Timer

Scope:

- Move `src/services/sheet-viewer/service.ts` leaf logic into small modules:
  `transform.ts`, `thumbnails.ts`, `manual-page-turn-timer.ts`, and `format.ts`
  or equivalent minimal names.
- Keep `src/services/sheet-viewer/index.ts` and existing public exports
  compatible for current callers/tests.
- Move/wrap Sheet Viewer React resource hooks so
  `src/components/sheet-practice/viewer/**` no longer imports
  `@/infrastructure/sheet-viewer/**`.
- Rename or document assisted page turn as a manual segment page-turn timer.
- Remove or replace viewer-specific F7 infrastructure allowlist entries in
  `tests/unit/architecture-boundaries.test.ts`.
- Keep pdfjs/react-pdf usage unchanged and local-worker guardrails intact.

Acceptance criteria:

- Sheet Viewer UI behavior, thumbnails, page jump, zoom/pan, reload, and error
  states stay unchanged.
- Assisted page turn remains disabled by default, requires a selected segment,
  advances exactly one page after the manually armed segment timer, and cancels
  on page jump, disable, segment change, or unmount.
- No reference playback timestamp or reference-synced semantics are introduced.
- No A-B loop, Regions implementation, automatic score following, or custom
  boundary polling is added.
- Viewer components have no `@/infrastructure/**` imports.

### F7-2: Non-Viewer UI/Hook Infrastructure Boundary

Scope:

- Remove remaining direct `@/infrastructure/**` imports from:
  `src/components/settings/**`, `src/components/sheet-library/**`,
  `src/components/quick-metronome/**`,
  `src/components/sheet-practice/controls/**`,
  `src/components/sheet-practice/measure-grid/**`,
  `src/components/sheet-practice/segments/**`,
  `src/components/sheet-practice/reference/**`, and `src/hooks/**`.
- Expand `tests/unit/architecture-boundaries.test.ts` to scan
  `src/components`, `src/app`, and `src/hooks`.
- Use existing service/browser composition patterns where possible. Prefer
  passing services through props or importing browser-facing service modules
  from `src/services/**`/`src/lib/**` over creating a new dependency-injection
  framework.
- Document any approved exception with reason, owner, and removal condition.

Acceptance criteria:

- `rg -n "@/infrastructure" src/components src/app src/hooks` returns no hits,
  or only explicitly approved F7 closeout exceptions with narrow reasons.
- Existing unit tests for settings, sheet library, quick metronome, sheet
  practice controls, measure-grid calibration, practice segment selector,
  reference panel, dashboard hooks, and command palette continue targets pass.
- The architecture test fails if a component/app/hook adds a new infrastructure
  import.
- No product behavior, persistence schema, or UI layout rewrite is mixed into
  the boundary move.

### F7-3: Mutation Hardening, Test Harness Boundary, and Final Closeout

Scope:

- Harden mutation failure handling for:
  import sheet, batch import, delete sheet, update metadata, favorite/tags,
  session event capture, duration update/end session, and recording
  save/rollback caller states.
- Define the Result-returning versus UI try/catch/finally contract in service
  docs or tests:
  - Result-returning mutations catch expected validation/import/repository
    failures and return `{ ok: false, message }`.
  - Throw-through methods are allowed only when every UI caller catches and
    resets transient state in `finally`.
- Keep `captureSessionEvent` best-effort unless a coding PR proves a product
  need to surface event-write failures.
- Centralize or document the diagnostics/test harness boundary for production
  window events and globals.
- Run final Pack F scans and classify every hit.
- Move F7 to `implementation_done` only if this substage is the final closeout
  and all acceptance criteria pass. Pack F remains `implementation_in_progress`
  until independent review/verification marks it verified.

Acceptance criteria:

- A thrown sheet import/delete/update/favorite/tags service call leaves no
  stuck loading/deleting/saving state and shows a user-facing error.
- Quick Metronome and Sheet Practice stop/session-duration failure paths settle
  UI state and avoid unhandled promise rejections.
- Recording save/rollback tests still prove artifact/session cleanup behavior.
- Test-only globals/events are either behind a named adapter/documented boundary
  or explicitly approved as diagnostics with reason.
- Final source scans classify every hit as resolved, approved exception, or
  blocking.

If any F7 substage would exceed roughly 500 production LOC, split that substage
again before coding instead of making one broad PR.

## No-Go And Out Of Scope

- No production code, tests, package manifests, lockfiles, dependency files, or
  installed package changes in this plan PR.
- No package installs in F7 plan or coding PRs unless a later reviewed plan
  update explicitly requires one. Current dependencies already include
  pdfjs/react-pdf, Dexie, Zod, Tone, wavesurfer, and TonalJS.
- No Sheet Viewer UI rewrite, new viewer feature, route redesign, or large visual
  restyle.
- No reference-synced page turning, automatic score following, automatic PDF
  recognition, automatic mistake detection, or user-facing scoring.
- No A-B loop or Regions implementation in F7. Future A-B loop must use
  wavesurfer Regions unless separately reviewed.
- No custom boundary polling for reference loops.
- No broad app-wide Result framework or dependency-injection framework.
- No migration or persisted schema change unless a mutation-hardening test proves
  it is required.
- No weakening negative tests, architecture guardrails, or final scan
  requirements to make the closeout pass.

## Future Coding PR Verification Commands

### F7-1 Sheet Viewer Substage

Run from repo root after implementation:

```powershell
git diff --check
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-viewer-service.test.ts tests/unit/sheet-viewer-assisted-page-turning.test.tsx tests/unit/sheet-viewer-page-jump.test.tsx tests/unit/sheet-viewer-thumbnails-ui.test.tsx tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-viewer.spec.ts
& .\scripts\npm-local.ps1 --% run lint -- src/services/sheet-viewer src/infrastructure/sheet-viewer src/components/sheet-practice/viewer tests/unit/sheet-viewer-service.test.ts tests/unit/sheet-viewer-assisted-page-turning.test.tsx tests/unit/sheet-viewer-page-jump.test.tsx tests/unit/sheet-viewer-thumbnails-ui.test.tsx tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
```

Also record:

```powershell
rg -n "@/infrastructure" src/components/sheet-practice/viewer src/components/sheet-practice/viewer/*.tsx
rg -n "Assisted page turning|manual segment|referencePlaybackTimestampMs|setTimeout" src/components/sheet-practice/viewer src/services/sheet-viewer tests/unit tests/e2e/sheet-viewer.spec.ts
```

### F7-2 Boundary Substage

Run from repo root after implementation:

```powershell
git diff --check
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts tests/unit/sheet-library-experience.test.tsx tests/unit/quick-metronome-session.test.ts tests/unit/sheet-practice-controls.test.tsx tests/unit/measure-grid-calibration.test.tsx tests/unit/practice-segment-selector.test.tsx tests/unit/reference-panel.test.tsx tests/unit/continue-practice-targets.test.ts
& .\scripts\npm-local.ps1 --% run lint -- src/components/settings src/components/sheet-library src/components/quick-metronome src/components/sheet-practice src/hooks src/services tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
```

Also record:

```powershell
rg -n "@/infrastructure" src/components src/app src/hooks
```

If app/hook boundary moves affect home dashboard behavior, include the existing
home/dashboard unit tests selected by the coding agent.

### F7-3 Mutation, Harness, and Final Closeout Substage

Run from repo root after implementation:

```powershell
git diff --check
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts tests/unit/sheet-library-experience.test.tsx tests/unit/sheet-library-service.test.ts tests/unit/quick-metronome-session.test.ts tests/unit/sheet-practice-controls.test.tsx tests/unit/sheet-practice-recording.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts tests/unit/recordings-review-artifact-storage.test.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-library.spec.ts tests/e2e/quick-metronome.spec.ts tests/e2e/sheet-practice-controls.spec.ts tests/e2e/sheet-segment-recording.spec.ts tests/e2e/sheet-viewer.spec.ts tests/e2e/recordings-review.spec.ts
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:e2e
& .\scripts\npm-local.ps1 --% run smoke
```

The final F7 substage must also run and attach classification for:

```powershell
rg -n "@/infrastructure" src/components src/app src/hooks
rg -n "timeSignature\.split|noteNames|chord|scale|interval|setTimeout|decodeAudioData|MediaRecorder" src
rg -n "eslint-disable|@ts-ignore|@ts-expect-error|TODO|FIXME" src tests
```

Classification values:

- `resolved`: no action needed because the hit is removed or moved behind the
  approved owner.
- `approved exception`: hit remains with a reason, owner, and closeout
  condition.
- `blocking`: Pack F cannot be verified until fixed or reviewed into an
  approved exception.

If `test:e2e` or `smoke` cannot run because of local environment state, the
final F7 PR must record the blocker and cannot be treated as Pack F verified
without an owner-approved equivalent gate.

## Plan PR Verification Evidence

Required for this plan/status-only PR:

```powershell
git diff --check
Get-Content docs\v1\status.json -Raw | ConvertFrom-Json | Out-Null; Write-Output 'docs/v1/status.json parsed OK'
git diff --cached --check
```

Recorded evidence for this plan PR:

- `git diff --check`: PASS. The command returned exit code `0`; it printed
  only Git line-ending warnings for `docs/v1/status.json`.
- `Get-Content docs\v1\status.json -Raw | ConvertFrom-Json | Out-Null; Write-Output 'docs/v1/status.json parsed OK'`: PASS, output
  `docs/v1/status.json parsed OK`.
- `git diff --cached --check`: PASS after staging. The command returned exit
  code `0` and printed no output.

Product tests are intentionally not required for this plan/status-only PR.

## Risks And Rollback

Risks:

- Boundary moves can turn into a broad rewrite. Mitigate by keeping each F7
  substage small and moving composition without changing product behavior.
- Architecture allowlists can become permanent. Mitigate by requiring reason,
  owner, and closeout condition for every exception and removing stale entries.
- Sheet Viewer split can create abstraction churn without reducing ownership
  confusion. Mitigate by moving only leaf helpers and keeping public exports
  compatible.
- Assisted page-turn naming can imply score following. Mitigate by naming it as
  a manual segment timer and forbidding reference-synced semantics in F7.
- Mutation hardening can accidentally swallow real rollback failures. Mitigate
  by preserving existing recording rollback tests and surfacing save failures
  clearly.
- Test harness cleanup can break E2E evidence. Mitigate by centralizing or
  documenting test adapters before removing any event/global behavior.
- Final closeout scans include false positives such as `scale` fields and tap
  tempo `interval` variables. Mitigate by requiring classification instead of
  naive zero-hit assertions for broad terms.

Rollback:

- If F7-1 viewer split regresses rendering or timers, revert only the leaf-module
  move and restore the previous public exports; no data migration is involved.
- If F7-2 boundary moves create import cycles, revert the affected composition
  move and keep the F7 allowlist entry marked blocking rather than broadening the
  exception silently.
- If F7-3 mutation hardening changes save/rollback semantics, revert the caller
  hardening and preserve the existing controller/service rollback behavior until
  a narrower patch is planned.
- If final full verification fails, do not mark F7 or Pack F verified. Record
  the failing command and keep the slice in implementation/review state.

## Handoff Instructions For First Coding Agent

Start with F7-1 only.

Read only these files first:

```text
docs/v1/START-HERE.md
docs/v1/status.json
docs/v1/implementation-slices/plans/F7-boundary-hardening-viewer-closeout.md
docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md
docs/v1/implementation-slices/rules/external-library-first.md
tests/unit/architecture-boundaries.test.ts
src/services/sheet-viewer/service.ts
src/services/sheet-viewer/types.ts
src/services/sheet-viewer/index.ts
src/infrastructure/sheet-viewer/browser-sheet-viewer-service.ts
src/infrastructure/sheet-viewer/use-browser-sheet-viewer-object-urls.ts
src/infrastructure/sheet-viewer/use-browser-sheet-viewer-page-thumbnails.ts
src/components/sheet-practice/viewer/sheet-viewer-experience.tsx
src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx
tests/unit/sheet-viewer-service.test.ts
tests/unit/sheet-viewer-assisted-page-turning.test.tsx
tests/unit/sheet-viewer-page-jump.test.tsx
tests/unit/sheet-viewer-thumbnails-ui.test.tsx
tests/e2e/sheet-viewer.spec.ts
```

Then:

1. Implement only the Sheet Viewer boundary/split/manual-timer substage.
2. Preserve public exports and avoid UI rewrite.
3. Keep pdfjs/react-pdf usage unchanged.
4. Do not touch non-viewer boundary imports, mutation hardening, recording
   rollback, test harness cleanup outside viewer, or final Pack F verification.
5. Do not advance `docs/v1/status.json` beyond the lifecycle state requested for
   the coding PR.
