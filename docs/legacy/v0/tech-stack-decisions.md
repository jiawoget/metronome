# v0 Tech Stack Decisions

## Purpose

This document fixes the v0 technical stack and module-level implementation choices. Coding agents must not substitute frameworks or libraries without explicit approval.

## Global Stack

Use:

- Next.js for app routing and page structure.
- React for UI.
- TypeScript strict mode for all app code.
- Tailwind CSS for styling.
- shadcn/ui-compatible component patterns.
- Zustand for client state where shared state is needed.
- Zod for runtime validation at data boundaries.
- Dexie / IndexedDB for local persistence.
- Playwright for browser E2E tests.
- A unit/integration test runner selected during preflight, preferably Vitest if compatible.

Do not use:

- A different frontend framework.
- A different routing framework.
- A global state framework other than Zustand without approval.
- Backend-first architecture for v0.
- Required Supabase or cloud services in v0.

## Open Source First Rule

v0 must use mature open-source implementations for established technical problems whenever a suitable library exists.

Coding agents must not hand-roll:

- App routing.
- Component primitives.
- Form validation.
- Local database access.
- Metronome scheduling primitives beyond adapter/business glue.
- Audio recording capture.
- Waveform rendering/interaction when a library satisfies the contract.
- PDF rendering.
- Browser E2E harness.
- Bilibili URL parsing/search adapter plumbing beyond project-specific adapter boundaries.

Hand-written code is allowed for:

- Domain models.
- Service orchestration.
- Adapter interfaces.
- Glue code between libraries.
- Project-specific validation.
- Feature-specific UI composition.
- Test fixtures and verification helpers.

If an implementation agent believes a custom implementation is better than the approved open-source library, it must stop and request a contract update before coding.

## Styling and Components

Use:

- Tailwind utility classes.
- shadcn/ui-compatible primitives for common controls.
- Radix UI primitives through shadcn/ui patterns where suitable.
- lucide-react icons.
- Small reusable React components only for project-specific composition.
- lucide-react icons when available.

Do not use:

- A separate heavy UI framework.
- CSS-in-JS as the primary styling system.
- Decorative SVG illustrations for core app surfaces.
- App-wide dark theme for v0.
- Custom-built select, dialog, popover, slider, tab, tooltip, or menu primitives when shadcn/Radix primitives are suitable.

## Local Data

Use:

- IndexedDB through Dexie.
- Repository/service boundaries.
- Zod validation for persisted records.

Persist:

- Settings.
- Sheets and file artifacts.
- Recordings and audio artifacts.
- References.
- Error markers.
- Practice sessions/history.

Do not:

- Store v0 data only in React state.
- Store required data only in localStorage if IndexedDB is available.
- Require cloud sync.
- Let UI call Dexie directly.
- Hand-roll IndexedDB wrappers when Dexie can provide the behavior.

## Audio and Recording

Use:

- Web Audio API behind adapter boundaries.
- Tone.js for metronome implementation if compatible.
- MediaRecorder API behind a recording adapter.
- Audio element or Web Audio playback behind playback services.

Do not:

- Let UI call Tone.js directly.
- Let UI call MediaRecorder directly.
- Couple metronome and recording lifecycles.
- Use native desktop/mobile audio APIs.
- Add WASM audio processing in v0.
- Hand-roll low-level recording capture instead of MediaRecorder.

## Waveform

Use:

- wavesurfer.js behind an adapter as the default waveform renderer.
- wavesurfer Regions plugin only when a module explicitly needs regions; v0 core waveform display should not add A-B loop behavior.
- A custom lightweight canvas/SVG renderer only if wavesurfer cannot meet the module's deterministic stability tests, and only after a contract update.
- Data-backed peaks from the recording artifact or trusted test fixture.

Do not:

- Render fake waveform previews.
- Treat screenshots alone as waveform verification.
- Let UI call wavesurfer internals directly.
- Hand-roll waveform rendering before proving wavesurfer cannot satisfy the contract.

## PDF and Image Sheets

Use:

- react-pdf backed by PDF.js as the default PDF renderer.
- PDF.js directly only behind the sheet-viewer adapter if react-pdf cannot satisfy verification.
- Browser image decoding for PNG/JPG behind viewer services.

Do not:

- Fake sheet previews.
- Use PDF/image internals directly in high-level UI components.
- Implement Guitar Pro or MusicXML in v0.
- Hand-roll PDF rendering.

## Bilibili Reference

Use:

- A Bilibili search adapter boundary.
- Deterministic fixture adapter for tests.
- iframe embed or safe external link for selected videos.
- Existing URL parsing helpers or well-tested URL APIs for parsing.

Do not:

- Download Bilibili video.
- Extract Bilibili audio.
- Depend on live network search for deterministic verification.
- Put Bilibili API/network details directly in UI components.
- Hand-roll brittle URL parsing with ad hoc string slicing.

## Testing Stack

Use:

- Unit tests for deterministic logic.
- Integration tests for service/repository/adapter boundaries.
- Playwright for real browser E2E.
- Controlled fixtures for audio, sheets, and Bilibili search.
- Browser resize checks for UI modules.
- Playwright's browser automation for user-like E2E.
- Existing audio decode APIs/libraries available in the runtime for fixture verification.

Audio tests must use:

- Synthetic input for recording.
- Timing evidence for metronome.
- Decode/playback checks for audio artifacts.

Visual/media tests must use:

- Real PDF fixtures.
- Real image fixtures.
- Real audio fixtures.
- Data-level checks where screenshots are insufficient.

## Module Technology Map

### 00-preflight

Use:

- Next.js.
- TypeScript strict.
- Tailwind.
- shadcn/ui-compatible setup.
- lucide-react.
- Zustand.
- Zod.
- Dexie.
- Tone.js.
- wavesurfer.js.
- react-pdf / PDF.js.
- Playwright.
- Unit test runner.
- Project scripts.

Do not implement product behavior.

### 01-app-shell-home

Use:

- Next.js routes.
- React layout components.
- Tailwind.
- shadcn/ui-compatible navigation, button, card, tooltip, and dialog patterns where useful.
- lucide-react icons.
- Zustand only if global app shell state is needed.

### 02-quick-metronome

Use:

- Tone.js behind a metronome adapter as the default metronome implementation.
- MediaRecorder adapter for recording.
- Practice Session service.
- Recording repository/service.
- Synthetic audio fixtures for tests.

Do not hand-roll a metronome scheduler unless Tone.js cannot meet timing verification and the contract is updated.

### 03-recordings-review

Use:

- Recording repository/service.
- Playback service.
- wavesurfer.js behind waveform service/adapter for waveform display.
- Real decodable audio fixtures.

### 04-sheet-library

Use:

- File import service.
- Dexie persistence.
- PDF/image validation helpers.
- Zod schemas for metadata validation.
- Real PDF/image fixtures.

### 05a-sheet-viewer

Use:

- react-pdf backed by PDF.js through viewer service.
- Image viewer service.
- Render verification fixtures.

### 05e-session-integration

Use:

- Practice Session service.
- Domain model and repository.
- Hooks for active session context.

### 05b-practice-controls

Use:

- Shared metronome service from Quick Metronome.
- Sheet defaults from sheet service.
- Session activity trigger.

### 05c-sheet-recording-review

Use:

- Recording adapter.
- Playback service.
- wavesurfer.js behind waveform service/adapter by default.
- Synthetic recording fixtures.
- Waveform data and render stability checks.

### 05d-error-markers

Use:

- Error marker service/repository.
- Playback seek service.
- Timestamp validation helpers.
- Zod schemas for marker validation.

### 05-sheet-practice

Use:

- Composition of verified submodules.
- Route-level active sheet loading.
- No direct low-level adapters.

### 06-reference-system

Use:

- Local audio playback service.
- Reference repository/service.
- Bilibili search adapter.
- Deterministic Bilibili fixture adapter for E2E.
- iframe embed for Bilibili where supported.
- Safe external link fallback.

### 07-settings-local-data

Use:

- Settings service/repository.
- Storage summary service.
- Cleanup service.
- Permission status service.
- Browser StorageManager estimate where available.
- Browser Permissions API where available.

### 08-practice-session

Use:

- Practice Session domain model.
- Session repository/service.
- Today Summary service.
- Continue Practice target service.
- Zod schemas for session validation.

## Approved Library Defaults

These defaults are fixed for v0 unless preflight proves incompatibility:

```text
App framework: Next.js
UI runtime: React
Language: TypeScript strict
Styling: Tailwind CSS
Component primitives: shadcn/ui-compatible Radix primitives
Icons: lucide-react
State: Zustand
Validation: Zod
Local DB: Dexie on IndexedDB
Metronome: Tone.js behind adapter
Recording: MediaRecorder behind adapter
Waveform: wavesurfer.js behind adapter
PDF: react-pdf / PDF.js
E2E: Playwright
```

Preflight must install and verify these defaults, or document a specific incompatibility and request an explicit decision before substituting.

## Change Control

If a coding agent wants to change a technical decision, it must stop and request a contract update.

Allowed reasons:

- Library incompatibility discovered during preflight.
- Browser API limitation.
- Security or platform restriction.
- Testability issue that prevents meeting the contract.

The agent must document:

- Current decision.
- Proposed replacement.
- Why it is needed.
- Risks.
- Test impact.
