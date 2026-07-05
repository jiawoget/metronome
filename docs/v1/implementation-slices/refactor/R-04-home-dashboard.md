## 0. Verdict
Verdict: `PLAN_READY`
## 1. Pipeline Contract
Pipeline ID: `R-04 / home-dashboard`
One-PR objective: Delete dead home-dashboard compatibility surfaces so the page and dashboard hook expose one plural Continue Practice contract and one goal-action contract.
Target debt pattern: compatibility residue / wrapper residue / duplicated injected dashboard contract
Allowed production files: `src/components/home/home-dashboard.tsx`; `src/hooks/use-practice-session-dashboard.ts`
Allowed test files: `tests/unit/home-dashboard.test.tsx`
Explicitly out of scope: `src/services/practice-session/**`, `src/domain/practice/**`, command palette continue mapping, analytics/streaks/recent-activity/session-comparison behavior, panel extraction, Phase 2 closeout, home/dashboard family closeout
This pipeline is not allowed to: widen public API; add a service/hook/controller/repository/facade/domain primitive; create a new file; change URLs, storage, browser adapter defaults, user messages, timing, or route behavior
## 2. Coding Read Set
### Must read before coding
| File | Why coding must read it | Decision it informs |
|---|---|---|
| `src/components/home/home-dashboard.tsx` | Target file owns injected props, aliases, placeholder fields, and safe-href wrapper. | Exact deletes and unchanged render behavior. |
| `src/hooks/use-practice-session-dashboard.ts` | Publishes mirrored `continueTarget` and goal action aliases consumed by home. | Keep only canonical hook state/actions. |
| `tests/unit/home-dashboard.test.tsx` | Fixture and behavior coverage for injected data, Continue Practice rows, and goal mutations. | Test rewrites and behavior proof. |
### Planner-only evidence
| File | Why coding should not start from it |
|---|---|
| `skills/metronome_planner.md`; `docs/architecture/debt-gate-map.md`; `docs/agent-index/01-app-shell-home.md`; `docs/agent-index/08-practice-session.md`; `docs/v1/01-app-shell-home.md`; `docs/v1/08-practice-session.md` | Skill file read: `skills/metronome_planner.md`; Debt gate map read: `docs/architecture/debt-gate-map.md`; owner/v1 evidence says Home stays an action dashboard and session-owned history remains local-first. |
| `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md`; `00-project-codescene-scan.md`; `04-home-dashboard.md`; `docs/v1/implementation-slices/refactor/R-09-use-practice-session-dashboard.md` | remediation, rank, per-file debt, and sibling hook-plan evidence distilled into scope and RS rows. |
| Repo-map searches over `src/**`, `tests/**`, `docs/v1/**`, `docs/refactor/**`: `normalize|format|validate|resolve|select|build|create`, service/repository/controller/hook/adapter, `continueTarget|continueTargets|onSavePracticeGoal|onDeletePracticeGoal|HomeDashboard` | Existing primitive search found plural Continue Practice rows and canonical hook actions; RS list is sufficient because no new surface is allowed and each compatibility alias is deleted in home/hook only. |
### Read only if blocked
| File | Trigger for reading |
|---|---|
| `src/services/practice-session/types.ts` | Typecheck says removing home/hook `continueTarget` requires service API changes. |
| `src/services/practice-session/service.ts` | Typecheck points to service `getContinuePracticeTarget()` from this narrow change. |
| `src/domain/practice/continue-practice.ts` | Direct `getContinuePracticeTargetHref()` use changes target identity expectations. |
| `src/components/app-shell/command-palette-commands.ts` | Continue Practice row mapping contradicts command palette behavior. |
| `tests/unit/continue-practice-navigation.test.ts` | Navigation href behavior appears to change. |
## 3. Existing Behavior Contract
The coding agent must preserve:
- Public props / exported API: `HomeDashboard({ data?: HomeDashboardData })`; remove only `continueTarget`, `recentSheets`, `recentRecordings`, `onSavePracticeGoal`, and `onDeletePracticeGoal` from home/hook contracts.
- URL/query/storage contract: all existing `getContinuePracticeTargetHref()` results, `/quick-metronome`, `/sheet-practice/:sheetId`, and segment routes remain unchanged.
- Visible user messages: unchanged from `tests/unit/home-dashboard.test.tsx`.
- Store/state-machine semantics: `usePracticeSessionDashboard()` remains the live-data owner; save/delete status and errors remain hook-owned for live data and panel-local for injected test data.
- Critical ordering: goal draft validation before save; delete confirmation before delete; Continue Practice target rejection still renders disabled rows.
- Error/rollback behavior: failed dashboard reads keep prior loaded data where current tests require it; goal failures keep the form open and show existing error text.
- Tests or harness events that must not change: home-dashboard test ids, Continue Practice row links/disabled rows, goal form roles, subscription refresh behavior.
If preserving these requires widening scope, stop and report `PLAN_BLOCKED`.
## 4. Required Retired Surfaces
| ID | Old surface to delete | Why it is debt | Replacement | Required proof | Behavior test |
|---|---|---|---|---|---|
| RS-1 | Home/hook `continueTarget` field and injected legacy single-target test path. | Dead singular mirror; current UI renders plural `continueTargets`. | Existing `continueTargets`, status, and error fields. | `rg -n "continueTarget" src/components/home/home-dashboard.tsx src/hooks/use-practice-session-dashboard.ts tests/unit/home-dashboard.test.tsx` returns no matches. | Continue Practice plural row tests still pass. |
| RS-2 | `onSavePracticeGoal` / `onDeletePracticeGoal` aliases in home data, panel props, hook actions, and tests. | Alias contract doubles mutation entry points. | Existing `savePracticeGoal` / `deletePracticeGoal`. | `rg -n "onSavePracticeGoal|onDeletePracticeGoal" src/components/home/home-dashboard.tsx src/hooks/use-practice-session-dashboard.ts tests/unit/home-dashboard.test.tsx` returns no matches. | Goal create/edit/delete tests still pass. |
| RS-3 | `recentSheets` and `recentRecordings` placeholder props/defaults/test fixture fields. | Empty tuple props are never read and widen the dashboard contract. | No replacement; static CTA cards remain unchanged. | `rg -n "recentSheets|recentRecordings" src/components/home/home-dashboard.tsx tests/unit/home-dashboard.test.tsx` returns no matches. | Empty home and CTA-card assertions still pass. |
| RS-4 | `safelyGetContinuePracticeHref()` local wrapper. | One-line defensive wrapper around existing pure route helper. | Direct `getContinuePracticeTargetHref(target)`. | `rg -n "safelyGetContinuePracticeHref" src/components/home/home-dashboard.tsx` returns no matches. | Continue Practice row href assertions still pass. |
Rules: adding a helper without deleting the old implementation, renaming a helper, moving duplicate logic, or leaving aliases/wrappers is failure.
## 5. Allowed New Surface Budget
| Proposed new surface | Allowed? | Constraints | Required retired surface |
|---|---:|---|---|
| Local unexported helper | no | Delete wrappers; do not replace them with renamed wrappers. | none |
| Local type alias / discriminated union | no | Use existing home/hook types after field deletion. | none |
| New file | no | If the target file becomes unreadable, stop and report scope expansion. | none |
| New hook/controller/service/facade | no | Would widen surface. | none |
| New repository method | no | Would widen persistence contract. | none |
| New domain primitive | no | R-04 does not create domain primitives. | none |
## 6. Implementation Steps
### Step 1: Delete singular Continue Practice home mirror
Edit: `src/components/home/home-dashboard.tsx`; `src/hooks/use-practice-session-dashboard.ts`; `tests/unit/home-dashboard.test.tsx`
Do: delete RS-1 -> replace with existing plural `continueTargets` state and fixtures.
Do not change: service `getContinuePracticeTarget()`, route helpers, command palette, or visible Continue Practice row behavior.
Safety: keep `continueTargetsStatus` fallback and rejected-target disabled rows unchanged.
Deletion proof: `rg -n "continueTarget" src/components/home/home-dashboard.tsx src/hooks/use-practice-session-dashboard.ts tests/unit/home-dashboard.test.tsx`
Behavior proof: `tests/unit/home-dashboard.test.tsx` Continue Practice loaded/loading/error tests.
### Step 2: Delete goal action aliases
Edit: `src/components/home/home-dashboard.tsx`; `src/hooks/use-practice-session-dashboard.ts`; `tests/unit/home-dashboard.test.tsx`
Do: delete RS-2 -> replace all home/panel/test wiring with `savePracticeGoal` and `deletePracticeGoal`.
Do not change: goal draft validation, generated goal shape, mutation statuses, or save/delete error text.
Safety: preserve async `Promise.resolve(...)` handling and mounted-state guard behavior.
Deletion proof: `rg -n "onSavePracticeGoal|onDeletePracticeGoal" src/components/home/home-dashboard.tsx src/hooks/use-practice-session-dashboard.ts tests/unit/home-dashboard.test.tsx`
Behavior proof: `tests/unit/home-dashboard.test.tsx` goal create/edit/delete/failure tests.
### Step 3: Delete placeholder recent props
Edit: `src/components/home/home-dashboard.tsx`; `tests/unit/home-dashboard.test.tsx`
Do: delete RS-3 -> replace with no prop or fixture field.
Do not change: static Quick Metronome, Sheet Library, and Import Recording CTA card text or hrefs.
Safety: do not add a recent sheet/recording read model.
Deletion proof: `rg -n "recentSheets|recentRecordings" src/components/home/home-dashboard.tsx tests/unit/home-dashboard.test.tsx`
Behavior proof: `tests/unit/home-dashboard.test.tsx` empty dashboard and CTA-card assertions.
### Step 4: Delete safe-href wrapper
Edit: `src/components/home/home-dashboard.tsx`
Do: delete RS-4 -> replace with direct `getContinuePracticeTargetHref(target)`.
Do not change: target rejection, disabled rows, link labels, or href values.
Safety: if direct helper can throw for a current tested target, stop and report `PLAN_BLOCKED`.
Deletion proof: `rg -n "safelyGetContinuePracticeHref" src/components/home/home-dashboard.tsx`
Behavior proof: `tests/unit/home-dashboard.test.tsx` Continue Practice row href assertions.
## 7. Async / State / Side-Effect Safety
The implementation must preserve:
- Pure resolver/helper rule: deleted wrappers must not be replaced by new stateful helpers.
- Stale async guard: hook refresh identity checks and mounted guards remain unchanged.
- Store ownership: `savePracticeGoal`, `deletePracticeGoal`, and `refreshPracticeGoals` remain the only hook action names.
- Capture/save ordering: goal validation before save; delete confirmation before delete.
- Effect dependency constraint: do not add new object/function dependencies to dashboard refresh effects.
If these cannot be preserved, the plan is blocked.
## 8. Verification Before Review Handoff
Coding agent must report exact evidence.
Required commands:
```bash
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/home/home-dashboard.tsx src/hooks/use-practice-session-dashboard.ts tests/unit/home-dashboard.test.tsx
```
Required deletion proofs:
```bash
rg -n "continueTarget" src/components/home/home-dashboard.tsx src/hooks/use-practice-session-dashboard.ts tests/unit/home-dashboard.test.tsx
rg -n "onSavePracticeGoal|onDeletePracticeGoal" src/components/home/home-dashboard.tsx src/hooks/use-practice-session-dashboard.ts tests/unit/home-dashboard.test.tsx
rg -n "recentSheets|recentRecordings|safelyGetContinuePracticeHref" src/components/home/home-dashboard.tsx tests/unit/home-dashboard.test.tsx
```
Required review gates: changed-file Code Health must not decline if CodeScene is available; no new infrastructure/browser import, public API, file, service/hook/controller/repository/facade/domain primitive, or out-of-scope file changed; retired surface list must match the diff.
## 9. Final Coding Agent Handoff
Edit only `src/components/home/home-dashboard.tsx`, `src/hooks/use-practice-session-dashboard.ts`, and `tests/unit/home-dashboard.test.tsx`.
Delete RS-1 `continueTarget`, RS-2 goal action aliases, RS-3 placeholder recent props, and RS-4 safe-href wrapper.
Use only existing `continueTargets`, `savePracticeGoal`, `deletePracticeGoal`, and `getContinuePracticeTargetHref`.
Do not add files, helpers, hooks, services, repositories, facades, domain primitives, imports, routes, storage behavior, or UI messages.
Keep Continue Practice rows, disabled rejected targets, goal mutation lifecycle, and dashboard read-error behavior unchanged.
Do not touch practice-session service/domain, command palette, analytics, streaks, recent activity, or session comparison.
Run the home-dashboard unit test, typecheck, edited-file lint, and all deletion `rg` proofs.
If any required deletion forces service/domain changes or new public API, stop and report `PLAN_BLOCKED`.
