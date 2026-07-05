## 0. Verdict
Verdict: `PLAN_READY`
## 1. Pipeline Contract
Pipeline ID: `R-10 recordings-review-repository`
One-PR objective: delete duplicate snapshot-write, take-selection, and organization mutation surfaces inside `recordingHistoryRepository` while preserving the exported API.
Target debt pattern: semantic duplication / wrapper residue / boundary mixing / compatibility residue
Allowed production files: `src/lib/recordings-review/repository.ts`
Allowed test files: `tests/unit/recordings-review-repository.test.ts`
Explicitly out of scope: `src/services/recordings-review/index.ts`, `src/components/recordings-review/**`, quick/sheet callers, Dexie migration, storage-key/schema migration, artifact storage, event-name removal, `seedRecordingHistoryForTests` relocation, and claiming the recordings-review repository family is complete.
This pipeline is not allowed to:
- widen public API; add a new service/hook/controller/repository method; move browser adapter defaults; change visible user messages; touch unrelated timing, test harness, route, schema, or storage behavior
## 2. Coding Read Set
### Must read before coding
| File | Why coding must read it | Decision it informs |
|---|---|---|
| `src/lib/recordings-review/repository.ts` | Target old surfaces and write ownership. | Exact delete/replace edits. |
| `src/lib/recordings-review/recording-history-snapshot.ts` | Existing builder and normalized selectors. | Optional-field omission and normalized reads. |
| `src/lib/recordings-review/recording-organization-metadata.ts` | Existing tag/org validation. | Remove duplicate tag checks without changing errors. |
| `src/lib/recordings-review/take-selection-metadata.ts` | Existing take-selection create/resolve primitive. | Preserve best/active semantics. |
| `tests/unit/recordings-review-repository.test.ts` | Existing repository behavior coverage. | Assertions to keep or add. |
### Planner-only evidence
| File | Why coding should not start from it |
|---|---|
| `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md` | Broad strategy already distilled here. |
| `docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md` | Ranking evidence only. |
| `docs/refactor/src-debt-forensics-2026-07-04/10-recordings-review-repository.md` | Debt evidence converted into RS items. |
| `docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md` | Output rules already applied. |
### Read only if blocked
| File | Trigger for reading |
|---|---|
| `src/lib/recordings-review/recording-history-operations.ts` | Repository edit changes save/delete/rollback behavior. |
| `src/services/recordings-review/index.ts` | Typecheck says service contract changed. |
| `src/lib/sheet-practice/recording-service.ts` | Typecheck says a sheet caller contract changed. |
| `src/lib/quick-metronome/recording-controller.ts` | Typecheck says a quick caller contract changed. |
| `docs/architecture/debt-gate-map.md` | Architecture boundary test fails and rule owner is unclear. |
## 3. Existing Behavior Contract
- Public props / exported API: `RECORDINGS_STORAGE_KEY`, `RecordingHistoryConcurrentWriteError`, `seedRecordingHistoryForTests`, and every current `recordingHistoryRepository` method name, argument shape, and return behavior.
- URL/query/storage contract: `RECORDINGS_STORAGE_KEY` and snapshot fields `sessions`, `recordings`, `errorMarkers`, `takeSelections`, `recordingOrganization`, `sheetRecordingMetadata`.
- Visible user messages: existing thrown messages for `"does not belong"`, `"duplicates"`, `"empty"`, `"up to 8 tags"`, and missing recording/error-marker cases.
- Store/state-machine semantics: best/active setters preserve the other valid slot; null/null removes take metadata; empty organization metadata is omitted.
- Critical ordering: validate current recording/group before writing; every storage write goes through stale-write protection.
- Error/rollback behavior: invalid tag or stale group writes throw before `localStorage` changes.
- Tests or harness events that must not change: `subscribe` still reacts to both repository event names and browser `storage`.
If preserving these requires widening scope, stop and report `PLAN_BLOCKED`.
## 4. Required Retired Surfaces
| ID | Old surface to delete | Why it is debt | Replacement | Required proof | Behavior test |
|---|---|---|---|---|---|
| RS-1 | Internal `writeSnapshot(snapshot)` wrapper and calls. | One-line wrapper hides the only write path. | Direct `mutateSnapshotWithStaleWriteProtection(() => nextSnapshot)`. | `rg -n "writeSnapshot" src/lib/recordings-review/repository.ts` no hits. | Repository persistence tests pass. |
| RS-2 | Parallel `setBestTake` / `setActiveTake` branch chains. | CodeScene duplication. | One local take-slot helper delegating to `updateTakeSelection`. | Public methods only delegate; `nextBestRecordingId|nextActiveRecordingId` confined to helper. | Take-selection tests at `252-365` pass. |
| RS-3 | Manual duplicate-tag branch in `addRecordingTag` plus repeated org write templates. | Reimplements metadata validation. | One local organization mutator using existing metadata primitives. | `rg -n "existingTags\\.some|Recording tags must not contain duplicates" src/lib/recordings-review/repository.ts` no hits. | Organization tests at `528-647` pass. |
| RS-4 | `clear()` hand-written compare/set/publish transaction. | Duplicates stale-write transaction logic. | `void mutateSnapshotWithStaleWriteProtection(() => emptySnapshot, { maxAttempts: 1 })`. | `storage.setItem(RECORDINGS_STORAGE_KEY` appears only in shared write helper. | Add/keep test for empty persisted snapshot and subscriber notification. |
## 5. Allowed New Surface Budget
| Proposed new surface | Allowed? | Constraints | Required retired surface |
|---|---:|---|---|
| Local unexported take-slot helper | yes | Same file; may read snapshot and call existing `updateTakeSelection`; no new storage/event code. | RS-2 |
| Local unexported organization mutator | yes | Same file; may call existing `updateRecordingOrganization`; no new messages or exported type. | RS-3 |
| Local type alias / discriminated union | yes | Internal only; no exported API. | RS-2 or RS-3 |
| New file | no | Stop and report if the target file becomes materially unreadable. | none |
| New hook/controller/service/facade | no | Would widen surface. | none |
| New repository method | no | Would widen persistence contract. | none |
| New domain primitive | no | This PR must stay inside the existing repository boundary. | none |
Hard rule: if the plan cannot name the retired surface tied to a new surface, the new surface is not allowed.
## 6. Implementation Steps
### Step 1: Delete snapshot wrapper
Edit: `src/lib/recordings-review/repository.ts`
Do: delete RS-1 -> replace with direct `mutateSnapshotWithStaleWriteProtection(() => nextSnapshot)` calls.
Do not change: exported API, storage key, snapshot serialization, or event dispatch.
Safety: preserve each current return value; use `void` only where the public method currently returns `void`.
Deletion proof: `rg -n "writeSnapshot" src/lib/recordings-review/repository.ts`
Behavior proof: `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/recordings-review-repository.test.ts`
### Step 2: Delete parallel take setters
Edit: `src/lib/recordings-review/repository.ts`
Do: delete RS-2 -> replace with one helper that resolves selection/group, validates the edited slot, preserves the peer slot, then calls `updateTakeSelection`.
Do not change: `setBestTake`, `setActiveTake`, `resolveTakeSelection`, or stale-group error behavior.
Safety: validation must happen before any write and must use `assertRecordingBelongsToGroup`.
Deletion proof: `rg -n "nextBestRecordingId|nextActiveRecordingId" src/lib/recordings-review/repository.ts`
Behavior proof: take-selection assertions in `tests/unit/recordings-review-repository.test.ts`
### Step 3: Delete organization mutator repetition
Edit: `src/lib/recordings-review/repository.ts`
Do: delete RS-3 -> replace with one helper that requires the current recording once and derives tags/favorite/archived before `updateRecordingOrganization`.
Do not change: tag normalization, duplicate/empty/length error messages, omission of empty `recordingOrganization`.
Safety: invalid tag writes must throw before localStorage changes.
Deletion proof: `rg -n "existingTags\\.some|Recording tags must not contain duplicates" src/lib/recordings-review/repository.ts`
Behavior proof: organization assertions in `tests/unit/recordings-review-repository.test.ts`
### Step 4: Delete clear transaction clone
Edit: `src/lib/recordings-review/repository.ts`; `tests/unit/recordings-review-repository.test.ts`
Do: delete RS-4 -> replace with `void mutateSnapshotWithStaleWriteProtection(() => emptySnapshot, { maxAttempts: 1 })`.
Do not change: `recordingHistoryRepository.clear`, event names, or subscriber behavior.
Safety: no direct `localStorage.setItem` outside the shared write helper.
Deletion proof: `rg -n "storage\\.setItem\\(RECORDINGS_STORAGE_KEY" src/lib/recordings-review/repository.ts`
Behavior proof: repository test covers empty persisted snapshot and subscriber notification after `clear()`.
## 7. Async / State / Side-Effect Safety
- Pure resolver/helper rule: value-deriver helpers stay synchronous and do not call browser APIs directly.
- Stale async guard: no async work is introduced; stale storage comparison remains inside `mutateSnapshotWithStaleWriteProtection`.
- Store ownership: `recordingHistoryRepository` and existing `recordingHistoryOperations` remain the only writers.
- Capture/save ordering: not applicable; repository validation still precedes persistence writes.
- Effect dependency constraint: no React effect or hook dependency changes.
If these cannot be preserved, the plan is blocked.
## 8. Verification Before Review Handoff
Required commands:
```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/recordings-review-repository.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/lib/recordings-review/repository.ts tests/unit/recordings-review-repository.test.ts
```
Required deletion proofs:
```powershell
rg -n "writeSnapshot" src/lib/recordings-review/repository.ts; rg -n "existingTags\\.some|Recording tags must not contain duplicates" src/lib/recordings-review/repository.ts; rg -n "storage\\.setItem\\(RECORDINGS_STORAGE_KEY" src/lib/recordings-review/repository.ts; rg -n "nextBestRecordingId|nextActiveRecordingId" src/lib/recordings-review/repository.ts
```
Required review gates:
- changed-file Code Health must not decline if CodeScene is available; no new infrastructure/browser import; no new public API; no out-of-scope file changed; retired surface list matches diff
## 9. Final Coding Agent Handoff
- Edit only `src/lib/recordings-review/repository.ts` and, for clear coverage, `tests/unit/recordings-review-repository.test.ts`.
- Delete RS-1 `writeSnapshot`; delete RS-2 parallel take setter logic; delete RS-3 org mutator repetition; delete RS-4 clear transaction clone.
- The only allowed new surfaces are same-file unexported helpers tied to RS-2 or RS-3.
- Keep exported repository API, storage schema, event names, and current error messages unchanged.
- Run required unit, typecheck, lint, and `rg` deletion proofs before handoff.
- Stop and report `PLAN_BLOCKED` if this needs a new file, repository method, service, controller, hook, or domain primitive.
