# P2-05 Take History Summary Plan

## Slice

- Slice id: P2-05 `take-history-summary`
- Pack: Pack 2 Segment Take Review
- Product contract: `takes.take-history` in `docs/v1/05c-sheet-recording-review.md`
- Related contracts: `takes.multi-take-management`, `takes.active-best-take`, and `recordings.review-grouping`
- Depends on:
  - P2-01 `take-grouping-domain`
  - P2-02 `take-grouping-review-ui`
  - P2-03 `best-active-take-metadata`
  - P2-04 `best-active-take-ui`
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier C, user-facing UI with browser E2E
- Status: ready for a fresh coding agent after this planning artifact; no product code is changed by this plan

## Goal

Add a compact, honest take-history summary to the grouped Recordings review UI. The summary should help users scan each sheet/segment take group by count, latest take, explicit best take, duration, BPM, time signature, and marker counts when marker data already exists. It must use existing metadata and P2-01/P2-03 helpers, and must not introduce scoring, correctness, audio analysis, marker authoring, waveform comparison, export, or schema migration.

## Refined Scope

- Display a concise take-history summary for each P2-01 sheet take group in `/recordings`.
- Keep summary values derived from existing `ReviewRecording`, `RecordingErrorMarker`, `RecordingTakeGroup`, and P2-03 resolved selection metadata.
- Include exactly these summary fields where supported:
  - take count
  - latest
  - best
  - duration
  - BPM
  - time signature
  - marker summary
- Preserve the P2-04 best/active controls and existing grouped list/details behavior.
- Keep quick recordings and ungrouped/legacy recordings visible without fake group summaries.
- Add a helper/service boundary if summary derivation is more than trivial formatting, so React does not recompute inconsistently.
- Add focused unit/component and E2E tests for rendering, fallbacks, reload behavior, responsive layout, and prohibited scoring text.

## Explicit Out Of Scope

- No waveform comparison, waveform source changes, audio decoding, peak analysis, or audio-analysis infrastructure.
- No automatic scoring, correctness, accuracy, timing feedback, ranking, recommendation, or "best performance" claims.
- No marker authoring, marker editing, marker categories, severity, or waveform marker overlays. Use only existing marker records if available.
- No export, import, tags, favorites, archive, cleanup, backup/restore, or schema migration.
- No recording capture, MediaRecorder, metronome, playback service, wavesurfer adapter, or sheet-practice recording workflow changes.
- No quick-recording best/active metadata and no fake sheet/segment grouping for quick recordings.
- No route redesign, large analytics panel, or broad visual redesign.

## Product Contracts Covered

This slice covers the summary display part of `takes.take-history`:

- Sheet/segment take histories can show a compact overview of repeated takes.
- Latest is derived from recording time through P2-01 grouping.
- Best is explicit user metadata through P2-03/P2-04, not inferred.
- Metadata is displayed as recorded facts: duration, BPM, time signature, and markers.
- Segment-aware groups use saved recording `segmentContext`, not current mutable segment definitions.

It also preserves `recordings.review-grouping` by keeping quick, sheet, legacy, details, markers, delete, and continue-practice behavior in the unified review surface.

## Current Code Context

Known current seams:

- `src/components/recordings-review/recordings-review-experience.tsx`
  - Owns `/recordings` UI.
  - Uses `groupRecordingsByTake(filteredRecordings)`.
  - `TakeGroupSection` already renders group count, latest, `Best: ...`, `Active: ...`, and take rows.
  - `RecordingListItem` already renders per-row duration, BPM, and time signature.
  - `RecordingDetails` receives selected markers and renders the existing marker list.
- `src/lib/recordings-review/types.ts`
  - Defines `ReviewRecording`, `RecordingErrorMarker`, `RecordingTakeGroup`, and `ResolvedRecordingTakeSelection`.
  - `ReviewRecording` has `durationMs`, `settings.bpm`, and `settings.timeSignature`.
- `src/lib/recordings-review/take-groups.ts`
  - Defines grouping and latest-take derivation.
- `src/lib/recordings-review/repository.ts`
  - Exposes `resolveTakeSelection(group)`, `getErrorMarkers(recordingId)`, `getTakeGroups()`, and subscription behavior.
  - `deleteRecording(...)` removes linked markers and best/active refs.
- `src/lib/recordings-review/format.ts`
  - Provides duration/date formatting helpers.
- Existing tests to extend:
  - `tests/unit/recordings-review-experience.test.tsx`
  - `tests/unit/recordings-review-take-groups.test.ts`
  - `tests/unit/recordings-review-repository.test.ts`
  - `tests/e2e/recordings-review.spec.ts`

## Summary Field Contracts

The coding agent may choose exact copy, but each field must follow this meaning:

- Take count:
  - Use `group.takeCount`.
  - Display as `1 take` / `N takes`.
- Latest:
  - Use `group.latestRecording` and `group.latestRecordedAt`.
  - Display a date and, where space permits, the recording display name.
  - Never use best/active metadata to determine latest.
- Best:
  - Use `recordingHistoryRepository.resolveTakeSelection(group)` or an equivalent helper that consumes P2-03 APIs.
  - If `bestRecording` resolves, display the recording display name.
  - If no best is set, display `Best: none`.
  - If persisted metadata is stale and cannot resolve, display `Best: none`; do not repair storage in render.
- Duration:
  - Use the latest recording's `durationMs` by default, formatted with `formatDuration(...)`.
  - If a best recording exists, the summary may show best duration in a label such as `Best duration ...` only if the label is explicit.
  - To keep the first implementation compact and unambiguous, prefer `Latest duration`.
  - If duration is missing, non-finite, or less than zero after defensive checks, display `Duration unavailable`.
- BPM:
  - Use the latest recording's `settings.bpm` by default.
  - If all group recordings have the same BPM, a plain `96 BPM` label is acceptable.
  - If visible group recordings differ, display the latest value with a mixed fallback such as `Latest 96 BPM` or `Mixed BPM, latest 96`.
  - If unavailable or invalid, display `BPM unavailable`.
- Time signature:
  - Use the latest recording's `settings.timeSignature` by default.
  - If all group recordings match, display the value plainly.
  - If values differ, display `Mixed time signatures, latest 3/4` or equivalent concise copy.
  - If unavailable or invalid, display `Time signature unavailable`.
- Marker summary:
  - Use existing `RecordingErrorMarker[]` from `snapshot.errorMarkers`, grouped by `recordingId`.
  - Count markers for recordings in the take group.
  - Recommended compact labels:
    - `No markers`
    - `1 marker`
    - `N markers`
  - If a best recording is set, the helper may include a secondary best marker count only when it can remain compact, for example `Best: 2 markers`.
  - If marker data is not available to the summary helper, display `Markers unavailable`; do not infer from notes or audio.

## Fallback Policy

- Prefer real saved metadata over blank UI.
- Prefer latest-recording metadata when a group-level value could vary.
- Call out mixed values only for BPM and time signature, where mixed state is meaningful and cheap to detect.
- Missing best is a normal state: `Best: none`.
- Missing active metadata is already covered by P2-04; P2-05 does not need to add active to the summary unless preserving an existing P2-04 chip.
- Invalid `createdAt` remains handled by P2-01; if latest date formats as unknown, display `Latest unknown date`.
- Invalid duration/BPM/time signature must not crash rendering.
- Unsupported/ungrouped sheet recordings and quick recordings should keep row/details metadata, not receive fake group summary fields.

## Prohibited Claims

Do not display copy that implies automatic evaluation, including:

- `score`
- `accuracy`
- `correct`
- `best performance`
- `cleanest`
- `most accurate`
- `recommended`
- `improved`
- `mistakes`
- `timing quality`

Allowed language is factual metadata such as `Latest`, `Best`, `Active`, `Duration`, `BPM`, `Time signature`, and `Markers`.

## UI Placement

- Put the group-level summary inside each existing `TakeGroupSection` header or directly below it.
- Keep it compact: one wrapped row or a small responsive grid of chips/metadata cells.
- Do not add a separate analytics card, chart, sidebar panel, or nested cards inside the existing Recordings page cards.
- Preserve current left list / right details split:
  - Left column group header: compact summary for scanning groups.
  - Rows: keep per-take metadata and best/active controls from P2-04.
  - Details panel: keep selected recording artifact, metadata, markers, delete, and Practice Again.
- On group headers, avoid overcrowding by combining existing chips rather than duplicating the same text twice. For example, replace the current count/latest/best chips with a more complete summary chip row.
- Quick recordings section may retain existing row-level duration/BPM/time signature only.
- Ungrouped legacy section may retain existing row-level metadata only.

## Service And Helper Boundaries

Preferred implementation:

- Add a small pure helper if summary derivation is not readable inline, for example:
  - `src/lib/recordings-review/take-history-summary.ts`
  - `createTakeHistorySummary({ group, selection, markers })`
- The helper should accept:
  - `RecordingTakeGroup`
  - `ResolvedRecordingTakeSelection`
  - `RecordingErrorMarker[]` for the full snapshot or for the group
- The helper should return structured values, not JSX:
  - count label
  - latest label/name/date
  - best label/name/state
  - duration label/state
  - BPM label/state
  - time signature label/state
  - marker label/count
- Reuse:
  - P2-01 `group.takeCount`, `group.latestRecording`, `group.latestRecordedAt`
  - P2-03 `resolveTakeSelection(group)` result
  - existing `formatDuration(...)`, `formatRecordingDate(...)`, and `getRecordingDisplayName(...)`
- Do not:
  - regroup recordings in React
  - recompute latest with ad hoc sorting
  - read or write raw `takeSelections`
  - call localStorage/Dexie from UI
  - inspect audio artifacts
  - derive best from duration, markers, BPM, waveform, or array order

## Required Behavior

- Segment sheet groups show summary fields for that saved segment group only.
- No-segment sheet groups show summary fields for that sheet/no-segment bucket only.
- Latest remains stable after best/active changes.
- Best summary updates immediately when P2-04 controls mark/unmark best.
- Marker summary updates after marker deletion or recording deletion through existing repository snapshot updates.
- Deleting a recording updates take count, latest, best fallback, and marker count.
- Reload preserves best/active metadata and existing recording/marker data.
- Filtering/search:
  - Since the current UI groups `filteredRecordings`, summary values should match the visible group by default.
  - Filtering must not clear persisted metadata.
  - If a persisted best is filtered out, it is acceptable to show `Best: none` for the visible filtered group, consistent with current P2-04 behavior.
- Quick-only histories still show quick recordings and no sheet take summary.
- Empty filter results show the existing filter-empty state and no empty group summary shell.

## Boundary Cases

- Quick recordings:
  - No group-level take-history summary.
  - No best/active summary or controls.
  - Existing row/details metadata remains.
- Ungrouped or unsupported sheet recordings with missing/blank `sheetId`:
  - No group-level take-history summary.
  - Keep visible in the legacy section.
- Legacy no-segment sheet recordings:
  - Included in P2-01 no-segment group summary.
- No segment context:
  - Display no-segment context honestly, not as an error.
- Stale best metadata:
  - Summary displays `Best: none`.
  - No crash and no storage repair in render.
- Stale active metadata:
  - Preserve P2-04 behavior; P2-05 must not introduce a crash or fake active status.
- No markers:
  - Display `No markers`.
- Markers for deleted recordings:
  - Existing repository deletion should remove them. Summary should count only markers whose `recordingId` is still in the visible group.
- Mixed BPM/time signatures:
  - Display latest value with an explicit mixed fallback.
- Invalid metadata:
  - Display unavailable fallback and keep the group selectable.

## Accessibility Expectations

- Summary text must be real text, not color-only indication.
- Group section keeps accessible headings via `aria-labelledby`.
- Summary chip/list should have a concise accessible label if the visual labels are abbreviated.
- Best/active controls from P2-04 keep `aria-pressed`, focus rings, and specific accessible names.
- Row buttons remain keyboard focusable and selected state remains exposed.
- Marker summary should be announced as factual count, e.g. `2 markers`.
- No tooltip-only required information.
- Text must wrap cleanly and not overlap on mobile.

## Responsive And Visual Constraints

- Follow `docs/v1/ui-design.md` and `docs/v0/design-style-guide.md`.
- Keep Recordings as a dense practice review tool.
- Use compact metadata chips, a small responsive grid, or simple inline labels.
- No nested cards. A group header summary inside the existing bordered section is fine.
- No marketing hero, decorative graphics, score charts, or fake analytics.
- Desktop: preserve list/details split; summary chips may sit to the right or below the group title.
- Tablet: no horizontal overflow; summary wraps before squeezing row actions.
- Mobile: summary stacks above rows with readable labels and stable touch targets.
- Toggling best/active must not cause dramatic layout shifts.

## Expected Files And Areas To Touch

Likely touch:

- `src/components/recordings-review/recordings-review-experience.tsx`
- `tests/unit/recordings-review-experience.test.tsx`
- `tests/e2e/recordings-review.spec.ts`

Maybe touch:

- New `src/lib/recordings-review/take-history-summary.ts` for structured summary derivation.
- `src/lib/recordings-review/format.ts` for a small formatter only if existing helpers are insufficient.
- `tests/unit/recordings-review-take-history-summary.test.ts` if a helper is added.
- `tests/unit/recordings-review-repository.test.ts` only for a narrow regression if marker deletion or stale metadata behavior is discovered broken.

Avoid:

- `src/lib/recordings-review/take-groups.ts` unless P2-01 has a confirmed bug.
- `src/lib/recordings-review/take-selection-metadata.ts` unless P2-03 has a confirmed bug.
- `src/lib/recordings-review/repository.ts` unless a thin read helper is truly necessary.
- Recording capture, playback, waveform, MediaRecorder, metronome, sheet-practice recording, storage schema, and database migration files.

## Acceptance Criteria

- `/recordings` shows a compact take-history summary for sheet take groups.
- Summary includes take count, latest, best, duration, BPM, time signature, and marker summary when data exists.
- Latest comes from P2-01 group metadata, not best/active selection.
- Best comes from P2-03 resolved user metadata, not duration, marker count, waveform, score, or latest.
- Duration, BPM, and time signature are displayed as real saved metadata with clear unavailable/mixed fallbacks.
- Marker summary counts existing marker records for visible recordings in the group and does not add marker authoring.
- Quick and ungrouped recordings do not get fake sheet take summaries.
- Existing best/active controls, selection, details, playback, markers, delete, filters, Practice Again, and reload behavior remain usable.
- Unit/component and E2E tests cover summary rendering, fallbacks, best/latest distinction, reload/persistence, responsive layout, and absence of scoring/correctness text.

## Test Plan

Unit/helper tests:

- If `take-history-summary.ts` is added, test:
  - take count label
  - latest name/date comes from `group.latestRecording`
  - best name comes from resolved best selection
  - no best displays `Best: none`
  - stale best resolves to `Best: none`
  - duration fallback for invalid duration
  - uniform BPM/time signature display
  - mixed BPM/time signature display
  - no markers, one marker, multiple markers
  - markers outside the group are ignored
  - no prohibited scoring words appear in generated labels

Component tests:

- Extend `tests/unit/recordings-review-experience.test.tsx`.
- Cover:
  - segment group summary renders all required fields
  - no-segment/legacy group summary renders honestly
  - marking best updates summary while latest remains unchanged
  - clearing best returns to `Best: none`
  - quick and ungrouped sections do not render group summary fields
  - marker summary reflects markers seeded in snapshot
  - deleting a take updates count/latest/best/marker summary as applicable
  - missing or invalid metadata uses fallback copy and does not crash
  - rendered text does not include prohibited scoring/correctness claims

E2E:

- Extend `tests/e2e/recordings-review.spec.ts`.
- Seed:
  - segment group with at least two takes
  - no-segment legacy/`null` segment group
  - quick recording
  - ungrouped missing-sheet recording if existing fixture supports it
  - markers on at least two sheet takes
  - best/active metadata for a sheet group
- Assert:
  - summary fields are visible for sheet groups
  - count/latest/best/duration/BPM/time signature/markers match seeded data
  - latest stays newest after choosing a different best
  - reload preserves best summary and group metadata
  - deleting a marked take updates best fallback and marker count
  - filter/search summaries match visible grouped recordings and do not clear metadata
  - quick filter shows quick section without sheet summary
  - no scoring/correctness text appears on the page
- Responsive E2E:
  - desktop width check for list/details split and visible summaries
  - tablet-like viewport check for no horizontal overflow
  - narrow mobile viewport check for wrapped summary text and reachable row controls

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
.\scripts\npm-local.ps1 exec vitest run tests/unit/recordings-review-experience.test.tsx tests/unit/recordings-review-repository.test.ts
```

If a new summary helper test file is added, include it in the narrow Vitest command.

## Model Tier Recommendation

- Coding agent: GPT-5.5, high effort, standard speed
- Review agent: GPT-5.4, medium effort, standard speed
- Verification agent: GPT-5.4-mini, high effort, standard speed

Rationale: Tier C is appropriate because this is a user-facing UI slice with responsive layout and browser E2E. It may add a small pure helper, but the main risk is compact rendering that preserves grouped review, best/active UI, marker counts, and no-overflow behavior. It does not add recording/media capture, waveform comparison, export, schema migration, or destructive data operations. Do not use fast tier.

## Constraints For Coding Agent

- Reuse existing route, grouped UI, repository APIs, P2-01 grouping, P2-03 selection metadata, P2-04 controls, format helpers, and test fixture patterns.
- Keep latest, best, active, duration, BPM, time signature, and markers as distinct factual concepts.
- Do not add packages.
- Do not add storage schema fields or migration.
- Do not let UI read or write raw storage.
- Do not inspect/decode audio or compare waveforms.
- Do not create marker authoring or marker categorization UI.
- Do not add scoring, correctness, ranking, recommendation, or analysis claims.
- Keep changes scoped to Recordings Review UI and directly related summary helpers/tests.

## Handoff Notes For P2-06

- P2-06 should build return-to-practice navigation from existing recording/group context, not from summary labels.
- If P2-05 adds a summary helper, P2-06 may read its display labels but should not depend on them for routing.
- Preserve `getContinuePracticeHref(recording)` as the current row/details source unless P2-06 explicitly replaces it with a segment-aware route helper.
- P2-06 should not reinterpret summary metadata as scoring or practice readiness.
- Summary UI should leave enough room for a future compact "Return to practice" action without turning the group header into a large action panel.
