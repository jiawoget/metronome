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
- Trace each surface through: real diff -> PLAN task -> `CAP-xx` Capability Admission decision -> Approved Surface -> tests -> verification evidence. Flag missing traceability, widened scope, conflicting decisions, and any implementation outside the approved surface.
- Compare observable behavior and boundaries with current requirements and plan acceptance criteria; do not trust summaries as proof.
- For a deferred legacy-capability promotion, verify the same legacy ID, feature key, and required behavior across seed and requirement: selection keeps the seed until approval, and only native lifecycle artifacts carry truth afterward. Inspect the approval commit itself and require its exact name/status set to contain only added/modified `.planning/REQUIREMENTS.md` plus deleted matching selected seeds. Require controller evidence that immediately before the commit the index was empty, no merge was in progress, and the `.planning` worktree set was exactly those paths; confirm the native OpenGSD 1.7 helper was scoped to `.planning/REQUIREMENTS.md` and the existing `.planning/seeds` directory, never explicit deleted seed paths, an unscoped call, or merge fallback. A duplicate or missing carrier, any extra path, missing atomicity evidence, or change to a rejected, unmatched, or unselected seed is a finding.

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
