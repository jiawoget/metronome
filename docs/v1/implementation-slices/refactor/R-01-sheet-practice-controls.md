# R-01 Sheet Practice Controls Refactor Plan
## 0. Verdict
Verdict: `PLAN_READY`

## 1. Pipeline Contract
Pipeline ID: `R-01 sheet-practice-controls`

One-PR objective: delete duplicated Practice Again / Record Again source validation and reuse `refreshSession()` after save.

Target debt pattern: semantic duplication / controller bloat.

Allowed production files: `src/components/sheet-practice/controls/sheet-practice-controls.tsx`.

Allowed test files: `tests/unit/sheet-practice-controls.test.tsx`, `tests/unit/sheet-practice-recording-workflow-store.test.ts`.

Explicitly out of scope: selector, measure-grid, ReferencePanel, browser adapter defaults, bar count-in, routes, schema/storage, harness events, and Phase 1 closeout.

This pipeline must not widen public API, add services/hooks/controllers/repository methods, create files, move browser defaults, or change visible messages.

## 2. Coding Read Set
### Must read before coding
| File | Why coding must read it | Decision it informs |
|---|---|---|
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | target file | deletions, resolver, stale guards, refresh reuse |
| `src/stores/sheet-practice-recording-workflow-store.ts` | owns rerecord state | store actions adapters keep using |
| `src/components/sheet-practice/controls/types.ts` | injected services | no new service/repository method |
| `tests/unit/sheet-practice-controls.test.tsx` | behavior coverage | source validation, stale guards, refresh tests |
| `tests/unit/sheet-practice-recording-workflow-store.test.ts` | store semantics | state meanings unchanged |

### Planner-only evidence
| File | Why coding should not start from it |
|---|---|
| `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md` | broad strategy distilled here |
| `docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md` | baseline only |
| `docs/refactor/src-debt-forensics-2026-07-04/01-sheet-practice-controls.md` | debt evidence distilled into RS rows |
| `docs/architecture/debt-gate-map.md` | reviewer gate input |

### Read only if blocked
| File | Trigger for reading |
|---|---|
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | selected-segment invalidation unclear |
| `src/lib/sheet-practice/recording-service.ts` | tempted to move save/rollback logic |
| `src/services/practice-session/service.ts` | tempted to add session service methods |
| `tests/e2e/sheet-segment-recording.spec.ts` | unit evidence cannot cover Record Again |
| `tests/e2e/sheet-recording-review.spec.ts` | Practice Again navigation/query touched |

## 3. Existing Behavior Contract
Preserve public props / exports (`SheetPracticeControlsProps`, injected services, `sourceRecordingId`, `returnSegmentId`, `barCountIn`, `onSelectedSegmentChange`); review query `recordingId` -> `sourceRecordingId`; return query `segmentId` -> `returnSegmentId`; visible messages from current controls tests; workflow-store ownership of rerecord state/actions; Record Again validation before `startCapture()`; capture discard/save failure/workflow failure behavior; bar count-in and harness globals/events.

If preserving this requires widening scope, stop and report `PLAN_BLOCKED`.

## 4. Required Retired Surfaces
| ID | Old surface to delete | Why it is debt | Replacement | Required proof | Behavior test |
|---|---|---|---|---|---|
| RS-1 | `getRerecordSourceInvalidReason()` | partial validator | pure local resolver | no `rg "getRerecordSourceInvalidReason" ...` matches | controls unit tests |
| RS-2 | hydration inline validation from `getRecording(normalizedSourceRecordingId)` through live context comparison | repeats start rules | hydration adapter maps resolver result | no direct source/live/context calls in hydration | valid hydration + invalid-source tests |
| RS-3 | ready-state effect partial validation block | incomplete duplicate | stale-guarded ready adapter | no direct ready `getRecording` or `invalidReason` block | invalid source/context tests |
| RS-4 | `validateRecordAgainSource()` inline validation chain | repeats hydration | start adapter before capture | no direct source `getRecording`, `getSegment`, context creation in validator | missing-source/permission/double-start/save-failure tests |
| RS-5 | stop/save inline session projection | duplicates `refreshSession()` | `await refreshSession()` | no direct `getRecentSheetSession` or `listRecordingMetadata` in `stopSheetRecording` | save-success refresh assertion |

## 5. Allowed New Surface Budget
| Proposed new surface | Allowed? | Constraints | Required retired surface |
|---|---:|---|---|
| local unexported resolver | yes | pure service reads plus discriminated union; no store/message/state writes | RS-1, RS-2, RS-3, RS-4 |
| local result type | yes | internal only; no exported API | RS-1 |
| tiny resolver-internal predicate | yes | local only; not counted as retired surface | RS-1 |
| new file | no | if local resolver is unreadable, stop and report | none |
| new hook/controller/service/repository/domain primitive | no | would widen surface | none |

## 6. Implementation Steps
### Step 1: Local Pure Resolver
Delete RS-1 in `sheet-practice-controls.tsx`; replace with one local pure resolver using existing services and `createSheetRecordingSegmentContext`; do not change formatter, store actions, or public props; prove with `rg "getRerecordSourceInvalidReason" ...` and focused controls tests.

### Step 2: Hydration Adapter
Delete RS-2; map resolver results to existing hydration store/message actions; preserve no-source/no-segment/invalid-source/ready messages; keep cancellation guard before post-await writes; prove no direct hydration `getRecording(normalizedSourceRecordingId)`, live `getSegment`, or live context creation.

### Step 3: Ready Revalidation Adapter
Delete RS-3; capture sheet/source/status before await and stale-check before writes; valid ready source remains no-op; prove no direct ready `getRecording(rerecordSourceRecordingId)` or `invalidReason` block.

### Step 4: Start Validation Adapter
Delete RS-4; call resolver before capture and return `segmentContext` or throw existing generic error; preserve double-start guard, pre-capture validation, capture discard/save failure; stale-check current store identity before invalidation.

### Step 5: Save Refresh Reuse
Delete RS-5; replace inline projection with `await refreshSession()`; preserve `finishWorkflowRecording`, recording transitions, catch path, and success messages; prove no direct `getRecentSheetSession(sheetId)` or `listRecordingMetadata()` in `stopSheetRecording`.

## 7. Async / State / Side-Effect Safety
The resolver must be pure: service reads plus result return only, no store/message/state writes. Every async resolver call must capture identity before await and verify it after await before writing. Existing workflow-store actions remain the only rerecord-state writers. Validation stays before capture; discard stays after failed capture start; finish stays after save. Avoid unstable effect deps unless necessary.

If these cannot be preserved, the plan is blocked.

## 8. Verification Before Review Handoff
Required commands:
```bash
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-controls.test.tsx
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-recording-workflow-store.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/controls/sheet-practice-controls.tsx tests/unit/sheet-practice-controls.test.tsx
```

Required deletion proofs:
```bash
rg "getRerecordSourceInvalidReason" src/components/sheet-practice/controls/sheet-practice-controls.tsx
rg "getRecentSheetSession\(sheetId\)|listRecordingMetadata\(" src/components/sheet-practice/controls/sheet-practice-controls.tsx
```

Required review gates: changed-file Code Health must not decline; no new infrastructure/browser import, public API, out-of-scope file, or new helper file; retired surface list must match actual diff.

Optional commands only if touched behavior warrants them:
```bash
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-segment-recording.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-recording-review.spec.ts
```

## 9. Final Coding Agent Handoff
Edit only `sheet-practice-controls.tsx` and focused controls tests. Create at most one local pure resolver plus internal result type. Delete RS-1 through RS-5 and prove deletion with the listed `rg` checks. Preserve public props, query mapping, visible messages, store ownership, and pre-capture validation. Do not touch selector, measure-grid, ReferencePanel, browser defaults, bar count-in, routes, schema, storage, harness globals, or new files. Run focused unit tests, typecheck, scoped lint, and CodeScene no-decline check. Report deletion proof, stale-guard proof, tests, and CodeScene evidence. If this requires out-of-scope work, stop and report `PLAN_BLOCKED`.
