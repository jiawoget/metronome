# Technology Stack

**Analysis Date:** 2026-07-25

## Languages

**Primary:**
- TypeScript 6.0.3 - Strict application, domain, service, infrastructure, component, and test code live under `src/` and `tests/`; the compiler contract is in `tsconfig.json`.

**Secondary:**
- JavaScript (ES modules) - Node-run build, development, Playwright, and environment-stabilization scripts live in `scripts/*.mjs`; ESM is declared by `package.json`.
- CSS with Tailwind CSS 4.3.1 - Global styles begin in `src/app/globals.css`, and Tailwind scanning/theme configuration is in `tailwind.config.ts`.

## Runtime

**Environment:**
- Node.js 24 - `.nvmrc` contains `24`, while `package.json` enforces `node >=24.0.0`.
- Modern browser runtime - Local persistence and media features use IndexedDB, Web Audio, MediaRecorder, File/Blob, and object URLs in `src/infrastructure/`.

**Package Manager:**
- npm 11.17.0 - `package.json` declares `packageManager: npm@11.17.0` and `npm >=11.17.0`.
- Lockfile: present at `package-lock.json`.
- `.npmrc` is present but was intentionally not read because it can contain package-manager credentials.

## Frameworks

**Core:**
- Next.js 16.2.9 - React App Router application; page entries are in `src/app/` and framework configuration is `next.config.mjs`.
- React 19.2.7 and React DOM 19.2.7 - UI components are implemented in `src/components/`, with the root layout in `src/app/layout.tsx`.
- Tailwind CSS 4.3.1 - Utility styling pipeline configured by `tailwind.config.ts` and `postcss.config.mjs`.

**Testing:**
- Vitest 4.1.9 - Unit-test runner configured for jsdom in `vitest.config.ts`, with tests in `tests/unit/`.
- Testing Library - React, user-event, and jest-dom packages support component tests initialized by `tests/unit/setup.ts`.
- Playwright 1.61.0 - Chromium E2E runner configured by `playwright.config.ts`, with scenarios in `tests/e2e/`.

**Build/Dev:**
- Next.js CLI - Development, production build, and production start commands are defined in `package.json`; Node wrappers in `scripts/run-next-dev-stable-env.mjs` and `scripts/run-next-build-stable-env.mjs` run the stable environment setup.
- TypeScript compiler 6.0.3 - `npm run typecheck` runs `tsc --noEmit` against `tsconfig.json`.
- ESLint 9.39.4 with `eslint-config-next` - Lint configuration lives in `eslint.config.mjs`.
- Prettier 3.9.5 with `prettier-plugin-tailwindcss` - Formatting conventions are configured in `prettier.config.mjs`; `package.json` declares the compatible `^3.8.4` range.
- Vite 8.0.16 - Vitest uses the Vite React plugin from `vitest.config.ts`; the application build remains Next.js.

## Key Dependencies

**Critical:**
- `dexie` 4.4.4 - Typed browser IndexedDB persistence for sheets, references, sessions, settings, goals, segments, presets, grids, and recording artifacts; database names are centralized in `src/infrastructure/storage/storage-contracts.ts`.
- `zod` 4.4.3 - Runtime validation of domain and service inputs in files such as `src/domain/sheet/validation.ts` and `src/services/practice-segments/validation.ts`.
- `zustand` 5.0.14 - Ephemeral sheet-practice workflow state is held by `src/stores/sheet-practice-recording-workflow-store.ts`.
- `tone` 15.1.22 - Dynamic browser metronome synthesis is wrapped by `src/infrastructure/audio/tone-metronome-adapter.ts`.
- `@tonaljs/time-signature` and `@tonaljs/duration-value` 4.9.0 - Music-theory parsing is encapsulated by `src/domain/music/time-signature.ts` and `src/domain/music/duration.ts`.

**Infrastructure:**
- `react-pdf` 10.4.1 and `pdfjs-dist` 5.4.296 - Local sheet PDF rendering/parsing use a bundled PDF worker in `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx` and `src/infrastructure/files/sheet-import-adapter.ts`.
- `wavesurfer.js` 7.12.8 - Local recording waveform playback is encapsulated by `src/lib/recordings-review/wavesurfer-adapter.ts`.
- `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, and `tailwind-merge` - Reusable UI composition and class handling are provided through `src/components/ui/button.tsx` and `src/lib/utils.ts`.
- `lucide-react` 1.21.0 - UI icon imports are used throughout `src/components/`, for example `src/components/app-shell/app-shell.tsx`.

## Configuration

**Environment:**
- No root `.env`, `.env.local`, `.env.development`, or `.env.production` file exists; product runtime configuration does not require environment variables.
- E2E-only variables are `E2E_HOST`, `E2E_PORT`, and `PLAYWRIGHT_SKIP_WEB_SERVER` in `playwright.config.ts`; `scripts/run-next-e2e-server.mjs` sets `NEXT_PUBLIC_METRONOME_E2E=1` only for test execution.
- Keep application configuration client-safe: the only `NEXT_PUBLIC_*` variable read by product code is the E2E feature signal in `src/infrastructure/sheet-viewer/browser-sheet-viewer-service.ts`.

**Build:**
- `next.config.mjs` enables React strict mode, permits `127.0.0.1` as a development origin, and fixes the Turbopack root to the repository.
- `tsconfig.json` targets ES2022, enables strict TypeScript, and maps `@/*` to `src/*`.
- `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `prettier.config.mjs`, `vitest.config.ts`, and `playwright.config.ts` define the style, quality, unit, and E2E toolchains.

## Platform Requirements

**Development:**
- Use Node 24 and npm 11.17.0 from `.nvmrc` and `package.json`; `README.md` also documents the repository-local Windows wrapper `scripts/npm-local.ps1`.
- Install the Playwright Chromium browser with the `playwright:install` script in `package.json` before running `test:e2e`.

**Production:**
- `package.json` exposes `next start` after `npm run build`; no deployment provider configuration is detected in root `vercel.json`, `netlify.toml`, `Dockerfile`, or Compose files.
- GitHub Actions verifies pull requests and `main` using Node 24, npm 11.17.0, lint, typecheck, unit tests, and build in `.github/workflows/ci.yml`; it does not deploy the application.

---

*Stack analysis: 2026-07-25*
