# v0 Project Structure and File Ownership

## Purpose

This document defines the expected project structure and file ownership boundaries for v0 implementation.

Every implementation and verification agent must read this file before working on a feature. A coding agent may only edit files inside its assigned feature ownership area, plus explicitly allowed shared files.

## Target Structure

The project should use a TypeScript-first Next.js app structure.

```text
src/
  app/
    layout.tsx
    page.tsx
    quick-metronome/
      page.tsx
    sheet-library/
      page.tsx
    sheet-practice/
      [sheetId]/
        page.tsx
    recordings/
      page.tsx
    settings/
      page.tsx

  components/
    app-shell/
    home/
    metronome/
    recordings/
    sheet-library/
    sheet-practice/
      viewer/
      controls/
      recording/
      markers/
      reference/
    settings/
    ui/

  domain/
    audio/
    practice/
    recording/
    sheet/
    reference/
    settings/

  services/
    metronome/
    recording/
    playback/
    waveform/
    practice-session/
    sheet-library/
    reference/
    settings/

  infrastructure/
    audio/
    db/
    files/
    sheet-viewer/
    reference/
    bilibili/

  stores/
  hooks/
  lib/
  test/
    fixtures/
    helpers/
```

Test structure:

```text
tests/
  unit/
  integration/
  e2e/
```

Static or generated test fixtures:

```text
test-fixtures/
  audio/
  sheets/
  bilibili/
```

## Shared Architecture Rules

UI components may call:

- Hooks.
- Stores.
- Services.
- Domain types.

UI components must not directly call:

- Tone.js.
- MediaRecorder.
- wavesurfer.js.
- IndexedDB / Dexie.
- PDF parser internals.
- Image decoding internals.
- Bilibili network/API internals.
- Future WASM modules.

Third-party APIs belong in:

```text
src/infrastructure/
```

Business-facing service boundaries belong in:

```text
src/services/
```

Pure types and business rules belong in:

```text
src/domain/
```

## Feature Ownership Map

### 00-preflight

May create or edit:

- `package.json`
- lockfile
- framework config files
- TypeScript config
- Tailwind/PostCSS config
- lint/format config
- test config
- Playwright config
- basic `src/app` shell placeholders
- `tests/` smoke tests
- setup docs

Must not implement product behavior for later modules.

### 01-app-shell-home

Owns:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/app-shell/`
- `src/components/home/`
- navigation config in `src/lib/` or `src/domain/navigation/`
- app shell tests

May add route shells for top-level pages.

Must not implement feature behavior inside those route shells.

### 02-quick-metronome

Owns:

- `src/app/quick-metronome/`
- `src/components/metronome/`
- `src/services/metronome/`
- `src/services/recording/` only for shared recording service primitives needed by this module
- `src/domain/audio/`
- `src/domain/recording/`
- related tests and fixtures

Must not implement Sheet Practice-specific recording UI.

### 03-recordings-review

Owns:

- `src/app/recordings/`
- `src/components/recordings/`
- `src/services/playback/`
- `src/services/waveform/` only for review waveform needs
- `src/domain/recording/`
- recording review tests

Must not create new recording capture behavior.

### 04-sheet-library

Owns:

- `src/app/sheet-library/`
- `src/components/sheet-library/`
- `src/services/sheet-library/`
- `src/domain/sheet/`
- `src/infrastructure/files/`
- sheet import tests and fixtures

Must not implement Sheet Practice viewer behavior beyond route navigation.

### 05a-sheet-viewer

Owns:

- `src/components/sheet-practice/viewer/`
- `src/infrastructure/sheet-viewer/`
- `src/services/sheet-library/` only for read APIs needed by viewer
- sheet viewer tests

Must not implement metronome, recording, marker, or reference behavior.

### 05e-session-integration

Owns:

- `src/services/practice-session/`
- `src/domain/practice/`
- session hooks in `src/hooks/`
- session integration tests

May touch route-level Sheet Practice wiring only as needed to connect session context.

Must not implement metronome audio, recording capture, or reference playback.

### 05b-practice-controls

Owns:

- `src/components/sheet-practice/controls/`
- `src/services/metronome/` only for shared metronome integration
- control hooks in `src/hooks/`
- practice controls tests

Must not implement recording capture or error markers.

### 05c-sheet-recording-review

Owns:

- `src/components/sheet-practice/recording/`
- `src/services/recording/`
- `src/services/playback/`
- `src/services/waveform/`
- sheet recording tests and audio fixtures

Must not implement error marker creation or full Recordings list behavior.

### 05d-error-markers

Owns:

- `src/components/sheet-practice/markers/`
- `src/domain/practice/ErrorMarker` or equivalent marker domain files
- marker service files
- marker tests

Must not implement automatic analysis, bar-aware markers, or sheet overlays.

### 05-sheet-practice

Owns:

- `src/app/sheet-practice/[sheetId]/page.tsx`
- `src/components/sheet-practice/` integration composition files
- integration tests

May compose already verified submodules.

Must not implement unverified submodule behavior inside the integration layer.

### 06-reference-system

Owns:

- `src/components/sheet-practice/reference/`
- `src/services/reference/`
- `src/infrastructure/reference/`
- `src/infrastructure/bilibili/`
- `src/domain/reference/`
- reference tests and fixtures

Must not implement download, audio extraction, analysis, or advanced sync.

### 07-settings-local-data

Owns:

- `src/app/settings/`
- `src/components/settings/`
- `src/services/settings/`
- `src/infrastructure/db/` cleanup and summary APIs
- settings tests

Must not implement account, cloud sync, themes, notifications, or advanced device selection.

### 08-practice-session

Owns:

- `src/domain/practice/`
- `src/services/practice-session/`
- session stores/hooks
- Today Summary and Continue Practice service tests

Must not implement feature UI except through explicit integration points.

## Shared Files Policy

Some files are shared and may be touched by multiple features, but only with a clear reason:

- `src/domain/*`
- `src/services/*`
- `src/hooks/*`
- `src/stores/*`
- `src/lib/*`
- test helpers

When editing shared files, the implementation handoff must explain:

- Why the shared change was required.
- Which feature owns the change.
- Which existing contracts may be affected.
- Which regression tests were run.

## Forbidden Cross-Feature Changes

A coding agent must not:

- Implement another feature while working on its assigned feature.
- Add UI for an unimplemented feature as if it works.
- Move files owned by another module without explicit planning approval.
- Refactor broad shared architecture unless the assigned contract requires it.
- Change another module's tests merely to make its own feature pass.

## Verification Requirements

Verification agents must check:

- Files changed match the assigned feature ownership map.
- Shared file edits are justified.
- No adjacent feature was implemented accidentally.
- No v1 behavior was added.
- Tests cover the assigned feature's owned surfaces.

Verification must report FAIL if the coding agent implemented broad adjacent behavior outside the assigned feature boundary.
