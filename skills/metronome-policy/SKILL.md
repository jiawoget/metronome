---
name: metronome-policy
description: Use when OpenGSD agents handle Metronome production work, especially behavior changes, dependency decisions, slimming, or Code Health refactors.
---

# Metronome Capability Policy

## Discovery level

- Level 0 applies only when there is no production behavior, dependency, API, type, schema, persisted-format, branching, transformation, validation, fallback, or state change. It covers documentation, copy, formatting, generated-output refreshes, and provable pure renames or moves.
- Level 1 applies to every bounded production behavior change inside a known owner when no generic capability or architectural surface is introduced.
- Level 2 applies when behavior is generic; equality, diffing, parsing, validation, serialization, caching, retry, search, indexing, scheduling, state, time, storage, music, or audio is involved; a shared surface or dependency may change; ownership is unclear; or the goal includes slimming, consolidation, Code Health, or deletion.
- Ambiguity, incomplete evidence, or insufficient confidence upgrades the level. Small diffs, private visibility, or refactor labels never reduce it.

## Capability atoms

For each required behavior, define one `CAP-xx` with:

- intent;
- inputs and outputs;
- invariants and boundary behavior;
- side effects;
- lifecycle and current owner;
- domain synonyms.

Queries describe behavior, ownership, state transitions, and side effects rather than only names.

## Evidence waterfall

1. Search local code semantically, then confirm candidates with exact source, types, call sites, tests, and applicable static rules.
2. Inspect applicable directly installed dependencies using the manifest, lockfile, installed declarations and source, and official documentation for the locked version.
3. Inspect relevant transitive dependencies; accidental availability is not permission to import, so record whether promotion to a direct dependency fits.
4. For unresolved Level 2 atoms, inspect platform APIs and mature OSS through official documentation, source, releases, and registry provenance.
5. Adopt a candidate or record a concrete behavioral mismatch. An empty search result is not proof of absence.

Required provider evidence is fail-closed. If local semantic recall is unavailable or unhealthy, local evidence is incomplete. If online sources are unavailable, use an authoritative provider fallback or remain incomplete. Locked installed types and source win version disagreements; otherwise stop. Send only abstract capability descriptions online, never private source snippets.

## Capability Admission

The phase researcher is the only writer of `RESEARCH.md`. Its `## Capability Admission` section records each `CAP-xx` with required behavior, local candidates, dependency/API candidates, OSS/platform candidates, decision, rejection mismatches, Approved Surface, and evidence.

Allowed decisions are `USE_LOCAL`, `USE_INSTALLED_API`, `PROMOTE_TRANSITIVE`, `USE_PLATFORM_API`, `ADD_OSS`, `LOCAL_NO_FIT`, and `NEEDS_SCOPE_DECISION`.

`LOCAL_NO_FIT` requires completed local, dependency, and authoritative OSS/platform evidence plus mismatch reasons. Provider failure, no result, or assertion is insufficient. Approved Surface names the only dependency, module, symbol, algorithm, or owner change permitted; an empty value permits no new production surface.

## Dormant seed promotion

- Before approval, one deferred legacy capability has one carrier: its dormant seed. Surfacing or selecting the seed does not consume it.
- If the current `REQUIREMENTS.md` approves the same legacy capability ID, feature key, and required behavior, delete that seed in the same planning commit. If approval does not occur, keep it. OpenGSD does not delete seeds automatically.
- After that commit, native requirements and their PLAN/SUMMARY/VERIFICATION or milestone archive are the sole carrier; leave unselected seeds untouched and never invent consumed or implemented seed frontmatter.

## Role contract

| Role | Responsibility | Prohibited |
|---|---|---|
| Assumptions analyzer | Atomize behavior; find local semantic candidates, owners, and unknowns. | Choose OSS, admit an implementation, or design file structure. |
| Phase researcher | Verify local, dependency, platform, and OSS evidence; write `RESEARCH.md`; decide or block every CAP. | Prewrite implementation or disguise a preferred code shape as research. |
| Planner | Compile approved CAP decisions into exact actions, tests, and outcomes. | Re-search, select another library, invent a capability, or widen Approved Surface. |
| Plan checker | Reconcile every production task and surface to a CAP. | Repair the plan or silently fill missing admission evidence. |
| Executor | Implement only the approved CAP and plan boundary. | Change API, library, owner, or add generic surface through ordinary deviation. |
| Verifier | Check behavior, the real diff, evidence, and CAP/PLAN traceability. | Trust summaries, edit code, or ignore an unapproved surface. |

## Traceability and change control

- Every production plan task references its `CAP-xx`, exact reused symbol or API, and observable behavior.
- Every dependency, shared helper, service, hook, module, protocol, schema, public API, and generic algorithm must be named in Approved Surface before implementation.
- The real diff maps every production surface back to both its plan task and CAP decision.
- Implementation corrections stay inside the approved boundary.
- A newly required dependency, shared surface, business algorithm, owner move, or API replacement stops affected work and returns only that CAP to research.
- Missing, unresolved, or contradictory evidence prevents planning or execution for the affected CAP.

## Execution liveness and evidence handoff

- Research is the sole producer of local semantic, installed-dependency, platform, and OSS selection evidence. The planner compiles approved decisions into one compact `*-EXECUTION-RECEIPT.md`; it must not repeat discovery.
- The receipt records the approved CAP decisions and surface, behavior/stop conditions, allowed files, and separate product, dependency, search-config, and policy fingerprints. The PLAN pins its SHA-256. Executor context uses the receipt and exact task files, not complete `RESEARCH.md` or `VALIDATION.md` documents.
- Every executable task declares `gate_stage="pre_edit|task|pre_merge"`, `budget="quick|standard|heavy|external"`, `plane="control|product|external"`, and `resumable="true"`. External work also declares a stable external job identity.
- `pre_edit` permits fingerprint/freshness checks and fast local characterization only. Lumen rebuild, dependency/OSS discovery, CodeScene, full repository gates, and final LOC proof cannot run there. Fingerprint drift blocks execution and returns only the affected CAP to research; the executor never refreshes evidence itself.
- Expensive external and repository-wide gates run once against the immutable final revision. Completed cache keys cannot run again. An interrupted or blocked step can be retried only through an explicit new step with `retry_of`; no role may auto-retry.
- The planner and plan checker run `node scripts/gsd-observability-write.mjs validate-plan --repo . --plan <PLAN.md>`. Any nonzero result is `PLAN_BLOCKED`. The controller repeats the same check immediately before executor dispatch because OpenGSD 1.7 does not currently invoke its declared `execute:pre` hook.
- Controllers and executors record named steps with the project-local writer. Logs are measurement only, never lifecycle truth or agent context; native OpenGSD remains the sole owner of milestone, phase, plan, summary, and verification state.

## Outcome reporting

Report these independently:

- preserved or changed behavior and its evidence;
- retired production LOC;
- added and net production LOC across all touched production files;
- before/after Code Health and remaining complexity.

Moving code or improving Code Health is not evidence of deletion. No metric substitutes for behavior and traceability evidence.
