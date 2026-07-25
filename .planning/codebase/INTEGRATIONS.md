# External Integrations

**Analysis Date:** 2026-07-25

## APIs & External Services

**Video search and playback:**
- Bilibili - Browser clients search public Bilibili videos, persist the selected reference locally, and construct a Bilibili player URL for embedded playback.
  - SDK/Client: Native `fetch` is wrapped by `FetchBilibiliSearchAdapter` in `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts`; it issues an unauthenticated GET to `https://api.bilibili.com/x/web-interface/search/type` with `search_type=video` and `keyword` query parameters.
  - Auth: None; the adapter sends only `Accept: application/json` in `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts`.
  - Player and canonical video URLs are parsed/constructed in `src/domain/reference/validation.ts`; the browser service in `src/infrastructure/reference/browser-reference-service.ts` switches to a deterministic adapter only for the E2E fixture flag.

**Browser media platform:**
- Web Media APIs - Microphone capture uses `navigator.mediaDevices.getUserMedia` and `MediaRecorder` in `src/infrastructure/audio/browser-recording-capture.ts`.
  - SDK/Client: Native browser APIs, with local audio decoding through `AudioContext` in `src/infrastructure/audio/browser-audio-decode-adapter.ts`.
  - Auth: Browser microphone permission only; no application credential or environment variable is used.
- Local PDF and waveform rendering - PDFs use `react-pdf`/PDF.js in `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx`, and recordings use WaveSurfer in `src/lib/recordings-review/wavesurfer-adapter.ts`.
  - SDK/Client: Bundled npm dependencies from `package.json`; the PDF worker is resolved from `pdfjs-dist` rather than fetched from a CDN in `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx`.
  - Auth: Not applicable.

## Data Storage

**Databases:**
- Browser IndexedDB - Dexie 4.4.4 persists all product data locally; database identifiers are defined in `src/infrastructure/storage/storage-contracts.ts`.
  - Connection: No connection string or environment variable; browser-origin storage is opened by Dexie repositories such as `src/infrastructure/files/sheet-library-repository.ts`, `src/infrastructure/reference/reference-repository.ts`, and `src/infrastructure/db/practice-session-repository.ts`.
  - Client: `dexie` from `package.json`.
  - Scope: Sheets and their artifacts use `metronome-practice-v0-sheet-library`; references use `metronome-practice-v0-references`; sessions, settings, grids, segments, goals, presets, and audio artifact partitions are named in `src/infrastructure/storage/storage-contracts.ts`.
- Browser Local Storage - Recording history metadata uses the `metronome-practice:v0:quick-recordings` key declared in `src/infrastructure/storage/storage-contracts.ts` and read/written by `src/lib/recordings-review/repository.ts`.
  - Connection: No environment variable; access is through `window.localStorage` in `src/lib/recordings-review/repository.ts`.
  - Client: Native browser Web Storage API in `src/lib/recordings-review/repository.ts`.

**File Storage:**
- Local browser IndexedDB only - Sheet PDF/image blobs are saved with their metadata by `src/infrastructure/files/sheet-library-repository.ts`; local-audio reference blobs are saved by `src/infrastructure/reference/reference-repository.ts`; recording blobs are saved by `src/infrastructure/db/recording-artifact-repository.ts`.
- Object URLs are transient display/download handles created and revoked in `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts` and `src/lib/recordings-review/browser-audio-download-adapter.ts`; no cloud object store is configured.

**Caching:**
- No remote cache is configured in `package.json` or `src/`; local recording-history metadata keeps an in-memory snapshot cache around the Local Storage value in `src/lib/recordings-review/repository.ts`.

## Authentication & Identity

**Auth Provider:**
- None detected - `src/app/` contains page entries but no `route.ts` handler, and no authentication SDK is declared in `package.json`.
  - Implementation: The application has no account/session identity layer; browser permission prompts protect microphone access in `src/infrastructure/audio/browser-recording-capture.ts`.

## Monitoring & Observability

**Error Tracking:**
- None detected - `package.json` declares no error-tracking dependency, and browser-facing external failures are converted to local result messages by `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts`.

**Logs:**
- No structured application logging service is configured in `src/`; the E2E launcher writes failures to standard error in `scripts/run-playwright-stable-env.mjs`.

## CI/CD & Deployment

**Hosting:**
- Not detected - `package.json` provides `next start`, but root deployment manifests such as `vercel.json`, `netlify.toml`, `Dockerfile`, and Compose files are absent.

**CI Pipeline:**
- GitHub Actions - `.github/workflows/ci.yml` runs on pull requests and pushes to `main`, installs npm 11.17.0, then runs `npm ci`, lint, typecheck, unit tests, and build.
- Playwright is a local/manual verification step; `README.md` documents it separately from the GitHub Actions gate.

## Environment Configuration

**Required env vars:**
- None for product runtime - no root `.env*` file exists and application source reads no product service credential.
- Optional E2E controls are `E2E_HOST`, `E2E_PORT`, and `PLAYWRIGHT_SKIP_WEB_SERVER` in `playwright.config.ts`; `NEXT_PUBLIC_METRONOME_E2E` is set by `scripts/run-next-e2e-server.mjs` for E2E-only behavior.

**Secrets location:**
- Not detected - no root `.env*` file exists. `.npmrc` exists but its contents were intentionally not inspected because it may contain package-manager credentials.

## Webhooks & Callbacks

**Incoming:**
- None - there are no `route.ts` files under `src/app/`, so the application exposes no webhook endpoint.

**Outgoing:**
- None - the only product network call is the direct browser Bilibili search request in `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts`; it is not a webhook callback.

---

*Integration audit: 2026-07-25*
