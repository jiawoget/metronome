# Testing Patterns

**Analysis Date:** 2026-07-25

## Test Framework

**Runner:**
- Vitest 4.1.9 runs unit and component tests. Configuration: `vitest.config.ts`.
- `vitest.config.ts` uses the `jsdom` environment, globals, the React Vite plugin, and includes only `tests/unit/**/*.test.{ts,tsx}`.
- Playwright 1.61.0 runs end-to-end browser tests. Configuration: `playwright.config.ts`.

**Assertion Library:**
- Use Vitest's `expect` in `tests/unit/` with Testing Library matchers loaded by `tests/unit/setup.ts` through `@testing-library/jest-dom/vitest`.
- Use Playwright's `expect` and locator assertions in `tests/e2e/`, as in `tests/e2e/app-shell-home.spec.ts`.

**Run Commands:**
```bash
npm run test:unit        # Run all Vitest unit and component tests
npm run test:unit:watch  # Start Vitest watch mode
npm run test:e2e         # Run Playwright Chromium E2E tests
```

- `package.json` does not define a coverage command or threshold. Coverage is not enforced; the `coverage/**` exclusion in `eslint.config.mjs` only prevents linting generated coverage output.
- Pull-request CI in `.github/workflows/ci.yml` runs `npm run lint`, `npm run typecheck`, `npm run test:unit`, and `npm run build`; E2E remains a local/manual gate according to `README.md`.

## Test File Organization

**Location:**
- Keep tests separate from implementation: 66 unit/component test files live in `tests/unit/`, and 15 browser test files live in `tests/e2e/`.
- Place reusable unit fixtures in `tests/unit/fixtures/` and factories in `tests/unit/factories/`. Place browser-storage, audio, and sheet helpers in `tests/e2e/fixtures/`.

**Naming:**
- Name Vitest files after the feature under test with `.test.ts` or `.test.tsx`: `tests/unit/measure-grid-repository.test.ts` and `tests/unit/settings-experience.test.tsx`.
- Name Playwright workflow files with `.spec.ts`: `tests/e2e/app-shell-home.spec.ts` and `tests/e2e/sheet-practice-integration.spec.ts`.

**Structure:**
```text
tests/
├── unit/                         # Vitest: domain, services, repositories, React components
│   ├── factories/                 # Deterministic builders and stable dates
│   ├── fixtures/                  # Browser/API test doubles
│   └── *.test.ts(x)
└── e2e/                           # Playwright Chromium flows
    ├── fixtures/                  # Storage, sheet, recording, and audio seeding
    └── *.spec.ts
```

## Test Structure

**Suite Organization:**
```typescript
// Pattern used in `tests/unit/measure-grid-repository.test.ts`
describe("measure grid service", () => {
  it("returns null when a valid sheet has no persisted grid", async () => {
    const service = createMeasureGridService(createMemoryMeasureGridRepository());

    await expect(service.getGrid("sheet-alpha")).resolves.toBeNull();
  });
});
```

**Patterns:**
- Group one module or concrete behavior under `describe`, and give every `it` an observable sentence in the present tense. `tests/unit/practice-session-duration-rules.test.ts` and `tests/unit/measure-grid-repository.test.ts` are reference suites.
- Define minimal in-memory repositories next to the relevant test when dependency injection is available, as in `createMemoryMeasureGridRepository` in `tests/unit/measure-grid-repository.test.ts` and `createMemorySettingsRepository` in `tests/unit/settings-experience.test.tsx`.
- Reset persistent test state around each test. `tests/unit/measure-grid-repository.test.ts` clears and resets its Dexie connection in `beforeEach`/`afterEach`; React DOM suites call `cleanup()` in `afterEach`, as in `tests/unit/settings-experience.test.tsx`.
- Use `it.each` for equivalent invalid-input cases, as in `tests/unit/measure-grid-repository.test.ts`.
- Assert returned values and observable side effects, not implementation details. Tests use `toEqual`, `toMatchObject`, `toHaveBeenCalledWith`, and negative call assertions in `tests/unit/measure-grid-repository.test.ts`.

## Mocking

**Framework:**
- Use Vitest's `vi` helpers for functions, globals, module boundaries, and resets. Examples appear in `tests/unit/settings-experience.test.tsx`, `tests/unit/home-dashboard.test.tsx`, and `tests/unit/fixtures/audio-context.ts`.

**Patterns:**
```typescript
// Pattern used in `tests/unit/home-dashboard.test.tsx`
const serviceMocks = vi.hoisted(() => ({
  getTodaySummary: vi.fn(),
  subscribe: vi.fn()
}));

vi.mock("@/services/practice-session/browser", () => ({
  browserPracticeSessionService: serviceMocks
}));

beforeEach(() => {
  serviceMocks.getTodaySummary.mockReset();
  serviceMocks.getTodaySummary.mockResolvedValue({ /* stable data */ });
});
```

- Prefer a typed injected fake for a service or repository. `tests/unit/measure-grid-repository.test.ts` passes an in-memory `MeasureGridRepository` into `createMeasureGridService` rather than mocking the service factory.
- Use `vi.fn(async () => value)` for narrow collaborator behavior, as in `tests/unit/settings-experience.test.tsx`.
- Use `vi.hoisted` plus `vi.mock` only when a component imports a browser singleton at module load time; `tests/unit/home-dashboard.test.tsx` is the established pattern.
- Use `vi.stubGlobal` for browser APIs, and undo global stubs in setup. `tests/unit/fixtures/audio-context.ts` supplies `AudioContext`; `tests/unit/home-dashboard.test.tsx` resets `indexedDB` with `vi.unstubAllGlobals()`.

**What to Mock:**
- Mock remote adapters, browser globals, singletons, and one-hop collaborators whose behavior is outside the unit's contract. `tests/unit/bilibili-search-adapter.test.ts` provides a fetch implementation, and `tests/unit/fixtures/audio-context.ts` controls Web Audio.
- Mock a UI component's injected services when testing rendering, inputs, and error states, as in `tests/unit/settings-experience.test.tsx`.

**What NOT to Mock:**
- Do not mock pure domain calculations. Test them directly with representative and malformed inputs in `tests/unit/practice-session-duration-rules.test.ts`.
- Do not mock the Dexie persistence layer when the behavior being tested is persistence. `tests/unit/setup.ts` loads `fake-indexeddb/auto`, and `tests/unit/measure-grid-repository.test.ts` exercises the real browser repository against it.
- Do not replace the application with component mocks in E2E. `tests/e2e/app-shell-home.spec.ts` navigates the running Next application and seeds browser persistence through helpers.

## Fixtures and Factories

**Test Data:**
```typescript
// Pattern used in `tests/unit/factories/practice.ts`
export function buildMeasureGrid(overrides: Partial<MeasureGrid> = {}): MeasureGrid {
  return {
    bpm: 96,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 500,
    ...overrides
  };
}
```

- Start with valid, deterministic defaults and accept `Partial<T>` overrides. Use fixed timestamps such as `TEST_ISO_DATE` from `tests/unit/factories/practice.ts` instead of the current clock.
- For objects with nested defaults, merge each nested object deliberately. `tests/unit/factories/recordings-review.ts` and `tests/unit/factories/sheet-metronome-presets.ts` show the required pattern.
- Keep feature-specific builders local to a large suite when reuse would be artificial; `tests/unit/home-dashboard.test.tsx` defines rich dashboard builders beside its assertions.

**Location:**
- Shared unit builders: `tests/unit/factories/`.
- Shared browser/API doubles: `tests/unit/fixtures/`.
- E2E state seeding and synthetic audio: `tests/e2e/fixtures/storage.ts`, `tests/e2e/fixtures/sheets.ts`, `tests/e2e/fixtures/recordings-review.ts`, and `tests/e2e/fixtures/audio.ts`.

## Coverage

**Requirements:** No coverage target, reporter, or threshold is configured in `package.json` or `vitest.config.ts`.

**View Coverage:**
```bash
# Not configured. Add an explicit Vitest coverage script before relying on coverage data.
```

## Test Types

**Unit Tests:**
- Test pure domain rules, parsing, and edge cases directly in `tests/unit/practice-session-duration-rules.test.ts`, `tests/unit/music-domain.test.ts`, and `tests/unit/reference-domain.test.ts`.
- Test services with typed repository fakes in `tests/unit/practice-session-service.test.ts`, `tests/unit/practice-goal-service.test.ts`, and `tests/unit/measure-grid-repository.test.ts`.
- Test React components with React Testing Library and `@testing-library/user-event`, querying accessible roles/labels first and `data-testid` for stable feature-specific values. `tests/unit/settings-experience.test.tsx` and `tests/unit/home-dashboard.test.tsx` demonstrate both.

**Integration Tests:**
- Exercise browser persistence with Dexie and `fake-indexeddb` in unit-run integration suites such as `tests/unit/measure-grid-repository.test.ts` and `tests/unit/practice-session-repository.test.ts`.
- Test browser-facing service composition through actual adapters only when their storage or subscription behavior is in scope, using the reset helpers exported by the infrastructure module.

**E2E Tests:**
- Playwright is configured for Chromium (`Desktop Chrome`) in `playwright.config.ts`, with a 30-second test timeout, 5-second assertion timeout, trace-on-first-retry, HTML reporting, and a managed local Next server.
- Use `Page` fixtures, accessible locators, storage/database cleanup, viewport changes, and console-error assertions. `tests/e2e/app-shell-home.spec.ts` and `tests/e2e/settings-local-data.spec.ts` are the baseline.
- Use synthetic microphone and WAV helpers rather than hardware dependencies for recording paths, following `tests/e2e/fixtures/audio.ts` and `tests/e2e/quick-metronome.spec.ts`.

## Common Patterns

**Async Testing:**
```typescript
// Patterns used in `tests/unit/settings-experience.test.tsx`
await expect(screen.findByDisplayValue("132")).resolves.toBeVisible();
await user.click(screen.getByRole("button", { name: "Clear All Local Data" }));
await waitFor(() => expect(clearAllLocalData).toHaveBeenCalledTimes(1));
```

- Await every asynchronous matcher, user interaction, service promise, and Playwright locator assertion. Use `findBy...` for appearance, `waitFor` for a resulting state change, and `await expect(locator)` for browser assertions.
- Use deterministic deferred promises only to prove stale-response or subscription ordering, as in `tests/unit/home-dashboard.test.tsx`.

**Error Testing:**
```typescript
// Patterns used in `tests/unit/measure-grid-repository.test.ts`
await expect(service.getGrid("   ")).rejects.toThrow("sheetId is required");
expect(repository.getGrid).not.toHaveBeenCalled();
```

- Test invalid command inputs with `toThrow`/`rejects.toThrow` and verify no persistence side effect occurred, as in `tests/unit/measure-grid-repository.test.ts`.
- Test recoverable UI errors through rendered status or alert output, as in `tests/unit/settings-experience.test.tsx` and `tests/unit/sheet-library-experience.test.tsx`.
- Test parsing failures as safe absence (`null` or `[]`) where that is the public boundary contract, as in `tests/unit/reference-domain.test.ts` and `tests/unit/measure-grid-repository.test.ts`.

---

*Testing analysis: 2026-07-25*
