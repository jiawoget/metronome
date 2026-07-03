# P5-02 Library Tags Favorites UI Plan

## Slice

- Slice id: P5-02 `library-tags-favorites-ui`
- Pack: Pack 5 Library / Viewer Upgrade
- Product feature: `library.tags-favorites`
- Product contract: `docs/v1/04-sheet-library.md`
- Slice file: `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- Builds on: P5-01 `library-tags-favorites-domain`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Recommended implementation tier: Tier C, focused UI plus browser E2E
- Status: planning artifact only; no product source code changed by this plan

## Refined Scope

Add the smallest visible UI that exposes the P5-01 sheet organization metadata:

- show each sheet's current tags in the library list;
- add/remove/replace tags from a sheet through the existing sheet library service;
- toggle favorite/unfavorite from each sheet row;
- filter the visible list by favorites only;
- filter the visible list by one tag text;
- keep search/category filtering working and composed with the new filters;
- prove tag/favorite state survives page reload through the existing repository/service path.

This slice should stay inside the existing Sheet Library page experience. It should extend the current single-page library list rather than adding a sheet detail route, tag management page, shared tag picker, folder system, or reusable organization framework.

## Exact UI Scope

### Sheet Row Controls

For every visible sheet card in `SheetLibraryExperience`:

- Add a favorite toggle button near the existing row actions.
  - Use a lucide icon, preferably `Star`.
  - Accessible name must include the action and sheet name, for example `Favorite Winter Etude` / `Unfavorite Winter Etude`.
  - Visual state must clearly show favorite vs not favorite.
  - The button calls `browserSheetLibraryService.setSheetFavorite({ sheetId, favorite })`.
  - While a favorite mutation is in flight, disable that sheet's favorite button.
  - On success, replace that sheet in local `sheets` state with the returned `result.sheet`.
  - On failure, show the service message in the existing status/error message area.

- Show current tags as small text chips below the main metadata.
  - Empty state can be a quiet `No tags` label.
  - Do not create tag colors, tag counts, tag suggestions, or tag grouping.
  - Chips are display only unless the implementation chooses a small remove button per chip; removal must still call the service with a full next tag array.

- Add one simple tag edit control per row.
  - Preferred smallest UI: an `input` labelled `Edit tags for <sheet name>` containing a comma-separated draft string, plus a `Save tags` button.
  - Convert the draft string to `tags` with only shallow UI splitting: `draft.split(",")`.
  - Do not trim, normalize, validate, dedupe, lowercase, cap length, or cap count in React. P5-01 service/domain helpers own those rules.
  - The save path calls `browserSheetLibraryService.setSheetTags({ sheetId, tags })`.
  - If the service rejects invalid tags, show its message and keep the user's draft visible for correction.
  - On success, update the matching sheet in local state and refresh the draft from `result.sheet.tags.join(", ")`.

This is intentionally not an advanced tag editor. The UI is allowed to use comma-separated entry even though commas are invalid inside a tag, because P5-01 already defines comma rejection. Do not add autocomplete, recently used tags, tokenized keyboard behavior, drag sorting, or a global tag model in this slice.

### Filter Controls

Extend the existing filter area in `SheetLibraryExperience`:

- Keep the current search input.
- Keep the current fixed category select.
- Add a favorites-only filter.
  - Preferred smallest UI: a button or checkbox with accessible name `Show favorites only`.
  - State maps to P5-01 filter option `favorite: "favorites"` when enabled, and `"all"` when disabled.

- Add one tag filter input.
  - Accessible label: `Tag filter`.
  - Placeholder can be `Filter by tag`.
  - Pass the raw input string to `filterSheets(..., { tag })`.
  - Do not normalize or validate the tag filter in React.

- Update the existing `visibleSheets` memo to call:

```ts
filterSheets(sheets, {
  query,
  category: categoryFilter,
  favorite: favoritesOnly ? "favorites" : "all",
  tag: tagFilter
})
```

Do not add a tag sidebar, tag cloud, global saved filters, sort order changes, or URL query params. Those are bigger library-management features and are not needed for P5-02.

## Reuse And Code Boundary

Required reuse:

- Use `filterSheets(...)` from `src/domain/sheet/filters.ts` for all search/category/favorite/tag composition.
- Use `SheetFavoriteFilter` or existing exported filter types if helpful.
- Use `browserSheetLibraryService.setSheetTags(...)` for tag writes.
- Use `browserSheetLibraryService.setSheetFavorite(...)` for favorite writes.
- Use returned `SheetListItem` values from the service to update React state.
- Keep all persistence through `src/services/sheet-library/**` and `src/infrastructure/files/sheet-library-repository.ts`.

Do not:

- call Dexie, IndexedDB, or repository methods from React;
- import `normalizeSheetTag`, `normalizeSheetTags`, or `validateSheetOrganizationInput` into the component for UI-side business rules;
- duplicate P5-01 tag normalization, duplicate removal, max count, max length, or malformed input rules in React;
- create a second tag state store, tag table, context provider, hook library, or reusable tag component suite;
- change `ImportedSheet` organization data shape;
- change artifact persistence, import preview, delete, or Sheet Practice routing behavior.

The likely production file is:

- `src/components/sheet-library/sheet-library-experience.tsx`

Touch `src/app/sheet-library/page.tsx` only if the implementation needs a prop or import shape change, which is not expected.

## Accessibility Expectations

- Every new input/button must have a stable accessible name.
- Favorite toggle must expose state through text, `aria-pressed`, or both.
- Tag save errors must reuse the existing `role="alert"` path.
- Successful favorite/tag updates should reuse the existing `role="status"` path.
- Disabled mutation buttons must be keyboard-focus-safe and not silently swallow errors.
- Controls must work by keyboard only: tab to filter, type, save tags, toggle favorite.
- Do not rely only on color to indicate favorite state; include icon/text or pressed state.

## Responsive Expectations

- New filter controls should fit the existing filter grid without horizontal scrolling.
- On mobile, controls can stack vertically using the existing responsive grid style.
- Sheet row actions should remain usable in the current `flex-col` mobile layout.
- Tag chips must wrap within the sheet card and never force overflow.
- The implementation should avoid nested cards and avoid a new page section. Keep the current list-card pattern.

## Persistence And Reload Behavior

Persistence must flow through the existing service/repository only:

- favorite toggle calls service -> repository row update -> returned sheet updates local state;
- tag save calls service -> repository row update -> returned sheet updates local state;
- reload calls `browserSheetLibraryService.listSheets()` and displays persisted tags/favorite;
- filters after reload operate on returned `SheetListItem` values.

Expected behavior:

- New imported sheets show no tags and not favorite.
- Toggling favorite survives page reload.
- Saving tags survives page reload.
- Metadata edits continue to preserve tags/favorite.
- Delete still removes the sheet and artifact; no separate tag cleanup exists.
- Existing legacy sheets with missing organization fields display as no tags and not favorite.

## Out Of Scope

- Batch import and mixed success/failure summary.
- Recent practice summaries.
- Review-by-sheet links.
- Sheet detail route.
- Viewer thumbnails, page jump, zoom/pan, assisted page turning, or any viewer work.
- Tag database, tag ids, tag colors, tag counts, saved tag list, tag suggestions, folders, or smart collections.
- URL-synchronized filters.
- Import/export, backup/restore, cloud sync, accounts, sharing, or cross-device merge.
- Status closeout, commit, PR, merge, or product code changes by the planning agent.

## Acceptance Criteria

- Sheet Library visibly shows favorite state for each sheet.
- Users can favorite and unfavorite a sheet from the library list.
- Sheet Library visibly shows tags for each sheet.
- Users can save tags for a sheet from the library list.
- Invalid tag writes show the P5-01 service error and do not pretend success.
- Favorite-only filter shows only favorite sheets.
- Tag filter shows sheets matching the requested tag and composes with existing search/category filters.
- Existing search and fixed category filter still work.
- Favorite and tag changes persist after page reload.
- Existing import, edit metadata, open Sheet Practice, and delete flows keep working.
- No React-side duplicate tag normalization/business logic is introduced.

## Boundary And Negative Cases

- Blank tag draft should clear tags only if the service accepts an empty tag array after shallow splitting/filtering; otherwise show the service error. Prefer sending `[]` for an all-blank draft so users can remove all tags.
- Duplicate tag draft such as `Focus, focus` should save according to the service result, not React dedupe.
- Whitespace-heavy draft should save according to service normalization.
- Invalid draft such as `bad,tag` may become two tags if the UI splits on comma. To test comma rejection, use a service/component unit test that calls the save handler path with an invalid value only if the final UI supports such input. Browser E2E should focus on user-realistic valid tags plus a visible invalid case such as an overlong tag.
- Overlong tag error must remain visible and leave prior persisted tags unchanged.
- Missing sheet update or service failure should show the returned service message and leave local state unchanged.
- Favorite mutation failure should not flip local UI optimistically unless the code rolls back correctly. Preferred smallest implementation: update only after success.

## Test Coverage Plan

### Unit / Component Coverage

Add focused component coverage for `SheetLibraryExperience` if the project already has the required React Testing Library setup available. If the current repo has no sheet-library component test harness, keep component coverage minimal and use the existing E2E path for visible behavior.

Preferred component assertions:

- Initial render shows `No tags` and an unpressed favorite control for imported sheets without organization fields.
- Clicking favorite calls `setSheetFavorite` through the existing browser service mock and updates the visible state from the returned sheet.
- Saving tags calls `setSheetTags` with the raw split draft and updates chips from the returned sheet.
- Service tag validation error displays in the existing alert/status area.
- Favorite-only and tag filter controls update the visible list by relying on `filterSheets`.

Do not add new domain tests for tag normalization in P5-02 unless implementation changes P5-01 helpers. Existing coverage already lives in:

- `tests/unit/sheet-library-domain.test.ts`
- `tests/unit/sheet-library-service.test.ts`
- `tests/unit/sheet-library-repository.test.ts`

If P5-02 touches the service or domain despite this plan, add focused tests in the existing files for only the touched behavior.

### E2E Coverage

Extend `tests/e2e/sheet-library.spec.ts` rather than creating a second broad sheet-library spec.

Required browser coverage:

- Import a real PDF fixture as the existing spec already does.
- Favorite the imported sheet through the visible control.
- Add tags such as `Warm Up, Focus` through the visible tag control.
- Assert the favorite state and tag chips are visible.
- Reload the page and assert favorite state and tags are still visible.
- Use `Show favorites only` and confirm the favorite sheet remains visible.
- Add/import or reuse another non-favorite sheet and confirm favorites-only hides it.
- Use `Tag filter` with `focus` and confirm the tagged sheet remains visible.
- Combine tag filter with fixed category filter and existing search at least once.
- Try an invalid visible tag input, preferably an over-24-character tag, assert the service error is visible, and assert the prior valid tags remain visible.

Keep the existing import, edit metadata, open Sheet Practice, delete, unsupported file, bad PDF, and bad image assertions unless the spec becomes too large. If runtime becomes excessive, split only the new tag/favorite UI into a second focused test in the same file, reusing the same `clearSheetDatabase` helper and real fixture import.

### Reload / Persistence Evidence

The E2E must verify persistence from the user-visible UI after `page.reload()`.

If direct IndexedDB polling is updated, extend `getSheetPersistence(...)` to include:

```ts
tags: string[];
favorite: boolean;
```

But direct IndexedDB inspection is supporting evidence only. The main acceptance check is visible reload behavior through `listSheets()`.

## Verification Commands For Coding Agent

Focused unit/component verification, adjusted to actual changed test files:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-library-domain.test.ts tests/unit/sheet-library-service.test.ts tests/unit/sheet-library-repository.test.ts
```

If a component unit test is added, include it in the same command:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-library-experience.test.tsx tests/unit/sheet-library-domain.test.ts tests/unit/sheet-library-service.test.ts tests/unit/sheet-library-repository.test.ts
```

Browser verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-library.spec.ts
```

Type/lint/diff checks:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-library/sheet-library-experience.tsx tests/e2e/sheet-library.spec.ts
git diff --check
```

If exact changed files differ, run the same command shape against the actual changed source/test files and report why they differ.

## Model Tier Recommendation

- Planning agent: `gpt-5.5`, medium effort, standard speed
- Coding agent: `gpt-5.5`, medium or high effort, standard speed
- Review agent: `gpt-5.4-mini`, high effort, standard speed
- Verification agent: `gpt-5.4-mini`, high effort, standard speed

Rationale: this is Tier C because it changes visible UI and requires browser E2E. It should remain a small UI slice because P5-01 already owns domain, service, repository, and persistence semantics.

Escalate only if implementation discovers missing P5-01 service/domain support, a need for repository migration, or a broader Sheet Library component split. The default plan expects none.

## Planning Validation

For this planning-only slice:

```powershell
Get-Content -Raw docs/v1/status.json | ConvertFrom-Json | Out-Null
git diff --check
```

## Handoff Notes For P5-02 Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P5-02-library-tags-favorites-ui.md`
- `docs/v1/implementation-slices/plans/P5-01-library-tags-favorites-domain.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/04-sheet-library.md`
- `src/components/sheet-library/sheet-library-experience.tsx`
- `src/app/sheet-library/page.tsx`
- `src/domain/sheet/**`
- `src/services/sheet-library/**`
- `tests/unit/sheet-library-domain.test.ts`
- `tests/unit/sheet-library-service.test.ts`
- `tests/unit/sheet-library-repository.test.ts`
- `tests/e2e/sheet-library.spec.ts`

Implement P5-02 only. Add visible tag/favorite controls and filters using the P5-01 helper/service APIs. Do not add product scope from P5-03 through P5-12, do not create a tag database, do not modify viewer behavior, and do not duplicate tag normalization in React.
