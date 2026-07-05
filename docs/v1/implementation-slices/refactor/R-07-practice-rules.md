## 0. Verdict
Verdict: `PLAN_READY`
## 1. Pipeline Contract
Pipeline ID: `R-07 / practice-rules`
One-PR objective: Delete obsolete practice-rule exports and one duplicated duration sanitizer while preserving current service, dashboard, library, goal, and continue-practice behavior.
Target debt pattern: compatibility residue / boundary mixing / wrapper residue / semantic duplication
Allowed production files: `src/domain/practice/rules.ts`
Allowed test files: `tests/unit/practice-session-service.test.ts`; `tests/unit/practice-session-duration-rules.test.ts`
Explicitly out of scope: `src/services/practice-session/**`, `src/hooks/**`, `src/components/**`, `src/domain/practice/continue-practice.ts`, `src/domain/practice/validation.ts`, `src/domain/practice/types.ts`, recent-activity/session-comparison/session-history-groups, storage, routes, Phase 2 or practice read-model primitive closeout
This pipeline is not allowed to: widen public API; add a service/hook/controller/repository/facade/domain primitive; create a new file; move selectors out of `rules.ts`; change URLs, storage, browser adapter defaults, user messages, timing, goal semantics, or read-model output shapes
## 2. Coding Read Set
### Must read before coding
| File | Why coding must read it | Decision it informs |
|---|---|---|
| `src/domain/practice/rules.ts` | Target file owns all retired surfaces. | Exact deletes and unchanged selector behavior. |
| `src/domain/practice/continue-practice.ts` | Existing replacement for singular Continue Practice compatibility. | Prove domain rules no longer need route-backed continue wrapper. |
| `src/services/practice-session/service.ts` | Service still owns public `getContinuePracticeTarget()` compatibility via plural targets. | Preserve service API while deleting only the old rules export. |
| `tests/unit/practice-session-service.test.ts` | Imports the unused transport reducer and covers service Continue Practice behavior. | Delete test-only reducer coverage and keep service behavior proof. |
| `tests/unit/practice-session-duration-rules.test.ts` | Covers analytics, library summary, and goal evaluator duration boundaries. | Behavior proof for duration sanitizer reuse. |
### Planner-only evidence
| File | Why coding should not start from it |
|---|---|
| `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md` | Broad Phase 2 guidance already narrowed here. |
| `docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md` | Establishes R-07 rank and score only. |
| `docs/refactor/src-debt-forensics-2026-07-04/07-practice-rules.md` | Evidence already distilled into RS list. |
| `docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md` | Formatting contract already applied. |
| `docs/v1/implementation-slices/refactor/R-04-home-dashboard.md` | Adjacent plan confirms service `getContinuePracticeTarget()` is out of scope. |
### Read only if blocked
| File | Trigger for reading |
|---|---|
| `src/services/practice-session/types.ts` | Typecheck says deleting the rules export requires service API edits. |
| `src/domain/practice/types.ts` | Typecheck says removed imports require public type changes. |
| `tests/unit/continue-practice-targets.test.ts` | Continue Practice compatibility expectations appear to change. |
| `src/components/home/continue-practice-navigation.ts` | A href expectation changes despite service/domain scope. |
| `docs/architecture/debt-gate-map.md` | Debt gate command fails with a changed-file rule not covered by this plan. |
## 3. Existing Behavior Contract
The coding agent must preserve:
- Public props / exported API: delete only `rules.ts` exports `getContinuePracticeTarget(session)` and `applyPracticeTrigger(...)`; keep `PracticeSessionService.getContinuePracticeTarget()`, `ContinuePracticeTarget`, and all analytics/streak/library/goal exports unchanged.
- URL/query/storage contract: `/quick-metronome`, `/sheet-practice/:sheetId`, `getSheetPracticeHref(...)`, local storage keys, and repository data shapes remain unchanged.
- Visible user messages: unchanged from current tests.
- Store/state-machine semantics: service methods remain the only writers for practice sessions, recording metadata, and captured events.
- Critical ordering: validation before persistence, capture-event lookup before sink write, and read-model selectors after repository reads remain unchanged.
- Error/rollback behavior: failed sheet/segment lookup, invalid goal definitions, invalid timestamps, and repository read failures keep current return values.
- Tests or harness events that must not change: service Continue Practice expectations, analytics empty-state booleans, library summary order, and goal completion reasons.
If preserving these requires widening scope, stop and report `PLAN_BLOCKED`.
## 4. Required Retired Surfaces
| ID | Old surface to delete | Why it is debt | Replacement | Required proof | Behavior test |
|---|---|---|---|---|---|
| RS-1 | `rules.ts` exported `getContinuePracticeTarget(session)` and its `getSheetPracticeHref` import. | Old singular route-backed wrapper duplicates the newer continue-target flow and mixes domain rules with route DTOs. | Existing `selectContinuePracticeTargets(...)` plus `getHomeCompatibleContinuePracticeTarget(...)` used by `service.getContinuePracticeTarget()`. | `rg -n "export function getContinuePracticeTarget|function getContinuePracticeTarget\\(session|getSheetPracticeHref" src/domain/practice/rules.ts` returns no matches. | `tests/unit/practice-session-service.test.ts` Continue Practice quick/sheet expectations and `tests/unit/continue-practice-targets.test.ts` still pass. |
| RS-2 | `rules.ts` exported `applyPracticeTrigger(...)` and the test-only import/assertion for it. | Unused transport reducer widens the domain rules barrel and is not a production service or store owner. | No production replacement; current practice session service event/capture methods remain the owners. | `rg -n "applyPracticeTrigger" src tests` returns no matches. | `tests/unit/practice-session-service.test.ts` ensure/capture/session lifecycle tests still pass. |
| RS-3 | Inline positive-duration expression in `sumGoalDurationMs(...)`. | Duplicates the existing `validDurationMs(...)` sanitizer in the same file. | Existing local `validDurationMs(session.durationMs)`. | `rg -n "Number\\.isFinite\\(session\\.durationMs\\).*session\\.durationMs > 0" src/domain/practice/rules.ts` returns no matches. | `tests/unit/practice-session-duration-rules.test.ts` minutes-goal boundary assertions still pass. |
Rules: adding a helper without deleting the old implementation, renaming a helper, moving duplicate logic, or leaving deleted exports for compatibility is failure.
## 5. Allowed New Surface Budget
| Proposed new surface | Allowed? | Constraints | Required retired surface |
|---|---:|---|---|
| Local unexported helper | no | Use existing `validDurationMs(...)`; do not add renamed wrappers. | none |
| Local type alias / discriminated union | no | No type reshaping in this PR. | none |
| New file | no | If `rules.ts` needs a split, stop and report scope expansion. | none |
| New hook/controller/service/facade | no | Would widen surface. | none |
| New repository method | no | Would widen persistence contract. | none |
| New domain primitive | no | R-07 retires residue only; it does not create the Phase 2 read-model primitive. | none |
Hard rule: if any replacement needs a new exported surface, stop and report `PLAN_BLOCKED`.
## 6. Implementation Steps
### Step 1: Delete singular domain continue wrapper
Edit: `src/domain/practice/rules.ts`
Do: delete RS-1 -> replace production reliance with the existing service path through `getHomeCompatibleContinuePracticeTarget(...)`.
Do not change: service `getContinuePracticeTarget()`, plural `getContinuePracticeTargets()`, target labels, hrefs, or command palette behavior.
Safety: remove the now-unused `getSheetPracticeHref` import from `rules.ts`.
Deletion proof: `rg -n "export function getContinuePracticeTarget|function getContinuePracticeTarget\\(session|getSheetPracticeHref" src/domain/practice/rules.ts`
Behavior proof: service Continue Practice quick/sheet assertions and `tests/unit/continue-practice-targets.test.ts`.
### Step 2: Delete unused transport reducer export
Edit: `src/domain/practice/rules.ts`; `tests/unit/practice-session-service.test.ts`
Do: delete RS-2 -> replace with no production code; remove only the unit test that existed solely for the deleted reducer.
Do not change: service event capture, session creation, session ending, or reference/recording/metronome event validation.
Safety: if any production caller of `applyPracticeTrigger` appears, stop and report `PLAN_BLOCKED`.
Deletion proof: `rg -n "applyPracticeTrigger" src tests`
Behavior proof: `tests/unit/practice-session-service.test.ts` service lifecycle and capture tests.
### Step 3: Reuse the existing duration sanitizer
Edit: `src/domain/practice/rules.ts`
Do: delete RS-3 -> replace the inline duration ternary in `sumGoalDurationMs(...)` with `validDurationMs(session.durationMs)`.
Do not change: goal invalid reasons, completion timestamps, progress rounding, period filtering, or analytics/library duration totals.
Safety: keep `validDurationMs(...)` local and side-effect free.
Deletion proof: `rg -n "Number\\.isFinite\\(session\\.durationMs\\).*session\\.durationMs > 0" src/domain/practice/rules.ts`
Behavior proof: `tests/unit/practice-session-duration-rules.test.ts` minutes-goal and analytics/library duration assertions.
## 7. Async / State / Side-Effect Safety
The implementation must preserve:
- Pure resolver/helper rule: `rules.ts` remains pure and must not import services, repositories, browser adapters, stores, or UI helpers.
- Stale async guard: not applicable; no async code may be added.
- Store ownership: practice-session service and repositories remain the only mutation owners.
- Capture/save ordering: unchanged because service code is out of scope.
- Effect dependency constraint: not applicable; no hooks/components may be edited.
If any step requires async, persistence, hook, service, or UI edits, the plan is blocked.
## 8. Verification Before Review Handoff
Coding agent must report exact evidence.
Required commands:
```bash
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-duration-rules.test.ts tests/unit/practice-session-service.test.ts tests/unit/continue-practice-targets.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/rules.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-duration-rules.test.ts
```
Required deletion proofs:
```bash
rg -n "export function getContinuePracticeTarget|function getContinuePracticeTarget\\(session|getSheetPracticeHref" src/domain/practice/rules.ts
rg -n "applyPracticeTrigger" src tests
rg -n "Number\\.isFinite\\(session\\.durationMs\\).*session\\.durationMs > 0" src/domain/practice/rules.ts
```
Required review gates: changed-file Code Health must not decline if CodeScene is available; no new infrastructure/browser import, public API except the two deleted domain exports, file, service/hook/controller/repository/facade/domain primitive, or out-of-scope file changed; retired surface list must match the diff.
## 9. Final Coding Agent Handoff
Edit only `src/domain/practice/rules.ts`, plus `tests/unit/practice-session-service.test.ts` only to remove deleted reducer coverage.
Delete RS-1 `getContinuePracticeTarget(session)` and its route import from domain rules.
Delete RS-2 `applyPracticeTrigger(...)` and its test-only import/assertion.
Delete RS-3 inline `session.durationMs` positive-duration ternary and call existing `validDurationMs(...)`.
Do not add files, helpers, hooks, services, repositories, facades, domain primitives, imports, routes, storage behavior, or UI messages.
Keep service `getContinuePracticeTarget()`, plural continue targets, analytics, library summary, streaks, and goal evaluator output unchanged.
Do not touch home dashboard, dashboard hook, command palette, validation schema, practice types, storage, or status files.
Run the listed unit tests, typecheck, edited-file lint, and all deletion `rg` proofs.
If any deletion forces new public API, service/type edits, or a read-model module split, stop and report `PLAN_BLOCKED`.
