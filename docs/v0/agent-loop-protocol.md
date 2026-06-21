# Agent Loop Protocol

## Purpose

This document defines how autonomous implementation and verification loops should run for v0.

Every agent invocation starts from an empty context. Agents must reconstruct state only from repository files, especially:

```text
docs/v0/module-status.json
docs/v0/00-overview.md
docs/v0/agent-implementation-rules.md
docs/v0/design-style-guide.md
docs/v0/project-structure.md
docs/v0/tech-stack-decisions.md
docs/v0/<assigned-module>.md
```

Do not rely on previous chat context.

## Loop Overview

The loop is:

```text
Read status
  -> Pick exactly one feature
  -> Run implementation pass or verification pass
  -> Update only that feature status block
  -> Commit
  -> Stop
```

Each agent pass does exactly one job:

- Implement one feature.
- Verify one implemented feature.
- Fix one failed feature.

No pass may implement and verify the same feature.

## Status Selection Rules

Agents must read:

```text
docs/v0/module-status.json
```

Then choose the first eligible feature in file order.

### Implementation Agent Selection

Implementation agent may select a feature with status:

```text
contract_ready
needs_fix
```

It must not select:

```text
implementation_done
verification_in_progress
verified
```

Before editing code, it must set only that feature to:

```text
implementation_in_progress
```

After implementation and self-tests, it sets only that feature to:

```text
implementation_done
```

Then it commits.

### Verification Agent Selection

Verification agent may select a feature with status:

```text
implementation_done
```

Before testing, it must set only that feature to:

```text
verification_in_progress
```

After testing:

- PASS -> `verified`
- FAIL -> `needs_fix`

Then it commits.

## Dependency Rules

Agents must respect feature dependencies from module contracts.

If the first eligible feature has unmet dependencies:

- Do not implement adjacent dependency work.
- Mark the blocker in the assigned feature's handoff notes or verification issues.
- Stop and ask for planning clarification if the dependency prevents progress.

Preflight must be verified before product feature implementation begins.

```text
00-preflight must be verified first.
```

After preflight, the default implementation order is the order in `module-status.json`.

## Empty Context Rules

Because every agent starts from empty context, each pass must:

1. Read `docs/v0/module-status.json`.
2. Read all required global docs.
3. Read the assigned module contract.
4. Reconstruct current repo state from files.
5. Run relevant commands/tests itself.
6. Record evidence in the assigned feature status block.

An agent must not say:

```text
As discussed earlier...
```

unless that fact is present in a repository document.

## Implementation Pass Required Steps

```text
1. Read module-status.json.
2. Select exactly one eligible feature.
3. Read required global docs.
4. Read assigned feature contract.
5. Set assigned feature status to implementation_in_progress.
6. Implement only assigned feature.
7. Run required self-tests.
8. Update only assigned feature implementation block.
9. Set assigned feature status to implementation_done.
10. Commit implementation.
11. Stop.
```

Implementation status update must include:

- Coding model used.
- Changed areas.
- Self-tests run.
- Handoff notes.
- Known risks.
- Implementation commit hash after commit.

If commit is blocked by environment permissions, the agent must report the exact blocker and must not pretend the commit happened.

## Verification Pass Required Steps

```text
1. Read module-status.json.
2. Select exactly one feature with implementation_done.
3. Read required global docs.
4. Read assigned feature contract.
5. Set assigned feature status to verification_in_progress.
6. Run required verification.
7. Update only assigned feature verification block.
8. Set assigned feature status to verified or needs_fix.
9. Commit verification result.
10. Stop.
```

Verification status update must include:

- Verification model used.
- Acceptance criteria results.
- E2E evidence.
- Specialized evidence.
- Persistence evidence.
- Console status.
- Issues.
- Verification commit hash after commit.

If verification cannot run, status should be `needs_fix` unless the blocker is outside the implementation and requires planning/user intervention.

## Commit Rules

Each implementation pass creates one implementation commit.

Each verification pass creates one verification commit.

Do not combine multiple feature changes in one commit.

Do not combine implementation and verification in one commit.

Commit message format:

```text
feat(<feature-id>): implement <feature name>
test(<feature-id>): verify <feature name>
test(<feature-id>): mark <feature name> needs fix
fix(<feature-id>): address verification issues
```

## Stop Conditions

An agent must stop after:

- One implementation commit.
- One verification commit.
- A hard blocker that prevents safe progress.

An agent must not continue into the next feature in the same pass.

## Planning Intervention

Planning intervention is required when:

- A contract conflict is discovered.
- A dependency is missing.
- An approved open-source library is incompatible.
- A feature needs to be split further.
- Git commit is blocked.
- The required model assignment cannot be used.

Planning changes may update multiple docs/status entries, but implementation and verification agents may not.
