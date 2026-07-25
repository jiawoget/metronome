# Codebase Structure

**Analysis Date:** 2026-07-25

## Directory Layout

```text
[project-root]/
├── src/
│   ├── app/                 # Next.js App Router routes and root layout
│   ├── components/          # Client feature experiences and shared UI primitives
│   ├── domain/              # Pure bounded-context types, policies, and validation
│   ├── hooks/               # Reusable React hooks
│   ├── infrastructure/      # Browser, persistence, media, file, and external adapters
│   ├── lib/                 # Established feature-specific controllers and helpers
│   ├── services/            # Business-facing contracts, factories, and browser facades
│   ├── stores/              # Zustand state for ephemeral workflow coordination
│   └── test/helpers/        # Test-helper boundary documentation
├── tests/
│   ├── unit/                # Vitest unit/component/boundary tests
│   └── e2e/                 # Playwright browser workflows and fixtures
├── test-fixtures/           # Static audio, Bilibili, and sheet test assets
├── public/                  # Browser-served static assets
├── scripts/                 # Windows/Next runtime and test command wrappers
├── skills/                  # Project workflow/reuse contract
├── docs/                    # Product and legacy planning/reference documentation
├── .planning/               # Native OpenGSD lifecycle and codebase-map artifacts
├── .github/workflows/       # GitHub Actions definitions
├── package.json             # Package scripts, runtime requirements, dependencies
├── tsconfig.json            # TypeScript compiler and `@/*` path alias configuration
├── next.config.mjs          # Next.js runtime configuration
├── vitest.config.ts         # Unit-test configuration
└── playwright.config.ts     # E2E-test configuration
```

## Directory Purposes

**`src/app/`:**

- Purpose: Define App Router URLs, their root layout, and global styles.
- Contains: `layout.tsx`, top-level and nested `page.tsx` route files, and `globals.css`.
- Key files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/sheet-practice/[sheetId]/page.tsx`.
- Add only thin route parameter/search-parameter handling here; place the rendered client experience in `src/components/<feature>/`.

**`src/components/`:**

- Purpose: Hold presentation and user-interaction code.
- Contains: Feature folders (`app-shell`, `home`, `quick-metronome`, `recordings-review`, `settings`, `sheet-library`, `sheet-practice`), `preflight`, and shared `ui` primitives.
- Key files: `src/components/app-shell/app-shell.tsx`, `src/components/home/home-dashboard.tsx`, `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`.
- Keep browser access behind service facades. Do not import `src/infrastructure/` from this directory; `tests/unit/architecture-boundaries.test.ts` enforces the rule.

**`src/components/sheet-practice/`:**

- Purpose: Split the composite practice workspace by responsibility.
- Contains: `controls/`, `markers/`, `measure-grid/`, `recording/`, `reference/`, `segments/`, and `viewer/`.
- Key files: `src/components/sheet-practice/controls/sheet-practice-controls.tsx`, `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`, `src/components/sheet-practice/reference/reference-panel.tsx`.
- Put a Sheet Practice visual module into the closest responsibility subfolder; expose browser-dependent operations through the corresponding service facade.

**`src/domain/`:**

- Purpose: Own pure product models, rules, validation, and formatting.
- Contains: Bounded contexts `music/`, `practice/`, `reference/`, `settings/`, and `sheet/`.
- Key files: `src/domain/practice/index.ts`, `src/domain/practice/types.ts`, `src/domain/music/time-signature.ts`, `src/domain/sheet/validation.ts`.
- Add a durable product rule to its context and export it through that context's `index.ts`; keep direct browser and persistence APIs out.

**`src/services/`:**

- Purpose: Provide business-facing contracts and orchestration.
- Contains: Capability directories such as `practice-session/`, `sheet-library/`, `sheet-viewer/`, `recording/`, `reference/`, `settings/`, `audio-analysis/`, and `metronome/`.
- Key files: `src/services/practice-session/service.ts`, `src/services/practice-session/types.ts`, `src/services/practice-session/browser.ts`, `src/services/sheet-library/service.ts`.
- Use `types.ts` for ports/contracts, `service.ts` for an injectable factory, `index.ts` as the public API, and `browser.ts`/browser-service module for a UI-safe browser facade when that capability has one.

**`src/infrastructure/`:**

- Purpose: Contain concrete local browser adapters and composition roots.
- Contains: `audio/`, `bilibili/`, `db/`, `files/`, `reference/`, `sheet-viewer/`, and `storage/`.
- Key files: `src/infrastructure/db/browser-practice-session-service.ts`, `src/infrastructure/files/sheet-library-service.ts`, `src/infrastructure/audio/browser-recording-capture.ts`, `src/infrastructure/storage/storage-contracts.ts`.
- Add a Dexie/Web API/third-party implementation here, compose it with a service contract, then re-export the approved browser facade from `src/services/`.

**`src/lib/`:**

- Purpose: Hold established feature-specific support outside the generic service/domain folders.
- Contains: `quick-metronome/`, `recordings-review/`, `sheet-practice/`, navigation helpers, and `utils.ts`.
- Key files: `src/lib/quick-metronome/recording-controller.ts`, `src/lib/recordings-review/repository.ts`, `src/lib/sheet-practice/recording-service.ts`, `src/lib/navigation.ts`.
- Use the existing feature owner only for tightly coupled extension work. Put new general business workflows in `src/services/`, new policies in `src/domain/`, and new platform adapters in `src/infrastructure/`.

**`src/hooks/`:**

- Purpose: Hold reusable React lifecycle/query coordination that spans presentation modules.
- Contains: Dashboard and command-palette continuation hooks.
- Key files: `src/hooks/use-practice-session-dashboard.ts`, `src/hooks/use-command-palette-continue-targets.ts`.
- Add a hook here only when it is reusable outside one feature component; otherwise keep it co-located in the feature folder.

**`src/stores/`:**

- Purpose: Coordinate shared, ephemeral client workflow state.
- Contains: The Zustand Sheet Practice recording workflow store and its boundary README.
- Key files: `src/stores/sheet-practice-recording-workflow-store.ts`, `src/stores/README.md`.
- Do not store persisted domain data here; persistence belongs to services/repositories.

**`tests/unit/`:**

- Purpose: Test domain rules, services, repositories, React components, and architecture guardrails with Vitest.
- Contains: `*.test.ts` and `*.test.tsx` files plus focused factories under `tests/unit/factories/`.
- Key files: `tests/unit/architecture-boundaries.test.ts`, `tests/unit/practice-session-service.test.ts`, `tests/unit/home-dashboard.test.tsx`.
- Add a unit test beside the matching capability name in this directory; use `tests/unit/factories/` for repeated domain fixtures.

**`tests/e2e/`:**

- Purpose: Validate user workflows through Playwright.
- Contains: Feature `*.spec.ts` files and runtime fixtures in `tests/e2e/fixtures/`.
- Key files: `tests/e2e/app-shell-home.spec.ts`, `tests/e2e/sheet-practice-integration.spec.ts`, `tests/e2e/fixtures/storage.ts`.
- Add a browser workflow test here only when the behavior crosses UI, browser APIs, or multiple local persistence boundaries.

**`test-fixtures/`:**

- Purpose: Provide fixed test assets for audio, sheet imports, and Bilibili search data.
- Contains: `audio/`, `bilibili/`, and `sheets/` assets with README files.
- Key files: `test-fixtures/audio/README.md`, `test-fixtures/sheets/README.md`, `test-fixtures/bilibili/README.md`.

**`scripts/`:**

- Purpose: Provide local Node/npm wrappers and stable Next.js/Playwright launchers.
- Contains: PowerShell and Node scripts.
- Key files: `scripts/npm-local.ps1`, `scripts/run-next-dev-stable-env.mjs`, `scripts/run-next-e2e-server.mjs`.

**`skills/`:**

- Purpose: Store repository workflow constraints.
- Contains: The reuse-first evidence contract.
- Key file: `skills/metronome-policy/SKILL.md`.

**`docs/`:**

- Purpose: Store project and legacy product/planning references outside runtime source.
- Contains: `docs/legacy/` plus documentation indexes.
- Key file: `docs/README.md`.

**`.planning/`:**

- Purpose: Store native OpenGSD lifecycle state, roadmap/project contracts, forensics, and codebase maps.
- Contains: `STATE.md`, `ROADMAP.md`, `PROJECT.md`, `REQUIREMENTS.md`, and `codebase/`.
- Key files: `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/codebase/ARCHITECTURE.md`.

## Key File Locations

**Entry Points:**

- `src/app/layout.tsx`: Root metadata, CSS import, and app-shell wrapper.
- `src/app/page.tsx`: Home route.
- `src/app/quick-metronome/page.tsx`: Quick Metronome route.
- `src/app/sheet-library/page.tsx`: Sheet Library route.
- `src/app/sheet-practice/page.tsx`: Query-parameter Sheet Practice route.
- `src/app/sheet-practice/[sheetId]/page.tsx`: Path-parameter Sheet Practice route.
- `src/app/recordings/page.tsx`: Recordings route with optional sheet filter.
- `src/app/settings/page.tsx`: Settings route.

**Configuration:**

- `package.json`: Runtime requirements, package scripts, dependency graph, and test/build commands.
- `tsconfig.json`: Strict TypeScript settings and `@/*` → `src/*` alias.
- `next.config.mjs`: Strict Mode, dev-origin, and Turbopack root configuration.
- `eslint.config.mjs`: ESLint configuration.
- `prettier.config.mjs`: Formatting configuration.
- `tailwind.config.ts`: Design-token/theme configuration.
- `vitest.config.ts`: Vitest setup and browser-like unit-test configuration.
- `playwright.config.ts`: Playwright configuration.
- `.npmrc`: Present as package-manager configuration; its contents were not inspected.

**Core Logic:**

- `src/domain/practice/`: Practice sessions, goals, recent activity, comparison, segments, formatting, and validation.
- `src/services/practice-session/service.ts`: Session orchestration and dashboard data source assembly.
- `src/infrastructure/db/browser-practice-session-service.ts`: Browser composition of session dependencies.
- `src/services/sheet-library/service.ts`: Sheet import/library operations.
- `src/services/sheet-viewer/service.ts`: Artifact loading, validation, object URL, and thumbnail workflow.
- `src/services/recordings-review/index.ts`: Public recording-review aggregation façade.
- `src/infrastructure/storage/storage-contracts.ts`: Local storage database/key identifiers.

**Testing:**

- `tests/unit/architecture-boundaries.test.ts`: Layering, browser API ownership, and local worker guardrails.
- `tests/unit/setup.ts`: Unit test setup.
- `tests/unit/factories/`: Reusable practice, recordings-review, and metronome-preset test data.
- `tests/e2e/fixtures/`: Storage, sheet, recording, and audio browser test helpers.
- `test-fixtures/`: Binary/static assets used by tests.

## Naming Conventions

**Files:**

- Use lowercase kebab-case for TypeScript and TSX source files: `sheet-practice-controls.tsx`, `browser-practice-session-service.ts`, `session-comparison-panel.tsx`.
- Use Next.js reserved route names inside `src/app/`: `page.tsx`, `layout.tsx`, and dynamic `[parameter]` directories: `src/app/sheet-practice/[sheetId]/page.tsx`.
- Use a role suffix where it communicates a boundary: `*-service.ts`, `*-repository.ts`, `*-adapter.ts`, `*-controller.ts`, `*-panel.tsx`, `*-experience.tsx`, and `use-*.ts`.
- Use `index.ts` as a bounded-context public export surface: `src/domain/practice/index.ts`, `src/services/practice-session/index.ts`.
- Name tests after the unit/feature they exercise with `.test.ts` or `.test.tsx`: `tests/unit/practice-session-service.test.ts`, `tests/unit/home-dashboard.test.tsx`; use `.spec.ts` for Playwright workflows: `tests/e2e/sheet-practice-integration.spec.ts`.

**Directories:**

- Use lowercase kebab-case for feature and capability directories: `src/components/recordings-review/`, `src/services/practice-session/`, `src/infrastructure/sheet-viewer/`.
- Group source by product capability in `src/domain/`, `src/services/`, and `src/components/`; group `src/infrastructure/` by adapter technology/capability such as `db`, `audio`, or `files`.
- Nest composite feature UI by clear responsibility: `src/components/sheet-practice/controls/`, `src/components/sheet-practice/viewer/`, `src/components/sheet-practice/segments/`.

## Where to Add New Code

**New Feature:**

- Route entry: `src/app/<route>/page.tsx`.
- Primary user experience: `src/components/<feature>/<feature>-experience.tsx`.
- Pure product rules/types: `src/domain/<bounded-context>/` and that context's `index.ts`.
- Business orchestration: `src/services/<capability>/types.ts` and `src/services/<capability>/service.ts`.
- Browser persistence/platform implementation: `src/infrastructure/<technology-or-capability>/`, composed behind `src/services/<capability>/browser.ts` or a similarly named browser facade.
- Tests: `tests/unit/<capability>.test.ts[x]`; add `tests/e2e/<workflow>.spec.ts` only for full browser workflow coverage.

**New Component/Module:**

- Shared primitive: `src/components/ui/<primitive>.tsx`.
- Feature-specific view: `src/components/<feature>/<descriptive-name>.tsx`.
- Sheet Practice subfeature: one of `src/components/sheet-practice/controls/`, `viewer/`, `recording/`, `segments/`, `reference/`, `markers/`, or `measure-grid/`.
- Cross-feature React lifecycle helper: `src/hooks/use-<capability>.ts`.
- New shared workflow state: `src/stores/<feature>-<workflow>-store.ts` only when it is ephemeral; document the persistence boundary in `src/stores/README.md` if it changes.

**Utilities:**

- General UI/class-name helper: extend `src/lib/utils.ts` only if it is framework-neutral and truly shared.
- Existing Quick Metronome support: `src/lib/quick-metronome/`.
- Existing recording-review support: `src/lib/recordings-review/`.
- Existing Sheet Practice recording support: `src/lib/sheet-practice/`.
- New product policy belongs in `src/domain/`; new application operation belongs in `src/services/`; new Web API/third-party code belongs in `src/infrastructure/`, not in a new catch-all `src/lib/` module.

## Special Directories

**`.planning/`:**

- Purpose: Native project lifecycle, planning, and generated codebase-map documents.
- Generated: Partially; `codebase/` map documents are generated analysis artifacts while lifecycle documents are project artifacts.
- Committed: Yes; it contains the active repository lifecycle source of truth.

**`.next/`:**

- Purpose: Next.js development/build output.
- Generated: Yes.
- Committed: No; no `.next` path is tracked by Git.

**`node_modules/`:**

- Purpose: Installed package dependencies.
- Generated: Yes, from `package-lock.json` and `package.json`.
- Committed: No; no `node_modules` path is tracked by Git.

**`public/`:**

- Purpose: Static files served directly by Next.js.
- Generated: No.
- Committed: Yes; for example, `public/icon.svg`.

**`test-fixtures/`:**

- Purpose: Committed binary/static test inputs.
- Generated: No.
- Committed: Yes.

**`docs/legacy/`:**

- Purpose: Historical planning/reference material kept outside runtime source.
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2026-07-25*
