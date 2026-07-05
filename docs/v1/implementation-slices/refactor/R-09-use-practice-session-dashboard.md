## 0. Verdict
Verdict: `PLAN_READY`

## 1. Pipeline Contract
Pipeline ID: `R-09 / use-practice-session-dashboard`
One-PR objective: Delete hook-local duplicate goal-evaluation reads and the no-op session-comparison duration wrapper without changing home dashboard behavior.
Target debt pattern: semantic duplication / wrapper residue / hook coordinator bloat
Allowed production files: `src/hooks/use-practice-session-dashboard.ts`
Allowed test files: `tests/unit/home-dashboard.test.tsx`
Explicitly out of scope: `src/components/home/home-dashboard.tsx`, `src/services/practice-session/**`, `src/domain/practice/**`, command palette, R-04 retired surfaces, session-comparison domain extraction, Phase 2 or home-dashboard-family closeout.
This pipeline is not allowed to widen public API, add a hook/controller/service/repository/facade/domain primitive, create a new file, move browser adapter defaults, change visible messages, or touch route/storage/timing behavior.

## 2. Coding Read Set
### Must read before coding
| File | Why coding must read it | Decision it informs |
|---|---|---|
| `src/hooks/use-practice-session-dashboard.ts` | Target owns the duplicate evaluation reads and duration wrapper. | Exact deletes, stale guards, and allowed local helper shape. |
| `tests/unit/home-dashboard.test.tsx` | Covers live hook reads, goal refresh, stale goal refresh, and comparison text. | Focused assertions and fixture rewrites. |

### Planner-only evidence
| File | Why coding should not start from it |
|---|---|
| `skills/metronome_planner.md`; `docs/architecture/debt-gate-map.md`; `docs/agent-index/01-app-shell-home.md`; `docs/agent-index/08-practice-session.md`; `docs/v1/01-app-shell-home.md`; `docs/v1/08-practice-session.md` | Skill file read: `skills/metronome_planner.md`; Debt gate map read: `docs/architecture/debt-gate-map.md`; owner/v1 evidence keeps Home action flow and session-owned history stable. |
| `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md`; `00-project-codescene-scan.md`; `09-use-practice-session-dashboard.md`; `docs/v1/implementation-slices/refactor/R-04-home-dashboard.md` | remediation, rank, per-file debt, and sibling plan evidence separate R-09 from R-04 compatibility-alias cleanup. |
| Repo-map searches over `src/**`, `tests/**`, `docs/v1/**`, `docs/refactor/**`: `normalize|format|validate|resolve|select|build|create`, service/repository/controller/hook/adapter, `formatSessionComparisonMinutes|evaluatePracticeGoalCompletion|practiceGoalsStatus|usePracticeSessionDashboard` | Existing primitive search found goal evaluator and session-comparison formatter paths; RS list is sufficient because only local hook duplication/wrapper residue is deleted. |

### Read only if blocked
| File | Trigger for reading |
|---|---|
| `src/components/home/session-comparison-panel.tsx` | Typecheck says deleting `formatSessionComparisonMinutes()` changes panel-facing comparison text shape. |
| `src/services/practice-goals/browser-service.ts` | Typecheck says the local evaluation reader cannot call the existing goal service surface. |
| `src/hooks/use-command-palette-continue-targets.ts` | Coding is tempted to alter Continue Practice loader behavior. |
| `src/domain/practice/session-comparison.ts` | Coding is tempted to extract or change session-comparison formatter semantics. |
| `src/components/home/home-dashboard.tsx` | Typecheck requires a home component change; if so, stop before editing and report blocker. |

## 3. Existing Behavior Contract
The coding agent must preserve:
- Public props / exported API: every exported `PracticeSessionDashboard*`, `HomeSessionComparison*`, and action type remains source-compatible.
- URL/query/storage contract: no route, href, IndexedDB guard, subscription, or service contract changes.
- Visible user messages: unchanged from current `tests/unit/home-dashboard.test.tsx`, including goal errors and session-comparison text.
- Store/state-machine semantics: `practiceGoalsStatus`, `practiceGoalProgressStatus`, mutation status, and all refresh ids keep current meanings.
- Critical ordering: goal list read before list write; evaluation read may fail independently; stale refresh id check happens before evaluation state writes.
- Error/rollback behavior: failed evaluation reads keep prior evaluations where current code does; goal save/delete failure keeps the form or delete error contained.
- Tests or harness events that must not change: home dashboard roles, test ids, service mock call ownership, subscribe/unsubscribe behavior.
If preserving these requires editing any out-of-scope production file, stop and report PLAN_BLOCKED.

## 4. Required Retired Surfaces
| ID | Old surface to delete | Why it is debt | Replacement | Required proof | Behavior test |
|---|---|---|---|---|---|
| RS-1 | The two separate `practiceGoalService.getPracticeGoalEvaluations()` try/catch/read-result branches in `refreshPracticeGoalEvaluations()` and `refreshPracticeGoals()`. | Same service read, fallback, and error-message semantics are duplicated inside one hook. | One local unexported `readPracticeGoalEvaluations()` helper that reads the service and returns data/error only. | `rg -n "practiceGoalService\\.getPracticeGoalEvaluations" src/hooks/use-practice-session-dashboard.ts` shows one direct call. | `tests/unit/home-dashboard.test.tsx` goal progress refresh and stale-goal-refresh tests. |
| RS-2 | `formatSessionComparisonMinutes()` and its only call. | Wrapper residue; it returns exactly `formatSessionComparisonDuration()` for all current outputs. | Direct `formatSessionComparisonDuration(durationMs)` call. | `rg -n "formatSessionComparisonMinutes" src/hooks/use-practice-session-dashboard.ts tests/unit/home-dashboard.test.tsx` returns no matches. | `tests/unit/home-dashboard.test.tsx` session comparison rendering assertions. |

## 5. Allowed New Surface Budget
| Proposed new surface | Allowed? | Constraints | Required retired surface |
|---|---:|---|---|
| Local unexported helper | yes | Only `readPracticeGoalEvaluations()`; may call the existing goal service; no React state writes, messages, subscriptions, or side effects beyond the read. | RS-1 |
| Local type alias / discriminated union | yes | Internal to the hook file only if needed for the helper result; no export. | RS-1 |
| New file | no | Do not create one; if the target becomes unreadable, stop and report. | none |
| New hook/controller/service/facade | no | Would widen surface. | none |
| New repository method | no | Would widen persistence contract. | none |
| New domain primitive | no | R-09 must not move formatter or goal evaluation logic into domain. | none |

## 6. Implementation Steps
### Step 1: Evaluation Reader Helper
Edit: `src/hooks/use-practice-session-dashboard.ts`
Do: delete RS-1 duplicate direct service read in `refreshPracticeGoalEvaluations()` -> replace with one local `readPracticeGoalEvaluations()` helper.
Do not change: `practiceGoalProgressStatus`, `practiceGoalProgressErrorMessage`, or standalone refresh public behavior.
Safety: helper returns data/error only and must not call `setState`.
Deletion proof: `rg -n "practiceGoalService\\.getPracticeGoalEvaluations" src/hooks/use-practice-session-dashboard.ts`
Behavior proof: home-dashboard goal progress refresh assertions.

### Step 2: Goals Refresh Reuse
Edit: `src/hooks/use-practice-session-dashboard.ts`
Do: delete RS-1 duplicate evaluation read branch inside `refreshPracticeGoals()` -> replace with the same helper from Step 1.
Do not change: goal list stale guard, evaluation stale guard, list-loaded write, or partial evaluation failure fallback.
Safety: capture refresh ids before await and compare them before state writes exactly as current code does.
Deletion proof: same `rg` proof from Step 1 shows one direct service call total.
Behavior proof: home-dashboard stale goal refresh and subscription tests.

### Step 3: Duration Wrapper Delete
Edit: `src/hooks/use-practice-session-dashboard.ts`; `tests/unit/home-dashboard.test.tsx`
Do: delete RS-2 `formatSessionComparisonMinutes()` -> replace its caller with `formatSessionComparisonDuration(durationMs)`.
Do not change: session-comparison labels, duration strings, event placeholder text, or exported `HomeSessionComparisonCandidate`.
Safety: if any visible string changes, restore current output or report blocker.
Deletion proof: `rg -n "formatSessionComparisonMinutes" src/hooks/use-practice-session-dashboard.ts tests/unit/home-dashboard.test.tsx`
Behavior proof: home-dashboard session comparison assertions.

## 7. Async / State / Side-Effect Safety
The implementation must preserve:
- Pure resolver/helper rule: `readPracticeGoalEvaluations()` may read `practiceGoalService` and return a result; it must not write React state or mutate service data.
- Stale async guard: keep the current latest refresh id checks before all post-await goal/evaluation state writes.
- Store ownership: `practiceGoalService.listPracticeGoals`, `getPracticeGoalEvaluations`, `savePracticeGoal`, `deletePracticeGoal`, and `subscribe` remain the only goal service calls.
- Capture/save ordering: not applicable; do not touch capture/save code.
- Effect dependency constraint: do not add unstable object dependencies or new subscriptions.
If these cannot be preserved, the plan is blocked.

## 8. Verification Before Review Handoff
Required commands:
```bash
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/hooks/use-practice-session-dashboard.ts tests/unit/home-dashboard.test.tsx
```
Required deletion proofs:
```bash
rg -n "practiceGoalService\\.getPracticeGoalEvaluations" src/hooks/use-practice-session-dashboard.ts
rg -n "formatSessionComparisonMinutes" src/hooks/use-practice-session-dashboard.ts tests/unit/home-dashboard.test.tsx
```
Required review gates: changed-file Code Health must not decline if CodeScene is available; no new infrastructure/browser import; no new public API; no out-of-scope file changed; retired surface list must match the diff.

## 9. Final Coding Agent Handoff
Edit only `src/hooks/use-practice-session-dashboard.ts` and `tests/unit/home-dashboard.test.tsx`.
Delete RS-1 duplicate goal-evaluation reads and RS-2 `formatSessionComparisonMinutes()`.
The only allowed new surface is one local unexported `readPracticeGoalEvaluations()` helper plus an internal result type if needed.
Keep exported hook types/actions, goal statuses, stale guards, session-comparison strings, subscriptions, and browser guard behavior unchanged.
Do not touch `home-dashboard.tsx`, services, domain, command palette, routes, storage, status docs, or R-04 retired surfaces.
Run the focused home-dashboard unit test, typecheck, scoped lint, and both deletion `rg` proofs.
If any step needs a new file, public API, domain primitive, service change, or home component edit, stop and report PLAN_BLOCKED.
