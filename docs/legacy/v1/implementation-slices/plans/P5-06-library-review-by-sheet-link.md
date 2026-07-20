# P5-06 Library Review By Sheet Link Plan

## Slice

- Slice id: P5-06 `library-review-by-sheet-link`
- Pack: Pack 5 Library / Viewer Upgrade
- Product feature: `library.review-by-sheet`
- Product contract: `docs/v1/04-sheet-library.md`
- Slice file: `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- Builds on: P5-04 `library-recent-practice-summary-source` and P5-05 `library-recent-practice-summary-ui`
- Planning model: `gpt-5.5`, medium effort, standard-only/no-fast
- Ponytail mode: full; reuse existing Sheet Library row actions and Recordings Review filters
- Recommended implementation tier: Tier C, focused UI/query navigation plus browser E2E
- Status: planning artifact only; no product source code changed by this plan

## Refined Scope

P5-06 adds a compact path from a Sheet Library row to Recordings Review already filtered to recordings for that sheet.

This slice owns:

- a stable URL contract for sheet-filtered Recordings Review;
- one secondary `Review recordings` action on each Sheet Library row;
- initial Recordings Review query consumption for `sheetId`;
- filtering existing review recordings by exact linked `recording.sheetId`;
- a visible active-sheet filter affordance with a clear action;
- focused helper/component/unit coverage plus browser E2E proof from Sheet Library to Recordings Review.

This slice does not own:

- new route pages, dynamic `/recordings/[sheetId]` routes, or sheet detail pages;
- new persistence, schema/index/repository changes, migrations, backfills, or caches;
- new recording grouping, aggregation, tag/favorite/archive logic, or search logic;
- changing P5-04/P5-05 summary derivation or rendering;
- viewer thumbnails, page jump, zoom/pan, assisted page turning, or P5-07+ work;
- cloud/network features, account state, sharing, or new dependencies;
- rewriting `RecordingsReviewExperience`.

## Current Code Shape

Relevant existing files:

- `src/components/sheet-library/sheet-library-experience.tsx`
  - Already renders current sheet cards with import/filter/favorite/tag/edit/delete actions.
  - `Open Sheet Practice` is the primary row action and uses `getSheetPracticeHref(sheet.id)`.
  - P5-05 recent practice summary UI is already present and joins summaries by `sheet.id`.
- `src/app/recordings/page.tsx`
  - Thin page that renders `<RecordingsReviewExperience />`.
  - No current `searchParams` pass-through.
- `src/components/recordings-review/recordings-review-experience.tsx`
  - Client component with local `searchQuery`, `typeFilter`, `archiveFilter`, `favoritesOnly`, and `tagFilter` state.
  - Calls `filterRecordings(...)`, then `groupRecordingsByTake(...)`; this is the boundary to preserve.
  - Empty filtered state is already `No recordings match the current filters.`
- `src/lib/recordings-review/history.ts`
  - Owns `filterRecordings(...)`, type/archive/favorite/tag/search helpers, and continuation href helpers.
  - Good place for a tiny `sheetId` filter extension or helper.
- `src/domain/sheet/routes.ts`
  - Existing route helpers use `URLSearchParams` and trim optional query values.

## URL And Query Contract

Use:

```text
/recordings?sheetId=<encoded sheet id>
```

Semantics:

- Query key is exactly `sheetId`.
- Value is decoded by `URLSearchParams` / Next search params and then trimmed.
- Blank, whitespace-only, missing, or malformed-only values are treated as no sheet filter.
- Exact match only: a recording matches when `recording.type === "sheet"` and `recording.sheetId?.trim() === normalizedSheetId`.
- Quick recordings never match a sheet filter because their `sheetId` is `null`.
- Sheet ids with spaces, slashes, punctuation, or unicode must round-trip through normal URL encoding.
- Do not add a separate `sheetName`, `sheetTitle`, `recordingType`, or `source` query parameter.
- Do not synchronize the existing search/type/archive/favorites/tag filters into the URL in this slice.

Preferred helper:

```ts
export function getRecordingsReviewBySheetHref(sheetId: string) {
  const normalized = sheetId.trim();
  const params = new URLSearchParams();

  if (normalized) {
    params.set("sheetId", normalized);
  }

  const query = params.toString();

  return query ? `/recordings?${query}` : "/recordings";
}
```

Place it in the smallest existing route/helper location that fits local style. Good options:

- `src/domain/sheet/routes.ts` if the action is sheet-originated and this avoids creating a new recordings route module;
- or `src/lib/recordings-review/history.ts` if the team prefers review-route helpers near review helpers.

Do not create a new routing abstraction just for one query link.

## Sheet Library UI Contract

Add one compact secondary row action:

- Label: `Review recordings`
- Href: `getRecordingsReviewBySheetHref(sheet.id)`
- Variant: secondary/quiet, below or beside `Open Sheet Practice`
- Icon: use an existing lucide icon such as `ListMusic` or `AudioLines` only if it matches current button style.

Behavior:

- `Open Sheet Practice` remains the primary action and keeps its current label, href, and visual weight.
- `Review recordings` appears for every current sheet row, even when the P5-05 summary says no local practice summary yet. The Recordings Review page owns the no-recordings result.
- The link must not depend on the P5-04 summary loading or summary success state.
- The link must not modify sheet filters, favorites, tags, metadata, or practice summary state.
- Keep the row action stack compact on desktop and wrapping on mobile; no nested card or new sheet detail panel.

## Recordings Review Filter Contract

Smallest implementation:

1. Treat the normalized `sheetId` query as the source of truth for the sheet filter.
   - Page-level parsing is fine if the page passes a prop that updates when `searchParams` changes.
   - Client-level `useSearchParams()` is also fine if it stays small.
   - A keyed/remounted client component is acceptable if that is the smallest reliable way to avoid stale query state.
2. Normalize the current URL sheet id on every relevant URL/query change:
   - `const sheetFilterId = searchParams.sheetId?.trim() || null`
   - if using `ReadonlyURLSearchParams`, use `searchParams.get("sheetId")?.trim() || null`.
   - Do not store this as one-time `initialSheetId` state unless there is an explicit update path when the URL changes.
3. Extend `filterRecordings(...)` with an optional `sheetId?: string | null`, or add a tiny helper next to it and call it immediately before grouping.
4. Keep `groupRecordingsByTake(...)`, comparison selection, selected-recording fallback, markers, archive/favorite/tag/search filtering, and take selection logic unchanged.

Recommended filter order:

- Existing `filterRecordings(...)` should continue to handle type/archive/favorite/tag/search and sorting.
- Add the sheet predicate inside that helper so one helper still defines visible recordings.
- Sheet id filtering should compose with all other filters:
  - active archive filter still hides archived recordings by default;
  - archived/all archive modes can reveal archived recordings for the same sheet;
  - favorites-only and tag filters narrow the same sheet-filtered set;
  - type `quick` plus active sheet filter returns no matches;
  - type `sheet` plus active sheet filter returns matching sheet recordings;
  - search narrows within the sheet-filtered set.

Do not duplicate grouping/aggregation:

- No new grouping by sheet.
- No P5-04 summary source call in Recordings Review.
- No sheet-library service call just to filter recordings.
- No live sheet lookup is required for stale/deleted sheet ids.

## Active Sheet Filter UI

When a valid normalized `sheetId` query is present:

- Show a compact filter chip/banner near the existing filter controls.
- Text should be honest without requiring a sheet lookup, for example:
  - `Sheet filter: <sheet id>`
  - If at least one visible or loaded matching recording has `sheetName`, the UI may display `Sheet filter: <sheetName>` and include the id in accessible text or title.
- Include a clear control:
  - Label: `Clear sheet filter`
  - Href or button action: `/recordings`

Preferred clear behavior:

- Use `<Link href="/recordings">Clear sheet filter</Link>` for the smallest reliable browser-history behavior.
- If the implementation chooses `router.replace`, it must still preserve sane back/forward behavior and avoid adding URL sync for the other filters.

Empty state:

- If there are recordings overall but none match the active sheet filter plus current filters, reuse the existing filtered empty area but make the copy more specific when cheap:
  - `No recordings match this sheet filter.`
  - If other filters are also active, `No recordings match this sheet filter and the current filters.`
- If there are no saved recordings at all and a valid normalized `sheetId` query is present, still show the active sheet filter UI and `Clear sheet filter` control above the existing global empty state. Do not redesign the empty state.

## Boundary And Edge Cases

- Sheet id with matching recordings:
  - `/recordings?sheetId=sheet-alpha` shows only sheet recordings whose normalized `sheetId` is `sheet-alpha`.
  - Segment and whole-sheet take groups for that sheet both remain visible.
- Sheet id with no recordings:
  - Recordings Review renders the active sheet filter and a no-match state.
  - It must not fake recordings from P5-04 summaries.
- Stale/deleted sheet id:
  - Same as no recordings unless historical recordings still carry that exact `sheetId`.
  - Do not call Sheet Library to validate the id.
- Blank/malformed query values:
  - `/recordings?sheetId=`, `/recordings?sheetId=%20`, and missing `sheetId` act like plain `/recordings`.
  - Bad percent-encoding should be left to the platform/router; do not add custom decoding.
- Quick recordings:
  - Hidden under an active sheet filter.
  - Reappear after clearing the sheet filter if other filters allow them.
- Archived recordings:
  - Default `active` archive mode hides archived matching sheet recordings.
  - `Archived recordings` shows archived matching sheet recordings only.
  - `All including archived` shows both active and archived matching sheet recordings.
- Favorites/tag/type/search filters:
  - Compose with sheet filter without resetting it.
  - Changing these controls does not mutate the URL.
- Reload:
  - Reloading `/recordings?sheetId=<id>` reapplies the sheet filter from the query.
- Browser back/forward:
  - Clicking `Review recordings` creates a normal navigation entry from Sheet Library to Recordings Review.
  - Clicking `Clear sheet filter` navigates to `/recordings`; browser Back should restore the sheet-filtered URL.
  - No extra history entries should be created from typing in search or changing local filters.
- Selected recording:
  - Existing fallback to the first visible recording is acceptable.
  - If the current selected id is filtered out, details should move to the first visible recording or empty details exactly as current behavior does.
- Comparison selection:
  - Existing bounded selection should continue to derive from `visibleRecordingIds`; hidden sheet/quick recordings must not remain selected as visible selections.

## Likely Files And Areas

Expected production files:

- `src/domain/sheet/routes.ts`
  - Add `getRecordingsReviewBySheetHref(...)`, unless a nearby recordings route helper already exists at coding time.
- `src/components/sheet-library/sheet-library-experience.tsx`
  - Import the helper and add the secondary row action.
- `src/app/recordings/page.tsx`
  - Optionally accept `searchParams` and pass a normalized current sheet-filter value to the client component.
- `src/components/recordings-review/recordings-review-experience.tsx`
  - Accept `sheetFilterId?: string | null` or read `useSearchParams()` directly, apply the URL-driven filter, and render the active filter UI.
- `src/lib/recordings-review/history.ts`
  - Extend `filterRecordings(...)` with optional `sheetId`, or add one tiny adjacent helper.

Expected tests:

- `tests/unit/recordings-review-history.test.ts`
- `tests/unit/sheet-library-experience.test.tsx`
- Optional `tests/unit/recordings-review-experience.test.tsx` only if a focused render test can be added with narrow mocks.
- `tests/e2e/recordings-review.spec.ts`
- Optional `tests/e2e/sheet-library.spec.ts` only if the link needs proof from imported real Sheet Library rows rather than seeded review data.

Avoid:

- `docs/v1/status.json`
- package and lock files
- schema/index/migration files
- repository files
- P5-04/P5-05 source/service semantics
- broad layout/component decomposition
- new route pages

## Acceptance Criteria

1. Every Sheet Library row has a compact `Review recordings` link to `/recordings?sheetId=<encoded sheet id>`.
2. `Open Sheet Practice` remains the primary row action and is not renamed, removed, or visually displaced.
3. Recordings Review normalizes the initial `sheetId` query and applies it to existing visible-recording filtering.
4. Sheet filtering matches exact linked `recording.sheetId` and never includes quick recordings.
5. Existing search, type, archive, favorite, and tag filters continue to compose with the sheet filter.
6. Existing take grouping, take summaries, comparison selection, marker display, audio playback, export, delete, favorite/tag/archive controls, and practice-again hrefs continue to work for the filtered visible set.
7. The page visibly communicates the active sheet filter and provides a clear action to return to `/recordings`.
8. Blank/whitespace query values behave like no sheet filter.
9. Stale/deleted/no-recording sheet ids render a no-match state without crashing or performing sheet lookups.
10. Reload preserves the sheet filter from the URL.
11. Browser Back/Forward behaves through normal link navigation.
12. No new persistence, schema, repository, dependency, route page, cloud/network, or viewer work is introduced.

## Test Coverage Plan

### Unit / Helper Tests

Extend `tests/unit/recordings-review-history.test.ts`:

- `filterRecordings` with `sheetId: "sheet-42"` returns only matching sheet recordings.
- Quick recordings and sheet recordings with `sheetId: null`, blank, or another id are excluded.
- Blank `sheetId` option behaves like no sheet filter.
- Sheet id filtering composes with type `sheet`, type `quick`, archive active/archived/all, favorites-only, tag, and search.
- Sorting remains newest-first after filtering.

Add or extend route-helper tests where local style fits:

- `getRecordingsReviewBySheetHref("sheet/alpha")` returns `/recordings?sheetId=sheet%2Falpha`.
- Whitespace is trimmed.
- Blank values return `/recordings` if the helper permits blank input.

Extend `tests/unit/sheet-library-experience.test.tsx`:

- A rendered sheet row includes `Review recordings`.
- The link href encodes the sheet id.
- `Open Sheet Practice` still exists with the original `/sheet-practice/...` href.
- The link is present even when the row has no joined practice summary.

Optional component test:

- Add `tests/unit/recordings-review-experience.test.tsx` only if mocking `useRecordingsReviewController()` stays narrow.
- Assert `sheetFilterId` or current URL `sheetId` renders active filter UI, filters visible rows, and clear link points to `/recordings`.
- Include a rerender or URL-change case if the chosen implementation can otherwise become stale.
- Skip this file if it requires broad media/waveform mocks; the helper plus E2E coverage is enough.

### Browser E2E

Mandatory focused E2E: extend `tests/e2e/recordings-review.spec.ts` with a new small test, reusing existing fixtures:

1. Clear Sheet Library, practice-session, recording-history, and artifact DB state with existing helpers.
2. Import a real Sheet Library fixture through `importTestSheet(page, { name: "Alpha Etude" })` to get the real generated `sheetId`.
3. Import or seed a second sheet, or seed a second recording with a different sheet id.
4. Seed recording history with:
   - two sheet recordings for the imported `sheetId` (one segment, one whole-sheet if cheap);
   - one sheet recording for a different sheet id;
   - one quick recording;
   - one archived recording for the imported `sheetId` if using archive assertions.
5. Seed artifacts with `seedE2ERecordingArtifacts(...)` only if the test clicks details/playback; otherwise visible list assertions can avoid playback.
6. Go to `/sheet-library`, click `Review recordings` on the imported sheet row.
7. Assert the URL has `/recordings?sheetId=<encoded id>`.
8. Assert active filter UI is visible.
9. Assert only recordings for that sheet are visible; quick and other-sheet recordings are hidden.
10. Change search/type/tag/favorites/archive filters enough to prove composition:
    - `Type filter = quick` yields the no-match state;
    - `Type filter = sheet` restores matching sheet recordings;
    - `Archive filter = archived` shows archived matching sheet recording if seeded.
11. Reload and assert the sheet filter remains active.
12. Click `Clear sheet filter`, assert URL is `/recordings`, and assert quick/other-sheet recordings can reappear when current local filters allow them.
13. Use browser Back to return to the filtered URL if the test remains stable.

Negative E2E if feasible in the same test:

- Navigate directly to `/recordings?sheetId=stale-sheet-id`.
- Assert active filter UI plus no-match state.
- Navigate to `/recordings?sheetId=%20` or `/recordings?sheetId=` and assert it behaves like plain `/recordings`.

Direct seeded `/recordings?sheetId=...` tests may be added for stale/blank query cases, but they are not a substitute for the mandatory Sheet Library row click path. Do not add app-only test hooks.

## Verification Commands For Coding Agent

Adjust file lists to final implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/recordings-review-history.test.ts tests/unit/sheet-library-experience.test.tsx
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/recordings-review.spec.ts --project=chromium
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/sheet/routes.ts src/components/sheet-library/sheet-library-experience.tsx src/app/recordings/page.tsx src/components/recordings-review/recordings-review-experience.tsx src/lib/recordings-review/history.ts tests/unit/recordings-review-history.test.ts tests/unit/sheet-library-experience.test.tsx tests/e2e/recordings-review.spec.ts
git diff --check
```

If no production change is made in one listed file, remove it from scoped lint. If a narrow `recordings-review-experience` component test is added, include it in unit and lint commands.

## Model Gates

- Planning agent: `gpt-5.5`, medium effort, standard-only/no-fast
- Coding agent: `gpt-5.5`, high effort, standard-only/no-fast
- Code review agent: `gpt-5.5`, extra-high effort, standard-only/no-fast
- Verification agent: `gpt-5.5`, high effort, standard-only/no-fast
- Web ChatGPT planning/PR gates: Extra High, not Pro

Reason: this is a focused Tier C UI/navigation slice, but it touches two main user workflows and query-driven browser behavior.

## Handoff Notes For P5-06 Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P5-06-library-review-by-sheet-link.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/04-sheet-library.md`
- `src/domain/sheet/routes.ts`
- `src/components/sheet-library/sheet-library-experience.tsx`
- `src/app/recordings/page.tsx`
- `src/components/recordings-review/recordings-review-experience.tsx`
- `src/lib/recordings-review/history.ts`
- `tests/unit/recordings-review-history.test.ts`
- `tests/unit/sheet-library-experience.test.tsx`
- `tests/e2e/recordings-review.spec.ts`
- `tests/e2e/fixtures/sheets.ts`
- `tests/e2e/fixtures/recordings-review.ts`
- `tests/e2e/fixtures/storage.ts`

Implement P5-06 only. The shortest correct path is one route helper, one Sheet Library link, one optional sheet-id filter parameter in the existing Recordings Review filtering helper, and one active-filter chip with a clear link.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Persisting all Recordings Review filters in the URL | Future reviewed navigation/filter slice |
| Friendly stale-sheet name lookup in Recordings Review | Future reviewed library/review integration slice, only if users need it |
| Dedicated sheet detail/history page | Future reviewed library slice |
| Sort/filter Sheet Library by recordings count or recent practice | Future reviewed library slice |
| Live subscription refresh while staying on Sheet Library or Recordings Review | Future reviewed slice if needed |
| Viewer thumbnails, page jump, zoom/pan, assisted page turning | P5-07 through P5-12 |
| Cloud sync, sheet sharing, automatic score following, scoring, mistake detection | v2 or future reviewed feature |

## Split Triggers

Stop and return to planning if implementation appears to require:

- a new route page or large route architecture change;
- any repository, schema, migration, cache, or storage contract change;
- fetching Sheet Library data from Recordings Review to validate the filter;
- duplicating take grouping, summary aggregation, archive/favorite/tag/search filtering, or waveform logic;
- rewriting `RecordingsReviewExperience` or splitting it broadly;
- changing P5-04/P5-05 summary source/UI semantics;
- production-code changes above roughly 250-300 LOC excluding tests;
- a new dependency or package/lockfile change.
