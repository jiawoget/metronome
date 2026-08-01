# AGENTS

## Workflow routing

- Start every Metronome repository change or review with `skills/metronome-route/SKILL.md`.
- The router selects exactly one owner: `skills/metronome-small-pr/SKILL.md` for bounded maintenance, or Native OpenGSD for lifecycle-sized work.
- Do not layer Native OpenGSD, Superpowers, or another orchestration workflow on a lightweight task. Superpowers workflow skills are opt-in only when the owner explicitly requests one and it does not conflict with the selected owner.
- Native OpenGSD is the sole lifecycle authority for milestones, product or architecture changes, research, planning, execution, verification, and lifecycle state.
- Read `.planning/STATE.md` and `.planning/ROADMAP.md` only after the Native lane is selected or when those files are themselves under review.
- For authorized Native lifecycle work, use `$gsd-new-milestone` only when state is `Awaiting next milestone` with no active phase; otherwise use `$gsd-next` or the active Native phase.
- Before a new Native milestone begins, re-evaluate milestone-scoped capability toggles in `.planning/config.json` against its authorized scope; never inherit tooling-only disables silently.
- A read-only review of a Native-scoped diff reads Native project, roadmap, state, requirements, and the real diff, but never invokes a lifecycle command or mutates state.
- The surfaced Native skill set is intentionally limited to the official milestone-loop dependency closure. Do not re-enable disabled skills unless the owner asks for that capability.
- Keep all work in the primary checkout at `C:\Users\wsuto\metronome`; `workflow.use_worktrees=false`.
- Preserve unrelated changes. Stop for a material scope or architecture change, a global or irreversible action, missing external authority, or an in-scope blocker that cannot be safely resolved.

## Reuse contract

- When work adds, replaces, or materially expands behavior, infrastructure, or an abstraction, read and follow `skills/metronome-policy/SKILL.md`.
- Reuse existing owners and dependencies before adding a parallel capability.
- Do not imitate Native research, planning, checking, execution, verification, recovery, or state transitions with repository scripts or hand-created controllers.
- Native maps, Lumen indexes, and research caches are navigation aids only; confirm material facts against live files.

## Pull requests

- Do not create or modify `.planning/**` for a lightweight task, except an explicitly requested correction to living lifecycle status.
- Keep plans, command transcripts, changing commit SHAs, check IDs, and review status out of the repository.
- Default to one implementer, focused local checks, and no extra review agent. Use at most one narrow read-only agent when it materially reduces a specific risk.
- For a Native milestone, let Native OpenGSD finalize its artifacts and prepare the PR, but do not treat Native verification or `$gsd-ship` as proof of release.
- Freeze the candidate head before one final CI pass and one read-only `@codex` review. A changed head replaces both results with one fresh pass.
- PR creation is not merge authorization. Claim a PR or Native milestone complete only after an authorized merge, synchronized local `main`, and a clean worktree.

## Git and verification

- The tracked pre-commit hook is a fast gate: `git diff --cached --check` plus `npm run format:check` through the repository-local runtime fallback when needed.
- Use focused local tests and checks while editing. Let Ubuntu CI run the full format, lint, typecheck, unit, and build integration gate.
- Run the full local suite only when CI is unavailable, the change affects a local-only runtime contract, or focused checks leave material integration risk. Do not repeat unchanged evidence.
- Do not mutate global or user `PATH`, remove the repository-local runtime fallback, or bypass hooks with `--no-verify` unless the owner explicitly requests it.
