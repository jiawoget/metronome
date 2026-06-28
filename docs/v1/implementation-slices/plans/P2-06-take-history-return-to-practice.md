# P2-06 Take History Return To Practice Plan

## Slice

- Slice id: P2-06 `take-history-return-to-practice`
- Pack: Pack 2 Segment Take Review
- Product contract: `takes.take-history` in `docs/v1/05c-sheet-recording-review.md`
- Related contracts: `recordings.review-grouping` in `docs/v1/03-recordings-review.md` and Pack 1 `practice.practice-segments` / `practice.segment-rerecording` in `docs/v1/05f-practice-segments.md`
- Depends on:
  - P2-01 `take-grouping-domain`
  - P2-02 `take-grouping-review-ui`
  - P2-05 `take-history-summary`
  - P1 segment selection and rerecord workflow store
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier C, user-facing UI/navigation with browser E2E
- Status: ready for a fresh coding agent after this planning artifact; no product code is changed by this plan

## Goal

Let users return from grouped take history to the correct Sheet Practice context. A segment take group or segment-linked selected take should open the matching sheet with the matching current segment selected when that segment still exists and is valid. No-segment sheet takes should return to the sheet with no selected segment. Quick recordings and unsupported ungrouped recordings must keep their existing safe behavior and must not receive fake segment return affordances.

## Refined Scope

- Add segment-aware return-to-practice navigation for sheet take histories in `/recordings`.
- Reuse the existing route family:
  - `/sheet-practice?sheetId=...&recordingId=...`
  - `/sheet-practice/[sheetId]?recordingId=...`
  - existing quick route `/quick-metronome?recordingId=...`
- Extend the existing sheet practice route/query handoff narrowly enough to carry a target segment id from take history.
- Hydrate the existing P1 segment selection policy on Sheet Practice by setting `useSheetPracticeRecordingWorkflowStore.setActiveSegment(sheetId, segmentId)` only after the current segment list confirms the segment still exists for that sheet.
- Keep the existing `recordingId` handoff for review/rerecord context where applicable.
- Add visible and accessible return/practice controls in grouped take UI where a user naturally expects them:
  - group-level action for sheet take groups
  - selected/details action for a selected recording
  - row-level action only if it fits the existing compact row pattern without crowding
- Preserve existing quick `Practice Again` behavior.
- Add stale/deleted target validation and user-visible fallback states.
- Add focused unit/component and E2E coverage for correct sheet+segment return, no-segment fallback, stale targets, quick exclusion, and reload/persistence expectations.

## Explicit Out Of Scope

- No new global continue-practice feature.
- No session history implementation.
- No cloud, account, or cross-device resume.
- No recommendation system or home dashboard resume card.
- No scoring, waveform comparison, waveform source work, export, tags, favorites, archive, cleanup, or marker authoring.
- No new persistence backend, schema migration, or storage of a global "last segment to resume".
- No recording capture changes, MediaRecorder changes, metronome timing changes, or session service redesign.
- No automatic repair of deleted/stale sheet or segment references.
- No broad route redesign. Keep this as a narrow query/selection handoff.

## Product Contracts Covered

`takes.take-history`:

- Take history can navigate back to practice from a sheet or segment take context.
- Segment-aware histories use saved recording `segmentContext` as the return target, then validate it against the current segment repository before selecting it.
- No-segment sheet histories remain valid and return to whole-sheet practice.
- The navigation is factual and local-first; it does not imply scoring, readiness, or recommendation.

Pack 2 acceptance path:

- After reviewing grouped takes, the user can return to the exact sheet and, when still valid, the exact segment context used by the take history.
- Quick recordings remain in the unified review surface but route to Quick Metronome, not Sheet Practice segment state.
- Legacy and unsupported recordings stay visible and safe without crashing or inventing missing context.

## Current Code Context

Known existing seams:

- `src/lib/recordings-review/history.ts`
  - `getContinuePracticeHref(recording)` currently routes sheet recordings with `recordingId` and `sheetId`, and quick recordings to Quick Metronome.
  - This is the preferred place to add a narrow return href helper instead of scattering route string construction in React.
- `src/domain/sheet/routes.ts`
  - `getSheetPracticeHref(sheetId)` returns `/sheet-practice/[sheetId]`.
  - `getSheetPracticeQueryHref({ sheetId, recordingId })` returns `/sheet-practice?...`.
  - Extend or add a sibling helper for an optional return target segment id.
- `src/app/sheet-practice/page.tsx` and `src/app/sheet-practice/[sheetId]/page.tsx`
  - Parse `sheetId` and `recordingId`, then render `SheetViewerExperience`.
  - Add parsing for the narrow return segment query.
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
  - Passes `sourceRecordingId` into `SheetPracticeControls`.
  - Add an optional initial/return segment id prop and pass it to controls.
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - Owns practice controls composition and P1 rerecord validation.
  - Pass the return segment id into `PracticeSegmentSelectorPanel`; do not create a separate selection system here.
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
  - Owns loading segments, selected segment key, and `setActiveRecordingSegment(sheetId, segment.id)`.
  - This is the correct place to validate and apply an initial segment id after `listSegments(sheetId)` resolves.
- `src/stores/sheet-practice-recording-workflow-store.ts`
  - Existing policy for `activeSegmentId`, rerecord readiness, no-segment context, stale segment invalidation, and selection changes.
  - Reuse this store; do not add a new resume store.
- `src/components/recordings-review/recordings-review-experience.tsx`
  - Owns grouped take rendering, selected details, and the existing `Practice Again` action.
  - Add/adjust actions here while keeping P2-01 grouping, P2-04 best/active, and P2-05 summary behavior intact.

## Route And Query Contract

Preferred route contract:

- Add optional query key `segmentId` to Sheet Practice return links.
- Sheet segment return:
  - `/sheet-practice?sheetId=<sheetId>&recordingId=<recordingId>&segmentId=<segmentId>`
  - or `/sheet-practice/<sheetId>?recordingId=<recordingId>&segmentId=<segmentId>` if the local route helper chooses path style.
- No-segment sheet return:
  - `/sheet-practice?sheetId=<sheetId>&recordingId=<recordingId>`
  - no `segmentId` query key.
- Sheet group-level return:
  - Use the group's latest recording id as `recordingId` unless the UI action is explicitly attached to a selected row.
  - Use `group.segmentId` only for `group.kind === "sheet-segment"`.
- Selected-take return:
  - Use the selected recording's own `segmentContext?.segmentId` when present.
  - Use no `segmentId` for explicit no-segment/legacy takes.
- Quick return:
  - Keep `/quick-metronome?recordingId=<recordingId>`.
- Unsupported/ungrouped sheet recordings with missing or blank `sheetId`:
  - Do not produce a sheet-practice segment return.
  - Preserve existing safe fallback if `getContinuePracticeHref` currently returns `/sheet-practice?recordingId=...`; otherwise disable the sheet return and show honest unavailable copy.

Do not use query keys that imply global resume or session restoration, such as `continue`, `resume`, `sessionId`, or `lastPractice`.

## UX And Navigation Behavior

- Group-level sheet segment action:
  - Label: `Return to segment practice` or `Practice segment`.
  - Accessible name should include the sheet and segment context, e.g. `Return to practice for Bridge on Autumn Study`.
  - Opens Sheet Practice for the group's sheet, preselecting the target segment when valid.
- Group-level no-segment action:
  - Label: `Return to sheet practice` or `Practice sheet`.
  - Opens Sheet Practice with no active segment selected.
- Selected recording/details action:
  - Keep existing `Practice Again` affordance, but make its href segment-aware for sheet recordings with saved segment context.
  - For quick recordings, keep Quick Metronome behavior and label.
- On Sheet Practice after navigation:
  - If `segmentId` is present and valid for the loaded sheet, the segment row is selected and exposes the existing `Active` badge.
  - The workflow store's `activeSegmentId` matches the selected segment id.
  - Existing rerecord behavior may become ready only when the existing P1/P1-rerecord conditions are met; P2-06 must not force readiness by bypassing validation.
  - If no `segmentId` is present, no segment is selected and whole-sheet recording remains valid.
- Reload/persistence:
  - Query-driven selection should reapply after reload while the URL includes `segmentId`.
  - Do not persist a global segment resume target after the user navigates elsewhere or removes the query.
  - Once the user manually selects another segment or no segment, existing P1 selection behavior should take over.

## Target Validation And Fallbacks

Deleted or stale sheet:

- Existing sheet viewer loading/error behavior should handle unknown or deleted sheets.
- Do not add a fake sheet shell.
- E2E should assert the route shows the existing missing-sheet error state and no crash.

Deleted or stale segment:

- `PracticeSegmentSelectorPanel` must validate `segmentId` against `practiceSegmentService.listSegments(sheetId)` or `getSegment(sheetId, segmentId)`.
- If the target segment is missing:
  - clear active segment through `setActiveRecordingSegment(sheetId, null)`
  - invalidate rerecord source using existing stale reason such as `source-segment-missing` where applicable
  - show a small recoverable state near the segment panel, e.g. `Saved segment is no longer available. Sheet practice is ready without a selected segment.`
  - keep Sheet Practice usable in no-segment mode.

Segment belongs to another sheet or is invalid:

- Treat as stale/invalid, clear active segment, and show a recoverable fallback.
- Do not silently select a segment from a different sheet.

Missing no-segment context:

- A sheet take with `segmentContext: null` or absent `segmentContext` is not an error.
- Return to the correct sheet with no active segment selected.
- Do not show stale segment warnings for no-segment histories.

Quick recordings:

- Quick recordings remain excluded from segment/sheet group return controls.
- Their details action routes to Quick Metronome only.

Ungrouped/unsupported recordings:

- Missing `sheetId` or invalid sheet metadata must not crash.
- Preserve selection/playback/details/delete.
- Return action should either use the existing conservative fallback or be disabled with an accessible unavailable state; do not create fake sheet or segment targets.

## Service And Helper Boundaries

Preferred implementation:

- Add or extend route helpers in `src/domain/sheet/routes.ts`:
  - accept optional `segmentId`
  - use `URLSearchParams`
  - omit empty values
- Add or extend review helper in `src/lib/recordings-review/history.ts`:
  - `getReturnToPracticeHref(recording)` or segment-aware `getContinuePracticeHref(recording)`
  - optional helper for `RecordingTakeGroup`, e.g. `getTakeGroupPracticeHref(group)`
- Keep React components consuming these helpers; no ad hoc route strings inside JSX except existing quick href if left unchanged.
- Sheet Practice should use the existing segment service and workflow store for selection validation.
- Do not let UI call Dexie/localStorage directly.
- Do not add a new session/continue-practice service.

## Accessibility Expectations

- Return/practice controls must be real links or buttons with visible labels.
- Icon-only controls are not recommended here; if used, they must have `aria-label` and tooltip/visible adjacent text.
- Accessible names should distinguish:
  - quick vs sheet
  - segment vs no-segment
  - target sheet and segment names when available
- Segment rows keep `aria-pressed` selected state and visible focus rings.
- Stale/deleted segment fallback copy should use a status pattern that is announced politely, e.g. `role="status"` near the segment panel.
- Disabled/unavailable return states must be perceivable by text, not color alone.
- Avoid relying on summary chips alone for navigation meaning.

## UI And Responsive Constraints

- Follow `docs/v1/ui-design.md` and `docs/v0/design-style-guide.md`.
- Keep Recordings dense and tool-like.
- No nested cards, marketing hero, decorative illustration, scoring panel, or broad visual redesign.
- Return controls should fit the existing grouped take header/details action area with compact text and a familiar icon such as `RotateCcw` if already used.
- Desktop: group-level action should not push summary metadata into overflow.
- Tablet/mobile: labels must wrap cleanly; buttons must remain touch-friendly and not overlap row actions or best/active controls.
- If row-level actions crowd the UI, prefer group header plus selected details action.

## Expected Files And Areas To Touch

Likely touch:

- `src/domain/sheet/routes.ts`
- `src/lib/recordings-review/history.ts`
- `src/components/recordings-review/recordings-review-experience.tsx`
- `src/app/sheet-practice/page.tsx`
- `src/app/sheet-practice/[sheetId]/page.tsx`
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/components/sheet-practice/controls/types.ts`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
- `tests/unit/recordings-review-history.test.ts`
- `tests/unit/recordings-review-experience.test.tsx`
- `tests/unit/practice-segment-selector.test.tsx`
- `tests/e2e/recordings-review.spec.ts`

Maybe touch:

- `tests/unit/sheet-practice-recording-workflow-store.test.ts` only if a missing validation reason needs a narrow store addition.
- `tests/unit/navigation-config.test.ts` only if route helper behavior affects nav active state.
- `src/lib/recordings-review/types.ts` only if a helper type export is needed; avoid changing persisted shapes.

Avoid:

- Recording capture services and MediaRecorder adapters.
- Playback/waveform services and `RecordingArtifactReview` internals.
- Take grouping, take selection, and summary helpers unless a narrow route helper import is required.
- Practice session services.
- Home continue-practice code.
- IndexedDB schema or migration files.
- Quick Metronome implementation beyond preserving its existing link target.

## Acceptance Criteria

- Segment take group return action navigates to Sheet Practice for the correct sheet and selects the matching current segment when it exists.
- Selected segment-linked take `Practice Again` navigates to the correct sheet and segment context.
- No-segment sheet group/take return navigates to the correct sheet with no active segment selected and no stale warning.
- Deleted/stale segment target falls back to usable sheet practice with no active segment and a recoverable visible status.
- Deleted/stale sheet target shows the existing missing-sheet error state and does not crash.
- Quick recordings keep Quick Metronome return behavior and do not show segment practice controls.
- Ungrouped/unsupported recordings with missing sheet context remain selectable and safe; they do not invent sheet/segment targets.
- Query-driven segment selection reapplies after reload while the URL still contains the target segment.
- Implementation reuses existing route helpers, recording review helpers, segment service, and workflow store; it does not add a global resume/session system.
- Unit/component and E2E tests cover the above positive, negative, and reload cases.

## Test Plan

Unit tests:

- Extend `tests/unit/recordings-review-history.test.ts`:
  - sheet recording with `segmentContext.segmentId` produces a sheet-practice href with `recordingId`, `sheetId`, and `segmentId`.
  - no-segment sheet recording omits `segmentId`.
  - quick recording still returns Quick Metronome href.
  - blank/null `sheetId` does not create a fake segment target.
- Add/extend route helper tests if route helpers are tested separately:
  - URL encodes ids.
  - omits empty params.
  - preserves existing `sheetId` and `recordingId` behavior.

Component tests:

- Extend `tests/unit/recordings-review-experience.test.tsx`:
  - segment group header/details action has visible text and href with `segmentId`.
  - no-segment group action has no `segmentId`.
  - quick section/details action points to Quick Metronome.
  - unsupported/ungrouped recording does not render a fake segment practice action.
  - return controls have accessible names and selected-row state remains intact.
- Extend `tests/unit/practice-segment-selector.test.tsx`:
  - initial return segment id selects a matching segment after load and calls `setActiveSegment`.
  - missing return segment id clears active segment and shows recoverable status.
  - return segment for a different sheet is ignored/cleared.
  - no initial segment id leaves no selected segment.
  - manual user selection still overrides initial selection.

E2E:

- Extend `tests/e2e/recordings-review.spec.ts` with seeded local data:
  - sheet with an existing segment and two segment takes.
  - same sheet with no-segment takes.
  - quick recording.
  - stale segment recording whose saved `segmentContext.segmentId` is not in the current segment repository.
  - missing/deleted sheet target if existing fixtures support it.
- Assert:
  - from a segment group, click `Return to segment practice` and land on Sheet Practice with URL containing the sheet and segment target.
  - the matching segment row is visible with `aria-pressed="true"` and the `Active` badge.
  - reload keeps that segment selected because the URL still carries `segmentId`.
  - from a selected segment-linked take details action, land on the same segment context.
  - from a no-segment group/take, Sheet Practice opens with no selected segment and no stale warning.
  - stale segment target opens the sheet, shows the stale/fallback status, and leaves no active segment selected.
  - quick recording action opens Quick Metronome with `recordingId`.
  - ungrouped/unsupported recording remains selectable and does not crash when its return action is absent or conservative.
  - desktop and narrow mobile widths show return controls without clipped text or overlap.

Reload/persistence:

- Query-driven selection must survive page reload.
- No new persisted global return target should remain after navigating to a different sheet without the query.
- Existing recording history and take selection metadata must remain unchanged by navigation.

Negative cases:

- `segmentId` query present without `sheetId` should not crash; existing sheet missing state or sheet picker fallback should apply.
- `segmentId` query for a no-segment recording should not force a fake segment if the selected action did not intend it.
- Malformed/empty query values should be ignored.

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
.\scripts\npm-local.ps1 exec vitest run tests/unit/recordings-review-history.test.ts tests/unit/recordings-review-experience.test.tsx tests/unit/practice-segment-selector.test.tsx
```

Final verification should include lint, typecheck, relevant unit/component tests, and the Recordings Review browser E2E.

## Model Tier Recommendation

- Coding agent: GPT-5.5, high effort, standard speed
- Review agent: GPT-5.4, medium effort, standard speed
- Verification agent: GPT-5.4-mini, high effort, standard speed

Rationale: Tier C is appropriate because this is user-facing UI/navigation wiring with browser E2E and responsive/accessibility requirements. It reuses existing segment services and workflow store, but correctness depends on real route behavior and stale-target handling. It does not add media capture, waveform comparison, export, migration, cleanup, or destructive data operations. Do not use fast tier.

## Constraints For Coding Agent

- Reuse existing routes, services, hooks, helpers, and P1 segment selection policy.
- Do not invent a new session/continue-practice system.
- Do not store global resume state.
- Do not bypass `PracticeSegmentSelectorPanel`, `practiceSegmentService`, or `useSheetPracticeRecordingWorkflowStore` when selecting a segment.
- Do not mutate recording metadata or segment metadata during navigation.
- Do not add packages.
- Do not change storage schema.
- Do not touch recording capture, waveform, playback internals, scoring, export, or cloud features.
- Keep changes scoped to route helpers, Recordings Review actions, Sheet Practice query handoff, segment selection hydration, and tests.

## Handoff Notes For P2-07

- P2-07 should not depend on return-to-practice query params for waveform source selection.
- P2-06 should leave recording ids and group ids stable so P2-07 can locate artifacts through existing review services.
- Any new helper names for return hrefs should be documented in code/tests so P2-07 avoids duplicating route logic.
- P2-07 remains responsible for real decoded artifacts or validated peaks; P2-06 must not add waveform, scoring, or comparison behavior.
