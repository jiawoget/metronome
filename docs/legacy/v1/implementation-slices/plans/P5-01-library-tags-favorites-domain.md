# P5-01 Library Tags Favorites Domain Plan

## Slice

- Slice id: P5-01 `library-tags-favorites-domain`
- Pack: Pack 5 Library / Viewer Upgrade
- Product feature: `library.tags-favorites`
- Product contract: `docs/v1/04-sheet-library.md`
- Slice file: `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Recommended implementation tier: Tier B, local persistence/service boundary
- Status: planning artifact only; no product source code changed by this plan

## Refined Scope

Add the non-UI foundation for local sheet organization metadata:

- sheet-level tags;
- sheet-level favorite flag;
- validation/normalization helpers for organization metadata;
- service/repository methods to read and update organization metadata;
- backward-compatible loading for existing sheets that do not yet have these fields;
- search helper support so P5-02 can filter by tags/favorite without inventing domain logic.

Use the existing Sheet Library persistence boundary. The current repository stores `ImportedSheet` rows in the `sheets` table and already exposes `updateSheetMetadata(...)` for metadata-only edits. P5-01 should extend that model instead of creating a second metadata database.

## Out Of Scope

- No visible UI: no tag chips, favorite buttons, filters, empty states, dialogs, toasts, responsive layout work, or route changes. P5-02 owns UI.
- No folders, nested organization, smart collections, automatic tags, recently used tags UI, or tag suggestions.
- No batch import behavior. P5-03 owns multi-file import.
- No recent practice summaries or review-by-sheet navigation. P5-04 through P5-06 own those.
- No viewer thumbnails, page jump, zoom/pan, or assisted page turning.
- No cloud sync, accounts, sharing, import/export, backup/restore, cross-device merge, or conflict resolution.
- No artifact migration, PDF/image decoding changes, file blob changes, or IndexedDB cleanup.
- No change to fixed category behavior. `song`, `exercise`, and `scale` remain existing metadata and are not replaced by tags.
- No product tests outside the Sheet Library domain/service/repository boundary unless a touched shared type requires a focused compile regression.

## Likely Files And Areas

Preferred production files:

- `src/domain/sheet/types.ts`
  - Add `SheetOrganizationMetadata`, `SheetTag`, or equivalent simple type aliases.
  - Extend `ImportedSheet` with optional persisted fields for compatibility, likely `tags?: string[]` and `favorite?: boolean`.
  - Keep `SheetMetadataInput` for existing import/edit metadata unless implementation proves organization edits should share the same input.
- `src/domain/sheet/validation.ts`
  - Add tag/favorite normalization and validation helpers.
  - Keep existing `validateSheetMetadata(...)` behavior unchanged.
- `src/domain/sheet/filters.ts`
  - Include valid tags in search haystack.
  - Add organization-aware filtering in the existing pure list-filter surface, or a nearby pure helper, so P5-02 can filter by favorite and tags without React-side business logic.
- `src/domain/sheet/index.ts`
  - Export new domain helpers if needed.
- `src/services/sheet-library/types.ts`
  - Add organization update input and service/repository method types.
- `src/services/sheet-library/service.ts`
  - Add methods to set/replace tags, add/remove one tag if useful, and set favorite.
  - Ensure imported sheets receive normalized defaults.
- `src/infrastructure/files/sheet-library-repository.ts`
  - Persist the extended `ImportedSheet` row and update only organization fields without touching artifacts.

Preferred tests:

- `tests/unit/sheet-library-domain.test.ts`
- `tests/unit/sheet-library-service.test.ts`
- A new `tests/unit/sheet-library-repository.test.ts` for Dexie persistence and legacy/malformed row compatibility.

Reference existing patterns:

- `src/domain/sheet/validation.ts` for Zod-based validation and user-facing messages.
- `src/services/sheet-library/service.ts` for injected `now`, repository boundary, and result shapes.
- `src/infrastructure/files/sheet-library-repository.ts` for Dexie row persistence.
- `tests/unit/sheet-library-service.test.ts` for memory repository service tests.
- `tests/e2e/sheet-library.spec.ts` only as a later P5-02/P5-03 UI reference, not as required P5-01 coverage.

Avoid by default:

- `src/components/sheet-library/**`
- `src/app/sheet-library/**`
- Sheet Practice route/viewer code
- recording/session/preset repositories
- storage DB names or Dexie version changes unless a real migration is required

## Domain Model And Data Shape

Use direct sheet-row metadata for the first version:

```ts
type SheetOrganizationMetadata = {
  tags: string[];
  favorite: boolean;
};

type ImportedSheet = {
  // existing fields...
  tags?: string[];
  favorite?: boolean;
};
```

Recommended resolved read shape:

```ts
type ResolvedSheetOrganizationMetadata = {
  tags: string[];
  favorite: boolean;
};
```

Rules:

- `tags` are user-visible labels, not hashtags-only syntax.
- `favorite` is a local boolean marker only.
- Missing `tags` resolves to `[]`.
- Missing `favorite` resolves to `false`.
- Imported new sheets should persist `tags: []` and `favorite: false` unless the coding agent finds existing style prefers omitting default fields. Either storage choice is acceptable if reads normalize consistently.
- Do not create a tag entity table, tag ids, tag colors, counts cache, or folder model in P5-01.
- Do not encode fixed category as a tag. Existing `category` remains a separate fixed field.

Suggested tag validation:

- Trim leading/trailing whitespace.
- Collapse internal whitespace to one space.
- Reject empty tags.
- Reject commas, newlines, and control characters.
- Max 24 characters per tag.
- Max 12 tags per sheet.
- Remove case-insensitive duplicates while preserving the first normalized display casing.
- Preserve user insertion order after normalization.

Suggested helpers:

```ts
normalizeSheetTag(input: string): string | null
normalizeSheetTags(input: unknown): string[]
resolveSheetOrganization(sheet: Pick<ImportedSheet, "tags" | "favorite">): ResolvedSheetOrganizationMetadata
validateSheetOrganizationInput(input: { tags?: unknown; favorite?: unknown }): SheetValidationResultLike
```

Keep helper names consistent with local style. Avoid a class or service object for pure normalization.

Organization-aware filtering must also be a pure domain concern in P5-01. Prefer extending the current `filterSheets(...)` options if that keeps the call site simple; otherwise add one small adjacent helper. It must support:

- default behavior unchanged when no organization filters are passed;
- favorite-only filtering, for example `favorite: "favorites"` or equivalent;
- tag filtering with normalized, case-insensitive comparisons;
- composition with existing query and fixed category filters;
- fixed category remaining separate from tags.

## Migration And Backwards Compatibility

Existing `sheets` rows in IndexedDB do not have `tags` or `favorite`.

P5-01 expectations:

- Reading an existing sheet without organization fields must not throw.
- `listSheets()` and `getSheet()` should return list items that resolve as no tags and not favorite.
- Updating tags/favorite on a legacy row should add only the organization fields plus `updatedAt`; it must preserve name, category, BPM, time signature, artifact metadata, and `lastPracticedAt`.
- Saving/importing a new sheet must remain compatible with existing artifact persistence.
- No Dexie version bump is required if the implementation only adds non-indexed optional fields to stored sheet objects.
- Do not require a one-time migration job.
- Do not delete or rewrite artifacts as part of organization metadata updates.
- Malformed persisted organization fields should be normalized safely on read:
  - non-array `tags` becomes `[]`;
  - invalid tag entries are dropped;
  - non-boolean `favorite` becomes `false`.
- If malformed tags are dropped during read normalization, do not silently write back unless the user explicitly updates organization metadata. Reads should be safe and side-effect free.

## Service And Repository Boundary

Repository responsibilities:

- Persist and retrieve `ImportedSheet` rows.
- Add a narrow organization update method, for example:

```ts
updateSheetOrganization(
  sheetId: string,
  organization: SheetOrganizationMetadata,
  updatedAt: string
): Promise<ImportedSheet | null>
```

- Keep `saveSheet(...)`, `updateSheetMetadata(...)`, `updateLastPracticedAt(...)`, artifact reads, delete, and clear behavior unchanged.
- Return `null` for missing sheet updates.
- Never inspect PDF/image blobs for organization operations.
- Never sort or filter by business semantics beyond existing repository read mechanics.

Service responsibilities:

- Validate and normalize tags/favorite before repository writes.
- Generate `updatedAt` through the existing injected `now`.
- Return existing result style: `{ ok: true; sheet }` or `{ ok: false; message }`.
- Add small methods such as:

```ts
updateSheetOrganization(input)
setSheetFavorite(sheetId, favorite)
setSheetTags(sheetId, tags)
addSheetTag(sheetId, tag)
removeSheetTag(sheetId, tag)
```

The coding agent may implement only `updateSheetOrganization`, `setSheetFavorite`, and `setSheetTags` if that covers P5-02 cleanly. Add one-tag helpers only if they remove duplication without extra state machinery.

UI/service boundary:

- UI in P5-02 should call the service. It must not call Dexie, IndexedDB, or validation helpers as a persistence shortcut.
- P5-01 may expose pure filter helpers for P5-02, but must not wire them into React controls.

Existing helpers to reuse:

- `validateSheetMetadata(...)` style and Zod dependency for validation shape.
- `filterSheets(...)` as the current list filtering surface.
- `createSheetLibraryService(...)` injected repository/adapter pattern.
- Existing Dexie database and `sheets` table.

## Acceptance Criteria

- Sheet domain types include local organization metadata for tags and favorite.
- Existing imported sheets without tags/favorite load as `tags: []` and `favorite: false`.
- New imports preserve existing metadata/artifact behavior and have normalized organization defaults on service output.
- Service can update tags without replacing artifacts or unrelated sheet metadata.
- Service can set favorite/unfavorite without replacing artifacts or unrelated sheet metadata.
- Tag validation handles trimming, duplicate removal, max tag count, max length, empty tags, and malformed persisted values.
- Search helper includes tags so P5-02 filtering can search by tag text.
- A pure organization-aware filter helper supports favorite-only and tag filtering, and composes with existing query/category filtering.
- Missing sheet updates return the existing not-found style and do not create phantom rows.
- Repository persistence survives reload/connection reset for tags/favorite.
- No visible UI is added and no Sheet Practice/viewer behavior changes.

## Boundary And Negative Cases

- Legacy row with no `tags` and no `favorite`: resolves safely.
- Legacy row with `tags: "warmup"` or `favorite: "yes"`: resolves as empty/not favorite.
- Tags with leading/trailing/internal extra whitespace: normalized.
- Duplicate tags with different casing: one tag remains.
- Empty tags, comma tags, newline tags, control characters, and over-length tags: rejected or dropped according to write/read path.
- More than max tags on write: reject without partial persistence.
- Invalid persisted tag entries: dropped on read and never shown in filters.
- Missing sheet id or blank sheet id: validation failure before repository write where possible.
- Missing sheet row: update returns `{ ok: false }` and does not create a row.
- Repository/storage failure: propagate failure; do not report success.
- Organization update must preserve artifact row and sheet fields not in the organization payload.
- Delete sheet still deletes sheet plus artifact as before; no separate organization cleanup is needed if metadata lives on the sheet row.
- Category filters continue to use fixed category, not tags.
- Favorite must not affect sort order in P5-01 unless P5-02 explicitly applies a UI filter/sort later.

## Test Coverage Plan

Domain unit tests in `tests/unit/sheet-library-domain.test.ts`:

- `resolveSheetOrganization(...)` returns defaults for missing fields.
- Valid tags normalize whitespace and preserve insertion order.
- Case-insensitive duplicate tags collapse.
- Empty, comma, newline/control, over-length, and over-count tags fail write validation.
- Malformed persisted tags/favorite normalize to safe defaults.
- `filterSheets(...)` search matches tag text while preserving existing name/category/BPM/time-signature/original-file search.
- Favorite-only filtering does not affect default sort/order.
- Tag filtering uses normalized/case-insensitive tag comparison.
- Tag/favorite filters compose with existing query and fixed category filters.
- Existing fixed category filtering behavior remains unchanged.

Service unit tests in `tests/unit/sheet-library-service.test.ts`:

- Imported sheet output includes normalized organization defaults.
- `setSheetTags` or `updateSheetOrganization` persists normalized tags and updates `updatedAt`.
- Invalid tag update returns `{ ok: false }` and leaves the saved sheet unchanged.
- `setSheetFavorite` toggles true/false and updates `updatedAt`.
- Missing sheet update returns the same not-found style as metadata edits.
- Organization updates preserve name/category/BPM/timeSignature/kind/artifact fields.
- Existing `updateSheetMetadata` still preserves organization metadata when editing name/category/BPM/time signature.
- Existing `updateLastPracticedAt` preserves organization metadata.

Repository integration tests in `tests/unit/sheet-library-repository.test.ts`:

- Persist a sheet with tags/favorite and read it back through `listSheets()`/`getSheet()`.
- Update organization fields without replacing artifact.
- Simulate reload by resetting/closing the Dexie connection if a test helper exists or by using existing IndexedDB test setup.
- Insert legacy/malformed rows directly and verify repository/service reads normalize through the service boundary.
- Verify no Dexie version bump, artifact rewrite, or separate organization table is introduced unless implementation discovers a real migration need and updates this plan.

E2E plan:

- No new browser E2E is required for P5-01 because this slice has no UI.
- Run the existing Sheet Library E2E only if product source changes unexpectedly touch UI wiring or if verification wants a smoke that import/edit/delete still works.
- P5-02 must own Playwright coverage for tag controls, favorite controls, filters, reload persistence from the visible UI, and responsive behavior.

## Verification Commands For Coding Agent

Focused unit verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-library-domain.test.ts tests/unit/sheet-library-service.test.ts tests/unit/sheet-library-repository.test.ts
```

Type/lint/diff checks:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/sheet/types.ts src/domain/sheet/validation.ts src/domain/sheet/filters.ts src/domain/sheet/index.ts src/services/sheet-library/types.ts src/services/sheet-library/service.ts src/infrastructure/files/sheet-library-repository.ts tests/unit/sheet-library-domain.test.ts tests/unit/sheet-library-service.test.ts tests/unit/sheet-library-repository.test.ts
git diff --check
```

If exact filenames differ, run the same command shape against the actual changed source/test files and report why they differ.

Optional regression smoke if UI files are touched despite the plan:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-library.spec.ts
```

## Model Tier Recommendation

- Planning agent: `gpt-5.5`, medium effort, standard speed
- Coding agent: `gpt-5.4`, high effort, standard speed
- Review agent: `gpt-5.4-mini`, high effort, standard speed
- Verification agent: `gpt-5.4-mini`, high effort, standard speed

Rationale: Tier B fits because this is a local persistence/service boundary with backwards-compatible metadata reads. It has no UI, no media capture, no artifact migration, no destructive cleanup, and no import/export flow.

Escalate only if implementation discovers a real Dexie schema migration, destructive cleanup, or cross-module storage rewrite is needed. The default plan expects none.

## Planning Validation

For this planning-only slice:

```powershell
Get-Content -Raw docs/v1/status.json | ConvertFrom-Json | Out-Null
git diff --check
```

## Handoff Notes For P5-01 Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P5-01-library-tags-favorites-domain.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/04-sheet-library.md`
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- `src/domain/sheet/**`
- `src/services/sheet-library/**`
- `src/infrastructure/files/sheet-library-repository.ts`
- `tests/unit/sheet-library-domain.test.ts`
- `tests/unit/sheet-library-service.test.ts`
- `tests/unit/sheet-library-repository.test.ts`

Implement P5-01 only. Do not add UI controls, filters in React, folder behavior, batch import, practice summaries, review links, viewer behavior, new storage systems, or artifact changes. Stop and request a planning update if the implementation appears to require a Dexie version migration, a separate tag database, a broad sheet-library UI rewrite, or changes outside the Sheet Library domain/service/repository boundary.

## Handoff Notes For P5-02

P5-02 should use the P5-01 service/domain helpers for visible controls and filters. It should not reimplement tag normalization in React and should not call Dexie directly. P5-02 owns browser E2E for adding/removing tags, favorite toggles, filtering/searching, reload persistence through the UI, and responsive layout.
