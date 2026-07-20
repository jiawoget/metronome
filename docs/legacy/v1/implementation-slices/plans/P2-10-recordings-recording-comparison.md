# P2-10 Recordings Recording Comparison Plan

## Slice

- Slice id: P2-10 `recordings-recording-comparison`
- Pack: Pack 2 Segment Take Review
- Product contract: `recordings.recording-comparison` in `docs/v1/03-recordings-review.md`
- Related contracts: `takes.waveform-comparison` in `docs/v1/05c-sheet-recording-review.md`, `recordings.tags-favorites-archive`, `recordings.review-grouping`, and Pack 2 P2-07/P2-08/P2-09 plans
- Depends on:
  - P2-07 `waveform-comparison-source-boundary`
  - P2-08 `waveform-comparison-ui`
  - P2-09 `recordings-tags-favorites-archive`
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier D recommended if waveform evidence is involved; otherwise Tier C/D, err Tier D
- Status: ready for a fresh coding agent after this planning artifact; no product code is changed by this plan

## Goal

Add recording comparison to the unified Recordings Review surface so users can select visible recordings from the current review context and compare factual metadata plus waveform evidence where available. This should extend the existing P2-08 waveform comparison surface and P2-07 source boundary rather than creating duplicate comparison UI, direct audio decode, or a second analysis path.

## Product Contract Covered

This slice covers `recordings.recording-comparison`:

- Users can compare selected recordings from the Recordings Review workflow.
- Comparison uses real recording metadata and local waveform evidence where the existing source boundary can validate it.
- Quick, sheet, no-segment, legacy, archived, favorite, and tagged recordings remain in the unified review model.
- Comparison stays factual and local: no scoring, correctness, ranking, automatic recommendations, alignment, onset detection, export, cloud sync, backend, or new audio analysis engine.

## Refined Scope

- Add a review-wide comparison selection mode or panel in `/recordings`.
- Let users select recordings for comparison from the currently visible review context after type/search/tag/favorite/archive filters are applied.
- Reuse/extend P2-08's comparison presentation components for ready/unavailable waveform rows and factual source/duration labels.
- Use P2-07 waveform source functions for sheet recordings that are eligible for waveform comparison.
- Compare factual metadata for every selected recording:
  - display name
  - type: quick or sheet
  - date/time recorded
  - duration
  - BPM
  - time signature
  - sheet name/id when present
  - segment name/id when present
  - artifact size and MIME type
  - tags, favorite, archived state as organization context only
  - best/active/latest labels where already available as factual state
  - marker count or marker summary if already available from existing data
- Show waveform evidence only where available through existing validated source boundaries.
- Make unsupported waveform cases explicit instead of hiding or faking them.
- Keep comparison selection separate from best/active/latest, tags, favorite, archive, row selection, playback, delete, and Practice Again.
- Add unit/component/E2E coverage for selection, filters, quick/sheet/legacy behavior, unavailable waveform evidence, no scoring language, and reload persistence behavior.

## Explicit Out Of Scope

- No scoring, correctness, accuracy, ranking, "best performance", "improved", "recommended", timing quality, mistakes, or automatic feedback.
- No automatic recommendations or automatic selection based on favorite/best/active/latest.
- No onset detection, alignment, time stretching, beat matching, BPM detection, pitch detection, or new audio analysis engine.
- No reference-to-recording comparison.
- No export, sharing, cloud/backend, sync, import, cleanup, archive deletion, or migration.
- No new recording capture, playback rewrite, metronome changes, MediaRecorder work, Tone.js work, or wavesurfer adapter rewrite.
- No direct decode/analyze in UI: React components must not call `AudioContext`, `loadRecordingArtifactDetails`, wavesurfer internals, Tone, MediaRecorder, Dexie, or future WASM modules directly.
- No duplicate waveform comparison UI that diverges from P2-08 styling/behavior.
- No destructive behavior for archived recordings; archive remains visibility/recovery metadata only.

## Current Code Context

Known current seams from targeted inspection:

- `src/components/recordings-review/recordings-review-experience.tsx`
  - Owns `/recordings`, snapshot subscription, filters, grouped review, details panel, delete, organization controls, and P2-08 group-scoped waveform comparison.
  - Current filters include type, search, archive mode, favorites, and tag; `filteredRecordings` is grouped after filters.
  - `TakeGroupSection` currently owns transient group-local `comparisonSelection` and calls `loadWaveformComparisonSourcesForGroup`.
  - Existing `WaveformComparisonPanel` and waveform row rendering should be reused or extracted rather than duplicated.
- `src/lib/recordings-review/waveform-comparison-sources.ts`
  - P2-07 exposes ready/unavailable waveform states and group/repository source loading.
  - It treats quick recordings as `not-sheet-take` for waveform comparison.
- `src/lib/recordings-review/history.ts`
  - `filterRecordings` combines type, archive, favorite, tag, and search filters.
  - `getRecordingTagOptions` ignores stale organization metadata.
- `src/lib/recordings-review/types.ts`
  - `ReviewRecording`, `RecordingTakeGroup`, and organization metadata are available as factual comparison inputs.
- Existing tests:
  - `tests/unit/recordings-review-experience.test.tsx`
  - `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
  - `tests/unit/recordings-review-history.test.ts`
  - `tests/e2e/recordings-review.spec.ts`

## Relationship To P2-08 Waveform Comparison

P2-10 must reuse or extend P2-08 rather than build a parallel waveform comparison feature.

- Prefer extracting the existing `WaveformComparisonPanel` and presentational waveform row logic from `recordings-review-experience.tsx` into a reusable component if needed.
- Keep P2-08 group-scoped comparison working exactly as-is for sheet take groups.
- Add a review-wide comparison surface that can render the same ready/unavailable waveform row states.
- For sheet recordings in a valid current take group, use `loadWaveformComparisonSourcesForGroup({ group, recordingIds })` when group membership matters.
- For selected sheet recordings outside a shared group or across groups, use the P2-07 repository/recording-id boundary if available, or add only a thin UI-agnostic adapter that delegates to P2-07 source loading.
- Do not re-decode artifacts or inspect audio bytes in React.
- Do not introduce a second visual language for waveform evidence. Source labels, duration warnings, unavailable messages, loading states, and no-fake-wave behavior should match P2-08.

## Selection Contract

Selection should be explicit, review-context-aware, and filter-aware.

- Add a review-wide compare affordance on visible recording rows:
  - Valid sheet take rows can be selected for metadata and waveform comparison.
  - Quick recordings can be selected for metadata comparison, but their waveform evidence must show unsupported/unavailable for waveform comparison unless an existing trusted review boundary supports them without direct UI decode.
  - Ungrouped/stale sheet recordings can be selected for metadata comparison; waveform evidence is unavailable unless P2-07 returns ready through a safe recording-id boundary.
- Selection is based on the visible review set after filters:
  - type filter
  - search
  - tag filter
  - favorites-only toggle
  - archive mode
- Archived recordings are selectable only when visible through `Archived` or `All including archived` modes.
- Filtering should prune or suspend selection for recordings that are no longer visible. The chosen behavior must be deterministic and tested:
  - Preferred: visible comparison selection only; hidden selected ids are removed from the active comparison panel.
  - Do not mutate tags/favorite/archive/best/active metadata when filters change.
- Selection should support two to four recordings.
  - Zero selected: show an honest empty state or collapsed panel.
  - One selected: show metadata for that recording and prompt to select another recording for comparison.
  - More than four: prevent adding or show a factual limit message.
- Do not auto-select favorites, best, active, latest, archived, or "similar" recordings.
- Group-local P2-08 comparison selection and review-wide P2-10 selection must remain separate. Toggling one must not silently toggle the other.
- Deleting a selected recording must remove it from comparison selection and avoid stale waveform rows.
- Reload behavior:
  - Preferred default: review-wide comparison selection is transient React state and resets on reload.
  - If persisted, it must be local UI preference only, must not add schema migration, must handle missing/deleted ids, and must include reload tests.

## Metadata And Evidence Contract

The comparison table/panel should compare factual data only.

Factual metadata:

- recording display name
- quick/sheet type
- created date/time
- duration
- BPM and time signature
- sheet label and segment label where present
- whole-sheet/no-segment/legacy context where applicable
- artifact size and MIME type
- tag chips
- favorite and archived state
- best/active/latest badges only where existing group state can resolve them
- marker count/summary only from existing manual marker data

Waveform evidence:

- Render only ready source states returned by P2-07.
- Label source as decoded audio or trusted peaks according to the returned source.
- Show duration warning where provided.
- For unavailable waveform evidence, show the stable reason/message from P2-07 or a UI-level unsupported message for quick recordings.
- Never render placeholder/fake waveform bars.
- Never compare peaks mathematically, align waveforms, calculate deltas, score, rank, or infer improvement.

## Empty, Loading, And Error States

Handle these states explicitly:

- No recordings: preserve existing no-recordings empty state.
- No visible recordings after filters: preserve/extend existing filter empty state.
- No recordings selected for review comparison: show `Select recordings to compare` only in the comparison surface, not as a blocking page state.
- One selected: show selected metadata and prompt `Select another recording to compare`.
- Loading waveform evidence: use `role="status"` and clear stale rows for the current selected ids unless clearly marked refreshing.
- Missing/deleted selected recording: remove it from active visible selection or show `missing-recording`; no stale cached waveform.
- Missing artifact: show unavailable message; no waveform.
- Unsupported MIME: show unavailable message; no waveform.
- Decode failed/empty audio/invalid peaks/invalid duration: show P2-07 unavailable message; no waveform.
- Quick recording: metadata comparison allowed; waveform evidence says waveform comparison is unavailable for quick recordings unless a pre-existing safe source boundary explicitly supports it.
- Legacy/no-segment sheet recording: metadata comparison allowed; waveform evidence ready only if artifact validation succeeds.
- Cross-group selected sheet recordings: metadata comparison allowed; waveform evidence ready only through the safe recording-id/repository boundary, not through fake group membership.
- Unexpected service exception: show a concise `role="alert"` and keep list/details usable.

## Accessibility Requirements

- Compare controls must be keyboard reachable.
- Use checkbox semantics or consistent `aria-pressed` toggle buttons.
- Accessible labels should name the recording, for example `Select <recording name> for recording comparison`.
- The review-wide comparison surface needs a clear accessible heading, for example `Recording comparison`.
- Loading updates use `role="status"`.
- Unexpected failures use `role="alert"`.
- Metadata comparison cannot rely on color alone; text labels must carry meaning.
- Waveform rows need text alternatives with recording name, readiness, source kind, and duration.
- Focus rings must remain visible on compare controls, row selection, favorite/archive buttons, best/active controls, playback, delete, and Practice Again.
- Limit messages and unsupported waveform messages must be reachable by assistive tech.

## Responsive And Visual Requirements

- Follow `docs/v1/ui-design.md` and `docs/v0/design-style-guide.md`.
- Keep Recordings Review dense, calm, and practice-focused.
- Preserve the existing list/details split on desktop.
- Do not create a dashboard, hero, analytics wall, nested cards, or marketing-style explanation area.
- Prefer a compact comparison panel near existing filters or above the visible recording list/details region.
- Metadata comparison should wrap cleanly in columns or rows without horizontal overflow.
- Waveform rows should keep stable height and responsive width.
- Tablet widths must wrap controls and metadata labels without clipping.
- Mobile widths must stack the selection controls and comparison rows with usable touch targets.
- Tags and long recording names must wrap without overlapping buttons or waveform rows.
- Use small waveform color accents; do not create a one-note palette.

## Expected Files And Areas To Touch

Likely touch:

- `src/components/recordings-review/recordings-review-experience.tsx`
- `tests/unit/recordings-review-experience.test.tsx`
- `tests/e2e/recordings-review.spec.ts`

Maybe touch:

- New `src/components/recordings-review/recording-comparison-panel.tsx`
- New `src/components/recordings-review/waveform-comparison-panel.tsx` if extracting existing P2-08 UI for reuse
- New `src/lib/recordings-review/recording-comparison-selection.ts` for pure selection/filter pruning helpers
- `src/lib/recordings-review/waveform-comparison-sources.ts` only for a narrow repository/recording-id adapter needed to reuse P2-07 safely across review contexts
- `src/lib/recordings-review/history.ts` only if a small helper for visible comparison candidates is justified
- `tests/unit/recordings-review-waveform-comparison-sources.test.ts` only if the P2-07 adapter changes
- New focused component/helper tests if extraction makes the coverage clearer

Avoid:

- Recording capture services and MediaRecorder adapters
- Playback service rewrites
- `src/lib/recordings-review/artifact-service.ts` unless P2-07 has a confirmed bug
- `src/lib/recordings-review/wavesurfer-adapter.ts`
- Storage schema/migrations
- Quick metronome, sheet practice recording, metronome/Tone, Pack 9 analysis, export/import, cleanup, cloud/backend, and settings data code

## Acceptance Criteria

- `/recordings` lets users explicitly select visible recordings for review-wide recording comparison.
- Selection respects type/search/tag/favorite/archive filters and archived recordings are selectable only when visible.
- Comparison shows factual metadata for selected recordings without scoring or recommendation language.
- Sheet recordings show waveform evidence only when P2-07 returns ready validated source states.
- Quick/unsupported/missing-artifact/deleted/invalid waveform cases show honest unavailable states and no fake waveform.
- P2-08 group-local waveform comparison remains usable and visually consistent.
- Group-local comparison selection and review-wide recording comparison selection do not mutate each other.
- Best, active, latest, favorite, archived, and tags remain factual metadata, not ranking or comparison outcomes.
- Existing playback/details, organization controls, filters, grouped take summaries, delete, markers, and Practice Again remain coherent.
- Desktop, tablet, and mobile layouts have no clipped labels, overlap, hidden horizontal overflow, or unusable controls.
- Unit/component/E2E tests cover selection, filters, quick/sheet/legacy cases, unavailable waveforms, no scoring text, and reload behavior.

## Test Plan

Unit/helper tests:

- If a selection helper is added:
  - adds/removes selected ids deterministically
  - enforces two-to-four recommended selection bounds
  - prunes hidden/deleted ids after filters change
  - keeps review-wide selection independent from group-local P2-08 selection
  - does not auto-select favorites/best/active/latest
- If a metadata comparison helper is added:
  - builds factual fields for quick, sheet segment, sheet no-segment, and legacy sheet recordings
  - includes organization metadata only as tags/favorite/archive context
  - includes manual marker count/summary only from existing markers
  - contains no prohibited keys or labels such as `score`, `accuracy`, `correct`, `rank`, `recommended`, `mistakes`, or `improvement`

Component tests:

- Compare controls render for visible quick, sheet segment, no-segment, and legacy recordings according to the chosen UX.
- Selecting two visible sheet takes renders metadata and waveform evidence using the P2-07/P2-08 path.
- Selecting a quick recording renders metadata plus unsupported waveform evidence, not fake bars.
- Selecting missing-artifact, unsupported-mime, invalid-peaks, deleted/missing, decode-failed, empty-audio, and invalid-duration cases renders unavailable messages without waveform bars.
- Type/search/tag/favorite/archive filters prune or clear review-wide comparison selection deterministically.
- Archived recordings can be compared only in archived/all modes.
- Group-local P2-08 comparison checkboxes still work and do not affect review-wide comparison.
- Best/active controls, favorite/archive controls, row selection, and delete continue to work.
- Delete of a selected recording removes it from comparison and avoids stale evidence.
- Reload resets transient selection, or restores only valid persisted selection if persistence is intentionally implemented.
- No scoring/correctness/ranking/recommendation text appears in the comparison surface.

E2E tests:

- Seed:
  - one quick recording
  - one sheet segment group with at least two valid takes
  - one no-segment or legacy sheet recording
  - one missing-artifact or unsupported waveform sheet recording
  - one invalid trusted-peaks recording if fixtures support it
  - organization metadata for tags, favorites, and archived state
  - best/active metadata and manual markers where current fixtures support it
- Verify:
  - user can select two visible sheet recordings and see factual metadata plus waveform evidence rows
  - user can select quick plus sheet recording and sees quick metadata with unavailable waveform evidence
  - source labels identify decoded audio/trusted peaks without score claims
  - filter changes remove or suspend hidden selected recordings according to the implemented rule
  - archived recording is not selectable in default active mode, is selectable in archived/all mode, and remains reviewable
  - deleting a selected recording updates comparison state
  - group-local waveform comparison still works in a sheet group
  - reload resets transient selection, or preserves only valid persisted selection if implemented
  - page text does not contain prohibited scoring/correctness/ranking/recommendation language
- Responsive E2E:
  - desktop keeps list/details and comparison usable
  - tablet-like viewport has no horizontal overflow
  - narrow mobile wraps controls, metadata, tags, and waveform rows without overlap

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
.\scripts\npm-local.ps1 exec vitest run tests/unit/recordings-review-experience.test.tsx tests/unit/recordings-review-waveform-comparison-sources.test.ts tests/unit/recordings-review-history.test.ts
```

If new helper/component test files are added, include them in the narrow Vitest command.

## Model Tier Recommendation

- Coding agent: GPT-5.5, high effort, standard speed
- Review agent: GPT-5.4, high effort, standard speed
- Verification agent: GPT-5.4, high effort, standard speed

Rationale: Tier D is recommended because the slice renders waveform evidence and must not fake, stale, or directly decode media data. If the final implementation is purely metadata comparison and only shows unavailable waveform states, Tier C/D may be acceptable, but scheduling should err careful because P2-10 is adjacent to media evidence. Do not use fast tier.

## Constraints For Coding Agent

- Reuse existing repository snapshot, filters, grouping, organization metadata, grouped review UI, P2-07 source boundary, and P2-08 comparison presentation.
- Keep comparison deterministic, local-only, and side-effect free except for transient UI state.
- Do not add packages.
- Do not add storage schema or migrations unless the refined implementation explicitly chooses persisted UI selection and tests it.
- Do not add backend/cloud/network behavior.
- Do not implement export/import/cleanup or destructive archive behavior.
- Do not introduce scoring, correctness, accuracy, ranking, recommendations, fake analysis badges, or automatic feedback.
- Do not add onset detection, alignment, new audio analysis, Pack 9 infrastructure, or direct decode/analyze calls in React.
- Do not let UI call Dexie/localStorage directly.
- Keep changes scoped to Recordings Review comparison UI, narrow reusable comparison components/helpers, and directly related tests.

## Handoff Notes For P2-11

- P2-11 audio export should treat P2-10 comparison selection as UI state, not export queue state.
- If P2-10 extracts reusable comparison components, P2-11 should not couple export controls to waveform evidence rendering.
- P2-11 may use selected/detail recording context for export affordances only after its own plan defines safe artifact export behavior.
- P2-10 must not add export preparation, file naming, download links, blob conversion, or artifact integrity checks.
- P2-11 should preserve P2-10's no-scoring and no-analysis language boundaries.
