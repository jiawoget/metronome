# External Library First Rule

## Universal Capability Admission

Every implementation plan's `## Existing Primitive Search` and every coding PR's
`## Reuse Proof` use this exact capability table. Atomize behavior before
choosing architecture; a capability ID is a stable, unique `C\d{2,}` ID.

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|

`Class` is `generic` or `product-policy`; `Source kind` is `repo`, `installed`,
`oss`, `platform`, or `local`; and `Decision` is `direct-use`, `thin-policy`,
`local-no-fit`, or `local-policy`. Repository sources are `path#symbol`, package
sources are exact `package@x.y.z#export`, platform sources are an official URL
plus exact API, and local sources are `local:path#symbol`. Every row has a
non-empty `API:` and passed `Probe:` marker plus exact files read.

### Stage Maps

Plans add this exact map under `### Capability Delivery Map`:

| Capability ID | Planned files / symbols | Planned tests / probes |
|---|---|---|

PRs add this exact map under `### Capability Implementation Map`:

| Capability ID | Changed files / symbols | Tests / probes |
|---|---|---|

Each map has non-empty cells and exactly the same unique C-ID set as its main
table. It maps every planned or changed behavior; map truth and completeness are
independent-review duties.

### Admission, Research, And Approval

- `direct-use` is generic, non-local, and uses exactly `N/A - selected source fits`.
- `thin-policy` is non-local product policy with `policy-boundary:` and
  `composes: Cxx` for an existing generic row.
- Local generic code is `local-no-fit` only after non-empty `repo:`, `installed:`,
  `oss:`, and `platform:` results. `platform: inapplicable - <reason>` is allowed
  when no official platform API applies.
- `local-policy` is product policy only and contains `policy-boundary:`,
  `composes: Cxx` or `composes: none`, and `generic-operation: none`; it must not
  recreate a generic primitive.
- After repository and installed-package misses, mature OSS and applicable
  official-platform research are mandatory before local fallback. Use at most two
  lanes total and two candidates per lane, and stop when an exact candidate passes
  its probe. A failed probe blocks; it never authorizes silent local fallback.

The monitor performs deterministic discovery, exact-version/export checks, and
probes before selection. Open GSD v1.7.0 may supply read-only researcher-protocol
compatibility only; if Context7 is unavailable, record `provider_fallback` to
official documentation in normalized monitor evidence. It creates no second
workflow, cache, plan artifact, or approval path.

Plan validation is read-only and runs before `PLAN_READY`:
`node scripts/validate-pr-debt-contract.mjs --plan-input docs/v1/implementation-slices/plans/<plan>.md`.
It checks only deterministic structure and never executes probes, commands from
evidence, or network access. Independent review decides source fit, coverage,
thinness, no-fit sufficiency, map truth, approval freshness, and diff
conformance.

For a local-policy row, plan evidence is exactly `approval: pending-plan-review`.
Immutable plan review emits one
`LOCAL_POLICY_APPROVED <Cxx> <planCommit> <planBlob> <planSha256>` per such row
with `PLAN_REVIEW_PASS`. PR evidence repeats the tracked capability plan path,
commit, blob, and SHA-256, and each row uses
`approval: <Cxx>@<40hex commit>/<40hex blob>/<64hex sha256>`. Missing, stale, or
mismatched identity or approval blocks promotion. Planners report
`PLAN_BLOCKED` followed by `BLOCKER_CODE <code>`; implementation reviewers report
`CHANGES_REQUIRED` followed by `FINDING_CODE <code>` without changing the
existing top-level verdicts.

### Conditional Reuse-Admission Control Conformance

Synthetic role conformance is `REQUIRED` only when a candidate changes an exact
member of this canonical control set:

- `AGENTS.md`
- `.agents/skills/metronome-workflow/SKILL.md`
- `skills/metronome_planner.md`
- `skills/metronome_coder.md`
- `skills/metronome_reviewer.md`
- `skills/metronome_chatgpt_review.md`
- `docs/v1/implementation-slices/rules/external-library-first.md`
- `docs/architecture/debt-gate-map.md`
- `scripts/validate-pr-debt-contract.mjs`
- `scripts/validate-metronome-gates.mjs`
- `.github/pull_request_template.md`
- `.github/workflows/metronome-debt-gates.yml`

This exact membership predicate is separate from broad debt-contract patterns.
Every other candidate records `NOT_APPLICABLE`, including a change only to
`scripts/validate-pr-debt-contract.selftest.mjs`, a plan, an unrelated
script/skill/workflow, a dependency or lockfile, `.semgrep/**`, `.codescene/**`,
or product/test files.

The existing PR `Agent Gate Evidence` always carries these four single-value
fields, bound to the existing `Reuse Proof` identity rather than duplicating it:

- `Reuse-admission conformance applicability: REQUIRED|NOT_APPLICABLE`
- `Reuse-admission conformance status: PENDING|PASS|NOT_APPLICABLE`
- `Reuse-admission conformance Capability plan identity reference: Reuse Proof`
- `Reuse-admission conformance candidate HEAD: <lowercase current 40-hex>`

At `MSO-5`, a triggered candidate uses `PENDING` or complete `PASS`; at `MSO-6`
it uses complete `PASS`. A non-triggered candidate uses `NOT_APPLICABLE` at both
stages. `PASS` adds exactly one current-merge-base `RED baseline commit`, the
exact assertions `RED families with at least one oracle mismatch: 4/4`, `GREEN
families matched: 4/4`, `GREEN negative cases matched: 8/8`, `GREEN positive
controls matched: 4/4`, and `GREEN metamorphic pairs matched: 4/4`, plus exactly
twelve unique RED and twelve unique GREEN actual lines over the same opaque-ID
set:

```text
<RED|GREEN> | <opaque-case-id> | <actual-top-level-verdict> | <actual-stable-code-or-NONE>
```

`PLAN_READY`, `PASS`, and `PASS_WITH_NITS` pair with `NONE`.
`PLAN_BLOCKED` and `CHANGES_REQUIRED` pair with `NONE` or one lowercase kebab
code. This grammar is answer-neutral: the structural validator checks only
exact applicability, state, tracked identity reference, current `HEAD`, RED
baseline ancestry/current merge-base equality, exact count values, line count,
ID uniqueness/equality, verdict/code grammar, and no extra conformance fields.
It never runs roles or probes and never infers family coverage, polarity,
positive-control validity, metamorphic equivalence, packet secrecy, or hidden
oracle agreement.

The monitor alone runs the conditional method after committed preflight and
independent candidate review permit a Draft PR. It creates one shuffled
nine-case planner matrix and one shuffled three-case candidate-review matrix,
each with two vocabulary-distinct negative projections and one positive control
per invariant family. Exactly four fresh xhigh Terra contexts run: separate RED
planner/reviewer contexts with role guidance read from the recorded current
branch merge-base, then separate GREEN planner/reviewer contexts with candidate
guidance over the identical packets. Packets use opaque IDs and complete valid
non-target envelopes; expected verdicts/codes, scores, counts, family names, and
oracle data stay monitor-only. Projected verdicts are read-only samples and
authorize no plan, policy approval, write, candidate, PR, or promotion.

The invariant families are repository/installed bypass by local generic code,
incomplete mature-OSS/applicable-platform research before local generic
fallback, unapproved or generic-reimplementing local product policy, and a
candidate diff that contradicts reviewed `direct-use`. The monitor requires at
least one RED oracle mismatch per family and exact GREEN agreement for all
families, eight negative variants, four positive controls, and four metamorphic
pairs. Prompts, packets, hidden oracle, full outputs, and transcripts remain
ephemeral. External ChatGPT begins only after `PASS` or `NOT_APPLICABLE` plus
the edited-event exact-head CI; `MSO-6` and any merge-base or candidate edit
invalidate stale evidence under the existing promotion rules.

Pack F audio, music, recording, waveform, and timing work must check the mature primitive before adding local primitive logic.

## External Primitive Check

Every Pack F coding PR that touches audio, music theory, metronome timing, countdown/count-in execution, recording capture, decode, waveform, or reference playback must state:

- External primitive checked: Tone.js, TonalJS, wavesurfer.js, Web Audio, MediaRecorder, or another named existing dependency/platform API.
- Decision: `replace`, `keep-business-logic`, or `no-go-with-guardrail`.
- Why repo-owned code is still needed when the decision is not `replace`.
- Guardrail added or reused when a primitive remains repo-owned.

## Default Boundaries

- UI components must not import `@/infrastructure/**` directly. Temporary exceptions require a reviewed allowlist entry with a reason and Pack F cleanup stage.
- Do not add custom note, chord, scale, key, interval, pitch, MIDI, time-signature, subdivision, duration, or rhythm primitive tables in audio/music-related production files unless the path is an approved policy/facade allowlist entry in `tests/unit/architecture-boundaries.test.ts` or the file contains `PACK_F_APPROVED_PRIMITIVE_EXCEPTION` and the PR documents the approved no-go.
- Do not add production beat, countdown, count-in, or metronome runtime `setTimeout` scheduling unless the file contains `PACK_F_APPROVED_RUNTIME_TIMER_EXCEPTION` and the PR documents the approved no-go.

## Review Failure

Review must fail when the PR introduces a new local primitive without the External Primitive Check, widens a temporary allowlist without a reason, or moves business policy into infrastructure/browser singleton code.
