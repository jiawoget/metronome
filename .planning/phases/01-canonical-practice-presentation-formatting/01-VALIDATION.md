---
phase: 1
slug: canonical-practice-presentation-formatting
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. The planner must replace provisional task IDs with its final task IDs without dropping requirement, threat, command, or evidence coverage.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx tests/unit/session-comparison.test.ts` |
| **Full suite command** | `& .\scripts\npm-local.ps1 --% run test:unit` |
| **Estimated runtime** | Quick ~15 seconds; full ~45 seconds |

---

## Sampling Rate

- **After the characterization task:** Run the quick command on the unchanged production tree, then record each required deliberate mutation failing and the immutable source tree/blobs being restored.
- **After every production task commit:** Run the quick command plus `tests/unit/architecture-boundaries.test.ts`, debt-gate self-test, changed Semgrep, changed XO, lint, and typecheck; run the CodeScene pre-commit safeguard against the recorded staged identity before committing.
- **After every plan wave:** Run the full suite and production build; preserve outputs against the exact wave HEAD.
- **Before `$gsd-verify-work`:** Full repository gates, virtual-normalized LOC/deletion evidence, final CodeScene evidence, and semantic-hunk mapping must all be green for the same immutable reviewed revision.
- **Max feedback latency:** 60 seconds for automated unit feedback; external CodeScene analysis is fail-closed but recorded separately.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| provisional-W0-characterization | TBD | 0 | FMT-01, QUAL-01 | T-01 | Invalid input is replaced by fixed labels and raw values are never rendered. | unit + mutation | Quick command; required deliberate mutations from `01-RESEARCH.md` | ✅ existing files; ❌ W0 cases | ⬜ pending |
| provisional-W0-evidence | TBD | 0 | EVID-01, SLIM-01, HEALTH-01 | T-02 | No dependency/config drift; evidence is attributable to immutable source and provider state. | evidence gate | Lumen freshness, immutable source/tree/blob capture, virtual-normalization baseline probe, fresh four-file CodeScene baseline | ❌ W0 evidence | ⬜ pending |
| provisional-consolidation | TBD | TBD | FMT-01, FMT-02, SLIM-01, QUAL-01 | T-01, T-02 | Only the two approved local exports and four approved source files change; seven old bodies disappear with behavior preserved. | unit + architecture + static | Quick command; architecture boundaries; debt self-test; changed Semgrep/XO; lint; typecheck | ✅ infrastructure | ⬜ pending |
| provisional-final-revision | TBD | TBD | EVID-01, SLIM-01, QUAL-01, HEALTH-01, SHIP-01 | T-01, T-02 | The immutable reviewed revision is net-negative, attributable, healthy, reversible, independently reviewed, and cleanly mergeable. | full + external evidence | Full unit suite; build; virtual LOC/hunk contract; CodeScene change-set/per-file gates; rollback proof | ✅ commands; ❌ final evidence | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/home-dashboard.test.tsx` — add Home and dashboard-hook timestamp/duration characterization, including trimmed analytics suppression and `119_999 -> 1 min`.
- [ ] `tests/unit/session-comparison.test.ts` — add public UTC-minute/invalid timestamp characterization while pinning excluded seconds-scale behavior.
- [ ] Record focused green output plus failing evidence for every deliberate mutation, then prove immutable `src` tree and four production blobs were restored with no staged, unstaged, or untracked `src/**` path.
- [ ] Record `PRODUCTION_BASE_SHA`, `PRODUCTION_BASE_SRC_TREE`, four Approved Surface blob IDs, `.lumenignore` identity, and current semantic-index identity.
- [ ] Prove the existing Git + Prettier 3.9.5 virtual-normalization recipe works on immutable baseline blobs without writing source or creating a repository helper.
- [ ] Freshly capture attributable baseline `code_health_score` and `code_health_review` outputs for all four Approved Surface files.
- [ ] No framework, dependency, test-config, fixture-file, repository helper, compatibility layer, or parallel runtime path may be added.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Semantic deletion rather than relocation or formatting churn | FMT-02, SLIM-01 | Normalized line counts alone cannot classify semantic ownership. | Map every normalized hunk to CAP-01/CAP-02, the two canonical exports/direct callers, or one of the seven retired bodies; reject comments-only deletion, moves, aliases, wrappers, unrelated cleanup, and surviving distinctive algorithms. |
| Exact-revision CodeScene policy | HEALTH-01 | Provider output is external and tool schemas differ in optional metadata. | Retain fresh raw baseline/final score/review outputs and change-set `quality_gates`/`results`, bound to the required revision/blob/path/time/tool or staged-tree identity; require no decline, no new severe finding, and Home >= 7.0. |
| Independent review, rollback, merge, and clean main | SHIP-01 | These are version-control and review lifecycle outcomes. | Obtain read-only `@codex` review using the indexed skill, demonstrate a clean version-control rollback in a disposable context, merge through native OpenGSD, update `main`, and require empty porcelain status. |

---

## Validation Sign-Off

- [ ] Planner replaced all provisional task IDs and every final task has `<automated>` verification or a Wave 0 dependency.
- [ ] All seven phase requirements appear in final plan task frontmatter and this verification map with no silent omission.
- [ ] Sampling continuity: no production task can commit without focused automated feedback and staged-identity CodeScene safeguard evidence.
- [ ] Wave 0 characterization is green on unchanged production code and red under every required deliberate mutation.
- [ ] No watch-mode flags, skipped repository gate, unavailable provider evidence, or mismatched revision is accepted.
- [ ] Feedback latency is under 60 seconds for the quick automated loop.
- [ ] `nyquist_compliant: true` and `wave_0_complete: true` are set only after the evidence above exists.

**Approval:** pending
