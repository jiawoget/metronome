# P5-05 Library Recent Practice Summary UI Plan

## Slice

- Slice id: P5-05 `library-recent-practice-summary-ui`
- Pack: Pack 5 Library / Viewer Upgrade
- Product feature: `library.recent-practice-summary`
- Product contract: `docs/v1/04-sheet-library.md`
- Slice file: `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- Builds on: P5-04 `library-recent-practice-summary-source`
- Planning model: `gpt-5.5`, medium effort, standard-only/no-fast
- Ponytail mode: full; reuse existing `SheetLibraryExperience` and `browserPracticeSessionService`, smallest visible UI addition
- Recommended implementation tier: Tier C, focused UI plus browser E2E
- Status: planning artifact only; no product source code changed by this plan

## Refined Scope

P5-05 shows compact recent practice summaries on current Sheet Library rows by joining the existing sheet list with the verified P5-04 summary source.

This slice owns:

- loading `browserSheetLibraryService.listSheets()` and `browserPracticeSessionService.getLibraryRecentPracticeSummaryBySheet(...)` together from `SheetLibraryExperience`;
- joining summaries to current `SheetListItem` rows by exact `sheet.id`;
- rendering a compact per-sheet practice summary on each visible sheet card when history exists;
- rendering an honest per-sheet no-history state when the sheet has no joined summary;
- containing summary loading and summary-read failure without breaking sheet import/list/filter/edit/open/delete behavior;
- focused component/unit coverage if the existing mock shape stays simple, plus browser E2E proof using real Sheet Library rows and seeded local practice data.

This slice does not own:

- review-by-sheet navigation, links to Recordings Review, query params, or filtered review routes;
- new sheet detail routes or expanded practice-history pages;
- new repositories, schema/index/migration work, localStorage/IndexedDB cache keys, denormalized sheet fields, or backfills;
- new practice summary derivation logic in React;
- changes to P5-04 selector/service semantics;
- recording artifact/blob/audio reads, waveform previews, thumbnails, page jump, zoom/pan, or assisted page turning.

## Current Code Shape

Relevant existing files:

- `src/components/sheet-library/sheet-library-experience.tsx`
  - Single client component for import, filtering, cards, tag/favorite edits, metadata edits, open, and delete.
  - Loads sheets once in `useEffect` through `browserSheetLibraryService.listSheets()`.
  - Stores `sheets`, `loading`, `message`, and per-row mutation state locally.
  - Filters via `filterSheets(...)` and maps `visibleSheets` into cards.
  - Already renders `Last practiced` from `sheet.lastPracticedAt`, but that field is only a sheet-library convenience and does not include session count, recording count, total duration, or segment count.
- `src/infrastructure/db/browser-practice-session-service.ts`
  - Browser singleton already wires `createPracticeSessionService(...)` to the existing practice-session repository and recording metadata repository.
- `src/services/practice-session/types.ts`
  - Exposes `getLibraryRecentPracticeSummaryBySheet(options?)`.
- `src/domain/practice/types.ts`
  - P5-04 summary item fields are `sheetId`, `lastPracticedAt`, `lastSessionId`, `latestRecordingId`, `sessionCount`, `recordingCount`, `durationMs`, and `segmentPracticeCount`.
- `tests/e2e/fixtures/storage.ts`
  - Already exports `PRACTICE_SESSION_DB_NAME`, `RECORDING_HISTORY_STORAGE_KEY`, `clearSheetLibraryTestState(...)`, `seedRecordingHistory(...)`, and practice snapshot helpers.

## Reuse Checkpoint

Before coding, confirm these stay true:

1. The UI can call `browserPracticeSessionService.getLibraryRecentPracticeSummaryBySheet({ limit })`.
2. The UI can join the returned `items` to `sheets` by `sheet.id` without changing `SheetListItem`.
3. Visible strings can be formatted locally with tiny helpers only; no new domain/service layer is needed.
4. Reload behavior comes from existing persisted sheets plus existing P5-04 practice-session/recording metadata reads.

Expected answers:

- Yes. P5-04 is verified and already exposed on the browser service.
- Yes. Missing/deleted sheets are naturally ignored because only current `sheets` are rendered.
- Yes. Formatting dates, duration, plural labels, and compact count text belongs in the UI.
- Yes. No sheet-library repository, practice-session repository, schema, migration, or cache changes are required.

## Data Loading Boundary

Keep data loading inside `SheetLibraryExperience`.

Preferred smallest shape:

- Add imports:
  - `Clock`, `Music2`, or another existing lucide icon only if useful for a compact visual cue.
  - `browserPracticeSessionService` from `@/infrastructure/db/browser-practice-session-service`.
  - `type LibraryRecentPracticeSummaryBySheetItem` from `@/domain/practice` if a local map type needs it.
- Add state:
  - `practiceSummariesBySheetId: Record<string, LibraryRecentPracticeSummaryBySheetItem>` or `Map<string, LibraryRecentPracticeSummaryBySheetItem>`.
  - `practiceSummaryLoading: boolean`.
  - `practiceSummaryError: string | null`.
- In the existing initial `useEffect`, read sheets and summaries in one effect guarded by `isActive`.
  - Use `Promise.allSettled(...)` or two local `try/catch` reads so sheet-list failure semantics do not get worse.
  - Sheet list read should continue to control the existing `loading` state for the main list.
  - Summary failure should set `practiceSummaryError` only; it must not hide imported sheets or disable existing row actions.
- Request an exhaustive one-shot summary source through the existing `limit` option so a current sheet is not labeled as no-history merely because a small source cap excluded it.
  - P5-04 reads the persisted sessions/recordings before slicing summary items; use a large finite `limit` such as `Number.MAX_SAFE_INTEGER`.
  - Do not pass `undefined` or `Infinity` for this purpose because the verified P5-04 selector normalizes those values back to the default limit.
  - This is not pagination, caching, or scaling work. Do not add pagination or infinite load.
- Build the joined lookup with `useMemo` if using `Map`, or directly after the source resolves if using a record.

Do not:

- call repositories, Dexie, `indexedDB`, `localStorage`, recording artifact services, or P5-04 selector functions from React;
- copy the P5-04 grouping/aggregation logic into the component;
- update sheet `lastPracticedAt` while reading summaries;
- subscribe to practice-session changes unless the existing component already has a clean subscription pattern added before this slice. Initial load plus page reload is enough for P5-05.

## Rendering Scope

Render one compact summary block inside each sheet card near the existing metadata, preferably after the current `<dl>` metadata and before tags.

For a sheet with a joined summary:

- Show last practiced date/time from `summary.lastPracticedAt`.
- Show total practice duration from `summary.durationMs`.
- Show session count.
- Show recording/take count.
- Show segment count only when `segmentPracticeCount > 0`.
- Keep it compact: one small row or a tiny `dl`, not a new nested card.

Suggested display text:

- Label: `Recent practice`
- Recency: `Last practiced Jun 21, 2026`
- Metrics: `42 min · 3 sessions · 2 recordings`
- Segment addition: `1 segment practice`

For a sheet with no joined summary after the exhaustive summary read has settled successfully:

- Show a quiet one-line state such as `No local practice summary yet.`
- Do not show fake zeros in a way that looks like real history.
- Keep the current `Last practiced` metadata for now if it already appears; do not remove or repurpose it in this slice.

For summary loading:

- While sheets are still loading, the existing `Loading sheets...` card is enough.
- If sheets have loaded but summaries are still loading, each visible row should show a quiet `Loading practice summary...` line with `aria-busy`; do not show the no-history state until the summary read has settled.
- Avoid global spinners or a separate page section.

For summary error:

- Show a contained message in the list area, such as `Recent practice summaries could not be loaded.`
- Existing sheet rows remain usable.
- Per-row fallback can be no-history text or omit the summary block while the error message is visible.

## Formatting Rules

Add tiny local helpers in `sheet-library-experience.tsx` unless they become awkward:

- `formatPracticeDuration(durationMs: number)`
  - `0` or invalid: `<1 min` only if there is a real summary row; otherwise no-history state.
  - under 60 minutes: rounded minutes, minimum 1.
  - 60+ minutes: compact hours/minutes, e.g. `1 hr 20 min`, matching the broad style used on Home analytics if practical.
- `formatPracticeDate(value: string)`
  - Use `Intl.DateTimeFormat(undefined, { dateStyle: "medium" })` or include short time if the UI has room.
  - Invalid values should not occur from P5-04; still avoid throwing from the formatter.
- `formatCount(count, singular, plural)`
  - Keep pluralization boring and local.

Do not add a shared formatting library in this slice. Promote helpers later only if another reviewed slice needs the same UI strings.

## UI Design Requirements

This UI must follow:

- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- reference direction: `Design Notes/design_pictures/overall_style_design.png`

Expectations:

- Keep Sheet Library as searchable rows with compact metadata.
- Use the existing light workspace, restrained cards, thin borders, and compact typography.
- Do not create a marketing section, dashboard hero, nested cards, chart, timeline, or decorative illustration.
- Use muted text and small badges/icons for summary facts.
- Maintain the current import, filter, and row-action hierarchy; summaries are secondary metadata, not the primary action.
- Avoid one-note color expansion. The summary can use existing muted/primary tokens only.

## Responsive Expectations

- Desktop: summary facts should fit within the existing sheet-card content column without pushing row actions out of alignment.
- Tablet/iPad landscape: metadata and summary can wrap cleanly; row actions remain usable.
- Narrow mobile: summary facts stack or wrap within the card, with no horizontal scrolling.
- Long sheet names, long artifact filenames, long tags, and long counts must not overlap summary text.
- Tag editing and summary text must not fight for the same row; keep enough vertical spacing.
- Row action buttons must remain reachable after the summary block is added.
- No nested cards inside the sheet card.

## Empty And Error Semantics

- No sheets imported:
  - Keep the existing empty Sheet Library state unchanged.
  - Do not show a separate practice-summary empty panel.
- Sheets imported but no practice summaries:
  - Each row shows quiet no-history text.
  - Do not create fake history, fake dates, fake recordings, or fake segment counts.
- Summaries returned for deleted/missing sheets:
  - Ignore them because the UI joins only current `SheetListItem` rows.
- Summary source rejects:
  - Keep sheet rows visible and existing actions working.
  - Show one contained error message.
  - Do not surface raw stack traces.
- Sheet list rejects:
  - Preserve or minimally improve current behavior only if needed; do not turn P5-05 into a sheet-list error handling rewrite.
- Imported/deleted sheets after initial load:
  - Existing import/delete state updates remain local.
  - Newly imported sheets show no-history until reload or a future subscription/refresh feature.
  - Deleted sheets disappear; any stale summary lookup entry is harmless but may be removed when updating local state if simple.

## Accessibility Expectations

- The summary block should have an accessible label or readable text such as `Recent practice`.
- Loading/error messages should use the existing `aria-live="polite"` area where possible.
- If using icons, they must be decorative with `aria-hidden="true"` unless the icon is the only label.
- Do not rely on color alone for summary meaning.
- Summary text must be visible to screen readers; avoid tooltip-only facts.
- Existing keyboard flows for filters, favorite, tag edit, metadata edit, open, and delete must not regress.

## Likely Files And Areas

Expected production file:

- `src/components/sheet-library/sheet-library-experience.tsx`

Expected tests:

- `tests/e2e/sheet-library.spec.ts`
- Optional focused component test if mocking stays small:
  - `tests/unit/sheet-library-experience.test.tsx`

Existing source/service tests from P5-04 should not need changes:

- `tests/unit/practice-session-duration-rules.test.ts`
- `tests/unit/practice-session-service.test.ts`
- `tests/unit/practice-session-repository.test.ts`

Avoid:

- `src/services/sheet-library/**`
- `src/infrastructure/files/sheet-library-repository.ts`
- `src/domain/sheet/**`
- `src/domain/practice/rules.ts`
- `src/services/practice-session/service.ts`
- `src/infrastructure/db/practice-session-repository.ts`
- `src/infrastructure/db/recording-history-metadata-repository.ts`
- `src/app/recordings/**`
- `src/components/recordings-review/**`
- storage contracts, Dexie schemas, migrations, package files, or lock files
- `docs/v1/status.json`

## Acceptance Criteria

1. Sheet Library rows show compact recent practice summaries for current sheets that have P5-04 summary items.
2. Rows without a joined summary show an honest no-history state only after the exhaustive summary read has settled successfully.
3. The UI joins by current `sheet.id` and ignores summary items for missing/deleted sheets.
4. The summary source is loaded through `browserPracticeSessionService.getLibraryRecentPracticeSummaryBySheet(...)`.
5. Existing Sheet Library import, batch import, search, category filter, favorites filter, tag filter, favorite toggle, tag save, metadata edit, open Sheet Practice, and delete flows still work.
6. Summary loading does not block the sheet list longer than necessary.
7. Summary read failure does not hide sheets or break row actions.
8. No review-by-sheet navigation or Recordings Review filter link is added.
9. No new repository, schema, migration, cache, localStorage key, or denormalized sheet field is added.
10. No React-side summary derivation duplicates P5-04 practice-session source logic.
11. Responsive checks pass on desktop, tablet-like width, narrow mobile, and resize.
12. Empty states remain honest and do not show fake populated practice history.

## Boundary And Negative Cases

- A current sheet with only old `sheet.lastPracticedAt` but no P5-04 summary item should show no local practice summary for P5-05. Do not infer counts from `lastPracticedAt`.
- A current sheet must not show `No local practice summary yet.` merely because a small source limit excluded it. P5-05 must request the exhaustive one-shot source before using that copy.
- A summary item with `recordingCount: 0` should omit recordings or show `0 recordings` only if the final compact string remains clear.
- A summary with `segmentPracticeCount: 0` should not show a segment fact.
- A summary with `durationMs: 0` but real sessions/recordings may show `<1 min`; no-history is only for missing summary rows.
- A service error should not clear `sheets`.
- Filtering should continue to operate on sheet metadata, favorites, and tags only. Do not add a practiced-only filter or sort-by-recent in this slice.
- The Open Sheet Practice button must remain the main navigation action on the row.
- Do not add a `Review recordings` link; P5-06 owns that.

## Test Coverage Plan

### Component / Unit Coverage

Add `tests/unit/sheet-library-experience.test.tsx` only if the browser service mocks stay narrow enough. Use the style from existing React tests with `vi.hoisted(...)` mocks.

Mock:

- `browserSheetLibraryService.listSheets()`
- only the sheet-library service methods that `SheetLibraryExperience` calls during the tested interactions;
- `browserPracticeSessionService.getLibraryRecentPracticeSummaryBySheet()`.

Focused assertions:

- Initial load renders a sheet with summary text from the practice-session source.
- A second sheet without a joined summary shows `No local practice summary yet.`
- No-history text is not shown while the summary source is still pending; the row shows `Loading practice summary...` instead.
- A summary for a missing sheet id is ignored.
- Summary source rejection shows the contained error while the sheet row remains visible.
- Search/category/favorite/tag filtering still leaves summary rendering tied to visible sheets.

Do not add component tests for P5-04 aggregation math. That already belongs to P5-04 unit tests.

### E2E Coverage

Extend `tests/e2e/sheet-library.spec.ts` instead of creating a broad new spec, unless the existing spec becomes too slow or hard to read.

Recommended browser scenario:

1. Use `clearSheetLibraryTestState(page, [SHEET_LIBRARY_DB_NAME, PRACTICE_SESSION_DB_NAME])` and clear recording history.
2. Import a real PDF fixture through the visible Sheet Library flow.
3. Capture the imported sheet id from the Open Sheet Practice href or persisted sheet row.
4. Seed practice-session IndexedDB with one or more sheet sessions for that sheet id, or create history by opening Sheet Practice and performing the smallest reliable metronome/recording action if seeding is not too brittle.
5. Seed recording history metadata if needed for visible recording count, using existing `seedRecordingHistory(...)` shape and P5-04-compatible fields.
6. Reload `/sheet-library`.
7. Assert the row shows `Recent practice`, a duration, session count, and recording count.
8. Import or keep another sheet without practice data and assert it shows the no-history state.
9. Exercise an existing filter such as search or favorites-only and confirm the practiced sheet summary remains correct when visible.

Also add one responsive/visual smoke path if the existing E2E pattern supports it cheaply:

- Set viewport to desktop, tablet-like, and mobile widths.
- Confirm the practiced sheet card, summary text, and row actions are visible with no obvious overlap.

If direct DB/localStorage seeding proves flaky, prefer creating real session data through existing Sheet Practice UI over adding new app-only test hooks.

### Regression Coverage

Run existing focused tests that cover the source and the Sheet Library service:

- P5-04 unit tests remain the proof for summary derivation.
- Sheet Library domain/service/repository tests remain the proof for tag/favorite/list behavior.
- The P5-05 implementation should add only UI tests for rendering/join/loading/error.

## Verification Commands For Coding Agent

Adjust file lists to the final implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-library-experience.test.tsx tests/unit/sheet-library-domain.test.ts tests/unit/sheet-library-service.test.ts tests/unit/practice-session-duration-rules.test.ts tests/unit/practice-session-service.test.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-library.spec.ts --project=chromium
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-library/sheet-library-experience.tsx tests/unit/sheet-library-experience.test.tsx tests/e2e/sheet-library.spec.ts
git diff --check
```

If no component test is added, remove `tests/unit/sheet-library-experience.test.tsx` from commands and explain why E2E carries visible behavior coverage.

## Model Tier Recommendation

- Planning agent: `gpt-5.5`, medium effort, standard-only/no-fast
- Coding agent: `gpt-5.5`, high effort, standard-only/no-fast
- Code review agent: `gpt-5.5`, extra-high effort, standard-only/no-fast
- Verification agent: `gpt-5.5`, high effort, standard-only/no-fast
- Web ChatGPT gates: Extra High, not Pro

Reason: this is focused UI work over a verified source, but it touches the main Sheet Library experience and needs browser evidence across responsive states.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Navigate from a sheet row to Recordings Review filtered by sheet | P5-06 `library-review-by-sheet-link` |
| Recordings Review route/query/filter behavior for sheet ids | P5-06 |
| Sort/filter Sheet Library by recent practice | Future reviewed library slice |
| Dedicated sheet detail route or expanded history panel | Future reviewed library slice |
| Live subscription/refresh after practice-session changes while staying on the library page | Future reviewed slice if needed |
| Pagination/infinite loading for very large libraries | Future reviewed library scaling slice |
| Viewer thumbnails, page jump, zoom/pan, assisted page turning | P5-07 through P5-12 |
| Folder system, cloud sync, sharing, automatic score following, scoring, mistake detection | v2 or future reviewed feature |

## Explicit No-Go Areas

Stop and return to planning if implementation appears to require:

- a new repository, database table, index, schema version, migration, backfill, or cache;
- changing P5-04 summary source semantics;
- reading recording artifacts/blobs/audio to compute UI facts;
- adding Recordings Review links, route params, or filtered review navigation;
- adding a sheet detail page;
- changing import artifact persistence;
- rewriting `SheetLibraryExperience` into a broad component architecture;
- changing Sheet Library sort order or adding practiced-only filters;
- production-code changes above roughly 250-300 LOC excluding tests;
- package dependency or lockfile changes.

## Handoff Notes For P5-05 Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P5-05-library-recent-practice-summary-ui.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/04-sheet-library.md`
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `src/components/sheet-library/sheet-library-experience.tsx`
- `src/infrastructure/db/browser-practice-session-service.ts`
- `src/services/practice-session/types.ts`
- `src/domain/practice/types.ts`
- `tests/e2e/sheet-library.spec.ts`
- `tests/e2e/fixtures/storage.ts`

Implement P5-05 only. The shortest correct path is to extend the existing Sheet Library component with one summary read, one joined lookup, and one compact row-level rendering block.
