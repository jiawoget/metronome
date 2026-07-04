# F7-2 Non-Viewer UI/Hook Infrastructure Boundary Plan

## Planning Status

Status: `planning_in_progress`

Planning branch: `codex/pack-f-f7-2-boundary-plan`

Scope type: Pack F F7 substage plan-only PR for removing direct
`@/infrastructure/**` imports from non-viewer UI and hook files.

Model tier for future coding/review: `gpt-5.5`, extra-high reasoning, standard
speed/no-fast path. This is boundary hardening work across several verified UI
areas and should be reviewed as architecture work even if the implementation is
mechanical.

This plan PR must not edit product code, tests, package manifests, lockfiles,
dependency files, or installed packages.

## Status JSON Handling

Do not update `docs/v1/status.json` in this plan PR unless a reviewer explicitly
requests a status-only correction.

Current expected lifecycle after PR #104:

- Pack F remains `implementation_in_progress`.
- `F7-boundary-hardening-viewer-closeout` remains `coding_in_progress`.
- `F7-boundary-hardening-viewer-closeout` keeps the parent plan pointer:
  `docs/v1/implementation-slices/plans/F7-boundary-hardening-viewer-closeout.md`.
- F7 is not marked `implementation_done` or `verified` by this plan.

The F7-2 coding PR may keep the same F7 lifecycle state and reference this file
from the PR body. Do not mark F7 implementation done until the final F7 closeout
substage is complete and verified.

## Required Reads Completed For This Plan

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/plans/F7-boundary-hardening-viewer-closeout.md`
- `docs/v1/implementation-slices/rules/external-library-first.md`
- `docs/v1/code-review-workflow.md`
- `tests/unit/architecture-boundaries.test.ts`

Focused scans completed on this planning branch after PR #104 was present on
`main`:

```powershell
rg -n "@/infrastructure" src/components src/app src/hooks
rg --files tests/unit
rg -n "@/infrastructure|browser[A-Z]|BrowserLocalReferenceAudioPlayer|Props|export function|function" src/hooks/use-practice-session-dashboard.ts src/hooks/use-command-palette-continue-targets.ts src/components/settings/settings-experience.tsx src/components/sheet-library/sheet-library-experience.tsx src/components/quick-metronome/quick-metronome-experience.tsx src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx src/components/sheet-practice/reference/reference-panel.tsx src/components/sheet-practice/segments/practice-segment-selector-panel.tsx src/components/sheet-practice/controls/sheet-practice-controls.tsx
rg -n "componentInfrastructureImportAllowlist|default-blocks UI components|src/app|src/hooks|@/infrastructure" tests/unit/architecture-boundaries.test.ts
```

## Current Boundary Inventory

`rg -n "@/infrastructure" src/components src/app src/hooks` reported 18
non-viewer hits on the scanned planning revision. This inventory is valid only
for that revision. Before editing, the F7-2 coding agent must re-run the scan on
the actual coding base and use the fresh output as the target list.

If PR #104 is not included in the coding base, F7-2 must either wait for #104 to
land on `main`, stack explicitly on top of the #104 branch with that dependency
called out in the PR body, or regenerate this target inventory against the
chosen base before implementation starts.

In the scanned revision, `src/app` had no hits, but it was not yet covered by
the default UI infrastructure-import guardrail.

| Area | Current import owner | Current infrastructure imports | Existing injection seam |
| --- | --- | --- | --- |
| Home/dashboard hook | `src/hooks/use-practice-session-dashboard.ts` | `browserPracticeSessionService` from `@/infrastructure/db/browser-practice-session-service` | No parameter; hook reads the singleton directly. |
| Command palette hook | `src/hooks/use-command-palette-continue-targets.ts` | `browserPracticeSessionService` from `@/infrastructure/db/browser-practice-session-service` | No service parameter; hook reads the singleton directly. |
| Settings UI | `src/components/settings/settings-experience.tsx` | `browserSettingsService`, `browserStorageSummaryService`, `browserLocalDataCleanupService`, `browserMicrophonePermissionService` | `SettingsExperienceProps` already accepts `settingsService`, `storageSummaryService`, `cleanupService`, and `permissionService`. |
| Sheet Library UI | `src/components/sheet-library/sheet-library-experience.tsx` | `browserSheetLibraryService`, `browserPracticeSessionService` | No top-level props today; introduce narrow optional service props only if needed. |
| Quick Metronome UI | `src/components/quick-metronome/quick-metronome-experience.tsx` | `browserPracticeSessionService` | No top-level service prop today; recording controller already receives the service at the call site. |
| Measure Grid calibration UI | `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | `browserMeasureGridService` | `MeasureGridCalibrationPanelProps` already accepts `measureGridService`. |
| Reference panel UI | `src/components/sheet-practice/reference/reference-panel.tsx` | `browserReferenceService`, `browserPracticeSessionService`, `BrowserLocalReferenceAudioPlayer` | `ReferencePanelProps` already accepts `referenceService`, `sessionService`, and `createAudioPlayer`, but its `createAudioPlayer` type is currently the concrete browser class. |
| Practice Segment selector UI | `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | `browserPracticeSegmentService`, `browserMeasureGridService` | `PracticeSegmentSelectorPanelProps` already accepts `practiceSegmentService` and `measureGridService`. |
| Sheet Practice controls UI | `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | `browserPracticeSessionService`, `browserPracticeSegmentService`, `browserSheetMetronomePresetService`, `browserMeasureGridService` | `SheetPracticeControlsProps` already accepts all four services. |

## Refined Scope

Implement only the non-viewer UI/hook boundary move:

- Remove direct `@/infrastructure/**` imports from:
  - `src/components/settings/**`
  - `src/components/sheet-library/**`
  - `src/components/quick-metronome/**`
  - `src/components/sheet-practice/controls/**`
  - `src/components/sheet-practice/measure-grid/**`
  - `src/components/sheet-practice/segments/**`
  - `src/components/sheet-practice/reference/**`
  - `src/hooks/**`
  - `src/app/**`
- Expand the default architecture guardrail so it scans `src/components`,
  `src/app`, and `src/hooks` for UI-to-infrastructure imports.
- Remove stale F7-expiring allowlist entries for files fixed by this substage.
- Keep all user-visible behavior unchanged.
- Keep existing service contracts unchanged unless a tiny type alias is required
  to avoid exposing a concrete browser class in UI props.

## Out Of Scope

- No Sheet Viewer changes. F7-1 already covered viewer boundary work.
- No mutation-hardening changes. Leave sheet library mutation try/catch/finally,
  quick metronome stop handling, sheet practice stop handling, diagnostics/test
  globals, and final Pack F scans for F7-3.
- No package install, dependency replacement, lockfile churn, or schema change.
- No visual redesign, route rewrite, feature addition, or broad state-management
  change.
- No new dependency-injection framework or app-wide provider tree.
- No reference A-B loop, reference-synced page turning, automatic score
  following, automatic PDF recognition, automatic mistake detection, cloud sync,
  login, or backend/network dependency.
- No weakening architecture tests to preserve direct UI infrastructure imports.

## Boundary Strategy

Use the smallest composition move that preserves existing ownership:

1. Keep low-level browser repositories/adapters in `src/infrastructure/**`.
2. Add narrow browser-facing composition modules outside `src/components`,
   `src/app`, and `src/hooks` only where UI needs a default browser singleton.
   Preferred locations are existing domain service folders, such as:
   - `src/services/practice-session/browser.ts`
   - `src/services/settings/browser.ts`
   - `src/services/sheet-library/browser.ts`
   - `src/services/measure-grid/browser.ts`
   - `src/services/practice-segments/browser.ts`
   - `src/services/reference/browser.ts`
   - `src/services/sheet-metronome-presets/browser.ts`
3. Browser composition modules may import existing infrastructure singletons and
   re-export only typed service/player factories. They must not add behavior,
   validation, persistence policy, or fallback logic.
4. UI components and hooks should import service types from `src/services/**`
   and default browser services from the new browser-facing service composition
   modules, not from `@/infrastructure/**`.
5. Where components already accept service props, preserve those props and move
   only the default value import.
6. Where components/hooks currently have no service injection seam, add the
   smallest seam that keeps current call sites compatible:
   - A props object for top-level experiences when tests need mocking.
   - An optional internal options parameter for hooks only if existing tests or
     future maintainability need it.
7. If a direct `@/infrastructure/**` import must remain, the coding PR must
   document it as an approved exception with reason, owner, and removal
   condition. The expected target for F7-2 is zero such hits in
   `src/components`, `src/app`, and `src/hooks`.

## Implementation Plan For Future Coding Agent

### 1. Add Service Composition Exports

Create only the modules needed by the current import inventory. Start with these
likely files:

```text
src/services/practice-session/browser.ts
src/services/settings/browser.ts
src/services/sheet-library/browser.ts
src/services/measure-grid/browser.ts
src/services/practice-segments/browser.ts
src/services/reference/browser.ts
src/services/sheet-metronome-presets/browser.ts
```

Each file should be a thin composition/export surface over the existing browser
singleton in `src/infrastructure/**`.

Examples of intended ownership, not required exact code:

```ts
// src/services/practice-session/browser.ts
export { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";
```

```ts
// src/services/reference/browser.ts
export { browserReferenceService } from "@/infrastructure/reference/browser-reference-service";
export { createBrowserLocalReferenceAudioPlayer } from "@/services/reference/browser-audio-player";
```

If a helper module is needed for the reference audio player factory, keep it in
the service/reference boundary and expose only an interface or factory type to
UI. Do not make `ReferencePanelProps` mention
`BrowserLocalReferenceAudioPlayer`.

Do not update root service `index.ts` files unless the import style in this repo
already expects browser composition exports from those indexes. Keeping browser
composition imports explicit, such as `@/services/reference/browser`, is
preferred because it makes the browser-runtime edge visible.

### 2. Replace Defaults In Components With Existing Props

For components that already accept services, replace only the direct
infrastructure default imports:

```text
src/components/settings/settings-experience.tsx
src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx
src/components/sheet-practice/reference/reference-panel.tsx
src/components/sheet-practice/segments/practice-segment-selector-panel.tsx
src/components/sheet-practice/controls/sheet-practice-controls.tsx
```

Expected result:

- Component props remain source-compatible for tests and existing call sites.
- Default service values come from `@/services/**/browser` modules.
- UI imports no path under `@/infrastructure/**`.
- The reference panel receives or creates an audio player through a service
  boundary type/factory, not a concrete infrastructure class type.

### 3. Add Minimal Props To Experience Components Without Seams

For these files, add only the service props needed to replace singleton reads:

```text
src/components/sheet-library/sheet-library-experience.tsx
src/components/quick-metronome/quick-metronome-experience.tsx
```

Guidance:

- Preserve current exports and default behavior for app routes.
- Use service types already exported from `src/services/**`.
- Avoid moving business logic out of the component in this substage.
- Avoid adding context providers. Passing optional props/defaults is enough.
- Keep existing loading, error, selected-sheet, import, favorite, tags, and
  recording-session behavior unchanged.

### 4. Move Hook Defaults Behind Service Boundary

Update:

```text
src/hooks/use-practice-session-dashboard.ts
src/hooks/use-command-palette-continue-targets.ts
```

Guidance:

- Replace `@/infrastructure/db/browser-practice-session-service` with the new
  practice-session browser service boundary.
- Do not rewrite dashboard aggregation, continue-target sorting, subscribe
  semantics, stale-result handling, or formatting helpers.
- If an optional service parameter is introduced for tests, keep the existing
  no-argument hook API working.
- Update tests that mock the old infrastructure path so they mock the new
  service-boundary import path instead.

### 5. Expand Architecture Guardrail

Update `tests/unit/architecture-boundaries.test.ts` in the coding PR:

- Rename `componentInfrastructureImportAllowlist` to a UI/app/hook boundary
  name if helpful.
- Read source files from all three roots:
  - `src/components`
  - `src/app`
  - `src/hooks`
- Count `@/infrastructure/` imports across `.ts` and `.tsx`.
- Remove F7-expiring allowlist entries for fixed component files.
- Add no broad allowlist. Any remaining exception must have:
  - exact file path
  - exact expected count
  - reason
  - owner
  - removal condition
- Keep the test failing for any new unreviewed import.

The preferred F7-2 end state is:

```text
rg -n "@/infrastructure" src/components src/app src/hooks
```

returns no hits.

### 6. Update Unit Tests Narrowly

Update only tests that are directly affected by import-path movement or newly
added service props. Expected candidates:

```text
tests/unit/architecture-boundaries.test.ts
tests/unit/settings-experience.test.tsx
tests/unit/sheet-library-experience.test.tsx
tests/unit/quick-metronome-session.test.ts
tests/unit/measure-grid-calibration.test.tsx
tests/unit/practice-segment-selector.test.tsx
tests/unit/reference-panel.test.tsx
tests/unit/sheet-practice-controls.test.tsx
tests/unit/home-dashboard.test.tsx
tests/unit/use-command-palette-continue-targets.test.tsx
tests/unit/continue-practice-targets.test.ts
```

Guidance:

- Prefer passing explicit service mocks through existing/new props over mocking
  infrastructure modules from UI tests.
- Where hook tests still need module mocking, mock the new `@/services/**/browser`
  boundary instead of the old infrastructure path.
- Do not convert repository/service tests that intentionally cover
  infrastructure modules. F7-2 only targets UI/app/hook imports.

## Acceptance Criteria

- `rg -n "@/infrastructure" src/components src/app src/hooks` returns no hits,
  or only reviewed and documented exceptions with exact count, owner, reason,
  and removal condition.
- `tests/unit/architecture-boundaries.test.ts` scans `src/components`,
  `src/app`, and `src/hooks` for direct `@/infrastructure/**` imports.
- Existing component props remain compatible unless a change is needed to hide a
  concrete browser class type from UI.
- Existing app routes continue rendering without additional providers or setup.
- Unit tests that previously mocked infrastructure singleton imports are updated
  to the new service-boundary path or explicit props.
- No product behavior changes are mixed into the boundary move.
- No mutation hardening, viewer work, final closeout scans, package changes, or
  status advancement are included in F7-2.

## Verification Plan For Future Coding PR

Run from repo root:

```powershell
git diff --check
rg -n "@/infrastructure" src/components src/app src/hooks
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts tests/unit/settings-experience.test.tsx tests/unit/sheet-library-experience.test.tsx tests/unit/quick-metronome-session.test.ts tests/unit/measure-grid-calibration.test.tsx tests/unit/practice-segment-selector.test.tsx tests/unit/reference-panel.test.tsx tests/unit/sheet-practice-controls.test.tsx tests/unit/home-dashboard.test.tsx tests/unit/use-command-palette-continue-targets.test.tsx tests/unit/continue-practice-targets.test.ts
& .\scripts\npm-local.ps1 --% run lint -- src/components/settings src/components/sheet-library src/components/quick-metronome src/components/sheet-practice/controls src/components/sheet-practice/measure-grid src/components/sheet-practice/segments src/components/sheet-practice/reference src/hooks src/services tests/unit/architecture-boundaries.test.ts tests/unit/settings-experience.test.tsx tests/unit/sheet-library-experience.test.tsx tests/unit/quick-metronome-session.test.ts tests/unit/measure-grid-calibration.test.tsx tests/unit/practice-segment-selector.test.tsx tests/unit/reference-panel.test.tsx tests/unit/sheet-practice-controls.test.tsx tests/unit/home-dashboard.test.tsx tests/unit/use-command-palette-continue-targets.test.tsx tests/unit/continue-practice-targets.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
```

If the import moves touch app route composition unexpectedly, include the
relevant route or shell unit tests selected by the coding agent. Browser E2E is
not required for a pure import-boundary move unless product behavior changes are
made.

## Plan PR Verification Evidence

Required for this plan-only PR:

```powershell
git diff --check
Get-Content docs\v1\status.json -Raw | ConvertFrom-Json | Out-Null; Write-Output 'docs/v1/status.json parsed OK'
git diff --cached --check
```

Recorded evidence for this plan PR:

- `git diff --check`: PASS. The command returned exit code `0` and printed no
  output.
- `Get-Content docs\v1\status.json -Raw | ConvertFrom-Json | Out-Null; Write-Output 'docs/v1/status.json parsed OK'`: PASS, output
  `docs/v1/status.json parsed OK`.
- `git diff --cached --check`: PASS after staging. The command returned exit
  code `0` and printed no output.

Product tests are intentionally not required for this plan-only PR.

## Review Checklist

The review agent should fail F7-2 if any of these happen:

- UI, app, or hook files still import `@/infrastructure/**` without a reviewed
  exception.
- Architecture tests scan only `src/components` and miss `src/app` or
  `src/hooks`.
- The PR adds a provider framework or large composition layer instead of moving
  existing browser service defaults.
- The PR changes product behavior, persistence schemas, visual layout, viewer
  code, mutation handling, recording rollback, or final Pack F status.
- Service/browser composition modules grow policy, validation, retries, or
  fallback behavior instead of staying as thin exports/factories.
- Tests are weakened to pass after an import move.

## Handoff Instructions For Coding Agent

Start coding only after external ChatGPT plan review is `PASS` for the F7-2
plan changes and after PR #104 is merged into `main`. This plan PR is a
plan-only draft and does not have to be merged before F7-2 coding begins.

Read only:

```text
docs/v1/START-HERE.md
docs/v1/status.json
docs/v1/implementation-slices/plans/F7-boundary-hardening-viewer-closeout.md
docs/v1/implementation-slices/plans/F7-2-non-viewer-ui-hook-boundary.md
docs/v1/implementation-slices/rules/external-library-first.md
tests/unit/architecture-boundaries.test.ts
```

Then run:

```powershell
rg -n "@/infrastructure" src/components src/app src/hooks
```

Confirm the coding base includes PR #104 before editing. If #104 is not on the
base, wait for it, stack explicitly on it, or regenerate the target inventory
against the chosen base. Use the resulting files as the only implementation
target list unless the architecture test reveals another UI/app/hook boundary
import. Implement the smallest service-composition move needed to make that scan
pass, then run the verification plan above.

Do not continue into F7-3 mutation hardening or final Pack F closeout in the
same PR.
