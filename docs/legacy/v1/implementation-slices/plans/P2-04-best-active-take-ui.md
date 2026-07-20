# P2-04 Best Active Take UI Plan

## Slice

- Slice id: P2-04 `best-active-take-ui`
- Pack: Pack 2 Segment Take Review
- Product contract: `takes.active-best-take` in `docs/v1/05c-sheet-recording-review.md`
- Related contracts: `takes.multi-take-management` and `recordings.review-grouping`
- Depends on:
  - P2-01 `take-grouping-domain`
  - P2-02 `take-grouping-review-ui`
  - P2-03 `best-active-take-metadata`
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier C, user-facing UI with browser E2E
- Status: ready for a fresh coding agent after this planning artifact; no product code is changed by this plan

## Goal

Add explicit user controls and status display for marking and unmarking the best take and active take inside the grouped Recordings review UI. Best and active are separate, user-controlled selections backed by the P2-03 repository APIs. The UI must never infer best or active from latest, score, duration, marker count, waveform shape, or any automatic comparison.

## Refined Scope

- Render best/active status for each sheet take group in `/recordings`.
- Add per-take controls to mark or unmark a recording as best take.
- Add per-take controls to mark or unmark a recording as active take.
- Treat best and active as independent selections:
  - one recording may be both best and active
  - best may be set while active is unset
  - active may be set while best is unset
  - clearing one must preserve the other
- Consume P2-03 repository/service methods for read, write, and resolve behavior.
- Update the grouped list immediately after metadata writes through the existing repository subscription flow.
- Preserve P2-02 grouped list, details, playback, delete, filter, search, reload, and selected-recording behavior.
- Show stale/deleted metadata as an unselected state with minimal honest status, not as a fatal UI error.
- Add focused unit/component tests and browser E2E coverage for mark/unmark, persistence after reload, delete cleanup, and filter/group edge cases.

## Explicit Out Of Scope

- No waveform comparison, multi-waveform selection, waveform source changes, audio decoding, or peak verification.
- No take history summary beyond minimal best/active/latest status labels needed for this UI.
- No export, import, tags, favorites, archive, backup/restore, or cleanup workflow.
- No schema migration, no new persistence backend, and no direct storage access from UI.
- No automatic best selection, active selection, ranking, scoring, recommendations, timing feedback, or mistake detection.
- No fake correctness claims such as "best performance", "most accurate", "cleanest", or "recommended".
- No changes to recording capture, MediaRecorder, metronome, artifact playback internals, wavesurfer internals, or sheet-practice recording flow.
- No route redesign and no group-level delete.
- No quick-recording best/active metadata. P2-03 metadata is scoped to sheet take groups.

## Product Contracts Covered

This slice covers the UI controls/display side of `takes.active-best-take`:

- Users can mark and unmark a best take.
- Users can mark and unmark an active take.
- Best and active are separate explicit user selections.
- Latest remains a separate derived concept from recording time.
- Segment-aware takes use saved recording segment context through P2-01 group identity.
- Metadata persists locally through P2-03 and survives reload.

It also preserves `recordings.review-grouping` and `takes.multi-take-management` by keeping the grouped Recordings review surface intact and avoiding DAW-like editing or analysis-backed claims.

## Current Code Context

Known current seams:

- `src/app/recordings/page.tsx`
  - Renders the Recordings review route.
- `src/components/recordings-review/recordings-review-experience.tsx`
  - Owns grouped list, selection, details, playback, marker seeking, delete, filters, and responsive route layout.
  - Currently imports `groupRecordingsByTake(...)` and `recordingHistoryRepository`.
  - `TakeGroupSection` renders grouped sheet take rows.
  - `RecordingListItem` is the compact row button with `aria-pressed` selected state.
- `src/lib/recordings-review/repository.ts`
  - P2-03 APIs available:
    - `recordingHistoryRepository.getTakeSelections()`
    - `recordingHistoryRepository.getTakeSelection(groupId)`
    - `recordingHistoryRepository.resolveTakeSelection(group)`
    - `recordingHistoryRepository.setBestTake(group, recordingId | null)`
    - `recordingHistoryRepository.setActiveTake(group, recordingId | null)`
    - `recordingHistoryRepository.clearTakeSelection(groupId)`
  - `deleteRecording(...)` removes affected best/active refs.
- `src/lib/recordings-review/types.ts`
  - Exposes `RecordingTakeGroup`, `RecordingTakeSelectionMetadata`, and `ResolvedRecordingTakeSelection`.
- Existing tests to extend:
  - `tests/unit/recordings-review-experience.test.tsx`
  - `tests/unit/recordings-review-repository.test.ts`
  - `tests/e2e/recordings-review.spec.ts`

## Required API Consumption

- UI components must not read, write, or normalize `takeSelections` directly.
- UI components must not call `window.localStorage`, IndexedDB, Dexie, or storage contract constants directly.
- Use P2-03 repository APIs:
  - Read display state with `recordingHistoryRepository.resolveTakeSelection(group)`.
  - Mark best with `recordingHistoryRepository.setBestTake(group, recording.id)`.
  - Unmark best with `recordingHistoryRepository.setBestTake(group, null)` when the current row is best.
  - Mark active with `recordingHistoryRepository.setActiveTake(group, recording.id)`.
  - Unmark active with `recordingHistoryRepository.setActiveTake(group, null)` when the current row is active.
- Keep grouping authority in P2-01:
  - Do not reimplement grouping, latest selection, or segment/no-segment identity in React.
  - Continue to use `groupRecordingsByTake(filteredRecordings)` or an existing thin service wrapper.
- Handle repository validation errors defensively:
  - Invalid mark attempts should not crash the route.
  - A small inline `role="alert"` message is acceptable if an operation fails.
  - Do not silently create metadata for quick or ungrouped recordings.

## Required UI Behavior

Sheet take groups:

- Each group should show minimal status for current selections:
  - `Best: <take label>` or `Best: none`
  - `Active: <take label>` or `Active: none`
- Status labels must be non-color affordances, for example small text badges or icon+text chips.
- Existing latest display remains visible as `Latest ...` and must not be renamed best/active.
- If the same recording is both best and active, show both labels; do not collapse them into one ambiguous state.

Take rows:

- Each sheet take row gets two independent controls:
  - Best control: mark this recording as best, or clear best if this recording is already best.
  - Active control: mark this recording as active, or clear active if this recording is already active.
- Controls should use explicit labels or recognizable icons with accessible names.
- Suggested visible labels:
  - `Best` / `Best set`
  - `Active` / `Active set`
  - or compact icon+text variants such as star/check with text.
- Pressed state:
  - The best control exposes `aria-pressed="true"` only when this row is the current best.
  - The active control exposes `aria-pressed="true"` only when this row is the current active take.
  - The row selection `aria-pressed` remains separate from best/active control pressed states.
- Clicking a best/active control must not accidentally toggle row selection unless the coding agent intentionally preserves a clear selection behavior. If nested buttons make this awkward, refactor the row so the selectable row body and row actions are sibling buttons rather than invalid nested interactive elements.
- Marking another recording as best replaces the prior best for that group only.
- Marking another recording as active replaces the prior active for that group only.
- Unmarking a selected best clears best for that group and preserves active.
- Unmarking a selected active clears active for that group and preserves best.

Quick and ungrouped recordings:

- Quick recordings must not show best/active controls.
- Unsupported/ungrouped recordings with missing sheet links must not show best/active controls.
- Existing selection, details, playback, delete, and Practice Again behavior for these rows must remain intact.

## Deleted, Stale, And Missing Metadata Behavior

- Deleting a recording selected as best clears or removes the best ref through P2-03 repository behavior.
- Deleting a recording selected as active clears or removes the active ref through P2-03 repository behavior.
- If the deleted recording was both best and active, both visible states clear.
- After delete:
  - group take counts update
  - empty groups disappear
  - selected-recording fallback follows P2-02 behavior
  - no stale best/active chip remains for the deleted recording
- If stale metadata is loaded manually or from older storage:
  - `resolveTakeSelection(group).bestRecording` or `.activeRecording` may be `null`
  - UI should display the corresponding group status as `Best: none` or `Active: none`
  - UI must not repair storage directly during render
  - UI must not hide valid recordings because of stale metadata
- If there is no metadata yet, every sheet group starts with no best and no active state.

## Interaction With P2-02 UI

- Keep the current Recordings review route and grouped layout.
- Preserve grouped sheet take sections, quick recording section, and ungrouped legacy section.
- Preserve search and type filters:
  - filtering hides groups with no visible rows
  - best/active controls appear only on visible sheet take rows
  - if the marked best/active recording is filtered out, the group status may show `Best: none visible` / `Active: none visible` only if that can be done honestly from resolved filtered state; simpler `Best: none` is acceptable for filtered grouping
  - metadata itself must not be cleared by filtering
- Preserve selection/details:
  - selecting rows still updates the details panel
  - details playback/artifact review still uses the selected recording
  - best/active controls do not replace the selected recording details flow
- Preserve delete:
  - existing delete confirmation remains in details
  - deleting updates P2-03 metadata through repository cleanup
- Preserve reload:
  - grouped rows and best/active states survive reload via the repository snapshot.

## Accessibility Expectations

- Group status labels must be exposed as text, not color alone.
- Best and active controls require specific accessible names, for example:
  - `Mark <display name> as best take`
  - `Clear best take for <display name>`
  - `Mark <display name> as active take`
  - `Clear active take for <display name>`
- Controls use `aria-pressed` to reflect toggled state.
- Keyboard users can tab to:
  - the row selection target
  - the best control
  - the active control
- `Enter` and `Space` activate each focused control with normal button semantics.
- Focus rings must remain visible on row selection and both controls.
- Icon-only controls require `aria-label`; unfamiliar icon-only controls need tooltip or visible text.
- Status/error messages use `role="status"` for successful transient updates and `role="alert"` for failures where applicable.
- Do not rely on yellow/green/purple color alone to indicate best, active, selected, latest, or stale state.
- Row accessible labels should remain concise but include enough context: display name, group context, recorded date, and selected metadata state where practical.

## Design And Responsive Constraints

- Follow `docs/v1/ui-design.md` and `docs/v0/design-style-guide.md`.
- Keep the page a dense practice review tool with compact rows and restrained metadata.
- No nested card pileups. If the existing surface uses top-level cards, add row actions and badges inside list sections with dividers or simple inline controls.
- Use small badges/icons for best/latest/active state, consistent with the v1 review direction.
- Keep controls stable in size so toggling best/active does not shift row height dramatically.
- Desktop:
  - preserve the list/details split
  - row controls should align cleanly with existing metadata pills
- Tablet/iPad landscape:
  - no horizontal overflow
  - controls remain reachable without pushing details out of view
- Mobile:
  - row content, metadata, and controls may stack
  - labels must wrap without clipping or overlapping
  - touch targets should remain comfortably tappable
- Avoid decorative illustrations, hero treatment, fake analytics, score chips, or waveform-comparison affordances.

## Expected Files And Areas To Touch

Likely touch:

- `src/components/recordings-review/recordings-review-experience.tsx`
- `tests/unit/recordings-review-experience.test.tsx`
- `tests/e2e/recordings-review.spec.ts`

Maybe touch:

- `src/lib/recordings-review/format.ts` for a tiny reusable take label formatter if needed.
- `src/lib/recordings-review/history.ts` only if accessible row labels need an existing display helper to include selection status.
- `tests/unit/recordings-review-repository.test.ts` only if UI work reveals a narrow regression in P2-03 behavior; do not expand repository scope otherwise.
- A new small component file under `src/components/recordings-review/` if extracting row actions keeps the main route component readable.
- A new focused unit/component test file if row actions are extracted.

Avoid:

- `src/lib/recordings-review/repository.ts` unless P2-03 API behavior is demonstrably broken.
- `src/lib/recordings-review/take-selection-metadata.ts` unless P2-03 API behavior is demonstrably broken.
- `src/lib/recordings-review/take-groups.ts` unless P2-01 grouping has a confirmed bug.
- `src/app/*` beyond the existing recordings route if absolutely necessary.
- Recording capture, playback service internals, waveform adapter internals, sheet-practice recording workflow, storage schema, and database repositories.

## Acceptance Criteria

- `/recordings` shows best and active status for sheet take groups with no status inferred from latest.
- Sheet take rows provide independent mark/unmark controls for best and active.
- Best and active can point to the same recording, different recordings, or neither.
- Clearing best preserves active, and clearing active preserves best.
- UI uses P2-03 repository APIs and does not access localStorage, IndexedDB, Dexie, or raw `takeSelections` directly.
- No metadata state appears for quick recordings or ungrouped unsupported recordings.
- Existing grouped list, selection, details, playback, marker seeking, delete, filters, Practice Again, and reload behavior remain usable.
- Deleted or stale marked recordings resolve to unselected display without crashing or hiding valid takes.
- Browser E2E verifies mark/unmark, reload persistence, delete cleanup, and filter/group edge cases.
- Desktop, tablet, and narrow mobile layouts have no clipped labels, overlap, invalid nested interactive controls, or unusable actions.

## Test Plan

Unit/component tests:

- Extend `tests/unit/recordings-review-experience.test.tsx` or add a focused row-actions component test.
- Cover:
  - initial sheet group renders `Best: none` and `Active: none`
  - clicking best marks one row and exposes `aria-pressed="true"` on that best control
  - clicking active marks one row independently
  - same row can be both best and active
  - changing best to another row does not change active
  - clearing best preserves active
  - clearing active preserves best
  - quick and ungrouped sections do not render best/active controls
  - row selection still works with row actions present
  - stale resolved metadata renders as no selected best/active state
  - failed repository set operation shows or preserves a safe UI state without crashing, if mocking this is practical

Repository regression tests:

- Existing P2-03 repository tests should remain the main coverage for validation, persistence, duplicate metadata, stale refs, and delete cleanup.
- Add repository tests only if the UI requires a missing helper or exposes a P2-03 bug.

Browser E2E:

- Extend `tests/e2e/recordings-review.spec.ts`.
- Seed local recording history with:
  - one segment sheet group with at least two takes
  - one no-segment sheet group with legacy/`null` segment context takes
  - one quick recording
  - one unsupported/ungrouped sheet recording if existing fixtures support it
- Assert:
  - best and active controls are visible only for sheet grouped takes
  - marking best updates visible row state and group status
  - marking active updates visible row state and group status
  - best and active can be different rows
  - same row can show both states
  - unmarking best leaves active intact
  - unmarking active leaves best intact
  - reload preserves best/active state
  - deleting a best recording clears best and preserves unrelated active
  - deleting an active recording clears active and preserves unrelated best
  - deleting a recording marked both clears both
  - type filter `quick` hides sheet controls and does not clear metadata
  - type filter `sheet` restores sheet controls and persisted state
  - search/filter hides nonmatching groups without mutating metadata
  - selected row details/playback/delete still work after using mark controls
- Responsive E2E:
  - run core visibility/control assertions at desktop width
  - add tablet-like and narrow mobile viewport checks for no overlapping controls and usable best/active buttons

Negative cases:

- No recordings shows global empty state.
- No metadata yet shows no best/active selected.
- Stale metadata in storage does not crash and does not show fake selected rows.
- Filtered-out marked recording does not clear persisted metadata.
- Quick recording cannot be marked best/active from the UI.

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

Final verification should include lint, typecheck, relevant unit/component tests, and the Recordings Review browser E2E.

## Model Tier Recommendation

- Coding agent: GPT-5.5, high effort, standard speed
- Review agent: GPT-5.4, medium effort, standard speed
- Verification agent: GPT-5.4-mini, high effort, standard speed

Rationale: Tier C is appropriate because this is user-facing UI with responsive and browser E2E requirements. It consumes an existing local metadata repository but does not add schema migration, media capture, waveform comparison, export, or destructive cleanup. Do not use fast tier.

## Constraints For Coding Agent

- Reuse existing route, grouped UI, repository, types, format helpers, styles, and test fixture patterns.
- Consume P2-03 metadata APIs; do not read/write storage directly.
- Keep P2-01 grouping and P2-02 grouped review behavior intact.
- Keep latest derived from recording time only.
- Keep best and active user-controlled only.
- Keep best and active separate and independently clearable.
- Do not add packages.
- Do not add a new persistence backend.
- Do not add migration code.
- Do not add waveform comparison, scoring, automatic selection, export, tags, favorites, archive, or cleanup behavior.
- Do not show fake correctness or recommendation claims.
- Keep changes scoped to Recordings Review UI and directly related tests/helpers.

## Handoff Notes For P2-05

- P2-05 can build take-history summary display on top of the visible best/active/latest distinctions from this slice.
- P2-05 should not reinterpret best/active as scoring or correctness.
- P2-05 may show take count, latest, best, duration, BPM, time signature, and marker summary, but should keep summary data derived from existing repository/grouping/artifact metadata.
- P2-05 should preserve the controls introduced here and avoid turning the compact row status into a broad analytics panel.
- If P2-04 extracts row action/status subcomponents, P2-05 should reuse them instead of duplicating best/active display logic.
