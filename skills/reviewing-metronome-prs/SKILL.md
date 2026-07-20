---
name: reviewing-metronome-prs
description: Use when @codex performs the final read-only review of a Metronome pull request, especially after production behavior, dependency, reuse, slimming, or Code Health changes.
---

# Reviewing Metronome PRs

Act as the terminal evidence gate. Never edit files, repair artifacts, merge the pull request, orchestrate lifecycle state, or replace native OpenGSD lifecycle work.

## Discover authority

- Establish the requested PR base and head, then inspect the real diff and changed files.
- Discover current inputs instead of assuming a phase path: read `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, and `STATE.md`; derive the current phase; enumerate its applicable `CONTEXT`, `RESEARCH`, `PLAN`, `SUMMARY`, and `VERIFICATION` artifacts. Treat missing or contradictory authority as a finding.
- Treat `docs/v1/status.json` and other `docs/v1` material only as frozen historical evidence, never current lifecycle authority.

## Reconcile the implementation

- For production behavior or surface changes, also read `skills/metronome-policy/SKILL.md`.
- Inventory every added, changed, moved, and removed production surface, including dependencies, modules, helpers, services, hooks, repositories, schemas, public APIs, owners, and generic algorithms.
- Trace each surface through: real diff -> PLAN task -> `CAP-xx` Capability Admission decision -> Approved Surface -> tests -> verification evidence. Flag missing traceability, widened scope, conflicting decisions, and any implementation outside the approved surface.
- Compare observable behavior and boundaries with current requirements and plan acceptance criteria; do not trust summaries as proof.

## Verify reuse independently

- Recheck decision-bearing local candidates through source, types, call sites, and tests.
- Confirm installed and transitive dependency evidence against the manifest, lockfile, exact declarations/source, and promotion decision where relevant.
- Confirm platform and OSS claims through authoritative version-matched evidence and concrete rejection mismatches. No result or unavailable evidence is not proof of absence.
- Verify that the diff uses the exact approved symbol or API. Do not suggest an alternative that falls outside Approved Surface.

## Verify outcomes

- Check tests and verification against changed observable behavior, boundary cases, and regressions.
- Report retired, added, and net production LOC separately across all touched production files; relocation is not retirement.
- Compare before/after Code Health for the meaningful affected scope and report remaining complexity separately. Metrics never replace behavior or traceability evidence.

## Report

Lead with findings ordered by severity. Each finding includes severity, `file:line`, the violated requirement/CAP/plan/contract, concrete impact, and supporting evidence. Then report open questions, scope assessment, reuse assessment, and verification summary, including LOC and Code Health evidence. If there are no findings, say so explicitly and state any residual evidence limits.
