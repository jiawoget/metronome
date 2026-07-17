# R-01 Sheet Rerecord Source Validation Refactor Plan

> Execution skill: use `superpowers:executing-plans` after this plan is approved and merged. Execute in the primary checkout at `C:\Users\wsuto\metronome`; do not create a worktree.

## Plan status

- Plan id: `R-01-sheet-rerecord-source-validation`
- Lifecycle: `revision-proposed`
- Revision: `2`, replacing the first implementation tactic after a fail-closed CodeScene result
- Planning output only; this file does not authorize business-code changes
- Candidate source: CodeScene project `82175`, job `6845237`
- Boundary decision: `docs/refactor/src-debt-forensics-2026-07-17/02-sheet-practice-boundary-review.md`

`PLAN_READY` below is the planner verdict only. It does not authorize coding. The tracked plan commit and immutable plan identity still require an independent Terra/Luna `PLAN_REVIEW_PASS` under the Metronome workflow.

## Verdict

PLAN_READY

## Skill Evidence

- Skill file read: `skills/metronome_planner.md`
- Workflow skill read: `.agents/skills/metronome-workflow/SKILL.md`
- Debt gate map read: `docs/architecture/debt-gate-map.md`
- Superpowers plan skill read: `superpowers:writing-plans`

## Scope

- Slice/stage: `R-01-sheet-rerecord-source-validation`
- In scope: extract Practice Again hydration, ready-source revalidation, and live-segment inspection from `sheet-practice-controls.tsx` into one pure sibling module with three explicit workflow-level entry points; add direct behavior-equivalence tests.
- Out of scope: segment selector, start/stop transaction redesign, services, repositories, store, browser adapters, persistence, unrelated test cleanup, and all other CodeScene candidates.

## Inputs Read

| File or source | Why read |
| --- | --- |
| User request in this task | Establish `src/**`-first scope, tests as supporting evidence, no single-file hard limit, primary-checkout-only workflow, and `@codex review` instead of ChatGPT web review |
| CodeScene project `82175`, job `6845237` | Establish target, web Code Health, friction, churn, LOC, and analyzed commit |
| `.agents/skills/metronome-workflow/SKILL.md` | Apply immutable-plan, independent-review, CodeScene, and promotion gates |
| `skills/metronome_planner.md` | Apply required repo-map, reuse, surface, retirement, boundary, and test schema |
| `docs/architecture/debt-gate-map.md` | Apply shared-primitive and architecture-boundary rules |
| `docs/agent-index/05b-practice-controls.md` | Confirm controls ownership and required unit/E2E surfaces |
| `docs/v1/05b-practice-controls.md` | Preserve recording/metronome independence and controls boundaries |
| `docs/v1/implementation-slices/04-practice-controls-upgrade.md` | Confirm related Pack 4 work remains outside this refactor |
| `docs/v1/implementation-slices/plans/P1-10-rerecord-workflow-state.md` | Preserve rerecord state/reason semantics and service/store boundaries |
| `docs/v1/implementation-slices/plans/P1-11-rerecord-record-again-action.md` | Preserve current Record Again validation, capture, and duplicate-start contracts |
| `docs/v1/implementation-slices/plans/P2-06-take-history-return-to-practice.md` | Preserve Practice Again query hydration and stale-target behavior |
| `package.json` | Verify repository scripts and confirm no dependency is needed |
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | Locate duplicated helpers, two validation phases, direct services, and state effects |
| `src/components/sheet-practice/controls/types.ts` | Verify current injected service seam remains sufficient and unchanged |
| `src/lib/sheet-practice/recording-service.ts` and `src/services/recording/index.ts` | Reject moving source eligibility into the capture/persistence service |
| `src/stores/sheet-practice-recording-workflow-store.ts` | Reuse existing reason/source types and synchronous state transitions |
| `src/components/recordings-review/use-recordings-review-controller.ts` and `src/lib/quick-metronome/recording-controller.ts` | Check controller patterns and reject a new controller for local pure inspection rules |
| `tests/unit/sheet-practice-controls.test.tsx` | Verify existing behavior matrix for hydration, validation, Record Again, and failure reasons |
| `tests/e2e/sheet-segment-recording.spec.ts` | Identify existing real workflow coverage that must be rerun without test-debt edits |

No generated primitive index was found. The focused repo-map searches below are therefore mandatory evidence.

## Repo Map Evidence

| Search | Command or source | Files found | Decision |
| --- | --- | --- | --- |
| Exact duplicated validation surfaces | `rg -n "segmentContextsMatch|getRerecordSourceInvalidReason|hydratePracticeAgainSource|validateRecordAgainSource" src tests` | Only `sheet-practice-controls.tsx`; two callers of `getRerecordSourceInvalidReason`, two live-context branch chains, and three context comparisons | Extract three explicit workflow inspectors backed by private shared primitives; delete/narrow the local copies |
| Existing rerecord reason/source policy | `rg -n "SheetPracticeRerecordSource|SheetPracticeRerecordUnavailableReason|source-recording-missing|source-segment-missing|source-segment-invalid|selection-changed" src tests` | Workflow store, controls, selector, workflow-store tests, controls tests | Reuse exported types/actions; do not add a new reason model |
| Controller/hook/service alternatives | `rg -n "RecordingController|use[A-Za-z]*Recording|recording-controller|rerecord" src/components src/lib src/services src/stores` | Quick recording controller, recordings-review hooks, workflow store, controls | Existing controllers own different workflows; a new async controller is rejected |
| Direct component boundary | `rg -n "SheetPracticeControls|PracticeSegmentSelectorPanel" src tests` | Viewer parent, controls, selector tests, controls tests | Selector remains an independent debt root and is excluded |
| Behavior-equivalence reasons | `rg -n "source-recording-missing|source-not-sheet|sheet-mismatch|selection-changed|source-segment-missing|source-segment-invalid|no-segment-context" tests/unit/sheet-practice-controls.test.tsx` | Existing controls test matrix around lines 1057–1248 plus pre-start failure cases | Preserve these tests; add direct pure-helper tests only |
| Browser workflow evidence | `rg -n "Record again|Practice Again" tests/e2e` | `sheet-segment-recording.spec.ts`; `sheet-recording-review.spec.ts` | Rerun `sheet-segment-recording.spec.ts`; do not edit E2E in R-01 |
| History coupling | `git log --format=%H -- <controls>` and the same for selector | 32 controls commits, 8 selector commits, 7 shared | Workflow adjacency exists, but CodeScene smells and tests prove separate debt roots |

## Existing Primitive Search

| Need | Search terms used | Existing primitive/library found | Files read | Decision |
| --- | --- | --- | --- | --- |
| Convert a live segment into saved recording context | `create*Segment*Context`, `segmentContext` | `createSheetRecordingSegmentContext(...)` | `sheet-practice-controls.tsx`, domain exports | Reuse |
| Represent invalid reasons and ready sources | `RerecordSource`, `RerecordUnavailableReason`, `invalidateRerecordSource` | Existing workflow-store types/actions | `sheet-practice-recording-workflow-store.ts` | Reuse |
| Inspect recording type, sheet, and saved context | `validate*Rerecord`, `inspect*Rerecord`, `getRerecordSourceInvalidReason` | Local `getRerecordSourceInvalidReason` plus an inline hydration branch chain; no shared module | controls and repo-wide `rg` results | Extract and retire old copies |
| Inspect live segment/context equality | `segmentContextsMatch`, `resolve*SegmentContext` | Local comparator plus duplicated hydration/start construction branches | controls and repo-wide `rg` results | Extract and retire old copies |
| Own async capture/session/store orchestration | `RecordingController`, `use*Recording`, `SheetRecordingService` | Existing controllers/services own persistence or other screens, not these pure rules | recording service, quick controller, review controller | No-go, with evidence: keep I/O and state at current call sites |
| Third-party validation library | `package.json` dependencies | No library is needed; TypeScript discriminated unions are sufficient | `package.json` | Reuse language primitives; add no dependency |

## Shared Primitive Call-Site Audit

| Proposed shared surface | Old call sites found repo-wide | Old call sites migrated in this PR | Old implementations deleted/narrowed | Debt-reduction claim |
| --- | ---: | ---: | --- | --- |
| Private persisted-recording primitive | 3: hydration inline chain plus the mounted and pre-start paths through `getRerecordSourceInvalidReason` | 3 through the two workflow-level inspectors | Delete `getRerecordSourceInvalidReason` and the hydration recording branch chain | Yes: common missing/type/sheet checks have one private implementation; caller-specific context semantics remain explicit |
| `inspectReadyRerecordSource(...)` | 2: mounted-source effect and pre-start validation | 2 | Replace the mounted helper call and the compound pre-start readiness/recording guard | Yes: both ready-source callers consume the same ready-state and persisted-recording rules |
| `inspectRerecordSourceSegment(...)` | 2: hydration live-segment chain and pre-start live-segment chain | 2 | Delete local `segmentContextsMatch`; narrow both construction/comparison chains to result handling | Yes: duplicate inspection paths are retired; only pre-start supplies `expectedSheetId` so the existing phase-specific sheet check is preserved |

`inspectPracticeAgainRerecordSource(...)` has one production caller and is not claimed as a shared primitive. It is a local workflow collaborator whose purpose is to remove the branch-heavy hydration policy from React while exposing it to direct tests. Its common persisted-recording checks are implemented by the private primitive above.

## New Surface Budget

| New surface | Why needed | Existing alternative rejected | Old surface retired in same PR |
| --- | --- | --- | --- |
| `inspectPracticeAgainRerecordSource(...)` in `sheet-rerecord-source.ts` | Pure hydration-specific recording/context/return-selection inspection without a mode flag or nullable-policy parameter | Keeping the chain in React retains the target method smell; moving it into a service/store violates ownership | Hydration's recording branch chain and return-segment guard |
| `inspectReadyRerecordSource(...)` in `sheet-rerecord-source.ts` | Pure ready-workflow snapshot plus persisted-recording validation shared by mounted and pre-start paths | A callback-based invalidation helper hides side effects; a hook/controller adds a new orchestration layer for pure policy | `getRerecordSourceInvalidReason` and the compound pre-start ready guard |
| `inspectRerecordSourceSegment(...)` in `sheet-rerecord-source.ts` | Pure live conversion/equality with an explicit optional `expectedSheetId` used only by pre-start | No repo primitive exists beyond the required domain converter | Local `segmentContextsMatch` and both duplicated live-segment construction/comparison chains |

The result type, persisted-recording primitive, ready-source selector, and context comparator stay private to the new module. The sibling module is not re-exported through a barrel. Exported production surface increases by one: three local inspectors replace two local helpers. That increase is accepted because it removes three branch-heavy React paths without a mode flag, callback injection, new service, or new business path. `sheet-practice-controls.tsx` must have a net line reduction; unexpected production growth or any fourth exported helper is a stop condition, not a reason to invent a hard single-file LOC limit.

## Retired Surface Target

| Surface to remove/narrow | Current callers | Replacement | Behavior-equivalence test |
| --- | --- | --- | --- |
| Local `getRerecordSourceInvalidReason(...)` | mounted-source validation effect; `validateRecordAgainSource` | `inspectReadyRerecordSource(...)` | new pure unit table for every ready invariant and persisted-recording reason plus existing controls invalid-source cases |
| Local `segmentContextsMatch(...)` | local recording helper; hydration; pre-start validation | private equality used by ready and segment inspectors | new equivalent/mismatched context cases plus existing controls tests |
| Inline recording and return-selection validation in `hydratePracticeAgainSource` | hydration only | `inspectPracticeAgainRerecordSource(...)` | existing Practice Again invalid-source table plus direct pure tests |
| Inline live-segment construction/comparison in hydration and pre-start validation | two phases | segment inspector result | new pure unit cases plus existing missing/invalid segment controls tests |

## Boundary Impact

- UI -> browser adapter direct imports added: no; the touched component's existing injected browser defaults remain unchanged, and the new helper imports none. `SheetPracticeControls` is the existing composition point for those defaults; R-01 adds no new exception.
- UI -> infrastructure imports added: no; repo-map search finds none in the planned helper and none will be added.
- Domain -> UI/service imports added: no; no domain file changes.
- Service passthrough methods added: no; no service changes.
- Repository direct callers reduced: no; no direct repository caller exists in the planned logic and no repository claim is made.

## Tests Required

| Behavior | Test file/type | Why it gates merge |
| --- | --- | --- |
| Pure Practice Again, ready-source, and live-segment inspection outcomes | `tests/unit/sheet-rerecord-source.test.ts` | Proves the three extracted replacements without React/store side effects |
| Existing hydration messages, reasons, ready state, pre-start rejection, and Record Again behavior | `tests/unit/sheet-practice-controls.test.tsx` | Proves behavior equivalence at both old call sites |
| No new forbidden component-layer dependency | `tests/unit/architecture-boundaries.test.ts` | Guards the new sibling module's import direction |
| Real first-take/Record Again/second-take workflow | existing `tests/e2e/sheet-segment-recording.spec.ts` | Mandatory browser evidence for a recording workflow refactor; test file is rerun, not cleaned up |

## No-Go / Deferrals

| Item | Reason | Follow-up owner |
| --- | --- | --- |
| `PracticeSegmentSelectorPanel` loading/editor/CRUD complexity | Independent CodeScene debt root and test surface | Later Sheet Practice selector plan |
| `startSheetRecording` transaction complexity | Remains a separate complex method after validation extraction | Later controls lifecycle plan after R-01 measurement |
| `stopSheetRecording` and segment save resolution | Different save/failure transaction | Later controls lifecycle plan |
| Existing browser-service defaults in `SheetPracticeControls` | Pre-existing composition seam; removing it would require parent/type expansion unrelated to this debt root | Separate boundary plan if CodeScene/gates prioritize it |
| Test fixture and E2E debt | Current stage is `src/**`-first; tests are behavior proof only | Later tests debt stage |

## Goal

Remove the duplicated, branch-heavy Record Again source-integrity checks from `SheetPracticeControls` while preserving every current runtime outcome, workflow-store reason, message, and service boundary.

This is a structural refactor. It must not add a feature, change recording behavior, redesign Sheet Practice, or attempt to remediate every Code Health finding in `sheet-practice-controls.tsx`.

## Code Health baseline

CodeScene web job baseline:

| File | Code Health | Commits / 1 year | Friction | LOC |
| --- | ---: | ---: | ---: | ---: |
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | 6.51 | 32 | 36% | 1,271 |

Local CodeScene MCP baseline, used for before/after comparison during implementation:

- score: `6.22`;
- `hydratePracticeAgainSource`: cyclomatic complexity 13;
- `validateRecordAgainSource`: cyclomatic complexity 16;
- `startSheetRecording`: cyclomatic complexity 19;
- component top-level context: cyclomatic complexity 13 and 158 LOC.

The web and local analyzers are separate baselines. Do not compare their numeric scores to each other.

## Revision trigger and invalidated implementation evidence

The first plan was independently frozen as commit `115a38ec41aaa86709349e01ab3f38d9cbbf08e4`, blob `96a224f9a2df9e376d28b3bfc0eec487199c7b8e`, SHA-256 `8fa41323b780dbee14b02966210b5a51c13980d1f35b3d2a03e8845e89377107`. Its first implementation attempt was intentionally not committed and has been fully removed from the primary checkout.

That attempt produced this evidence:

| Measurement point | Controls score/findings | Helper score/findings | Diff-shape observation |
| --- | --- | --- | --- |
| First migration | `6.31`; hydration CC 11; pre-start CC 13 | `9.38`; recording inspector CC 10 | Complexity moved into a generic nullable-mode inspector |
| One allowed corrective extraction | `6.49`; hydration CC 8; pre-start CC 11 | `10.0`; no complex method | Controls `+125/-114` and helper 115 physical lines; production net `+126` lines |

The frozen requirement still failed after its one allowed correction: both target methods remained CodeScene findings. Independent diagnosis also identified three tactic-level problems: a 37-line side-effect callback wrapper, a `JSON.stringify` readiness tuple, and `Object.assign`-based optional-input construction. These made the diff larger and obscured policy instead of simplifying it.

Therefore:

- all test and CodeScene evidence from that implementation is invalidated;
- revision 2 bans those tactic shapes explicitly;
- revision 2 must be independently frozen and reviewed before a new implementation branch exists;
- the new implementation starts from refreshed `main`, never from the discarded implementation branch.

## Revised structural feasibility budget

The revised design is accepted for a second implementation only because it has a concrete path below the failed thresholds:

| Function | Residual component decisions after migration | Planned CodeScene shape |
| --- | --- | --- |
| `hydratePracticeAgainSource` | blank source; Practice Again inspection failure; `no-segment-context` clear mapping; cancellation; live-segment inspection failure; missing-segment active clear | At most 6 component decisions, targeting CC below 8 |
| `validateRecordAgainSource` | ready-source failure; live-segment failure; missing/wrong-sheet active clear | At most 3 component decisions, targeting CC below 8 |
| Each new pure function | One named policy with early-return result branches | Individually below CC 8; no aggregate generic inspector |

This is a planning budget, not evidence. CodeScene after implementation remains the authority. If the implementation needs extra branch helpers, callbacks, or serialized dependency tricks to meet it, the design has failed again.

## Debt root

The component validates the same Record Again source relationship in two phases:

1. `hydratePracticeAgainSource` validates a recording supplied by Practice Again navigation, loads its live segment, and seeds the workflow store.
2. `validateRecordAgainSource` repeats recording, sheet, segment, and context checks immediately before recording starts.

The two call sites need different side effects, but the structural inspection rules are duplicated inside the React component. This raises method complexity and makes it easy for the hydration and start paths to drift.

R-01 extracts only side-effect-free inspection rules. A private persisted-recording primitive carries the genuinely shared checks; three explicit workflow-level inspectors keep Practice Again, ready-source, and live-segment semantics legible. Async service calls, React state, cancellation, workflow-store transitions, messages, capture/session sequencing, and recording start/stop remain in their existing owners.

## Production scope

### Modify

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - Replace duplicated source-recording and live-segment inspection branches with the new helper results.
  - Preserve caller-specific store transitions, messages, cancellation, and errors.

### Add

- `src/components/sheet-practice/controls/sheet-rerecord-source.ts`
  - Hold pure Record Again source inspection types and functions.
  - Import and reuse existing domain and workflow types.
  - Perform no React state access, store access, repository access, browser access, or service I/O.

No other production file is pre-approved. If implementation requires another `src/**` file, stop with `STAGE_BLOCKED` and return to plan review instead of expanding scope.

## Supporting test scope

### Add

- `tests/unit/sheet-rerecord-source.test.ts`
  - Characterize the extracted pure outcomes directly.

### Preserve; modify only if the extraction changes test wiring

- `tests/unit/sheet-practice-controls.test.tsx`
  - Keep existing component-level behavior evidence.
  - Do not reorganize fixtures, reduce test debt, rename unrelated tests, or broaden coverage outside R-01.

Tests are behavior proof for the production refactor. Test-code cleanup remains deferred to the later tests stage.

## Required reuse

R-01 must reuse these existing boundaries and semantics:

- `createSheetRecordingSegmentContext(...)` for live segment conversion;
- `SheetPracticeRerecordSource` and `SheetPracticeRerecordUnavailableReason` from the workflow store;
- `SheetRecordingService.getRecording(...)` at the existing component call sites;
- `PracticeSegmentService.getSegment(...)` at the existing component call sites;
- existing workflow-store actions such as `clearRerecordSource`, `invalidateRerecordSource`, `setActiveSegment`, and `setRerecordReady`;
- existing injected service props in `controls/types.ts`;
- current user-facing messages and errors.

Do not add a new service, repository, controller, state machine, store, persistence path, or recording business path.

## Explicit exclusions

R-01 must not modify:

- `practice-segment-selector-panel.tsx` or segment CRUD/editor behavior;
- `src/lib/sheet-practice/recording-service.ts` or `src/services/recording/**`;
- `src/stores/sheet-practice-recording-workflow-store.ts`;
- `src/components/sheet-practice/controls/types.ts`;
- metronome, bar count-in, preset, measure-grid, viewer, or navigation behavior;
- recording start/stop transaction ownership;
- package, lockfile, configuration, schema, migration, status, or unrelated docs;
- E2E test-file edits. The existing `sheet-segment-recording.spec.ts` must still be executed as browser evidence.

The existing complexity in `startSheetRecording`, `stopSheetRecording`, metronome session handling, and recording harness handling is explicitly deferred. R-01 must not grow into a full controls rewrite.

## Helper contract

The new module exposes small discriminated results rather than throwing for expected invalid-source states. The three workflow-level names and responsibilities are part of the revised contract:

```ts
inspectPracticeAgainRerecordSource({
  recording,
  sheetId,
  returnSegmentId
}: {
  recording: ReviewRecording | null;
  sheetId: string;
  returnSegmentId: string | null;
}): RerecordSourceInspection<{
  recording: ReviewRecording & { type: "sheet" };
  segmentContext: SheetRecordingSegmentContext;
}>;

inspectReadyRerecordSource({
  workflowState,
  sheetId,
  recording
}: {
  workflowState: Pick<
    SheetPracticeRecordingWorkflowState,
    "sheetId" | "activeSegmentId" | "rerecord"
  >;
  sheetId: string;
  recording: ReviewRecording | null;
}): RerecordSourceInspection<SheetPracticeRerecordSource>;

inspectRerecordSourceSegment({
  segment,
  sourceContext,
  expectedSheetId
}): RerecordSourceInspection<SheetRecordingSegmentContext>;
```

Constraints:

- Keep `RerecordSourceInspection<T>`, the common persisted-recording check, the ready-source selector, and the context comparator private to the module; do not spend additional exported surface on them.
- Preserve the current context-equivalence semantics; do not silently redefine equality.
- `inspectPracticeAgainRerecordSource(...)` owns hydration-only semantics: missing context reports `no-segment-context`; a nonblank mismatched return segment reports `selection-changed`; success returns the recording's own context.
- `inspectReadyRerecordSource(...)` owns ready-workflow semantics for both mounted and pre-start callers: a stale workflow sheet/status/source/selection reports `selection-changed`; missing/wrong persisted recording reports the existing recording reason; missing or mismatched persisted context reports `source-segment-invalid`; success returns the current ready source.
- `inspectRerecordSourceSegment(...)` reports missing/invalid live context for both phases. Pre-start passes `expectedSheetId: sheetId` and preserves `sheet-mismatch`; hydration omits it and preserves its current context-only validation.
- Do not put async loading in the helper. The component retains `getRecording(...)` and `getSegment(...)` calls so service ownership does not move.
- Do not put workflow-store actions or message formatting in the helper.
- Keep caller-specific effects explicit at the call sites. Hydration still chooses `clearRerecordSource(...)` only for `no-segment-context`, clears the active segment only when the live segment is missing, and formats the current message. Pre-start still clears the active segment for missing or wrong-sheet live segments and throws the exact current error.
- Do not add an `apply...Failure` callback wrapper, inject caller side effects into the pure module, serialize readiness fields with `JSON.stringify`, or use `Object.assign`/spread tricks to hide optional inputs. Ordinary typed object literals and direct result branches are required.
- Keep every new function below CodeScene's complex-method threshold. A helper score increase does not compensate for either target React method remaining a finding.

## Implementation tasks

### Task 0: establish a clean implementation branch and baseline

After the plan PR is approved and merged:

1. In `C:\Users\wsuto\metronome`, fetch `origin/main`.
2. Confirm the primary checkout is clean.
3. Create a new branch named `codex/r01-sheet-rerecord-source-validation-v2` directly from refreshed `origin/main`.
4. Do not reuse `codex/r01-sheet-rerecord-source-validation`, any older R-01 branch, or this plan-repair branch.
5. Run `code_health_review` and `code_health_score` for `sheet-practice-controls.tsx`; record the local score and findings in the implementation notes.
6. Run the existing controls unit test file once to prove the branch starts green:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-controls.test.tsx
```

Expected: pass. If it fails before code changes, stop with `STAGE_BLOCKED`.

### Task 1: write failing pure characterization tests

Create `tests/unit/sheet-rerecord-source.test.ts` before the helper exists.

Cover at least these existing outcomes:

- Practice Again recording is missing → `source-recording-missing`;
- Practice Again recording is not a sheet recording → `source-not-sheet`;
- Practice Again recording belongs to another sheet → `sheet-mismatch`;
- Practice Again recording has no persisted context → `no-segment-context`;
- nonblank return segment differs from the persisted context → `selection-changed`;
- each stale ready invariant—workflow sheet, status, source, source sheet, or active segment—→ `selection-changed`;
- valid ready invariants delegate persisted recording failures to `source-recording-missing`, `source-not-sheet`, or `sheet-mismatch`;
- ready-source inspection with a missing or mismatched persisted recording context → `source-segment-invalid`;
- live segment is missing → `source-segment-missing`;
- pre-start live segment belongs to another sheet → `sheet-mismatch`;
- hydration without `expectedSheetId` continues to judge the live segment by context equivalence only;
- live segment cannot form the same recording context → `source-segment-invalid`;
- valid recording and live segment return the existing segment context;
- equivalent contexts use exactly the current equality behavior through the public inspectors.

Run:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-rerecord-source.test.ts
```

Expected red state: the planned helper module or exports do not exist. A syntax, environment, or unrelated test failure is not an acceptable red state.

### Task 2: add the pure inspection helper

Create `src/components/sheet-practice/controls/sheet-rerecord-source.ts`.

Move the existing side-effect-free rules from `segmentContextsMatch(...)`, `getRerecordSourceInvalidReason(...)`, hydration's recording/return guard, and the two live-segment chains into the three contracted workflow-level inspectors. Use one private primitive for common persisted-recording existence/type/sheet checks; keep the different context meanings in their named workflow inspectors.

Requirements:

- Use discriminated return values for expected invalid states.
- Reuse the existing domain conversion and workflow reason types.
- Keep each helper below the CodeScene complex-method threshold of cyclomatic complexity 8.
- Do not catch unexpected service errors because this module performs no service calls.
- Do not add generalized validation frameworks or reusable abstractions outside Sheet Practice rerecord sources.
- Do not add callbacks, mode flags, nullable policy parameters, serialized readiness tuples, or dynamic optional-field construction.

Run the new unit file and make it green:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-rerecord-source.test.ts
```

### Task 3: simplify Practice Again hydration

In `sheet-practice-controls.tsx`:

1. Keep source id normalization, cancellation, service loading, workflow actions, and message updates in `hydratePracticeAgainSource`.
2. Replace the recording type/sheet/context and return-segment branch chain with `inspectPracticeAgainRerecordSource(...)`, preserving hydration's existing `clearRerecordSource(sheetId, "no-segment-context")` mapping for that result.
3. Replace the live-segment context construction/comparison branch chain with the segment inspection result.
4. Preserve the current distinction between `clearRerecordSource(...)` and `invalidateRerecordSource(...)`.
5. Preserve when `setActiveRecordingSegment(...)`, `setRerecordReady(...)`, `setMessage(...)`, and `setErrorMessage(...)` run.

Run:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-rerecord-source.test.ts tests/unit/sheet-practice-controls.test.tsx
```

### Task 4: simplify mounted and pre-start Record Again validation

In `sheet-practice-controls.tsx`:

1. In the mounted-source validation effect, replace `getRerecordSourceInvalidReason(...)` with `inspectReadyRerecordSource(...)` using a current workflow-state snapshot.
2. In `validateRecordAgainSource`, replace the compound readiness/active-selection guard and persisted-recording helper call with the same `inspectReadyRerecordSource(...)` contract.
3. Keep the existing `getRecording(...)` and `getSegment(...)` calls in the component.
4. In `validateRecordAgainSource`, pass `expectedSheetId: sheetId` to the live-segment inspector so the existing wrong-sheet result remains `sheet-mismatch`; hydration does not pass this option.
5. Preserve current active-segment clearing and workflow invalidation reasons in both callers.
6. Preserve the exact thrown message consumed by `startSheetRecording`.
7. Delete `getRerecordSourceInvalidReason(...)` only after both ready-source callers have migrated; do not otherwise restructure `startSheetRecording` in R-01.

Run the same two targeted unit files again.

### Task 5: verify structural improvement and repository gates

Run CodeScene local review for both production files:

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/controls/sheet-rerecord-source.ts`

Required CodeScene result:

- `sheet-practice-controls.tsx` improves measurably from local score `6.22`;
- `hydratePracticeAgainSource` is no longer reported as a complex method;
- `validateRecordAgainSource` is no longer reported as a complex method;
- the new helper contains no complex method at or above cyclomatic complexity 8;
- no existing smell is reported as worsened because complexity was merely moved.
- `sheet-practice-controls.tsx` has a net line reduction, the helper exports only the three contracted inspectors, and the diff contains none of the banned tactic shapes from the revision trigger.

One small corrective extraction inside the two approved production files is allowed if a required result fails, but it must preserve the three-entry-point design and cannot introduce a callback wrapper, readiness serialization, or a new exported surface. If the same CodeScene requirement still fails after that correction, stop with `STAGE_BLOCKED`; do not widen scope.

Run targeted verification:

```powershell
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/controls/sheet-practice-controls.tsx src/components/sheet-practice/controls/sheet-rerecord-source.ts tests/unit/sheet-rerecord-source.test.ts tests/unit/sheet-practice-controls.test.tsx
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-rerecord-source.test.ts tests/unit/sheet-practice-controls.test.tsx
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-segment-recording.spec.ts
```

Before commit, let the repository pre-commit hook run its configured debt gates, lint, full unit suite, and build. Do not use `--no-verify`.

### Task 6: implementation PR review

The implementation PR must contain:

- the exact production and supporting-test scope;
- local CodeScene before/after scores;
- confirmation that the two named complex methods were removed from findings;
- targeted test, typecheck, hook, and CI evidence;
- an explicit statement that segment selector and start/stop transaction refactors remain deferred.

Request GitHub review with `@codex review`. Do not use ChatGPT web review. Treat actionable review findings as evidence to verify; do not expand R-01 beyond its approved debt root.

## Acceptance criteria

R-01 is complete only when all are true:

1. Hydration uses `inspectPracticeAgainRerecordSource(...)`; mounted and pre-start validation both use `inspectReadyRerecordSource(...)`; hydration and pre-start both use `inspectRerecordSourceSegment(...)` with the contracted sheet-check difference.
2. The inspectors share only private persisted-recording/context primitives; no nullable mode, callback-injected side effect, serialized readiness tuple, dynamic optional-field construction, or fourth exported helper exists.
3. Hydration and ready-source callers preserve all supported result reasons, store transitions, messages, service calls, and error behavior, including hydration's `no-segment-context` clear path, ready-source `source-segment-invalid` behavior for missing or mismatched persisted context, and pre-start `sheet-mismatch` for a wrong-sheet live segment.
4. No new service, repository, controller, store, persistence path, or business path exists.
5. Only the two approved production files changed or were added; controls has a net line reduction and no hard single-file limit is invented.
6. Test changes are limited to direct behavior proof.
7. The two targeted complex methods disappear from CodeScene findings and the original file score improves from the local baseline.
8. The new helper does not inherit a complex-method finding.
9. Targeted verification, the existing recording E2E, repository hooks, CI, and `@codex review` are complete.
10. No deferred Sheet Practice or test-debt work is pulled into the PR.

## Completion output

Return exactly one of:

- `STAGE_READY` when every acceptance criterion has current evidence; or
- `STAGE_BLOCKED` with the failed criterion and last verified state.

Do not report `STAGE_READY` from narrative confidence alone.
