# Coding Conventions

**Analysis Date:** 2026-07-25

## Naming Patterns

**Files:**
- Use lowercase kebab-case for feature modules and directories: `src/services/practice-session/service.ts`, `src/components/sheet-practice/controls/sheet-practice-controls.tsx`, and `tests/unit/practice-session-service.test.ts`.
- Give framework-required files their conventional names: Next routes use `page.tsx` under `src/app/`, while test files use `*.test.ts`, `*.test.tsx`, and `*.spec.ts` under `tests/`.
- Name a browser-specific implementation with the `browser-` prefix and keep its contract in its feature package, for example `src/infrastructure/db/browser-measure-grid-service.ts` and `src/services/measure-grid/types.ts`.

**Functions:**
- Use camelCase with an action or query verb. Factories start with `create` (`createMeasureGridService` in `src/services/measure-grid/service.ts`), parsers with `parse` (`parseMusicTimeSignature` in `src/domain/music/time-signature.ts`), normalizers with `normalize` (`normalizeBilibiliApiResults` in `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts`), and display conversions with `format` (`formatPracticeDuration` in `src/domain/practice/format.ts`).
- Name React components in PascalCase and hooks with `use`, such as `SettingsExperience` in `src/components/settings/settings-experience.tsx` and `usePracticeSessionDashboard` in `src/hooks/use-practice-session-dashboard.ts`.
- Use `build...` or `make...` for test-data factories, as in `buildMeasureGrid` in `tests/unit/factories/practice.ts` and `makeSheetReviewRecording` in `tests/unit/factories/recordings-review.ts`.

**Variables:**
- Use descriptive camelCase names. Prefix boolean values with `is`, `has`, or `should` (`isCommandPaletteOpen`, `hasActiveRecording`, and `shouldManageWebServer` in `src/components/app-shell/app-shell.tsx` and `playwright.config.ts`).
- Use singular names for normalized or validated intermediate values, for example `normalizedSheetId` and `validatedGrid` in `src/services/measure-grid/service.ts`.
- Use UPPER_SNAKE_CASE only for exported constants and stable test constants: `DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT` in `src/domain/practice/continue-practice.ts` and `TEST_ISO_DATE` in `tests/unit/factories/practice.ts`.

**Types:**
- Declare domain, service, and component contracts as PascalCase `type` aliases; examples include `MeasureGridRepository` in `src/services/measure-grid/types.ts` and `SheetPracticeRecordingWorkflowState` in `src/stores/sheet-practice-recording-workflow-store.ts`.
- Model finite state with literal unions rather than stringly typed values, as in `SheetPracticeRecordingWorkflowStatus` in `src/stores/sheet-practice-recording-workflow-store.ts`.
- Keep unsafe external data as `unknown` and narrow it at the boundary, as in `parsePersistedMeasureGridRecord` in `src/infrastructure/db/browser-measure-grid-service.ts` and `parseMusicTimeSignature` in `src/domain/music/time-signature.ts`.

## Code Style

**Formatting:**
- Format TypeScript and TSX with Prettier settings in `prettier.config.mjs`: semicolons, double quotes, and no trailing commas.
- Let `prettier-plugin-tailwindcss` in `prettier.config.mjs` maintain Tailwind class order; preserve the class-string order that formatter produces in files such as `src/components/app-shell/app-shell.tsx`.
- Use two-space indentation, blank lines between logical statements, and multi-line objects, signatures, and JSX props when they no longer fit naturally on one line. `src/services/measure-grid/service.ts` and `src/components/ui/button.tsx` show the baseline style.

**Linting:**
- Run `npm run lint`, which executes the ESLint 9 flat configuration in `eslint.config.mjs` with Next Core Web Vitals and TypeScript rules.
- Do not add source files under ignored generated or output locations: `.next/**`, `.tools/**`, `node_modules/**`, `coverage/**`, `playwright-report/**`, and `test-results/**` are excluded by `eslint.config.mjs`.
- Keep TypeScript strict. `tsconfig.json` enables `strict`, `noEmit`, `isolatedModules`, and bundler resolution; prefer precise types, `unknown`, and type guards over widening to `any`.

## Import Organization

**Order:**
1. Put a client directive first when required: `"use client";` begins browser-interactive modules such as `src/components/app-shell/app-shell.tsx` and `src/infrastructure/db/browser-measure-grid-service.ts`.
2. Import framework and third-party modules next, including their type-only specifiers, as in `src/components/ui/button.tsx` and `tests/unit/settings-experience.test.tsx`.
3. After a blank line, import application modules through the `@/` alias. Keep value imports and `import type` declarations explicit, as in `src/services/measure-grid/service.ts`.

**Path Aliases:**
- Use `@/*` for all `src/*` imports, as configured in `tsconfig.json` and `vitest.config.ts`; for example, `@/domain/practice` and `@/services/measure-grid` in `src/services/measure-grid/service.ts`.
- Use relative imports only for an adjacent test fixture or local implementation detail, such as `./factories/practice` in `tests/unit/measure-grid-repository.test.ts` and `./fixtures/storage` in `tests/e2e/app-shell-home.spec.ts`.

## Error Handling

**Patterns:**
- Parse untrusted or optional data into `null` or an empty collection rather than throwing. `parseMusicTimeSignature` in `src/domain/music/time-signature.ts` and `normalizeBilibiliApiResults` in `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts` establish this boundary pattern.
- Throw a clear `Error` when a caller violates a required domain or service contract. `getMusicTimeSignatureParts` in `src/domain/music/time-signature.ts` and `normalizeMeasureGridSheetId` used by `src/services/measure-grid/service.ts` follow this rule.
- Return a typed success/failure result for recoverable remote or browser-facing operations. `FetchBilibiliSearchAdapter.search` in `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts` returns `ReferenceResult` with `ok`, `value`, or a user-facing `message`.
- In interactive components and hooks, catch expected service failures, retain useful prior state where appropriate, and render a stable error message rather than leaking an unknown exception. See `src/components/settings/settings-experience.tsx` and `src/hooks/use-practice-session-dashboard.ts`.

## Logging

**Framework:** No application logging framework or `console` logging is present in `src/`.

**Patterns:**
- Return structured failures, throw at invalid command boundaries, or expose UI status/error state instead of adding ad-hoc console output. Use the existing approaches in `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts`, `src/services/measure-grid/service.ts`, and `src/components/settings/settings-experience.tsx`.

## Comments

**When to Comment:**
- Comment only to record an architectural exception, ownership boundary, compatibility rule, or non-obvious ordering constraint. Examples include the timer exception in `src/services/sheet-viewer/manual-page-turn-timer.ts`, the persistence policy in `src/infrastructure/db/browser-practice-segment-service.ts`, and the rollback order in `src/lib/quick-metronome/recording-controller.ts`.
- Do not restate straightforward code. Prefer a well-named helper such as `normalizeBilibiliApiResults` in `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts` or `createUnavailableRerecordState` in `src/stores/sheet-practice-recording-workflow-store.ts`.

**JSDoc/TSDoc:**
- No JSDoc/TSDoc convention is detected in production or test TypeScript. Use explicit exported names and type contracts; add a short rationale comment only when the behavior cannot be conveyed by those contracts.

## Function Design

**Size:**
- Keep pure domain transformations and small service operations focused, with private helpers below the public export. `src/domain/practice/format.ts` and `src/services/measure-grid/service.ts` are the baseline.
- For a complex state machine or UI workflow, retain feature-local helper functions and typed state creators in the same module instead of hiding behavior in a generic utility. `src/stores/sheet-practice-recording-workflow-store.ts` demonstrates this approach.

**Parameters:**
- Accept a single typed options object when an operation has several related inputs, as in `FetchBilibiliSearchAdapter` in `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts` and numerous domain functions under `src/domain/practice/`.
- Accept an injected typed dependency for services, allowing production adapters and test doubles to share one contract. `createMeasureGridService(repository)` in `src/services/measure-grid/service.ts` is the reference pattern.

**Return Values:**
- Return domain values or `Promise<value | null>` for valid absence, as defined by `MeasureGridService` in `src/services/measure-grid/types.ts`.
- Use a discriminated outcome for an expected operational failure, and reserve exceptions for invalid requests or failures that callers must handle explicitly. See `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts` and `src/domain/music/time-signature.ts`.

## Module Design

**Exports:**
- Prefer named exports for components, hooks, functions, values, and contracts. Default exports are reserved for Next route modules such as `src/app/page.tsx` and configuration files such as `vitest.config.ts`.
- Keep browser singleton composition separate from the pure service factory. `src/services/measure-grid/service.ts` exposes `createMeasureGridService`, while `src/infrastructure/db/browser-measure-grid-service.ts` creates `browserMeasureGridService`.

**Barrel Files:**
- Use feature-level `index.ts` files as intentional public boundaries. `src/domain/practice/index.ts` exports practice contracts, and `src/services/measure-grid/index.ts` exports the browser-facing service.
- Import from a feature barrel when the consumer needs its public contract; import a specific file only for a deliberately internal helper, as in `src/lib/quick-metronome/recording-controller.ts` importing `snapshot-rollback`.

---

*Convention analysis: 2026-07-25*
