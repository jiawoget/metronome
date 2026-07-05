# Metronome Reviewer Skill

This reviewer is a hard gate. Review debt-contract evidence before correctness. Do not trust planner, coder, PR body, or green tests without independent checks.

## Required Input Packet

Before reviewing, collect:

- PR URL or local diff range.
- PR body.
- Approved plan file.
- `docs/architecture/debt-gate-map.md`.
- Verification output.
- Changed-file list, diffstat, and production/test/docs split.

If any input is missing for a production-source PR, return `CHANGES_REQUIRED`.

## Review Workflow

1. Freeze scope.
   - Confirm base/head or PR number.
   - State whether dirty local files are included or ignored.
   - Separate production, tests, docs, scripts, and workflow changes.

2. Audit PR body evidence.
   - `Reuse Proof` has concrete rows.
   - `Retired Surface` lists removals/narrowing or explicitly says not debt reduction.
   - `New Surface` lists every new surface or explicitly says none.
   - `Boundary Delta` has yes/no answers with evidence.
   - `Debt Gate Evidence` includes passed commands.
   - `Agent Gate Evidence` includes `PLAN_READY`, `CODE_READY`, reviewer verdict, and ChatGPT verdict.

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

5. Verify tests and static gates.
   - Behavior-equivalence coverage exists for retired compatibility surface.
   - Focused tests cover new behavior.
   - Static gates were actually run and passed.

6. Review normal correctness only after the debt contract passes.

## Immediate CHANGES_REQUIRED

Return `CHANGES_REQUIRED` if any of these are true:

- Missing or placeholder PR body evidence.
- Missing `PLAN_READY`, `CODE_READY`, reviewer verdict, or ChatGPT verdict.
- Added wrapper/helper/service method/controller/hook/formatter/validator/parser/adapter/repository method without old surface retired/narrowed in the same PR.
- Refactor/debt PR claims debt reduction while net surface grows.
- Shared primitive/controller/service/presenter/helper work migrates fewer than two old call sites without repo-wide no-go evidence.
- UI imports browser adapter/infrastructure directly outside a named composition root.
- Domain imports UI or services.
- Service is repository passthrough with no retired direct caller.
- Compatibility fields or alias actions are added.
- Existing tests are updated without behavior-equivalence coverage.
- CodeScene health decline on touched source files is ignored or suppressed.

## Required Output Schema

Use this exact structure:

```md
## Findings

1. [P1/P2/P3] Title
   Evidence: file:line
   Impact:
   Required fix:

## Debt Contract Verification

- Reuse Proof verified: yes/no
- Retired Surface verified: yes/no
- New Surface budget verified: yes/no
- Boundary Delta verified: yes/no
- Agent Gate Evidence verified: yes/no
- Net surface delta: shrinks/neutral/grows
- Independent primitive search: pass/fail
- Shared primitive two-call-site rule: pass/fail/not applicable
- Behavior-equivalence tests: pass/fail/not applicable

## Static Gate Status

- Debt contract: pass/fail/not run
- Semgrep changed-file gate: pass/fail/not run
- XO changed-file gate: pass/fail/not run
- Lint: pass/fail/not run
- Typecheck: pass/fail/not run
- Unit tests: pass/fail/not run
- Build: pass/fail/not run

## Gate Verdict

PASS / PASS_WITH_NITS / CHANGES_REQUIRED

## Notes

- Scope:
- Tests not run:
```

## Verdict Handling

- `PASS`: PR may proceed to ChatGPT final review or merge gate.
- `PASS_WITH_NITS`: PR may proceed only if nits are non-blocking and no evidence is missing.
- `CHANGES_REQUIRED`: do not mark ready or merge. Fix blockers and rerun review.
