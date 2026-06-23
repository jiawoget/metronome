# v1 Start Here

## Purpose

This is the required entrypoint for v1 scheduling.

Detailed v1 docs remain available, but weak scheduler agents and subagents should not read every v1 file by default.

## Source Of Truth

Use one status file:

```text
docs/v1/status.json
```

Use one product-to-slice map:

```text
docs/v1/implementation-slices/product-feature-map.md
```

Use the current pack slice file:

```text
docs/v1/implementation-slices/01-practice-segment-mvp.md
```

## Process

```text
status.json
  -> find next planning_ready slice
  -> fresh planning agent
  -> ready_for_coding
  -> fresh coding agent
  -> fresh review agent
  -> fresh verification agent
  -> verified
```

## Scheduler Rules

- Do not write product code.
- Do not assign broad product features.
- Assign exactly one implementation slice at a time.
- Use one fresh planning, coding, review, and verification agent per slice.
- Use `fork_context: false` for every subagent.
- Use standard speed.
- Use model tiers from the assigned slice file or `docs/v1/implementation-slices/README.md`.
- UI coding uses `gpt-5.5`.
- Recording, media, timing, waveform, cleanup, import/export, and migration work use high-risk tiers.
- Do not implement v2 scope: cloud sync, login, cross-device resume, backup conflict merge, automatic PDF recognition, automatic score following, automatic mistake detection, or user-facing scoring.

## Minimal Docs By Role

### Scheduler

Read only:

```text
docs/v1/START-HERE.md
docs/v1/status.json
docs/v1/implementation-slices/product-feature-map.md
docs/v1/implementation-slices/README.md
docs/v1/implementation-slices/01-practice-segment-mvp.md
```

Read other pack slice files only when scheduling that pack.

### Planning Agent

Read only:

```text
docs/v1/START-HERE.md
docs/v1/status.json
the assigned implementation slice file
the mapped product contract file
relevant v0 module contract if needed
```

Output:

- Refined scope.
- Out of scope.
- Likely files or areas.
- Acceptance criteria.
- Test and verification evidence.
- Model tier.
- Handoff notes.

Planning agent must not edit product code.

### Coding Agent

Read only:

```text
docs/v1/START-HERE.md
the refined slice plan
the assigned implementation slice file
the mapped product contract file
relevant v0 module contract
```

Implement only the planned slice.

### Review Agent

Read only:

```text
docs/v1/START-HERE.md
the refined slice plan
changed files
the assigned implementation slice file
the mapped product contract file
```

Report bugs, boundary violations, and missing tests. Do not implement.

### Verification Agent

Read only:

```text
docs/v1/START-HERE.md
the refined slice plan
the assigned implementation slice file
the mapped product contract file
changed files
```

Report PASS or FAIL with evidence. Do not fix code.

## Finding A Feature

If the user names a product feature or module doc, look it up in:

```text
docs/v1/implementation-slices/product-feature-map.md
```

Example:

```text
docs/v1/01-app-shell-home.md
  -> home.dashboard-analytics
  -> Pack 3
  -> P3-11, P3-12
```

## Detailed References

The files below are not obsolete. They are reference documents.

Do not read all of them by default.

Read them only when the assigned slice needs them:

- `docs/v1/development-plan.md`: read when changing scheduling process, pack order, or planning flow.
- `docs/v1/agent-implementation-rules.md`: read when the lifecycle, model tier, failure handling, or agent responsibility is unclear.
- `docs/v1/acceptance-packs.md`: read when preparing pack-level verification or user acceptance.
- `docs/v1/feature-inventory.md`: read when checking whether a requested feature exists in v1.
- `docs/v1/05f-practice-segments.md`: read for Pack 1 Practice Segment product contracts.
- `docs/v1/remaining-feature-contracts.md`: read for product contracts outside Pack 1.
- `docs/v1/ui-design.md`: read for every UI slice.
- `docs/v0/project-structure.md`: read before editing product code or choosing file locations.
- `docs/v0/tech-stack-decisions.md`: read before adding libraries, services, or test infrastructure.
- `docs/v0/design-style-guide.md`: read for every UI slice.

Module roadmap docs, such as `docs/v1/01-app-shell-home.md`, are also reference documents.

Read a module roadmap only when:

- The assigned slice maps to that module in `docs/v1/implementation-slices/product-feature-map.md`.
- The slice planning agent needs module-level product context.
- The user explicitly asks about that module.

Example:

```text
Assigned slice: P3-12 home-dashboard-analytics-ui
Map says product doc: docs/v1/01-app-shell-home.md
Then the planning/coding/review/verification agents may read docs/v1/01-app-shell-home.md as needed.
```

If a document is not listed by `START-HERE.md`, the product-feature map, the assigned slice file, or the refined slice plan, do not load it by default.
