# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Repository Formatting Baseline

**Archived:** 2026-08-01
**Phases:** 1 | **Plans:** 1 | **Implementation tasks:** 3

### What Was Built

- One repository-wide LF and Prettier policy with structural exclusions for native planning, generated output, dependencies, caches, and binary assets.
- One independently revertible 341-file formatter-only baseline at an exact fixed point.
- One fast tracked pre-commit gate and one Ubuntu CI sequence that checks formatting before lint, typecheck, 845 unit tests, and build.
- A supported direct-or-repository-local Node/npm path with no persistent environment mutation.

### What Worked

- Native planner checking found three concrete execution blockers before implementation: renormalization scope contamination, PowerShell native-exit masking, and a missing same-phase repair path.
- The executor repaired the generated `next-env.d.ts` line-ending defect in the same phase and reran the complete replacement-candidate sequence.
- The verifier independently reconstructed all 341 formatter outputs from Git blobs and confirmed 5/5 observable truths and 14/14 requirements.
- Exact-revision evidence reuse avoided an immediate duplicate full-suite run when neither the implementation head nor its inputs changed.

### What Was Inefficient

- Earlier workflow policy accumulated product-domain capabilities, full per-commit gates, post-plan checks, and synthetic post-merge checks that did not produce evidence for a one-phase formatting change.
- Routine lifecycle confirmations treated already-authorized transitions as new decisions, transferring orchestration cost back to the owner.
- The first research agent committed valid work but remained running for about 20 minutes, so completion had to be recovered from Git rather than inferred from the agent process state.
- Generic milestone routing recommends `complete-milestone` as soon as all phases verify, even though this repository requires exact-final-PR-head CI/review and merge before a completion claim.
- Generic open-artifact audit counts all 32 intentionally dormant product seeds as current closeout gaps, despite their explicit exclusion from this tooling milestone.

### Patterns Established

- Scope capabilities per milestone; do not inherit AI, UI, API, schema, security, or review layers without a matching evidence need.
- Keep commit hooks fast and deterministic; reserve the complete quality suite for a frozen candidate and CI.
- Reuse exact-revision evidence only when provenance proves that the head and relevant inputs are unchanged.
- Once the owner authorizes a bounded phase, continue through in-scope repair and release exit without routine stage confirmations or difficulty-based deferral.
- Capture ship evidence before archival, put archival on the same PR branch, and freeze one final head for CI and review.

### Key Lessons

1. A gate is valuable only when it can change the decision for the current scope; otherwise it is latency disguised as assurance.
2. State, Git evidence, and external release facts need explicit precedence so generic lifecycle recommendations cannot create false completion claims.
3. Independent review should inspect immutable evidence and provenance, not automatically rerun every expensive command.
4. Dormant future scope is not an implementation defect; auditing must distinguish deliberate backlog from unresolved current-milestone work.
5. Agent completion should be judged from durable artifacts and commits when the transport process hangs after successful work.

### Cost Observations

- Model mix: native quality-profile GSD roles at xhigh/ultra; no lightweight routing was used.
- Sessions: not reliably encoded in repository artifacts.
- Notable: planning and verification produced useful defect detection, while repeated confirmation, unrelated capabilities, and duplicate full-suite proposals were the primary avoidable cost.

---

## Milestone: v1.2 — Release Assurance & Workflow Closure

**Archived:** 2026-08-01
**Phases:** 1 | **Plans:** 1 | **Implementation tasks:** 3

### What Was Built

- Deterministic coverage for the retained secure quick-recording identity contract: `crypto.randomUUID()` precedence, an exact 16-byte secure fallback, and fail-closed behavior without Web Crypto.
- Engine-aware direct Node/npm eligibility in the existing pre-commit hook, with conservative reuse of `scripts/npm-local.ps1` and no new wrapper, dependency, or environment mutation.
- Restored local PDF fixture bytes matching the valid Git objects, with size and cross-reference invariants proven without a tracked PDF content change.
- A coherent Native OpenGSD evidence chain from research through checked planning, bounded execution, ordinary verification, milestone audit, and same-PR archival.

### What Worked

- The owner resolved the important product and process choices up front: retain secure IDs, fix hook version selection in the existing owner, restore the two fixtures, use Native OpenGSD, reject a custom final-review reverify gate, and reconcile stale authority.
- Reuse-first implementation kept the durable production change limited to the existing hook and one focused test owner; the secure-ID source, runtime wrapper, packages, and PDFs stayed unchanged.
- A 19-case ephemeral hook matrix plus real staged-index fallback execution proved direct/fallback routing, exact argument forwarding, failure behavior, and cleanup without adding a permanent test subsystem.
- Exact-revision provenance allowed the verifier to reuse the full format/lint/typecheck/unit/build evidence while independently checking current blobs and runnable focused behaviors.
- The milestone integration audit explicitly separated the frozen Phase 2 boundary from the later owner-authorized release exit, restoring AUTH-01 and SCOPE-01 without rewriting history.

### What Was Inefficient

- Generic Native ship wording changed STATE to “shipped” immediately after PR creation, contradicting PROJECT, ROADMAP, REQUIREMENTS, and AGENTS until a Native state repair and documentation reconciliation restored canonical routing.
- Generic milestone archive templates also label artifacts shipped before GitHub merge, so repository-specific release truth had to be expressed as a condition on PR #136 rather than accepted literally.
- The open-artifact audit again surfaced all 32 intentionally dormant product seeds even though their deferred disposition was already recorded and unchanged.
- Native tooling warned that static Codex agent frontmatter predated the latest model configuration; explicit typed dispatch avoided ambiguity, but a future install/update should refresh those defaults.

### Patterns Established

- Treat phase implementation/verification and post-verification release exit as two sequential scopes with an explicit temporal boundary.
- Keep Native OpenGSD as the lifecycle owner while reconciling generic outputs against stronger repository release facts; do not add a parallel validator or final-review-specific reverify layer.
- Archive milestone evidence on the same pull-request branch, then freeze exactly one final head for CI and read-only review.
- Use conditional release wording in pre-merge archives: archival can be complete while shipping still depends on the frozen PR head merging and local `main` synchronizing.

### Key Lessons

1. “PR created,” “Native archived,” and “shipped on main” are different facts and must never be collapsed into one status.
2. Negative-scope requirements remain valid when later authorized lifecycle actions are clearly outside the implementation/verification revision.
3. Reuse-first evidence can prove a behavior correction with a very small durable diff when the production owner already contains the intended contract.
4. A generic lifecycle tool remains authoritative for transitions, but repository-specific release truth must govern claims about external merge and synchronization state.
5. Durable owner decisions should resolve repeated audit prompts without activating or re-litigating intentionally dormant scope.

### Cost Observations

- Model mix: Native quality-profile roles at xhigh/ultra with explicit typed binding for the integration checker.
- Sessions: one sequential phase/plan plus a milestone integration re-audit after authority repair.
- Notable: the focused matrix and exact-revision reuse produced strong evidence efficiently; most rework came from generic pre-merge “shipped” wording rather than implementation defects.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
| --- | ---: | --- |
| v1.0 | 8 | Imported and archived the delivered legacy product baseline. |
| v1.1 | 1 | Replaced layered per-step ceremony with milestone-scoped capabilities, fast commit gates, exact-revision evidence reuse, and one final PR-head release proof. |
| v1.2 | 1 | Reconciled the merged tree through Native research-to-audit, repaired hook runtime selection in place, and separated phase verification from release-exit truth. |

### Cumulative Quality

| Milestone | Unit tests | Verification | New runtime dependencies |
| --- | ---: | --- | ---: |
| v1.1 | 845 passing | 5/5 truths, 14/14 requirements | 0 |
| v1.2 | 19 focused passing; full-suite evidence reused at unchanged inputs | 5/5 truths, 10/10 requirements, 9/9 integrations, 4/4 flows | 0 |

### Top Lessons

1. Prefer executable, scope-specific contracts over duplicated generic gates.
2. Preserve one immutable evidence chain from implementation through final PR head and merge.
3. Separate phase verification from release exit with explicit temporal authority.
4. Let GitHub merge and synchronized `main` determine shipping truth, never PR creation or pre-merge archival alone.
