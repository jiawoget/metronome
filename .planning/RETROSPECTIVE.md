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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
| --- | ---: | --- |
| v1.0 | 8 | Imported and archived the delivered legacy product baseline. |
| v1.1 | 1 | Replaced layered per-step ceremony with milestone-scoped capabilities, fast commit gates, exact-revision evidence reuse, and one final PR-head release proof. |

### Cumulative Quality

| Milestone | Unit tests | Verification | New runtime dependencies |
| --- | ---: | --- | ---: |
| v1.1 | 845 passing | 5/5 truths, 14/14 requirements | 0 |

### Top Lessons

1. Prefer executable, scope-specific contracts over duplicated generic gates.
2. Preserve one immutable evidence chain from implementation through final PR head and merge.
