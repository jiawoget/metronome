# G-02 Reuse-First Capability Admission Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task in the primary checkout. Do not create a worktree.

**Goal:** Strengthen the existing Reuse Proof, roles, and validator into one universal reuse-before-local capability admission gate for every future task, with a conditional control-conformance suite that tests the gate itself only when its canonical controls change.

**Architecture:** Keep the existing Metronome workflow, role packets, PR Reuse Proof, and debt-contract validator. Add a read-only plan-input mode to that validator, make plan and PR evidence use one capability table plus stage-specific delivery maps, and reserve semantic fit, coverage, thinness, immutable approval, and diff conformance for independent review.

## Goal

Every future task atomizes behavior before architecture, prefers proven repository/installed/OSS/platform primitives, and admits local generic code only after four-source no-fit evidence. Local product policy must be explicit, non-reimplementing, and independently approved. Exact sources, versions, APIs, probes, stable capability IDs, delivery maps, and diff decisions carry from plan through promotion and fail closed on missing, stale, contradictory, or mismatched evidence. Synthetic pressure testing is a conformance check for changes to the reuse-admission controls themselves; ordinary work exercises the real capability-admission path and records conformance as `NOT_APPLICABLE` unless it also changes one of those exact controls.

## Non-Goals

No OpenSpec, graph, codemap, database, index, manifest, ledger, telemetry store, pressure-test runner, Promptfoo configuration, transcript, scenario artifact, or `.planning/**` writes. No second workflow, validator, status, duplicated policy, dependency, lockfile, `src/**`, global GSD install, or overlay-skill edit. No full-GSD/native typed-agent/native worktree/Context7 claim. The validator never executes probes; package legitimacy is not approval; Pass A does not design architecture. Pressure prompts and full outputs remain ephemeral; only compact conformance counts and actual verdict/code lines may enter the existing PR `Agent Gate Evidence`.

## Current Contract Evidence

The current contract may block unrelated incompleteness but lacks: (a) exact installed version/export/source/probe binding; (b) direct generic reuse plus provably thin policy; and (c) mandatory mature-OSS/platform search, exact API/probe evidence, and no silent local fallback after repo/installed misses. It can therefore admit handmade helpers, guessed APIs, unprobed sources, or unresearched fallback. The old pressure design also leaked fixed semantic case names and expected outcomes, contained only negative cases, ran before a PR existed while requiring PR storage, and could be mistaken for a universal stage. G-02 strengthens existing proof, roles, validator, and control-change conformance without another review path.

## Existing Primitive Search

G-02 applies its proposed contract to itself. `C01` through `C04` cover the universal admission contract; `C05` through `C07` are bounded research evidence proving that the external-research lane reaches exact OSS APIs instead of stopping at a package name; and `C08` through `C18` cover conditional, domain-independent control conformance. The Tonal pilot installed `tonal@6.4.3` with scripts disabled into a temporary workspace directory, ran the probes below, and removed the temporary package and npm cache; it did not change the repository manifest or lockfile. The conformance design reuses the installed Superpowers `writing-skills` / `testing-skills-with-subagents` RED-GREEN-REFACTOR method and the existing validator, role, promotion, and PR-evidence surfaces; it adds no runner or persistent result store.

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|
| `C01` | Parse and structurally validate the canonical reuse-evidence table | `generic` | `repo` | `scripts/validate-pr-debt-contract.mjs#parseTable` | `API: parseTable(sectionBody) with getDataRows(sectionBody, firstHeaderCell)`; `Probe: existing validate-pr-debt-contract selftest passed on 2026-07-18` | `scripts/validate-pr-debt-contract.mjs`; `scripts/validate-pr-debt-contract.selftest.mjs` | `direct-use` | `N/A - selected source fits` |
| `C02` | Keep reuse admission inside the existing immutable-plan and promotion lifecycle | `product-policy` | `repo` | `.agents/skills/metronome-workflow/SKILL.md#Promotion` | `API: PLAN_READY -> immutable plan identity -> independent PLAN_REVIEW_PASS -> implementation and promotion`; `Probe: validate:debt-gates passed on 2026-07-18, including changed-file and PR-contract selftests` | `.agents/skills/metronome-workflow/SKILL.md`; `docs/architecture/debt-gate-map.md`; `scripts/validate-metronome-gates.mjs` | `thin-policy` | `policy-boundary: G-02 adds reuse admission within the existing lifecycle and does not duplicate lifecycle, status, or overlay control`; `composes: C01` |
| `C03` | Route uncovered generic atoms into bounded external documentation research | `generic` | `oss` | `@opengsd/gsd-core@1.7.0#planResearch` | `API: planResearch({ecosystem, config, questions, cwd, homeDir})`; `Probe: read-only pilot passed on 2026-07-18 and returned websearch plus context7 routes; unavailable context7 was recorded as provider_fallback to official web documentation` | local v1.7.0 `agents/gsd-phase-researcher.md`; `gsd-core/bin/lib/research-provider.cjs`; [official v1.7.0 release](https://github.com/open-gsd/gsd-core/releases/tag/v1.7.0) | `direct-use` | `N/A - selected source fits` |
| `C04` | Screen a researched package for obvious package-identity risk without treating the signal as API-fit approval | `generic` | `oss` | `@opengsd/gsd-core@1.7.0#package-legitimacy` | `API: gsd-tools query package-legitimacy check --ecosystem npm <package>`; `Probe: read-only pilot passed on 2026-07-18; tonal returned OK while @tonaljs/tonal returned SUS no-repository` | local v1.7.0 `gsd-core/bin/gsd-tools.cjs`; GSD package-legitimacy output; official Tonal package documentation | `direct-use` | `N/A - selected source fits` |
| `C05` | Parse an exact chord symbol without a local chord parser | `generic` | `oss` | `tonal@6.4.3#Chord.get` | `API: Chord.get(name: string) -> Chord`; `Probe: tonal@6.4.3 returned non-empty Cmaj7/B with tonic C, bass B, and notes B/C/E/G` | [official Tonal chord documentation](https://tonaljs.github.io/tonal/docs/groups/chords); temporary package `package.json`, declarations, and runtime export | `direct-use` | `N/A - selected source fits` |
| `C06` | Transpose a chord symbol without local interval and spelling logic | `generic` | `oss` | `tonal@6.4.3#Chord.transpose` | `API: Chord.transpose(chordName: string, intervalName: string) -> string`; `Probe: tonal@6.4.3 returned Bb7b9 for Eb7b9 transposed by 5P` | [official Tonal chord documentation](https://tonaljs.github.io/tonal/docs/groups/chords); temporary package declarations and runtime export | `direct-use` | `N/A - selected source fits` |
| `C07` | Normalize note spellings without a local note-name normalizer | `generic` | `oss` | `tonal@6.4.3#Note.names` | `API: Note.names(values) -> string[]`; `Probe: tonal@6.4.3 normalized fx and bb to F## and Bb while discarding invalid input` | [official Tonal note documentation](https://tonaljs.github.io/tonal/docs/basics/notes); temporary package declarations and runtime export | `direct-use` | `N/A - selected source fits` |
| `C08` | Determine whether a changed path is an exact member of a declared control-file set | `generic` | `repo` | `scripts/validate-pr-debt-contract.mjs#overlayControlFiles` | `API: Set.has(file) through overlayControlFiles membership`; `Probe: source and selftest inspection on 2026-07-19 confirmed exact membership is already used separately from broad gate-control pattern matching` | `scripts/validate-pr-debt-contract.mjs`; `scripts/validate-pr-debt-contract.selftest.mjs` | `direct-use` | `N/A - selected source fits` |
| `C09` | Require synthetic reuse-admission conformance exactly when a canonical reuse-admission control changes and record ordinary work as not applicable | `product-policy` | `local` | `local:scripts/validate-pr-debt-contract.mjs#reuseAdmissionControlFiles` | `API: reuseAdmissionControlFiles.has(file) -> REQUIRED or NOT_APPLICABLE`; `Probe: 2026-07-19 control-responsibility audit classified every exact control file as REQUIRED and unrelated src, dependency-only, and scripts/foo.mjs changes as NOT_APPLICABLE` | `AGENTS.md`; `.agents/skills/metronome-workflow/SKILL.md`; four role files; shared rule; debt map; validator; gate-package validator; PR template; debt-gate workflow | `local-policy` | `policy-boundary: define the repository-specific reuse-admission conformance trigger without changing broad debt-control matching`; `composes: C08`; `generic-operation: none`; `approval: pending-plan-review` |
| `C10` | Reject a local generic choice whenever fitting repository or installed evidence was bypassed, independent of domain vocabulary | `product-policy` | `repo` | `skills/metronome_planner.md#HardFail` | `API: PLAN_BLOCKED followed by BLOCKER_CODE reuse-existing`; `Probe: role contract inspection on 2026-07-19 confirmed the invariant and exact stable code are explicit` | `skills/metronome_planner.md`; `skills/metronome_reviewer.md` | `thin-policy` | `policy-boundary: conformance exercises the existing bypass invariant with opaque metamorphic cases`; `composes: C16` |
| `C11` | Reject local generic fallback when required mature-OSS or applicable official-platform research remains incomplete, independent of requested operation | `product-policy` | `repo` | `skills/metronome_planner.md#HardFail` | `API: PLAN_BLOCKED followed by BLOCKER_CODE external-research-missing`; `Probe: role and shared-rule inspection on 2026-07-19 confirmed the four-source evidence invariant and exact stable code` | `skills/metronome_planner.md`; `docs/v1/implementation-slices/rules/external-library-first.md` | `thin-policy` | `policy-boundary: conformance varies domain and API vocabulary while preserving incomplete research relations`; `composes: C16` |
| `C12` | Reject unapproved product policy or product policy that hides generic work, while leaving ordinary immutable plan review as the real approval check | `product-policy` | `repo` | `skills/metronome_reviewer.md#ImmutablePlanReview` | `API: PLAN_BLOCKED followed by BLOCKER_CODE local-policy-unapproved for invalid selection evidence; ordinary review emits LOCAL_POLICY_APPROVED only for a valid immutable plan`; `Probe: planner/reviewer contract inspection on 2026-07-19 confirmed stage-correct pending approval, composition, and generic-operation requirements` | `skills/metronome_planner.md`; `skills/metronome_reviewer.md`; `docs/v1/implementation-slices/rules/external-library-first.md` | `thin-policy` | `policy-boundary: synthetic cases test missing approval or hidden generic work without adding a fifth approval stage`; `composes: C16` |
| `C13` | Reject an implementation diff that contradicts a reviewed direct-use decision by adding an equivalent local operation | `product-policy` | `repo` | `skills/metronome_reviewer.md#CandidateReview` | `API: CHANGES_REQUIRED followed by FINDING_CODE reuse-decision-mismatch`; `Probe: reviewer contract inspection on 2026-07-19 confirmed exact diff-conformance outcome and stable code` | `skills/metronome_coder.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md` | `thin-policy` | `policy-boundary: conformance varies diff and primitive vocabulary while preserving reviewed-decision contradiction`; `composes: C16` |
| `C14` | Pressure-test process guidance through RED against the prior contract, GREEN against the candidate contract, and REFACTOR against discovered loopholes | `generic` | `installed` | `superpowers@6.1.1#testing-skills-with-subagents` | `API: RED baseline -> GREEN candidate -> REFACTOR loophole closure with fresh subagents`; `Probe: writing-skills, test-driven-development, and testing-skills-with-subagents were read completely on 2026-07-19 and specify the same pressure-test method` | installed Superpowers 6.1.1 `writing-skills/SKILL.md`; `test-driven-development/SKILL.md`; `writing-skills/testing-skills-with-subagents.md` | `direct-use` | `N/A - selected source fits` |
| `C15` | Preserve promotion order so reviewed candidate evidence permits a Draft PR before required conformance, and conformance passes before external ChatGPT | `product-policy` | `repo` | `.agents/skills/metronome-workflow/SKILL.md#Promotion` | `API: candidate preflight/review -> MSO-5 Draft PR -> conformance -> external ChatGPT -> MSO-6`; `Probe: overlay, template, workflow, and validator inspection on 2026-07-19 confirmed Draft PR evidence is the existing storage context and edited-event CI is available after evidence changes` | `.agents/skills/metronome-workflow/SKILL.md`; `.github/pull_request_template.md`; `.github/workflows/metronome-debt-gates.yml`; `scripts/validate-pr-debt-contract.mjs` | `thin-policy` | `policy-boundary: insert conditional conformance within existing promotion without preventing Draft PR creation or creating a stage`; `composes: C08` |
| `C16` | Compare opaque role projections with a monitor-owned exact verdict/code oracle and fail closed on incomplete or semantically mismatched coverage | `generic` | `installed` | `superpowers@6.1.1#testing-skills-with-subagents` | `API: RED baseline -> GREEN candidate semantic comparison with fresh isolated subagents`; `Probe: writing-skills and testing-skills-with-subagents inspection on 2026-07-19 confirmed that the monitor, not a structural validator, observes and scores actual role behavior` | installed Superpowers 6.1.1 `writing-skills/SKILL.md`; `writing-skills/testing-skills-with-subagents.md` | `direct-use` | `N/A - selected source fits` |
| `C17` | Give each tested role matrix only bounded opaque case projections while keeping family names, expected verdicts, expected codes, scores, and oracle data monitor-only | `product-policy` | `installed` | `superpowers@6.1.1#testing-skills-with-subagents` | `API: one fresh planner matrix and one fresh reviewer matrix per RED or GREEN phase`; `Probe: 2026-07-19 method audit confirmed separate fresh contexts prevent prior-answer and RED-to-GREEN guidance contamination` | installed Superpowers 6.1.1 `writing-skills/SKILL.md`; `writing-skills/testing-skills-with-subagents.md`; `skills/metronome_planner.md`; `skills/metronome_reviewer.md` | `thin-policy` | `policy-boundary: shape low-context role projections and compact outputs without leaking the answer or creating a runner`; `composes: C16` |
| `C18` | Retain only compact applicability, identity, matched-count, and actual verdict/code evidence in the existing PR evidence section | `product-policy` | `repo` | `.github/pull_request_template.md#AgentGateEvidence` | `API: existing Agent Gate Evidence fields edited in place`; `Probe: template and overlay inspection on 2026-07-19 confirmed the existing Draft PR body is the sole persistent gate-evidence surface` | `.github/pull_request_template.md`; `.agents/skills/metronome-workflow/SKILL.md`; `scripts/validate-pr-debt-contract.mjs` | `thin-policy` | `policy-boundary: prompts, shuffled packets, hidden oracle, full outputs, and transcripts remain ephemeral`; `composes: C16` |

### Capability Delivery Map

| Capability ID | Planned files / symbols | Planned tests / probes |
|---|---|---|
| `C01` | `scripts/validate-pr-debt-contract.mjs#validateReuseProof`; existing `parseTable`, `getDataRows`, and immutable-plan identity checks; `scripts/validate-pr-debt-contract.selftest.mjs`; `scripts/validate-metronome-gates.mjs`; `.github/pull_request_template.md` | Plan-input and PR-mode malformed-table, relation, approval, identity, and map selftests |
| `C02` | `skills/metronome_planner.md`; `skills/metronome_coder.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md`; `docs/architecture/debt-gate-map.md` | Real-task capability admission, immutable approval/identity, conditional conformance applicability, and existing promotion-order checks |
| `C03` | `skills/metronome_planner.md`; `skills/metronome_coder.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md`; `docs/v1/implementation-slices/rules/external-library-first.md`; `.github/pull_request_template.md` | `provider_fallback` contract markers, ordinary-task bounded research evidence, and domain-independent incomplete-research conformance cases |
| `C04` | `skills/metronome_planner.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md`; `docs/v1/implementation-slices/rules/external-library-first.md` | Package-legitimacy pilot evidence and semantic-review separation checks |
| `C05` | `docs/v1/implementation-slices/plans/G-02-reuse-first-capability-admission-gate.md#C05` (plan evidence only; no product delivery) | Recorded `tonal@6.4.3#Chord.get` research probe |
| `C06` | `docs/v1/implementation-slices/plans/G-02-reuse-first-capability-admission-gate.md#C06` (plan evidence only; no product delivery) | Recorded `tonal@6.4.3#Chord.transpose` research probe |
| `C07` | `docs/v1/implementation-slices/plans/G-02-reuse-first-capability-admission-gate.md#C07` (plan evidence only; no product delivery) | Recorded `tonal@6.4.3#Note.names` research probe |
| `C08` | `scripts/validate-pr-debt-contract.mjs`; `scripts/validate-pr-debt-contract.selftest.mjs` | Exact-set membership RED/GREEN cases kept separate from broad debt-control patterns |
| `C09` | `scripts/validate-pr-debt-contract.mjs`; `scripts/validate-pr-debt-contract.selftest.mjs`; `scripts/validate-metronome-gates.mjs`; `docs/architecture/debt-gate-map.md` | Every exact control path triggers `REQUIRED`; R01-like, dependency-only, unrelated script, plan-only, and product changes produce `NOT_APPLICABLE` |
| `C10` | `skills/metronome_planner.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md` | RED/GREEN shuffled bypass family with two opaque negative metamorphic cases and one valid positive control |
| `C11` | `skills/metronome_planner.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md`; `docs/v1/implementation-slices/rules/external-library-first.md` | RED/GREEN shuffled incomplete-research family with two opaque negative metamorphic cases and one valid positive control |
| `C12` | `skills/metronome_planner.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md`; `docs/v1/implementation-slices/rules/external-library-first.md` | RED/GREEN shuffled unapproved-or-hidden-policy family with two opaque negative metamorphic cases and one valid positive control; ordinary immutable approval remains unchanged |
| `C13` | `skills/metronome_coder.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md` | RED/GREEN shuffled reviewed-decision/diff family with two opaque negative metamorphic cases and one conforming positive control |
| `C14` | Four existing role files; this plan's conformance contract | Identical packet matrices run RED against role guidance read from the recorded branch merge-base commit and GREEN against exact candidate roles, then reviewed for new loopholes without a runner or stored transcript |
| `C15` | `scripts/validate-pr-debt-contract.mjs`; `scripts/validate-pr-debt-contract.selftest.mjs`; `.github/pull_request_template.md`; `skills/metronome_reviewer.md`; `skills/metronome_chatgpt_review.md`; `docs/architecture/debt-gate-map.md` | MSO-5 accepts conformance `PENDING` or `PASS`; MSO-6 requires `PASS`; non-control work requires `NOT_APPLICABLE`; exact RED merge-base/current-HEAD binding and edited-event CI invalidate stale evidence |
| `C16` | This plan's monitor-owned conformance contract; no implementation surface | Monitor compares the hidden oracle semantically across identical RED/GREEN planner and reviewer matrices; structural validators only check persisted evidence shape |
| `C17` | `skills/metronome_planner.md`; `skills/metronome_reviewer.md`; this plan's conformance contract | Monitor pre-dispatch audit proves complete non-target envelopes, no family/answer/score/oracle leakage, and four isolated invocations: RED planner, RED reviewer, GREEN planner, GREEN reviewer |
| `C18` | `.github/pull_request_template.md`; `scripts/validate-pr-debt-contract.mjs`; `docs/architecture/debt-gate-map.md` | Compact existing PR evidence includes one RED baseline commit, exact candidate HEAD, counts, and actual lines only; no duplicate plan identity, prompt, full output, transcript, fixture artifact, workflow, status, graph, or database persistence |

The pilot proves exact official-source/API/probe routing; it does not authorize adding `tonal` to Metronome.

## Global Invariants

- One capability table governs plan/PR evidence; stage maps use exact headers and the same stable unique `C\d{2,}` ID set, with every changed behavior mapped.
- Generic selection precedes policy design; non-local selection needs exact passed plan/PR probes, and local generic selection needs repo/installed/OSS/platform no-fit evidence.
- Policy declares composition and may constrain but never recreate a primitive; local policy also has `generic-operation: none` and stage-correct approval.
- Machine checks only deterministic shape. Reviewers own fit, coverage, thinness, no-fit sufficiency, approval semantics/freshness, maps, and diff conformance.
- The monitor owns deterministic discovery, probes, bounded research, normalization, and read-only plan-input validation before `PLAN_READY`; research writes nothing and has no direct mesh.
- Existing promotion and exact-head invalidation remain unchanged; local fallback is never implicit.
- Broad debt-contract applicability and exact reuse-admission control-conformance applicability are separate predicates. Synthetic conformance is `REQUIRED` only for the exact canonical control-file set; all other candidates record `NOT_APPLICABLE` and continue through their real capability-admission flow.
- Conformance tests four invariant families, not four fixed examples. The three planner families form one shuffled nine-case matrix and the implementation-review family forms one shuffled three-case matrix. RED and GREEN each use new planner and reviewer contexts, for exactly four fresh xhigh Terra invocations in the complete role matrix.
- Tested-agent packets never contain family labels, expected verdicts/codes, scores, or oracle data. The monitor alone owns the ephemeral oracle and records only compact actual result lines and matched counts in the existing PR evidence.
- Required conformance follows committed preflight and independent candidate review, then Draft PR `MSO-5`; it completes before external ChatGPT and never becomes a new universal stage.

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

## Conditional Reuse-Admission Control Conformance

This is the Superpowers `writing-skills` / `testing-skills-with-subagents` RED-GREEN-REFACTOR pressure method applied to the reuse-admission role contracts. It is not a Metronome Stage, a test runner, or a substitute for a real task's capability admission. The monitor performs it only after the committed candidate passes normal preflight and independent candidate review and a Draft PR exists to hold the compact evidence.

### Exact Applicability Predicate

Synthetic conformance is `REQUIRED` when the candidate changes at least one exact path below. The list is intentionally separate from broad `gateControlFilePatterns`, which continues to decide ordinary debt-contract applicability for production files, dependencies, all `scripts/**`, all `skills/**`, and other debt controls.

| Exact reuse-admission control file | Runtime enforcement responsibility |
|---|---|
| `AGENTS.md` | Forces loading the Metronome overlay before planning, implementation, diagnosis, review, or promotion. |
| `.agents/skills/metronome-workflow/SKILL.md` | Owns role routing, immutable-plan authorization, invalidation, Draft PR timing, external ChatGPT timing, and promotion order. |
| `skills/metronome_planner.md` | Owns Pass A/Pass B selection, research admission, local-policy shape, and exact planner blocker codes. |
| `skills/metronome_coder.md` | Owns selected-source probe reruns, mismatch blocking, no silent local fallback, and PR capability evidence supplied to the monitor. |
| `skills/metronome_reviewer.md` | Owns independent semantic re-derivation, immutable local-policy approval, candidate diff conformance, and exact finding codes. |
| `skills/metronome_chatgpt_review.md` | Owns the external plan/PR semantic review packet and final reuse-conformance review criteria. |
| `docs/v1/implementation-slices/rules/external-library-first.md` | Owns the normative capability schema, source relations, research limits, probe rules, and approval lifecycle. |
| `docs/architecture/debt-gate-map.md` | Owns the repository-visible capability-gate map, machine/semantic boundary, and gate evidence contract. |
| `scripts/validate-pr-debt-contract.mjs` | Enforces plan/PR capability structure, exact identity, conformance applicability/evidence, and promotion-state relations. |
| `scripts/validate-metronome-gates.mjs` | Wires required reuse-admission markers and the focused validator selftest into the existing gate package. |
| `.github/pull_request_template.md` | Defines the sole persistent capability and Agent Gate Evidence slots consumed during promotion. |
| `.github/workflows/metronome-debt-gates.yml` | Runs the existing debt contract on opened, synchronized, reopened, ready-for-review, and edited PR events so evidence edits are checked at exact HEAD. |

The set is exact, not pattern-based. A change only to this G-02 plan, `scripts/validate-pr-debt-contract.selftest.mjs`, an unrelated `scripts/foo.mjs`, an ordinary dependency/lockfile, `.semgrep/**`, `.codescene/**`, or product/test files does not trigger synthetic conformance. Such changes may still require the broad debt contract. G-02 implementation is `REQUIRED` because its candidate changes multiple exact control files; an ordinary R01-like candidate is `NOT_APPLICABLE` unless it also changes an exact path above.

### Domain-Independent Invariant Families

The plan defines required behavior at invariant level only. It never assigns a stable semantic case ID. Before each RED/GREEN pair, the monitor creates new opaque IDs and two negative metamorphic cases whose domain, operation, API, package, and file vocabulary differ while preserving the same invalid evidence relation. A third case is a valid positive control. The three cases are shuffled before dispatch.

| Invariant family | Tested role / stage | Negative required behavior | Positive-control required behavior |
|---|---|---|---|
| Fitting repository or installed primitive bypassed by a local generic choice | Planner / Pass B selection | `PLAN_BLOCKED` with `BLOCKER_CODE reuse-existing` | Valid direct reuse reaches `PLAN_READY` with code `NONE` |
| Local generic fallback with incomplete mature-OSS or applicable official-platform research | Planner / Pass B selection | `PLAN_BLOCKED` with `BLOCKER_CODE external-research-missing` | Complete admitted-source or four-class no-fit evidence reaches `PLAN_READY` with code `NONE` |
| Local product policy unapproved or hiding a generic operation | Planner / Pass B selection | `PLAN_BLOCKED` with `BLOCKER_CODE local-policy-unapproved` | Stage-correct, thin product policy reaches `PLAN_READY` with code `NONE`; real immutable review remains the only approval check |
| Candidate diff contradicts the reviewed `direct-use` decision with an equivalent local operation | Independent implementation reviewer / candidate review | `CHANGES_REQUIRED` with `FINDING_CODE reuse-decision-mismatch` | A conforming diff reaches `PASS` with code `NONE` |

Positive controls are mandatory: an agent that always returns `PLAN_BLOCKED` or `CHANGES_REQUIRED` fails. Both negative cases in a family are mandatory metamorphic variants: recognizing a fixed package, domain, API, or literal example does not pass. No fifth synthetic local-policy approval family or stage is added.

### Blind Packet And Hidden Oracle Contract

Immediately before RED, the monitor records `baselineCommit = git merge-base origin/main <candidate HEAD>`. It must be one lowercase 40-hex commit, an ancestor of candidate `HEAD`, and equal the current branch merge base throughout conformance. Exactly four fresh xhigh Terra invocations then run with no context reuse: (1) RED planner over the shuffled nine planner cases with guidance read from `<baselineCommit>:skills/metronome_planner.md`; (2) RED implementation reviewer over the shuffled three reviewer cases with guidance read from `<baselineCommit>:skills/metronome_reviewer.md`; (3) GREEN planner over the identical nine-case packet in a new context with exact candidate planner guidance; and (4) GREEN implementation reviewer over the identical three-case packet in a new context with exact candidate reviewer guidance. No invocation sees both baseline and candidate guidance.

Every case is a read-only admission-decision projection with a complete role-input envelope. No per-case plan file, commit, PR, or authorization artifact is created. All non-target obligations are explicitly valid, identical within the RED/GREEN pair, and held constant so only the targeted capability-evidence relation varies:

- Each planner case includes task/slice, required-input and read evidence, scope, repo map, surface/retirement accounting, boundary and test evidence, canonical capability table/map, and a monitor `--plan-input` success fact.
- Each implementation-reviewer case includes immutable reviewed plan identity and approvals, coder handoff, committed candidate identity, monitor preflight/test/CodeScene evidence, capability map, and candidate diff.

The projection asks the role to classify only the supplied admission relation. A projected `PLAN_READY` or `PASS` is test output, never authorization to write a plan, approve local policy, accept a real candidate, open/advance a PR, or promote. Actual plan writing, immutable review, candidate review, and overlay promotion remain the only authorization gates.

Each matrix contains only:

1. Opaque case ID.
2. Role and stage.
3. Complete non-target envelope: planner projections include task/slice, required-input/read evidence, scope, repo map, surface/retirement, boundary/test evidence, and monitor plan-input-success fact; reviewer projections include immutable reviewed-plan identity/approvals, coder handoff, committed candidate identity, and monitor preflight/test/CodeScene evidence.
4. Immutable identity binding using the existing Capability plan identity and, for candidate review, exact candidate `HEAD`.
5. Target capability evidence and the stage-correct delivery/implementation map.
6. Candidate diff for implementation-review projections only.

The tested matrix never contains the family name, expected verdict, expected code, score, matched count, oracle, or hints derived from them. In particular, C17 keeps every expected verdict/code monitor-only. The monitor pre-dispatch audit checks the complete-envelope and no-leakage contract; no structural validator can inspect an ephemeral packet.

Each agent returns exactly one line per case in shuffled input order:

```text
<opaque-case-id> | <actual-top-level-verdict> | <actual-stable-code-or-NONE>
```

The actual-output relation is exact but answer-neutral: `PLAN_READY`, `PASS`, or `PASS_WITH_NITS` requires `NONE`; `PLAN_BLOCKED` or `CHANGES_REQUIRED` permits `NONE` or exactly one lowercase kebab code. This permits honest RED observations when prior guidance omits a code or returns another stable code. The validator enforces only this grammar and never restricts RED to hidden expected codes.

The monitor alone maps opaque IDs to the hidden oracle and performs semantic comparison of all twelve RED and twelve GREEN results. RED is valid only when each family demonstrates at least one oracle mismatch against the recorded `baselineCommit`; incidental blocking with the wrong top-level verdict/code does not count as an oracle match. GREEN requires exact hidden-oracle codes for all eight negative cases and exact positive outcomes for all four controls, complete 4/4 family coverage, two negative metamorphic variants per family, correct polarity, and no extra/missing output. Conformance status reaches `PASS` only after this monitor comparison. Validator success cannot establish any of those semantic facts. Candidate/external review verifies that the required process contract and compact evidence are present, not the unseen oracle. A failed GREEN result blocks the conformance attempt; any permitted guidance repair invalidates it and requires a complete new four-invocation role matrix under the overlay repair limit.

Prompts, shuffled packets, hidden oracle, full outputs, and rationalization notes remain ephemeral. They are never committed, attached, pasted into the PR, or stored as transcripts or artifacts.

### Existing PR Evidence And Promotion Order

The existing Capability plan path/commit/blob/SHA-256 in `Reuse Proof` is the sole plan identity. Conformance evidence references that identity and adds only the exact RED baseline commit and candidate `HEAD`; it does not duplicate plan identity fields or create another identity subsystem. `Agent Gate Evidence` stores only:

- Applicability: `REQUIRED` or `NOT_APPLICABLE`.
- Status: `PENDING`, `PASS`, or `NOT_APPLICABLE`.
- Identity binding: existing Reuse Proof Capability plan identity plus exact lowercase candidate `HEAD`.
- `RED baseline commit: <40-lowercase-hex>`.
- `RED families with at least one oracle mismatch: 4/4` when required. This is a monitor assertion whose field/value is structurally required, not machine-rederived.
- GREEN family, negative, positive, and metamorphic-pair matched counts: exact counts out of 4, 8, 4, and 4 when required.
- The compact RED/GREEN actual lines in `<phase> | <opaque-case-id> | <actual-verdict> | <actual-code-or-NONE>` form; no prompt, evidence table, diff, oracle answer, score, explanation, or full response.

The structural validator may enforce only the exact trigger predicate, `REQUIRED` / `NOT_APPLICABLE`, MSO-5/MSO-6 state relations, current `HEAD`, reference to the existing Capability plan identity, lowercase RED baseline commit ancestry and equality to `git merge-base origin/main HEAD`, exact count-field values, the answer-neutral compact grammar (`PLAN_READY|PASS|PASS_WITH_NITS` => `NONE`; `PLAN_BLOCKED|CHANGES_REQUIRED` => `NONE` or one lowercase kebab code), unique IDs, required line counts, and absence of extra persisted conformance fields. It structurally requires the exact `RED families with at least one oracle mismatch: 4/4` assertion but does not rederive it. It cannot determine whether an opaque case is negative or positive, whether two cases are genuine metamorphic variants, whether a verdict/code matches the hidden oracle, or whether an ephemeral packet leaked an answer. Those are monitor-owned semantic checks.

Promotion remains one overlay sequence:

1. Commit candidate; run monitor preflight, exact allowlist/scope checks, full local gates, CodeScene, and independent candidate review.
2. `PASS` or `PASS_WITH_NITS` permits a Draft PR at `MSO-5` with ChatGPT `PENDING`. Required conformance begins as `PENDING`; ordinary non-control work records `NOT_APPLICABLE`.
3. For `REQUIRED`, run RED/GREEN/REFACTOR, edit the same PR evidence to conformance `PASS`, and wait for edited-event exact-HEAD CI before external ChatGPT. `MSO-5` permits conformance `PENDING` or `PASS`.
4. Run external ChatGPT only after conformance `PASS` or `NOT_APPLICABLE` and exact-head CI. A passing external review changes the existing evidence to `MSO-6` plus ChatGPT `PASS` or `PASS_WITH_NITS`.
5. `MSO-6` requires conformance `PASS` for a triggered candidate and `NOT_APPLICABLE` otherwise, followed by edited-event exact-head CI before merge.

Missing, stale, contradictory, or structurally mismatched persisted applicability, Capability plan identity reference, RED baseline commit, candidate `HEAD`, count, compact grammar relation, or allowed field fails machine-closed. Missing or semantically mismatched family coverage, polarity, positive control, metamorphic relation, or hidden-oracle verdict/code fails monitor-closed. Any candidate code/control edit or change to the branch merge base invalidates conformance and downstream evidence under the overlay's existing invalidation rule.

## Exact TDD Implementation Tasks

### Task 0: Promote This Immutable Plan Only

**File/capabilities:** this plan; `C01` through `C18`.

- [ ] Commit only this plan; record commit/blob/SHA-256; obtain matching Terra/Luna `PLAN_REVIEW_PASS`; do not implement before promotion; return to a clean base.

### Task 1: Add Reuse-Proof Selftest RED Cases First

**File/capabilities:** `scripts/validate-pr-debt-contract.selftest.mjs`; `C01`, `C08`, `C09`, `C15`, `C18`.

- [ ] Add plan-input main/map fixtures beside PR main/map fixtures; RED legacy-four-column, malformed header/row, missing column/cell/ID, duplicate/unknown ID, and unequal ID-set cases in both modes.
- [ ] RED bad enums/relations, missing composition, and unknown/non-generic composition targets.
- [ ] Add an installed or OSS source with ranged semver and require failure.
- [ ] RED missing `API:` or `Probe:`.
- [ ] Add `local-no-fit` rows missing each of `repo:`, `installed:`, `oss:`, and `platform:`; add one exact `platform: inapplicable - <reason>` GREEN control.
- [ ] RED local-policy missing boundary/composition/`generic-operation: none`; plan absent/malformed pending approval; PR absent/malformed/mismatched-C-ID approval.
- [ ] RED missing/malformed/non-ancestor/stale capability plan identity and a well-formed local-policy approval token whose commit/blob/SHA-256 differs from the declared current capability plan identity.
- [ ] Before conformance implementation, add RED exact-trigger cases for every canonical reuse-admission control path plus negative controls for this plan, the validator selftest alone, unrelated `scripts/foo.mjs`, dependency/lockfile-only changes, ordinary R01/product/test changes, and broad debt-control paths that are not reuse-admission controls.
- [ ] Add RED applicability/state cases: non-control candidates require exact `NOT_APPLICABLE`; triggered `MSO-5` accepts only conformance `PENDING` or complete `PASS`; triggered `MSO-6` requires complete `PASS`; non-triggered MSO-5/MSO-6 requires `NOT_APPLICABLE`.
- [ ] Add RED missing/malformed/uppercase/non-ancestor RED baseline commit, baseline unequal to current `git merge-base origin/main HEAD`, stale/missing/mismatched candidate `HEAD`, duplicate or mismatched Capability plan identity reference, wrong exact count fields (including the exact `RED families with at least one oracle mismatch: 4/4` assertion), malformed answer-neutral output relations, missing/duplicate opaque IDs or compact lines, and extra persisted conformance fields. Reuse the existing Capability plan identity rather than adding identity fields.
- [ ] Add GREEN structural controls for all exact trigger paths, ordinary `NOT_APPLICABLE`, staged `PENDING`/`PASS`, exact baseline/current-HEAD binding, exact 4/8/4/4 count fields, twelve unique RED and twelve unique GREEN compact lines, `PLAN_READY|PASS|PASS_WITH_NITS` with `NONE`, `PLAN_BLOCKED|CHANGES_REQUIRED` with `NONE` or one lowercase kebab code, and no extra persisted fields. Selftests do not claim family semantics, polarity, metamorphic validity, positive-control validity, oracle agreement, or ephemeral packet secrecy.
- [ ] Preserve existing cases/tokens; record RED because no plan gate or guaranteed PR relation/approval/map checks exist.

### Task 2: Implement Plan And PR Modes In The Existing Structural Validator

**Files/capabilities:** validator and selftest; `C01`, `C08`, `C09`, `C15`, `C18`.

- [ ] Add mode-aware `validateReuseProof`, reusing `parseTable`/`getDataRows`; add read-only `--plan-input <plan-path>` extraction while retaining PR mode.
- [ ] Validate stage main/map headers, cells, unique IDs, exact ID-set equality, enums, relations, exact semver/source encodings, and API/probe markers.
- [ ] Enforce direct-use evidence, four no-fit markers, composition targets, policy markers, and stage approval format/same-row C-ID.
- [ ] Plan accepts only pending approval; PR accepts only an immutable token equal to a valid tracked capability plan identity. Reuse/generalize the existing immutable identity checks; never write, network, execute probes, infer fit, or inspect behavior.
- [ ] Add a separate exact `reuseAdmissionControlFiles` membership predicate without widening or narrowing broad debt-control matching; validate only `REQUIRED` / `NOT_APPLICABLE`, staged conformance state, exact candidate `HEAD`, existing Capability-plan identity reference, lowercase RED baseline commit ancestry/equality to current branch merge base, exact count-field values, the answer-neutral output relation, duplicates/missing lines, and absence of extra persisted fields. Do not execute role agents, inspect packets, compare a hidden oracle, restrict RED to expected codes, or infer semantic polarity/metamorphic coverage.
- [ ] Run all plan/PR fixtures GREEN, then run this plan through plan-input mode as bootstrap integration evidence.

### Task 3: Wire The Existing Gate Package

**Files/capabilities:** gate validator and debt map; `C01`, `C02`, `C08`, `C09`, `C15`, `C18`.

- [ ] Extend existing markers for plan mode, both maps, capability plan identity, composition, platform evidence, approval lifecycle, stable codes, exact conformance trigger/applicability/states/counts, and validator path; add no validator/entrypoint.
- [ ] Document machine/semantic/conformance boundaries, broad-debt versus exact-conformance applicability, no role execution by validators, and Draft-PR-before-conformance timing; prove any required control disconnection fails.

### Task 4: Update The Shared Rule And PR Template

**Files/capabilities:** external rule and PR template; `C01` through `C04`, `C09` through `C18`.

- [ ] Put shared table/map schemas, source/composition/approval/map/probe rules, mandatory OSS/platform research, and domain-independent conformance invariants in the existing rule without fixed semantic case IDs.
- [ ] Keep the PR template concise but require actual probes, tracked capability plan identity, immutable approvals, exact IDs/map, and compact conditional conformance evidence; failed probes or conformance block. Add no workflow/status/identity duplicate.

### Task 5: Strengthen The Four Existing Roles

**Files/capabilities:** four existing role files; `C02` through `C04`, `C10` through `C13`, `C17`.

- [ ] Add Pass A; monitor repo/lock/installed/probe discovery; GSD v1.7.0 adapter; OSS/platform two-lane/two-candidate/stop-on-fit research; ephemeral sole-plan normalization; no mesh.
- [ ] Add planner Pass B, `Capability Delivery Map`, monitor plan-input invocation, and `PLAN_BLOCKED` stable code field.
- [ ] Add independent reviewer re-derivation and exact immutable local-policy approval lines alongside `PLAN_REVIEW_PASS`.
- [ ] Add coder probe reruns/mismatch block/no fallback, PR capability-plan identity/approvals/implementation map, and implementation/ChatGPT identity/fit/freshness/map/test/hidden-equivalent checks with `FINDING_CODE`.
- [ ] Add the four domain-independent invariant outcomes and low-context tested-role output shape. The tested role never receives a family label, expected answer, score, or oracle; ordinary immutable plan review remains the only positive local-policy approval check.
- [ ] Preserve overlay and top-level verdict enums.

### Task 6: Execute Conditional Blind Control Conformance

**Files/capabilities:** only allowlisted validator/selftest/role/rule/template/map corrections; `C08` through `C18`.

- [ ] After normal committed preflight and independent candidate review permit a Draft PR, record `MSO-5`, ChatGPT `PENDING`, conformance applicability `REQUIRED`, and conformance `PENDING` for G-02.
- [ ] Generate one ephemeral shuffled nine-case planner matrix and one shuffled three-case reviewer matrix with new opaque IDs. Each family contributes two vocabulary-distinct negative metamorphic projections and one valid positive projection; every projection has a complete non-target envelope held constant across RED/GREEN.
- [ ] Immediately before RED, record the exact lowercase `baselineCommit = git merge-base origin/main <candidate HEAD>`. Run exactly four fresh xhigh Terra invocations with no shared context: RED planner with guidance read from `<baselineCommit>:skills/metronome_planner.md` and the nine-case matrix; RED reviewer with guidance read from `<baselineCommit>:skills/metronome_reviewer.md` and the three-case matrix; GREEN planner in a new context with exact candidate guidance and the identical nine cases; GREEN reviewer in a new context with exact candidate guidance and the identical three cases. Never show both guidance versions to one agent.
- [ ] The monitor pre-dispatch audit checks packet completeness and oracle absence; the monitor hidden oracle requires at least one RED mismatch per family and exact GREEN matches for 4/4 families, 8/8 negatives, 4/4 positives, and 4/4 metamorphic pairs. Validators and downstream reviewers do not claim to reproduce the unseen comparison.
- [ ] A GREEN semantic mismatch blocks the attempt. Any permitted REFACTOR changes only an observed allowlisted guidance loophole, invalidates the attempt, and requires a complete new four-invocation matrix under the overlay repair limit. Do not add a runner, dependency, Promptfoo config, fixture file, workflow, artifact, transcript, graph, database, or status.
- [ ] Keep prompts, full outputs, hidden oracle, and notes ephemeral. Edit only the exact RED baseline commit, compact actual lines, exact count assertions, existing Capability plan identity reference, exact candidate `HEAD`, and conformance `PASS` into existing PR `Agent Gate Evidence`; then wait for edited-event exact-head CI before external ChatGPT. Recheck the merge base before promotion; any change invalidates conformance.

### Task 7: Full Verification And Independent Review

**Capabilities:** `C01` through `C18`.

- [ ] Confirm only allowlisted paths and no dependency/lock/`src`/`.planning`/duplicate/status/graph/codemap/database change.
- [ ] Run the focused PR debt-contract selftest.
- [ ] Run plan-input mode against the exact immutable plan and PR mode against exact current-head evidence, including conditional conformance applicability/state and compact result validation.
- [ ] Run the existing debt-gate package validation.
- [ ] Run changed Semgrep/XO, lint, typecheck, unit tests, and build.
- [ ] Commit through the normal hook without `--no-verify`.
- [ ] Require no CodeScene decline, exact-commit Terra/Luna review, Draft PR conformance sequence, external review only after conformance `PASS`, `MSO-6`, and final edited-event exact-head CI.

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
14. Exact reuse-admission control applicability uses only the twelve explicitly listed runtime-control files and remains separate from broad debt-contract patterns.
15. G-02 and any future candidate changing an exact control record `REQUIRED`; R01-like, plan-only, selftest-only, unrelated-script, dependency-only, and ordinary product/test candidates record `NOT_APPLICABLE` unless they also change an exact control.
16. The four invariant families cover repository/installed bypass, incomplete OSS/platform research, unapproved or hidden-generic product policy, and reviewed-direct-use/diff contradiction without depending on fixed music, ZIP, parser, package, API, or domain literals.
17. The three planner families form one shuffled nine-case matrix and the reviewer family one shuffled three-case matrix. RED planner and reviewer read guidance from the exact recorded `git merge-base origin/main <candidate HEAD>` commit; GREEN planner and reviewer use two new candidate-guidance contexts. No context sees both baseline and candidate guidance.
18. Every read-only projection has a complete role-input envelope with all non-target planner or reviewer prerequisites explicitly valid and constant. Packets contain only opaque ID, role/stage, envelope, capability evidence/map, and optional diff; never family name, expected verdict/code, score, matched count, or oracle. Outputs contain only opaque ID, actual top-level verdict, and actual stable code or `NONE`.
19. RED and GREEN use identical planner/reviewer matrices. The monitor requires at least one RED oracle mismatch per family and exact GREEN matches for 4/4 families, 8/8 negatives, 4/4 positives, and 4/4 metamorphic pairs. Projected `PLAN_READY`/`PASS` never authorizes a synthetic plan, approval, candidate, PR, or promotion.
20. Prompts, packets, hidden oracle, full responses, and rationalization notes remain ephemeral. Existing PR `Agent Gate Evidence` stores only applicability/status, existing Capability plan identity reference, exact RED baseline commit, exact candidate `HEAD`, exact count assertions, and answer-neutral compact actual lines.
21. Promotion is candidate preflight/review -> Draft PR `MSO-5` with ChatGPT `PENDING` and conformance `PENDING` or `NOT_APPLICABLE` -> required conformance `PASS` and edited-event exact-head CI -> external ChatGPT -> `MSO-6` with ChatGPT pass and conformance `PASS` or `NOT_APPLICABLE` -> edited-event exact-head CI.
22. Structural failures in applicability, identity reference, baseline/current-merge-base binding, `HEAD`, counts, answer-neutral compact grammar, uniqueness, or persisted-field shape fail machine-closed; packet leakage/incompleteness or semantic family, polarity, positive-control, metamorphic, verdict, or code mismatch fails monitor-closed. GREEN reaches conformance `PASS` only after monitor oracle confirmation.
23. The machine validator never executes probes, role agents, pressure scenarios, hidden-oracle comparison, or network access and never claims packet secrecy, semantic coverage, or approval.
24. Only allowlisted files change; no `src/**`, dependency, lockfile, runner, Promptfoo config, new workflow, artifact, transcript, graph, database, or status system appears; all full gates, CodeScene, exact-head independent review, conformance, external review, and CI pass.

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
- A dependency, lockfile, source file, overlay-skill edit, new workflow, second validator, runner, Promptfoo config, status, graph, database, transcript, fixture, or result artifact appears necessary.
- Open GSD v1.7.0 compatibility cannot remain read-only and ephemeral.
- A selected non-local candidate lacks an exact version, export or API, official source, or passed probe.
- Plan-input mode fails, writes state, executes a probe, or is bypassed before `PLAN_READY`.
- A capability delivery/implementation map is malformed, incomplete, or has a different ID set.
- Capability plan identity is missing, non-ancestor, stale, inconsistent with tracked Git object bytes, or differs from a local-policy approval token.
- A local generic candidate lacks complete `repo:`, `installed:`, `oss:`, or `platform:` evidence.
- A thin-policy composition target is missing/non-generic, or a local policy lacks composition, `generic-operation: none`, or stage-correct immutable approval.
- A role or validator change confuses structural checking with semantic approval.
- Exact conformance applicability is inferred from broad debt-control matching, the exact trigger set is widened by patterns, or a listed runtime-control file is omitted.
- A tested projection lacks the complete non-target planner/reviewer envelope, varies a non-target prerequisite, creates a synthetic plan/PR/authorization artifact, leaks family/answer/score/oracle data, uses a stable semantic case ID, lacks two vocabulary-distinct negative variants or a positive control, or is not shuffled.
- RED/GREEN matrices differ; the RED baseline is not the exact recorded branch merge-base commit; RED planner/reviewer do not use separate fresh contexts with guidance read from that commit; GREEN planner/reviewer do not use two new fresh candidate contexts; any agent sees both guidance versions; more or fewer than four invocations form the valid matrix; or always-blocking behavior can pass.
- The recorded RED baseline is missing, not lowercase 40-hex, not an ancestor, not equal to current `git merge-base origin/main HEAD`, or becomes stale after a rebase/merge-base change.
- Structural persisted evidence is missing/stale/mismatched for applicability, existing Capability plan identity reference, RED baseline commit, candidate `HEAD`, exact count assertions, answer-neutral grammar (`PLAN_READY|PASS|PASS_WITH_NITS` => `NONE`; `PLAN_BLOCKED|CHANGES_REQUIRED` => `NONE` or one lowercase kebab code), unique IDs, required lines, or allowed fields; or the monitor finds missing/mismatched semantic 4/4 family, 8/8 negative, 4/4 positive, 4/4 metamorphic, verdict, or exact GREEN code evidence.
- A full prompt, packet, oracle, response, transcript, or explanation is persisted, or conformance is required for ordinary non-control work instead of exact `NOT_APPLICABLE`.
- External ChatGPT begins before required conformance `PASS` and its edited-event exact-head CI, or `MSO-6` carries `PENDING`/missing conformance.
- The implementation diff contradicts a reviewed capability decision.
- Full gates, CodeScene, independent review, external review, or current-head CI fail under the existing repair limits.

## Definition Of Done

- [ ] This plan is promoted with immutable identity and independent plan review.
- [ ] All implementation edits are within the exact allowlist.
- [ ] The shared evidence schema is identical in plan, rule, template, roles, and validator expectations.
- [ ] `validateReuseProof` reuses `parseTable` and `getDataRows`.
- [ ] The existing validator has read-only plan-input and PR modes; both main/map schemas and exact ID-set equality are GREEN.
- [ ] Structural RED selftests cover malformed capability evidence, identity/stale HEAD, malformed/stale/non-ancestor/merge-base-mismatched RED baseline, exact trigger, applicability, staged conformance, exact count assertions, answer-neutral compact grammar, duplicates/missing lines, and extra fields; they do not claim hidden-oracle, polarity, metamorphic, positive-control, or packet-leakage semantics.
- [ ] Machine and semantic responsibilities remain explicitly separated.
- [ ] Planner/monitor invocation, immutable approval timing, coder evidence, and reviewer freshness/semantic checks are fail-closed.
- [ ] No silent local fallback remains possible under the contract.
- [ ] The four domain-independent families run as a nine-case planner matrix and three-case reviewer matrix through exactly four isolated fresh xhigh Terra contexts: RED planner/reviewer use guidance read from the exact recorded branch merge-base commit; new GREEN planner/reviewer use candidate guidance; packets are identical and carry complete non-target envelopes, opaque IDs, eight negative metamorphic projections, four positive projections, and a monitor-only oracle.
- [ ] Synthetic cases remain read-only decision projections; their `PLAN_READY`/`PASS` outputs create no plan, approval, candidate, PR, or promotion authority.
- [ ] G-02 records `REQUIRED`; ordinary non-control examples record `NOT_APPLICABLE`; MSO-5 permits conformance `PENDING`/`PASS`, and MSO-6 requires `PASS` for triggered work.
- [ ] Only the exact RED baseline commit, exact count assertions including `RED families with at least one oracle mismatch: 4/4`, and answer-neutral actual lines are stored in existing PR evidence and bound to the existing Capability plan identity plus exact candidate `HEAD`; full prompts/results remain ephemeral, and merge-base drift invalidates conformance.
- [ ] No prohibited file, dependency, persistent artifact, runner, Promptfoo config, second workflow, or full-GSD claim is introduced.
- [ ] Focused and full repository gates pass with fresh evidence.
- [ ] Independent exact-commit review, Draft-PR conformance, external ChatGPT, edited-event exact-head CI, and existing promotion gates pass in order.

## Completion Output

Implementation returns `GATE_READY` only with requirement-by-requirement evidence on the exact committed candidate. Otherwise it returns `STAGE_BLOCKED` with the first failed criterion and no promotion. This planning revision remains a candidate until monitor-owned `--plan-input` exits `0` and immutable independent plan review passes.
