# R-01 Sheet Practice Controls Refactor Plan

## Verdict

PLAN_READY

## Pipeline Scope

- Target file: `src/components/sheet-practice/controls/sheet-practice-controls.tsx`.
- One-PR objective: delete duplicated Practice Again / Record Again source-validation paths and replace the stop/save inline projection with the existing `refreshSession()` path.
- Primary debt being reduced: `SheetPracticeControls` currently repeats the same source rules across hydration, ready-state revalidation, and start validation, then repeats session/recording projection after save.
- This is one single R-01 pipeline. Do not introduce R-01A/R-01B.
- R-01 is not remediation Phase 1 completion. Phase 1 also includes `PracticeSegmentSelectorPanel`, `MeasureGridCalibrationPanel`, `ReferencePanel`, browser adapter defaults, and broader sheet-practice UI/controller debt. R-01 only clears internal duplicated validation and refresh projection inside `SheetPracticeControls`.

## Coding Agent Read Set

### Must Read

| File | Why coding must read it | What decision it informs |
|---|---|---|
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | Target file; contains every required edit. | Exact duplicate branches, local resolver placement, stale guards, and save-refresh replacement. |
| `src/stores/sheet-practice-recording-workflow-store.ts` | Owns rerecord workflow state semantics. | Which store actions adapters should keep using after resolver results. |
| `src/components/sheet-practice/controls/types.ts` | Defines injected service surfaces used by controls. | Confirms no new service/repository method is needed. |
| `tests/unit/sheet-practice-controls.test.tsx` | Main behavior-equivalence coverage for controls. | Which tests to update/add for valid source, invalid source, Record Again start, save failure, stale guards, and refresh. |
| `tests/unit/sheet-practice-recording-workflow-store.test.ts` | Existing store semantics coverage. | Confirms R-01 should not move state transitions out of the store or change status meanings. |

### Read If Needed

| File | Trigger for reading | What question it answers |
|---|---|---|
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | If selected-segment/rerecord invalidation behavior seems surprising while editing controls. | Shows that segment selection already calls `setActiveSegment` and invalidates rerecord sources when segments disappear or change. |
| `src/lib/sheet-practice/recording-service.ts` | If tempted to move recording save/rollback logic into controls or a new helper. | Confirms `stopAndSave()` already owns artifact validation, prepared metadata, commit, and rollback. |
| `src/services/practice-session/service.ts` | If tempted to add session service methods. | Confirms session creation, duration update, event capture, prepared metadata, and commit primitives already exist. |
| `tests/e2e/sheet-segment-recording.spec.ts` | If Record Again behavior changes beyond unit-level refactor risk. | Existing browser workflow for a second recording with the same selected segment context. |
| `tests/e2e/sheet-recording-review.spec.ts` | If Practice Again navigation or immutable source behavior is touched. | Existing end-to-end Practice Again workflow from review to sheet practice. |

### Planner Evidence Only

| File | Why it is not required for coding startup |
|---|---|
| `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md` | Establishes broader debt-reduction strategy; this plan contains the actionable R-01 subset. |
| `docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md` | Provides baseline CodeScene values repeated under reviewer evidence. |
| `docs/refactor/src-debt-forensics-2026-07-04/01-sheet-practice-controls.md` | Provides detailed debt evidence; this plan names the exact construction targets. |
| `docs/architecture/debt-gate-map.md` | Gate rules are reflected here; reviewer still uses it, but coding startup does not need the whole map. |
| `skills/metronome_chatgpt_review.md` | External review packet format, not implementation guidance. |
| `skills/metronome_planner.md` | Planner contract, not coding guidance. |
| `src/components/sheet-practice/reference/reference-panel.tsx` | Confirms adjacent debt exists, but R-01 does not edit reference orchestration. |
| `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx` | Confirms route composition passes existing props; R-01 keeps those props stable and does not edit this file. |

## Existing Behavior To Preserve

- Public props from `SheetPracticeControlsProps`: `sourceRecordingId`, `returnSegmentId`, injected service props, `barCountIn`, and `onSelectedSegmentChange` stay unchanged.
- URL/query contract stays unchanged: callers still pass review `recordingId` as `sourceRecordingId` and return `segmentId` as `returnSegmentId`.
- Visible Practice Again / Record Again messages stay unchanged, including ready, missing source, non-sheet, sheet mismatch, no segment context, original segment mismatch, missing live segment, invalid live segment, and generic Record Again unavailable messages.
- Workflow-store semantics stay unchanged: adapters use existing `setRerecordReady`, `clearRerecordSource`, `invalidateRerecordSource`, `setActiveSegment`, `finishRecording`, and `failRecording`.
- Capture/save behavior stays unchanged: `startSheetRecording("record-again")` validates before `startCapture()`, discards capture on failed start after capture begins, and continues using `sheetRecordingService.stopAndSave()`.
- Practice Again session behavior stays unchanged: a source recording still forces a fresh sheet session until `consumedSourceRecordingId` records the consumed source.
- Safety constraint: every async resolver call must have a stale guard before writing store, messages, or React state.
- Bar count-in, metronome transport, preset UI, segment tempo apply, measure-grid calibration, and test harness events are not behavior targets for R-01.

## Five Construction Points

### 1. Delete Partial Rerecord Validator

- Delete: the entire `getRerecordSourceInvalidReason()` helper, including its function declaration and body.
- Replace With: one unexported local resolver in `sheet-practice-controls.tsx`. The resolver may read via injected services and must return a discriminated union. It must not call store actions, set messages, or update React state.
- Must Not Change: `formatRerecordUnavailableMessage()` remains the message formatter; existing store actions remain the only mutation path.
- Stale Guard / Safety: resolver stays pure of orchestration. Hydration, ready revalidation, and start-validation adapters separately map resolver results to store actions/messages after checking staleness.
- Proof: `rg "getRerecordSourceInvalidReason" src/components/sheet-practice/controls/sheet-practice-controls.tsx` returns no matches; `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-controls.test.tsx` passes.

### 2. Delete Hydration Inline Source-Validation Branch Chain

- Delete: in `hydratePracticeAgainSource()`, the inline block from `const sourceRecording = sheetRecordingService.getRecording(normalizedSourceRecordingId)` through direct live-segment load, `createSheetRecordingSegmentContext(liveSegment)`, and context comparison.
- Replace With: call the pure local resolver, then in the hydration adapter map result cases to the existing `clearRerecordSource`, `invalidateRerecordSource`, `setActiveRecordingSegment`, `setRerecordReady`, `setMessage`, and `setErrorMessage` behavior.
- Must Not Change: no-source still clears with `"no-source-recording"` and no visible error; no-segment-context still uses `clearRerecordSource`; valid source still shows `Practice Again ready for <segment>.`
- Stale Guard / Safety: keep the existing hydration `cancelled` guard. After awaiting the resolver, do not write store/message if the effect was cancelled.
- Proof: hydration function has no direct `sheetRecordingService.getRecording(normalizedSourceRecordingId)`, no direct `practiceSegmentService.getSegment(sheetId, sourceSegmentContext.segmentId)`, and no direct `createSheetRecordingSegmentContext(liveSegment)`; existing valid hydration and invalid-source matrix tests pass.

### 3. Delete Ready-State Revalidation Partial-Validation Block

- Delete: the ready-state revalidation effect block that directly calls `sheetRecordingService.getRecording(rerecordSourceRecordingId)`, computes `invalidReason`, and calls `invalidateRerecordSource` from that partial result.
- Replace With: capture current `sheetId`, `rerecordSourceRecordingId`, `rerecordStatus`, and source identity before awaiting the pure resolver, then map a stale-checked resolver result to the existing invalidation/clear semantics.
- Must Not Change: if the source is still valid, the effect remains a no-op; invalid sources still leave Record Again unavailable.
- Stale Guard / Safety: after await, confirm the current store state still matches the captured sheet id, source recording id, status, and source segment id before any store/message write. If it does not match, return without writing.
- Proof: the effect has no direct `sheetRecordingService.getRecording(rerecordSourceRecordingId)` and no `invalidReason` block; tests for invalid source/context and selection changes pass.

### 4. Delete Record Again Start Inline Source-Validation Branch Chain

- Delete: in `validateRecordAgainSource()`, the inline chain from `const sourceRecording = sheetRecordingService.getRecording(source.recordingId)` through direct selected-segment load, selected-segment sheet checks, `createSheetRecordingSegmentContext(selectedSegment)`, context comparison, and repeated generic throws.
- Replace With: keep a small start-validation adapter that reads the current store snapshot, calls the pure resolver, checks staleness, maps invalid results to existing store invalidation/active segment updates, and returns `segmentContext` or throws `new Error("Record again is not available for this segment.")`.
- Must Not Change: validation still happens before `sheetRecordingService.startCapture()`; stale or missing source must not start capture or save; rapid double-start guard remains in `startSheetRecording()`.
- Stale Guard / Safety: adapter must compare the post-await current store state to the captured sheet id, source recording id, status, and active segment id before writing invalidation. If the state changed, throw the existing generic Record Again error without writing stale results.
- Proof: `validateRecordAgainSource()` has no direct `sheetRecordingService.getRecording(source.recordingId)`, no direct `practiceSegmentService.getSegment(...)`, and no direct `createSheetRecordingSegmentContext(selectedSegment)`; missing-source, permission-denial, rapid double-start, and save-failure unit tests pass.

### 5. Delete Stop/Save Inline Session Projection

- Delete: in `stopSheetRecording()` after `sheetRecordingService.stopAndSave(...)`, the inline projection block containing `sessionService.getRecentSheetSession(sheetId)`, `sessionService.listRecordingMetadata()`, `setSession(nextSession)`, and filtered `setRecordings(...)`.
- Replace With: `await refreshSession()` and keep `setLatestSheetRecording(result.recording)` only if needed for immediate saved-recording display before subscriptions settle.
- Must Not Change: `finishWorkflowRecording(sheetId, result.recording)`, recording state transitions, catch path, `discardCapture`, and success messages remain unchanged.
- Stale Guard / Safety: do not add extra async projection paths. `refreshSession()` remains the single projection reader for session, recordings, and latest recording.
- Proof: `stopSheetRecording()` calls `await refreshSession()` and does not directly call `sessionService.getRecentSheetSession(sheetId)` or `sessionService.listRecordingMetadata()`; save-success unit coverage passes.

## New Surface Budget

| Proposed new surface | Allowed? yes/no | Why allowed or rejected | Existing alternative checked | Same-PR retired surface |
|---|---|---|---|---|
| Unexported local resolver in `sheet-practice-controls.tsx` | yes | Collapses three duplicate source-validation paths without widening public API. Must remain pure: service reads and discriminated union return only. | Existing store handles state but not async source/live-segment validation; existing services provide reads but not this decision shape. | Actual deletion of the validator helper, hydration branch chain, ready revalidation block, and start validation branch chain. |
| Unexported local resolver result type | yes | Keeps the discriminated union explicit and safe. | Anonymous object shapes would make adapter switches easier to break. | Same as resolver; no exported API. |
| Tiny internal predicate used only inside resolver | yes, only if needed | Allowed only for local readability and not counted as retired surface. | Prefer inline branches in the resolver first. | None by itself; debt proof comes from the five construction points above. |
| New file under `src/components/sheet-practice/controls/*` | no | Default is no new file. Keep resolver local in `sheet-practice-controls.tsx`. If local resolver makes the file obviously unreadable, stop and report instead of creating a file or expanding scope. | Local helper in the target file. | None. |
| New hook/controller/service/adapter/repository method | no | Would widen surface and does not retire cross-file callers in this PR. | Existing store, practice segment service, recording service, and session service are enough. | None. |
| New domain primitive | no | Resolver depends on UI-injected services and async reads, so it does not belong in pure domain. | `createSheetRecordingSegmentContext` remains the reused domain primitive. | None. |

## Boundary Impact

- UI -> browser adapter direct imports: R-01 does not add or remove them. Existing defaults in `SheetPracticeControls` remain stable; moving them is out of scope.
- UI -> infrastructure imports: R-01 must add none. Any `@/infrastructure/**` import in the diff fails the boundary.
- Domain -> UI/service imports: R-01 touches no domain files and must add none.
- Service passthrough: R-01 must add no service or repository methods.
- Repository access: R-01 must keep using injected services/store; no direct repository import.
- Composition root impact: none. `SheetViewerExperience`, app routes, and prop wiring remain unchanged.

## Verification Matrix

| Command or test file | Required before review handoff / coding completion evidence | Behavior protected | Expected evidence |
|---|---|---|---|
| `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-controls.test.tsx` | yes | Practice Again hydration, invalid source handling, Record Again start guard, stale guards, recording save/refresh behavior. | Passing test output. |
| `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-recording-workflow-store.test.ts` | yes | Existing rerecord store semantics still hold. | Passing test output. |
| `& .\scripts\npm-local.ps1 --% run typecheck` | yes | No public prop/service/type regression. | Passing typecheck output. |
| `& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/controls/sheet-practice-controls.tsx tests/unit/sheet-practice-controls.test.tsx` | yes | Local lint and import hygiene for edited files. | Passing lint output. |
| `& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-segment-recording.spec.ts` | no | Browser Record Again workflow with selected segment context. | Optional if unit changes are broad or reviewer asks for browser proof. |
| `& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-recording-review.spec.ts` | no | Full Practice Again navigation/source immutability flow. | Optional if URL/source behavior changes, which this plan says to avoid. |

## Reviewer / Gate Evidence

- Coding-facing CodeScene rule: changed-file Code Health must not decline; target complex methods should go down directionally; listed surfaces must be actually deleted.
- Detailed baseline evidence for reviewer:
  - Project hotspot snapshot: `src/components/sheet-practice/controls/sheet-practice-controls.tsx` Code Health `6.51`, revisions `29`, LOC `1254`, hotspot yes.
  - File-level CodeScene score: `6.22`, Yellow/problematic debt.
  - CodeScene named complex methods: `startSheetRecording` cc 19, `validateRecordAgainSource` cc 16, `hydratePracticeAgainSource` cc 13, top-level component cc 13, `handleRecordingHarnessEvent` cc 10, `formatRerecordUnavailableMessage` cc 10, `stopSheetRecording` cc 9, `resolveSelectedSegmentContext` cc 8.
- Failure even if tests pass:
  - Any listed deletion surface remains.
  - Resolver calls store actions, sets messages, or updates React state.
  - Missing stale guard after an async resolver call.
  - New service/hook/controller/repository method appears.
  - Public props, URL query behavior, visible messages, or browser/infrastructure imports change.
  - Bar count-in, ReferencePanel, selector panel, composition-root work, or Phase 1 completion claims slip into this PR.

## No-Go / Out Of Scope

| Item | Why out of scope | What signal would require a separate user-approved pipeline |
|---|---|---|
| Claiming R-01 completes remediation Phase 1 | Phase 1 includes sibling panels, ReferencePanel, browser adapter defaults, and broader sheet-practice UI/controller debt. | User asks to plan or execute full Phase 1 completion. |
| Moving browser service defaults out of controls | Important boundary debt, but not necessary to delete the duplicate record-again logic. | CodeScene/review requires composition-root cleanup before accepting any controls refactor. |
| Refactoring `PracticeSegmentSelectorPanel` | Its form validation and selected-state debt is separate and can expand the PR. | Resolver cannot preserve selected-segment behavior without changing selector ownership. |
| Refactoring `ReferencePanel` | Same debt family, but unrelated to record-again validation in the target file. | User asks for full sheet-practice session orchestration consolidation. |
| Bar count-in reset/state-machine cleanup | Separate timing-sensitive surface with broad tests. | Record-again edits unexpectedly require touching bar-count-in refs/state. |
| Creating a new helper file | Default is resolver local to target file. | Resolver is obviously unreadable locally; coding agent must stop and report instead of creating the file. |
| Deleting harness globals/events | Current tests rely on them; not needed for R-01. | A separate test-harness cleanup is approved. |
| Changing route/query contracts | Existing review links and app pages depend on current `recordingId`/`segmentId` mapping. | Product explicitly changes Practice Again navigation. |

## Coding Agent Handoff

Edit only `src/components/sheet-practice/controls/sheet-practice-controls.tsx` and focused unit tests. Keep the resolver local and pure: service reads plus discriminated union return only; adapters own store/message/state writes with stale guards. Delete the five listed surfaces, replace stop/save projection with `refreshSession()`, do not create new files or services, and do not claim R-01 completes Phase 1. Report deletion proof, stale-guard proof, tests run, and CodeScene no-decline evidence.
