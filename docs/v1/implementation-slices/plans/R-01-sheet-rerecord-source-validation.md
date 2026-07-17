# R-01 Sheet Rerecord Source Validation Refactor Plan

> Execution skill: use `superpowers:executing-plans` only after this revision is independently approved and merged. Execute in the primary checkout at `C:\Users\wsuto\metronome`; do not create a worktree.

## Plan status

- Plan id: `R-01-sheet-rerecord-source-validation`
- Lifecycle: `revision-proposed`
- Revision: `4`
- Planning output only; this file does not authorize business-code changes
- Candidate source: CodeScene project `82175`, job `6845237`
- Boundary decision: `docs/refactor/src-debt-forensics-2026-07-17/02-sheet-practice-boundary-review.md`
- Supersedes revision 3 after exact-HEAD review rejected its two new module exports as net external production-surface growth

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
- In scope: replace branch-heavy Practice Again hydration, mounted ready-source revalidation, and pre-start Record Again validation with small top-level private functions inside `sheet-practice-controls.tsx`; add focused component behavior-equivalence tests.
- Production scope: modify exactly one existing file. Add no production file and export no new production value.
- Tests support the `src` refactor. They are not a test-debt cleanup stage.
- There is no single-file change limit and no mandatory physical line reduction. File/surface accounting and CodeScene improvement remain hard gates.
- Out of scope: selector/editor work, recording start/stop transaction redesign, services, repositories, store, browser adapters, persistence, unrelated tests, and every other CodeScene candidate.

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
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | Locate the two existing private helpers and phase-specific branch chains |
| Recording services and workflow store | Reject moving policy into I/O/state owners; reuse types, reasons, calls, and effects |
| `tests/unit/sheet-practice-controls.test.tsx` | Establish supported outcomes and injected-service ordering |
| `tests/e2e/sheet-segment-recording.spec.ts` | Identify the browser workflow proof to rerun unchanged |
| Discarded v2 patch `f125bdc5071aec41a7d92ae65a29b49c9bcd4fb1` | Establish that CodeScene improvement alone did not prove behavior/surface correctness |
| Revision-3 commit `96ef9bb289021e756d1db59ab284f8baddb1df2b` review | Establish that moving private local functions behind new exports grows external production surface |
| Independent zero-export CodeScene diagnosis | Establish one-file feasibility, file-level risk, and the need to remove the physical net-line-reduction hard gate |

## Repo Map Evidence

| Search | Finding | Decision |
| --- | --- | --- |
| `rg -n "segmentContextsMatch|getRerecordSourceInvalidReason|hydratePracticeAgainSource|validateRecordAgainSource" src tests` | The two helpers and target phases exist only in controls | Keep all replacements private in the same file; retire/narrow every named old surface |
| `rg -n "SheetPracticeRerecordSource|SheetPracticeRerecordUnavailableReason|source-recording-missing|source-segment-missing|source-segment-invalid|selection-changed" src tests` | Existing store types/reasons already define the vocabulary | Reuse; add no reason model |
| `rg -n "RecordingController|use[A-Za-z]*Recording|recording-controller|rerecord" src/components src/lib src/services src/stores` | Existing controllers own other workflows or I/O | Add no controller, hook, service, state machine, or module |
| `rg -n "SheetPracticeControls|PracticeSegmentSelectorPanel" src tests` | Selector complexity is independently owned | Exclude selector work |
| `rg -n "Record again|Practice Again" tests/e2e` | Existing E2E covers the real workflow | Rerun it; do not edit E2E |

## Existing Primitive Search

| Need | Existing primitive | Decision |
| --- | --- | --- |
| Convert a live segment to saved context | `createSheetRecordingSegmentContext(...)` | Reuse exactly |
| Source and reason vocabulary | `SheetPracticeRerecordSource`, `SheetPracticeRerecordUnavailableReason` | Reuse exactly |
| Persisted recording lookup | injected `SheetRecordingService.getRecording(...)` | Keep at current component call sites |
| Live segment lookup | injected `PracticeSegmentService.getSegment(...)` | Keep at current component call sites |
| Store transitions | existing workflow-store actions | Keep in component |
| Ready-recording inspection | local `getRerecordSourceInvalidReason(...)` | Narrow/rename; do not create an exported replacement |
| Context equality | local `segmentContextsMatch(...)` | Preserve exact implementation and private visibility |
| Validation library | none needed | Use private TypeScript discriminated results; add no dependency |

## Revision history and invalidated evidence

Revision 1 failed the CodeScene target after its allowed correction and was removed. Revision 2 produced an uncommitted two-file candidate that improved controls from local `6.22` to `6.74`, removed both target complex-method findings, gave the helper `10.0`, and passed CodeScene, tests, lint, typecheck, build, and Playwright `[chromium]` E2E. It still failed independent review because mounted behavior changed and four new exports replaced zero exported entry points.

Revision 3 corrected the behavior matrix and reduced the module exports to two. Exact commit/blob/hash review still blocked it: two private local helpers do not justify two new exported module entry points. All revision-2 and revision-3 implementation evidence is invalid for promotion.

Revision 4 therefore keeps the refactor inside one production file with zero new exports. It also drops the physical net-line-reduction hard requirement: moving policy into readable private functions in the same file may hold or slightly grow LOC. Unaccounted production growth, CodeScene decline, or a complex replacement helper still fails closed.

## Debt root

The component correctly owns I/O and side effects, but source-integrity policy is branch-heavy across three phases:

1. Practice Again hydration validates a navigation recording and return segment.
2. The mounted effect revalidates a ready source without enforcing the current selection.
3. Pre-start validation enforces the current selection before Record Again begins.

Mounted and pre-start deliberately have different preconditions. Revision 4 shares only their genuine base checks and uses phase-specific private selectors; it does not force them through a common result policy.

## Behavior contract and service ordering

| Scenario | Mounted effect | Pre-start validation |
| --- | --- | --- |
| Workflow sheet differs, status is not ready, or source is absent | Return before lookup; do not invalidate | Invalidate `selection-changed`, throw the exact existing error before lookup |
| Source `recordingId` is empty | Return before lookup; do not invalidate | Preserve legacy behavior: look up that id, then use the persisted-recording result |
| Source sheet differs from current sheet | Still look up; persisted-recording inspection invalidates `sheet-mismatch` | Invalidate `selection-changed` and throw before lookup |
| Active segment differs from source context | Still look up; a valid recording leaves source ready | Invalidate `selection-changed` and throw before lookup |
| Persisted recording is missing, wrong type, wrong sheet, or has missing/mismatched context | Look up first, then invalidate the existing reason | Look up first, then invalidate the same reason and throw |

Hydration/live-segment behavior also stays unchanged:

- blank navigation source id clears `no-source-recording` before lookup;
- missing/non-sheet/wrong-sheet recording retains the current reason and message;
- missing persisted context clears `no-segment-context`;
- nonblank mismatched return segment invalidates `selection-changed`;
- callers preserve their current active-segment clearing behavior;
- pre-start wrong-sheet live segment remains `sheet-mismatch`;
- hydration adds no explicit live-segment sheet policy and continues to use context equivalence;
- cancellation, unexpected service failures, messages, and the exact Record Again error stay at current call sites.

## Private helper contract

All result types and functions remain unexported top-level declarations in `sheet-practice-controls.tsx`. No sibling module is added.

| Private function | Responsibility | Old surface retired/narrowed |
| --- | --- | --- |
| `selectWorkflowReadySource(...)` | Common workflow-sheet/status/source checks only | Duplicate base checks inside mounted and pre-start guards |
| `selectMountedRerecordSource(...)` | Apply mounted's additional nonempty-recording-id requirement | Mounted effect early guard |
| `selectPreStartRerecordSource(...)` | Apply pre-start source-sheet and active-segment requirements | Compound guard in `validateRecordAgainSource` |
| `inspectSheetRecording(...)` | Common missing/type/current-sheet recording checks | Duplicate branches in hydration and ready-recording inspection |
| `inspectPracticeAgainSource(...)` | Hydration-only persisted-context and return-segment checks | Inline hydration recording/context/return chain |
| `inspectReadyRerecordSourceRecording(...)` | Source-sheet and persisted-context equivalence after lookup | `getRerecordSourceInvalidReason(...)` |
| `inspectRerecordSourceSegment(...)` | Phase-discriminated missing/sheet/conversion/equality checks | Hydration and pre-start live-segment chains |
| `segmentContextsMatch(...)` | Exact existing JSON comparison | Existing helper retained/moved, not duplicated |

The two selectors may call `selectWorkflowReadySource(...)`; they must not return a nullable policy for the caller to interpret. `inspectRerecordSourceSegment(...)` takes an explicit discriminated input:

```ts
type SegmentInspectionInput =
  | { kind: "hydration"; segment; sourceContext }
  | { kind: "pre-start"; segment; sourceContext; sheetId };
```

Constraints:

- zero new export, file, barrel, class, hook, service, controller, store, adapter, or public type;
- no generic operation router; callers invoke the phase-specific private function directly;
- no callback injection, nullable/optional policy, boolean mode flag, `Object.assign`, spread-based policy construction, readiness serialization, factory/object-method wrapper, or dynamic dispatch;
- no I/O, store action, React state, message formatting, or expected-state throw inside inspection helpers;
- every new/narrowed private function remains below CodeScene CC 8;
- caller-specific effects remain explicit.

## Shared Primitive Call-Site Audit

| Proposed private primitive | Old call sites | Migrated call sites | Deletion/narrowing proof | Claim |
| --- | ---: | ---: | --- | --- |
| `selectWorkflowReadySource(...)` | 2 guards | mounted and pre-start selectors | Common sheet/status/source terms disappear from both caller guards | Genuine two-caller base primitive; phase checks remain separate |
| `inspectSheetRecording(...)` | Hydration and ready-recording helper | both inspectors | Duplicate missing/type/current-sheet branches disappear | Genuine two-caller recording primitive |
| `inspectRerecordSourceSegment(...)` | 2 live-segment chains | hydration and pre-start | Both construction/comparison chains disappear from target methods | Phase difference is explicit, not nullable |

## New Surface Budget

Every private function in the contract has a same-PR retirement/narrowing target in the table above. Runtime external production surface remains unchanged at zero; no importable entry point is added. Private callable surface is budgeted by the eight-for-eight mapping, including the existing comparator as retained rather than new.

If an extra helper is needed, an old surface must be named and independently accepted before coding continues. A helper introduced only to lower a metric is unbudgeted surface and blocks the stage.

## Required Retired Surfaces

| Required deletion/narrowing | Replacement | Exact proof |
| --- | --- | --- |
| Local `getRerecordSourceInvalidReason(...)` name/body | ready-recording inspector | `rg` finds no old definition or call |
| Hydration recording/context/return branch chain | sheet/practice-again inspectors | Target method retains effects, not inspection policy |
| Mounted ready guard | base + mounted selectors | Mounted effect handles result and lookup only |
| Pre-start compound guard | base + pre-start selectors | Pre-start handles invalidation/throw only |
| Hydration live conversion/comparison chain | segment inspector | Target method handles result effects only |
| Pre-start live conversion/comparison chain | segment inspector | Target method handles result effects only |
| Duplicate context comparator | retained single private comparator | `rg` finds exactly one definition |

## Production and test scope

### Modify production

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`

No other `src/**` file is approved. Physical net line reduction is not required; every added line must belong to a budgeted helper or necessary result handling. Unexpected production growth is a stop condition.

### Modify supporting tests only

- `tests/unit/sheet-practice-controls.test.tsx`

Do not add a helper test file because private implementation details are not a public test surface. Preserve existing tests and add only the caller-level behavior/order cases missing from the matrix. Do not reorganize fixtures or clean test debt. Rerun the existing E2E unchanged.

## Tests Required

| Behavior | Component-level evidence |
| --- | --- |
| Practice Again missing/type/sheet/context/return outcomes | Existing hydration matrix remains green |
| Mounted base guard and empty id return before lookup/invalidation | Focused fake-service assertions |
| Mounted active mismatch still looks up and keeps a valid source ready | New focused test |
| Mounted source-sheet mismatch looks up then invalidates `sheet-mismatch` | New focused test |
| Pre-start active/source-sheet mismatch rejects before lookup as `selection-changed` | Focused stale-state click/race tests through the existing control surface |
| Pre-start empty id still looks up and reports the persisted-recording failure | Focused fake-service assertion |
| Persisted recording/context reasons and live-segment outcomes | Existing matrix plus only missing assertions |
| Exact Record Again error/capture ordering | Existing controls tests remain green |
| No new dependency/boundary | `tests/unit/architecture-boundaries.test.ts` |
| Real first-take/Record Again/second-take workflow | Existing `tests/e2e/sheet-segment-recording.spec.ts` in Playwright `[chromium]` |

## Boundary impact

- UI to browser/infrastructure imports added: no.
- Domain to UI/service imports added: no.
- Service/repository/store/persistence changes: no.
- Dependency or configuration changes: no.
- External production callable surface delta: zero.

## Implementation tasks

### Task 0: clean branch and baseline

After this revision is merged, fetch `origin/main`, prove a clean primary checkout, and create `codex/r01-sheet-rerecord-source-validation-v4` from the exact refreshed main commit. Do not reuse any older R01 branch. Record controls CodeScene score `6.22` and findings, then run the existing controls unit file as a green baseline.

### Task 1: green behavior characterization lock

Add the missing mounted/pre-start/empty-id service-order cases to `sheet-practice-controls.test.tsx` before production changes, then run the complete controls unit file. Every new assertion must pass against the untouched legacy implementation: these tests characterize existing behavior for a structural-only refactor, so an honest RED state is neither expected nor permitted.

Record the passing characterization count before editing production code. After each extraction step, rerun the same file and keep it green. A failing characterization means the extraction changed behavior and must be corrected before continuing. If a test requires exporting a helper, observing private structure, adding a test-only production seam, or inventing new behavior, stop; the zero-external-surface contract takes priority and the case must be exercised through the component.

### Task 2: add private primitives and migrate hydration

Add only the budgeted private result types/functions. Migrate hydration while keeping id normalization, lookup, cancellation, store effects, and messages in place. Run the controls unit file and CodeScene after this step.

### Task 3: migrate mounted and pre-start paths

Use the two phase-specific selectors directly. Preserve the lookup-order matrix, use the ready-recording inspector only after lookup, migrate both live-segment chains, and delete/narrow every required old surface. Run controls and architecture unit tests.

### Task 4: CodeScene and structural gate

Required result:

- controls improves above local `6.22`;
- `hydratePracticeAgainSource` and `validateRecordAgainSource` disappear from complex-method findings;
- no private helper reaches CC 8 or receives a new complex-method finding;
- no file-level CodeScene smell is worsened merely by moving complexity;
- staged safeguard and branch change-set quality gates pass;
- external production surface delta is zero;
- only the one approved production file changes;
- all required retired surfaces are absent;
- any production LOC growth is fully accounted to the fixed private-helper ledger.

One small correction inside controls is allowed. It cannot add a helper, export, file, callback wrapper, or policy option. If the same CodeScene requirement still fails, stop and revise the plan again.

### Task 5: repository verification and promotion

Run targeted lint/tests, architecture tests, full unit tests, typecheck, build, and the existing E2E. Let the normal pre-commit hook run; do not use `--no-verify`.

If `validate:debt-gates` refuses the first implementation commit solely because it requires PR/reviewer evidence that cannot exist before a commit, do not fabricate an event, stale review, empty-PR review, or evidence string. Treat that as a separate workflow-gate defect. Repair it in a separately scoped and reviewed prerequisite PR, or stop for explicit authorization; never hide it inside R-01.

Open the implementation PR with exact scope, retirement, CodeScene before/after, test, hook, and E2E evidence. Request `@codex review`; do not use ChatGPT web review. Resolve actionable feedback, require CI green, merge, and return the primary checkout to clean updated `main`.

## Verification commands

```powershell
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/controls/sheet-practice-controls.tsx tests/unit/sheet-practice-controls.test.tsx
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-controls.test.tsx
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-segment-recording.spec.ts
```

## No-Go / deferrals

- selector/editor/CRUD complexity;
- recording start/stop transaction redesign;
- browser-service default cleanup;
- services, repositories, store, schema, persistence, dependencies, or configuration;
- test fixture or E2E cleanup;
- any production file beyond controls or any new export;
- generic operation router, callbacks, nullable/optional policy, boolean mode, serialized tuple, object/factory wrapper, or dynamic dispatch;
- physical line-count compression that obscures policy.

## Acceptance criteria

R-01 is complete only when all are true:

1. Revision 4 has immutable plan identity and independent `PLAN_REVIEW_PASS` before coding.
2. The implementation branch is fresh from the main commit containing the approved revision.
3. Only controls changes in production; no new export/file/public type or external callable surface exists.
4. Every private helper matches the fixed budget and every required old surface is deleted/narrowed.
5. Mounted/pre-start behavior and lookup order match the matrix, including active mismatch, source-sheet mismatch, and empty recording id.
6. Hydration/live-segment reasons, store transitions, messages, cancellation, and exact errors remain equivalent.
7. Test changes are caller-level behavior proof only; no helper export or test-only production seam exists.
8. Controls improves from local CodeScene `6.22`; both target methods disappear from complex findings; no replacement helper or file-level smell worsens; staged/change-set gates pass.
9. Any production LOC growth is fully explained by the approved private-helper ledger; there is no single-file or net-line-reduction hard limit.
10. Targeted/full repository verification, unchanged recording E2E, normal hooks, independent code review, `@codex review`, and CI pass.
11. The PR merges and the primary checkout returns to clean updated `main`.

## Completion output

Return exactly one of:

- `STAGE_READY` when every acceptance criterion has current requirement-by-requirement evidence; or
- `STAGE_BLOCKED` with the failed criterion and last verified state.

Do not report `STAGE_READY` from narrative confidence alone.
