---
name: metronome-route
description: Route every Metronome repository change or review to either the lightweight small-PR workflow or Native OpenGSD. Use before planning, editing, or dispatching agents.
---

# Metronome Workflow Router

Choose one workflow owner before doing repository work. Prefer the smallest lane that safely covers the requested outcome.

## Start with a bounded check

1. Restate the requested outcome in one sentence.
2. Inspect `git status` and only the files needed to classify the request.
3. Preserve unrelated work.
4. Do not read `.planning/STATE.md` or `.planning/ROADMAP.md` unless the Native lane is selected or lifecycle state is itself under review.
5. Do not create a plan file merely to classify the task.

## Choose the lightweight lane

Use `skills/metronome-small-pr/SKILL.md` when all of these are true:

- The intent and acceptance result are clear.
- The change is localized maintenance, a contained bug fix, test relocation, documentation, formatting, configuration, or a read-only review of a diff that itself meets every lightweight criterion.
- It does not introduce or materially expand product behavior, a public contract, architecture, storage or schema, dependencies or runtime policy, security boundaries, or a migration.
- It is expected to touch no more than 5 behavior-bearing implementation files and add or rewrite no more than 300 behavior-bearing lines.
- Failure is reversible and can be covered by focused checks plus existing CI.

Generated files, cache removal, fixtures, documentation, skill metadata, and explicitly requested lifecycle-status corrections do not count as behavior-bearing files. They still must stay directly related to the request.

Documentation-only work stays lightweight unless it intentionally changes a normative public contract or authorizes later implementation behavior.

The lightweight lane owns the task end to end. Do not add Native OpenGSD, Superpowers workflow skills, a durable plan, multiple reviewers, or duplicate verification layers.

## Choose the Native lane

Use Native OpenGSD when any of these are true:

- The work creates or materially expands product behavior or a cross-cutting abstraction.
- It changes a public API, storage or schema, dependency or runtime policy, security boundary, architecture, or migration.
- Requirements are ambiguous enough that implementation would encode a material product decision.
- The expected behavior-bearing scope exceeds either lightweight threshold.
- The user explicitly requests Native OpenGSD lifecycle work.
- A read-only review covers a diff with any Native trigger above.

For authorized lifecycle work, read `.planning/STATE.md` and `.planning/ROADMAP.md`, then use only the surfaced Native entrypoint that matches the state, normally `$gsd-next` or `$gsd-new-milestone`. Let Native OpenGSD own its research, planning, execution, verification, and lifecycle mutations. Apply `skills/metronome-policy/SKILL.md` when its reuse trigger is met.

For a read-only review of a Native-scoped diff, do not invoke a lifecycle entrypoint. Read `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, and the active requirements or milestone archive; inspect the real diff against them and report findings without mutating files or state.

## Guard the boundary

- Never run both lanes for one task.
- Never upgrade a lightweight task just because a larger workflow is available.
- If implementation reveals a Native trigger, stop before expanding scope, show the evidence, and ask the owner whether to reclassify.
- If a Native task becomes tiny, finish the active Native phase through its own rules; do not splice in a second workflow.
- A read-only diagnosis or review does not authorize edits, lifecycle mutation, or a pull request.

## Examples

- Fix one hook branch and its focused test: lightweight.
- Move three existing tests without changing behavior: lightweight.
- Add a practice-session persistence contract: Native OpenGSD.
- Change an encryption or recording-ID security boundary: Native OpenGSD.
