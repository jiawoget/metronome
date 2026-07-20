# v1 Overview

## Purpose

v1 evolves the app from a local-first practice tool into a more complete local practice system.

This folder exists so future-facing work does not get mixed into v0 module contracts. When a feature is useful but not part of v0, it should be documented here instead of being implemented early.

## v1 Direction

v1 may deepen the app in these areas:

- More complete Practice Segment workflows.
- More structured review and comparison.
- More advanced metronome training modes.
- Richer sheet library management.
- Reference alignment and comparison.
- Audio analysis experiments.
- WASM-backed performance paths.

Account, cloud sync, cross-device resume, backup/restore, and sync conflict handling are deferred to `docs/v2`.

## Relationship to v0

v1 should build on v0 boundaries instead of replacing them.

Important v0 decisions to preserve:

- Local-first practice loop.
- Unified recordings review system.
- `Quick Metronome` as the fastest entry point.
- `Sheet Practice` as the core workspace.
- UI calls services, not third-party libraries directly.
- Audio and storage details remain behind adapters or service boundaries.

## Promotion Rule

A v1 feature must not be implemented in v0 unless the user explicitly promotes it.

If a v0 implementer finds a tempting future feature, it should be added to the relevant v1 module document rather than implemented immediately.

## Suggested v1 Module Map

```text
01-app-shell-home.md
02-quick-metronome.md
03-recordings-review.md
04-sheet-library.md
05-sheet-practice.md
06-reference-system.md
07-settings-local-data.md
08-practice-session.md
09-audio-analysis.md
```

Deferred cloud/sync work lives in:

```text
../v2/00-overview.md
../v2/roadmap.md
```

The first eight files mirror v0 modules. `09-audio-analysis.md` covers broader v1 infrastructure that should stay behind service boundaries.
