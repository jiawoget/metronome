## 0. Verdict
Verdict: `PLAN_READY`
## 1. Pipeline Contract
Pipeline ID: `R-05 / practice-session-service`
One-PR objective:
- Delete duplicate target-hydration helpers in `practice-session-service`; route session history, session comparison, home recent activity, and continue targets through one local resolver pair.
Target debt pattern:
- semantic duplication / read-model facade bloat / helper naming residue
Allowed production files:
- `src/services/practice-session/service.ts`
Allowed test files:
- `tests/unit/practice-session-service.test.ts`
Explicitly out of scope:
- `src/services/practice-session/types.ts` public API changes; `src/domain/practice/**`; `src/hooks/**`; `src/components/**`; repositories; storage schema; routes.
- `prepareSheetRecordingMetadata`, `commitPreparedSheetRecordingSession`, rollback, duration methods, quick-session legacy compatibility, browser adapter wiring.
- Do not split this top-10 target into `R-05A/B`; this is one pipeline, not Phase 2 or practice read-model primitive completion.
This pipeline is not allowed to:
- widen public API; add a service/hook/controller/repository method; move browser adapter defaults; change visible messages; touch unrelated timing, harness, route, schema, or storage behavior.
## 2. Coding Read Set
### Must read before coding
| File | Why coding must read it | Decision it informs |
|---|---|---|
| `src/services/practice-session/service.ts` | Contains old helpers and callers. | Exact delete/replace edits. |
| `src/services/practice-session/types.ts` | Defines `PracticeSessionService`. | Confirm no public API change. |
| `tests/unit/practice-session-service.test.ts` | Covers target states and read-only guarantees. | Which assertions must pass or be tightened. |
| `src/domain/practice/session-history-groups.ts` | Defines target key and lookup result shape. | Preserve sheet/segment group semantics. |
| `src/domain/practice/recent-activity.ts` | Defines home target resolution semantics. | Preserve session/recording target states. |
### Planner-only evidence
| File | Why coding should not start from it |
|---|---|
| `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md` | Broad strategy already narrowed to this PR. |
| `docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md` | Establishes R-05 rank and baseline only. |
| `docs/refactor/src-debt-forensics-2026-07-04/05-practice-session-service.md` | Evidence distilled into retired surfaces below. |
| `docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md` | Template contract only. |
### Read only if blocked
| File | Trigger for reading |
|---|---|
| `src/domain/practice/session-comparison.ts` | `getSessionComparison` target-state tests fail after resolver replacement. |
| `tests/unit/session-comparison.test.ts` | Domain comparison behavior conflicts with service expectations. |
| `src/domain/practice/types.ts` | Existing session/recording fields cannot express the local source type. |
| `src/hooks/use-practice-session-dashboard.ts` | Public service API movement appears necessary; stop first. |
| `src/lib/sheet-practice/recording-service.ts` | Prepare/commit/rollback surfaces appear necessary; stop first. |
## 3. Existing Behavior Contract
The coding agent must preserve:
- Public props / exported API: `PracticeSessionService` methods in `src/services/practice-session/types.ts` unchanged.
- URL/query/storage contract: no storage schema, repository method, or browser adapter contract changes.
- Visible user messages: unchanged from current tests.
- Store/state-machine semantics: read-model methods stay read-only; no save/delete/clear/updateLastPracticedAt calls.
- Critical ordering: sheet targets resolve before segment targets; missing/lookup-failed sheets suppress segment lookup.
- Error/rollback behavior: lookup failures become `lookup-failed`; recording rollback paths are untouched.
- Tests or harness events that must not change: practice event capture, save, delete, clear, and recording metadata writes.
If preserving these requires widening scope, stop and report `PLAN_BLOCKED`.
## 4. Required Retired Surfaces
| ID | Old surface to delete | Why it is debt | Replacement | Required proof | Behavior test |
|---|---|---|---|---|---|
| RS-1 | `resolveSessionHistorySheetTargets` + `resolveHomeRecentActivitySheetTargets` | Same sheet id collection, gateway read, and valid/missing/lookup-failed mapping. | Local `resolvePracticeSheetTargets(sources)`. | `rg "resolve(SessionHistory|HomeRecentActivity)SheetTargets" src/services/practice-session/service.ts` returns no matches. | `practice-session-service.test.ts` history, comparison, and home sheet-state tests pass. |
| RS-2 | `resolveSessionHistorySegmentTargets` + `resolveHomeRecentActivitySegmentTargets` | Same segment key collection, sheet-state guard, gateway read, and lookup-state mapping. | Local `resolvePracticeSegmentTargets(sources, sheetTargets)`. | `rg "resolve(SessionHistory|HomeRecentActivity)SegmentTargets" src/services/practice-session/service.ts` returns no matches. | `practice-session-service.test.ts` segment history and home segment-state tests pass. |
| RS-3 | `getHomeRecentActivityTargetSources` | Home-only name hides source collection reused by history/comparison/home/continue read models. | Local `getPracticeTargetSources(sessions, recordings?)`. | `rg "getHomeRecentActivityTargetSources" src/services/practice-session/service.ts` returns no matches. | `practice-session-service.test.ts` continue-target and home read-only tests pass. |
## 5. Allowed New Surface Budget
| Proposed new surface | Allowed? | Constraints | Required retired surface |
|---|---:|---|---|
| Local unexported helper | yes | May read gateways only; no repository writes, service calls, UI messages, or side effects beyond contained lookups. | `RS-1`, `RS-2`, `RS-3` |
| Local type alias / discriminated union | yes | Internal only; no exported API. | `RS-3` |
| New file | no | Default no; if `service.ts` cannot absorb this, stop and report `PLAN_BLOCKED`. | none |
| New hook/controller/service/facade | no | Would widen surface. | none |
| New repository method | no | Would widen persistence contract. | none |
| New domain primitive | no | This PR is local service consolidation, not Phase 2 completion. | none |
Hard rule: if the retired surface cannot be named, the new surface is not allowed.
## 6. Implementation Steps
### Step `1`: Source and sheet resolver
Edit: `src/services/practice-session/service.ts`
Do: delete `RS-3` and `RS-1` -> replace with `getPracticeTargetSources(sessions, recordings?)` and `resolvePracticeSheetTargets(sources)`.
Do not change: session/recording input order for `selectHomeRecentActivity`; `valid`, `missing`, `lookup-failed` values.
Safety: source builder does not call repositories/gateways; sheet resolver skips blank ids and contains gateway errors.
Deletion proof: `rg "getHomeRecentActivityTargetSources|resolve(SessionHistory|HomeRecentActivity)SheetTargets" src/services/practice-session/service.ts`
Behavior proof: `tests/unit/practice-session-service.test.ts` history, comparison, home recent activity, and continue-target tests.
### Step `2`: Segment resolver
Edit: `src/services/practice-session/service.ts`
Do: delete `RS-2` -> replace with `resolvePracticeSegmentTargets(sources, sheets)`.
Do not change: `createSessionHistorySegmentTargetKey` format; failed/missing sheet suppression; absent-`segmentGateway` `{}` result.
Safety: skip blank segment ids; contain segment gateway errors as `lookup-failed`.
Deletion proof: `rg "resolve(SessionHistory|HomeRecentActivity)SegmentTargets" src/services/practice-session/service.ts`
Behavior proof: `tests/unit/practice-session-service.test.ts` segment history, comparison, home recent activity, and continue-target tests.
## 7. Async / State / Side-Effect Safety
The implementation must preserve:
- Pure resolver/helper rule: source builder is pure; async resolvers only read gateways and return target maps.
- Stale async guard: no UI state/effects, caches, subscriptions, or memoized cross-call state.
- Store ownership: repository writes, recording writes, `clear`, and `updateLastPracticedAt` stay outside read-model methods.
- Capture/save ordering: recording capture, prepare, save, commit, and rollback ordering unchanged.
- Effect dependency constraint: no hook/component edits in this PR.
If these cannot be preserved, the plan is blocked.
## 8. Verification Before Review Handoff
Coding agent must report exact evidence.
Required commands:
- `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-service.test.ts tests/unit/session-comparison.test.ts tests/unit/home-recent-activity-source.test.ts tests/unit/practice-session-history-groups.test.ts`
- `& .\scripts\npm-local.ps1 --% run typecheck`
- `& .\scripts\npm-local.ps1 --% run lint -- src/services/practice-session/service.ts tests/unit/practice-session-service.test.ts`
Required deletion proofs:
- `rg "resolve(SessionHistory|HomeRecentActivity)SheetTargets|resolve(SessionHistory|HomeRecentActivity)SegmentTargets|getHomeRecentActivityTargetSources" src/services/practice-session/service.ts`
- `rg "resolvePracticeSheetTargets|resolvePracticeSegmentTargets|getPracticeTargetSources" src/services/practice-session/service.ts`
Required review gates:
- changed-file Code Health must not decline if CodeScene is available; no new infrastructure/browser import; no public API change; no out-of-scope file changed; retired surface list matches diff.
## 9. Final Coding Agent Handoff
- Edit only `src/services/practice-session/service.ts` and, if assertions need tightening, `tests/unit/practice-session-service.test.ts`.
- Delete `RS-1`, `RS-2`, and `RS-3`; do not rename them.
- The only allowed new surface is local unexported target-source/resolver code in `service.ts`.
- Preserve `PracticeSessionService` exactly; no type or method additions/removals.
- Preserve read-only behavior for history, comparison, home recent activity, and continue-target methods.
- Do not touch recording prepare/commit/rollback, duration methods, adapters, repositories, hooks, components, or domain files.
- Run the required unit command, typecheck, and lint command; report both deletion `rg` outputs.
- Stop with `PLAN_BLOCKED` if this requires a new file, domain primitive, repository method, or public API movement.
