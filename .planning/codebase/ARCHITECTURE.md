<!-- refreshed: 2026-07-25 -->
# Architecture

**Analysis Date:** 2026-07-25

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Next.js App Router and client presentation                            │
│ `src/app/` → `src/components/` → `src/hooks/` / `src/stores/`        │
├──────────────────────┬──────────────────────┬────────────────────────┤
│ Home / shell          │ Practice experiences │ Review / settings      │
│ `src/components/home` │ `src/components/     │ `src/components/       │
│ `src/components/      │  sheet-practice`     │  recordings-review`    │
│  app-shell`           │                      │                         │
└──────────────┬───────┴────────────┬─────────┴──────────────┬─────────┘
               │                    │                        │
               ▼                    ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Application operations and feature controllers                        │
│ `src/services/` + established feature support in `src/lib/`           │
│ Factories receive repository/adapter interfaces; `browser.ts` exposes │
│ browser-ready composition roots.                                      │
└───────────────────────┬──────────────────────────────┬───────────────┘
                        │                              │
          ┌─────────────▼─────────────┐  ┌─────────────▼──────────────┐
          │ Pure models and policies  │  │ Browser infrastructure       │
          │ `src/domain/`             │  │ `src/infrastructure/`        │
          └───────────────────────────┘  └─────────────┬──────────────┘
                                                        │
                                                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Local browser resources                                                │
│ IndexedDB/Dexie, `localStorage`, MediaRecorder/Web Audio, PDF workers, │
│ Tone, WaveSurfer, and an optional direct Bilibili search request       │
└──────────────────────────────────────────────────────────────────────┘
```

The application is a local-first, browser-backed Next.js application. `src/app/` contains route entry points only; it contains no `api/` route handlers or server-side data layer. The route files render feature components, which own browser interaction through client components and service-facing browser entries.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App shell | Own global layout, responsive navigation, command palette, and active-recording navigation protection. | `src/app/layout.tsx`, `src/components/app-shell/app-shell.tsx` |
| App Router routes | Map URLs and permitted URL parameters to a feature experience; do not read local storage or Dexie directly. | `src/app/page.tsx`, `src/app/sheet-practice/page.tsx`, `src/app/sheet-practice/[sheetId]/page.tsx` |
| Feature experiences | Render and coordinate the Home, Quick Metronome, Sheet Library, Sheet Practice, Recordings, and Settings user workflows. | `src/components/home/home-dashboard.tsx`, `src/components/quick-metronome/quick-metronome-experience.tsx`, `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx` |
| Domain | Own pure practice, music, sheet, reference, and settings types, validation, selection rules, formatting, and policies. | `src/domain/practice/index.ts`, `src/domain/music/index.ts`, `src/domain/sheet/index.ts` |
| Service factories | Apply business-facing orchestration against injected repositories, gateways, and adapters. | `src/services/practice-session/service.ts`, `src/services/sheet-library/service.ts`, `src/services/sheet-viewer/service.ts` |
| Browser composition | Bind service interfaces to local browser repositories and platform adapters, then expose browser-facing service values. | `src/infrastructure/db/browser-practice-session-service.ts`, `src/infrastructure/files/sheet-library-service.ts`, `src/infrastructure/sheet-viewer/browser-sheet-viewer-service.ts` |
| Infrastructure | Isolate Dexie persistence, browser audio, PDF parsing/viewing, local file input, local reference media, and the Bilibili HTTP adapter. | `src/infrastructure/db/`, `src/infrastructure/audio/`, `src/infrastructure/files/`, `src/infrastructure/sheet-viewer/`, `src/infrastructure/reference/`, `src/infrastructure/bilibili/` |
| Ephemeral workflow state | Hold the active Sheet Practice recording and re-record workflow only; it is not persistence. | `src/stores/sheet-practice-recording-workflow-store.ts`, `src/stores/README.md` |

## Pattern Overview

**Overall:** App Router presentation over a local ports-and-adapters architecture, with feature-scoped client controllers.

**Key Characteristics:**

- Keep `src/app/` thin. Route files forward route parameters and render feature experiences; client behavior starts in the feature component layer.
- Put business rules, parsers, selectors, and value types in `src/domain/`. Domain modules expose public APIs through per-context `index.ts` files such as `src/domain/practice/index.ts`.
- Implement reusable operations as service factories with interface-shaped dependencies. `createPracticeSessionService`, `createSheetLibraryService`, and `createSheetViewerService` receive their concrete browser dependencies at composition roots.
- Expose browser-ready dependencies from `src/services/<capability>/browser.ts` or an equivalent browser-facing service module, so UI code imports `src/services/` rather than `src/infrastructure/`.
- Keep concrete Web APIs and third-party integration boundaries in `src/infrastructure/`. The architecture guard prevents `src/app/`, `src/components/`, and `src/hooks/` from importing infrastructure directly. | `tests/unit/architecture-boundaries.test.ts` |
- Treat `src/lib/quick-metronome/`, `src/lib/recordings-review/`, and `src/lib/sheet-practice/` as established feature-support areas. They contain UI-facing controllers, hooks, recording history support, and feature algorithms; do not use `src/lib/` as a new general persistence or business-service layer.

## Layers

**Route and layout layer:**

- Purpose: Define the App Router surface and wrap every route in the application shell.
- Location: `src/app/`
- Contains: `layout.tsx`, `page.tsx`, and route-local `page.tsx` files.
- Depends on: Feature components and Next.js route primitives.
- Used by: Next.js runtime.
- Rule: Parse only route/search parameters here. Keep browser storage, audio, and repository access out of this layer; the boundary guard verifies this for recording storage. | `src/app/recordings/page.tsx`, `tests/unit/architecture-boundaries.test.ts` |

**Presentation layer:**

- Purpose: Render feature experiences, own React lifecycle/state, translate user actions into service calls, and render result/error states.
- Location: `src/components/` and `src/hooks/`
- Contains: Feature folders, shared `src/components/ui/` primitives, and cross-feature React hooks.
- Depends on: Domain types/pure helpers, service interfaces and browser facades, feature-local support from `src/lib/` where established.
- Used by: `src/app/` routes and `src/components/app-shell/app-shell.tsx`.
- Rule: Import an interface or browser facade from `src/services/`, never a concrete database, file, or audio adapter from `src/infrastructure/`. | `src/components/sheet-library/sheet-library-experience.tsx`, `src/hooks/use-practice-session-dashboard.ts`, `tests/unit/architecture-boundaries.test.ts` |

**Ephemeral state layer:**

- Purpose: Coordinate client-only Sheet Practice recording/re-record state between components.
- Location: `src/stores/`
- Contains: One Zustand store and selector exports.
- Depends on: Domain types only.
- Used by: Sheet Practice controls and segment selection UI.
- Rule: Keep persisted data in services and repositories; Zustand state must remain ephemeral workflow state. | `src/stores/sheet-practice-recording-workflow-store.ts`, `src/stores/README.md` |

**Domain layer:**

- Purpose: Own pure models, validation, calculations, formatting, selection, and policy independent of browser storage and UI libraries.
- Location: `src/domain/music/`, `src/domain/practice/`, `src/domain/reference/`, `src/domain/settings/`, and `src/domain/sheet/`
- Contains: Types, validators, route/filter helpers, practice metrics, session comparison selection, segment policies, and music-time utilities.
- Depends on: Other domain modules and the installed music APIs only where encapsulated in the music domain.
- Used by: Services, infrastructure parsers, and presentation formatting.
- Rule: Add a new reusable product rule to its bounded context and re-export it through that context's `index.ts`; do not reproduce music primitives or time-signature parsing outside `src/domain/music/`. | `src/domain/music/time-signature.ts`, `src/domain/practice/validation.ts`, `tests/unit/architecture-boundaries.test.ts` |

**Service layer:**

- Purpose: Orchestrate business operations through abstract repository, gateway, and adapter contracts.
- Location: `src/services/`
- Contains: Capability directories with `types.ts`, `service.ts` where needed, public `index.ts`, and browser-facing composition exports.
- Depends on: Domain rules plus service-local contracts; concrete browser wiring is supplied at the infrastructure composition root.
- Used by: Presentation via `browser.ts`/browser-service modules and by infrastructure composition modules.
- Rule: Prefer an injectable `create…Service` factory for a new operation that needs persistence or platform APIs. | `src/services/practice-session/service.ts`, `src/services/practice-session/types.ts`, `src/services/sheet-library/service.ts` |

**Feature-support layer:**

- Purpose: Host established client controllers and feature algorithms that are shared within Quick Metronome, Recordings Review, and Sheet Practice.
- Location: `src/lib/quick-metronome/`, `src/lib/recordings-review/`, `src/lib/sheet-practice/`
- Contains: Metronome transport hooks, recording artifact/history operations, waveform adapters, and sheet-recording orchestration.
- Depends on: Domain and service contracts; some existing modules also bind concrete infrastructure.
- Used by: Their corresponding feature components and façade services.
- Rule: Extend an existing feature-support owner only when the work remains tightly coupled to that owner; otherwise add domain policy, a service, or infrastructure adapter in its proper layer. | `src/lib/quick-metronome/recording-controller.ts`, `src/lib/recordings-review/repository.ts`, `src/lib/sheet-practice/recording-service.ts` |

**Infrastructure layer:**

- Purpose: Implement browser/local adapters and construct concrete services.
- Location: `src/infrastructure/`
- Contains: Dexie repositories, MediaRecorder and AudioContext adapters, Tone integration, local file/PDF adapters, reference adapters, and storage identifiers.
- Depends on: Browser APIs, installed libraries, domain parsers/types, and service contracts.
- Used by: Service browser facades and composition roots, not by route, component, or hook code.
- Rule: Keep direct `MediaRecorder`, `getUserMedia`, Tone, `AudioContext`, Dexie, and PDF.js adapter work here. | `src/infrastructure/audio/browser-recording-capture.ts`, `src/infrastructure/audio/tone-metronome-adapter.ts`, `src/infrastructure/db/practice-session-repository.ts` |

## Data Flow

### Primary Request Path: Home dashboard read and refresh

1. The `/` route renders `HomeDashboard`. | `src/app/page.tsx:3` |
2. `HomeDashboard` gets live dashboard state from `usePracticeSessionDashboard`. | `src/components/home/home-dashboard.tsx:201`, `src/hooks/use-practice-session-dashboard.ts:208` |
3. The hook reads recent sessions, summaries, targets, analytics, streaks, and comparisons through `browserPracticeSessionService`, then subscribes for local changes. | `src/hooks/use-practice-session-dashboard.ts:248`, `src/hooks/use-practice-session-dashboard.ts:479` |
4. The browser service wires the service factory to a unified practice-session repository, recording metadata repository, Sheet Library gateway, and Practice Segment gateway. | `src/infrastructure/db/browser-practice-session-service.ts:57` |
5. The repository reads/writes validated session rows in a local Dexie/IndexedDB database and emits a browser change event. | `src/infrastructure/db/practice-session-repository.ts:57` |

### Sheet import and viewer path

1. The Sheet Library experience uses the service facade injected by default from `src/services/sheet-library/browser.ts`. | `src/components/sheet-library/sheet-library-experience.tsx:162`, `src/services/sheet-library/browser.ts:1` |
2. `browserSheetLibraryService` binds `createSheetLibraryService` to the file-import adapter and Dexie repository. | `src/infrastructure/files/sheet-library-service.ts:7` |
3. The service validates metadata, asks the adapter to inspect selected files, and persists sheet metadata plus file artifacts through the repository. | `src/services/sheet-library/service.ts:62`, `src/infrastructure/files/sheet-library-repository.ts:49` |
4. Sheet Practice loads the selected artifact through `useBrowserSheetViewer`, which calls the browser-composed viewer service and creates/revokes local object URLs and PDF thumbnails. | `src/services/sheet-viewer/browser-hooks.ts:37`, `src/infrastructure/sheet-viewer/browser-sheet-viewer-service.ts:7`, `src/services/sheet-viewer/service.ts:66` |

### Recording and practice-session write path

1. Quick Metronome and Sheet Practice construct only recording/service facades, then start and stop capture from their feature experience. | `src/components/quick-metronome/quick-metronome-experience.tsx:56`, `src/components/sheet-practice/controls/sheet-practice-controls.tsx:192` |
2. `createBrowserRecordingCaptureService` owns `getUserMedia`, `MediaRecorder`, capture chunking, and audio analysis; the concrete browser API stays in infrastructure. | `src/services/recording/browser.ts:4`, `src/infrastructure/audio/browser-recording-capture.ts:22` |
3. Sheet recordings pass through `BrowserSheetRecordingService.stopAndSave`, while quick recordings use the Quick Metronome controller. Both coordinate practice-session state and recording history/artifact persistence. | `src/lib/sheet-practice/recording-service.ts:152`, `src/lib/quick-metronome/recording-controller.ts:66` |
4. Recording metadata/history is kept in local storage and binary artifacts are kept in the recording-artifact Dexie database. | `src/lib/recordings-review/repository.ts:70`, `src/infrastructure/db/recording-artifact-repository.ts:89` |

### Reference search path

1. The Reference panel imports the reference browser facade, not the external adapter. | `src/components/sheet-practice/reference/reference-panel.tsx:21`, `src/services/reference/browser.ts:19` |
2. The composition root creates the reference service with local reference storage/audio inspection and either a deterministic test adapter or `FetchBilibiliSearchAdapter`. | `src/infrastructure/reference/browser-reference-service.ts:23` |
3. The fetch adapter makes a direct browser request to Bilibili's public search endpoint and maps the returned values to domain reference results. | `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts:120` |

**State Management:**

- Feature UI state is predominantly component-local React state and hooks in `src/components/` and `src/hooks/`.
- Shared transient Sheet Practice workflow state is in the Zustand store in `src/stores/sheet-practice-recording-workflow-store.ts:199`.
- Durable user data is browser-local: Dexie repositories under `src/infrastructure/db/` and `src/infrastructure/files/`, plus the recording-history `localStorage` snapshot in `src/lib/recordings-review/repository.ts:70`.
- Browser-backed services expose subscription functions so dashboard and feature UI can refresh after local writes. | `src/infrastructure/db/practice-session-repository.ts:103`, `src/lib/recordings-review/repository.ts:558` |

## Key Abstractions

**Service factory and port contracts:**

- Purpose: Separate business orchestration from concrete local browser dependencies.
- Examples: `src/services/practice-session/service.ts`, `src/services/practice-session/types.ts`, `src/services/sheet-library/service.ts`, `src/services/sheet-viewer/types.ts`.
- Pattern: `create…Service` receives structural repository/gateway/adapter interfaces; a browser composition module passes infrastructure implementations.

**Browser service facade:**

- Purpose: Give UI code a stable browser-ready capability without importing infrastructure directly.
- Examples: `src/services/practice-session/browser.ts`, `src/services/sheet-library/browser.ts`, `src/services/measure-grid/browser.ts`, `src/services/settings/browser.ts`.
- Pattern: Re-export a concrete browser composition value or a small browser factory from `src/services/<capability>/browser.ts`.

**Domain bounded context:**

- Purpose: Make product rules and data formats reusable without a browser dependency.
- Examples: `src/domain/practice/`, `src/domain/music/`, `src/domain/sheet/`, `src/domain/reference/`, `src/domain/settings/`.
- Pattern: Keep source modules focused and export their public API from the context `index.ts`.

**Local persistence repository:**

- Purpose: Encapsulate storage schema, parsing, validation, notifications, and test reset helpers.
- Examples: `src/infrastructure/db/practice-session-repository.ts`, `src/infrastructure/files/sheet-library-repository.ts`, `src/infrastructure/db/recording-artifact-repository.ts`.
- Pattern: Lazily initialize a module-scoped Dexie database, validate/parse records at the boundary, and expose a service contract implementation.

**Recording artifact split:**

- Purpose: Keep recording metadata/history separate from potentially large binary media.
- Examples: `src/lib/recordings-review/repository.ts`, `src/infrastructure/db/recording-artifact-repository.ts`, `src/services/recordings-review/index.ts`.
- Pattern: Store review metadata in the recording-history snapshot, keep `Blob` bodies in Dexie, and compose deletion/export/review behind `RecordingsReviewService`.

## Entry Points

**Application root:**

- Location: `src/app/layout.tsx`
- Triggers: Next.js App Router for every page.
- Responsibilities: Declare metadata/global CSS and render all page children inside `AppShell`.

**Home:**

- Location: `src/app/page.tsx`
- Triggers: `/`.
- Responsibilities: Render the dashboard feature.

**Quick Metronome:**

- Location: `src/app/quick-metronome/page.tsx`
- Triggers: `/quick-metronome`.
- Responsibilities: Render metronome, capture, and session controls.

**Sheet Library:**

- Location: `src/app/sheet-library/page.tsx`
- Triggers: `/sheet-library`.
- Responsibilities: Render import/library operations.

**Sheet Practice:**

- Location: `src/app/sheet-practice/page.tsx`, `src/app/sheet-practice/[sheetId]/page.tsx`
- Triggers: `/sheet-practice` with query data or `/sheet-practice/<sheetId>`.
- Responsibilities: Normalize route/query parameters and render the sheet viewer/practice experience.

**Recordings and Settings:**

- Location: `src/app/recordings/page.tsx`, `src/app/settings/page.tsx`
- Triggers: `/recordings` and `/settings`.
- Responsibilities: Pass the optional recording filter or render local data/settings UI.

## Architectural Constraints

- **Runtime:** `src/app/` routes are App Router entry files; practical user interaction and all local browser persistence begin in client-marked components/hooks. Do not introduce a second backend or persistence path for the current local-first model. | `src/app/layout.tsx`, `src/components/home/home-dashboard.tsx`, `src/hooks/use-practice-session-dashboard.ts` |
- **UI/infrastructure boundary:** UI, app, and hook files must not import `src/infrastructure/` directly. Expose an approved browser facade from `src/services/` and retain the guard in `tests/unit/architecture-boundaries.test.ts`.
- **Audio boundary:** Direct `MediaRecorder`/`getUserMedia` use belongs only in `src/infrastructure/audio/browser-recording-capture.ts`; direct Tone import belongs only in `src/infrastructure/audio/tone-metronome-adapter.ts`; AudioContext decoding belongs only in `src/infrastructure/audio/browser-audio-decode-adapter.ts`. | `tests/unit/architecture-boundaries.test.ts` |
- **Music policy:** Keep time-signature parsing and music primitive policy in `src/domain/music/`; the architecture test rejects local primitive tables and direct time-signature string parsing elsewhere. | `src/domain/music/time-signature.ts`, `tests/unit/architecture-boundaries.test.ts` |
- **Storage:** Keep database names and local-storage keys in `src/infrastructure/storage/storage-contracts.ts`. Implement read/write methods through a repository or service rather than from UI code.
- **Global state:** Module-scoped browser services/repositories and lazy Dexie database singletons are intentional: `src/infrastructure/db/browser-practice-session-service.ts`, `src/infrastructure/db/practice-session-repository.ts`, `src/lib/recordings-review/repository.ts`. Scope them to client-safe modules and keep reset helpers for unit tests.
- **Circular imports:** No circular-import detector is configured in the repository. No cycle was identified in the inspected composition paths; keep dependency direction presentation → services/domain → infrastructure adapters and avoid importing a feature component from any lower layer.
- **PDF worker:** Resolve `pdfjs-dist/build/pdf.worker.min.mjs` locally with `import.meta.url`; do not change it to a CDN URL. | `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx`, `src/infrastructure/files/sheet-import-adapter.ts`, `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts` |
- **Reuse governance:** Work that adds/replaces/materially expands behavior, infrastructure, or abstractions follows the local reuse-evidence contract in `skills/metronome-policy/SKILL.md`; the codebase map is navigation evidence, not lifecycle authority.

## Anti-Patterns

### UI-to-infrastructure bypass

**What happens:** No production violation is present: `src/app/`, `src/components/`, and `src/hooks/` do not directly import `src/infrastructure/` under the tested guard.
**Why it's wrong:** A direct import would couple rendering and React lifecycle code to Dexie, file, audio, or browser adapter details, making the component harder to test and bypassing the reusable service contract.
**Do this instead:** Add/extend a service contract and browser facade in `src/services/<capability>/`, compose its implementation in `src/infrastructure/`, and import only the service facade from UI code. | `src/services/practice-session/browser.ts`, `src/infrastructure/db/browser-practice-session-service.ts`, `tests/unit/architecture-boundaries.test.ts` |

### Duplicated browser/media implementation

**What happens:** No production violation is present: the architecture test restricts capture, Tone, AudioContext decoding, waveform UI, and peak derivation to their named owners.
**Why it's wrong:** Reimplementing these browser/media operations elsewhere creates different recording behavior, cleanup timing, audio analysis, and runtime scheduling semantics.
**Do this instead:** Use `src/services/recording/browser.ts` for capture, `src/services/audio-analysis/` for audio analysis, `src/services/metronome/browser.ts` for runtime scheduling, and `src/services/recordings-review/index.ts` for review operations. | `tests/unit/architecture-boundaries.test.ts`, `src/infrastructure/audio/browser-recording-capture.ts`, `src/services/audio-analysis/index.ts` |

## Error Handling

**Strategy:** Validate data at domain and persistence boundaries, return explicit success/error unions for user-facing asynchronous workflows where applicable, and let feature components map failures to local UI state/messages.

**Patterns:**

- Domain and repository boundaries parse or validate stored values before use. | `src/domain/practice/validation.ts`, `src/infrastructure/db/practice-session-repository.ts` |
- Service operations that support recoverable user failures return `{ ok: true | false, ... }` result objects. | `src/services/sheet-library/service.ts`, `src/services/reference/service.ts`, `src/services/sheet-viewer/service.ts` |
- Browser and feature operations catch rejected promises, retain safe prior UI state where appropriate, and present feature-specific messages. | `src/hooks/use-practice-session-dashboard.ts`, `src/components/quick-metronome/quick-metronome-experience.tsx`, `src/components/sheet-practice/controls/sheet-practice-controls.tsx` |
- Capability-unavailable errors are explicit classes or error states rather than silent no-ops. | `src/services/recording/index.ts`, `src/services/audio-analysis/types.ts`, `src/services/sheet-viewer/types.ts` |

## Cross-Cutting Concerns

**Logging:** No `console.*` logging calls or logging abstraction are present under `src/`.

**Validation:** Validate product input and persisted records in the relevant domain context, then revalidate/parse at the storage boundary. | `src/domain/practice/validation.ts`, `src/domain/sheet/validation.ts`, `src/infrastructure/db/practice-session-repository.ts` |

**Authentication:** Not detected. The current application has no authentication provider, API route, or server-side identity layer under `src/app/`.

**Local data ownership:** Local persistence identifiers are centralized in `src/infrastructure/storage/storage-contracts.ts`; Settings composes local-data summary, cleanup, and permission services through `src/services/settings/browser.ts`.

**External network access:** The Bilibili search adapter is the source-level direct HTTP integration; all other primary product storage and audio/media workflows are local browser operations. | `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts`, `src/infrastructure/reference/browser-reference-service.ts` |

---

*Architecture analysis: 2026-07-25*
