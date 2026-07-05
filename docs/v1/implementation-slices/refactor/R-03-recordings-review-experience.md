## 0. Verdict
Verdict: `PLAN_READY`

## 1. Pipeline Contract
Pipeline ID: `R-03 recordings-review-experience`

One-PR objective: delete local wrapper and selection-decision residue from `RecordingsReviewExperience` while preserving current review, organization, take-selection, and comparison behavior.

Target debt pattern: semantic duplication / wrapper residue / controller bloat.

Allowed production files: `src/components/recordings-review/recordings-review-experience.tsx`.

Allowed test files: `tests/unit/recordings-review-experience.test.tsx`.

Explicitly out of scope: `recording-comparison-panel.tsx`, `RecordingArtifactReview`, `recordings-review` repository/service contracts, audio export internals, marker seek internals, routes, storage/schema, E2E harness, status docs, repository R-10 debt, and recordings-review domain closeout.

This pipeline is not allowed to widen public API, add a new service/hook/controller/repository/facade/domain primitive, create files, move browser adapter defaults, change visible user messages, or touch unrelated timing, route, schema, storage, or test harness behavior.

## 2. Coding Read Set
### Must read before coding
| File | Why coding must read it | Decision it informs |
|---|---|---|
| `src/components/recordings-review/recordings-review-experience.tsx` | target file | exact RS deletions and internal prop rewiring |
| `src/components/recordings-review/use-recordings-review-controller.ts` | existing toggle actions | reuse controller actions instead of direct service wrappers |
| `src/components/recordings-review/use-bounded-recording-selection.ts` | existing selection predicates | replace repeated selected/disabled formulas |
| `src/services/recordings-review/index.ts` | existing service boundary | prove no new service method is needed |
| `tests/unit/recordings-review-experience.test.tsx` | behavior coverage | focused assertions for organization, take selection, and comparison |

### Planner-only evidence
| File | Why coding should not start from it |
|---|---|
| `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md` | broad strategy distilled here |
| `docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md` | baseline only |
| `docs/refactor/src-debt-forensics-2026-07-04/03-recordings-review-experience.md` | debt evidence distilled into RS rows |
| `docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md` | format source already applied |

### Read only if blocked
| File | Trigger for reading |
|---|---|
| `src/components/recordings-review/recording-comparison-panel.tsx` | tempted to retire cross-file metadata/resolver duplication |
| `src/lib/recordings-review/history.ts` | tempted to change practice href or accessible-name behavior |
| `src/components/recordings-review/recording-artifact-review.tsx` | tempted to touch playback/export/marker wiring |
| `src/lib/recordings-review/repository.ts` | behavior appears to require persistence contract changes |
| `tests/e2e/recordings-review.spec.ts` | unit evidence cannot cover a changed visible workflow |

## 3. Existing Behavior Contract
Preserve public props/export of `RecordingsReviewExperience`; `/recordings` sheet filter query behavior; recording history storage semantics; visible messages from current tests including best/active failure, organization failure, export, and comparison status text; service/controller ownership of recording organization and take-selection writes; comparison selection pruning on filters/delete/reload; review-wide comparison loading only after two selected recordings; group waveform comparison ownership separate from best/active controls; delete clears selected recording and comparison id.

If preserving these requires widening scope, stop and report `PLAN_BLOCKED`.

## 4. Required Retired Surfaces
| ID | Old surface to delete | Why it is debt | Replacement | Required proof | Behavior test |
|---|---|---|---|---|---|
| RS-1 | local `recordingOrganizationById` map plus `resolveRecordingOrganizationForRecord()` | duplicates service/repository organization resolver and leaks snapshot compatibility into UI | existing `reviewService.resolveRecordingOrganization(recording)` | no `recordingOrganizationById` or `resolveRecordingOrganizationForRecord` matches in target | organization filter/favorite/archive unit test |
| RS-2 | root `toggleFavorite(recording)` wrapper | wrapper residue around controller action and repeated organization lookup | pass `organization.favorite` from row/details call site into existing `toggleFavorite` controller action | no `function toggleFavorite` in target | list/detail favorite sync unit test |
| RS-3 | `updateBestTake()` and `updateActiveTake()` direct service wrappers | duplicate controller actions and parallel error-handling branches | existing `toggleBestTake` / `toggleActiveTake` controller actions behind one local UI action adapter | no `reviewService.setBestTake`, `reviewService.setActiveTake`, `function updateBestTake`, or `function updateActiveTake` in target | best/active success and repository failure unit tests |
| RS-4 | inline `includes(...)` plus length-cap formulas for review-wide and group comparison controls | duplicates `useBoundedRecordingSelection.isSelected/isDisabled` | existing hook predicates `isSelected(recording.id)` and `isDisabled(recording.id)` | no selected/disabled formula using `.includes` plus `MAX_*_COMPARISON` in item props | review-wide and group comparison unit tests |

## 5. Allowed New Surface Budget
| Proposed new surface | Allowed? | Constraints | Required retired surface |
|---|---:|---|---|
| Local unexported UI action adapter | yes | internal only; may call existing controller action and set existing error message; no new messages or public props | RS-3 |
| Local type alias / discriminated union | no | not needed for this pipeline | none |
| New file | no | if target becomes materially unreadable, stop and report | none |
| New hook/controller/service/facade | no | would widen surface | none |
| New repository method | no | would widen persistence contract | none |
| New domain primitive | no | this plan retires local wrappers only | none |

## 6. Implementation Steps
### Step 1: Organization Resolver Retirement
Edit: `src/components/recordings-review/recordings-review-experience.tsx`
Do: delete RS-1 -> replace organization resolution call sites with `reviewService.resolveRecordingOrganization(recording)` -> must not change filtering/tag inputs, archived/favorite semantics, or `recordingOrganization` fallback -> prove with `rg "recordingOrganizationById|resolveRecordingOrganizationForRecord" src/components/recordings-review/recordings-review-experience.tsx`.
Behavior proof: organization filter/favorite/archive unit test.

### Step 2: Favorite Wrapper Retirement
Edit: `src/components/recordings-review/recordings-review-experience.tsx`
Do: delete RS-2 -> replace with existing controller `toggleFavorite(recording, organization.favorite)` passed through internal props -> must not change favorite labels, `aria-pressed`, filters, or detail/list sync -> prove with `rg "function toggleFavorite" src/components/recordings-review/recordings-review-experience.tsx`.
Behavior proof: list/detail favorite sync unit assertions.

### Step 3: Take Selection Wrapper Retirement
Edit: `src/components/recordings-review/recordings-review-experience.tsx`
Do: delete RS-3 -> replace direct service writes with existing controller `toggleBestTake` and `toggleActiveTake` -> must not change labels, `aria-pressed`, independent toggling, or failure messages -> prove with `rg "setBestTake|setActiveTake|updateBestTake|updateActiveTake" src/components/recordings-review/recordings-review-experience.tsx`.
Behavior proof: best/active success plus repository failure unit tests.

### Step 4: Selection Predicate Retirement
Edit: `src/components/recordings-review/recordings-review-experience.tsx`
Do: delete RS-4 -> replace item selected/disabled formulas with `useBoundedRecordingSelection` predicates -> must not change selected id order, request id behavior, pruning after filter/delete, or group-vs-review separation -> prove with `rg "includes\\(recording.id\\)|length >=\\s*MAX_.*COMPARISON" src/components/recordings-review/recordings-review-experience.tsx`.
Behavior proof: review-wide comparison and group waveform comparison unit tests.

## 7. Async / State / Side-Effect Safety
The implementation must not add async work. Existing waveform, export, and delete async behavior stays untouched. Organization and take-selection writes must continue through the existing service/controller boundary only. Local helpers may read current props/state and call existing controller actions, but must not introduce new state owners. Effect dependencies in waveform hooks must remain unchanged.

If these cannot be preserved, the plan is blocked.

## 8. Verification Before Review Handoff
Required commands:
```bash
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/recordings-review-experience.test.tsx
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/recordings-review/recordings-review-experience.tsx tests/unit/recordings-review-experience.test.tsx
```

Required deletion proofs:
```bash
rg "recordingOrganizationById|resolveRecordingOrganizationForRecord" src/components/recordings-review/recordings-review-experience.tsx
rg "function toggleFavorite|setBestTake|setActiveTake|updateBestTake|updateActiveTake" src/components/recordings-review/recordings-review-experience.tsx
rg "includes\(recording.id\)|length >=\s*MAX_.*COMPARISON" src/components/recordings-review/recordings-review-experience.tsx
```

Required review gates: changed-file Code Health must not decline if CodeScene is available; no new file, infrastructure/browser import, public API, service/controller/repository method, domain primitive, or out-of-scope file; retired surface list must match the actual diff.

Optional commands only if touched behavior warrants them:
```bash
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/recordings-review.spec.ts
```

## 9. Final Coding Agent Handoff
Edit only `recordings-review-experience.tsx` and focused unit tests. Delete RS-1 through RS-4. Reuse `reviewService.resolveRecordingOrganization`, controller toggle actions, and `useBoundedRecordingSelection` predicates. The only allowed new surface is one local unexported UI action adapter for best/active error handling. Preserve props, sheet filter behavior, visible messages, organization writes, take-selection writes, comparison pruning, and group/review selection separation. Do not touch repository/service contracts, comparison panel, artifact review, audio export internals, marker seek internals, routes, storage/schema, E2E harness, status docs, or recordings-review domain closeout. Run the required unit test, typecheck, scoped lint, deletion proofs, and CodeScene no-decline check if available. If any deletion requires a new public surface or out-of-scope file, stop and report `PLAN_BLOCKED`.
