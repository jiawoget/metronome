---
phase: 1
slug: canonical-practice-presentation-formatting
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-21
---

# Phase 1 — Validation Strategy

## Historical truth and active boundary

The historical formatter transaction and its prior T1/T2/T3 evidence remain preserved at their immutable revisions. They are not rerun, amended, or used as evidence for this gap closure. The active contract is only `01-02`: reverse the receipt-defined incidental CAP-03 hunks in two existing sources, then run one focused command, one unbypassed hook-bearing commit, and one final immutable evidence transaction.

No product test, dependency, owner, API, component, or additional source path is in scope for the correction.

## Controller pre-dispatch

Before dispatch, rerun native phase initialization and confirm a named branch. The plan liveness command uses the repository-local Node binary:

```powershell
& .\.tools\node-v24.17.0-win-x64\node.exe scripts\gsd-observability-write.mjs validate-plan --repo . --plan .planning\phases\01-canonical-practice-presentation-formatting\01-02-PLAN.md
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

The documented Windows project-command entry point is `scripts/npm-local.ps1`. Any non-elevated hook/environment failure is `EXECUTION_ENVIRONMENT_BLOCKED`; retry requires elevation and must not weaken, skip, suppress, or reclassify the gate.

## Active task gates

### T1 — exact two-source CAP correction

- Require receipt and all pre-correction fingerprints before editing.
- Modify only `src/domain/practice/validation.ts` and `src/services/practice-goals/service.ts`.
- Require the fourteen-row `884805f..candidate` manifest and byte-for-byte equality to the reviewed blobs with only those reversals applied. A third source path, changed admitted symbol/wiring/test, or unmatched anchor blocks.
- Keep the index empty; do not run external work or commit.

### T2 — one immutable evidence transaction

Stage exactly the two `M` source rows. Record candidate parent/tree/path/blob identity, run the official safeguard once, and run this focused command once:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx tests/unit/session-comparison.test.ts tests/unit/architecture-boundaries.test.ts tests/unit/practice-goal-repository.test.ts tests/unit/practice-goal-service.test.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

Commit once through the unbypassed elevated repository hook. Its debt, changed-file, lint, typecheck, full-unit, and build output is the sole repository-wide gate record for this candidate. After commit, the staged safeguard and commit must have identical parent, tree, two-path set, and blobs, recomputed from recorded fields.

## Field-level final evidence gate

`.logs/gsd-observability/r01-gap-closure-20260722-01/evidence/01-02-final-evidence.json` is the only final evidence transaction. It may pass only if the T2 executable validator proves all of the following from nonempty, exact fields:

| Evidence area | Required fields |
|---|---|
| CAP traceability | Receipt SHA-256, reviewed revision, candidate fingerprint, and exactly 14 ID/path/context-anchor/candidate-revision/blob/fragment-hash records matching the receipt manifest |
| Safeguard-to-commit | Candidate parent/staged tree/two `M` path/blob rows; final commit SHA/parent/tree/same rows; safeguard identity/provider/tool/time/raw payload; all values equal Git's final revision |
| Gate execution | Focused and hook commands, raw outputs, exit code `0`, attempt `1`, and hook `bypassed: false` |
| CodeScene | Direct change-set raw payload, quality gates, results, and 12 baseline/final records for six existing sources plus two final records for added sources; each record has attribution, revision, path, blob, capture time, provider, tool, `score.value`, `findings.items`, and raw payload |
| Acceptance | Existing final scores do not decline, no new severe finding appears, added sources have no severe finding, Home final score is at least `7.0`, normalized `6M + 2A` net is negative, and disposable rollback passes |

`HEALTH-01`, `DELIV-01`, and top-level status may be `passed` only after every table row is validated. Summary booleans, record counts, or a provider `complete` flag alone carry no credit.

## Sampling and lifecycle map

| Task | Requirement credit | Evidence |
|---|---|---|
| 01-02-T1 | FMT-01, FMT-02, EVID-01 | Two-source exact-hunk candidate; no external or repository-wide gate |
| 01-02-T2 | EVID-01, SLIM-01, QUAL-01, HEALTH-01, DELIV-01 | One focused run, one hook, one provider job, immutable identity, LOC, rollback, and field-complete final evidence |

Interrupted or blocked T2 is terminal for its external identity. A further attempt requires an explicit controller decision and a new step/identity.

## Validation sign-off

- [x] Historical formatter work remains documented as historical truth, not active execution.
- [x] The active gap contract is exactly two source reversals, one hook, and one final evidence transaction.
- [ ] Native liveness and phase initialization pass before dispatch.
- [ ] T1 exact-hunk equality passes.
- [ ] T2 field-level evidence validation passes, followed by native verification, security, ship, PR review, merge, and clean-main release exit.

**Approval:** pending
