---
name: metronome-small-pr
description: Deliver a bounded Metronome maintenance change or review with focused checks and one final PR gate. Use only after the lightweight lane is selected by metronome-route.
---

# Metronome Small PR

Finish a small task without creating lifecycle artifacts or stacking workflow systems.

## Preconditions

- Confirm `skills/metronome-route/SKILL.md` selected the lightweight lane.
- Inspect `git status`, the current branch, and the smallest relevant diff or files.
- Preserve unrelated changes and use the primary checkout.
- State the scope and acceptance result briefly in commentary. Do not write a plan file.
- Do not invoke Native OpenGSD or Superpowers workflow skills for this lane.

Read-only requests stop after reporting findings. They do not authorize edits, commits, publishing, or lifecycle mutation.

## Implement the smallest change

1. Follow the closest existing owner and convention.
2. Change only what is needed for the stated acceptance result.
3. For a behavior bug, reproduce it with a focused failing test before fixing it when practical.
4. For a pure move, rename, documentation, formatting, or configuration correction, do not manufacture a failing test. Prove equivalence or validity directly.
5. Do not add a new abstraction, dependency, helper layer, or policy unless the router reclassifies the task.

Do not spawn discovery or review agents by default. When one genuinely independent question would materially reduce risk, use at most one agent and give it a narrow read-only assignment.

## Enforce the scope budget

Inspect the real diff after the first coherent edit. Stop before expanding if any Native trigger appears or the change exceeds 5 behavior-bearing implementation files or 300 added or rewritten behavior-bearing lines. Show the evidence and ask whether to reclassify; do not start Native OpenGSD automatically.

Generated files, cache deletion, fixtures, documentation, skill metadata, and explicitly requested lifecycle-status corrections are excluded from the behavior-bearing count but must remain in scope.

## Verify once per revision

Run the cheapest checks that can falsify the change:

- `git diff --check` and a complete self-review of the scoped diff.
- Formatting validation for touched text files.
- Focused tests for changed behavior or test moves.
- Targeted lint, typecheck, or build checks when the affected boundary requires them.

Use the full local suite only when CI is unavailable, the change affects a local-only runtime contract, or focused checks leave material integration risk. A configured full CI workflow avoids local repetition, but only a successful run on the exact frozen head satisfies the remote integration gate. Reuse valid results while the revision and inputs are unchanged; do not rerun the same expensive gate for ceremony.

For a failing check, diagnose first and make one bounded repair loop only when an in-scope repair exists. Reclassify or report a blocker when fixing it requires new behavior, architecture, or broader scope.

## Publish a reviewable PR

When publishing is authorized:

1. Stage only scoped files and make a concise commit.
2. Push the branch and open a draft PR with outcome, focused verification, and real residual risk. Do not attach a planning transcript.
3. Batch intermediate feedback into one repair pass where possible. Do not request repeated reviews on transient heads.
4. Freeze the candidate head, then require one successful CI pass and one read-only `@codex` review with no unresolved actionable findings on that exact head. Informational comments and optional nits do not trigger a repair loop.
5. If the head changes, replace the stale evidence with one fresh CI and review pass.

Keep commit SHAs, check IDs, logs, and changing review status in GitHub rather than repository documents. Merge only with owner authorization. After merge, synchronize local `main` and confirm it matches `origin/main` with an empty worktree before claiming completion.
