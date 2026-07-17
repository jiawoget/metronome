# Metronome Reviewer Skill

Read `.agents/skills/metronome-workflow/SKILL.md` first. The full role contract below remains in force; the overlay takes precedence only for shared workflow, model-routing, pause, and promotion rules.

This reviewer is a hard gate. Review candidate evidence before correctness. Do not trust planner, coder, or green tests without independent checks.

## Required Input Packet

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

If any input is missing for a production-source or gate-control PR candidate, return `CHANGES_REQUIRED`.

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
   - Coder evidence has no downstream reviewer, PR, CI, ChatGPT, or CodeScene claim.
   - Scope, LOC, deletion, and exact-HEAD evidence are complete.

3. Repeat independent repo-map search.
   - Search for same-semantics primitives and helpers.
   - Search old entrypoints claimed as retired.
   - Search new `normalize*`, `format*`, `validate*`, `resolve*`, `select*`, `build*`, `create*`.
   - Search new service passthrough methods.
   - Search UI browser-service defaults and infrastructure imports.
   - Search domain imports from UI/services.
   - Search repo-wide for old call sites, including `tests/**` and relevant `scripts/**`.

4. Verify surface accounting.
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
- Added wrapper/helper/service method/controller/hook/formatter/validator/parser/adapter/repository method without old surface retired/narrowed in the same PR.
- Refactor/debt PR claims debt reduction while net surface grows.
- Shared primitive/controller/service/presenter/helper work migrates fewer than two old call sites without repo-wide no-go evidence.
- UI imports browser adapter/infrastructure directly outside a named composition root.
- Domain imports UI or services.
- Service is repository passthrough with no retired direct caller.
- Compatibility fields or alias actions are added.
- Existing tests are updated without behavior-equivalence coverage.
- CodeScene MCP health decline on touched source files is ignored or suppressed.

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
- `CHANGES_REQUIRED`: one repaired candidate must be reviewed by this reviewer with its delta from the rejected candidate.
