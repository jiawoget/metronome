# R-01 Sheet Rerecord Source Validation Refactor Plan

> Execution skill: use `superpowers:executing-plans` only after this revision is independently approved and merged. Execute in the primary checkout at `C:\Users\wsuto\metronome`; do not create a worktree.

## Plan status

- Plan id: `R-01-sheet-rerecord-source-validation`
- Lifecycle: `revision-proposed`
- Revision: `3`
- Planning output only; this file does not authorize business-code changes
- Candidate source: CodeScene project `82175`, job `6845237`
- Boundary decision: `docs/refactor/src-debt-forensics-2026-07-17/02-sheet-practice-boundary-review.md`
- Supersedes revision 2 after the uncommitted v2 candidate passed CodeScene but failed independent behavior and surface review

`PLAN_READY` is the planner verdict only. Coding may start only after the tracked plan commit has an immutable identity and an independent `PLAN_REVIEW_PASS` under the Metronome workflow.

## Verdict

PLAN_READY

## Skill Evidence

- `.agents/skills/metronome-workflow/SKILL.md`
- `skills/metronome_planner.md`
- `skills/metronome_reviewer.md`
- `docs/architecture/debt-gate-map.md`
- `superpowers:writing-plans`
- `superpowers:receiving-code-review`
- CodeScene guiding and safeguarding skills

## Scope

- Slice/stage: `R-01-sheet-rerecord-source-validation`
- In scope: extract Practice Again hydration inspection, phase-specific ready-source selection, persisted-recording inspection, and live-segment inspection from `sheet-practice-controls.tsx` into one pure sibling module with exactly two exported production functions; add direct behavior-equivalence tests.
- Out of scope: selector/editor work, recording start/stop transaction redesign, services, repositories, store, browser adapters, persistence, unrelated tests, and every other CodeScene candidate.
- Production files: exactly one modified file and one new sibling file. There is no single-file change limit, but any third production file requires a new reviewed plan.
- Tests support the production refactor. They are not a test-debt cleanup stage.

## Inputs Read

| File or source | Why read |
| --- | --- |
| User decisions in this task | Establish `src/**`-first scope, primary-checkout-only execution, no single-file hard limit, and GitHub `@codex review` instead of ChatGPT web review |
| CodeScene project `82175`, job `6845237` | Establish the target and web debt evidence |
| `.agents/skills/metronome-workflow/SKILL.md` | Apply immutable-plan, independent-review, CodeScene, and promotion gates |
| `skills/metronome_planner.md` and `skills/metronome_reviewer.md` | Apply repo-map, reuse, retirement, net-surface, behavior-equivalence, and review hard gates |
| `docs/architecture/debt-gate-map.md` | Apply shared-primitive and boundary rules |
| `docs/agent-index/05b-practice-controls.md` and `docs/v1/05b-practice-controls.md` | Preserve controls ownership and recording/metronome boundaries |
| Plans `P1-10`, `P1-11`, and `P2-06` | Preserve rerecord state, Record Again, and Practice Again contracts |
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | Locate the two local helpers and phase-specific branch chains |
| `src/components/sheet-practice/controls/types.ts` | Confirm the current service injection seam remains sufficient |
| Recording service exports and workflow store | Reject moving policy into I/O or state owners; reuse existing types and reasons |
| `tests/unit/sheet-practice-controls.test.tsx` | Establish supported outcomes, side effects, and service-call ordering |
| `tests/e2e/sheet-segment-recording.spec.ts` | Identify the existing browser workflow proof to rerun unchanged |
| Uncommitted v2 staged patch `f125bdc5071aec41a7d92ae65a29b49c9bcd4fb1` | Establish that CodeScene improvement alone did not prove behavior or surface correctness |
| Independent v2 pre-review and diagnosis | Establish the mounted/pre-start contract split and two-export ceiling |

## Repo Map Evidence

| Search | Finding | Decision |
| --- | --- | --- |
| `rg -n "segmentContextsMatch|getRerecordSourceInvalidReason|hydratePracticeAgainSource|validateRecordAgainSource" src tests` | The two helpers and target phases exist only in controls; recording inspection has two ready callers and hydration has a parallel check chain | Extract only these rules and retire/narrow every named old surface |
| `rg -n "SheetPracticeRerecordSource|SheetPracticeRerecordUnavailableReason|source-recording-missing|source-segment-missing|source-segment-invalid|selection-changed" src tests` | Existing store types and reasons already define the policy vocabulary | Reuse; add no reason model |
| `rg -n "RecordingController|use[A-Za-z]*Recording|recording-controller|rerecord" src/components src/lib src/services src/stores` | Existing controllers own other workflows or I/O | Do not add a controller, hook, service, or state machine |
| `rg -n "SheetPracticeControls|PracticeSegmentSelectorPanel" src tests` | Selector complexity is adjacent but independently owned | Exclude selector work |
| `rg -n "Record again|Practice Again" tests/e2e` | Existing recording E2E covers the real workflow | Rerun it; do not edit E2E |

## Existing Primitive Search

| Need | Existing primitive | Decision |
| --- | --- | --- |
| Convert a live segment to saved context | `createSheetRecordingSegmentContext(...)` | Reuse exactly |
| Source and reason vocabulary | `SheetPracticeRerecordSource`, `SheetPracticeRerecordUnavailableReason` | Reuse exactly |
| Persisted recording lookup | injected `SheetRecordingService.getRecording(...)` | Keep in component |
| Live segment lookup | injected `PracticeSegmentService.getSegment(...)` | Keep in component |
| Store transitions | existing workflow-store actions | Keep in component |
| Recording/context inspection | local helper plus inline hydration chain | Extract and retire old copies |
| Context equality | local `JSON.stringify` comparator | Move the exact semantics; do not redefine equality |
| Validation library | none needed | Use TypeScript discriminated operations/results; add no dependency |

## Revision trigger and invalidated evidence

Revision 1 failed its CodeScene target after one correction and was fully discarded. Revision 2 froze a four-export design, then produced an uncommitted candidate with these measurements:

| Evidence | v2 result |
| --- | --- |
| Controls Code Health | `6.22` baseline to `6.74` |
| Target methods | hydration and pre-start no longer reported as complex |
| New helper | `10.0`, no complex method |
| CodeScene change-set gate | passed |
| Targeted/full unit, architecture, lint, typecheck, build, E2E | passed; E2E used Playwright `[chromium]` |
| Production diff | controls net `-65`; helper `+195`; four exported helpers |

That evidence is invalid for promotion because independent pre-review found two P1 defects:

1. The shared ready selector rejected active-segment and source-sheet mismatches before lookup. The legacy mounted effect must still load in both cases; a source-sheet mismatch is invalidated as `sheet-mismatch` only after persisted-recording inspection.
2. Four new exported production helpers replaced two local helpers. The debt reviewer makes net production-surface growth an immediate `CHANGES_REQUIRED`.

The v2 candidate was never committed and has been removed. Revision 3 changes the contract; it cannot reuse v2 review or verification evidence.

## Debt root

The component owns the correct I/O and effects, but branch-heavy source-integrity policy is duplicated across three phases:

1. Practice Again hydration validates a navigation recording and return segment.
2. The mounted effect revalidates a ready source without enforcing current selection.
3. Pre-start validation enforces current selection before starting Record Again.

The previous design incorrectly treated phases 2 and 3 as one invariant set. Revision 3 shares only implementation primitives while representing mounted and pre-start selection as distinct explicit operations.

## Behavior contract and service ordering

| Scenario | Mounted effect | Pre-start validation |
| --- | --- | --- |
| Workflow sheet differs, status is not ready, or source is absent | Return before lookup; do not invalidate | Invalidate `selection-changed`, throw the exact existing error before lookup |
| Source `recordingId` is empty | Return before lookup; do not invalidate | Preserve legacy behavior: perform lookup with that id, then use the resulting persisted-recording reason |
| Source sheet differs from current sheet | Still perform lookup; persisted-recording inspection invalidates `sheet-mismatch` | Invalidate `selection-changed` and throw before lookup |
| Active segment differs from source context | Still perform lookup; a valid recording leaves source ready | Invalidate `selection-changed` and throw before lookup |
| Persisted recording is missing, wrong type, wrong sheet, or has missing/mismatched context | Lookup first, then invalidate the existing reason | Lookup first, then invalidate the same reason and throw |

Hydration and live-segment behavior remains unchanged:

- blank navigation source id clears with `no-source-recording` before lookup;
- missing/non-sheet/wrong-sheet persisted recording uses the current reason and message;
- missing persisted context clears with `no-segment-context`;
- nonblank mismatched return segment invalidates `selection-changed`;
- missing live segment clears active selection only where the current caller does so;
- pre-start wrong-sheet live segment remains `sheet-mismatch`;
- hydration has no added explicit live-segment sheet policy and continues to use context equivalence;
- unexpected service failures, cancellation, messages, and the exact Record Again error remain at current call sites.

## Helper contract

The new sibling module exports exactly two runtime functions:

1. `inspectRerecordSourceOperation(...)`
2. `inspectRerecordSourceSegment(...)`

`inspectRerecordSourceOperation(...)` receives an explicit discriminated operation:

```ts
type RerecordSourceOperation =
  | { kind: "practice-again"; recording; sheetId; returnSegmentId }
  | { kind: "mounted-selection"; workflowState; sheetId }
  | { kind: "pre-start-selection"; workflowState; sheetId }
  | { kind: "ready-recording"; recording; sheetId; source };
```

The operation type, result types, and delegates remain private. A single exported function may use compile-time overloads for type narrowing, but overloads must map to one runtime implementation and cannot create extra exported values.

Private delegates are fixed to these responsibilities:

- `inspectPracticeAgainSource(...)`
- `selectMountedSource(...)`
- `selectPreStartSource(...)`
- `inspectReadyRecording(...)`
- `inspectSheetRecording(...)`
- `segmentContextsMatch(...)`

The operation router only switches on `operation.kind`. It must not interpret nullable strategy fields, callbacks, serialized readiness data, or dynamic method names.

`inspectRerecordSourceSegment(...)` accepts an explicit discriminated phase instead of an optional policy:

```ts
inspectRerecordSourceSegment(
  | { kind: "hydration"; segment; sourceContext }
  | { kind: "pre-start"; segment; sourceContext; sheetId }
)
```

Constraints:

- no third export, barrel export, exported type, class, hook, service, controller, store, or adapter;
- no callback injection, nullable policy, boolean mode flag, `Object.assign`, spread-based optional-policy construction, readiness serialization, factory/object-method wrapper, or dynamic dispatch;
- no I/O, store access, React state, message formatting, or throwing for expected invalid states in the helper;
- preserve exact context equality semantics;
- every router/delegate stays below CodeScene cyclomatic complexity 8;
- caller-specific effects remain explicit in controls.

## Shared Primitive Call-Site Audit

| Proposed shared surface | Old call sites found | Old call sites migrated | Old implementations deleted/narrowed | Claim |
| --- | ---: | ---: | --- | --- |
| `inspectRerecordSourceOperation(...)` | 4 phases: hydration, mounted selection, pre-start selection, ready-recording inspection used by mounted/pre-start | all | Hydration recording/return checks, both selection guards, and local ready-recording helper | One exported entry with explicit phase contracts; no shared nullable policy |
| Private `inspectSheetRecording(...)` | Hydration basic recording checks and ready-recording helper | both | Duplicate missing/type/sheet branches | Genuine shared primitive with two old call sites |
| `inspectRerecordSourceSegment(...)` | Hydration and pre-start live-segment chains | both | Both construction/comparison chains and local comparator call sites | One exported segment policy with explicit phase input |

## New Surface Budget

| New or moved surface | Why needed | Old surface retired or narrowed in same PR |
| --- | --- | --- |
| Exported `inspectRerecordSourceOperation(...)` | One runtime entry for four explicit source operations | Local `getRerecordSourceInvalidReason(...)` plus hydration and both ready-selection branch surfaces |
| Private `inspectPracticeAgainSource(...)` | Hydration-only recording/context/return policy | Inline hydration recording/context/return branch chain |
| Private `selectMountedSource(...)` | Preserve mounted's weaker selection contract | Mounted effect's early guard |
| Private `selectPreStartSource(...)` | Preserve pre-start's stronger selection contract | Compound guard in `validateRecordAgainSource` |
| Private `inspectReadyRecording(...)` | Persisted recording/context result after lookup | Local `getRerecordSourceInvalidReason(...)` |
| Private `inspectSheetRecording(...)` | Share only missing/type/sheet checks | Duplicate checks narrowed out of hydration and the old ready helper |
| Moved private `segmentContextsMatch(...)` | Preserve exact comparison semantics | Delete the local controls helper |
| Exported `inspectRerecordSourceSegment(...)` | Share live conversion/equality while keeping phase difference explicit | Hydration and pre-start live-segment branch chains |

Externally callable production surface is neutral: two local production helpers are removed and exactly two sibling-module functions are exported. Each private delegate replaces or narrows a named old decision surface. No new public business path exists.

## Required Retired Surfaces

| Required deletion/narrowing | Replacement | Exact proof |
| --- | --- | --- |
| Local `getRerecordSourceInvalidReason(...)` | ready-recording operation delegate | `rg` finds no old definition or call |
| Local `segmentContextsMatch(...)` | moved private comparator | `rg` finds it only in the helper |
| Hydration recording/context/return branch chain | practice-again operation | Controls retains effects, not inspection branches |
| Mounted ready guard | mounted-selection operation | Controls handles only result and lookup |
| Pre-start compound ready guard | pre-start-selection operation | Controls handles invalidation/throw only |
| Hydration live conversion/comparison chain | hydration segment operation | Controls handles result effects only |
| Pre-start live conversion/comparison chain | pre-start segment operation | Controls handles result effects only |

If any required surface remains alongside its replacement, or a third exported production value appears, the refactor fails the debt claim.

## Production scope

### Modify

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - Replace only the contracted inspection branches.
  - Preserve service calls, ordering, store transitions, messages, cancellation, and exact errors.
  - Finish with a net line reduction.

### Add

- `src/components/sheet-practice/controls/sheet-rerecord-source.ts`
  - Hold the pure two-export contract and private delegates.

No other production file is approved. The absence of a single-file hard limit does not waive file accounting, surface accounting, or behavior equivalence.

## Supporting test scope

### Add

- `tests/unit/sheet-rerecord-source.test.ts`
  - Directly characterize every operation and segment outcome.

### Modify only for focused caller evidence

- `tests/unit/sheet-practice-controls.test.tsx`
  - Preserve the existing matrix.
  - Add the minimum caller-level service-order assertions for the mounted/pre-start differences.
  - Do not reorganize fixtures or clean unrelated test debt.

The existing E2E file is rerun unchanged.

## Tests Required

| Behavior | Evidence |
| --- | --- |
| Practice Again missing/type/sheet/context/return outcomes | Direct helper table plus existing controls cases |
| Mounted base guard returns before lookup/invalidation | Direct operation tests and one focused caller assertion |
| Mounted active mismatch still looks up and preserves valid ready source | Focused controls test |
| Mounted source-sheet mismatch looks up then invalidates `sheet-mismatch` | Focused controls test |
| Pre-start active/source-sheet mismatch rejects before lookup as `selection-changed` | Direct and controls evidence |
| Empty recording id differs by phase exactly as legacy code | Direct operation tests; caller assertion if existing fixture permits without broad setup |
| Persisted recording and context reasons | Direct ready-recording table plus controls cases |
| Hydration/pre-start live-segment phase difference | Direct segment table plus controls cases |
| No forbidden dependency | `tests/unit/architecture-boundaries.test.ts` |
| Real first-take/Record Again/second-take workflow | Existing `tests/e2e/sheet-segment-recording.spec.ts` in Playwright `[chromium]` |

## Boundary impact

- UI to browser/infrastructure imports added: no.
- Domain to UI/service imports added: no.
- Service or repository passthrough added: no.
- Store or persistence changes: no.
- Dependency changes: no.

## Implementation tasks

### Task 0: clean branch and baseline

After this plan is merged:

1. Fetch `origin/main` and prove local `main`, `origin/main`, and the new branch base are identical.
2. Create `codex/r01-sheet-rerecord-source-validation-v3`; do not reuse either older R01 branch.
3. Run CodeScene review/score on controls and record the local `6.22` baseline plus target findings.
4. Run the existing controls unit file once. A baseline failure is `STAGE_BLOCKED`.

### Task 1: TDD red characterization

Create the direct helper test first. Cover the complete behavior matrix, including the mounted/pre-start differences and empty recording id. The acceptable red state is only the missing planned module/export.

### Task 2: implement the pure helper

Add the two exports and fixed private delegates. Make direct tests green without touching controls. Run CodeScene on the helper before integration; no method may reach CC 8.

### Task 3: migrate hydration

Replace inspection branches while preserving source-id normalization, service calls, cancellation, clear/invalidate mapping, active-segment effects, ready-state effects, and messages. Run direct and controls unit files.

### Task 4: migrate mounted and pre-start paths

Use `mounted-selection` and `pre-start-selection` explicitly. Preserve the behavior/service-order table, then use `ready-recording` after lookup. Migrate both live-segment chains. Delete every required retired surface. Run direct and controls unit files.

### Task 5: CodeScene and structural gate

Required result:

- controls improves above `6.22`;
- `hydratePracticeAgainSource` and `validateRecordAgainSource` disappear from complex-method findings;
- helper has no method at CC 8 or above;
- staged CodeScene safeguard and change-set quality gates pass;
- controls has a net line reduction;
- exactly two production exports and no banned tactic exist;
- all required retired surfaces are absent.

One small correction inside the approved production files is allowed. It cannot add an export, callback wrapper, policy option, or another file. If the same requirement still fails, stop and revise the plan again.

### Task 6: repository verification and promotion

Run targeted lint/tests, architecture tests, full unit tests, typecheck, build, and the existing E2E. Let the normal pre-commit hook run; do not use `--no-verify`.

If `validate:debt-gates` refuses the first implementation commit solely because it requires PR/reviewer evidence that cannot exist before a commit, do not fabricate an event, stale review, empty-PR review, or evidence string. Treat that as a separate workflow-gate defect. Repair it in a separately scoped and reviewed prerequisite PR, or stop for explicit authorization; never hide it inside R-01.

Open the implementation PR with exact scope, retirement, CodeScene before/after, test, hook, and E2E evidence. Request `@codex review`; do not use ChatGPT web review. After actionable feedback is resolved, require CI green, merge, and return the primary checkout to clean updated `main`.

## Verification commands

```powershell
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/controls/sheet-practice-controls.tsx src/components/sheet-practice/controls/sheet-rerecord-source.ts tests/unit/sheet-rerecord-source.test.ts tests/unit/sheet-practice-controls.test.tsx
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-rerecord-source.test.ts tests/unit/sheet-practice-controls.test.tsx
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-segment-recording.spec.ts
```

## No-Go / deferrals

- selector/editor/CRUD complexity;
- `startSheetRecording` and `stopSheetRecording` transaction redesign;
- browser-service default cleanup;
- services, repositories, store, schema, persistence, dependencies, or configuration;
- test fixture or E2E cleanup;
- any third production file or third exported production value;
- hiding complexity through callbacks, nullable policy, optional policy, serialized tuples, object/factory wrappers, or dynamic dispatch.

## Acceptance criteria

R-01 is complete only when all are true:

1. Revision 3 has immutable plan identity and independent `PLAN_REVIEW_PASS` before coding.
2. The implementation branch is fresh from the main commit containing the approved revision.
3. The helper exports exactly the operation inspector and segment inspector; all delegates/types stay private.
4. Mounted and pre-start behavior and lookup order match the matrix, including active mismatch, source-sheet mismatch, and empty recording id.
5. Hydration and live-segment reasons, store transitions, messages, cancellation, and errors remain equivalent.
6. Every required old surface is deleted/narrowed and external production surface is neutral.
7. Only the two approved production files change; controls has a net line reduction; no single-file hard limit is invented.
8. Test changes are direct behavior proof only.
9. Controls improves from local CodeScene `6.22`; both target methods disappear from complex findings; helper has no complex method; staged/change-set gates pass.
10. Targeted and full repository verification, unchanged recording E2E, normal hooks, independent code review, `@codex review`, and CI pass.
11. The PR merges and the primary checkout returns to clean updated `main`.

## Completion output

Return exactly one of:

- `STAGE_READY` when every acceptance criterion has current requirement-by-requirement evidence; or
- `STAGE_BLOCKED` with the failed criterion and last verified state.

Do not report `STAGE_READY` from narrative confidence alone.
