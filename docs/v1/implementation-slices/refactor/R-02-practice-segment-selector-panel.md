## 0. Verdict
Verdict: `PLAN_READY`

## 1. Pipeline Contract
Pipeline ID: `R-02 practice-segment-selector-panel`
One-PR objective: delete selector-local validation/status/workflow-clearing residue and reuse existing domain/store primitives without changing selector behavior.
Target debt pattern: semantic duplication / boundary mixing / controller bloat / compatibility residue.
Allowed production files: `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`.
Allowed test files: `tests/unit/practice-segment-selector.test.tsx`.
Explicitly out of scope: sheet-practice controls, measure-grid panel, ReferencePanel, browser adapter defaults, route/composition roots, service/domain/storage edits, new shared panel primitive, new workflow store API, and Phase 1 closeout.
This pipeline must not widen public API, add services/hooks/controllers/repository methods, create files, move browser defaults, or change visible messages.

## 2. Coding Read Set
### Must read before coding
| File | Why coding must read it | Decision it informs |
|---|---|---|
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | target file | exact deletions, stale guards, UI messages |
| `src/domain/practice/segments/index.ts` | existing segment field primitives | validation replacement without new domain code |
| `src/stores/sheet-practice-recording-workflow-store.ts` | owns active segment and rerecord invalidation | store writes remain existing actions |
| `tests/unit/practice-segment-selector.test.tsx` | focused behavior coverage | assertions to preserve or add |
| `tests/unit/practice-segment-domain.test.ts` | domain boundary coverage | prove reused primitive behavior |

### Planner-only evidence
| File | Why coding should not start from it |
|---|---|
| `skills/metronome_planner.md`; `docs/architecture/debt-gate-map.md`; `docs/agent-index/05-sheet-practice.md`; `docs/agent-index/05b-practice-controls.md`; `docs/v1/05f-practice-segments.md` | Skill file read: `skills/metronome_planner.md`; Debt gate map read: `docs/architecture/debt-gate-map.md`; owner/v1 evidence says segment UI must reuse MeasureGrid/domain/store boundaries and not claim Phase 1 closeout. |
| `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md`; `00-project-codescene-scan.md`; `02-practice-segment-selector-panel.md`; `docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md` | remediation, rank, per-file debt, and prior-plan evidence distilled into scope and RS rows. |
| Repo-map searches over `src/**`, `tests/**`, `docs/v1/**`, `docs/refactor/**`: `normalize|format|validate|resolve|select|build|create`, service/repository/controller/hook/adapter, `GridLoadState|maxLength={120}|source-segment-missing|PracticeSegmentSelectorPanel` | Existing primitive search found segment domain parsers and workflow-store actions; RS list is sufficient because allowed local adapters retire RS-2/RS-4 and no shared-primitive claim is made. |

### Read only if blocked
| File | Trigger for reading |
|---|---|
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | tempted to create shared panel/form primitive |
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | selected-segment invalidation semantics are unclear |
| `src/services/practice-segments/service.ts` | save or duplicate-name behavior becomes unclear |
| `src/services/practice-segments/validation.ts` | sheet/segment/name normalization becomes unclear |
| `tests/e2e/practice-segment-selector.spec.ts` | unit evidence cannot cover visible selector behavior |

## 3. Existing Behavior Contract
Preserve public exports/props: `PracticeSegmentSelection`, `PracticeSegmentSelectorPanelProps`, `sheetId`, `initialSegmentId`, injected services, `measureGridRevision`, and `onSelectedSegmentChange`.
Preserve URL/query/storage contract: none owned by this component.
Preserve visible messages: current validation, missing-grid, missing-segment, duplicate/save/delete fallback, return-segment, status labels, and empty-state copy.
Preserve store/order/error behavior: existing workflow actions only; validate draft/grid before save; edit existence before save; refresh before selection repair; stale sheet guard before state/store writes; failed save/delete keeps list and selection stable.
Preserve tests/harness surfaces: selector unit behavior and controls tests that mock `PracticeSegmentSelectorPanelProps`.

If preserving these requires widening scope, stop and report `PLAN_BLOCKED`.

## 4. Required Retired Surfaces
| ID | Old surface to delete | Why it is debt | Replacement | Required proof | Behavior test |
|---|---|---|---|---|---|
| RS-1 | duplicate `GridLoadState` alias | duplicate status alias | reuse `LoadState` for grid state | no `rg "GridLoadState" ...` matches | selector grid-status tests |
| RS-2 | manual name/BPM/notes constraint branches inside `validateSegmentDraft` | partial domain validator | existing `parsePracticeSegmentName`, `parsePracticeSegmentTargetBpm`, `parsePracticeSegmentNotes` plus local range parsing | no raw `name.length > 80`, `targetBpm < 30`, `targetBpm > 300`, or `notes.length > 1000` checks | selector validation + domain boundary tests |
| RS-3 | `maxLength={120}` on segment name input | UI/domain constraint drift | `maxLength={80}` matching domain limit | no `rg "maxLength=\\{120\\}" ...` matches | selector assertion for name input limit |
| RS-4 | repeated `setActiveRecordingSegment(..., null)` plus `invalidateRerecordSource(..., "source-segment-missing")` branches | workflow side-effect duplication | one local side-effect adapter using existing store actions | only one direct `"source-segment-missing"` store-write site remains | selector return/delete/missing-selection tests |

## 5. Allowed New Surface Budget
| Proposed new surface | Allowed? | Constraints | Required retired surface |
|---|---:|---|---|
| local unexported validator adapter | yes | pure; maps existing domain primitives to unchanged UI messages; no state/store writes | RS-2 |
| local unexported workflow adapter | yes | component-local only; writes only existing store actions; no new messages or service reads | RS-4 |
| local type alias / discriminated union | no | use existing local types unless deletion requires fewer types | none |
| new file | no | if target file becomes materially unreadable, stop and report | none |
| new hook/controller/service/facade/domain primitive | no | would widen surface | none |
| new repository or store method | no | would widen persistence/state contract | none |

## 6. Implementation Steps
### Step 1: Retire Grid State Alias
Edit `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`; delete RS-1; replace with `LoadState`; do not change status labels, grid error rendering, or segment status mapping; prove with `rg "GridLoadState" ...` and selector grid-status/grid-error tests.

### Step 2: Retire Field Constraint Shadow Validator
Edit target and `tests/unit/practice-segment-selector.test.tsx`; delete RS-2; replace with domain primitives plus local range parsing; do not change messages, empty notes/BPM normalization, or save payload shape; validator remains pure; prove with constraint `rg` and selector/domain tests.

### Step 3: Align Name Input Limit
Edit target and selector test; delete RS-3; replace with `maxLength={80}`; do not change label, placeholder, validation message, or trimmed save behavior; no new constant file; prove with `rg "maxLength=\\{120\\}" ...` and input-limit assertion.

### Step 4: Centralize Missing-Segment Workflow Clearing
Edit target and selector test; delete RS-4; replace with one local workflow adapter; do not change `"source-segment-missing"`, selection clearing, return fallback, or valid-selection active segment updates; call only after stale guards; prove with reason-string `rg` and missing/return/delete/stale tests.

## 7. Async / State / Side-Effect Safety
Pure resolver/helper rule: the validator adapter may read only draft/domain primitives and return fields/errors; it must not write state, store, messages, or services.
Stale async guard: every save/delete/load branch must keep the existing `targetSheetId`/`currentSheetIdRef.current` check before state/store writes.
Store ownership: `resetForSheet`, `setActiveSegment`, and `invalidateRerecordSource` remain the only store actions used; no new store method.
Capture/save ordering: grid and draft validation remain before `saveSegment`; edit existence check remains before save; delete refresh remains before selection repair.
Effect dependency constraint: do not add unstable object deps or service wrapper deps unless the existing effect already requires them.

If these cannot be preserved, the plan is blocked.

## 8. Verification Before Review Handoff
Required commands:
```bash
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-segment-selector.test.tsx tests/unit/practice-segment-domain.test.ts tests/unit/sheet-practice-recording-workflow-store.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/segments/practice-segment-selector-panel.tsx tests/unit/practice-segment-selector.test.tsx
```
Required deletion proofs:
```bash
rg "GridLoadState" src/components/sheet-practice/segments/practice-segment-selector-panel.tsx
rg "name\.length > 80|targetBpm < 30|targetBpm > 300|notes\.length > 1000" src/components/sheet-practice/segments/practice-segment-selector-panel.tsx
rg "maxLength=\{120\}" src/components/sheet-practice/segments/practice-segment-selector-panel.tsx
rg -n "\"source-segment-missing\"" src/components/sheet-practice/segments/practice-segment-selector-panel.tsx
```
Required review gates: changed-file Code Health must not decline if CodeScene is available; no new infrastructure/browser import, public API, new file, out-of-scope file, or Phase 1 completion claim; retired surface list must match the actual diff.
Optional commands only if touched behavior warrants them:
```bash
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/practice-segment-selector.spec.ts
```

## 9. Final Coding Agent Handoff
Edit only `practice-segment-selector-panel.tsx` and focused selector tests.
Delete RS-1 through RS-4; do not rename old helpers as a substitute for deletion.
Use only existing domain segment primitives and existing workflow-store actions.
Allowed new code is local, unexported, and tied to RS-2 or RS-4.
Keep props, messages, stale guards, save/delete ordering, and store semantics unchanged.
Do not touch controls, measure-grid, ReferencePanel, browser defaults, routes, service/domain/storage, or new files.
Run focused unit tests, typecheck, scoped lint, deletion proofs, and CodeScene no-decline check if available.
If any step requires a new hook/controller/service/repository/domain primitive or another production file, stop and report `PLAN_BLOCKED`.
