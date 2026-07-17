---
name: metronome-workflow
description: Mandatory Metronome workflow overlay that composes Superpowers with existing debt gates.
---

# Metronome Workflow

Begin with `superpowers:using-superpowers`. A Superpowers Task is the Metronome Stage.
This skill is the single shared workflow contract; use existing debt
gates and PR evidence rather than adding a second workflow, status ledger,
telemetry, attestation, manifest, or duplicate policy block.

## Central Contract

- Plan agents use GPT-5.6 Sol standard. Coders, diagnosis agents, and reviewers
  use GPT-5.6 Terra standard or GPT-5.6 Luna standard. Never use fast, and never
  route a non-plan role to Sol.
- Small cohesive work uses `superpowers:executing-plans`. Large independently
  separable work uses `superpowers:subagent-driven-development`.
- `PLAN_READY` does not authorize coding. The current tracked plan commit, Git
  blob, and SHA-256 need a matching independent Terra/Luna `PLAN_REVIEW_PASS`.
- Stop before further edits for unexpected production LOC growth, Code Health decline, scope expansion, or an unplanned wrapper/public API.
  Launch an independent Terra/Luna diagnosis and resume only after an explicit user decision.
  Never route diagnosis, fix, or review to GPT-5.6 Sol.
- Refactor plans name exact files, behavior, tests, and commands without
  prewriting large implementation bodies. Unverified interfaces block planning
  or promotion; prove them with the target command or official schema first.

## Role References

Use `skills/metronome_planner.md`, `skills/metronome_coder.md`,
`skills/metronome_reviewer.md`, and `skills/metronome_chatgpt_review.md` for
role-specific packets, checks, and verdicts. They do not replace this contract.

## Promotion

Coders return only current-stage implementation, scope, retirement, and focused
test evidence. The monitor then preflights the exact allowlisted candidate,
scope/LOC/deletion proof, local gates, and CodeScene. Failed preflight cannot
enter semantic review. CodeScene is monitor-owned and never part of the Git
hook.

One independent reviewer receives only the committed candidate, immutable plan,
coder handoff, and HEAD-bound monitor evidence. `PASS` or `PASS_WITH_NITS`
permits a draft PR with exactly `MSO-5` and ChatGPT `PENDING`; exact-head CI
then precedes external ChatGPT review. A passing external review changes only
that evidence to `MSO-6` with `PASS` or `PASS_WITH_NITS`, followed by the
edited-event CI before merge.

Any code edit invalidates preflight and downstream evidence. One repair restarts
preflight; a second failure is `STAGE_BLOCKED` pending independent Terra/Luna
diagnosis and explicit user decision. Do not record intermediate stages.

