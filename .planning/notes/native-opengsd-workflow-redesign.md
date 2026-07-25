---
title: Native OpenGSD workflow redesign
date: 2026-07-25
context: Replace the failed Metronome-owned workflow overlay before any R01 product work resumes.
status: owner-approved architecture and implementation boundary
---

# Native OpenGSD Workflow Redesign

## Purpose

Remove the Metronome-owned workflow control plane and return lifecycle ownership to native OpenGSD. Preserve the required reuse-first behavior through one small declarative project contract instead of scripts, validators, status publishers, or telemetry infrastructure.

R01 remains an unimplemented specimen. This decision does not authorize product work.

The project owner authorized this workflow-only implementation on 2026-07-25. Completion remains a live verification and release fact; this note does not pre-assert it.

## Locked Architecture

| Component | Sole responsibility |
|---|---|
| Native OpenGSD | Milestones, research, planning, checking, execution, verification, state, and shipping |
| Native codebase map and Lumen | Reusable navigation and semantic candidate discovery; never lifecycle authority or ground truth |
| Native researcher | Local-code, installed-dependency, and authoritative OSS evidence |
| One project reuse contract | Declarative evidence and decision rules injected through native `agent_skills` |
| Existing quality tools | Lint, typecheck, unit tests, build, GitHub CodeQL/code quality, and read-only final `@codex` review |

Metronome will not maintain a parallel workflow runtime, validator, retry controller, transaction model, status publisher, observability system, graph, database, cache, or OSS scanner.

## Reuse Contract

The contract applies when a task adds, replaces, or materially expands behavior, infrastructure, or an abstraction. Pure deletion, documentation, formatting, and fixes wholly contained by an existing abstraction may mark parts of the evidence as not applicable, with a reason.

Before custom implementation is approved, native `RESEARCH.md` records one compact reuse decision covering:

1. Semantically equivalent local implementations and their actual owners.
2. Relevant APIs already available through installed dependencies.
3. Relevant mature OSS or platform APIs from authoritative sources.
4. The selected reuse, migration, or custom implementation and concrete rejection reasons for viable alternatives.

The gate checks evidence presence, provenance, applicability reasons, and consistency between `RESEARCH.md`, `PLAN.md`, and the final diff. It does not claim that semantic or internet search is mathematically exhaustive.

If a required search capability is unavailable, the researcher reports the missing evidence, completed evidence, and risk, then stops for the project owner. Agents do not silently downgrade, narrow the contract, or retry indefinitely.

## Native Agent Collaboration

The same compact contract is injected only into:

- `gsd-phase-researcher`
- `gsd-planner`
- `gsd-plan-checker`
- `gsd-executor`
- `gsd-verifier`
- `gsd-code-reviewer`

The researcher creates the decision evidence; the planner integrates it; the checker blocks missing or contradictory evidence; the executor cannot substitute an unapproved abstraction; the verifier and reviewer inspect the real diff for selected-owner use and parallel implementations. Controllers, assumptions analyzers, debuggers, and fixers do not own this decision.

## Context and Measurement

The native codebase map is a reusable navigation cache, not a gate or factual database. Researchers read only relevant map sections and confirm material facts against the live code. Planners consume the compact decision artifact rather than raw search output; executors consume the approved plan and relevant files.

Measurement uses native OpenGSD PLAN/SUMMARY/STATE granularity only: plan duration, task count, file count, commits, and progress. Host-provided model, effort, token, or elapsed-time facts may be reported when available; absent facts remain `unavailable` and are never estimated by repository code.

## Release Boundary

Standard CI, CodeQL, and GitHub code quality remain platform-enforced gates. The final finding-free read-only `@codex` review of the actual PR head remains an explicit OpenGSD release step, but no custom GitHub status translator or exact-head publisher will be built to represent it.

## Implementation Boundary

Implementation must first remove all confirmed custom workflow code, tests, workflows, package entrypoints, hooks, and active planning references while preserving native OpenGSD, standard CI, product source/tests, and frozen historical evidence. The replacement may add only the compact declarative reuse contract, its native `agent_skills` mappings, and a concise `AGENTS.md` index.

After cleanup, build the native codebase map once and verify that product behavior has not changed, custom workflow entrypoints are absent, native lifecycle routing works, and the repository is substantially smaller. Do not execute or re-plan R01 during this work.
