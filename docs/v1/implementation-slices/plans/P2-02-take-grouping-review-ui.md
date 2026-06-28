# P2-02 Take Grouping Review UI Plan

## Slice

- Slice id: P2-02 `take-grouping-review-ui`
- Pack: Pack 2 Segment Take Review
- Product contracts: `recordings.review-grouping` in `docs/v1/03-recordings-review.md` and `takes.multi-take-management` in `docs/v1/05c-sheet-recording-review.md`
- Depends on: P2-01 `take-grouping-domain`, now available through `src/lib/recordings-review/take-groups.ts` and `recordingHistoryRepository.getTakeGroups()`
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier C, user-facing UI with browser E2E
- Status: ready for a fresh coding agent after this planning artifact; no product code is changed by this plan

## Goal

Update the Recordings review surface so sheet recordings render as grouped take histories by sheet and saved segment context, while quick recordings, legacy sheet recordings, invalid sheet metadata, playback, details, delete, filters, and continue-practice behavior remain usable. The UI must consume the P2-01 grouping API and must not regroup raw recordings in React components.

## Refined Scope

- Add grouped rendering to `/recordings` for sheet take groups produced by P2-01.
- Preserve the current selected-recording details panel, waveform/artifact review, marker review, delete flow, and Practice Again action.
- Present sheet segment groups and sheet no-segment groups as first-class grouped take sections.
- Present quick recordings as quick recordings, not as sheet take groups.
- Preserve legacy sheet recordings without `segmentContext` by showing them in the no-segment bucket for their sheet.
- Preserve unsupported sheet recordings with missing/blank `sheetId` by keeping them visible in an ungrouped/legacy area.
- Keep filtering/search behavior compatible with grouped display: groups disappear when no contained recording matches, and visible matching recordings remain selectable.
- Keep latest-take labels derived from P2-01 `latestRecording` / `latestRecordedAt`, with no best/active inference.
- Add focused unit/component tests where local helpers or rendering branches are introduced.
- Add or extend browser E2E coverage for grouped rendering, selection/navigation, reload persistence, and negative cases.

## Explicit Out Of Scope

- No best take or active take metadata, labels, controls, or persistence. P2-03/P2-04 own that.
- No waveform comparison, multi-waveform selection, waveform source changes, or analysis-backed comparison UI. P2-07/P2-08 own that.
- No fake scoring, ranking, recommendations, automatic timing feedback, or mistake detection.
- No export, import, archive, tags, favorites, cleanup, or library organization behavior.
- No schema migration, no new persistence backend, and no rewrite of recording repository storage.
- No recording capture, MediaRecorder, metronome, or audio artifact service changes.
- No route redesign beyond the existing `/recordings` review route.
- No broad visual redesign, marketing page, nested cards, or decorative illustration work.

## Product Contracts Covered

`recordings.review-grouping`:

- Supports review grouped by sheet/segment using the unified Recordings review system.
- Keeps quick and sheet recordings together in one review surface without mixing their semantics.
- Keeps UI behind review services/helpers and away from direct storage, waveform, and audio-analysis internals.
- Preserves existing real artifact playback, details, markers, delete, and continue-practice behavior.

`takes.multi-take-management`:

- Shows a take history per sheet or saved segment context.
- Treats repeated recordings as comparable takes without DAW-like editing.
- Latest take is derived from recording time only.
- Segment-aware takes use the saved recording `segmentContext`, not current mutable segment definitions.

## Current Code Context

Known current files and APIs:

- `src/app/recordings/page.tsx` renders `RecordingsReviewExperience`.
- `src/components/recordings-review/recordings-review-experience.tsx` owns the current route UI: header, search/type filter, unified list, details panel, delete, marker seeking, and Practice Again link.
- `src/components/recordings-review/recording-artifact-review.tsx` owns playback/waveform artifact review and should be reused unchanged unless the existing props need narrow wiring.
- `src/lib/recordings-review/take-groups.ts` exposes:
  - `groupRecordingsByTake(recordings)`
  - `sortReviewRecordingsByNewest(recordings)`
  - deterministic latest/group sorting helpers
- `src/lib/recordings-review/types.ts` exposes:
  - `RecordingTakeGroup`
  - `ReviewRecordingTakeGrouping`
  - `ReviewRecording`
- `src/lib/recordings-review/repository.ts` exposes `recordingHistoryRepository.getTakeGroups()`.
- Existing tests to extend:
  - `tests/unit/recordings-review-take-groups.test.ts`
  - `tests/unit/recordings-review-history.test.ts`
  - `tests/e2e/recordings-review.spec.ts`

## Required API Consumption

- The UI must use P2-01 grouping output through `groupRecordingsByTake(filteredRecordings)` or a thin helper that calls it.
- If the component needs live unfiltered grouping, prefer `recordingHistoryRepository.getTakeGroups()` only when that matches existing `useSyncExternalStore` state semantics. Do not introduce a second unsynchronized data source.
- Do not duplicate grouping rules in components:
  - no ad hoc `Map` keyed by `sheetId`
  - no component-side segment bucket creation
  - no separate latest-take calculation
- It is acceptable to filter first with existing `filterRecordings(...)`, then pass the filtered list to `groupRecordingsByTake(...)`, so group visibility follows search/type filtering while P2-01 remains the grouping authority.
- Use P2-01 fields for display:
  - `group.groupId` for React keys and test ids
  - `group.kind`
  - `group.sheetName ?? group.sheetId`
  - `group.segmentName` for segment groups
  - `group.takeCount`
  - `group.latestRecording`
  - `group.latestRecordedAt`
  - `group.recordings`

## Required UI Behavior

- Sheet segment groups:
  - Render a group header with sheet name/id, segment name/id, take count, and latest recording date.
  - Render the group's recordings as compact selectable take rows sorted newest first by P2-01 output.
  - Use a clear label such as "Segment take history" or "Segment" without implying best/active status.
- Sheet no-segment groups:
  - Render with sheet name/id and a clear no-segment label such as "Whole sheet / no segment".
  - Include legacy missing-`segmentContext` and explicit `segmentContext: null` recordings together.
  - Do not suggest the app failed to classify them; this is a valid bucket.
- Quick recordings:
  - Preserve in a separate "Quick recordings" section when the current filter allows quick recordings.
  - Keep existing quick row metadata and Practice Again behavior.
  - Do not group quick recordings under fake sheets or fake segments.
- Ungrouped/unsupported recordings:
  - Keep P2-01 `ungroupedRecordings` visible when present, with honest copy such as "Legacy recordings with missing sheet links".
  - Allow selection, playback/details, delete, and safe Practice Again behavior as existing code permits.
- Selection:
  - Preserve current behavior where selecting a row updates the details panel.
  - If the selected recording is filtered out or deleted, fall back to the first visible recording from grouped sheet takes, then quick recordings, then ungrouped recordings.
  - Row selected state should stay accessible with `aria-pressed` or an equivalent selected-state pattern.
- Filtering:
  - Existing search input and type filter remain.
  - Type filter "sheet" shows sheet groups and ungrouped sheet recordings, not quick recordings.
  - Type filter "quick" shows quick recordings only.
  - Empty filtered results show the existing honest empty-filter state, updated if necessary to mention groups.
- Deletion:
  - Deleting a recording updates group take counts after repository change.
  - A group with no visible recordings disappears.
  - This slice does not change delete semantics or add group-level delete.
- Continue practice:
  - Existing `getContinuePracticeHref(recording)` remains the row/details action source.
  - Do not add segment-return routing in P2-02 unless it already exists. P2-06 owns returning to the exact sheet/segment context.

## Design And Responsive Constraints

- Follow `docs/v1/ui-design.md` and `docs/v0/design-style-guide.md`.
- Keep the page a dense practice review tool, not a landing or marketing page.
- No nested cards. If the current surface uses top-level cards, grouped rows inside should use dividers, rows, simple panels, or list sections rather than cards within cards.
- Use compact rows, stable row heights, muted metadata, thin dividers, and restrained badges.
- Use lucide icons where helpful for play/review/filter affordances, but do not replace clear labels with obscure icon-only controls unless tooltips/labels exist.
- Desktop:
  - Preserve a two-column review layout similar to current list/details split.
  - Left column can become grouped take navigation; right column remains details.
- Tablet/iPad landscape:
  - Keep grouped list and details usable without horizontal overflow.
  - Avoid making group headers so large that rows/details are pushed below the fold unnecessarily.
- Mobile:
  - Stack grouped list above details or use the existing responsive stack.
  - Group headers and row metadata must wrap cleanly without clipping.
  - Buttons and select/search controls must remain at least touch-friendly and not overlap.
- Do not display best/active badges, score chips, waveform-comparison controls, export buttons, or fake analytics.

## Empty, Loading, And Error States

- Initial client hydration/loading:
  - The existing `clientReady` empty snapshot pattern may remain.
  - Avoid flashing fake populated state. If adding a loading state, label it politely, e.g. `Loading recordings...`, and do not block layout longer than needed.
- Global empty state:
  - When `snapshot.recordings.length === 0`, keep the existing honest "No saved takes yet" style and Quick Metronome entry point.
- Filter empty state:
  - When no visible grouped/quick/ungrouped items remain after search/filter, show a single filter-empty message.
- Group section empty states:
  - Do not show empty group shells. Hide sections with zero visible rows.
- Artifact/playback errors:
  - Preserve existing `RecordingArtifactReview` error rendering for bad audio, missing artifacts, and invalid peaks.
  - Grouped navigation must not swallow or replace these errors.
- Unsupported metadata:
  - Ungrouped recordings should have honest labels, not fatal errors.

## Accessibility Expectations

- Keep `section aria-labelledby="recordings-title"` for the route.
- Search input keeps `aria-label="Search recordings"`.
- Type filter keeps `aria-label="Type filter"`.
- Group sections should have accessible headings, e.g. `aria-labelledby` pointing to each group title.
- Take rows remain keyboard focusable buttons with visible focus rings.
- Selected take rows expose state with `aria-pressed` or equivalent.
- Row labels should include enough context for screen readers:
  - recording display name
  - sheet name or quick recording context
  - segment/no-segment context for sheet groups
  - recorded date
- Icon-only controls require `aria-label`; unfamiliar controls should have tooltip or visible text.
- Delete confirmation controls retain clear button names: "Cancel" and "Confirm Delete".
- Status/error messages continue to use `role="status"` / `role="alert"` where existing behavior does.
- Do not rely on color alone to distinguish latest, selected, quick, segment, or no-segment states.

## Expected Files And Areas To Touch

Likely touch:

- `src/components/recordings-review/recordings-review-experience.tsx`
- `tests/e2e/recordings-review.spec.ts`

Maybe touch:

- `src/lib/recordings-review/history.ts` if search visible metadata needs to include segment names from saved `segmentContext`.
- `tests/unit/recordings-review-history.test.ts` if filtering helper behavior changes.
- A new focused component/helper test under `tests/unit/` if grouped rendering is extracted.
- `src/lib/recordings-review/format.ts` only for a small reused label formatter if current format helpers are insufficient.

Avoid:

- `src/lib/recordings-review/take-groups.ts` unless P2-01 API has a confirmed bug; changing it would need corresponding unit coverage.
- `src/lib/recordings-review/repository.ts` unless a very thin read helper is necessary.
- Recording capture, playback service internals, waveform adapter internals, sheet practice route behavior, persistence schema, and database repositories.

## Acceptance Criteria

- `/recordings` renders sheet recordings grouped by P2-01 sheet/segment take groups.
- The UI consumes `groupRecordingsByTake` or `recordingHistoryRepository.getTakeGroups()` and does not reimplement grouping in components.
- Segment groups, no-segment sheet groups, quick recordings, and ungrouped legacy/unsupported recordings are all visible when applicable.
- Latest/take-count display comes from grouping output and does not imply best/active status.
- Search and type filters work with grouped rendering and preserve the current quick/sheet filtering semantics.
- Selecting any visible recording shows the existing details, artifact review, metadata, markers, delete controls, and Practice Again action.
- Deleting a recording updates grouped rendering and persists after reload.
- Browser E2E verifies grouped rendering/navigation and reload behavior using seeded local recording history.
- Desktop, tablet, and narrow mobile layouts have no clipped text, overlap, or unusable controls.

## Test Plan

Unit/component tests:

- If `filterRecordings` is updated to search saved segment names, extend `tests/unit/recordings-review-history.test.ts` for segment name/id and no-segment cases.
- If grouped rendering is extracted into a child component, add a focused React test for:
  - segment group header and rows
  - no-segment group header and rows
  - quick recordings section
  - ungrouped legacy section
  - selected row accessible state
  - filter-empty rendering
- Keep P2-01 grouping tests intact; do not duplicate full grouping unit coverage in UI tests.

Browser E2E:

- Extend `tests/e2e/recordings-review.spec.ts` or add a focused grouped-review spec.
- Seed recordings with:
  - two sheet takes for same sheet and segment
  - two sheet takes for same sheet with no `segmentContext` / `segmentContext: null`
  - sheet take for same segment id on a different sheet
  - quick recording
  - legacy/unsupported sheet recording with missing `sheetId` if supported by repository normalization
- Assert:
  - grouped section headers are visible with sheet/segment/no-segment labels
  - take counts are correct
  - latest date/row reflects newest recording
  - quick recording remains in its own section
  - selecting a take shows the details panel for that recording
  - Practice Again still navigates to `/quick-metronome?...` for quick recordings and `/sheet-practice?...` for sheet recordings
  - delete removes a take from its group and persists after reload
  - type filter "quick" hides sheet groups and shows quick section
  - type filter "sheet" hides quick section and shows sheet groups
  - search by sheet name and segment name narrows visible groups/rows if segment search is implemented
  - bad/missing audio still shows existing artifact errors from the details panel
- Responsive checks:
  - Run the grouped review assertions at desktop width.
  - Add at least one tablet-like viewport and one narrow mobile viewport check for visible group headers, row buttons, and details without overlap or clipped labels.
- Reload/persistence:
  - Seed, navigate, verify groups, reload, verify grouping and selected fallback behavior.

Negative cases:

- No recordings shows global empty state.
- Search with no matches shows filter-empty state and no empty group shells.
- Group with only a deleted/mismatched filtered recording disappears.
- Unsupported/ungrouped recordings remain selectable instead of crashing.

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
.\scripts\npm-local.ps1 exec vitest run tests/unit/recordings-review-history.test.ts tests/unit/recordings-review-take-groups.test.ts
```

If a new grouped component test file is added, include it in the narrow Vitest command. Final verification should include lint, typecheck, relevant unit tests, and the Recordings Review browser E2E.

## Model Tier Recommendation

- Coding agent: GPT-5.5, high effort, standard speed
- Review agent: GPT-5.4, medium effort, standard speed
- Verification agent: GPT-5.4-mini, high effort, standard speed

Rationale: Tier C is appropriate because this is a compact user-facing UI slice with responsive layout and browser E2E. It reuses existing artifact playback and waveform components but does not add media capture, timing, waveform comparison, export, migration, or cleanup risk. Do not use fast tier.

## Constraints For Coding Agent

- Reuse existing route, components, services, helpers, styles, and test fixture patterns.
- Consume P2-01 grouping API; do not regroup raw recordings in components.
- Keep current artifact playback/details/delete/marker behavior intact.
- Keep latest derived from recording time only.
- No best/active metadata.
- No waveform comparison.
- No export.
- No schema migration.
- No new persistence backend.
- No new packages.
- No UI dependency on Dexie, localStorage, MediaRecorder, wavesurfer internals, or audio-analysis internals.
- Keep changes scoped to Recordings Review UI and directly related tests/helpers.

## Handoff Notes For P2-03 And P2-04

- P2-03 can add local best/active take metadata keyed by recording/group ids after this grouped UI exists.
- P2-03 should not need to change the grouping identity semantics; use P2-01 `groupId` and recording ids as stable read-model anchors.
- P2-04 can add best/active controls into the group/take row area created here.
- P2-04 must distinguish explicit best/active metadata from latest; P2-02 should leave no fake badges that need to be unwound.
- If P2-02 extracts grouped-row components, keep props open enough for later small badges/actions, but do not implement those controls now.
