---
name: metronome-policy
description: Use when OpenGSD agents handle Metronome production work that may duplicate local behavior or introduce or replace a generic capability, API, or dependency.
---

# Metronome Reuse Policy

## Reuse boundary

- Every production change starts by searching the current owner and semantic equivalents in local code, then confirming candidates through source, types, call sites, and tests. A name-only search is insufficient.
- Full dependency, platform, and OSS research is required only when the change proposes to add or replace a generic capability, API, algorithm, shared surface, or dependency.
- Generic capabilities include parsing, validation, serialization, equality, diffing, search, indexing, caching, scheduling, time, storage, state, retry, music, and audio behavior.
- If a verified local owner or already-installed API satisfies the behavior, reuse it and stop discovery. Do not invent a parallel helper or continue searching merely to produce more evidence.
- Reuse the existing semantic index. Reindex only when a health or freshness check proves it stale; never rebuild it as a per-agent or per-attempt default.
- A provider failure blocks only when the proposed outcome would otherwise be a new local implementation without adequate reuse evidence. It does not invalidate an already verified reusable candidate.

## Evidence waterfall

For a change that crosses the full reuse boundary:

1. Search local code semantically and verify concrete candidates.
2. Inspect applicable direct dependencies using the manifest, lockfile, installed types/source, and official documentation for the locked version.
3. Inspect relevant transitive dependencies and record whether promotion to a direct dependency is appropriate.
4. If still unresolved, inspect platform APIs and mature OSS through official documentation, source, releases, and registry provenance.
5. Select a candidate or record a concrete behavioral mismatch. No result, provider failure, or an unsupported assertion is not proof that no reusable implementation exists.

Locked installed types and source win version disagreements. Send only abstract capability descriptions to online providers, never private source snippets.

## Native artifact handoff

- Native OpenGSD `RESEARCH.md` is the sole durable source for reuse decisions. Record one compact local-reuse result for every production change: the reused owner/symbol or the concrete local mismatch. When the full reuse boundary applies, also record the required behavior, dependency/platform/OSS candidates, selected implementation, version evidence, and concrete rejection mismatches.
- Native `PLAN.md` owns integration design: exact files, symbols or APIs, behavior, tests, and acceptance outcomes. Each production task references its compact local-reuse result and, when applicable, the full reuse decision instead of repeating discovery.
- Native `SUMMARY.md` and `VERIFICATION.md` record what was implemented and whether the planned behavior and reuse decision held.
- Do not create an execution receipt, receipt hash, project/search/policy fingerprints, cache-key protocol, pre-edit lifecycle, or another plan validator. Native OpenGSD owns planning, revision, execution, and verification identity.
- The executor does not repeat research or silently change the chosen API or dependency. A changed reuse/dependency decision returns the affected work through the native phase workflow; ordinary integration corrections remain native planning or execution work.

## Role contract

| Role | Responsibility | Prohibited |
|---|---|---|
| Assumptions analyzer | Identify required behavior, current owners, semantic candidates, and unknowns. | Select OSS or prewrite the implementation. |
| Phase researcher | Produce the required local/dependency/platform/OSS evidence and reuse decisions in `RESEARCH.md`. | Design the integration file structure or pad research after a suitable candidate is known. |
| Planner | Compile requirements and reuse decisions into a compact native plan. | Repeat discovery, invent another API, or embed monitoring and retry machinery. |
| Plan checker | Reconcile every production task with its local-reuse result and any new generic surface with the full reuse decision. | Repair the plan or suggest changing project workflow/tooling inside the product attempt. |
| Executor | Implement the native plan using the selected owner/API/dependency. | Replace the reuse decision or add an unplanned parallel capability. |
| Verifier | Check observable behavior, the real diff, tests, and reuse-sensitive outcomes. | Trust summaries as proof or require unrelated refactor metrics. |

## Process boundary

- If product work reveals that project policy, plan checking, observability, lifecycle tooling, or an unavailable prerequisite without a documented repository fallback must change, stop that product attempt and open a separate workflow-forensics task.
- With `workflow.use_worktrees=false`, work remains in the primary project folder; plans do not invoke `git worktree`.
- Observability records declared timing, status, inputs, and outputs only. Missing measurements remain unavailable and never decide lifecycle state.
- Expensive external analysis runs against the final candidate only when required by the current requirement or terminal review; it is not a default planning preflight.

## Outcome reporting

- Always report behavior and reuse-sensitive evidence required by the current plan.
- Report retired, added, and net production LOC only when the current requirement explicitly asks for LOC reduction or slimming.
- Run and report Code Health and remaining complexity only when the current requirement explicitly asks for Code Health or CodeScene evidence.
- Moving code or improving a metric is never evidence that behavior was removed.
