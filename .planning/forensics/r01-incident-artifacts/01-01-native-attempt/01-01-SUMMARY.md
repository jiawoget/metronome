---
phase: 01-canonical-practice-presentation-formatting
plan: "01"
subsystem: ui
tags: [react, zod, codescene, code-slimming, opengsd]
requires: []
provides:
  - Canonical UTC-minute timestamp and minute-duration presentation owners
  - Composition-only Home ownership for Practice Goals
  - Net-negative immutable production revision with rollback and Code Health evidence
affects: [home-dashboard, practice-goals, practice-session-dashboard, maintenance]
tech-stack:
  added: []
  patterns:
    - Existing-owner reuse before new logic
    - WebCrypto-only local identifiers without fallback
    - TypeScript regexp lint rules aligned to the declared compiler target
key-files:
  created:
    - src/components/home/practice-goal-editor.tsx
    - src/components/home/practice-goals-panel.tsx
  modified:
    - src/components/home/home-dashboard.tsx
    - src/domain/practice/format.ts
    - src/domain/practice/session-comparison.ts
    - src/domain/practice/validation.ts
    - src/hooks/use-practice-session-dashboard.ts
    - src/services/practice-goals/service.ts
    - xo.config.js
key-decisions:
  - "Preserve the formatter consolidation at ef98c287 and repair Home rather than repeat discovery or select another target."
  - "Keep draft parsing/building in the existing practice validation owner and ID creation in the existing goal service."
  - "Require regexp u only for TypeScript targets; keep JS/MJS on native XO behavior without raising the ES2022 compiler target."
patterns-established:
  - "Home composes PracticeGoalsPanel; the panel composes PracticeGoalEditor."
  - "Final evidence is bound to one immutable reviewed SHA and stored outside lifecycle truth under .logs."
requirements-completed: [FMT-01, FMT-02, EVID-01, SLIM-01, QUAL-01, HEALTH-01, DELIV-01]
coverage:
  - id: D1
    description: Selected Home, dashboard, and comparison timestamps use the canonical UTC-minute formatter with exact legacy fallbacks.
    requirement: FMT-01
    verification:
      - kind: unit
        ref: tests/unit/home-dashboard.test.tsx and tests/unit/session-comparison.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Selected minute-duration callers use the canonical practice formatter while excluded seconds-scale paths remain unchanged.
    requirement: FMT-02
    verification:
      - kind: unit
        ref: tests/unit/home-dashboard.test.tsx and tests/unit/session-comparison.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Home is composition-only for Practice Goals and no duplicate callback or local implementation path remains.
    requirement: SLIM-01
    verification:
      - kind: unit
        ref: tests/unit/architecture-boundaries.test.ts#keeps Home as the composition boundary for Practice Goals
        status: pass
      - kind: unit
        ref: tests/unit/home-dashboard.test.tsx
        status: pass
    human_judgment: false
  - id: D4
    description: Goal draft validation/building and WebCrypto-only identity creation are characterized in their existing owners.
    requirement: QUAL-01
    verification:
      - kind: unit
        ref: tests/unit/practice-goal-repository.test.ts and tests/unit/practice-goal-service.test.ts
        status: pass
    human_judgment: false
  - id: D5
    description: The immutable revision is strictly net-negative and passes the Code Health contract.
    requirement: HEALTH-01
    verification:
      - kind: other
        ref: .logs/gsd-observability/r01-home-repair-20260721-01/evidence/loc-verifier-output.json (net -142)
        status: pass
      - kind: other
        ref: .logs/gsd-observability/r01-home-repair-20260721-01/evidence/codescene-final.json (Home 7.97; change-set passed)
        status: pass
    human_judgment: false
  - id: D6
    description: The reviewed product revision cleanly reverses to its parent without migration or user repair.
    requirement: DELIV-01
    verification:
      - kind: other
        ref: disposable rollback at 884805f16d4327e0fa57046f937e38e4f1106540; 5 files and 78 tests passed
        status: pass
    human_judgment: false
duration: 15h46m
completed: 2026-07-22
status: complete
---

# Phase 1: Canonical Practice Presentation Formatting Summary

**Canonical presentation formatting plus a composition-only Practice Goals boundary reduced normalized production code by 142 lines while raising Home Code Health to 7.97.**

## Performance

- **Duration:** 15h 46m phase elapsed; 2h 50m for the approved Goals repair run
- **Started:** 2026-07-21T08:20:34+08:00
- **Completed:** 2026-07-22T00:06:08+08:00
- **Tasks:** 2 amended execution tasks, with historical formatter work preserved
- **Reviewed revision:** `884805f16d4327e0fa57046f937e38e4f1106540`

## Accomplishments

- Consolidated seven timestamp and three minute-duration callers into the existing practice formatting owner without a new dependency or wrapper.
- Reduced Home from CodeScene LOC 1124 to 716, extracted two cohesive Goals components, and kept draft/ID responsibility in existing domain/service owners.
- Proved exact `6M + 2A` production inventory, normalized LOC `3648 -> 3506` (`-142`), CodeScene change-set pass, Home `7.97`, full hook pass, and clean disposable rollback.

## Task Commits

1. **Historical formatter characterization and consolidation** — `ef98c287`
2. **Approved Goals ownership repair and immutable product revision** — `884805f1`

**Plan amendment:** `c7532db8`

## Files Created/Modified

- `src/components/home/practice-goal-editor.tsx` — goal-editor state and validation feedback.
- `src/components/home/practice-goals-panel.tsx` — goal list, presentation, and mutation orchestration.
- `src/components/home/home-dashboard.tsx` — composition boundary; removed the in-file Goals implementation.
- `src/domain/practice/format.ts` — canonical UTC-minute and minute-duration formatters.
- `src/domain/practice/validation.ts` — goal draft parsing and construction in the existing validation owner.
- `src/services/practice-goals/service.ts` — native `crypto.randomUUID()` identity owner with no fallback.
- `xo.config.js` — TypeScript regexp `u` requirement aligned with ES2022 while JS/MJS retain native XO behavior.

## Decisions Made

- Reused existing format, validation, and service owners; no new dependency, persistence path, schema, generic abstraction, or ID fallback was introduced.
- Preserved the completed formatter commit and consumed cached research evidence instead of rerunning Lumen, OSS discovery, or baseline analysis.
- Kept the unchanged `7.0` Home threshold and repaired the actual ownership boundary after the first final-evidence attempt stopped at `6.86`.

## Deviations from Plan

### Approved scope corrections

1. The original UI-only extraction surfaced pre-existing draft-validation and ID-generation debt. After an explicit owner decision, those responsibilities moved only to the existing validation and goal-service owners.
2. The first full-hook attempt exposed XO 4 requiring the ES2024-only regexp `v` flag while TypeScript targets ES2022. After explicit approval, the TypeScript-only lint rule was aligned to `u`; compiler target, suppressions, and dependencies remained unchanged.

**Total deviations:** 2 explicitly approved boundary corrections. Neither added product scope beyond the selected capability.

## Issues Encountered

- The original final CodeScene attempt improved Home only to `6.86`; execution stopped instead of lowering the threshold.
- The first repair commit hook failed at typecheck because an XO suggestion introduced `/v`; no commit was created. The root rule was corrected before the one successful hook attempt.
- Native phase review surfaced five real but pre-existing observations; strict base-diff adjudication found zero phase-introduced findings, retained all five in `01-REVIEW.md`, and corrected the plan's early-year width overclaim without changing migration semantics.
- Runtime token dimensions were not exposed by the host; each observability record retains `null` with the measurement reason rather than inventing counts.

## User Setup Required

None — no dependency, service, environment variable, or data migration was added.

## Next Phase Readiness

- Product evidence is complete and bound to `884805f16d4327e0fa57046f937e38e4f1106540`.
- Native verification, validation, security, and ship/release-exit remain mandatory and are not claimed by this summary.

## Self-Check: PASSED

- Required created files exist and all changed paths match the approved boundary.
- Full pre-commit hook passed: 67 unit files / 868 tests, lint, typecheck, debt gates, and production build.
- Final LOC, CodeScene, and rollback evidence passed and the main worktree remained clean at the reviewed SHA.

---
*Phase: 01-canonical-practice-presentation-formatting*
*Completed: 2026-07-22*
