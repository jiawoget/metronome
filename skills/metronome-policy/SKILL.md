---
name: metronome-policy
description: Apply Metronome's reuse-first evidence contract when work adds, replaces, or materially expands behavior, infrastructure, or an abstraction.
---

# Metronome Reuse Contract

## Trigger

Apply this contract when a task adds, replaces, or materially expands behavior, infrastructure, or an abstraction. Pure deletion, documentation, formatting, and fixes contained wholly inside an existing abstraction may mark an evidence lane not applicable, with a concrete reason.

## Native research decision

Before custom implementation is approved, native `RESEARCH.md` records one compact decision covering:

1. Semantically equivalent local implementations and their actual owners, confirmed against live source, types, call sites, and tests.
2. Applicable APIs already available through installed dependencies, confirmed against the lockfile and installed source or types.
3. Relevant mature OSS or platform APIs, confirmed through authoritative documentation, source, releases, or registry provenance.
4. The selected reuse, migration, or custom implementation, with concrete rejection reasons for viable alternatives.

When a required search capability is unavailable, report the missing evidence, completed evidence, and risk, then stop for the project owner. Do not silently narrow the contract, treat a provider failure as proof of absence, or retry indefinitely. Never send private source to an online provider.

## Native handoff

- `PLAN.md` integrates the approved decision into exact files, APIs, behavior, tests, and acceptance outcomes.
- The plan checker blocks missing or contradictory evidence; it does not repair the plan or project workflow.
- The executor follows the approved owner or API and does not add an unplanned parallel capability.
- The verifier and code reviewer inspect the real diff for selected-owner use, behavior preservation, and parallel implementations.

The native codebase map and Lumen are navigation caches, never lifecycle authority or factual databases. Confirm material claims against live code, and rebuild a cache only when a freshness check proves it stale.

Native OpenGSD exclusively owns lifecycle state, planning, checking, revision, execution, verification, and recovery. Do not add a project receipt, fingerprint, retry controller, status publisher, telemetry system, scanner, cache, graph, database, or second validator around it. Host metrics that are not exposed remain unavailable and are never estimated by repository code.
