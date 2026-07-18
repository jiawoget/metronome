# G-02 Reuse-First Capability Admission Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task in the primary checkout. Do not create a worktree.

**Goal:** Strengthen the existing Reuse Proof, roles, and validator into one universal reuse-before-local capability admission gate for every future task.

**Architecture:** Keep the existing Metronome workflow, role packets, PR Reuse Proof, and debt-contract validator. Make planner discovery and PR evidence use one capability table, validate its structural contract in the existing validator, and reserve semantic fit, coverage, thinness, and implementation-conformance decisions for independent review.

## Goal

- Require every future task to decompose requested behavior into capability atoms before architecture or local implementation is selected.
- Prefer a proven repository, installed-package, mature OSS, or platform primitive whenever it fits.
- Permit local generic implementation only after bounded repository, installed-package, and external evidence proves no fit.
- Permit local product policy only when its boundary is explicit, it does not reimplement a generic primitive, and an independent reviewer approves it.
- Bind every selected non-local capability to an exact source, exact version where applicable, exact API, and passed runtime or research probe.
- Carry the same capability IDs and decisions through planning, coding, PR evidence, diff review, and promotion; fail closed on missing, stale, contradictory, or diff-inconsistent evidence.

## Non-Goals

- No OpenSpec, graph, codemap, database, index, manifest, ledger, telemetry store, or `.planning/**` writes.
- No second workflow, validator, status file, duplicated policy block, dependency, lockfile, or `src/**` change.
- No global GSD install and no edit to `.agents/skills/metronome-workflow/SKILL.md`.
- No claim of full GSD execution, native typed-agent/worktree support, or Context7 availability.
- No probe execution by the machine validator, package-legitimacy-as-approval claim, or architecture design during capability atomization.

## Current Contract Evidence

The existing contract can fail for unrelated plan or PR incompleteness, but it does not yet bind reuse admission to: (a) exact installed version, export, source, and runtime or research probe; (b) direct use of a generic primitive plus only provably thin product policy; and (c) mandatory online mature-OSS search, exact API verification, passed probe, and no silent local fallback after repository and installed-package misses.

Therefore a structurally complete legacy Reuse Proof can still admit a handmade generic helper, a guessed package interface, an unprobed source, or a local fallback that was never compared with mature external candidates.

G-02 closes those admission gaps by strengthening the existing proof and existing roles. It does not add another review path.

## Existing Primitive Search

G-02 applies its proposed contract to itself. `C01` through `C04` are implementation capabilities; `C05` through `C07` are the bounded music-library pilot used to prove that the external-research lane reaches an exact OSS API instead of stopping at a package name. The pilot installed `tonal@6.4.3` with scripts disabled into a temporary workspace directory, ran the probes below, and removed the temporary package and npm cache; it did not change the repository manifest or lockfile.

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|
| `C01` | Parse and structurally validate the canonical reuse-evidence table | `generic` | `repo` | `scripts/validate-pr-debt-contract.mjs#parseTable` | `API: parseTable(sectionBody) with getDataRows(sectionBody, firstHeaderCell)`; `Probe: existing validate-pr-debt-contract selftest passed on 2026-07-18` | `scripts/validate-pr-debt-contract.mjs`; `scripts/validate-pr-debt-contract.selftest.mjs` | `direct-use` | `N/A - selected source fits` |
| `C02` | Keep reuse admission inside the existing immutable-plan and promotion lifecycle | `product-policy` | `repo` | `.agents/skills/metronome-workflow/SKILL.md#Promotion` | `API: PLAN_READY -> immutable plan identity -> independent PLAN_REVIEW_PASS -> implementation and promotion`; `Probe: validate:debt-gates passed on 2026-07-18, including changed-file and PR-contract selftests` | `.agents/skills/metronome-workflow/SKILL.md`; `docs/architecture/debt-gate-map.md`; `scripts/validate-metronome-gates.mjs` | `thin-policy` | `policy-boundary: G-02 adds reuse admission within the existing lifecycle and does not duplicate lifecycle, status, or overlay control` |
| `C03` | Route uncovered generic atoms into bounded external documentation research | `generic` | `oss` | `@opengsd/gsd-core@1.7.0#planResearch` | `API: planResearch({ecosystem, config, questions, cwd, homeDir})`; `Probe: read-only pilot passed on 2026-07-18 and returned websearch plus context7 routes; unavailable context7 was recorded as provider_fallback to official web documentation` | local v1.7.0 `agents/gsd-phase-researcher.md`; `gsd-core/bin/lib/research-provider.cjs`; [official v1.7.0 release](https://github.com/open-gsd/gsd-core/releases/tag/v1.7.0) | `direct-use` | `N/A - selected source fits` |
| `C04` | Screen a researched package for obvious package-identity risk without treating the signal as API-fit approval | `generic` | `oss` | `@opengsd/gsd-core@1.7.0#package-legitimacy` | `API: gsd-tools query package-legitimacy check --ecosystem npm <package>`; `Probe: read-only pilot passed on 2026-07-18; tonal returned OK while @tonaljs/tonal returned SUS no-repository` | local v1.7.0 `gsd-core/bin/gsd-tools.cjs`; GSD package-legitimacy output; official Tonal package documentation | `direct-use` | `N/A - selected source fits` |
| `C05` | Parse an exact chord symbol without a local chord parser | `generic` | `oss` | `tonal@6.4.3#Chord.get` | `API: Chord.get(name: string) -> Chord`; `Probe: tonal@6.4.3 returned non-empty Cmaj7/B with tonic C, bass B, and notes B/C/E/G` | [official Tonal chord documentation](https://tonaljs.github.io/tonal/docs/groups/chords); temporary package `package.json`, declarations, and runtime export | `direct-use` | `N/A - selected source fits` |
| `C06` | Transpose a chord symbol without local interval and spelling logic | `generic` | `oss` | `tonal@6.4.3#Chord.transpose` | `API: Chord.transpose(chordName: string, intervalName: string) -> string`; `Probe: tonal@6.4.3 returned Bb7b9 for Eb7b9 transposed by 5P` | [official Tonal chord documentation](https://tonaljs.github.io/tonal/docs/groups/chords); temporary package declarations and runtime export | `direct-use` | `N/A - selected source fits` |
| `C07` | Normalize note spellings without a local note-name normalizer | `generic` | `oss` | `tonal@6.4.3#Note.names` | `API: Note.names(values) -> string[]`; `Probe: tonal@6.4.3 normalized fx and bb to F## and Bb while discarding invalid input` | [official Tonal note documentation](https://tonaljs.github.io/tonal/docs/basics/notes); temporary package declarations and runtime export | `direct-use` | `N/A - selected source fits` |

The pilot proves the adapter can move from a semantic question to current official documentation, an exact package/version/export, a risk signal, and a runtime probe. It does not authorize adding `tonal` to Metronome; a future product requirement must still establish that its own capability atom needs these APIs and must pass the normal plan review.

## Global Invariants

- One capability model governs plan evidence and PR evidence.
- `Existing Primitive Search` and PR `Reuse Proof` use the exact same table header and row relations.
- Every capability row has one stable unique capability ID matching `C\d{2,}`.
- Every behavior introduced or changed by the diff maps to at least one declared capability ID.
- Capability IDs are not renumbered between the reviewed plan and the implementation PR.
- Generic primitives are selected before product-policy composition is designed.
- A non-local candidate is not selected on name, popularity, prose, or type shape alone; it has a passed probe before `PLAN_READY`.
- PR evidence describes an actual passed probe against the exact implemented source and API.
- Local fallback is never implicit.
- A local generic implementation requires explicit repository, installed-package, and external no-fit evidence.
- A local product-policy implementation requires an explicit policy boundary and independent approval.
- A thin policy may compose, parameterize, sequence, or constrain a generic primitive; it may not recreate that primitive.
- Machine checks validate deterministic structure only.
- Independent reviewers own semantic fit, coverage, thinness, no-fit sufficiency, and diff-to-decision conformance.
- The monitor owns deterministic repository, lockfile, installed-source/type, probe, bounded-research, and normalization evidence.
- No research agent writes an artifact or communicates through a direct researcher mesh.
- Existing workflow promotion and exact-head invalidation rules remain unchanged.

## Exact Implementation Allowlist

Implementation may modify only these files:

1. `skills/metronome_planner.md`
2. `skills/metronome_coder.md`
3. `skills/metronome_reviewer.md`
4. `skills/metronome_chatgpt_review.md`
5. `docs/v1/implementation-slices/rules/external-library-first.md`
6. `docs/architecture/debt-gate-map.md`
7. `scripts/validate-pr-debt-contract.mjs`
8. `scripts/validate-pr-debt-contract.selftest.mjs`
9. `scripts/validate-metronome-gates.mjs`
10. `.github/pull_request_template.md`
11. `docs/v1/implementation-slices/plans/G-02-reuse-first-capability-admission-gate.md`

Every other path is forbidden.

The implementation stage must stop before editing if satisfying the contract appears to require any path outside this allowlist.

## Required Evidence Schema

`Existing Primitive Search` in every future implementation plan and `Reuse Proof` in every future PR must use this exact header:

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|
| `C01` | Example capability atom | `generic` | `repo` | `path/to/file.ts#symbol` | `API: symbol`; `Probe: passed evidence` | exact paths | `direct-use` | `N/A - selected source fits` |

The example row illustrates shape only. Real rows must contain task-specific evidence and may not copy its placeholder content.

### Column Contract

| Column | Required contract |
|---|---|
| Capability ID | Unique within the table; exact pattern `C\d{2,}` |
| Need | One behavior-level capability atom, stated without architecture |
| Class | Exact enum `generic` or `product-policy` |
| Source kind | Exact enum `repo`, `installed`, `oss`, `platform`, or `local` |
| Exact source / version | Source encoding defined below; no ranges or unresolved aliases |
| Exact API / probe | Contains both `API:` and `Probe:` markers with non-empty values |
| Files read | Exact repository, package, type, source, or official-document evidence inspected |
| Decision | Exact enum `direct-use`, `thin-policy`, `local-no-fit`, or `local-policy` |
| No-fit / policy evidence | Exact relation-dependent evidence defined below |

### Source Encoding

| Source kind | Exact source / version form |
|---|---|
| `repo` | `path#symbol` using a repository-relative path and exact symbol |
| `installed` | `package@x.y.z#export` with an exact installed semantic version and exact export |
| `oss` | `package@x.y.z#export` with an exact researched semantic version and exact export |
| `platform` | Official URL plus the exact platform API |
| `local` | `local:path#symbol` naming the proposed or existing local surface |

Package versions are exact `x.y.z` values, never ranges, tags, branches, `latest`, wildcards, or omissions; scoped names retain their scope. Repository and local sources name a symbol. Platform evidence uses an official URL, not an aggregator, blog, search result, or generated summary. The plan source and PR source remain identical unless a reviewed plan revision changes the selection first.

### API And Probe Encoding

- Every `Exact API / probe` cell contains both `API:` and `Probe:`.
- `API:` identifies the exact export, signature, command surface, or platform API used for the capability.
- `Probe:` identifies a passed research or runtime check against that exact source and API.
- A documentation read without an executable or otherwise direct compatibility check is not a passed probe.
- A type-only inspection is supporting evidence but does not replace the selected-source probe.
- Before `PLAN_READY`, selected non-local rows record the passed research probe.
- In a PR, selected non-local rows record the actual passed implementation probe.
- Probe commands and transient outputs remain monitor evidence; the plan records the normalized outcome, not a runtime runbook.
- The machine validator checks the presence and shape of the `API:` and `Probe:` markers but never executes either value.

## Decision Relations

| Decision | Required class | Required source kind | Required evidence relation |
|---|---|---|---|
| `direct-use` | `generic` | non-local: `repo`, `installed`, `oss`, or `platform` | Evidence is exactly `N/A - selected source fits` |
| `thin-policy` | `product-policy` | non-local: `repo`, `installed`, `oss`, or `platform` | Evidence contains `policy-boundary:` and identifies the narrow product rule around the selected generic primitive |
| `local-no-fit` | `generic` | `local` | Evidence contains non-empty `repo:`, `installed:`, and `external:` no-fit results |
| `local-policy` | `product-policy` | `local` | Evidence contains `policy-boundary:`, states that no generic primitive is reimplemented, and records independent approval |

`direct-use` and `thin-policy` are never local; the former is generic and the latter product policy. `local-no-fit` is only generic and includes all three search classes. `local-policy` cannot hide a generic primitive, and its approval comes from the independent reviewer. One row cannot combine decisions; a behavior with generic and product-policy parts uses separate, traceably composed rows.

## Machine Versus Semantic Enforcement

| Concern | Machine validator | Planner / monitor | Independent reviewer |
|---|---|---|---|
| Exact table header | Enforce | Produce | Confirm unchanged |
| Non-empty required cells | Enforce | Produce | Inspect meaning |
| Unique `C\d{2,}` IDs | Enforce | Assign | Re-derive coverage |
| Enum values | Enforce | Select | Challenge correctness |
| Decision/class/source relations | Enforce | Apply | Assess semantic truth |
| Exact package semver shape | Enforce | Resolve version | Confirm source matches evidence |
| `API:` and `Probe:` markers | Enforce | Capture passed evidence | Assess probe relevance |
| Required no-fit markers | Enforce | Capture searches | Assess search sufficiency |
| `policy-boundary:` marker | Enforce | Define boundary | Assess policy thinness |
| Probe execution | Never execute | Monitor executes | Inspect actual evidence |
| API fit | Shape only | Demonstrate | Decide semantic fit |
| Capability completeness | Cannot infer | Planner atomizes | Re-derive independently |
| No-fit sufficiency | Marker presence only | Bound search | Decide whether alternatives were fairly tested |
| Diff matches decision | Cannot infer | Coder maps changes | Compare every behavior to capability IDs |
| No hidden reimplementation | Cannot infer | Coder avoids it | Inspect call paths and helper bodies |
| Package legitimacy | Never treat as approval | Record only as risk signal | Separate from fit, license, and OSV decisions |

The validator must not pretend structural evidence proves semantic reuse. A structurally valid but semantically false table is a reviewer failure and must block promotion.

## Planning And Research Protocol

### Pass A: Capability Atomization

1. The planner reads the task and states behavior-level capability atoms without choosing modules, services, repositories, wrappers, or architecture.
2. Each atom receives a provisional stable capability ID.
3. The planner classifies only the need as generic or product policy; it does not select a source yet.
4. The planner hands the atom list to the monitor for deterministic discovery.

### Deterministic Discovery

1. The monitor searches repository paths and symbols for every capability atom.
2. The monitor checks the lockfile and exact installed versions.
3. The monitor reads relevant `node_modules` exports, types, and source where installed-package candidates exist.
4. The monitor runs bounded probes against plausible repository or installed candidates.
5. A fitting repository or installed primitive ends discovery for that atom and is normalized into the evidence table.
6. Product-policy composition is considered only after its generic primitive evidence is resolved.

### External Research Admission

1. Only uncovered generic atoms proceed to online external research.
2. External research is mandatory after both repository and installed-package misses; the planner cannot silently choose local code.
3. Research uses the official Open GSD v1.7.0 researcher protocol through the compatibility adapter.
4. At most two research lanes may run.
5. Each lane evaluates at most two mature OSS candidates.
6. A lane stops immediately when an exact fitting candidate passes its research probe.
7. Research verifies the exact version, export, API, official source, and probe result, then returns ephemeral output only to the monitor.
8. The monitor normalizes accepted evidence into the sole plan; researchers do not communicate directly with each other or the planner.
9. If no candidate fits, external evidence records bounded candidates and exact no-fit reasons before local generic code is admissible.

### Pass B: Architecture And Selection

1. The planner receives only normalized deterministic and external evidence.
2. The planner chooses `direct-use`, `thin-policy`, `local-no-fit`, or `local-policy` per capability row.
3. Architecture is designed around the admitted sources rather than around a preselected local abstraction.
4. Selected non-local candidates must already have a passed research probe.
5. The planner maps planned files, behaviors, and tests to capability IDs.
6. Any missing source, API, probe, no-fit evidence, or policy boundary yields `PLAN_BLOCKED`.

### Independent Plan Review

1. The independent reviewer re-derives the capability atoms from the task without trusting planner coverage.
2. The reviewer checks source fit, evidence relevance, generic-versus-policy classification, thinness, and no-fit sufficiency.
3. The reviewer rejects a locally proposed generic primitive if any fitting admitted source was skipped.
4. The reviewer rejects product-policy language that disguises generic implementation.
5. The reviewer gives explicit independent approval for every `local-policy` row or blocks the plan.
6. Normal immutable plan identity and promotion requirements remain in force.

### Coding And PR Evidence

1. The coder consumes the reviewed capability table as an implementation constraint.
2. The coder reruns every selected-source probe against the exact implementation environment.
3. A version, export, API, behavior, or probe mismatch blocks coding and returns to plan review.
4. The coder cannot replace a failed non-local candidate with a local helper without a reviewed plan revision.
5. The coder maps every changed behavior and supporting test to one or more capability IDs.
6. PR `Reuse Proof` reproduces the exact schema and records actual passed implementation probes.
7. The independent implementation reviewer maps every behavior in the diff back to capability IDs and decisions.
8. A plan marked `direct-use` whose diff introduces a handmade equivalent helper is blocked even if its table passes machine validation.

## GSD Compatibility And Context Controls

- Open GSD v1.7.0 is the current official latest version verified for this pilot.
- The pilot is read-only researcher-protocol compatibility, not a second workflow; current spawn lacks typed-agent and worktree fields for native mapping.
- Context7 is unavailable in the current environment.
- The compatibility adapter therefore uses official-document web research when needed and records `provider_fallback` in normalized monitor evidence.
- No `.planning/**`, cache, research artifact, database, graph, codemap, status file, global install, or full-GSD claim is allowed.
- Research gets only the uncovered atom, exact candidates, official sources, probe question, and minimum compatibility context.
- Research findings supply evidence only and do not override the planner or independent reviewer.
- Package legitimacy is a risk signal only and is not API-fit proof, license approval, security approval, or OSV approval.

## Exact TDD Implementation Tasks

### Task 0: Promote This Immutable Plan Only

**File:** `docs/v1/implementation-slices/plans/G-02-reuse-first-capability-admission-gate.md`

**Capabilities:** `C01` through `C07`

- [ ] Commit only this plan file.
- [ ] Record the plan commit, Git blob, and SHA-256.
- [ ] Obtain independent Terra/Luna `PLAN_REVIEW_PASS` against those identities.
- [ ] Do not begin implementation until the normal plan-promotion boundary is satisfied.
- [ ] Return to a clean implementation base before Task 1.

### Task 1: Add Reuse-Proof Selftest RED Cases First

**File:** `scripts/validate-pr-debt-contract.selftest.mjs`

**Capability:** `C01`

- [ ] Add a legacy four-column Reuse Proof case and require failure.
- [ ] Add a case missing one required column and require failure.
- [ ] Add a duplicate capability-ID case and require failure.
- [ ] Add invalid class, source-kind, and decision enum cases and require failure.
- [ ] Add invalid decision/class/source relation cases and require failure.
- [ ] Add an installed or OSS source with ranged semver and require failure.
- [ ] Add a row missing `API:` and a row missing `Probe:` and require both to fail.
- [ ] Add a `local-no-fit` row missing each of `repo:`, `installed:`, and `external:` and require failure.
- [ ] Add a `thin-policy` or `local-policy` row missing `policy-boundary:` and require failure.
- [ ] Preserve all existing selftest cases and pass tokens.
- [ ] Run the focused selftest and record RED because the existing validator admits the new malformed cases.

### Task 2: Implement The Minimal Structural Validator

**Files:** `scripts/validate-pr-debt-contract.mjs`; `scripts/validate-pr-debt-contract.selftest.mjs`

**Capability:** `C01`

- [ ] Add `validateReuseProof` inside the existing validator.
- [ ] Reuse the existing `parseTable` and `getDataRows` helpers.
- [ ] Require the exact nine-column header.
- [ ] Require non-empty cells and unique `C\d{2,}` IDs.
- [ ] Enforce the class, source-kind, and decision enums.
- [ ] Enforce the decision/class/source relation matrix.
- [ ] Enforce exact installed and OSS semantic-version shape with no ranges.
- [ ] Enforce source encodings for repository, installed, OSS, platform, and local rows.
- [ ] Enforce non-empty `API:` and `Probe:` markers.
- [ ] Enforce exact direct-use evidence and required no-fit or policy markers.
- [ ] Keep the validator deterministic and side-effect free.
- [ ] Do not execute probes, access the network, infer semantic fit, or inspect implementation behavior.
- [ ] Run the focused selftest and record GREEN for all old and new cases.

### Task 3: Wire The Existing Gate Package

**Files:** `scripts/validate-metronome-gates.mjs`; `docs/architecture/debt-gate-map.md`

**Capabilities:** `C01`, `C02`

- [ ] Extend existing required-content markers for the shared schema and validator path.
- [ ] Keep the current validator and selftest entrypoints; add no second validator.
- [ ] Document the machine-versus-semantic enforcement boundary.
- [ ] Document that the gate checks table shape and relations but never runs probes.
- [ ] Document the independent review requirement for fit, thinness, no-fit sufficiency, and diff conformance.
- [ ] Verify the existing gate-package validator fails if the new contract is disconnected.

### Task 4: Update The Shared Rule And PR Template

**Files:** `docs/v1/implementation-slices/rules/external-library-first.md`; `.github/pull_request_template.md`

**Capabilities:** `C01` through `C04`

- [ ] Replace the legacy Reuse Proof shape with the exact shared nine-column schema.
- [ ] State the source encodings, decision relations, and probe timing requirements once in the existing rule.
- [ ] Require mandatory online mature-OSS research after repository and installed misses for uncovered generic atoms.
- [ ] State that a failed selected-source probe blocks rather than authorizes local fallback.
- [ ] Keep the PR template concise while requiring actual passed probes and exact capability IDs.
- [ ] Add no duplicate workflow policy or status field.

### Task 5: Strengthen The Four Existing Roles

**Files:** `skills/metronome_planner.md`; `skills/metronome_coder.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md`

**Capabilities:** `C02` through `C04`

- [ ] Add planner Pass A atomization without architecture.
- [ ] Add monitor-owned deterministic repository, lockfile, installed type/source, and probe discovery.
- [ ] Add bounded external research through the official Open GSD v1.7.0 researcher compatibility adapter.
- [ ] Add the two-lane, two-candidate-per-lane, stop-on-fit bounds.
- [ ] Add ephemeral normalization into the sole plan and prohibit direct agent mesh.
- [ ] Add planner Pass B selection and capability-to-file/test mapping.
- [ ] Add independent reviewer re-derivation and explicit local-policy approval.
- [ ] Add coder probe reruns, mismatch blocking, behavior mapping, and no-silent-local-fallback behavior.
- [ ] Add implementation-review mapping of every diff behavior to a capability ID.
- [ ] Add ChatGPT review checks for semantic fit and hidden handmade equivalents.
- [ ] Preserve the overlay as the sole workflow contract and do not edit it.

### Task 6: Re-Run Pressure Cases As GREEN Gate Evidence

**Files:** Only allowlisted validator selftest or role/rule evidence files if a planned assertion needs correction.

**Capabilities:** `C01` through `C07`

- [ ] Pressure case 1: a direct fitting repository or installed generic primitive exists, but the plan proposes a local wrapper; require the process to block the local decision.
- [ ] Pressure case 2: repository and installed searches miss, but external mature-OSS research is absent or unprobed; require the process to block `local-no-fit`.
- [ ] Pressure case 3: a local product-policy row lacks independent approval or reimplements a generic primitive; require the process to block `local-policy`.
- [ ] Handmade mismatch: the plan says `direct-use`, but the implementation diff adds an equivalent handmade helper; require independent implementation review to block.
- [ ] Confirm structural selftests cover only the machine-detectable portions and role-review fixtures or exact review evidence cover semantic portions.
- [ ] Record all three original RED pressure cases as GREEN blocking evidence after the contract changes.

### Task 7: Full Verification And Independent Review

**Capabilities:** `C01` through `C07`

- [ ] Confirm the exact diff contains only the implementation allowlist.
- [ ] Confirm no dependency, lockfile, `src/**`, `.planning/**`, workflow duplicate, validator duplicate, status artifact, graph, codemap, or database change exists.
- [ ] Run the focused PR debt-contract selftest.
- [ ] Run the existing debt-gate package validation.
- [ ] Run changed-file Semgrep and XO gates.
- [ ] Run repository lint, typecheck, unit tests, and build.
- [ ] Commit through the normal hook without `--no-verify`.
- [ ] Run CodeScene change-set analysis and require no decline.
- [ ] Obtain independent Terra/Luna semantic review on the exact committed candidate.
- [ ] Require current-head CI and external review under the existing promotion workflow.

## Acceptance Criteria

1. Every future plan `Existing Primitive Search` and PR `Reuse Proof` uses the exact shared nine-column schema.
2. The existing validator rejects legacy four-column, missing-column, duplicate-ID, bad-enum, bad-relation, ranged-semver, missing-marker, and missing-evidence cases.
3. Capability IDs are unique, stable, and match `C\d{2,}`.
4. Selected package sources name exact versions and exports; repository, platform, and local sources use their required exact forms.
5. Every API/probe cell contains a real `API:` and `Probe:` value.
6. Selected non-local sources have passed research probes before `PLAN_READY` and actual passed probes in PR evidence.
7. Uncovered generic atoms cannot become local implementations until repository, installed, and bounded external no-fit evidence is present.
8. Direct fitting primitives are used directly; product policy around them is demonstrably thin.
9. Every local-policy row states its boundary, does not reimplement a generic primitive, and has independent approval.
10. The planner performs architecture-free Pass A before discovery and evidence-led Pass B afterward.
11. External research uses at most two lanes and two candidates per lane and stops on fit.
12. Research remains ephemeral and is normalized into the sole plan without direct agent mesh or persistent side artifacts.
13. Coder probe mismatches block and never trigger silent local fallback.
14. Independent review re-derives capability coverage and maps every implementation behavior to a capability ID.
15. A `direct-use` plan paired with a handmade equivalent in the diff is blocked.
16. The machine validator never executes probes or claims semantic approval.
17. The three pressure cases and handmade mismatch produce the required blocking outcomes.
18. Only allowlisted files change, all full gates pass, CodeScene does not decline, and exact-head independent review passes.

## Rollback

- Revert the G-02 implementation commit as one cohesive gate-contract change.
- Restore the prior contents of the ten existing allowlisted contract and validator files.
- Keep this plan as historical evidence unless the user explicitly authorizes its removal.
- Do not add a compatibility parser for the legacy four-column table.
- Do not weaken enums, relations, markers, probe requirements, or semantic review to preserve malformed PR text.
- If rollback is required after PR adoption, block new promotions until the existing template and validator are consistent again.

## Stop Conditions

Stop and return `STAGE_BLOCKED` if any of the following occurs:

- Implementation requires a file outside the exact allowlist.
- A dependency, lockfile, source file, overlay skill, or second workflow/validator/status artifact appears necessary.
- Open GSD v1.7.0 compatibility cannot remain read-only and ephemeral.
- A selected non-local candidate lacks an exact version, export or API, official source, or passed probe.
- A local generic candidate lacks complete repository, installed, and external no-fit evidence.
- A local product-policy candidate lacks a provably thin boundary or independent approval.
- A role or validator change confuses structural checking with semantic approval.
- A pressure case that must block is admitted.
- The implementation diff contradicts a reviewed capability decision.
- Full gates, CodeScene, independent review, external review, or current-head CI fail under the existing repair limits.

## Definition Of Done

- [ ] This plan is promoted with immutable identity and independent plan review.
- [ ] All implementation edits are within the exact allowlist.
- [ ] The shared evidence schema is identical in plan, rule, template, roles, and validator expectations.
- [ ] `validateReuseProof` reuses `parseTable` and `getDataRows`.
- [ ] All specified RED selftests fail before implementation and pass afterward.
- [ ] Machine and semantic responsibilities remain explicitly separated.
- [ ] Planner, monitor, researcher compatibility adapter, coder, reviewer, and ChatGPT reviewer responsibilities are fail-closed.
- [ ] No silent local fallback remains possible under the contract.
- [ ] The three pressure cases and handmade direct-use mismatch are proven blocked.
- [ ] No prohibited file, dependency, persistent artifact, second workflow, or full-GSD claim is introduced.
- [ ] Focused and full repository gates pass with fresh evidence.
- [ ] Independent exact-commit review and existing promotion gates pass.

## Completion Output

Implementation returns `GATE_READY` only with requirement-by-requirement evidence on the exact committed candidate. Otherwise it returns `STAGE_BLOCKED` with the first failed criterion and no promotion.

PLAN_READY
