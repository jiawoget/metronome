# Metronome Reviewer Skill

Read `.agents/skills/metronome-workflow/SKILL.md` first. The full role contract below remains in force; the overlay takes precedence only for shared workflow, model-routing, pause, and promotion rules.

This reviewer is a hard gate. Review candidate evidence before correctness. Do not trust planner, coder, or green tests without independent checks.

## Required Input Packets

### Immutable Plan Review

Before reviewing a plan, collect only:

- Original user request and task/slice boundary.
- Full tracked plan text plus exact path, commit, blob, and Git-object SHA-256.
- Read-only plan-input exit status/output.
- Monitor-normalized repo, lockfile, installed-package, OSS, platform, official-source, and probe evidence referenced by the capability rows.
- `docs/architecture/debt-gate-map.md`.

Plan review does not require or accept a coder handoff, implementation candidate, preflight, CodeScene, CI, or PR evidence. Missing plan-review input blocks `PLAN_REVIEW_PASS`; it never advances into candidate-review checks.

### Candidate Review

Before reviewing one exact committed candidate, collect:

- Base and candidate HEAD.
- Changed-file split and diffstat.
- Approved immutable plan identity and text.
- `docs/architecture/debt-gate-map.md`.
- Coder current-stage handoff.
- Monitor preflight, including scope, LOC, deletion, and zero-`src/**` proof.
- HEAD-bound local-gate output.
- HEAD-bound CodeScene MCP `analyze_change_set` output with no decline and
  literal `quality_gates: passed`.

If any candidate-review input is missing for a production-source or gate-control PR candidate, return `CHANGES_REQUIRED`.

## Immutable Plan Review Mode

Before emitting `PLAN_REVIEW_PASS`, independently re-derive architecture-free capability atoms from the original task and compare their exact C-ID set with `Existing Primitive Search` and `Capability Delivery Map`. Do not trust a structurally green table as semantic proof.

- Verify repository and installed-package searches include exact paths, lockfile versions, exports, and passed probes.
- For every uncovered generic atom, require bounded mature-OSS and applicable official-platform research. Inspect official documentation and exact API/version/probe evidence; `provider_fallback` to official web documentation is required when Context7 is unavailable. Package-legitimacy output is only a risk signal, never API-fit, license, or vulnerability approval.
- Reject a local generic implementation when a fitting repository, installed, OSS, or platform primitive was skipped. Reject product-policy wording that hides a generic operation; `thin-policy` must compose a generic C-ID without reimplementing it.
- Treat `approval: pending-plan-review` as pending only. For each semantically justified `local-policy` row, verify `policy-boundary:`, `composes: Cxx|none`, and `generic-operation: none` against the immutable plan identity.
- Confirm the read-only plan-input validator exited `0`, while recognizing that it proves structure only.

For a passing immutable plan, emit exactly one line per approved local-policy row before the final verdict, followed by the existing verdict token:

```text
LOCAL_POLICY_APPROVED <Cxx> <planCommit> <planBlob> <planSha256>
PLAN_REVIEW_PASS
```

If any capability, source, probe, no-fit result, composition, identity, or local-policy approval is incomplete or false, report the evidence and do not emit `PLAN_REVIEW_PASS`.

## Review Workflow

0. Validate monitor-owned preflight before reading for correctness.
   - Confirm candidate HEAD matches every preflight, local-gate, and CodeScene
     evidence item.
   - Confirm CodeScene MCP `analyze_change_set` reports no decline and literal
     `quality_gates: passed`.
   - Confirm the monitor's Semgrep pre-review and local gates passed.
   - Missing or failing evidence returns `CHANGES_REQUIRED`; the reviewer does
     not run CodeScene or other monitor stages.

1. Freeze scope.
   - Confirm base and exact candidate HEAD.
   - Reject dirty or Git-visible drift from the candidate.
   - Separate production, tests, docs, scripts, and workflow changes.

2. Audit the immutable plan, coder handoff, and monitor preflight.
   - Reuse, retired surface, new surface, and boundary claims have concrete evidence.
   - Capability plan path, commit, blob, and SHA-256 match the reviewed tracked plan; every local-policy approval token matches the same C-ID and identity.
   - Coder evidence has no downstream reviewer, PR, CI, ChatGPT, or CodeScene claim.
   - Scope, LOC, deletion, and exact-HEAD evidence are complete.

3. Re-derive capability admission and repeat independent repo-map search.
   - Atomize the original requirement without copying the plan's architecture or C-ID set.
   - Verify exact repository symbols, installed lockfile/package exports, official OSS/platform sources, versions, APIs, and passed probes.
   - After repository and installed misses, require both bounded mature-OSS research and applicable official-platform research, including an explicit platform inapplicability reason where needed.
   - Confirm selected plan sources remain identical in PR evidence unless a newly reviewed immutable plan changed them.
   - Search for same-semantics primitives and helpers.
   - Search old entrypoints claimed as retired.
   - Search new `normalize*`, `format*`, `validate*`, `resolve*`, `select*`, `build*`, `create*`.
   - Search new service passthrough methods.
   - Search UI browser-service defaults and infrastructure imports.
   - Search domain imports from UI/services.
   - Search repo-wide for old call sites, including `tests/**` and relevant `scripts/**`.
   - Search the diff for handwritten equivalents of every `direct-use` source and generic work hidden inside `thin-policy` or `local-policy` code.

4. Verify surface accounting.
   - Confirm the capability table and implementation map have the same exact C-ID set and that every mapped file, symbol, test, and probe matches the diff.
   - Check every new surface against retired/narrowed surface.
   - Check shared primitive work migrated at least two old call sites and removed/narrowed old implementations, unless repo-wide evidence proves fewer than two old call sites exist.
   - Check net surface delta is shrinks/neutral/grows and matches the PR claim.

5. Verify focused tests and monitor-owned gates.
   - Behavior-equivalence coverage exists for retired compatibility surface.
   - Focused tests cover new behavior.
   - Static gates were actually run and passed.

6. Review normal correctness only after the debt contract passes.

## Immediate CHANGES_REQUIRED

Return `CHANGES_REQUIRED` if any of these are true:

- Missing or placeholder coder handoff or monitor preflight evidence.
- CodeScene MCP `analyze_change_set` output is missing, fails, declines, or lacks `quality_gates: passed`.
- Semgrep pre-review or HEAD-bound local gate is missing or fails.
- Missing plan identity, independent plan review, planner/coder skill-read evidence, `PLAN_READY`, or `CODE_READY`.
- Missing, stale, or mismatched capability plan identity or local-policy approval; false/missing source, API, probe, no-fit, composition, or C-ID map evidence.
- A fitting repository, installed, OSS, or platform primitive was skipped, or required OSS/platform research after local misses is absent.
- The diff reimplements a capability whose reviewed decision is `direct-use`, or hides a generic operation inside product-policy code.
- Added wrapper/helper/service method/controller/hook/formatter/validator/parser/adapter/repository method without old surface retired/narrowed in the same PR.
- Refactor/debt PR claims debt reduction while net surface grows.
- Shared primitive/controller/service/presenter/helper work migrates fewer than two old call sites without repo-wide no-go evidence.
- UI imports browser adapter/infrastructure directly outside a named composition root.
- Domain imports UI or services.
- Service is repository passthrough with no retired direct caller.
- Compatibility fields or alias actions are added.
- Existing tests are updated without behavior-equivalence coverage.
- CodeScene MCP health decline on touched source files is ignored or suppressed.

## Read-Only Candidate Projection

When the monitor supplies an explicit reuse-admission conformance projection,
apply the ordinary Candidate Review and Immediate `CHANGES_REQUIRED` rules to
the target capability evidence and candidate diff. The projection packet
supplies an opaque case ID, implementation-review stage, a complete valid
non-target envelope, immutable reviewed-plan identity and approvals, coder
handoff, committed candidate identity, monitor preflight/test/CodeScene
evidence, capability implementation map, and candidate diff. Treat the
supplied non-target envelope as held constant and classify only the target
admission relation.

This projection is a read-only decision sample. It does not approve a plan or
local policy, accept a real candidate, authorize a write, create or advance a
PR, or promote a stage. The response contains exactly one line per opaque case
in the received order and no other text:

```text
<opaque-case-id> | <actual-top-level-verdict> | <actual-stable-code-or-NONE>
```

Use `NONE` when the actual verdict has no stable finding code. The packet and
response shape carry no family label, expected verdict, expected code, score,
matched count, or oracle; derive the actual result from this role contract.

## Required Output Schema

Use this exact structure:

```md
## Findings

1. [P1/P2/P3] Title
   Evidence: file:line
   Impact:
   Required fix:

## Candidate Evidence Verification

- Reuse Proof verified: yes/no
- Retired Surface verified: yes/no
- New Surface budget verified: yes/no
- Boundary Delta verified: yes/no
- Immutable plan and coder handoff verified: yes/no
- CodeScene MCP pre-review: pass/fail
- Semgrep pre-review: pass/fail
- Net surface delta: shrinks/neutral/grows
- Independent primitive search: pass/fail
- Capability admission (atoms, sources/probes, identity/approvals, C-ID map, hidden equivalents): pass/fail/not applicable
- Shared primitive two-call-site rule: pass/fail/not applicable
- Behavior-equivalence tests: pass/fail/not applicable

## Monitor Gate Status

- Debt contract: pass/fail/not run
- CodeScene MCP analyze_change_set: pass/fail/not run
- Semgrep changed-file gate: pass/fail/not run
- XO changed-file gate: pass/fail/not run
- Lint: pass/fail/not run
- Typecheck: pass/fail/not run
- Unit tests: pass/fail/not run
- Build: pass/fail/not run

## Gate Verdict

PASS / PASS_WITH_NITS / CHANGES_REQUIRED

FINDING_CODE <code; include only immediately after CHANGES_REQUIRED>

## Skill Evidence

- Skill file read: skills/metronome_reviewer.md
- Debt gate map read: docs/architecture/debt-gate-map.md

## Notes

- Scope:
- Tests not run:
```

## Verdict Handling

- `PASS`: return the reviewed candidate to the monitor.
- `PASS_WITH_NITS`: return the reviewed candidate when nits are non-blocking and no evidence is missing.
- `CHANGES_REQUIRED`: emit one stable `FINDING_CODE <code>` immediately after the verdict, then require one repaired candidate with its delta from the rejected candidate. Use `reuse-decision-mismatch` when a reviewed `direct-use` capability is hand-implemented or otherwise contradicted by the diff.
