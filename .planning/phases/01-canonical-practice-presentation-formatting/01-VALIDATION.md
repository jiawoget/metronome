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

Execution sequencing is amended by `01-EXECUTION-RECOVERY.md` and the current PLAN: the executor consumes the compact receipt, T1 has no external work or commit, T2 leaves exactly four approved source rows staged after one candidate-gate run, and T3 expands them to one exact six-file hook-bearing commit before immutable LOC and CodeScene evidence. The behavior matrix, Approved Surface, 89-line verifier, health thresholds, and native lifecycle gates are unchanged.

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

- **T1:** keep the complete index empty; add exactly the two named test worktree modifications and prove characterization before any source edit. Do not commit or invoke a full hook.
- **T2:** stage exactly the four approved source modifications before changed Semgrep/XO; leave exactly the two named tests unstaged. Run the candidate gates once and preserve that four-row staged identity.
- **T3:** bind the CodeScene safeguard to those four source rows, then stage exactly the two tests and require exactly six non-empty `M` rows with no other path. Commit once through the elevated full hook. Afterward require an empty complete index and the same six-row commit inventory.

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

### T3 reviewed-product gate — one authoritative hook run

Before the single six-file commit, run the local pre-commit hook without bypass; its debt self-test, changed Semgrep/XO, lint, typecheck, full unit, and build results are the authoritative full-gate evidence. Do not immediately repeat that suite. After commit, require an empty index, symbolic HEAD = `IMPLEMENTATION_BRANCH`, branch tip = `reviewedProductionSha`, and a six-row commit inventory. Recheck branch/tip before native closeout.

```powershell
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git diff --check "$productionBaseSha..$reviewedProductionSha"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

## Sampling and Task Map

| Task | Requirements | Automated/product evidence | Manual/provider evidence |
|------|--------------|----------------------------|--------------------------|
| `01-01-T1` | FMT-01, EVID-01, QUAL-01 | Receipt fingerprint match, <=30-second measurement, four mutation-red/restorations, two test-only worktree rows | None; external work is forbidden |
| `01-01-T2` | FMT-01, FMT-02, SLIM-01, QUAL-01 | Exact four-source staging before the seven candidate gates | None; external work is forbidden |
| `01-01-T3` | EVID-01, SLIM-01, QUAL-01, HEALTH-01, DELIV-01 | Exact six-row hook transaction, canonical LOC, deletion searches, disposable rollback | Staged safeguard plus immutable baseline/final CodeScene and named-branch/scoped-clean evidence |

- T1 must finish before any production edit. T2 staging must precede its changed-file gates. T3 must not check out a detached revision.
- Rollback occurs only in a disposable context; after disposal the intended branch/tip invariants must still hold.

## Wave 0 and Canonical LOC Gates

- [ ] Add exactly the three research-named cases; retain focused green, four separate mutation-red results, exact restorations, and measured quick latency <=30 seconds.
- [ ] Match the receipt's four fingerprints; record base SHA/src tree/four blobs and write-free normalizer probe. Defer baseline-ref CodeScene to T3.
- [ ] Pin Git `2.55.0.windows.3`, Node `24.17.0`, Prettier `3.9.5`, plugin `0.8.0`, explicit config, absent/untracked `.prettierignore`, and unchanged package files.
- [ ] Run RESEARCH `Reproducible virtual normalization and calculation` exactly as 89 physical lines, substituting the three recorded placeholders.
- [ ] Require named branch/tip/reviewed SHA, ancestry, clean scoped status, unchanged formatter inputs, exactly four committed source `M` rows plus two committed test `M` rows, raw rows, Unicode-safe blobs, per-file A/D/net, every hunk, aggregate net `< 0`, restored encodings, and both temp files removed.
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
- [ ] The controller passes native init/structure and repository liveness before dispatch; the single T1/T2/T3 index transaction progresses empty -> four source rows -> six total rows -> empty after commit.
- [ ] T3 exact 89-line verifier parses in PowerShell 5.1 and all product/branch/LOC/semantic/CodeScene/rollback evidence passes.
- [ ] Native artifact and key-link discovery totals are nonzero; all final-state checks pass after implementation, while pre-implementation missing exports/links are reported accurately.
- [ ] Later native ship preconditions pass without Phase 1 requirement credit; Release Exit remains separate.

**Approval:** pending
