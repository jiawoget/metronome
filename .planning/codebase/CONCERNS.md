# Codebase Concerns

**Analysis Date:** 2026-07-25

## Tech Debt

**Practice presentation formatting has overlapping owners:**
- Issue: `src/components/home/home-dashboard.tsx` defines UTC timestamp and minute-scale duration formatting for analytics and activity, `src/hooks/use-practice-session-dashboard.ts` defines the equivalent session-comparison formatting, and `src/domain/practice/session-comparison.ts` defines a separate seconds-scale formatter. The existing shared `src/domain/practice/format.ts` exports `formatPracticeDuration`, but it uses `0:00`/seconds semantics for `src/components/sheet-practice/controls/practice-status-panel.tsx` and `src/lib/recordings-review/format.ts` rather than the selected Home/dashboard/comparison presentation.
- Files: `src/domain/practice/format.ts`, `src/components/home/home-dashboard.tsx`, `src/hooks/use-practice-session-dashboard.ts`, `src/domain/practice/session-comparison.ts`, `src/components/sheet-practice/controls/practice-status-panel.tsx`, `src/lib/recordings-review/format.ts`.
- Impact: Small changes to fallback text, UTC rendering, rounding, or minute wording can silently diverge between Home, dashboard-derived comparison, and domain comparison. A broad formatter replacement can also regress the intentionally seconds-scale sheet and recording displays.
- Fix approach: Keep a single explicit practice-presentation boundary in `src/domain/practice/format.ts` for the selected UTC-minute and minute-scale contracts, migrate only the matching callers, and retain separate names for the excluded seconds-scale formats. Lock exact behavior in focused tests before removing each duplicate body.

**Feature components combine orchestration, mutation workflows, and large rendering trees:**
- Issue: `src/components/home/home-dashboard.tsx` (1,674 lines) owns goal editing, analytics, streaks, continuation, activity, and session comparison; `src/components/recordings-review/recordings-review-experience.tsx` (1,604 lines) owns filtering, selection, waveform loading, playback, exporting, tags, archive state, and detail rendering; `src/components/sheet-practice/controls/sheet-practice-controls.tsx` (1,356 lines) owns transport, countdown, segments, presets, recording, rollback, and test-harness state; `src/components/sheet-library/sheet-library-experience.tsx` (1,212 lines) owns import, batch import, filters, editing, tags, and practice summaries.
- Files: `src/components/home/home-dashboard.tsx`, `src/components/recordings-review/recordings-review-experience.tsx`, `src/components/sheet-practice/controls/sheet-practice-controls.tsx`, `src/components/sheet-library/sheet-library-experience.tsx`.
- Impact: State changes have broad render and review surface, callback dependency changes are easy to miss, and a feature-specific change can affect unrelated workflow state in the same module.
- Fix approach: Extract only cohesive presentational panels and existing-domain/service adapters from each feature file. Keep business rules in the current `src/domain/` and `src/services/` owners; do not create parallel feature services merely to reduce file length. Preserve a focused test beside each extracted state boundary.

**Local-first persistence spans independent stores without an operation-level transaction:**
- Issue: sheet data, references, sessions, settings, segments, goals, presets, and recording artifacts use separate IndexedDB database names in `src/infrastructure/storage/storage-contracts.ts`; recording metadata and legacy sessions use a single localStorage snapshot in `src/lib/recordings-review/repository.ts`. Recording save flows commit the artifact, session link, and metadata across these stores with compensating cleanup in `src/lib/quick-metronome/recording-controller.ts` and `src/lib/sheet-practice/recording-service.ts`.
- Files: `src/infrastructure/storage/storage-contracts.ts`, `src/lib/recordings-review/repository.ts`, `src/infrastructure/db/recording-artifact-repository.ts`, `src/infrastructure/db/practice-session-repository.ts`, `src/lib/quick-metronome/recording-controller.ts`, `src/lib/sheet-practice/recording-service.ts`, `src/lib/recordings-review/artifact-storage.ts`.
- Impact: quota, browser-storage, or stale-write failures can leave an artifact, metadata row, and practice session out of sync. Rollback is best-effort and its failure path reports that local state cannot be fully restored.
- Fix approach: Keep the existing artifact ownership invariant (`artifactId === recordingId`) and centralize reconciliation around `src/lib/recordings-review/artifact-storage.ts`. Add an idempotent recovery pass for orphaned artifacts and dangling metadata before considering a storage consolidation; cover every commit boundary with injected failures.

**Recording-history storage serializes a whole mutable snapshot for each mutation:**
- Issue: `src/lib/recordings-review/repository.ts` parses, normalizes, and serializes the complete localStorage snapshot for updates, then retries a stale-write comparison at most three times. Reads such as `getSnapshot()` expose all recordings, markers, organizations, selections, and legacy sessions together.
- Files: `src/lib/recordings-review/repository.ts`, `src/lib/recordings-review/recording-history-operations.ts`, `src/lib/recordings-review/recording-history-snapshot.ts`.
- Impact: recording history grows with every take, making tag, archive, marker, and take-selection writes increasingly expensive. Concurrent browser tabs can still surface `RecordingHistoryConcurrentWriteError` after the retry budget.
- Fix approach: Retain the existing snapshot schema for compatibility, but move hot mutable metadata behind a bounded IndexedDB repository or an explicit migration. Do not remove the stale-write guard until cross-tab behavior has an authoritative replacement and migration tests prove both legacy and artifact-backed records remain readable.

## Known Bugs

**Saved practice defaults do not initialize Quick Metronome:**
- Symptoms: `/settings` persists `defaultBpm`, `defaultTimeSignature`, and `defaultSubdivision`, while `/quick-metronome` initializes `useMetronomeSettingsState` exclusively from `DEFAULT_METRONOME_SETTINGS`. A new Quick Metronome page therefore starts at `96`, `4/4`, and `quarter` instead of the values saved in Settings.
- Files: `src/components/settings/settings-experience.tsx`, `src/services/settings/service.ts`, `src/components/quick-metronome/quick-metronome-experience.tsx`, `src/lib/quick-metronome/types.ts`.
- Trigger: Save non-default practice defaults in `/settings`, then open or reload `/quick-metronome`.
- Workaround: Set the Quick Metronome controls manually for each visit.

**Clear All Local Data is not atomic or resumable:**
- Symptoms: `browserLocalDataCleanupService.clearAllLocalData()` clears three stores in parallel, clears recording-history metadata synchronously, clears recording artifacts, then resets settings. If recording-history clear throws, later cleanup and settings reset do not run; if an IndexedDB clear rejects, settings can still reset while the operation reports partial cleanup.
- Files: `src/infrastructure/db/browser-settings-local-data-service.ts`, `src/lib/recordings-review/repository.ts`, `tests/unit/browser-settings-local-data-service.test.ts`, `src/components/settings/settings-experience.tsx`.
- Trigger: A localStorage security/quota error or any IndexedDB clear failure during the confirmed cleanup action in `/settings`.
- Workaround: The UI reports that completion is not recorded. Re-running the cleanup can remove remaining stores, but browser site-data clearing is the only complete manual recovery path.

## Security Considerations

**Unbounded local media and document ingestion can exhaust browser resources:**
- Risk: `src/infrastructure/files/sheet-import-adapter.ts` accepts PDFs and images without byte, page, or pixel limits, reads PDF blobs entirely into memory, and decodes all selected images with `Promise.all`. `src/services/reference/service.ts` accepts any positive-size supported audio file, while `src/infrastructure/audio/browser-recording-capture.ts` retains audio chunks for an unbounded recording duration.
- Files: `src/infrastructure/files/sheet-import-adapter.ts`, `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts`, `src/services/reference/service.ts`, `src/domain/reference/validation.ts`, `src/infrastructure/audio/browser-recording-capture.ts`.
- Current mitigation: file type/extension checks, decode failures, disabled PDF font-face/system-font options, and browser storage quota errors provide limited protection.
- Recommendations: enforce per-file, batch, page-count, image-pixel, and recording-duration limits before `arrayBuffer()` or decode work; use bounded image concurrency; surface quota/limit errors before persistence; and add large-input regression fixtures that assert the app remains responsive.

**Sensitive local practice data relies solely on same-origin browser storage:**
- Risk: recordings, imported sheets, references, sessions, goals, and settings are stored as localStorage values and IndexedDB blobs/rows. `next.config.mjs` defines no Content-Security-Policy or Permissions-Policy header configuration, so a same-origin script injection would have access to the browser-held practice data and microphone-capable UI.
- Files: `src/infrastructure/storage/storage-contracts.ts`, `src/lib/recordings-review/repository.ts`, `src/infrastructure/files/sheet-library-repository.ts`, `src/infrastructure/reference/reference-repository.ts`, `src/infrastructure/db/recording-artifact-repository.ts`, `next.config.mjs`.
- Current mitigation: `src/domain/reference/validation.ts` restricts saved Bilibili video URLs to known hosts and `src/components/sheet-practice/reference/reference-panel.tsx` opens them with `rel="noreferrer"`; no unsafe HTML sink appears in `src/`.
- Recommendations: set a restrictive CSP and microphone Permissions-Policy in the deployed response layer, keep third-party scripts out of the application origin, and document that browser-profile access can read local practice artifacts. Validate the policy with the PDF worker, audio blobs, and Bilibili links enabled.

**Bilibili live search discloses the user query to a third party and has no cancellation or timeout:**
- Risk: `FetchBilibiliSearchAdapter` sends the typed query directly from the browser to Bilibili. An unavailable or stalled endpoint leaves the UI waiting for the fetch, and the chosen third party receives the query and client network metadata.
- Files: `src/infrastructure/bilibili/fetch-bilibili-search-adapter.ts`, `src/services/reference/service.ts`, `src/components/sheet-practice/reference/reference-panel.tsx`.
- Current mitigation: `src/domain/reference/validation.ts` canonicalizes saved Bilibili URLs, and `src/components/sheet-practice/reference/reference-panel.tsx` directs playback to an external tab rather than embedding third-party player scripts.
- Recommendations: present the external-search privacy boundary next to the action, attach an `AbortSignal` with a short timeout, and ignore/cancel in-flight searches after unmount or superseding input.

## Performance Bottlenecks

**Dashboard refresh repeats full-history reads for one subscription notification:**
- Problem: `usePracticeSessionDashboard` starts seven dashboard reads on initial load and every practice-session subscription event. Most service methods independently call `listSessions()` and `listRecordingMetadata()`, then derive recent activity, analytics, streaks, continuation targets, comparison, summaries, and goal evaluations from complete histories.
- Files: `src/hooks/use-practice-session-dashboard.ts`, `src/services/practice-session/service.ts`, `src/infrastructure/db/global-practice-session-repository.ts`, `src/infrastructure/db/practice-session-repository.ts`, `src/infrastructure/db/recording-history-metadata-repository.ts`.
- Cause: `practiceSessionRepository.listSessions()` loads and sorts `sessions.toArray()`, and recording metadata begins with the whole localStorage snapshot. The hook has no shared read snapshot or in-flight request coalescing.
- Improvement path: create one service-level dashboard read snapshot per refresh, derive all dashboard projections from it, and retain targeted repository methods for recent/today reads. Keep the existing refresh-id guard in `src/hooks/use-practice-session-dashboard.ts` while adding cancellation/coalescing for stale work.

**Library, history, and artifact cleanup use unbounded collection scans:**
- Problem: `SheetLibraryExperience` asks for practice summaries with `Number.MAX_SAFE_INTEGER`; recording review filters, groups, and maps every recording in memory; artifact cleanup uses `recordingArtifacts.toArray()` before filtering the requested recording IDs.
- Files: `src/components/sheet-library/sheet-library-experience.tsx`, `src/components/recordings-review/recordings-review-experience.tsx`, `src/lib/recordings-review/waveform-comparison-sources.ts`, `src/infrastructure/db/recording-artifact-repository.ts`, `src/lib/recordings-review/artifact-storage.ts`.
- Cause: the current data model is optimized for a small local corpus rather than paging, indexed lookups, or incremental projections.
- Improvement path: establish bounded UI limits, use IndexedDB record-id queries for artifact lookup, page/filter recording lists before rendering, and derive library summaries only for visible or requested sheet IDs.

**Sheet viewer creates work proportional to every imported page:**
- Problem: thumbnail generation renders every PDF page sequentially and decodes every image in parallel. The cache retains only five thumbnail sets after generation, so a high-page-count or high-resolution import still performs the full decode/render workload.
- Files: `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts`, `src/services/sheet-viewer/thumbnails.ts`, `src/services/sheet-viewer/browser-hooks.ts`, `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`.
- Cause: no page-count, pixel, or deferred-thumbnail boundary exists before the rendering loop.
- Improvement path: generate thumbnails on demand or in bounded batches, cache a capped page window, and enforce import limits in `src/infrastructure/files/sheet-import-adapter.ts` before viewer work starts.

## Fragile Areas

**Sheet recording has a multi-phase rollback protocol embedded in UI-adjacent flows:**
- Files: `src/components/sheet-practice/controls/sheet-practice-controls.tsx`, `src/lib/sheet-practice/recording-service.ts`, `src/services/practice-session/snapshot-rollback.ts`, `src/lib/recordings-review/artifact-storage.ts`, `tests/unit/sheet-practice-recording.test.ts`.
- Why fragile: starting or saving a sheet take coordinates a selected segment, capture service, decoded audio, artifact persistence, recording metadata, session updates, event capture, and restoration. The workflow uses several nullable paths plus compensating deletes instead of one persistence transaction.
- Safe modification: preserve the current commit ordering and rollback calls; add a fault-injection test for the exact boundary changed; verify both retained and discarded capture paths before changing UI state transitions.
- Test coverage: `tests/unit/sheet-practice-recording.test.ts` exercises many rollback paths, but browser-storage fault recovery after a reload has no reconciliation test.

**Practice controls expose test-harness globals beside production transport state:**
- Files: `src/components/sheet-practice/controls/sheet-practice-controls.tsx`, `tests/e2e/sheet-practice-controls.spec.ts`, `tests/unit/sheet-practice-controls.test.tsx`.
- Why fragile: bar-count-in test flags and browser events share the component that handles live metronome state, recording start/stop, cancellation tokens, and session persistence. A change to effect ordering can alter audio behavior or test harness evidence.
- Safe modification: keep harness access gated by `__sheetPracticeControlsTestHarness`, keep event names stable, and test cancellation, unmount, record-again, and countdown paths whenever their shared state changes.
- Test coverage: unit and E2E tests cover normal control paths, but no test enforces a public contract for every test-only browser global and event payload.

**PDF worker configuration is duplicated across three client paths:**
- Files: `src/infrastructure/files/sheet-import-adapter.ts`, `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts`, `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx`, `package.json`.
- Why fragile: import inspection, thumbnail rendering, and `react-pdf` rendering each set `pdfjs.GlobalWorkerOptions.workerSrc` around the same direct `pdfjs-dist` dependency. An upgrade or bundler-path change can produce inconsistent parse, thumbnail, and display behavior.
- Safe modification: keep a single tested worker-URL helper shared by the three paths, update `pdfjs-dist` and `react-pdf` together, and run import plus viewer E2E coverage after dependency changes.
- Test coverage: `tests/e2e/sheet-library.spec.ts` and `tests/e2e/sheet-viewer.spec.ts` exercise ordinary artifacts, but they do not assert worker compatibility across a dependency upgrade.

## Scaling Limits

**Browser-origin storage and main-thread decoding are the hard capacity boundary:**
- Current capacity: `src/infrastructure/storage/storage-contracts.ts` defines separate browser stores but no application byte, count, page, image-pixel, audio-duration, or retention limits.
- Limit: large recordings, audio references, sheets, and thumbnails consume browser quota and heap; full-history reads in `src/services/practice-session/service.ts` and `src/lib/recordings-review/repository.ts` grow with retained local data.
- Scaling path: define product-level local-storage budgets, show usage before import/capture, retain a bounded recent-history projection, and provide an owner-approved local export/cleanup policy rather than relying on browser eviction behavior.

**Cross-tab state has a bounded optimistic-concurrency limit:**
- Current capacity: `src/lib/recordings-review/repository.ts` retries snapshot writes three times before throwing `RecordingHistoryConcurrentWriteError`.
- Limit: frequent operations from multiple tabs can exhaust retries because each mutation serializes a shared localStorage document.
- Scaling path: move mutable recording organization and selection data to transactional IndexedDB records or add a single-writer coordination policy; retain an explicit migration and multi-tab test suite before changing the snapshot format.

## Dependencies at Risk

**PDF rendering stack:**
- Risk: `pdfjs-dist` and `react-pdf` are direct dependencies, while three client modules set the PDF worker URL independently.
- Impact: a version or worker-bundling mismatch can break import inspection, thumbnail generation, or interactive sheet viewing in different ways.
- Migration plan: update `pdfjs-dist`, `react-pdf`, the shared worker helper, and the import/viewer tests as one atomic dependency change.
- Files: `package.json`, `src/infrastructure/files/sheet-import-adapter.ts`, `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts`, `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx`.

**Browser audio and persistence APIs:**
- Risk: recording and analysis depend on `MediaRecorder`, `getUserMedia`, `AudioContext`, IndexedDB, Blob URLs, and browser MIME support, with behavior varying by browser and device.
- Impact: local recording, decoding, playback, and storage can fail even when TypeScript-level service contracts pass.
- Migration plan: retain feature detection in browser adapters, maintain capability-specific error messages, and run real-browser coverage for supported MIME types and storage-unavailable paths.
- Files: `src/infrastructure/audio/browser-recording-capture.ts`, `src/infrastructure/audio/browser-audio-decode-adapter.ts`, `src/infrastructure/db/recording-artifact-repository.ts`, `src/lib/recordings-review/wavesurfer-adapter.ts`, `playwright.config.ts`.

## Missing Critical Features

**No durable session-event read/write pipeline:**
- Problem: `src/domain/practice/session-events.ts` defines validated event types and `src/services/practice-session/service.ts` creates events, but its default sink is a no-op. `src/infrastructure/db/browser-practice-session-service.ts` does not supply an event sink, and comparison UI reports that event details are unavailable.
- Blocks: users cannot inspect reliable metronome, recording, or reference event timelines; event schema work cannot support audit, detailed comparison, or recovery diagnostics.
- Files: `src/domain/practice/session-events.ts`, `src/services/practice-session/service.ts`, `src/infrastructure/db/browser-practice-session-service.ts`, `src/hooks/use-practice-session-dashboard.ts`, `src/domain/practice/session-comparison.ts`.

**No local backup and restore path for user-owned browser data:**
- Problem: settings explicitly exclude import/export while all practice artifacts are local browser data, and the provided cleanup action clears those stores.
- Blocks: users have no application-level recovery path for browser-profile loss, quota eviction, device migration, or accidental site-data clearing.
- Files: `src/components/settings/settings-experience.tsx`, `src/infrastructure/db/browser-settings-local-data-service.ts`, `src/infrastructure/storage/storage-contracts.ts`.

## Test Coverage Gaps

**No automated coverage report or threshold gate:**
- What's not tested: `package.json` exposes unit, E2E, lint, typecheck, and build commands, while `vitest.config.ts` has no coverage provider, reporting configuration, or thresholds.
- Files: `package.json`, `vitest.config.ts`, `playwright.config.ts`.
- Risk: a growing test suite can leave large client workflows and error paths unmeasured, so test-count growth does not show whether changed code remains covered.
- Priority: Medium.

**Settings-to-Quick-Metronome propagation lacks an end-to-end regression:**
- What's not tested: `tests/e2e/settings-local-data.spec.ts` proves settings persist and reset, and `tests/unit/quick-metronome-session.test.ts` exercises Quick Metronome with fixed defaults; neither asserts that saved settings initialize `/quick-metronome`.
- Files: `tests/e2e/settings-local-data.spec.ts`, `tests/unit/quick-metronome-session.test.ts`, `src/components/settings/settings-experience.tsx`, `src/components/quick-metronome/quick-metronome-experience.tsx`.
- Risk: the current defaults mismatch remains unnoticed by settings and Quick Metronome tests independently.
- Priority: High.

**Storage recovery and high-volume input paths lack browser-level fault coverage:**
- What's not tested: unit tests mock partial cleanup failures, but there is no reload-time reconciliation test for partial recording commits, no multi-tab write test, and no large PDF/image/audio fixture that asserts limit handling or bounded rendering.
- Files: `tests/unit/browser-settings-local-data-service.test.ts`, `tests/unit/sheet-practice-recording.test.ts`, `tests/e2e/settings-local-data.spec.ts`, `src/lib/recordings-review/artifact-storage.ts`, `src/infrastructure/files/sheet-import-adapter.ts`, `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts`.
- Risk: browser quota, corrupted/orphaned local data, and resource-exhaustion failures can reach users without an automated recovery or responsiveness check.
- Priority: High.

**Durable session events have schema and injected-sink tests but no browser persistence test:**
- What's not tested: event validation and service behavior receive unit coverage through `tests/unit/practice-session-events.test.ts` and `tests/unit/practice-session-service.test.ts`, but the browser service has no event sink or durable event-read integration test.
- Files: `tests/unit/practice-session-events.test.ts`, `tests/unit/practice-session-service.test.ts`, `src/infrastructure/db/browser-practice-session-service.ts`, `src/services/practice-session/service.ts`.
- Risk: callers can appear to capture events while no local history remains available to a user-facing read model.
- Priority: High.

---

*Concerns audit: 2026-07-25*
