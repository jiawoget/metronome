---
name: reviewing-metronome-prs
description: Use when @codex performs the final read-only review of a Metronome pull request, especially after production behavior, dependency, reuse, slimming, or Code Health changes.
---

# Reviewing Metronome PRs

Act as the terminal evidence gate. Never edit files, repair artifacts, merge the pull request, orchestrate lifecycle state, or replace native OpenGSD lifecycle work.

## Discover authority

- Establish the requested PR base and head, then inspect the real diff and changed files.
- Read `.planning/PROJECT.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md` first, then compare their declared lifecycle state with the actual current artifacts.
- If state is `Awaiting next milestone` and the current roadmap has zero phases and zero plans, absent current `REQUIREMENTS.md` and phase `CONTEXT`, `RESEARCH`, `PLAN`, `SUMMARY`, and `VERIFICATION` artifacts are expected, not findings. Presence of conflicting current artifacts is a finding.
- If state declares an active milestone, phase, or plan, derive that phase and require current `REQUIREMENTS.md` plus every `CONTEXT`, `RESEARCH`, `PLAN`, `SUMMARY`, and `VERIFICATION` artifact applicable to the declared stage. Missing applicable authority is a fail-closed finding.
- Treat every contradiction between declared state and actual artifacts as a finding.
- Treat `docs/legacy/v1/status.json` and other `docs/legacy/v1` material only as frozen historical evidence, never current lifecycle authority.

## Reconcile the implementation

- For production behavior or surface changes, also read `skills/metronome-policy/SKILL.md`.
- Inventory every added, changed, moved, and removed production surface, including dependencies, modules, helpers, services, hooks, repositories, schemas, public APIs, owners, and generic algorithms.
- Trace each surface through the real diff, native PLAN task, tests, and verification evidence. For a new or replaced generic capability, API, algorithm, shared surface, or dependency, also trace it to the applicable `RESEARCH.md` reuse decision. Flag missing traceability, widened scope, conflicting decisions, and unplanned parallel implementations.
- Compare observable behavior and boundaries with current requirements and plan acceptance criteria; do not trust summaries as proof.
- For a deferred legacy-capability promotion, read and apply `skills/promoting-dormant-seeds/SKILL.md` to the requirements commit. Do not load or impose that migration-only contract on unrelated pull requests.

## Verify reuse independently

- Apply the full dependency/platform/OSS checks only when the diff adds or replaces a generic capability, API, shared surface, or dependency. Every production diff still requires the compact local-reuse result from `RESEARCH.md`.
- Recheck decision-bearing local candidates through source, types, call sites, and tests.
- Confirm dependency, platform, and OSS claims against the locked version and authoritative sources where they affected the decision. A verified fitting local or installed candidate ends the search; do not repeat a full ecosystem survey merely for review volume.
- Verify that the diff uses the selected owner, symbol, API, or dependency and does not add a parallel implementation.

## Verify outcomes

- Check tests and verification against changed observable behavior, boundary cases, and regressions.
- When the current requirement explicitly asks for LOC reduction or slimming, report retired, added, and net production LOC separately. When it explicitly asks for Code Health or CodeScene evidence, compare before/after Code Health for the meaningful affected scope. Relocation is not retirement, and metrics never replace behavior evidence.

## Report

Lead with findings ordered by severity. Each finding includes severity, `file:line`, the violated requirement, plan, reuse decision, or contract, concrete impact, and supporting evidence. Then report open questions, scope assessment, applicable reuse assessment, and verification summary. Include LOC and Code Health only when required above. If there are no findings, say so explicitly and state any residual evidence limits.
