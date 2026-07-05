## 0. Verdict
Verdict: `PLAN_READY`
## 1. Pipeline Contract
Pipeline ID: `R-06 measure-grid-calibration-panel`
One-PR objective: delete local measure-grid validation, identity, wrapper, and duplicate render surfaces from `MeasureGridCalibrationPanel` while preserving current calibration UI behavior.
Target debt pattern: semantic duplication / wrapper residue / controller bloat.
Allowed production files: `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`.
Allowed test files: `tests/unit/measure-grid-calibration.test.tsx`.
Explicitly out of scope: `SheetPracticeControls`, `PracticeSegmentSelectorPanel`, `ReferencePanel`, browser adapter defaults, measure-grid service/repository behavior, schema changes, storage, routes, E2E fixture helpers, and Phase 1 or sheet-practice shared primitive closeout.
This pipeline is not allowed to widen public API, add services/hooks/controllers/repository methods, create files, move browser defaults, change visible user messages, or touch unrelated timing/storage behavior.
## 2. Coding Read Set
### Must read before coding
| File | Why coding must read it | Decision it informs |
|---|---|---|
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | target file | deletions, state guards, labels |
| `tests/unit/measure-grid-calibration.test.tsx` | focused behavior coverage | assertions to preserve or add |
| `src/domain/practice/measure-grid/index.ts` | existing grid schema | validation projection replacement |
| `src/domain/practice/segments/index.ts` | existing grid identity | `gridsEqual` replacement |
| `src/components/sheet-practice/controls/labeled-select.tsx` | existing select primitive | time-signature select replacement |
### Planner-only evidence
| File | Why coding should not start from it |
|---|---|
| `skills/metronome_planner.md`; `docs/architecture/debt-gate-map.md`; `docs/agent-index/05-sheet-practice.md`; `docs/agent-index/05b-practice-controls.md`; `docs/v1/05f-practice-segments.md` | Skill file read: `skills/metronome_planner.md`; Debt gate map read: `docs/architecture/debt-gate-map.md`; owner/v1 evidence says MeasureGrid UI must reuse domain utilities and not create segment/recording behavior. |
| `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md`; `00-project-codescene-scan.md`; `06-measure-grid-calibration-panel.md`; `docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md` | remediation, rank, per-file debt, and prior-plan evidence distilled into scope and RS rows. |
| Repo-map searches over `src/**`, `tests/**`, `docs/v1/**`, `docs/refactor/**`: `normalize|format|validate|resolve|select|build|create`, service/repository/controller/hook/adapter, `isSupportedTimeSignature|gridsEqual|validateDraft|LabeledSelect|getMeasureGridVersion` | Existing primitive search found `validateMeasureGrid`, `getMeasureGridVersion`, `isQuickMetronomeTimeSignature`, and `LabeledSelect`; RS list is sufficient because no new shared primitive/file is allowed. |
### Read only if blocked
| File | Trigger for reading |
|---|---|
| `tests/e2e/measure-grid-calibration.spec.ts` | unit tests cannot prove label/button behavior after select replacement |
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | parent prop/default behavior appears affected |
| `src/components/sheet-practice/controls/practice-control-state.ts` | default draft source becomes ambiguous |
| `src/lib/quick-metronome/control.ts` | `TIME_SIGNATURES` or supported-signature behavior appears unclear |
## 3. Existing Behavior Contract
Preserve public props/export `MeasureGridCalibrationPanelProps` and `MeasureGridCalibrationPanel`; no URL/query/storage changes; visible text/status/errors `Measure grid`, `Offset source: current playback timestamp`, `Offset source: manual entry`, `Loading`, `Needs calibration`, `Calibrated`, `Unsaved changes`, `No playback timestamp available.`, `Grid BPM must be an integer from 30 to 300.`, `Pickup beats must be an integer from 0 to N.`, `Set or enter a measure 1 offset before saving.`, `Measure 1 offset must be a non-negative integer in milliseconds.`, `Choose a supported grid time signature.`, `Measure grid values are invalid.`, `Measure grid could not be loaded.`, `Measure grid could not be saved.`, `Saving...`, `Save grid`; local load state starts loading then becomes ready/error; save state is saving only around `saveGrid`; `loadedSheetId` remains the cross-sheet async guard; validation happens before service save; failed save keeps draft and previous saved snapshot; tests keep `data-testid="measure-grid-calibration-panel"` and `data-testid="measure-grid-status"`.
If preserving this requires widening scope, stop and report `PLAN_BLOCKED`.
## 4. Required Retired Surfaces
| ID | Old surface to delete | Why it is debt | Replacement | Required proof | Behavior test |
|---|---|---|---|---|---|
| RS-1 | local `isSupportedTimeSignature()` wrapper | one-line wrapper residue | direct `isQuickMetronomeTimeSignature` call | no wrapper definition/call remains | malformed defaults test |
| RS-2 | `gridsEqual()` four-field comparator | duplicate grid identity | `getMeasureGridVersion` comparison | no `gridsEqual` definition/call remains | calibrated/unsaved status tests |
| RS-3 | duplicated final `errorMessage` JSX branches | duplicate render block | one `errorMessage` alert branch | no load-state split around same alert remains | load-error and save-error tests |
| RS-4 | hand-written time-signature `label` plus `select` block | local UI primitive rewrite | existing `LabeledSelect` with same label/options/value | no local time-signature `<label>`/`<select>` block remains | time-signature revalidation test |
| RS-5 | `validateDraft` branch chain for domain constraints | UI repeats domain validation | parse strings locally, then `measureGridSchema.safeParse` plus UX error projection | no local domain-rule branch chain remains | invalid-draft and save-through-service tests |
## 5. Allowed New Surface Budget
| Proposed new surface | Allowed? | Constraints | Required retired surface |
|---|---:|---|---|
| local unexported validation projector | yes | pure; no state writes, service calls, UI message changes, or side effects | RS-5 |
| local type alias | yes | internal only; no exported API | RS-5 |
| new file | no | if the target file becomes unreadable, stop and report | none |
| new hook/controller/service/facade | no | would widen surface | none |
| new repository method | no | would widen persistence contract | none |
| new domain primitive | no | not needed for this one-target PR | none |
## 6. Implementation Steps
### Step 1: Wrapper Deletion
Edit: `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
Do: delete RS-1 -> replace with direct `isQuickMetronomeTimeSignature(defaultTimeSignature)` in default draft creation.
Do not change: default BPM/time-signature fallback behavior or prop shape.
Safety: keep `TIME_SIGNATURES` options unchanged.
Deletion proof: `rg "function isSupportedTimeSignature|isSupportedTimeSignature\\(" src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
Behavior proof: malformed persisted grid/default fallback unit test.
### Step 2: Identity Deletion
Edit: `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
Do: delete RS-2 -> replace status equality with `getMeasureGridVersion(savedGrid) === getMeasureGridVersion(validation.grid)`.
Do not change: `Needs calibration`, `Calibrated`, or `Unsaved changes` status rules.
Safety: only call the version primitive after both grids are non-null validated grids.
Deletion proof: `rg "function gridsEqual|gridsEqual\\(" src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
Behavior proof: calibrated load and unsaved edit unit tests.
### Step 3: Alert Branch Deletion
Edit: `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
Do: delete RS-3 -> replace with one `{errorMessage ? <p role="alert">...` branch.
Do not change: error text source or alert class.
Safety: load error and save error must both render once.
Deletion proof: `rg "effectiveLoadState === \\\"error\\\"|effectiveLoadState !== \\\"error\\\"" src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
Behavior proof: load-error and save-error unit tests.
### Step 4: Select Primitive Replacement
Edit: `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
Do: delete RS-4 -> replace with `LabeledSelect` using label `Grid time signature` and `TIME_SIGNATURES.map`.
Do not change: selected value, option labels, or `updateDraft({ timeSignature })`.
Safety: cast selected value only at the existing update boundary.
Deletion proof: `rg "idPrefix\\}-time-signature|<select" src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
Behavior proof: revalidates-pickup-beats unit test.
### Step 5: Validation Branch Deletion
Edit: `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
Do: delete RS-5 -> replace domain-rule checks with local string parsing plus `measureGridSchema.safeParse` and the same UX error messages.
Do not change: save disabled rules, service-save payload shape, or field error copy.
Safety: the projector is pure and returns `DraftValidation` only.
Deletion proof: `rg "bpm < MIN_GRID_BPM|bpm > MAX_GRID_BPM|pickupBeats >= numerator|measureOneOffsetMs < 0" src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
Behavior proof: invalid-draft, pickup-revalidation, and save-through-service unit tests.
## 7. Async / State / Side-Effect Safety
Preserve: validation/projector helpers are pure and cannot read services or write React state; async `getGrid` keeps the `isActive` cleanup guard and `loadedSheetId === sheetId` effective-state gate; save validates before `measureGridService.saveGrid`; failed save leaves draft and previous saved snapshot intact; successful save updates saved grid, draft, and `onGridSaved` in the current order; effect dependencies do not add unstable object deps.
If these cannot be preserved, the plan is blocked.
## 8. Verification Before Review Handoff
Required commands:
```bash
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/measure-grid-calibration.test.tsx
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx tests/unit/measure-grid-calibration.test.tsx
```
Required deletion proofs:
```bash
rg "function isSupportedTimeSignature|isSupportedTimeSignature\(" src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx
rg "function gridsEqual|gridsEqual\(" src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx
rg "effectiveLoadState === \"error\"|effectiveLoadState !== \"error\"" src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx
rg "idPrefix\}-time-signature|<select" src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx
rg "bpm < MIN_GRID_BPM|bpm > MAX_GRID_BPM|pickupBeats >= numerator|measureOneOffsetMs < 0" src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx
```
Required review gates: changed-file Code Health must not decline if CodeScene is available; no new infrastructure/browser import; no public API change; no new file; no out-of-scope file changed; retired surface list must match the actual diff.
Optional commands only if touched behavior warrants them:
```bash
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/measure-grid-calibration.spec.ts
```
## 9. Final Coding Agent Handoff
Edit only `measure-grid-calibration-panel.tsx` and focused unit tests. Delete RS-1 through RS-5. Use only direct `isQuickMetronomeTimeSignature`, `getMeasureGridVersion`, `LabeledSelect`, and a pure local validation projector around `measureGridSchema.safeParse`. Preserve props, data-testids, status text, field errors, load/save state, stale-sheet guard, and failed-save draft behavior. Do not touch `SheetPracticeControls`, selector, ReferencePanel, browser defaults, services, repositories, schemas, storage, routes, E2E helpers, or new files. Run focused unit test, typecheck, scoped lint, deletion proofs, and CodeScene no-decline check. If any step requires a new hook/controller/service/repository/domain primitive or another target file, stop and report `PLAN_BLOCKED`.
