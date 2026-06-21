# v0 Overview

## Purpose

v0 is a local-first guitar practice app. It should let a player quickly practice with a metronome, record and replay takes, import sheets, practice while viewing sheets, and use minimal reference playback.

This overview is the shared entry point for all v0 module work. Implementation agents and verification agents should read this file before reading the specific module document they are assigned.

## Product Priorities

v0 should prioritize:

- Fast practice entry.
- Reliable metronome behavior.
- Recording and replay.
- A unified recordings review flow.
- Basic sheet import and viewing.
- A usable sheet practice workspace.
- Local-first persistence.
- Minimal reference playback.

v0 should not become:

- A full DAW.
- An automatic mistake detector.
- A cloud-first app.
- A complex score analysis system.
- A Bilibili or YouTube downloader.

## Top-Level Navigation

```text
Home
Quick Metronome
Sheet Library
Sheet Practice
Recordings
Settings
```

`Quick Metronome` is the fastest entry point.

`Sheet Practice` is the core workspace.

`Recordings` is the unified review surface for quick and sheet recordings.

## Development Phases

```text
Phase 0: Foundation
Phase 1: Quick Metronome Loop
Phase 2: Recordings / Review
Phase 3: Sheet Library
Phase 4: Sheet Practice Workspace
Phase 5: Minimal Reference System
```

## Harness Model

Each module must be implemented with a lightweight implementer/verifier split:

```text
Module Contract
  -> Implementation Agent
  -> Verification Agent
  -> Pass or Needs Fix
```

The implementation agent builds the module.

The verification agent independently checks the module against the acceptance criteria, test plan, and QA checklist.

A module is not done until a separate verification agent pass independently verifies it and reports PASS.

The implementation agent may run self-tests, but self-tests do not replace verification.

Default model assignment:

```text
Coding / Implementation Agent: GPT-5.5 High
Verification Agent: GPT-5.4 mini
```

Each coding agent implements one feature contract only. Each verification agent verifies one feature contract only. Adjacent features require separate agent passes unless the user explicitly creates a combined integration verification task.

Every feature must produce separate git commits:

```text
Implementation agent commit: code + current feature implementation status only
Verification agent commit: verification result + current feature verification status only
```

Progress tracking changes must be scoped to the current feature entry in `docs/v0/module-status.json`.

## Implementation Entry Point

The first implementation feature is:

```text
docs/v0/00-preflight.md
```

Do not start product feature work until `00-preflight` is implemented and separately verified.

## Required Reading Per Module

Before implementation or verification, an agent must read:

```text
docs/v0/00-overview.md
docs/v0/agent-implementation-rules.md
docs/v0/design-style-guide.md
docs/v0/<assigned-module>.md
```

Agents should also consult:

```text
docs/v0-plan.md
docs/v1-roadmap.md
```

when scope or v1 boundaries are unclear.

## Boundary Principle

v0 module work should stay inside its assigned module unless the module document explicitly names a dependency.

Do not add v1 features while implementing v0.

Do not turn visible UI into fake functionality. If a control is visible and enabled, it must work according to the module acceptance criteria.
