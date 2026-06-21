# Preflight / Project Initialization

## Purpose

This module initializes the technical project foundation before feature implementation begins.

Preflight is a real feature contract. It must be implemented by one coding agent and verified by a separate verification agent.

## User Value

- The project can be installed and run.
- The toolchain is known and reproducible.
- Future feature agents start from a working foundation.
- Verification proves the app is not just scaffolded, but actually buildable and runnable.

## v0 Scope

- Initialize the app project.
- Install agreed dependencies.
- Configure TypeScript strict mode.
- Configure linting/formatting baseline.
- Configure test runner.
- Configure E2E/browser test runner.
- Create basic app shell route placeholder if needed for smoke verification.
- Add scripts for install, dev, build, lint, unit tests, and E2E tests.
- Document how to run the project locally.

Expected technical direction:

```text
Next.js
React
TypeScript strict mode
Tailwind CSS
shadcn/ui-compatible setup
Radix UI primitives through shadcn/ui patterns
lucide-react
Zustand
Zod
Dexie
Tone.js
wavesurfer.js
PDF.js / react-pdf
Playwright
```

Exact dependency versions should be selected during implementation based on current compatibility.

Preflight must install the approved open-source defaults unless an incompatibility is discovered and documented before substitution.

## Out of Scope for v0

- Implementing product features.
- Building real Quick Metronome behavior.
- Building real recording behavior.
- Building real Sheet Library import.
- Building real Sheet Practice.
- Adding Supabase.
- Adding WASM.
- Adding v1 features.

## User Paths

```text
Clone or open project
  -> Install dependencies
  -> Run dev server
  -> Open app in browser
  -> See a working initial app shell
```

```text
Run verification commands
  -> Build succeeds
  -> Lint succeeds or reports only documented baseline issues
  -> Unit test command succeeds
  -> E2E smoke test opens the app in a browser
```

## Product Decisions

- Preflight must happen before feature implementation.
- Preflight is not allowed to implement feature behavior beyond minimal route/shell smoke support.
- Preflight must preserve the v0 architecture direction.
- Preflight UI should already respect the v0 design style guide.
- Preflight must not add fake app functionality.

## Data Boundary

This module may create:

- Project config files.
- Package manifests.
- Test config.
- Minimal app shell placeholder.
- Basic documentation.

This module must not create:

- Real user data.
- Seeded fake practice history.
- Real recordings.
- Real sheets.
- Real references.

## Architecture Boundary

Preflight may establish folders and boundaries, but should avoid premature implementation.

It may create placeholders for:

- app/routes.
- components.
- domain.
- services.
- infrastructure.
- stores.
- hooks.
- tests.

It must not directly couple UI to Tone.js, MediaRecorder, wavesurfer, Dexie, PDF internals, or future WASM modules.

## Dependencies

- `docs/v0/00-overview.md`.
- `docs/v0/agent-implementation-rules.md`.
- `docs/v0/design-style-guide.md`.
- `docs/v0/project-structure.md`.
- `docs/v0/tech-stack-decisions.md`.
- `docs/v0/01-app-shell-home.md` for initial shell expectations.

## Acceptance Criteria

- [ ] Project installs successfully.
- [ ] Dependency versions are compatible.
- [ ] TypeScript strict mode is enabled.
- [ ] App can run locally.
- [ ] App can build successfully.
- [ ] Lint command exists and runs.
- [ ] Unit test command exists and runs.
- [ ] E2E test command exists and runs.
- [ ] E2E smoke test opens the app in a real browser.
- [ ] Minimal UI respects the v0 design style direction.
- [ ] No real feature is falsely presented as complete.
- [ ] Architecture folders or boundaries are present enough for next agents.
- [ ] Implementation agent creates an implementation commit.
- [ ] Verification agent creates a separate verification commit.

## Test Plan

### Unit Tests

- Test runner executes at least one smoke unit test.

### Integration Tests

- TypeScript project compiles.
- Build command succeeds.
- Lint command succeeds or baseline issues are explicitly documented.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Start the app.
- Open the app in a browser.
- Verify initial page renders.
- Resize browser to desktop and mobile widths.
- Verify no console errors during smoke flow.

### Manual QA

- Confirm the initial visual style roughly follows the reference design.
- Confirm no fake feature claims appear.
- Confirm setup instructions are understandable.

## QA Checklist

- [ ] Dependency install was run.
- [ ] Dev server was started.
- [ ] Build was run.
- [ ] Lint was run.
- [ ] Unit tests were run.
- [ ] E2E smoke test was run in a real browser.
- [ ] Resize was tested.
- [ ] Console errors were checked.
- [ ] Design style guide was considered.
- [ ] No v0 feature was marked implemented by preflight.

## Failure / Edge Cases

- Dependency conflict: document exact conflict and do not mark verified.
- Build fails: do not mark verified.
- E2E cannot launch browser: document blocker and fail verification.
- Dev server starts but page is blank: fail verification.
- UI claims unavailable features: fail verification.

## Implementation Contract

The implementation agent may build:

- Project scaffold.
- Dependency setup.
- Config files.
- Script commands.
- Basic route/shell placeholder.
- Smoke tests.
- Setup documentation.

The implementation agent must not build:

- Quick Metronome feature behavior.
- Recording feature behavior.
- Sheet import.
- Sheet rendering.
- Reference system.
- Settings cleanup.
- Any v1 feature.

Implementation handoff must include:

- Assigned feature: `00-preflight`.
- Coding model used.
- Implementation commit hash.
- Dependencies installed.
- Scripts added.
- Commands run.
- Known limitations or risks.

## Verification Contract

The verification agent must:

- Be a separate agent pass from the implementation agent.
- Use the required verification model unless substitution is approved.
- Install dependencies from a clean or documented state.
- Run build, lint, unit test, and E2E smoke commands.
- Open the app in a real browser.
- Resize the browser and verify the initial UI remains usable.
- Check browser console errors.
- Verify no product feature is falsely presented as complete.

The verifier must report FAIL if install/build/test/E2E cannot run, if the app is blank, if console errors appear, or if preflight implements/claims real feature behavior.

## Implementation Handoff Requirements

- Assigned feature.
- Coding model used.
- Implementation commit hash.
- Files or areas changed.
- Dependencies and versions.
- Commands run.
- Known limitations.

## Verification Handoff Requirements

- Assigned feature.
- Verification model used.
- Verification commit hash.
- PASS or FAIL.
- Install evidence.
- Build/lint/unit/E2E evidence.
- Browser smoke evidence.
- Resize evidence.
- Console error status.
- Repro steps for failures.

## Done Definition

Preflight is complete only when:

- All acceptance criteria pass.
- Implementation commit exists.
- Separate verification commit exists.
- Verification agent reports PASS.
- The app can be installed, built, tested, and opened in a browser.

## v1 Hooks

Preserve room for:

- Supabase.
- WASM packages.
- Advanced CI matrix.
- Cross-browser media test suites.
- Deployment pipelines.

Do not implement these in v0 preflight.
