---
phase: 1
slug: canonical-practice-presentation-formatting
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-21
---

# Phase 1 — Validation Strategy

This contract binds product evidence to `reviewedProductionSha` on recorded `IMPLEMENTATION_BRANCH`. Draft status remains until native validation confirms its evidence.

## Test Infrastructure and Latency

| Property | Value |
|----------|-------|
| Framework/config | Vitest 4.1.9 / `vitest.config.ts` |
| Quick target | existing `test:unit` invocation for `home-dashboard.test.tsx` plus `session-comparison.test.ts` |
| Full target | repository `test:unit` script |
| Latency contract | measure the quick invocation during T1; target <=30 seconds; if it exceeds 30 seconds, block rather than claim the unobserved target passed |

## Controller Pre-Dispatch Preflight — no product credit

Before invoking native execute-phase or dispatching its executor, the controller must rebake stale Codex agents and rerun phase init. The init output must not contain `changed since agents were last baked`; no already-spawned executor may perform this preflight for itself.

```powershell
& .\scripts\npm-local.ps1 --% exec --yes --package=@opengsd/gsd-core@1.7.0 -- gsd-core --codex --global
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$phaseInit = @(& .\.tools\node-v24.17.0-win-x64\node.exe C:\Users\wsuto\.codex\gsd-core\bin\gsd-tools.cjs query init.execute-phase 1 --raw 2>&1)
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if (($phaseInit -join "`n") -match "changed since agents were last baked") { throw "Codex agents remain stale." }
```

Record `IMPLEMENTATION_BRANCH` from `git symbolic-ref -q --short HEAD`; empty output/detached HEAD blocks execution. This lifecycle/tool installation changes no product dependency and satisfies no requirement.

## Managed Windows Classification

- Run `validate:debt-gates`, `lint:debt:changed`, and every hook-bearing commit elevated.
- A non-elevated settings/tempfile loop is `EXECUTION_ENVIRONMENT_BLOCKED`; retry elevated without weakening, skipping, suppressing, or reclassifying a gate.
- Every command below is fail-closed and has an immediate exit guard.

## Complete-Index Commit Protocol

- **T1:** immediately before staging, require the complete index empty. Stage only the two named tests; complete cached name-status must be exactly two non-empty `M` rows. Only then capture tree/diff and commit. Afterward require empty complete index and the same two-row commit inventory.
- **T2:** immediately before staging, require the complete index empty. Stage only the four approved source paths; complete cached name-status must be exactly four non-empty `M` rows, with no planning/config/test/fifth-source row and no unstaged/untracked source. Establish this allowlist before changed Semgrep/XO or any T2 gate; only after gates pass capture tree/diff/blobs, safeguard, and commit. Afterward require empty complete index and matching parent/tree/four-row inventory.

## Executable Task Gates

### T1 quick characterization gate

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx tests/unit/session-comparison.test.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

### T2 production gate — run elevated after exact four-row staging

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx tests/unit/session-comparison.test.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run validate:debt-gates
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run lint:debt:changed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run lint:xo:changed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

### T3 reviewed-product gate — run elevated on named branch

Before and after this block, and again immediately before native closeout, require symbolic HEAD = `IMPLEMENTATION_BRANCH` and that branch tip = `reviewedProductionSha`.

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx tests/unit/session-comparison.test.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run validate:debt-gates
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run lint:debt:changed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run lint:xo:changed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run test:unit
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\scripts\npm-local.ps1 --% run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

## Sampling and Task Map

| Task | Requirements | Automated/product evidence | Manual/provider evidence |
|------|--------------|----------------------------|--------------------------|
| `01-01-T1` | FMT-01, EVID-01, SLIM-01, QUAL-01, HEALTH-01 | T1 gate, <=30-second measurement, four mutation-red/restorations, exact two-row commit | immutable base/index/normalizer identities and four-file CodeScene baseline |
| `01-01-T2` | FMT-01, FMT-02, SLIM-01, QUAL-01, HEALTH-01 | exact four-row staging before T2 seven-gate block; elevated hook; matching commit | staged-identity CodeScene safeguard |
| `01-01-T3` | EVID-01, SLIM-01, QUAL-01, HEALTH-01, DELIV-01 | T3 nine-gate block, canonical LOC, deletion searches, disposable rollback | every-hunk audit, final CodeScene, named-branch/scoped-clean evidence |

- T1 must finish before any production edit. T2 staging must precede its changed-file gates. T3 must not check out a detached revision.
- Rollback occurs only in a disposable context; after disposal the intended branch/tip invariants must still hold.

## Wave 0 and Canonical LOC Gates

- [ ] Add exactly the three research-named cases; retain focused green, four separate mutation-red results, exact restorations, and measured quick latency <=30 seconds.
- [ ] Record base SHA/src tree/four blobs, `.lumenignore` and semantic-index identities, write-free normalizer probe, and attributable four-file CodeScene baselines.
- [ ] Pin Git `2.55.0.windows.3`, Node `24.17.0`, Prettier `3.9.5`, plugin `0.8.0`, explicit config, absent/untracked `.prettierignore`, and unchanged package files.
- [ ] Run RESEARCH `Reproducible virtual normalization and calculation` exactly as 89 physical lines, substituting the three recorded placeholders.
- [ ] Require named branch/tip/reviewed SHA, ancestry, clean scoped status, unchanged formatter inputs, exact four committed `M` rows, raw rows, Unicode-safe blobs, per-file A/D/net, every hunk, aggregate net `< 0`, restored encodings, and both temp files removed.
- [ ] Map every hunk to the Approved Surface and separately prove retired-body/distinctive-algorithm searches empty; reject relocation, wrappers, comments-only credit, formatting churn, and unrelated cleanup.

## Provider, Rollback, and Lifecycle Gates

| Gate | Requirement credit | Acceptance |
|------|--------------------|------------|
| Exact-revision CodeScene | HEALTH-01 | Fresh attributable baseline/final score/review and change-set `quality_gates`/`results`; no decline/new severe finding; Home >=7.0. Missing/stale/provider-error output blocks. |
| Disposable rollback and clean named branch | DELIV-01 | Reverse only production commit in disposable context; baseline tree plus focused green; dispose; return to unchanged named branch at reviewedProductionSha with clean four-source/four-input scope. |
| Native VERIFICATION/VALIDATION/SECURITY | none | After execute-plan marks requirements, require passing `01-VERIFICATION.md`, current Nyquist `01-VALIDATION.md`, and `01-SECURITY.md` with `threats_open: 0` before `$gsd-ship`. These later facts cannot satisfy DELIV-01. |
| Milestone Release Exit | none | Preserve REQUIREMENTS/ROADMAP Release Exit exactly; no PR/CI/review/merge/clean-main fact is Phase 1 validation credit. |

## Validation Sign-Off

- [x] All seven requirements appear; DELIV-01 ends at readiness to enter native verification/validation/security.
- [x] T1/T2/T3 contain 1/7/9 runnable guarded commands; T2 gates are explicitly post-stage.
- [ ] The controller clears the stale-agent preflight before execute-phase dispatch; exact complete-index transactions pass for T1/T2.
- [ ] T3 exact 89-line verifier parses in PowerShell 5.1 and all product/branch/LOC/semantic/CodeScene/rollback evidence passes.
- [ ] Native artifact and key-link discovery totals are nonzero; all final-state checks pass after implementation, while pre-implementation missing exports/links are reported accurately.
- [ ] Later native ship preconditions pass without Phase 1 requirement credit; Release Exit remains separate.

**Approval:** pending
