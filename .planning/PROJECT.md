# Metronome

## What This Is

Metronome is a local-first web application for musicians to run metronome practice, import and view sheet music, define measure grids and practice segments, record and review takes, and inspect local practice history. The existing browser application keeps user artifacts and metadata on the device; frozen legacy product contracts remain under [`docs/legacy/v1`](../docs/legacy/v1/) as historical evidence, while OpenGSD is the sole lifecycle and roadmap control plane.

## Core Value

Musicians can move from a score and practice target to a repeatable local practice-and-review loop without surrendering their recordings or practice data to a cloud service.

## Current Milestone: v1.2 Release Assurance & Workflow Closure

**Goal:** Bring the actual merged v1.1 tree back under Native OpenGSD authority, retain the approved secure quick-recording ID behavior, correct the pre-commit runtime selection defect, reconcile stale lifecycle narratives, and verify the resulting implementation without adding a parallel workflow layer.

**Target outcomes:**

- Preserve and characterize the current secure quick-recording session-ID contract: `crypto.randomUUID()` first, a `crypto.getRandomValues()` fallback, and fail-closed behavior when Web Crypto is unavailable.
- Make the tracked pre-commit hook use direct Node/npm only when both satisfy the repository engine contract; otherwise reuse `scripts/npm-local.ps1` without adding another wrapper or mutating user or system `PATH`.
- Keep the two local PDF fixtures byte-for-byte equal to their valid HEAD blobs and verify that local checks no longer depend on damaged CRLF-expanded copies.
- Reconcile `.planning/STATE.md`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`, and `AGENTS.md` with the completed v1.1 release exit and the active v1.2 assurance scope.
- Run the current real implementation through Native OpenGSD research, planning, plan checking, bounded execution, and verification.
- Stop this authorization after native verification; shipping, pull-request creation, final-head review/CI, merge, and local-main synchronization require a later explicit instruction.

## Requirements

### Validated

- ✓ 32 evidence-backed product capabilities are retained in the shipped [`v1.0 requirements archive`](milestones/v1.0-REQUIREMENTS.md).
- ✓ Milestone v1.1 Phase 1 validated all 14 formatting requirements: one LF/Prettier policy, an idempotent 341-file mechanical baseline, Windows runtime fallback, fast local enforcement, Ubuntu CI enforcement, and frozen-revision quality evidence.

### Active

- Retain and verify the secure quick-recording ID behavior already present in the merged tree.
- Correct and verify the pre-commit hook's Node/npm engine-aware fallback selection.
- Reconcile stale lifecycle authority and verify the actual resulting tree through Native OpenGSD.

### Deferred

- 32 unimplemented product capability contracts remain preserved as [native OpenGSD seeds](seeds/). None match this assurance milestone and all remain dormant and unchanged.
- Any fresh product milestone or evidence-led R01 remains separately scoped and separately authorized.

### Out of Scope

- Any new product behavior, UI, persistence, storage, audio, domain, or service-contract capability beyond retaining the already-merged secure ID contract.
- Reading, searching, indexing, mapping, summarizing, citing, importing, hashing for evidence, or formatting `.planning/deprecated/**`.
- Reformatting the repository baseline, changing formatter ownership, or modernizing unrelated dependencies.
- A second formatter, new runtime wrapper, custom lifecycle validator/controller, or any imitation of Native OpenGSD behavior.
- A custom hard gate requiring another native verification specifically after final review; existing Native OpenGSD and release-exit responsibilities remain distinct.
- Shipping, pull-request creation, final-head review/CI, merge, or local-main synchronization in the current authorization.
- Creating, planning, or integrating a fresh product or R01 milestone.

## Context

- Frozen legacy product contracts: [`docs/legacy/v1`](../docs/legacy/v1/)
- Imported capability-to-slice evidence: [`docs/legacy/v1/implementation-slices/product-feature-map.md`](../docs/legacy/v1/implementation-slices/product-feature-map.md)
- Completed history: 8 completed packs / 83 verified slices.
- Semantic capability truth: 32 archived Complete capabilities / 32 dormant unimplemented seeds.
- The archived Complete set and dormant seed set form the exact disjoint 64-capability baseline preserved from frozen [`docs/legacy/v1/status.json`](../docs/legacy/v1/status.json).
- The application is TypeScript/React/Next.js with browser-local persistence and explicit domain, service, and infrastructure boundaries.
- The superseded, unimplemented R01 lifecycle is retained only on local branch `deprecated/r01-canonical-formatting-20260725`; its planning bytes are quarantined there and are not inputs to this milestone.

## Constraints

- **Lifecycle:** Native OpenGSD owns milestone switching, discussion, research, planning, checking, execution, verification, state, recovery, and shipping. The project adds no controller around it.
- **Checkout:** `workflow.use_worktrees=false`; all work remains in the primary checkout. No Git worktree may be created or invoked.
- **Planning lifecycle:** `.planning/**` is outside the formatter surface. `.planning/deprecated/**` remains an absolute content quarantine and is never consumed or transformed.
- **Formatting ownership:** Prettier is the sole general-purpose formatter. The repository exposes only `format` and `format:check`; no alternate formatter entrypoint or new formatter wrapper is added.
- **Runtime selection:** Direct Node/npm is acceptable only when both versions satisfy `package.json`; otherwise the hook reuses `scripts/npm-local.ps1`. Do not alter user or system `PATH`.
- **Behavior boundary:** Retain the merged secure-ID semantics and their focused tests; do not expand the quick-recording product contract.
- **Binary fixtures:** Treat PDF fixtures as raw binary bytes. Local restoration must match the committed blobs exactly and must not create a tracked content change.
- **Quality:** Native planning and verification decide the proportional command set. The repository's existing format, lint, typecheck, unit, build, and applicable focused test contracts remain authoritative.
- **Release boundary:** Native phase verification does not prove shipping. This milestone's current authorization stops after verification and does not authorize PR or merge actions.
- **Local first:** No cloud storage or remote product dependency is introduced.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace the unimplemented R01 with a standalone formatting milestone | The previous design crossed lifecycle and branch boundaries that native OpenGSD cannot safely own | ✓ Approved |
| Reuse v1.1 for the replacement milestone | v1.0 is the latest shipped milestone; the previous v1.1 never shipped and is quarantined as deprecated history | ✓ Approved |
| Reset roadmap numbering to Phase 1 | This is a fresh milestone-local lifecycle with one independent formatting phase | ✓ Approved |
| Keep `.planning/deprecated/**` as an absolute quarantine | Legacy planning must remain auditable without influencing current routing, research, formatting, or evidence | ✓ Approved |
| Use one root Prettier configuration and two public npm commands | A single canonical entrypoint prevents formatter and workflow drift | ✓ Approved |
| Separate phase requirements from release-exit facts | Native verification can prove the implementation before shipping; PR merge and synchronized `main` remain post-ship truth | ✓ Approved |
| Start a fresh R01 only after formatting release exit | The next lifecycle must inherit the merged canonical baseline from updated `main`, never deprecated planning | ✓ Approved |
| Exclude `.planning/**` from formatter enforcement | Native lifecycle files continue changing during planning, execution, verification, and shipping; including them creates recursive drift and repeated reformatting | ✓ Approved 2026-07-31 |
| Keep the repository-local Node/npm fallback | The bundled runtime satisfies the repository contract while global PATH mutation adds machine-wide risk and user confirmation overhead | ✓ Approved 2026-07-31 |
| Use bounded owner authorization and fast commit gates | Native research/check/verify remain, while routine confirmations and repeated full-suite runs no longer block each lifecycle commit | ✓ Approved 2026-07-31 |
| Disable product-domain capabilities for this tooling milestone | AI, UI, API, schema, security, post-plan gap, and pre-ship review layers add no evidence here; the next milestone must opt back in only where its scope needs them | ✓ Approved 2026-07-31 |
| Reuse exact-revision gate evidence | A single sequential plan has no merge-integration risk; repeating the same full suite immediately adds latency without new evidence unless the head, inputs, or execution topology changed | ✓ Approved 2026-07-31 |
| Keep milestone archival and release proof on one PR head | Generic lifecycle routing labels a milestone shipped before GitHub merge, while a second closeout PR would duplicate CI and review; capture phase evidence first, archive on the same branch, then freeze one final head | ✓ Approved 2026-08-01 |
| Do not treat preserved dormant product seeds as formatting-milestone gaps | The 32 seeds predate v1.1, are explicitly out of scope, and remain subject to separate owner authorization; re-acknowledging them at every tooling closeout adds no evidence | ✓ Approved 2026-08-01 |
| Retain the merged secure quick-recording ID behavior | The owner chose preservation over rollback; v1.2 must characterize and verify the current Web Crypto contract without expanding it | ✓ Approved 2026-08-01 |
| Fix hook runtime selection through the existing fallback | Direct command presence is insufficient when Node/npm versions violate the repository engines; reuse `scripts/npm-local.ps1` instead of creating another wrapper | ✓ Approved 2026-08-01 |
| Restore the two local PDF fixtures to their committed bytes | The valid HEAD blobs are authoritative and the CRLF-expanded local copies produced damaged cross-reference offsets | ✓ Approved 2026-08-01 |
| Adopt the actual merged tree through Native OpenGSD | Research, planning, checking, execution, and verification belong to Native OpenGSD; no repository-owned lifecycle imitation is added | ✓ Approved 2026-08-01 |
| Do not add a final-review-specific native reverify hard gate | The owner rejected another custom process layer; ordinary Native OpenGSD verification and release-exit truth remain separate | ✓ Approved 2026-08-01 |
| Reconcile stale lifecycle authority in v1.2 | v1.1 has merged and local `main` is synchronized, so STATE/PROJECT/ROADMAP/AGENTS must no longer describe its release exit as pending | ✓ Approved 2026-08-01 |

## Evolution

The shipped v1.0 archive retains 32 validated capabilities, and the remaining 32 identities stay dormant as native seeds. The superseded R01 was never implemented and is not an active lifecycle input. Milestone v1.1 shipped on 2026-08-01 with final-head CI/review, merge, and clean local-main synchronization complete. Milestone v1.2 now reconciles the actual merged tree with Native OpenGSD authority and verifies the bounded assurance fixes approved by the owner; it does not activate a new product or R01 direction.

---
*Last updated: 2026-08-01 for v1.2 milestone start*
