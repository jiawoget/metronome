# P2-08 Waveform Comparison UI Plan

## Slice

- Slice id: P2-08 `waveform-comparison-ui`
- Pack: Pack 2 Segment Take Review
- Product contract: `takes.waveform-comparison` in `docs/v1/05c-sheet-recording-review.md`
- Related contracts: `recordings.review-grouping` / `recordings.recording-comparison` in `docs/v1/03-recordings-review.md`
- Depends on:
  - P2-01 `take-grouping-domain`
  - P2-02 `take-grouping-review-ui`
  - P2-03 `best-active-take-metadata`
  - P2-04 `best-active-take-ui`
  - P2-05 `take-history-summary`
  - P2-06 `take-history-return-to-practice`
  - P2-07 `waveform-comparison-source-boundary`
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier D recommended; Tier C/D hybrid only if no real media rendering evidence is touched, but err Tier D
- Status: ready for a fresh coding agent after this planning artifact; no product code is changed by this plan

## Goal

Add a compact waveform comparison UI to the grouped Recordings review surface so users can compare selected sheet takes using factual waveform evidence from the P2-07 source boundary. The UI must render ready and unavailable per-take states honestly, support comparison selection without inventing analysis, and preserve existing grouped review, best/active/latest, take summary, playback, delete, filters, and return-to-practice behavior.

## Product Contracts Covered

This slice covers only `takes.waveform-comparison` UI:

- Sheet/segment take histories can compare selected takes with waveform evidence.
- Waveform evidence comes from real decoded artifacts or validated trusted peaks supplied by P2-07.
- Comparison copy is factual: selected takes, artifact readiness, source kind, duration, and duration warnings.
- No automatic scoring, correctness, timing feedback, ranking, recommendation, alignment, or mistake detection is introduced.

This slice does not implement the broader `recordings.recording-comparison` feature for arbitrary recordings. P2-10 owns that later.

## Refined Scope

- Add waveform comparison controls and display inside each sheet take group in `/recordings`.
- Allow users to select takes to compare explicitly within a current P2-01 take group.
- Use `loadWaveformComparisonSourcesForGroup({ group, recordingIds })` from P2-07 for readiness and waveform data.
- Render a comparison area for the selected group with:
  - selected take labels
  - readiness state per selected take
  - waveform rows for ready sources
  - unavailable reason/message for unavailable sources
  - source label such as decoded audio or trusted peaks
  - duration and duration warning where P2-07 provides it
- Keep best, active, and latest visible as factual metadata but not as automatic comparison choices.
- Add unit/component and E2E coverage for ready waveforms, unavailable states, responsive layout, no scoring text, best/active/latest interaction, and reload behavior if selection is persisted.

## Explicit Out Of Scope

- No audio analysis engine, onset detection, alignment, timing deviation, pitch detection, BPM detection, or correctness claims.
- No automatic best/active/latest-based scoring or recommendation.
- No reference-to-recording comparison.
- No arbitrary quick recording comparison; quick recordings remain outside `takes.waveform-comparison`.
- No export, import, tags, favorites, archive, cleanup, cloud, backend, worker queue, or storage migration.
- No recording capture, MediaRecorder, metronome, Tone.js, playback service rewrite, or wavesurfer adapter rewrite.
- No new persistent schema unless the coding agent explicitly documents a narrow UI preference need; default is component state only.
- No direct decode/analyze/Tone/wavesurfer/WASM calls from React components.
- No fake analysis badges, quality chips, score charts, "improved", "cleanest", "recommended", "most accurate", or "mistakes" language.

## Current Code Context

Known current seams:

- `src/components/recordings-review/recordings-review-experience.tsx`
  - Owns `/recordings`.
  - Uses `groupRecordingsByTake(filteredRecordings)`.
  - `TakeGroupSection` renders group heading, take-history summary, active pill, practice link, best/active controls, and rows.
  - `RecordingDetails` renders selected recording playback/artifact review with existing waveform evidence.
- `src/lib/recordings-review/waveform-comparison-sources.ts`
  - P2-07 boundary exports:
    - `WaveformComparisonSourceState`
    - `WaveformComparisonReadySource`
    - `WaveformComparisonUnavailableSource`
    - `WaveformComparisonSourcesResult`
    - `getWaveformComparisonEligibility(recording)`
    - `loadWaveformComparisonSource(recording)`
    - `loadWaveformComparisonSources(recordings)`
    - `loadWaveformComparisonSourcesForRecordingIds(recordingIds)`
    - `loadWaveformComparisonSourcesForGroup({ group, recordingIds })`
  - Ready states expose peaks, duration, source kind, artifact details, and duration warning.
  - Unavailable states expose stable reason codes/messages.
- `src/lib/recordings-review/types.ts`
  - `RecordingTakeGroup` carries group id, kind, sheet/segment context, recordings, count, and latest.
  - `ResolvedRecordingTakeSelection` carries best and active recordings.
- Existing tests:
  - `tests/unit/recordings-review-experience.test.tsx`
  - `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
  - `tests/e2e/recordings-review.spec.ts`

## Selection Contract

Use explicit per-group selection for P2-08.

- Each sheet take row should expose a compare selection control, for example a checkbox/toggle labeled `Compare`.
- Selection is scoped to the current take group; do not compare across groups in this slice.
- Default selection:
  - If a group has at least two takes and no user selection yet, preselect up to two factual candidates for convenience:
    - active take when set and visible
    - best take when set and visible
    - latest take as a fallback
    - next latest visible take to reach two selections
  - The UI must label this as selected takes, not as recommended takes.
  - If implementing this default adds too much fragility, start with no automatic default and require explicit user selection; tests must document the chosen behavior.
- Manual selection overrides default behavior for that group during the current page session.
- Recommended limit: compare two to four takes at once.
  - One selected take may show a prompt such as `Select another take to compare`.
  - More than four selected takes should be prevented or show a factual limit message.
- Selection should not change best/active/latest metadata.
- Marking/unmarking best or active must not silently alter a user's manual comparison selection.
- Deleting a selected take removes it from comparison selection and re-runs P2-07 for remaining selected ids.
- Filters/search:
  - Comparison selection should only operate on visible group rows.
  - If a selected take is filtered out or leaves the current group, show the current visible selection or clear stale selected ids.
  - Filtering must not mutate best/active metadata.
- Reload/persistence:
  - Default: comparison selection is transient component state and resets on reload.
  - If the coding agent persists selection, it must be local UI preference only, must not add a schema migration, and must add reload tests.

## UI Behavior

- Add a compact comparison area inside `TakeGroupSection`, near the take-history summary and take rows.
- Keep it visually subordinate to the list/details review workflow; do not create a large analytics dashboard.
- Suggested structure:
  - small toolbar with selected count and factual action/status text
  - compare toggles on sheet take rows
  - waveform comparison rows beneath the group header or after selected rows
- Only sheet take groups get comparison controls.
- Quick and ungrouped recordings do not show compare controls or a fake unavailable comparison panel.
- For each selected id, call the P2-07 group boundary and render the returned state.
- Ready source row:
  - show recording display name/date
  - show source: `Decoded audio` or `Trusted peaks`
  - show duration from source data
  - show duration warning if present
  - render data-backed peaks only from P2-07
- Unavailable source row:
  - show recording display name if available, otherwise the selected id label
  - show the P2-07 unavailable message
  - expose the stable reason in tests via data attributes or accessible text only if useful
- Group-level state:
  - zero selected: `Select takes to compare`
  - one selected: `Select another take to compare`
  - loading: factual loading status while P2-07 resolves
  - mixed ready/unavailable: render ready rows and unavailable rows together
  - no ready sources: show unavailable messages; do not render placeholder fake waves

## Empty, Loading, And Error States

Handle these states explicitly:

- Missing artifact: show P2-07 `missing-artifact` message; no waveform bars.
- Stale/deleted recording: show `missing-recording` or remove the deleted visible selection after repository update; no stale cached wave.
- Stale group membership: show `stale-group-membership` when P2-07 returns it; do not invent a group.
- Invalid peaks: show `invalid-peaks` message; no waveform bars.
- Unsupported mime: show `unsupported-mime` message for non-audio artifacts.
- Decode failed or empty audio: show P2-07 message; no fake fallback wave.
- Invalid duration: show P2-07 unavailable state or duration warning according to returned state.
- Quick recordings: no compare controls in the quick section.
- Ungrouped/unsupported sheet recordings: no compare controls unless P2-01 grouped them as a valid sheet/no-segment group.
- Loading after selection changes: show a small `role="status"` region and keep prior result only if clearly marked as refreshing; prefer clearing stale visual results for the selected ids.
- Unexpected service exception: show a concise `role="alert"` message and keep the rest of the group usable.

## Waveform Rendering Contract

- Render factual peaks from P2-07 ready sources.
- Preferred first implementation: a lightweight presentational component that receives normalized peak arrays and draws non-interactive SVG or div bars.
- Do not call `loadRecordingArtifactDetails(...)`, `AudioContext`, wavesurfer, Tone, MediaRecorder, or WASM from React.
- Do not add a new waveform analysis library.
- If reusing the existing derived-waveform visual style from `RecordingArtifactReview`, extract/share a presentational peak-rendering component only if it stays adapter-free.
- Waveform rows must have stable height and responsive width.
- Normalize visual bar heights defensively, but do not alter source data or claim analysis.
- Do not align, time-stretch, score, or compare peaks mathematically.

## Accessibility Requirements

- Compare controls are keyboard reachable and have clear accessible names, for example `Select <take name> for waveform comparison`.
- Toggle state uses checkbox semantics or `aria-pressed` consistently.
- Comparison area has an accessible heading tied to the group, such as `Waveform comparison for <sheet/segment>`.
- Loading updates use `role="status"`.
- Unexpected failure uses `role="alert"`.
- Each waveform row has text alternatives with recording name, source kind, duration, and readiness.
- Waveform bars are not the only source of information; factual labels remain visible text.
- Color is not the only distinction between takes.
- Focus rings remain visible on row selection, best/active controls, compare controls, and practice links.

## Responsive And Visual Constraints

- Follow `docs/v1/ui-design.md` and `docs/v0/design-style-guide.md`.
- Keep Recordings a dense, calm practice review tool with compact rows and thin dividers.
- Use small waveform color accents; avoid a one-note palette.
- No nested cards. A bounded section inside the existing take group is acceptable.
- No marketing hero, decorative illustration, fake analytics panel, or score chart.
- Desktop: preserve the list/details split; comparison rows fit inside the left/group column without pushing details offscreen.
- Tablet: comparison rows wrap controls and labels without horizontal overflow.
- Mobile: comparison controls stack cleanly; waveform rows remain readable and touch targets remain usable.
- Text must wrap instead of clipping. No hidden overflow/overlap for labels, badges, waveform rows, or action buttons.
- Toggling compare/best/active should not cause dramatic layout jumps.

## Service Boundary Constraints

- UI must call P2-07 boundary/service for readiness:
  - Prefer `loadWaveformComparisonSourcesForGroup({ group, recordingIds })`.
  - Use returned `sources`, `readySources`, `unavailableSources`, `allReady`, `readyCount`, and `requestedCount`.
- React components must not directly decode, analyze, validate trusted peaks, inspect audio bytes, or call waveform adapter internals.
- UI must not read/write raw storage, Dexie, IndexedDB, or localStorage.
- UI must not mutate artifacts or repair stale metadata.
- UI may keep transient selected ids in React state.
- If a tiny helper is needed, keep it pure and UI-agnostic, for example selection defaults or waveform bar normalization.

## Expected Files And Areas To Touch

Likely touch:

- `src/components/recordings-review/recordings-review-experience.tsx`
- `tests/unit/recordings-review-experience.test.tsx`
- `tests/e2e/recordings-review.spec.ts`

Maybe touch:

- New `src/components/recordings-review/waveform-comparison-panel.tsx`
- New `src/components/recordings-review/peak-waveform-row.tsx` or similar adapter-free presentational component
- New `src/lib/recordings-review/waveform-comparison-selection.ts` for pure selection-default logic
- `tests/unit/recordings-review-waveform-comparison-ui.test.tsx` if extraction makes focused component tests cleaner
- `tests/unit/recordings-review-waveform-comparison-selection.test.ts` if a helper is added

Avoid:

- `src/lib/recordings-review/waveform-comparison-sources.ts` unless P2-07 has a confirmed bug
- `src/lib/recordings-review/artifact-service.ts`
- `src/lib/recordings-review/wavesurfer-adapter.ts`
- `src/lib/recordings-review/repository.ts` unless a narrow subscription/read issue is discovered
- recording capture, playback internals, metronome/Tone services, sheet-practice recording workflow, storage schema, migrations, backend/cloud code, and Pack 9 analysis files

## Acceptance Criteria

- `/recordings` lets users select takes to compare inside valid sheet take groups.
- Comparison readiness and waveform data come only from P2-07.
- Ready selected takes render data-backed waveform rows with factual source/duration labels.
- Unavailable selected takes render per-take P2-07 messages for missing/stale/deleted artifacts, invalid peaks, unsupported mime, decode/empty/invalid-duration cases, and stale group membership.
- Quick and ungrouped recordings do not get fake comparison controls.
- Best, active, and latest remain visible factual metadata and are not treated as automatic ranking/correctness.
- Existing grouped review, row selection, details playback, artifact review, delete, filters/search, take summary, best/active controls, and return-to-practice links remain usable.
- No scoring/correctness/ranking/recommendation language appears in UI or returned UI helper labels.
- Desktop, tablet, and mobile layouts render without hidden overflow, clipped labels, overlap, or unusable controls.
- Unit/component and E2E tests cover ready, unavailable, no-scoring, responsive, best/active/latest, and reload/persistence behavior as applicable.

## Test Plan

Unit/helper tests:

- If selection helper is added:
  - default selection uses active/best/latest only as factual candidates, not recommendations
  - manual selection overrides defaults
  - max selected limit is enforced
  - deleted/filtered ids are removed or ignored deterministically
  - quick/ungrouped recordings are never selectable
- If waveform presentational component is extracted:
  - ready peaks render a stable number of bars/segments
  - invalid/empty visual input does not crash and does not show fake bars
  - accessible labels include recording name/source/duration
  - no prohibited scoring words appear

Component tests:

- Extend `tests/unit/recordings-review-experience.test.tsx` or add a focused component test.
- Cover:
  - compare controls render only for sheet take groups
  - selecting two valid takes calls/renders P2-07 ready states
  - ready decoded audio and trusted peaks render factual labels
  - one selected take prompts for another take
  - missing artifact, unsupported mime, invalid peaks, missing/deleted recording, stale group membership, decode failure, and invalid duration render per-take unavailable states
  - quick and ungrouped sections have no compare controls
  - best/active toggles continue to work and do not change manual comparison selection
  - latest label remains distinct from comparison selection
  - deleting a selected take updates comparison state without stale waveform output
  - filter/search hides controls for nonvisible rows and does not mutate best/active metadata
  - no scoring/correctness/ranking/recommendation text is present

E2E:

- Extend `tests/e2e/recordings-review.spec.ts`.
- Seed local recording history with:
  - one segment sheet group with at least three takes
  - valid decoded artifact take
  - valid trusted-peaks take
  - missing-artifact take
  - unsupported-mime or invalid-peaks take if fixture setup supports it
  - quick recording
  - no-segment sheet group
  - best and active metadata for at least one group
- Assert:
  - user can select two valid sheet takes and see waveform evidence rows
  - source labels identify decoded audio/trusted peaks without score claims
  - unavailable selected take shows the correct factual message and no fake waveform
  - quick filter/section has no compare controls
  - best/active controls still update group status while comparison selection remains factual
  - latest remains a separate label
  - delete of a selected take clears or updates the comparison panel
  - reload resets transient selection, or preserves it only if the implementation intentionally persists UI selection
  - no prohibited scoring/correctness text appears on the page
- Responsive E2E:
  - desktop viewport checks list/details and waveform rows are visible
  - tablet-like viewport checks no horizontal overflow
  - narrow mobile viewport checks wrapped labels, usable compare toggles, and no overlap

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
.\scripts\npm-local.ps1 exec vitest run tests/unit/recordings-review-experience.test.tsx tests/unit/recordings-review-waveform-comparison-sources.test.ts
```

If new component/helper test files are added, include them in the narrow Vitest command.

## Model Tier Recommendation

- Coding agent: GPT-5.5, high effort, standard speed
- Review agent: GPT-5.4, high effort, standard speed
- Verification agent: GPT-5.4, high effort, standard speed

Rationale: Tier D is recommended because this UI renders media/waveform evidence and a false pass could display fake or stale waveform comparison. If the coding agent only composes already-validated peaks into a simple presentational component, this has Tier C UI characteristics, but the verification still needs Tier D caution due to media evidence. Do not use fast tier.

## Constraints For Coding Agent

- Reuse current `/recordings` route, grouped review UI, P2-01 grouping, P2-03/P2-04 best-active APIs, P2-05 summary behavior, and P2-07 source boundary.
- Keep selection scoped to visible sheet take groups.
- Keep latest, best, active, and comparison selection separate.
- Use only factual waveform evidence and source messages.
- Do not add packages.
- Do not add storage schema or migrations.
- Do not add audio analysis, onset detection, alignment, export, backend/cloud, or Pack 9 infrastructure.
- Do not let React components call decode/analyze/Tone/wavesurfer/WASM directly.
- Do not introduce scoring, correctness, accuracy, ranking, recommendations, or fake analysis badges.
- Keep changes scoped to Recordings Review UI, adapter-free presentational waveform display, and directly related tests/helpers.

## Handoff Notes For P2-09

- P2-09 tags/favorites/archive should treat comparison selection as UI-local and not as organization metadata.
- If P2-08 adds component state only, P2-09 has no persistence migration dependency.
- If P2-08 extracts a presentational waveform row, P2-09 should not alter it unless tags/favorites need row-level badges nearby.
- P2-09 filters must preserve P2-08's rule that comparison controls appear only for valid visible sheet take groups.
- Tags/favorites/archive must not reinterpret waveform evidence as score, quality, or recommendation.
