# G-02 Reuse-First Capability Admission Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task in the primary checkout. Do not create a worktree.

**Goal:** Strengthen the existing Reuse Proof, roles, and validator into one universal reuse-before-local capability admission gate for every future task.

**Architecture:** Keep the existing Metronome workflow, role packets, PR Reuse Proof, and debt-contract validator. Add a read-only plan-input mode to that validator, make plan and PR evidence use one capability table plus stage-specific delivery maps, and reserve semantic fit, coverage, thinness, immutable approval, and diff conformance for independent review.

## Goal

Every future task atomizes behavior before architecture, prefers proven repository/installed/OSS/platform primitives, and admits local generic code only after four-source no-fit evidence. Local product policy must be explicit, non-reimplementing, and independently approved. Exact sources, versions, APIs, probes, stable capability IDs, delivery maps, and diff decisions carry from plan through promotion and fail closed on missing, stale, contradictory, or mismatched evidence.

## Non-Goals

No OpenSpec, graph, codemap, database, index, manifest, ledger, telemetry store, or `.planning/**` writes. No second workflow, validator, status, duplicated policy, dependency, lockfile, `src/**`, global GSD install, or overlay-skill edit. No full-GSD/native typed-agent/native worktree/Context7 claim. The validator never executes probes; package legitimacy is not approval; Pass A does not design architecture.

## Current Contract Evidence

The current contract may block unrelated incompleteness but lacks: (a) exact installed version/export/source/probe binding; (b) direct generic reuse plus provably thin policy; and (c) mandatory mature-OSS/platform search, exact API/probe evidence, and no silent local fallback after repo/installed misses. It can therefore admit handmade helpers, guessed APIs, unprobed sources, or unresearched fallback. G-02 strengthens existing proof, roles, and validator without another review path.

## Existing Primitive Search

G-02 applies its proposed contract to itself. `C01` through `C04` are implementation capabilities; `C05` through `C07` are the bounded music-library pilot used to prove that the external-research lane reaches an exact OSS API instead of stopping at a package name. The pilot installed `tonal@6.4.3` with scripts disabled into a temporary workspace directory, ran the probes below, and removed the temporary package and npm cache; it did not change the repository manifest or lockfile.

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|
| `C01` | Parse and structurally validate the canonical reuse-evidence table | `generic` | `repo` | `scripts/validate-pr-debt-contract.mjs#parseTable` | `API: parseTable(sectionBody) with getDataRows(sectionBody, firstHeaderCell)`; `Probe: existing validate-pr-debt-contract selftest passed on 2026-07-18` | `scripts/validate-pr-debt-contract.mjs`; `scripts/validate-pr-debt-contract.selftest.mjs` | `direct-use` | `N/A - selected source fits` |
| `C02` | Keep reuse admission inside the existing immutable-plan and promotion lifecycle | `product-policy` | `repo` | `.agents/skills/metronome-workflow/SKILL.md#Promotion` | `API: PLAN_READY -> immutable plan identity -> independent PLAN_REVIEW_PASS -> implementation and promotion`; `Probe: validate:debt-gates passed on 2026-07-18, including changed-file and PR-contract selftests` | `.agents/skills/metronome-workflow/SKILL.md`; `docs/architecture/debt-gate-map.md`; `scripts/validate-metronome-gates.mjs` | `thin-policy` | `policy-boundary: G-02 adds reuse admission within the existing lifecycle and does not duplicate lifecycle, status, or overlay control`; `composes: C01` |
| `C03` | Route uncovered generic atoms into bounded external documentation research | `generic` | `oss` | `@opengsd/gsd-core@1.7.0#planResearch` | `API: planResearch({ecosystem, config, questions, cwd, homeDir})`; `Probe: read-only pilot passed on 2026-07-18 and returned websearch plus context7 routes; unavailable context7 was recorded as provider_fallback to official web documentation` | local v1.7.0 `agents/gsd-phase-researcher.md`; `gsd-core/bin/lib/research-provider.cjs`; [official v1.7.0 release](https://github.com/open-gsd/gsd-core/releases/tag/v1.7.0) | `direct-use` | `N/A - selected source fits` |
| `C04` | Screen a researched package for obvious package-identity risk without treating the signal as API-fit approval | `generic` | `oss` | `@opengsd/gsd-core@1.7.0#package-legitimacy` | `API: gsd-tools query package-legitimacy check --ecosystem npm <package>`; `Probe: read-only pilot passed on 2026-07-18; tonal returned OK while @tonaljs/tonal returned SUS no-repository` | local v1.7.0 `gsd-core/bin/gsd-tools.cjs`; GSD package-legitimacy output; official Tonal package documentation | `direct-use` | `N/A - selected source fits` |
| `C05` | Parse an exact chord symbol without a local chord parser | `generic` | `oss` | `tonal@6.4.3#Chord.get` | `API: Chord.get(name: string) -> Chord`; `Probe: tonal@6.4.3 returned non-empty Cmaj7/B with tonic C, bass B, and notes B/C/E/G` | [official Tonal chord documentation](https://tonaljs.github.io/tonal/docs/groups/chords); temporary package `package.json`, declarations, and runtime export | `direct-use` | `N/A - selected source fits` |
| `C06` | Transpose a chord symbol without local interval and spelling logic | `generic` | `oss` | `tonal@6.4.3#Chord.transpose` | `API: Chord.transpose(chordName: string, intervalName: string) -> string`; `Probe: tonal@6.4.3 returned Bb7b9 for Eb7b9 transposed by 5P` | [official Tonal chord documentation](https://tonaljs.github.io/tonal/docs/groups/chords); temporary package declarations and runtime export | `direct-use` | `N/A - selected source fits` |
| `C07` | Normalize note spellings without a local note-name normalizer | `generic` | `oss` | `tonal@6.4.3#Note.names` | `API: Note.names(values) -> string[]`; `Probe: tonal@6.4.3 normalized fx and bb to F## and Bb while discarding invalid input` | [official Tonal note documentation](https://tonaljs.github.io/tonal/docs/basics/notes); temporary package declarations and runtime export | `direct-use` | `N/A - selected source fits` |

### Capability Delivery Map

| Capability ID | Planned files / symbols | Planned tests / probes |
|---|---|---|
| `C01` | `scripts/validate-pr-debt-contract.mjs#validateReuseProof`; existing `parseTable`, `getDataRows`, and immutable-plan identity checks; `scripts/validate-pr-debt-contract.selftest.mjs`; `scripts/validate-metronome-gates.mjs`; `.github/pull_request_template.md` | Plan-input and PR-mode malformed-table, relation, approval, identity, and map selftests |
| `C02` | `skills/metronome_planner.md`; `skills/metronome_coder.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md`; `docs/architecture/debt-gate-map.md` | Plan-input invocation marker, immutable approval/identity checks, and lifecycle pressure outputs |
| `C03` | `skills/metronome_planner.md`; `skills/metronome_coder.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md`; `docs/v1/implementation-slices/rules/external-library-first.md`; `.github/pull_request_template.md` | `provider_fallback` contract markers and PS-02 bounded OSS/platform research result |
| `C04` | `skills/metronome_planner.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md`; `docs/v1/implementation-slices/rules/external-library-first.md` | Package-legitimacy pilot evidence and semantic-review separation checks |
| `C05` | `docs/v1/implementation-slices/plans/G-02-reuse-first-capability-admission-gate.md#C05` (plan evidence only; no product delivery) | Recorded `tonal@6.4.3#Chord.get` research probe |
| `C06` | `docs/v1/implementation-slices/plans/G-02-reuse-first-capability-admission-gate.md#C06` (plan evidence only; no product delivery) | Recorded `tonal@6.4.3#Chord.transpose` research probe |
| `C07` | `docs/v1/implementation-slices/plans/G-02-reuse-first-capability-admission-gate.md#C07` (plan evidence only; no product delivery) | Recorded `tonal@6.4.3#Note.names` research probe |

The pilot proves exact official-source/API/probe routing; it does not authorize adding `tonal` to Metronome.

## Global Invariants

- One capability table governs plan/PR evidence; stage maps use exact headers and the same stable unique `C\d{2,}` ID set, with every changed behavior mapped.
- Generic selection precedes policy design; non-local selection needs exact passed plan/PR probes, and local generic selection needs repo/installed/OSS/platform no-fit evidence.
- Policy declares composition and may constrain but never recreate a primitive; local policy also has `generic-operation: none` and stage-correct approval.
- Machine checks only deterministic shape. Reviewers own fit, coverage, thinness, no-fit sufficiency, approval semantics/freshness, maps, and diff conformance.
- The monitor owns deterministic discovery, probes, bounded research, normalization, and read-only plan-input validation before `PLAN_READY`; research writes nothing and has no direct mesh.
- Existing promotion and exact-head invalidation remain unchanged; local fallback is never implicit.

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

The existing validator gains read-only `--plan-input <plan-path>` for `## Existing Primitive Search` plus `Capability Delivery Map`; existing PR mode validates `## Reuse Proof` plus `Capability Implementation Map`. Neither mode writes, networks, executes user-provided commands, or runs probes; PR mode may reuse the validator's fixed read-only Git commands for tracked identity checks.

### Delivery Map Schemas

Inside plan `## Existing Primitive Search`, the second table has heading `Capability Delivery Map` and this exact header:

| Capability ID | Planned files / symbols | Planned tests / probes |
|---|---|---|

Inside PR `## Reuse Proof`, the second table has heading `Capability Implementation Map` and this exact header:

| Capability ID | Changed files / symbols | Tests / probes |
|---|---|---|

Each map has non-empty cells, unique `C\d{2,}` IDs, and exact ID-set equality with its stage's main capability table. The validator checks those properties; reviewers check that mapped files, symbols, tests, probes, and diff behavior are truthful and complete.

The same PR `Reuse Proof` section also carries the reviewed task-plan identity as four exact single-value lines:

- `Capability plan path: docs/v1/implementation-slices/plans/<plan>.md`
- `Capability plan commit: <lowercase 40-hex>`
- `Capability plan blob: <lowercase 40-hex>`
- `Capability plan SHA-256: <lowercase 64-hex>`

PR mode reuses and generalizes the existing immutable-overlay-plan identity checks instead of creating a parallel identity validator. The capability plan path must remain under `docs/v1/implementation-slices/plans/`; its commit must be an ancestor of `HEAD`; its blob must match both `<commit>:<path>` and `HEAD:<path>`; and its SHA-256 must match Git object bytes. This makes a well-formed but stale approval structurally detectable.

### Column Contract

- `Capability ID`: unique `C\d{2,}`; `Need`: architecture-free atom; `Class`: `generic|product-policy`; `Source kind`: `repo|installed|oss|platform|local`.
- `Exact source / version`: encoding below; `Exact API / probe`: non-empty `API:` and `Probe:`; `Files read`: exact inspected evidence.
- `Decision`: `direct-use|thin-policy|local-no-fit|local-policy`; final cell obeys the relation table.

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

- `API:` names the exact export/signature/command/platform API; `Probe:` names a passed direct research/runtime check. Docs or types alone are insufficient.
- Selected non-local rows record passed research probes before `PLAN_READY` and actual passed implementation probes in PR evidence.
- Commands/output remain monitor evidence; plans normalize outcomes. The validator checks marker shape and never executes probes.

## Decision Relations

| Decision | Required class | Required source kind | Required evidence relation |
|---|---|---|---|
| `direct-use` | `generic` | non-local: `repo`, `installed`, `oss`, or `platform` | Evidence is exactly `N/A - selected source fits` |
| `thin-policy` | `product-policy` | non-local: `repo`, `installed`, `oss`, or `platform` | Evidence contains `policy-boundary:` and `composes: Cxx`, referencing an existing `generic` row |
| `local-no-fit` | `generic` | `local` | Evidence contains non-empty `repo:`, `installed:`, `oss:`, and `platform:` no-fit results |
| `local-policy` | `product-policy` | `local` | Evidence contains `policy-boundary:`, `composes: Cxx` or `composes: none`, `generic-operation: none`, and the stage-correct `approval:` marker |

`direct-use` and `thin-policy` are never local; the former is generic and the latter product policy. `local-no-fit` is only generic and includes all four search classes. Exact `platform: inapplicable - <reason>` is structurally allowed when no official platform API applies, and the reviewer judges the reason. Every `composes: Cxx` target exists in the same table and is `generic`. `local-policy` cannot hide a generic primitive. One row cannot combine decisions; generic and product-policy parts use separate, traceably composed rows.

### Local-Policy Approval Lifecycle

1. Plan mode requires exact `approval: pending-plan-review`; it is not approval. Structural success permits `PLAN_READY`, never coding.
2. Immutable review emits one `LOCAL_POLICY_APPROVED <Cxx> <planCommit> <planBlob> <planSha256>` per local-policy row plus `PLAN_REVIEW_PASS`.
3. Commit/blob are lowercase 40-hex and SHA-256 lowercase 64-hex; C-ID equals the row. PR evidence carries the exact capability plan identity lines and uses `approval: <Cxx>@<40hex commit>/<40hex blob>/<64hex sha256>`.
4. PR mode validates the tracked capability plan identity, token format/same-row ID, and exact token-to-plan identity equality. Reviewers match the independent approval output and check semantics. Any missing, stale, mismatched, or revised identity blocks and requires new approval.

## Machine Versus Semantic Enforcement

| Concern | Machine validator | Planner / monitor | Independent reviewer |
|---|---|---|---|
| Stage section, headers, cells, IDs, map equality | Enforce | Produce/map | Re-derive coverage/truth |
| Enums, relations, source/semver shape | Enforce | Select/resolve | Assess semantic truth/fit |
| API/probe and four no-fit markers | Enforce markers | Capture evidence | Assess relevance/sufficiency/applicability |
| Policy boundary/composition | Enforce generic target | Define | Assess thinness/no reimplementation |
| Plan pending-approval marker | Enforce exact value | Emit before review | Treat only as pending |
| Capability plan identity / PR approval token | Enforce tracked Git identity, format, same-row ID, and equality | Bind reviewed identity | Match approval output and semantics |
| Probe execution/API fit | Never execute; shape only | Execute/demonstrate | Inspect/decide fit |
| Completeness/no-fit/diff/reimplementation | Cannot infer | Atomize/search/map/avoid | Re-derive and inspect |
| Package legitimacy | Never approval | Risk signal only | Separate fit/license/OSV review |

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
2. After repository and installed-package misses, research is mandatory across mature OSS candidates and applicable official platform APIs; the planner cannot silently choose local code.
3. Research uses the official Open GSD v1.7.0 researcher protocol through the compatibility adapter.
4. At most two lanes total may run across OSS and platform research.
5. Each lane evaluates at most two candidates, including official platform APIs where applicable.
6. All research stops immediately when an exact fitting candidate passes its probe.
7. Research verifies the exact version, export, API, official source, and probe result, then returns ephemeral output only to the monitor.
8. The monitor normalizes accepted evidence into the sole plan; researchers do not communicate directly with each other or the planner.
9. If no candidate fits, evidence records `oss:` and `platform:` results; platform may be exactly `platform: inapplicable - <reason>` when justified.

### Pass B: Architecture And Selection

1. The planner receives only normalized deterministic and external evidence.
2. The planner chooses `direct-use`, `thin-policy`, `local-no-fit`, or `local-policy` per capability row.
3. Architecture is designed around the admitted sources rather than around a preselected local abstraction.
4. Selected non-local candidates must already have a passed research probe.
5. The planner emits the exact `Capability Delivery Map`; local-policy rows contain `approval: pending-plan-review` because immutable review has not yet occurred.
6. The monitor invokes existing-validator plan-input mode against the candidate plan and returns its read-only result to the planner.
7. The planner may emit `PLAN_READY` only after exit `0`; missing source, API, probe, map, composition, no-fit, policy, or stage-correct approval evidence yields `PLAN_BLOCKED` plus `BLOCKER_CODE <code>`.

### Independent Plan Review

1. The independent reviewer re-derives the capability atoms from the task without trusting planner coverage.
2. The reviewer checks source fit, evidence relevance, generic-versus-policy classification, thinness, and no-fit sufficiency.
3. The reviewer rejects a locally proposed generic primitive if any fitting admitted source was skipped.
4. The reviewer rejects product-policy language that disguises generic implementation.
5. For every approved local-policy row, the reviewer emits `LOCAL_POLICY_APPROVED <Cxx> <planCommit> <planBlob> <planSha256>` and verifies composition, `generic-operation: none`, and policy thinness.
6. `PLAN_REVIEW_PASS` is valid only when every local-policy row has exactly one matching immutable approval line; otherwise review blocks.
7. Normal immutable plan identity and promotion requirements remain in force; pending plan evidence never pretends approval already exists.

### Coding And PR Evidence

1. The coder consumes the reviewed capability table as an implementation constraint.
2. The coder reruns every selected-source probe against the exact implementation environment.
3. A version, export, API, behavior, or probe mismatch blocks coding and returns to plan review.
4. The coder cannot replace a failed non-local candidate with a local helper without a reviewed plan revision.
5. The coder maps every changed behavior and supporting test to one or more capability IDs.
6. PR `Reuse Proof` reproduces the exact schema, actual passed probes, tracked capability plan identity, and immutable local-policy approval tokens; `Capability Implementation Map` maps the identical C-ID set to changed files, symbols, tests, and probes.
7. PR mode validates both tables plus tracked plan/approval identity without executing probes; the independent implementation reviewer matches the approval output and checks semantic mapping, diff behavior, and test correctness.
8. A plan marked `direct-use` whose diff introduces a handmade equivalent helper receives `CHANGES_REQUIRED` plus `FINDING_CODE reuse-decision-mismatch`, even if machine validation passes.

## GSD Compatibility And Context Controls

- Open GSD v1.7.0 is the current official latest version verified for this pilot.
- The pilot is read-only researcher-protocol compatibility, not a second workflow; current spawn lacks typed-agent and worktree fields for native mapping.
- Context7 is unavailable in the current environment.
- The compatibility adapter therefore uses official-document web research when needed and records `provider_fallback` in normalized monitor evidence.
- No `.planning/**`, cache, research artifact, database, graph, codemap, status file, global install, or full-GSD claim is allowed.
- Research gets only the uncovered atom, exact candidates, official sources, probe question, and minimum compatibility context.
- Research findings supply evidence only and do not override the planner or independent reviewer.
- Package legitimacy is a risk signal only and is not API-fit proof, license approval, security approval, or OSV approval.

## Pressure Scenario Fixtures

Each fixed packet contains `Packet ID`, `Stage`, `Immutable envelope`, `Capability table`, stage delivery map, optional `Candidate diff snippet`, `Expected role`, `Expected top-level token`, and `Expected code`. GREEN execution substitutes the actual tracked G-02 plan commit/blob/SHA-256 and actual candidate HEAD in the immutable envelope; all scenario rows and snippets below remain literal.

Roles add one machine-stable secondary line without changing top-level verdict enums: planners use `BLOCKER_CODE <code>` after `PLAN_BLOCKED`; implementation reviewers use `FINDING_CODE <code>` after `CHANGES_REQUIRED`.

### PS-01 Installed Primitive Bypassed

Packet fields: `Packet ID: PS-01`; `Stage: plan selection`; `Immutable envelope: exact tracked G-02 plan commit/blob/SHA-256; no diff`; `Expected role: planner`; `Expected output: PLAN_BLOCKED`; `Expected code: BLOCKER_CODE reuse-existing`.

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|
| `C80` | Split a time signature into numerator and denominator | `generic` | `local` | `local:app/time-signature.ts#splitTimeSignature` | `API: splitTimeSignature(value)`; `Probe: local examples return 7 and 8 for 7/8` | lockfile; `node_modules/@tonaljs/time-signature` export/types/source | `local-no-fit` | `repo: no fit`; `installed: @tonaljs/time-signature@4.9.0#get fits; get('7/8') returned empty false, name 7/8, type irregular, upper 7, lower 8, additive []`; `oss: not reached`; `platform: inapplicable - pure parsing capability` |

| Capability ID | Planned files / symbols | Planned tests / probes |
|---|---|---|
| `C80` | `app/time-signature.ts#splitTimeSignature` | Local split-parser examples |

### PS-02 External Research Missing

Packet fields: `Packet ID: PS-02`; `Stage: plan selection`; `Immutable envelope: exact tracked G-02 plan commit/blob/SHA-256; no diff`; `Expected role: planner`; `Expected output: PLAN_BLOCKED`; `Expected code: BLOCKER_CODE external-research-missing`.

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|
| `C81` | Create a ZIP archive | `generic` | `local` | `local:app/archive.ts#createZip` | `API: createZip(entries)`; `Probe: proposed local ZIP fixture passes` | repository search; lockfile; installed package types | `local-no-fit` | `repo: no fit`; `installed: no fit` |

| Capability ID | Planned files / symbols | Planned tests / probes |
|---|---|---|
| `C81` | `app/archive.ts#createZip` | ZIP round-trip fixture |

### PS-03 Local Policy Unapproved

Packet fields: `Packet ID: PS-03`; `Stage: plan selection`; `Immutable envelope: exact tracked G-02 plan commit/blob/SHA-256; no diff`; `Expected role: planner`; `Expected output: PLAN_BLOCKED`; `Expected code: BLOCKER_CODE local-policy-unapproved`.

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|
| `C82` | Enforce a product whitelist while parsing and normalizing its entries locally | `product-policy` | `local` | `local:app/whitelist.ts#isAllowed` | `API: isAllowed(rawEntry)`; `Probe: mixed-case comma-list examples pass` | product rule; repository search | `local-policy` | `policy-boundary: product whitelist`; `composes: none`; `generic-operation: none` |

| Capability ID | Planned files / symbols | Planned tests / probes |
|---|---|---|
| `C82` | `app/whitelist.ts#isAllowed`, including split/trim/lowercase parsing | Mixed-case comma-list policy examples |

### PS-04 Reviewed Decision Mismatches Diff

Packet fields: `Packet ID: PS-04`; `Stage: implementation review`; `Immutable envelope: exact approved G-02 plan commit/blob/SHA-256 and current candidate HEAD`; `Expected role: independent implementation reviewer`; `Expected output: CHANGES_REQUIRED`; `Expected code: FINDING_CODE reuse-decision-mismatch`.

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|
| `C83` | Parse a time signature | `generic` | `installed` | `@tonaljs/time-signature@4.9.0#get` | `API: get(value)`; `Probe: dist/index.d.ts exports get/parse/names and get('7/8') returned empty false, name 7/8, type irregular, upper 7, lower 8, additive []` | lockfile; installed `dist/index.d.ts`; runtime export | `direct-use` | `N/A - selected source fits` |

| Capability ID | Changed files / symbols | Tests / probes |
|---|---|---|
| `C83` | `app/time-signature.ts#splitTimeSignature` | Candidate parser examples |

Candidate diff snippet:

```diff
+ const splitTimeSignature = value => value.split('/').map(Number);
```

RED baseline: before the role repairs, existing roles did not guarantee these exact codes or outcomes, even when they happened to block a packet for unrelated incompleteness. Such incidental blocking is not a RED pass.

GREEN execution: the monitor sends each literal packet to a fresh role agent with the exact immutable plan identity and, for PS-04, exact current HEAD. The monitor records each full unedited output in the existing PR `Agent Gate Evidence`; it creates no fixture, transcript, status, or evidence file.

## Exact TDD Implementation Tasks

### Task 0: Promote This Immutable Plan Only

**File/capabilities:** this plan; `C01` through `C07`.

- [ ] Commit only this plan; record commit/blob/SHA-256; obtain matching Terra/Luna `PLAN_REVIEW_PASS`; do not implement before promotion; return to a clean base.

### Task 1: Add Reuse-Proof Selftest RED Cases First

**File/capability:** `scripts/validate-pr-debt-contract.selftest.mjs`; `C01`.

- [ ] Add plan-input main/map fixtures beside PR main/map fixtures; RED legacy-four-column, malformed header/row, missing column/cell/ID, duplicate/unknown ID, and unequal ID-set cases in both modes.
- [ ] RED bad enums/relations, missing composition, and unknown/non-generic composition targets.
- [ ] Add an installed or OSS source with ranged semver and require failure.
- [ ] RED missing `API:` or `Probe:`.
- [ ] Add `local-no-fit` rows missing each of `repo:`, `installed:`, `oss:`, and `platform:`; add one exact `platform: inapplicable - <reason>` GREEN control.
- [ ] RED local-policy missing boundary/composition/`generic-operation: none`; plan absent/malformed pending approval; PR absent/malformed/mismatched-C-ID approval.
- [ ] RED missing/malformed/non-ancestor/stale capability plan identity and a well-formed local-policy approval token whose commit/blob/SHA-256 differs from the declared current capability plan identity.
- [ ] Preserve existing cases/tokens; record RED because no plan gate or guaranteed PR relation/approval/map checks exist.

### Task 2: Implement Plan And PR Modes In The Existing Structural Validator

**Files/capability:** validator and selftest; `C01`.

- [ ] Add mode-aware `validateReuseProof`, reusing `parseTable`/`getDataRows`; add read-only `--plan-input <plan-path>` extraction while retaining PR mode.
- [ ] Validate stage main/map headers, cells, unique IDs, exact ID-set equality, enums, relations, exact semver/source encodings, and API/probe markers.
- [ ] Enforce direct-use evidence, four no-fit markers, composition targets, policy markers, and stage approval format/same-row C-ID.
- [ ] Plan accepts only pending approval; PR accepts only an immutable token equal to a valid tracked capability plan identity. Reuse/generalize the existing immutable identity checks; never write, network, execute probes, infer fit, or inspect behavior.
- [ ] Run all plan/PR fixtures GREEN, then run this plan through plan-input mode as bootstrap integration evidence.

### Task 3: Wire The Existing Gate Package

**Files/capabilities:** gate validator and debt map; `C01`, `C02`.

- [ ] Extend existing markers for plan mode, both maps, capability plan identity, composition, platform evidence, approval lifecycle, stable codes, and validator path; add no validator/entrypoint.
- [ ] Document machine/semantic and plan/review timing boundaries, no probe execution, and semantic-review duties; prove disconnection fails.

### Task 4: Update The Shared Rule And PR Template

**Files/capabilities:** external rule and PR template; `C01` through `C04`.

- [ ] Put shared table/map schemas, source/composition/approval/map/probe rules, and mandatory OSS/platform research in the existing rule.
- [ ] Keep the PR template concise but require actual probes, tracked capability plan identity, immutable approvals, and exact IDs/map; failed probes block; add no workflow/status duplicate.

### Task 5: Strengthen The Four Existing Roles

**Files/capabilities:** four existing role files; `C02` through `C04`.

- [ ] Add Pass A; monitor repo/lock/installed/probe discovery; GSD v1.7.0 adapter; OSS/platform two-lane/two-candidate/stop-on-fit research; ephemeral sole-plan normalization; no mesh.
- [ ] Add planner Pass B, `Capability Delivery Map`, monitor plan-input invocation, and `PLAN_BLOCKED` stable code field.
- [ ] Add independent reviewer re-derivation and exact immutable local-policy approval lines alongside `PLAN_REVIEW_PASS`.
- [ ] Add coder probe reruns/mismatch block/no fallback, PR capability-plan identity/approvals/implementation map, and implementation/ChatGPT identity/fit/freshness/map/test/hidden-equivalent checks with `FINDING_CODE`.
- [ ] Preserve overlay and top-level verdict enums.

### Task 6: Execute The Fixed Pressure Packets

**Files/capabilities:** only allowlisted selftest/role/rule corrections; `C01` through `C07`.

- [ ] Preserve RED baseline; send unchanged PS-01..04 to fresh agents with exact immutable/current-head envelopes.
- [ ] Require the four exact verdict/code pairs; record full outputs only in existing PR `Agent Gate Evidence`, with no new file.
- [ ] Use selftests for structure and fresh-role outputs for semantics.

### Task 7: Full Verification And Independent Review

**Capabilities:** `C01` through `C07`.

- [ ] Confirm only allowlisted paths and no dependency/lock/`src`/`.planning`/duplicate/status/graph/codemap/database change.
- [ ] Run the focused PR debt-contract selftest.
- [ ] Run plan-input mode against the exact immutable plan and PR mode against exact current-head evidence.
- [ ] Run the existing debt-gate package validation.
- [ ] Run changed Semgrep/XO, lint, typecheck, unit tests, and build.
- [ ] Commit through the normal hook without `--no-verify`.
- [ ] Require no CodeScene decline, exact-commit Terra/Luna review, current-head CI, and external review.

## Acceptance Criteria

1. Every future plan and PR uses the exact shared capability schema and its exact stage-specific delivery-map schema.
2. Existing-validator plan-input mode validates `## Existing Primitive Search` read-only before `PLAN_READY`; existing PR mode validates `## Reuse Proof`.
3. Both modes reject malformed headers/rows, missing cells, duplicate IDs, map-ID inequality, bad enums/relations, ranged semver, and missing markers.
4. Capability IDs are unique and stable; selected sources and `API:`/`Probe:` values are exact.
5. Thin policy composes an existing generic C-ID; local policy declares composition, `generic-operation: none`, and stage-correct approval.
6. Plan local-policy rows use only `approval: pending-plan-review`; review emits one immutable approval line per row plus `PLAN_REVIEW_PASS`.
7. PR mode validates the tracked capability plan path/commit/blob/SHA-256, requires local-policy token identity equality, and rejects stale identity before reviewers match the approval output and check semantics.
8. Uncovered generic atoms cannot become local until `repo:`, `installed:`, `oss:`, and `platform:` evidence is complete and semantically sufficient.
9. Applicable official platform APIs and mature OSS share at most two lanes total, two candidates per lane, and stop-on-fit behavior.
10. Exact `platform: inapplicable - <reason>` is structurally accepted and semantically reviewed.
11. Selected non-local sources have passed plan probes and actual PR probes; mismatch never triggers silent local fallback.
12. Planner Pass A is architecture-free; Pass B emits the delivery map and passes monitor-owned plan-input validation.
13. Independent review re-derives coverage, fit, thinness, no-fit evidence, immutable approval, map truth, diff behavior, and test correctness.
14. PS-01 through PS-03 return exact `PLAN_BLOCKED` blocker codes and PS-04 returns exact `CHANGES_REQUIRED` finding code from fresh agents.
15. Pressure outputs are stored only in existing PR `Agent Gate Evidence`; no fixture/evidence file or new top-level verdict enum exists.
16. The machine validator never executes probes, accesses the network, or claims semantic approval.
17. Only allowlisted files change; all full gates, CodeScene, exact-head independent review, external review, and CI pass.

## Rollback

- Revert the G-02 implementation commit as one cohesive gate-contract change.
- Restore the prior contents of the ten existing allowlisted contract and validator files.
- Keep this plan as historical evidence unless the user explicitly authorizes its removal.
- Do not add a compatibility parser for the legacy four-column table.
- Do not weaken plan-input mode, map equality, tracked capability plan identity, enums, relations, platform markers, composition, approval identity, probes, stable codes, or semantic review.
- If rollback is required after PR adoption, block new promotions until the existing template and validator are consistent again.

## Stop Conditions

Stop and return `STAGE_BLOCKED` if any of the following occurs:

- Implementation requires a file outside the exact allowlist.
- A dependency, lockfile, source file, overlay skill, or second workflow/validator/status artifact appears necessary.
- Open GSD v1.7.0 compatibility cannot remain read-only and ephemeral.
- A selected non-local candidate lacks an exact version, export or API, official source, or passed probe.
- Plan-input mode fails, writes state, executes a probe, or is bypassed before `PLAN_READY`.
- A capability delivery/implementation map is malformed, incomplete, or has a different ID set.
- Capability plan identity is missing, non-ancestor, stale, inconsistent with tracked Git object bytes, or differs from a local-policy approval token.
- A local generic candidate lacks complete `repo:`, `installed:`, `oss:`, or `platform:` evidence.
- A thin-policy composition target is missing/non-generic, or a local policy lacks composition, `generic-operation: none`, or stage-correct immutable approval.
- A role or validator change confuses structural checking with semantic approval.
- A pressure packet produces the wrong verdict/code or is run without fresh-agent immutable/current-head inputs.
- The implementation diff contradicts a reviewed capability decision.
- Full gates, CodeScene, independent review, external review, or current-head CI fail under the existing repair limits.

## Definition Of Done

- [ ] This plan is promoted with immutable identity and independent plan review.
- [ ] All implementation edits are within the exact allowlist.
- [ ] The shared evidence schema is identical in plan, rule, template, roles, and validator expectations.
- [ ] `validateReuseProof` reuses `parseTable` and `getDataRows`.
- [ ] The existing validator has read-only plan-input and PR modes; both main/map schemas and exact ID-set equality are GREEN.
- [ ] All malformed header/row, capability-plan identity, stale approval, platform, composition, semver, marker, and map RED cases pass after implementation.
- [ ] Machine and semantic responsibilities remain explicitly separated.
- [ ] Planner/monitor invocation, immutable approval timing, coder evidence, and reviewer freshness/semantic checks are fail-closed.
- [ ] No silent local fallback remains possible under the contract.
- [ ] PS-01 through PS-04 return their exact verdict/code pairs from fresh agents, with full outputs in existing PR evidence only.
- [ ] No prohibited file, dependency, persistent artifact, second workflow, or full-GSD claim is introduced.
- [ ] Focused and full repository gates pass with fresh evidence.
- [ ] Independent exact-commit review and existing promotion gates pass.

## Completion Output

Implementation returns `GATE_READY` only with requirement-by-requirement evidence on the exact committed candidate. Otherwise it returns `STAGE_BLOCKED` with the first failed criterion and no promotion.

PLAN_READY
