# P2-09 Recordings Tags Favorites Archive Plan

## Slice

- Slice id: P2-09 `recordings-tags-favorites-archive`
- Pack: Pack 2 Segment Take Review
- Product contract: `recordings.tags-favorites-archive` in `docs/v1/03-recordings-review.md`
- Related contracts: `recordings.review-grouping`, `takes.multi-take-management`, `takes.active-best-take`, `takes.take-history`, and `takes.waveform-comparison`
- Depends on:
  - P2-01 `take-grouping-domain`
  - P2-02 `take-grouping-review-ui`
  - P2-03/P2-04 best/active take metadata and UI
  - P2-05 take history summary
  - P2-07/P2-08 waveform comparison source/UI behavior if already present in the route
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier C by default; escalate review/verification toward Tier D/E judgment if implementation discovers archive operations can orphan metadata or imply destructive cleanup
- Status: ready for a fresh coding agent after this planning artifact; no product code is changed by this plan

## Goal

Add local organization metadata for recordings in the Recordings Review surface: user tags, favorite/unfavorite, and archive/unarchive. The feature should help users manage growing local recording histories without changing recording artifacts, deleting data, syncing to cloud, exporting/importing, scoring, or changing waveform comparison behavior.

## Refined Scope

- Add a local metadata shape for recording organization:
  - tags: zero or more validated user labels
  - favorite: boolean
  - archived: boolean
  - updatedAt: ISO timestamp
- Store organization metadata through the existing `recordingHistoryRepository` snapshot boundary, alongside existing `takeSelections`.
- Expose repository/helper methods for reading, setting tags, adding/removing a tag, toggling favorite, toggling archived, resolving metadata for a recording, and cleaning metadata when a recording is deleted.
- Add Recordings Review UI controls to:
  - add/remove tags on individual recordings
  - favorite/unfavorite individual recordings
  - archive/unarchive individual recordings
  - filter by favorites
  - filter by active tag
  - show/hide archived recordings
  - search tags as visible metadata
- Keep archived recordings hidden by default, with an explicit archived view/filter that allows selection, playback/details, and unarchive.
- Preserve quick recordings, sheet grouped takes, legacy/no-segment groups, ungrouped stale sheet recordings, best/active controls, take-history summaries, marker display, waveform comparison, delete, and Practice Again behavior.
- Add unit/component/E2E coverage for persistence, reload, filtering/search, archive visibility/recovery, validation, and no delete confusion.

## Explicit Out Of Scope

- No cloud sync, login, sharing, backup conflict merge, or cross-device metadata.
- No export/import of tags or organization metadata.
- No destructive cleanup, bulk delete, archive cleanup, trash, or auto-expiry.
- No new backend, server route, or remote database.
- No changes to recording capture, MediaRecorder, metronome, playback artifact storage, waveform decoding, waveform comparison scoring, peak generation, or audio analysis.
- No automatic tags, smart categories, ranking, recommendations, correctness scoring, timing feedback, or mistake detection.
- No group-level tag/favorite/archive semantics in the first implementation; metadata applies to individual recordings.
- No library/sheet tags. This slice is only for local recording organization.
- No broad visual redesign or route redesign beyond Recordings Review controls.

## Product Contract Covered

This slice covers `recordings.tags-favorites-archive`:

- Recordings can be organized locally with tags.
- Recordings can be marked favorite/unfavorite.
- Recordings can be archived and later recovered through unarchive.
- Organization metadata is local and does not imply sharing or cloud sync.
- Archive is a visibility state, not deletion.
- The unified Recordings Review system keeps quick, sheet, grouped, legacy, details, markers, playback, waveform, and continue-practice behavior intact.

## Data Model And Service Boundary

Use the existing recording history snapshot rather than a second unsynchronized store. P2-03 already established `RecordingReviewSnapshot` as the metadata extension point for local take selections. P2-09 should add a separate recording-level metadata array to that same snapshot boundary.

Recommended type shape:

```ts
export type RecordingOrganizationMetadata = {
  recordingId: string;
  tags: string[];
  favorite: boolean;
  archived: boolean;
  updatedAt: string;
};

export type RecordingReviewSnapshot = {
  sessions: unknown[];
  recordings: ReviewRecording[];
  errorMarkers: RecordingErrorMarker[];
  takeSelections?: RecordingTakeSelectionMetadata[];
  recordingOrganization?: RecordingOrganizationMetadata[];
};
```

Rationale:

- `takeSelections` is group-scoped because best/active belongs to a sheet take group.
- Tags/favorite/archive are recording-scoped because quick, sheet, legacy/no-segment, ungrouped, best, active, and waveform-selected recordings can all be organized individually.
- Keeping the arrays separate avoids overloading P2-03 metadata with unrelated semantics while still sharing the same repository, local storage key, snapshot normalization, subscription, and deletion path.
- Do not store organization fields directly on `ReviewRecording`; the recording artifact metadata stays factual and capture-derived.

Repository/helper expectations:

- Normalize missing `recordingOrganization` to empty behavior on read.
- Omit `recordingOrganization` from serialized snapshots when empty if that matches `takeSelections` storage style.
- Preserve `recordingOrganization` when sheet/quick recording services save metadata snapshots.
- Remove organization entries when `deleteRecording(recordingId)` deletes the recording.
- Defensive reads must ignore metadata for missing/stale recording ids.
- Duplicate metadata for one recording should collapse deterministically, preferably newest valid `updatedAt`.
- Public methods should validate before write and never partially persist invalid tags.

Suggested methods, with final names matching local style:

- `getRecordingOrganization(recordingId)`
- `getRecordingOrganizations()`
- `resolveRecordingOrganization(recording)` returning default `{ tags: [], favorite: false, archived: false }`
- `setRecordingTags(recordingId, tags)`
- `addRecordingTag(recordingId, tag)`
- `removeRecordingTag(recordingId, tag)`
- `setRecordingFavorite(recordingId, favorite)`
- `setRecordingArchived(recordingId, archived)`
- `clearRecordingOrganization(recordingId)`

## Tag Validation

- Tags are user-visible labels, not hashtags-only syntax.
- Trim leading/trailing whitespace.
- Collapse internal whitespace to single spaces if a helper already exists or it is simple to do.
- Case-insensitive duplicate detection; preserve the first normalized display casing.
- Recommended limits:
  - max 8 tags per recording
  - max 24 characters per tag
  - reject empty tags
  - reject commas/newlines/control characters
- Tags should sort/display in user insertion order after normalization unless the existing UI strongly favors alphabetical chips.
- Invalid persisted tags should be ignored on read, not surfaced as broken chips.
- Tag search should match tag text through `filterRecordings`.

## UX Contract

Controls should live where users already inspect a recording:

- Row-level favorite should be a compact star icon button with `aria-pressed`, visible focus ring, and an accessible label.
- Details panel should include the full organization editor for the selected recording:
  - tag chips with remove buttons
  - a small text input or combobox-like input for adding a tag
  - favorite/unfavorite toggle
  - archive/unarchive action
- If row space is tight, row-level archive/tag editing can stay in details only; row-level favorite is recommended because favorites are a common scan action.
- Archive action copy must avoid delete language. Use `Archive` / `Unarchive`, not `Remove` or `Clear`.
- If an archived recording is selected in the archived view, details, playback, markers, waveform evidence, Practice Again, best/active labels, and unarchive remain available.
- Do not add group-level archive buttons in this slice. Archiving one take should not archive the whole group.

Filters/search integration:

- Existing type filter remains: all / quick / sheet.
- Existing search remains and includes tags.
- Add a favorites filter/toggle.
- Add a tag filter control populated from current non-stale organization metadata. It may be a select/menu for v1.
- Add archive visibility control with three clear modes:
  - `Active` or `Current`: default, hides archived recordings.
  - `Archived`: shows archived recordings only.
  - `All`: shows both active and archived recordings.
- Filter order should be deterministic: type, archive mode, favorites, tag, search, then grouping.
- Grouping should run on the filtered visible recordings so archived takes disappear from active groups by default and reappear in archived/all modes.
- Empty states should distinguish active filters from no recordings, e.g. "No recordings match the current filters." Avoid implying archived recordings are deleted.

## Archive Visibility And Recovery Policy

- Archive is not delete.
- Default Recordings Review hides archived recordings.
- Archived recordings remain persisted in `snapshot.recordings`; only organization metadata changes.
- Archived recordings are still playable/reviewable when the archive view includes them.
- Archived recordings can be unarchived from their details panel and, if a row action exists, from the row.
- Delete remains the only destructive recording removal operation and must keep its existing confirmation language.
- Do not auto-clear best/active metadata when archiving. If a best/active take is archived, it may be hidden in default active view; archived/all view should still resolve it normally. Existing summary behavior may show `Best: none` in filtered active groups when the best recording is hidden, which is acceptable if consistent with P2-05.
- Do not hide or delete audio artifacts, markers, waveform source metadata, or sessions during archive.
- Do not implement cleanup of archived recordings.

## Behavior By Recording Case

- Quick recordings:
  - Can have tags, favorite, and archive metadata.
  - Remain in the Quick recordings section when visible.
  - Practice Again continues to use `/quick-metronome?recordingId=...`.
- Sheet segment grouped takes:
  - Each take can be tagged/favorited/archived independently.
  - A group appears when at least one contained recording passes filters.
  - Group counts/summaries reflect visible recordings after filters, consistent with current grouped filtering behavior.
- Sheet no-segment and legacy recordings:
  - Eligible for organization metadata by recording id.
  - Stay in the no-segment group when visible.
  - No-segment context remains a valid label, not an error.
- Ungrouped/stale sheet artifacts with missing sheet links:
  - Eligible for organization metadata by recording id if the recording is present in the snapshot.
  - Remain selectable and recoverable from archive.
  - Do not receive fake group metadata.
- Deleted recordings:
  - Delete removes recording organization metadata for that recording, just as it removes markers and best/active refs.
  - Deleting while archived should still require the existing delete confirmation.
- Stale organization metadata:
  - Ignored for missing recording ids.
  - Must not create phantom rows, tag filter values, favorites, or archived counts.
- Best/active and take summary:
  - Favorite/archive does not imply best or active.
  - Best/active controls continue to operate through P2-03/P2-04.
  - Latest remains recording-time derived.
  - Summary chips remain factual and should not use favorite/archive as scoring.
- Waveform comparison:
  - Existing waveform comparison behavior remains unchanged for visible recordings.
  - If archived recordings are hidden, they are not selectable for comparison in the default active view.
  - In archived/all mode, visible archived recordings can use existing waveform comparison source loading if applicable.

## Accessibility And Responsive Design

- Follow `docs/v1/ui-design.md` and `docs/v0/design-style-guide.md`.
- Keep Recordings Review a dense practice workspace, not a marketing page.
- Use lucide icons where suitable: star for favorite, archive box for archive, tag for tags, filter/search icons for controls.
- Icon-only controls require `aria-label`, `aria-pressed` for toggles, visible focus rings, and adequate target size.
- Tag chips need text labels plus remove buttons with labels like `Remove tag Warmup`.
- Tag input must have a visible or screen-reader label and expose validation errors with `role="alert"` or adjacent status text.
- Do not rely on color alone for favorite, archived, or selected states.
- Desktop: preserve the list/details split.
- Tablet: filter controls wrap without horizontal overflow.
- Mobile: controls stack cleanly; tags wrap; row actions do not overlap names or metadata.
- Do not add nested cards. Use compact rows, chips, dividers, and restrained panels inside existing page surfaces.

## Expected Files And Areas To Touch

Likely touch:

- `src/lib/recordings-review/types.ts`
- `src/lib/recordings-review/repository.ts`
- `src/lib/recordings-review/history.ts`
- `src/components/recordings-review/recordings-review-experience.tsx`
- `tests/unit/recordings-review-repository.test.ts`
- `tests/unit/recordings-review-history.test.ts`
- `tests/unit/recordings-review-experience.test.tsx`
- `tests/e2e/recordings-review.spec.ts`

Maybe touch:

- New `src/lib/recordings-review/recording-organization-metadata.ts` for normalization, validation, and resolve helpers.
- `src/infrastructure/db/recording-history-metadata-repository.ts` and quick/sheet recording save services only to preserve `recordingOrganization` during snapshot writes.
- `src/lib/recordings-review/format.ts` only if a small reusable tag label helper is justified.

Avoid:

- Recording capture services and MediaRecorder adapters.
- Playback/audio artifact internals.
- Waveform adapter/source logic unless a visible archived/all-mode regression is discovered.
- `take-groups.ts` unless existing grouping has a confirmed bug.
- P2-03 `take-selection-metadata.ts` except for a narrow preservation interaction.
- Sheet library tag/favorite files, settings cleanup, export/import, cloud/sync, or backend code.

## Acceptance Criteria

- Repository persists per-recording tags, favorite, and archived metadata locally through the existing recording history snapshot.
- Existing snapshots without organization metadata load safely and behave as untagged, not favorite, not archived.
- Metadata survives reload and is preserved by existing recording save/update flows.
- Tag validation prevents empty, duplicate, over-limit, and malformed tags without partial writes.
- Recordings Review lets users add/remove tags, favorite/unfavorite, and archive/unarchive individual recordings.
- Default Recordings Review hides archived recordings without deleting them.
- Archived/all view exposes archived recordings and provides a safe unarchive path.
- Search can match tags; filters can show favorites, selected tag, and archive modes together with type filter.
- Quick, sheet segment, no-segment legacy, ungrouped/stale, grouped takes, best/active, summaries, delete, markers, Practice Again, and waveform comparison remain coherent.
- Delete remains clearly destructive and archive copy never implies deletion.
- Unit/component/E2E tests cover persistence, filters, search, archive recovery, validation, reload, and no data loss confusion.

## Test Plan

Unit/repository tests:

- Existing snapshot without `recordingOrganization` normalizes safely.
- Set tags, add tag, remove tag, set favorite, clear favorite, archive, unarchive.
- Metadata persists to local storage and reloads.
- Empty metadata is omitted or normalized consistently with repository style.
- Duplicate persisted metadata collapses deterministically.
- Invalid persisted tags are ignored.
- Stale metadata for missing recordings does not produce resolved metadata or tag filter values.
- Delete removes organization metadata for the deleted recording while preserving unrelated metadata.
- Sheet metadata save/update and quick/sheet recording save flows preserve `recordingOrganization`.

Unit/filter tests:

- `filterRecordings` or a new visible-recording filter includes tag search.
- Type filter combines with archive mode, favorite mode, tag filter, and search.
- Default archive mode hides archived recordings.
- Archived-only mode shows archived recordings only.
- All mode shows archived and active recordings.
- Favorite filter works across quick and sheet recordings.
- Tag filter works across quick, sheet segment, no-segment, and ungrouped recordings.

Component tests:

- Details panel renders tags, favorite state, archive action, and validation errors.
- Adding/removing tags updates chips and visible search/filter state.
- Favorite toggle updates row/detail state with accessible pressed state.
- Archive hides the recording from default view and clears/falls back selection.
- Archived view shows the archived recording and unarchive restores it to default view.
- Quick recordings can be tagged/favorited/archived.
- Sheet grouped takes update group visibility/counts when one take is archived.
- Legacy/no-segment and ungrouped recordings remain selectable when visible.
- Best/active badges/controls and take-history summaries remain visible for visible grouped takes.
- No prohibited scoring/delete-confusion copy is introduced.

E2E tests:

- Seed:
  - quick recording
  - sheet segment group with two takes
  - no-segment/legacy sheet take
  - ungrouped missing-sheet recording if existing fixtures support it
  - best/active metadata
  - markers and waveform-capable artifact metadata where current tests already support it
- Verify:
  - add tags, reload, tags remain
  - search by tag narrows visible recordings/groups
  - favorite a quick and sheet recording, reload, favorites filter shows both
  - archive a recording, it disappears from default active view after selection fallback
  - archived mode shows the archived recording with playback/details available
  - unarchive returns the recording to default active view
  - archiving one take does not archive the whole group
  - deleting an archived recording still uses delete confirmation and removes metadata
  - quick/sheet type filters combine with tag/favorite/archive filters
  - no data loss/delete confusion copy appears around archive
- Responsive E2E:
  - desktop list/details split with filters visible
  - tablet-like viewport with wrapped filters and no horizontal overflow
  - narrow mobile with tag chips/actions wrapping without overlap

## Verification Commands

Use the local npm wrapper from the repo root:

```powershell
.\scripts\npm-local.ps1 run lint
.\scripts\npm-local.ps1 run typecheck
.\scripts\npm-local.ps1 run test:unit
.\scripts\npm-local.ps1 run test:e2e -- recordings-review.spec.ts
```

For a narrower development loop:

```powershell
.\scripts\npm-local.ps1 exec vitest run tests/unit/recordings-review-repository.test.ts tests/unit/recordings-review-history.test.ts tests/unit/recordings-review-experience.test.tsx
```

If a new organization helper test is added, include it in the narrow Vitest command.

## Model Tier Recommendation

- Coding agent: GPT-5.5, high effort, standard speed
- Review agent: GPT-5.4, medium effort, standard speed
- Verification agent: GPT-5.4-mini, high effort, standard speed

Rationale: Tier C is appropriate because the slice is user-facing UI with local persistence, filtering, responsive layout, and browser E2E. It does not add recording/media capture, waveform source changes, export/import, migration, cleanup, or real audio artifact operations. If implementation changes deletion/archive data integrity in a way that risks orphaning or removing recordings, escalate review/verification scrutiny toward Tier D/E. Do not use fast tier.

## Constraints For Coding Agent

- Reuse existing repository, snapshot, subscription, grouping, summary, selection, and test fixture patterns.
- Keep organization metadata recording-scoped and separate from group-scoped `takeSelections`.
- Do not let UI read/write localStorage or Dexie directly.
- Do not add packages.
- Do not add a backend or new persistence system.
- Do not delete, clean up, export, import, or rewrite recording artifacts.
- Do not modify waveform comparison, scoring, timing analysis, or audio decoding behavior.
- Do not use favorite/archive as best/active, latest, score, or recommendation.
- Preserve existing delete confirmation as the only destructive removal path.
- Keep changes scoped to Recordings Review and directly related repository/helpers/tests.

## Handoff Notes For P2-10

- P2-10 recording comparison should respect the visible recording set after organization filters but must not treat tags/favorite/archive as comparison scores.
- If P2-09 adds a helper for resolving visible organization metadata, P2-10 can use it only for badges/filter context, not waveform source selection.
- Archived recordings should be available for comparison only when the user explicitly includes archived/all recordings in the visible review set.
- Tags may help users locate takes for comparison, but P2-10 still needs real recording metadata and waveform evidence where available.
- Keep archive as visibility/recovery state; P2-10 must not add destructive cleanup or export/import around archived recordings.
