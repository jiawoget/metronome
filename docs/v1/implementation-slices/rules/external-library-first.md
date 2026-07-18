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
