# P1 Preflight Architecture And State Boundaries Plan

## Slice

- Slice id: P1-preflight `architecture-state-boundaries`
- Triggering issues:
  - #5 Ports & Adapters boundary gap before recording work grows coupling.
  - #6 Zustand missing despite approved stack and growing cross-component state.
- Related Pack 1 slices: P1-08 through P1-11
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier recommendation: Tier D
- Status: planning artifact only; do not mark verified from this plan

## Goal

Add the smallest architecture and state preflight needed before segment recording and rerecord workflow work expands the current coupling. This is not a rewrite of audio, recording, or Sheet Practice. It is a boundary-hardening slice so P1-09 and P1-11 can add real recording behavior without letting UI components directly construct browser audio/recording classes or scatter segment recording workflow state across several components.

P1-08 already has a focused metadata plan and can remain schema-only. The risk begins when P1-09 captures active segment context at recording start and P1-11 repeats recording for the same segment. Without this preflight, those slices are likely to add more dependencies to `SheetPracticeControls`, duplicate local state, and deepen `src/lib` as an unplanned service/infrastructure layer.

## Deferred

Issue #4, Quick Metronome count-in/meter, remains deferred. It is not a P1 Practice Segment blocker and should not be included in this preflight. Existing count-in and meter behavior may be protected by regression tests, but no new count-in, meter, Quick Metronome UX, or metronome feature work belongs here.

## Current Boundary Observations

- `package.json` does not include `zustand`, even though `docs/v0/tech-stack-decisions.md` approves Zustand for shared client state.
- `src/stores/README.md` currently only reserves the boundary for future Zustand state.
- `src/components/quick-metronome/quick-metronome-experience.tsx` constructs `new BrowserMetronomeService()` and `new BrowserRecordingService()` directly.
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx` has test-friendly factory props, but its default factories still construct `BrowserMetronomeService` and `BrowserSheetRecordingService` inside the UI component file.
- `src/components/sheet-practice/controls/types.ts` types those props against concrete browser classes instead of service interfaces.
- `src/lib/quick-metronome/metronome-service.ts` contains both the business-facing metronome service and the dynamic Tone adapter factory.
- `src/lib/quick-metronome/recording-service.ts` contains both the business-facing recording capture service and direct `MediaRecorder`, `navigator.mediaDevices`, `FileReader`, and `AudioContext` usage.
- `src/lib/sheet-practice/recording-service.ts` composes sheet recording save behavior and currently defaults its capture dependency with `new BrowserRecordingService()`.
- Existing tests already cover metronome transport, Tone adapter behavior, sheet recording save/rollback, Sheet Practice controls failure handling, Quick Metronome E2E, and Sheet Practice recording E2E. The preflight should preserve those behaviors.

## Scope

### Minimal Ports & Adapters Slice

Create stable service ports and browser adapter locations for metronome and recording capture:

- Add service-facing interfaces under `src/services/metronome/`:
  - `MetronomeTick`
  - `MetronomeTraceEventDetail`
  - `MetronomeService` with `onTick`, `start`, `update`, and `stop`
  - `createMetronomeService` if a small wrapper is useful for the existing implementation
- Add service-facing interfaces under `src/services/recording/`:
  - `RecordingCaptureService` with `isRecording`, `start`, and `stop`
  - `RecordingArtifact` / `RecordingArtifactAnalysis` if they are promoted from quick-metronome types
  - `RecordingPermissionError`
  - `SheetRecordingService` if needed for Sheet Practice UI props
- Move or wrap browser-specific implementation details into `src/infrastructure/audio/`:
  - Tone adapter factory and Tone-specific types should live in `src/infrastructure/audio/tone-metronome-adapter.ts` or equivalent.
  - MediaRecorder/getUserMedia capture and browser decode helpers should live in `src/infrastructure/audio/browser-recording-capture.ts` or equivalent.
  - Browser factories such as `createBrowserMetronomeService`, `createBrowserRecordingCaptureService`, and `createBrowserSheetRecordingService` should live outside React component files, preferably in `src/infrastructure/audio/` or a tiny `src/services/*/browser.ts` composition file that imports infrastructure.
- Keep the existing behavior of `BrowserMetronomeService`, `BrowserRecordingService`, and `BrowserSheetRecordingService` unless naming changes are needed. If files are moved, preserve exports or add compatibility re-exports only where required to keep the slice small.
- Update `useMetronomeTransport` to depend on the `MetronomeService` port rather than `BrowserMetronomeService`.
- Update Sheet Practice controls prop types to depend on service ports, not concrete browser classes.
- Remove or contain UI construction of browser classes:
  - `QuickMetronomeExperience` should consume a factory/hook/composition helper rather than directly calling `new BrowserMetronomeService()` and `new BrowserRecordingService()`.
  - `SheetPracticeControls` default factories should be imported from the service/infrastructure composition boundary, not defined by constructing browser classes in the UI file.
  - UI may still use `useMemo` to retain one service instance per component mount, but construction must be via injected factory functions or hooks.

Keep this slice intentionally scoped. Do not redesign all audio, replace Tone.js, replace MediaRecorder, change timing logic, alter artifact validation, or introduce a full dependency-injection framework.

### Minimal Zustand Slice

Add only the smallest shared Zustand state needed before segment recording and rerecord workflow state grows:

- Add `zustand` to `dependencies`.
- Create a small store under `src/stores/`, likely `src/stores/sheet-practice-recording-workflow-store.ts`.
- The store should hold ephemeral Sheet Practice workflow state that multiple controls will need during P1-09 through P1-11:
  - active recording segment context candidate or selected `segmentId` for the active `sheetId`
  - recording lifecycle status such as `idle`, `recording`, `saving`, and recoverable `error`
  - rerecord readiness/error state if it is already needed to prevent duplication in P1-10/P1-11
  - small actions such as `setActiveSegment`, `beginRecording`, `beginSaving`, `finishRecording`, `failRecording`, `resetForSheet`
- Prefer selectors or small hooks so components subscribe narrowly.
- Store state should reset or namespace by `sheetId` so switching sheets cannot leak active segment/recording workflow state.

What stays local:

- Quick Metronome local UI state stays local unless a later Quick Metronome slice explicitly needs shared state.
- BPM draft text, tap-tempo taps, local status message text, last metronome tick display, and transient component-only layout state stay local.
- MeasureGrid calibration form drafts stay local to the calibration panel.
- Segment create/edit form drafts stay local to the segment panel.
- Test harness-only recording active state can stay local unless the coding agent can move it without broadening scope.

What stays persisted in repositories/services:

- Measure grids remain in `src/services/measure-grid` plus `src/infrastructure/db/browser-measure-grid-service.ts`.
- Practice segments remain in `src/services/practice-segments` plus `src/infrastructure/db/browser-practice-segment-service.ts`.
- Practice sessions and recording metadata remain in `src/services/practice-session` and the existing db/review-history repositories.
- Recording artifacts and review records remain in recording history/review services. Zustand must not become a persistence layer.

## Likely Files To Change

- `package.json`
- `package-lock.json` if present or generated by dependency installation
- `src/stores/README.md`
- new `src/stores/sheet-practice-recording-workflow-store.ts`
- new or updated `src/services/metronome/*`
- new or updated `src/services/recording/*`
- new `src/infrastructure/audio/*`
- `src/lib/quick-metronome/metronome-service.ts`
- `src/lib/quick-metronome/recording-service.ts`
- `src/lib/quick-metronome/types.ts` if recording artifact types are promoted or re-exported
- `src/lib/quick-metronome/use-metronome-transport.ts`
- `src/lib/sheet-practice/recording-service.ts`
- `src/components/quick-metronome/quick-metronome-experience.tsx`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/controls/types.ts`
- focused unit tests listed below
- one source-guard test file, likely under `tests/unit/architecture-boundaries.test.ts`

## Explicit Non-Scope

- Do not implement P1-08 metadata fields in this slice unless P1-08 has not yet run and a type-only import is unavoidable. Prefer leaving P1-08 to its existing plan.
- Do not implement P1-09 selected-segment recording save.
- Do not implement P1-10 rerecord workflow behavior beyond the minimal store shape needed to avoid future state sprawl.
- Do not implement P1-11 `Record again`.
- Do not change Quick Metronome count-in, meter, sound design, timing policy, or UI copy for issue #4.
- Do not change MeasureGrid math, segment CRUD, segment selector behavior, calibration UI, recording review display, waveform rendering, error marker behavior, or local-data cleanup.
- Do not move all `src/lib` files into services/infrastructure. Touch only metronome/recording capture seams needed by the boundary.
- Do not add Redux, Jotai, React Query, context-only global state, or a custom store framework.
- Do not make Zustand persisted. Persistence belongs in repositories.
- Do not introduce cloud sync, accounts, import/export, backup/restore, or v2 audio analysis scope.

## Boundary Tests And Source Guards

Add focused source-guard tests so future recording slices cannot accidentally reintroduce the boundary gap:

- UI source guard:
  - Scan `src/components/**/*.tsx`.
  - Fail if component files import `tone`, import browser audio adapter modules directly, import `BrowserMetronomeService`, import `BrowserRecordingService`, import `BrowserSheetRecordingService`, use `new MediaRecorder`, or use `navigator.mediaDevices.getUserMedia`.
  - Allow type imports from service ports.
- Infrastructure placement guard:
  - Fail if `MediaRecorder` or `navigator.mediaDevices.getUserMedia` appears outside `src/infrastructure/audio/` and the approved focused test/mocking files.
  - Fail if direct `import("tone")` or `from "tone"` appears outside the Tone adapter file and approved tests.
- Store dependency guard:
  - Assert `zustand` is present in `package.json` dependencies.
  - Assert `src/stores/README.md` documents the new shared-state rule: ephemeral workflow state only; persisted domain data stays in repositories.
- Optional path guard:
  - Assert Sheet Practice controls prop types import metronome/recording service ports rather than concrete browser classes.

Keep the guards simple and deterministic. They should use Node filesystem reads or Vitest and should not require a browser.

## Existing Behavior Tests To Preserve Or Rerun

Unit tests:

- `tests/unit/quick-metronome-transport.test.tsx`
- `tests/unit/quick-metronome-metronome-service.test.ts`
- `tests/unit/quick-metronome-recording-analysis.test.ts`
- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/unit/sheet-practice-recording.test.ts`
- `tests/unit/practice-session-service.test.ts` if service port types or recording metadata call sites are touched
- `tests/unit/recordings-review-repository.test.ts` if recording artifact/review types or repositories are touched
- new `tests/unit/architecture-boundaries.test.ts`
- new store unit tests, either in `tests/unit/sheet-practice-recording-workflow-store.test.ts` or included in the boundary test file

E2E smoke/regression:

- `tests/e2e/quick-metronome.spec.ts`
- `tests/e2e/sheet-practice-controls.spec.ts`
- `tests/e2e/sheet-recording-review.spec.ts`

The E2E runs are important because moving browser adapter construction can pass typecheck while still breaking real microphone/synthetic recording harness behavior.

## Acceptance Checklist

- [ ] `zustand` is installed as an approved dependency and no alternate global state framework is added.
- [ ] `src/stores/README.md` explains that shared client state is for ephemeral UI/workflow state only, not persisted domain data.
- [ ] A minimal Sheet Practice recording workflow store exists with reset/namespacing behavior for sheet changes.
- [ ] BPM drafts, tap tempo, calibration drafts, and repository-backed domain data are not moved into Zustand.
- [ ] UI components no longer directly construct `BrowserMetronomeService`, `BrowserRecordingService`, or `BrowserSheetRecordingService`.
- [ ] UI components do not import Tone.js, MediaRecorder browser adapters, or browser audio implementation classes directly.
- [ ] Metronome and recording capture ports exist under `src/services/*` and are used by hooks/components.
- [ ] Tone.js implementation details live behind an infrastructure adapter/factory.
- [ ] MediaRecorder/getUserMedia implementation details live behind an infrastructure adapter/factory.
- [ ] Existing metronome transport behavior, Tone scheduling behavior, recording artifact validation, sheet recording rollback behavior, and Sheet Practice controls failure handling remain unchanged.
- [ ] Source-guard tests fail on direct component imports/construction of browser audio/recording classes.
- [ ] No P1-08/P1-09/P1-10/P1-11 product behavior is implemented early.
- [ ] Issue #4 count-in/meter remains explicitly deferred.
- [ ] Typecheck, lint, focused unit tests, and targeted E2E tests are run and reported.

## Verification Commands

Use README Windows command style:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 install
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts tests/unit/quick-metronome-transport.test.tsx tests/unit/quick-metronome-metronome-service.test.ts tests/unit/quick-metronome-recording-analysis.test.ts tests/unit/sheet-practice-controls.test.tsx tests/unit/sheet-practice-recording.test.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run typecheck
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run lint
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run build
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/quick-metronome.spec.ts tests/e2e/sheet-practice-controls.spec.ts tests/e2e/sheet-recording-review.spec.ts
```

If dependency installation changes the lockfile, the coding agent must report the package and lockfile change explicitly. If local Playwright browsers are missing, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run playwright:install
```

## Recommended Ordering Relative To P1-08

Recommended order: do this architecture/state preflight before P1-08 resumes coding, then run P1-08, then P1-09 through P1-11.

Reasoning:

- P1-08 is metadata-only and could technically proceed first, but it touches recording metadata/review types that P1-09 immediately consumes.
- Doing this preflight first gives P1-08 and P1-09 stable service ports and a clear rule for where browser recording/metronome implementation belongs.
- The Zustand store is most useful before P1-09 captures selected segment context and before P1-10/P1-11 add rerecord workflow state.
- Running the preflight after P1-08 but before P1-09 is acceptable if scheduling needs to preserve the existing P1-08 plan, but it is not the preferred path because it may force P1-08-adjacent type or import churn immediately afterward.

## Handoff Notes For Coding Agent

- Treat this as a preflight boundary slice, not a feature slice.
- Keep existing names and exports where doing so reduces churn.
- Prefer small ports and composition factories over broad file moves.
- The store should be boring and tiny. If it starts to look like a full domain model, stop and reduce scope.
- Preserve existing tests before adding new source guards. The source guards should protect the boundary after behavior is already proven.
