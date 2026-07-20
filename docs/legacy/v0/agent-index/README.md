# v0 Agent Index

This directory is an implementation index for future agents. It does not replace
the module specs in `docs/v0/*.md`; use the spec as the contract and this index
as the map to code, tests, and known boundaries.

## How To Use

1. Read `docs/v0/module-status.json` for current status and verification hashes.
2. Read the assigned module spec in `docs/v0/<module>.md`.
3. Read the matching file in this directory to find code and test entry points.
4. Treat "Spec audit notes" as the current known implementation/gap summary.

## Files

- `00-preflight.md`
- `01-app-shell-home.md`
- `02-quick-metronome.md`
- `03-recordings-review.md`
- `04-sheet-library.md`
- `05-sheet-practice.md`
- `05a-sheet-viewer.md`
- `05b-practice-controls.md`
- `05c-sheet-recording-review.md`
- `05d-error-markers.md`
- `05e-session-integration.md`
- `06-reference-system.md`
- `07-settings-local-data.md`
- `08-practice-session.md`

## Cross-Cutting Rules

- UI should call service/hook boundaries, not Dexie, MediaRecorder, Tone.js, or
  artifact internals directly.
- Persistence boundaries are mostly in `src/infrastructure/*`.
- Domain validation and normalization should live in `src/domain/*` or shared
  lib helpers, not copied into components.
- E2E specs under `tests/e2e` are the strongest proof for user-facing behavior.
- Unit specs under `tests/unit` are the strongest proof for domain rules and
  adapter edge cases.

