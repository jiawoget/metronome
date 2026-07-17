# R-01 Sheet Rerecord Source Validation Refactor Plan

> Execution skill: use `superpowers:executing-plans` only after this revision is independently approved and merged. Execute in the primary checkout at `C:\Users\wsuto\metronome`; do not create a worktree.

## Plan status

- Plan id: `R-01-sheet-rerecord-source-validation`
- Lifecycle: `revision-proposed`
- Revision: `6`
- Planning output only; this file does not authorize business-code changes
- Candidate source: CodeScene project `82175`, job `6845237`
- Boundary decision: `docs/refactor/src-debt-forensics-2026-07-17/02-sheet-practice-boundary-review.md`
- Supersedes revision 5 before promotion because the merged XO 4 gate in PR `#124` makes its single-file implementation add a new `max-lines` suppression at 1,588 lines; revision 6 permits one narrowly owned internal sibling module instead of suppressing the current rule or compressing policy code to satisfy a metric

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
- In scope: replace branch-heavy Practice Again hydration, mounted ready-source revalidation, and pre-start Record Again validation with small pure functions in one internal sibling module while keeping I/O and workflow effects in `sheet-practice-controls.tsx`; add focused component behavior-equivalence tests.
- Production scope: modify controls and add exactly one sibling file, `rerecord-source-validation.ts`. The sibling exports exactly four internal orchestration functions to controls and is not re-exported from a barrel or imported anywhere else.
- Tests support the `src` refactor. They are not a test-debt cleanup stage.
- Gate-ledger support: `.xo-suppressions.json` may change only for the controls entry, and every changed rule count must decrease or be deleted. No count may be added or increased for controls, the sibling, tests, or any other file.
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
| Fetchable green characterization commit `77ca1af32d62fb338806de377bdf4a365af7a65c` and discarded-v2 CodeScene correction | This is the rebased, content-equivalent replacement for local commit `45161a9`: both the parent and resulting `tests/unit/sheet-practice-controls.test.tsx` blobs compare equal. It proves 89 component tests on legacy behavior and that repeated throw statements must be retired to keep pre-start validation below the complex-method threshold |
| Merged XO 4 gate PR `#124` and unsuppressed target scan | Prove revision 5 reaches 1,588 lines and would require a new `max-lines` suppression, while the sibling-module candidate passes XO without adding or increasing any suppression count |

### XO 4 boundary evidence

| Evidence | Exact input/command | Result and decision |
| --- | --- | --- |
| Rule limit | `rg -n 'max-lines' xo.config.js` | XO 4 enforces `max-lines: 1500` |
| Revision-5 single-file candidate | Blob `e4e389ed3e033e30eab1d81948cd22cc7a976ab0`; raw XO command `node node_modules/xo/dist/cli.js --suppressions-location C:\tmp\r01-empty-xo-suppressions.json --reporter json src/components/sheet-practice/controls/sheet-practice-controls.tsx` after materializing that candidate | `max-lines` at line `1588`; raw report `57` errors. Reject adding a `max-lines` suppression |
| Revision-6 split candidate | Commit `faeeedc044ff517908637c46438263ad2fcd5270` on `origin/codex/r01-reviewed-patch-source`; `git show '<treeish>:<path>' \| C:\Windows\System32\find.exe /v /c '""'` for the controls and sibling paths | Controls `1,356` physical lines; sibling `274` physical lines. Both remain below their fixed limits |
| Changed-file XO gate | `& .\scripts\npm-local.ps1 --% run lint:xo:changed` on committed `faeeedc044ff517908637c46438263ad2fcd5270` | Passed full 311-file scan; sibling has zero raw XO finding; target suppression entries only decrease/delete |

The empty suppression input above is the literal JSON object `{}`. It is used only to expose raw findings; it is not a repository configuration change.

## Repo Map Evidence

| Search | Finding | Decision |
| --- | --- | --- |
| `rg -n "segmentContextsMatch|getRerecordSourceInvalidReason|hydratePracticeAgainSource|validateRecordAgainSource" src tests` | The two helpers and target phases exist only in controls | Retire/narrow every named old surface; permit only the accounted controls-owned sibling boundary |
| `rg -n "SheetPracticeRerecordSource|SheetPracticeRerecordUnavailableReason|source-recording-missing|source-segment-missing|source-segment-invalid|selection-changed" src tests` | Existing store types/reasons already define the vocabulary | Reuse; add no reason model |
| `rg -n "RecordingController|use[A-Za-z]*Recording|recording-controller|rerecord" src/components src/lib src/services src/stores` | Existing controllers own other workflows or I/O | Add no controller, hook, service, state machine, or module beyond the one controls-owned sibling |
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
| Ready-recording inspection | local `getRerecordSourceInvalidReason(...)` | Replace with one of the four budgeted controls-only internal exports; add no public/barrel export |
| Context equality | local `segmentContextsMatch(...)` | Preserve exact field semantics through one private explicit comparator; retire serialization-based equality |
| Validation library | none needed | Use private TypeScript discriminated results; add no dependency |

## Revision history and invalidated evidence

Revision 1 failed the CodeScene target after its allowed correction and was removed. Revision 2 produced an uncommitted two-file candidate that improved controls from local `6.22` to `6.74`, removed both target complex-method findings, gave the helper `10.0`, and passed CodeScene, tests, lint, typecheck, build, and Playwright `[chromium]` E2E. It still failed independent review because mounted behavior changed and four new exports replaced zero exported entry points.

Revision 3 corrected the behavior matrix and reduced the module exports to two. Exact commit/blob/hash review still blocked it: two private local helpers do not justify two new exported module entry points. All revision-2 and revision-3 implementation evidence is invalid for promotion.

Revision 4 therefore keeps the refactor inside one production file with zero new exports. It also drops the physical net-line-reduction hard requirement: moving policy into readable private functions in the same file may hold or slightly grow LOC. Unaccounted production growth, CodeScene decline, or a complex replacement helper still fails closed.

Revision 4 stopped after its green characterization step, before any production edit. Six new caller-level cases passed on the legacy implementation, bringing the controls file to 89 passing tests. Before production work, the monitor re-applied the discarded-v2 CodeScene evidence: the successful correction had to replace repeated identical throws because CodeScene counts those jump statements in `validateRecordAgainSource`. Revision 4 fixed the budget at eight private functions and prohibited any corrective helper, so its contract could not honestly authorize the known necessary extraction. Revision 5 adds only that private throw helper and its exact retirement target; the zero-export, one-production-file, behavior, and test contracts are otherwise unchanged.

Revision 5 was implemented locally but not promoted. Its one-file result passed behavior, repository, and CodeScene checks, but after PR `#124` upgraded the repository to XO 4, the raw target scan reported a new `max-lines` finding at 1,588 lines. Adding that suppression would create a new rule debt, and removing roughly 89 lines solely to cross the threshold would violate the plan's readability/no-physical-compression intent. A split candidate instead keeps the component below 1,500 lines, adds no suppression, lowers seven existing suppression counts, improves controls from local `6.22` to `6.64`, gives the sibling module Code Health `10.0`, and passes the CodeScene change-set and staged safeguards. Revision 6 records that evidence-driven boundary correction before any implementation PR is opened.

## Debt root

The component correctly owns I/O and side effects, but source-integrity policy is branch-heavy across three phases:

1. Practice Again hydration validates a navigation recording and return segment.
2. The mounted effect revalidates a ready source without enforcing the current selection.
3. Pre-start validation enforces the current selection before Record Again begins.

Mounted and pre-start deliberately have different preconditions. Revision 6 shares only their genuine base checks and uses a required phase discriminator; it does not make policy nullable or optional.

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

## Internal helper contract

Pure inspection policy moves to `rerecord-source-validation.ts`. Only the four functions marked internal export cross from that sibling into controls. They are not added to an index/barrel, package export, service, hook, or store, and repository search must find controls as their sole importer. The exact-error throw helper remains private in controls because it belongs to caller-side failure handling.

| Function | Responsibility | Old surface retired/narrowed |
| --- | --- | --- |
| `selectWorkflowReadySource(...)` | Private common workflow-sheet/status/source checks | Duplicate base checks inside mounted and pre-start guards |
| `selectReadyRerecordSource(...)` | Internal export applying the explicit mounted/pre-start selection policy | Mounted effect early guard and pre-start compound guard |
| `inspectSheetRecording(...)` | Common missing/type/current-sheet recording checks | Duplicate branches in hydration and ready-recording inspection |
| `inspectPracticeAgainSource(...)` | Internal export for hydration-only persisted-context and return-segment checks | Inline hydration recording/context/return chain |
| `inspectReadyRerecordSourceRecording(...)` | Internal export for source-sheet and persisted-context equivalence after lookup | `getRerecordSourceInvalidReason(...)` |
| `inspectRerecordSourceSegment(...)` | Internal export for phase-discriminated missing/sheet/conversion/equality checks | Hydration and pre-start live-segment chains |
| `areSegmentContextsEqual(...)` | Private explicit field-pair comparator | Retires the local `JSON.stringify` semantic comparator and its XO suppression |
| `isReturnSegmentSelectionValid(...)` | Private hydration return-selection predicate | Retires the compound normalized-return condition without adding policy options |
| `throwRecordAgainUnavailable(...)` | Throw the exact existing pre-start error after caller-owned invalidation | Repeated identical throw expressions in `validateRecordAgainSource` |

`selectReadyRerecordSource(...)` may call private `selectWorkflowReadySource(...)`; it takes a required `kind: "mounted" | "pre-start"` discriminator and must not return a nullable policy for the caller to interpret. `inspectRerecordSourceSegment(...)` takes an explicit discriminated input:

```ts
type SegmentInspectionInput =
  | { kind: "hydration"; segment; sourceContext }
  | { kind: "pre-start"; segment; sourceContext; sheetId };
```

Constraints:

- exactly one new production file and four internal exports; zero barrel/package/public export, class, hook, service, controller, store, adapter, or public type;
- controls is the sole importer of the sibling module and no test imports it directly;
- no generic operation router; controls invokes the four named inspectors/selector directly;
- no callback injection, nullable/optional policy, boolean mode flag, `Object.assign`, spread-based policy construction, readiness serialization, factory/object-method wrapper, or dynamic dispatch;
- no I/O, store action, React state, message formatting, or expected-state throw inside inspection helpers;
- `throwRecordAgainUnavailable(...)` is the only permitted throwing helper; it performs no invalidation or other side effect and preserves the exact error text;
- every new/narrowed helper remains below CodeScene CC 8;
- caller-specific effects remain explicit.

## Shared Primitive Call-Site Audit

| Proposed internal primitive | Old call sites | Migrated call sites | Deletion/narrowing proof | Claim |
| --- | ---: | ---: | --- | --- |
| `selectReadyRerecordSource(...)` | 2 guards | mounted effect and pre-start validator | Common sheet/status/source terms and both phase guards disappear from callers | One explicit discriminated policy; no nullable or optional mode |
| `inspectSheetRecording(...)` | Hydration and ready-recording helper | both inspectors | Duplicate missing/type/current-sheet branches disappear | Genuine two-caller recording primitive |
| `inspectRerecordSourceSegment(...)` | 2 live-segment chains | hydration and pre-start | Both construction/comparison chains disappear from target methods | Phase difference is explicit, not nullable |

## New Surface Budget

| New surface | Why needed | Existing alternative rejected | Old surface retired in same PR | Sole importer / verification |
| --- | --- | --- | --- | --- |
| `rerecord-source-validation.ts` | Keep pure source-integrity policy outside the 1,500-line component while leaving effects in controls | Revision-5 single-file blob produces a new XO `max-lines` finding; suppression or metric-only compression is rejected | Branch-heavy hydration, mounted, and pre-start inspection policy moves out of controls | `rg -n 'rerecord-source-validation' src tests` finds only the controls import; sibling remains below 300 lines and Code Health `10.0` |
| `inspectPracticeAgainSource(...)` | Return a discriminated hydration inspection without moving lookup/effects | Existing inline hydration chain is the debt root; no installed library models this workflow | Hydration recording/context/return branch chain | One controls call; `rg -n 'inspectPracticeAgainSource' src tests` finds sibling definition plus controls call only |
| `inspectRerecordSourceSegment(...)` | Share exact context construction/equality across hydration and pre-start while preserving phase difference | `createSheetRecordingSegmentContext(...)` is reused but does not inspect missing/sheet/equality outcomes | Both live-segment conversion/comparison chains | Two controls calls; `rg -n 'inspectRerecordSourceSegment' src tests` finds sibling definition plus those calls only |
| `selectReadyRerecordSource(...)` | Centralize duplicated ready-source base checks with a required phase discriminator | Separate inline guards duplicate the shared terms; nullable/optional modes and generic routers are rejected | Mounted early guard and pre-start compound guard | Two controls calls; `rg -n 'selectReadyRerecordSource' src tests` finds sibling definition plus those calls only |
| `inspectReadyRerecordSourceRecording(...)` | Share persisted recording/type/sheet/context inspection after caller-owned lookup | Existing `getRerecordSourceInvalidReason(...)` plus hydration recording checks duplicate policy | Old helper and duplicated persisted-recording branches | Two controls calls; `rg -n 'inspectReadyRerecordSourceRecording' src tests` finds sibling definition plus those calls only |

Every helper in the contract has a same-PR retirement/narrowing target in the table above. Runtime public production surface remains unchanged at zero: no barrel/package entry point is added. Internal module surface grows by one file and four named exports, each with exactly one production importer and a named old branch chain it replaces. Private callable surface is budgeted by the remaining private helpers, including the explicit comparator and the throw helper replacing repeated executable throw surfaces.

Any second production file, fifth export, second importer, or extra helper is unbudgeted surface and blocks the stage. A helper introduced only to lower a metric without retiring named policy remains prohibited.

## Required Retired Surfaces

| Required deletion/narrowing | Replacement | Exact proof |
| --- | --- | --- |
| Local `getRerecordSourceInvalidReason(...)` name/body | ready-recording inspector | `rg` finds no old definition or call |
| Hydration recording/context/return branch chain | sheet/practice-again inspectors | Target method retains effects, not inspection policy |
| Mounted ready guard | ready-source selector with `kind: "mounted"` | Mounted effect handles result and lookup only |
| Pre-start compound guard | ready-source selector with `kind: "pre-start"` | Pre-start handles invalidation/throw only |
| Hydration live conversion/comparison chain | segment inspector | Target method handles result effects only |
| Pre-start live conversion/comparison chain | segment inspector | Target method handles result effects only |
| `JSON.stringify` context comparator | explicit field-pair comparator | `rg` finds no semantic-equality serialization and exactly one comparator definition |
| Repeated `throw new Error("Record again is not available for this segment.")` expressions | `throwRecordAgainUnavailable(...)` | `rg` finds the exact message only in the private helper; pre-start failure branches call it |

## Production and test scope

### Modify production

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/controls/rerecord-source-validation.ts` (new internal sibling)

No other `src/**` file is approved. Physical net line reduction is not required; every added line must belong to the budgeted sibling helper contract or necessary result handling. The sibling must remain below 300 physical lines and Code Health `10.0`; unexpected production growth is a stop condition.

### Modify supporting tests only

- `tests/unit/sheet-practice-controls.test.tsx`

Do not add a helper test file because private implementation details are not a public test surface. Preserve existing tests and add only the caller-level behavior/order cases missing from the matrix. Do not reorganize fixtures or clean test debt. Rerun the existing E2E unchanged.

### Modify supporting gate ledger only

- `.xo-suppressions.json`

Only downward/deletion changes for `src/components/sheet-practice/controls/sheet-practice-controls.tsx` are approved. The sibling and test must have zero new suppression entry or count. This file is evidence of debt retirement, not permission to suppress a new finding.

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
- Dependency changes: no.
- Configuration changes: only the allowlisted downward controls entry in `.xo-suppressions.json`; no other configuration change.
- External production callable surface delta: zero.

## Implementation tasks

### Task 0: clean branch and baseline

After this revision is merged, fetch `origin/main` and `origin/codex/r01-reviewed-patch-source`, prove a clean primary checkout, and create `codex/r01-rerecord-source-validation` from the exact refreshed main commit. Do not base, rebase, or switch to the patch-source branch or any earlier R01 implementation branch. Treat full commits `77ca1af32d62fb338806de377bdf4a365af7a65c` and `faeeedc044ff517908637c46438263ad2fcd5270` only as immutable patch sources. Before cherry-picking, require `origin/codex/r01-reviewed-patch-source` to resolve to the production commit and require the characterization commit to be its ancestor; a missing/mismatched ref blocks execution.

First prove `77ca1af32d62fb338806de377bdf4a365af7a65c` changes `tests/unit/sheet-practice-controls.test.tsx` and no production file, cherry-pick only that characterization commit, and verify the branch still has zero `src/**` diff from refreshed main. Record controls CodeScene score `6.22` and findings, then run the controls unit file as a green 89-test baseline against untouched production code. Only after that baseline passes may `faeeedc044ff517908637c46438263ad2fcd5270` be cherry-picked to apply the production refactor and downward XO-ledger changes. This order is fail-closed: the production patch must never be present during the legacy characterization run.

### Task 1: green behavior characterization lock

Use the already-green mounted/pre-start/empty-id service-order cases from fetchable commit `77ca1af32d62fb338806de377bdf4a365af7a65c`, then run the complete controls unit file. Every new assertion must pass against the untouched legacy implementation: these tests characterize existing behavior for a structural-only refactor, so an honest RED state is neither expected nor permitted.

Record the passing characterization count before editing production code. After each extraction step, rerun the same file and keep it green. A failing characterization means the extraction changed behavior and must be corrected before continuing. If a test requires exporting a helper, observing private structure, adding a test-only production seam, or inventing new behavior, stop; the zero-external-surface contract takes priority and the case must be exercised through the component.

### Task 2: add private primitives and migrate hydration

Add only the budgeted sibling result types/functions and four internal exports. Migrate hydration while keeping id normalization, lookup, cancellation, store effects, and messages in controls. Run the controls unit file and CodeScene after this step.

### Task 3: migrate mounted and pre-start paths

Use the explicit ready-source selector directly with its required phase discriminator. Preserve the lookup-order matrix, use the ready-recording inspector only after lookup, migrate both live-segment chains, and route the repeated exact pre-start error through private `throwRecordAgainUnavailable(...)` only after caller-owned invalidation. Delete/narrow every required old surface. Run controls and architecture unit tests.

### Task 4: CodeScene and structural gate

Required result:

- controls improves above local `6.22`;
- the sibling module is Code Health `10.0`, below 300 lines, and has no smell or XO finding;
- `hydratePracticeAgainSource` and `validateRecordAgainSource` disappear from complex-method findings;
- no private helper reaches CC 8 or receives a new complex-method finding;
- no file-level CodeScene smell is worsened merely by moving complexity;
- staged safeguard and branch change-set quality gates pass;
- `.xo-suppressions.json` changes only lower/delete target counts; raw XO scans show zero finding in the sibling and no test-count growth;
- public/barrel production surface delta is zero and internal module delta is exactly one file/four single-importer exports;
- only the two approved production files change;
- all required retired surfaces are absent;
- any production LOC growth is fully accounted to the fixed private-helper ledger.

One small correction inside either approved production file is allowed. It cannot add a second sibling, fifth export, second importer, callback wrapper, or policy option. If the same CodeScene requirement still fails, stop and revise the plan again.

### Task 5: repository verification and promotion

Run targeted lint/tests, architecture tests, full unit tests, typecheck, build, and the existing E2E. Let the normal pre-commit hook run; do not use `--no-verify`.

The former first-commit/PR-evidence circularity was repaired separately in merged PR `#122`; local execution reports/defer PR-only evidence while PR context remains fail-closed. Any different debt-gate failure must be diagnosed normally and must not be bypassed.

Open the implementation PR with exact scope, retirement, CodeScene before/after, test, hook, E2E, and per-rule downward XO-ledger evidence. The PR must state that raw XO found zero sibling issue and that no suppression count was added/increased. Request `@codex review`; do not use ChatGPT web review. Resolve actionable feedback, require CI green, merge, and return the primary checkout to clean updated `main`.

## Verification commands

```powershell
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/controls/rerecord-source-validation.ts src/components/sheet-practice/controls/sheet-practice-controls.tsx tests/unit/sheet-practice-controls.test.tsx
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
- services, repositories, store, schema, persistence, or dependencies;
- any configuration change other than the allowlisted downward controls suppression ledger;
- test fixture or E2E cleanup;
- any production file beyond controls plus the one approved sibling, any fifth export, or any importer other than controls;
- generic operation router, callbacks, nullable/optional policy, boolean mode, serialized tuple, object/factory wrapper, or dynamic dispatch;
- physical line-count compression that obscures policy.

## Acceptance criteria

R-01 is complete only when all are true:

1. Revision 6 has immutable plan identity and independent `PLAN_REVIEW_PASS` before implementation promotion.
2. The implementation branch is fresh from the main commit containing the approved revision.
3. Only controls and the approved sibling change in production; the sibling has exactly four controls-only internal exports and no barrel/package/public type or public callable surface is added. Supporting changes are limited to the caller-level test and downward-only controls entries in `.xo-suppressions.json`.
4. Every helper matches the fixed contract, including the sole exact-error throw helper, and every required old surface is deleted/narrowed.
5. Mounted/pre-start behavior and lookup order match the matrix, including active mismatch, source-sheet mismatch, and empty recording id.
6. Hydration/live-segment reasons, store transitions, messages, cancellation, and exact errors remain equivalent.
7. Test changes are caller-level behavior proof only; no test-only export, direct helper test, or test-only production seam exists.
8. Controls improves from local CodeScene `6.22`; the sibling is `10.0`; both target methods disappear from complex findings; no replacement helper or file-level smell worsens; staged/change-set gates pass.
9. Any production LOC growth is fully explained by the approved internal-helper ledger; no XO suppression is added/increased; there is no single-file or net-line-reduction hard limit.
10. Targeted/full repository verification, unchanged recording E2E, normal hooks, independent code review, `@codex review`, and CI pass.
11. The PR merges and the primary checkout returns to clean updated `main`.

## Completion output

Return exactly one of:

- `STAGE_READY` when every acceptance criterion has current requirement-by-requirement evidence; or
- `STAGE_BLOCKED` with the failed criterion and last verified state.

Do not report `STAGE_READY` from narrative confidence alone.
