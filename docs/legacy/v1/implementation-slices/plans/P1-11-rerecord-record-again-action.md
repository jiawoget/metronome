# P1-11 Rerecord Record Again Action Plan

## Slice

- Slice id: P1-11 `rerecord-record-again-action`
- Pack: Pack 1 Practice Segment MVP
- Product contract: `practice.segment-rerecording` in `docs/v1/05f-practice-segments.md`
- Dependencies: P1-09 selected-segment recording save and P1-10 rerecord workflow state
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier D, recording/media/timing with browser E2E
- Status: planning artifact only; do not implement code from this planning pass

## Goal

Add the user-visible `Record again` workflow for the current eligible segment-linked take. After a segmented recording has been saved and P1-10 marks rerecord state ready, the user should see a compact action that starts another recording for the same current selected/source segment. Saving that second recording must use the existing P1-09 segment context path and create a separate recording record without overwriting the previous take.

This slice proves the action path creates a second recording with matching segment context. It must stop short of the broader P1-12 verification-hardening work that proves two persisted artifacts across reload/cancel variants in depth.

## Scope

- Render a compact `Record again` action when P1-10 rerecord state is ready for the active sheet and the selected segment still matches the source context.
- Route `Record again` through the same capture, session, segment-context resolution, and save service boundaries used by normal `Record`.
- Start a new recording for the same live selected segment id as the ready source.
- Prevent duplicate starts from rapid clicks, active recording state, saving state, or capture-service active state.
- Keep the previous recording intact when the second recording is saved.
- Save the second recording with a segment context matching the same source segment id/range/grid snapshot when the live source segment has not changed.
- Preserve no-segment recording behavior and avoid showing segment repeat affordances for no-segment or legacy recordings.
- Add focused unit/component tests and targeted E2E that exercise first take -> `Record again` -> second take.

## Non-Scope

- No take grouping, take list, take count, best/latest take semantics, active take selection, waveform comparison, or review dashboard changes.
- No P1-12 reload-heavy two-artifact verification beyond the minimum needed to prove this action creates a second recording in the current workflow.
- No new recording persistence schema, rerecord table, IndexedDB store, localStorage field, or migration.
- No new segment CRUD, MeasureGrid calibration, segment tempo, count-in, looping, or assisted page-turning behavior.
- No automatic best-take, scoring, trimming, PDF measure detection, score following, mistake detection, cloud sync, or analytics claims.
- No direct MediaRecorder, Web Audio, IndexedDB, Dexie, localStorage, or recording history repository access from UI.
- No changes to low-level audio capture/adapters unless a narrow bug blocks the existing recording path.

## Boundary Versus P1-12

P1-11 owns product behavior: the visible action, enabled/disabled rules, duplicate-start guard, and current-session evidence that the second save has the same segment context as the first source.

P1-12 owns verification hardening: deeper proof that two distinct real artifacts and metadata records persist after reload, cancel does not create a fake third take, and broader artifact evidence is stable. P1-11 may assert two recordings exist after the action, but should not expand into a comprehensive artifact audit or review-history test matrix.

## UI Contract

- Location:
  - Add `Record again` inside `TransportActionsPanel`, near the existing `Record`/`Stop Rec` controls.
  - Keep the transport panel compact and stable. Prefer adding a third recording-related button row or a small adjacent action below `Record` rather than creating a new panel or card.
- Label and icon:
  - Visible label: `Record again`.
  - Accessible name: `Record again`.
  - Use a lucide icon such as `RotateCcw` or `RefreshCw`; do not draw a custom SVG.
  - While the repeat start is being processed but capture has not visibly entered recording, label may become `Starting...` if the implementation adds a transient state. Otherwise disable immediately and rely on the normal active recording state.
- Enabled state:
  - Enabled only when all are true:
    - workflow store sheet id matches current `sheetId`
    - `rerecord.status === "ready"`
    - `rerecord.source` exists
    - `rerecord.source.sheetId === sheetId`
    - `activeSegmentId === rerecord.source.segmentContext.segmentId`
    - `recordingState === "idle"`
    - `!recordingHarnessActive`
    - capture service is not already recording, if the service exposes this through the existing service port
  - Disabled during normal recording, repeat recording, saving, metronome countdown if existing recording controls are locked by that state, and when no eligible source exists.
- Visibility:
  - Prefer rendering the button disabled with clear state only when there is useful prior context in the transport panel.
  - Acceptable simpler policy: render only when a ready source exists, and hide when unavailable. If hidden, no confusing placeholder text should imply a missing feature.
  - Do not show it for no-segment recordings, legacy recordings, source sheet mismatch, source segment missing, or after selected segment changes.
- Copy:
  - On first segmented save, existing copy such as `Recording saved for Opening focus.` may remain.
  - When `Record again` starts: `Recording again for Opening focus.` or `Recording again.` if segment name is unavailable.
  - When second save succeeds: reuse `Recording saved for Opening focus.` or a concise variant such as `New take saved for Opening focus.`
  - On disabled/error state, use existing error area and concise messages: `Record again is not available for this segment.` or the underlying permission/save error.
- Accessibility:
  - Button must be keyboard reachable in normal tab order.
  - Use `disabled` for unavailable states; do not rely on visual-only disabling.
  - Existing `aria-live` message region should announce start/save/failure changes.
  - No tooltip-only explanation is required for core availability.
- Layout:
  - Do not overlap the current `Record` and `Stop Rec` controls.
  - Preserve button text at desktop, tablet-like, and narrow mobile widths; no clipped labels.
  - Do not add nested cards or a new large explanatory panel.

## State And Data Flow

1. P1-09 saves a normal segmented take with `ReviewRecording.segmentContext`.
2. P1-10 `finishRecording(sheetId, result.recording)` marks rerecord ready with:
   - source recording id
   - sheet id
   - immutable source `segmentContext`
3. `SheetPracticeControls` reads P1-10 rerecord state through `useSheetPracticeRecordingWorkflowStore`.
4. `TransportActionsPanel` receives a narrow prop set such as:
   - `canRecordAgain`
   - `recordAgainDisabledReason` if useful for tests/copy
   - `isStartingRecordAgain` if a transient guard is added
   - `startRecordAgain`
5. User clicks `Record again`.
6. The handler performs a synchronous duplicate-start guard before any awaited work:
   - ignore/return if already starting, recording, saving, harness active, or rerecord state is not ready
   - set a local `isStartingRecordAgain` flag or otherwise make the button immediately disabled
7. The handler verifies the ready source still matches the current selected segment id. If not, call `invalidateRerecordSource(sheetId, "selection-changed")`, show a recoverable message, and do not start capture.
8. The handler starts capture through the existing `sheetRecordingService.startCapture()` path. It should reuse `startSheetRecording` internals via a small parameter such as `{ mode: "record-again" }` rather than duplicating capture/session code.
9. Session creation should remain behind `sessionService.ensureSheetSession`. Use existing behavior unless current code needs `forceNewSession` for rerecord starts; if `forceNewSession` is used, verify it does not break session history or previous take persistence.
10. Store transition calls `beginWorkflowRecording(sheetId, source.segmentContext.segmentId)` so active segment remains the source segment and repeat readiness becomes unavailable while recording is active.
11. Stop/save uses the current P1-09 `resolveSelectedSegmentContext()` path. Do not save from the stale P1-10 source snapshot unless the live source segment still resolves and produces the same context.
12. `sheetRecordingService.stopAndSave` creates the new artifact and metadata through existing services.
13. `finishWorkflowRecording(sheetId, result.recording)` updates rerecord source to the newest saved recording.
14. Previous recording remains in recording history because save continues to insert by new id rather than replacing old ids.

Consistency rule: P1-11 should record again for the same selected/source segment. If the live segment has not changed, both recordings should have equal `segmentContext` except for recording ids and recording timestamps. If the source segment has been renamed or edited after the first take, the action should either disable/invalidate until the user reselects/records normally or clearly use the current selected segment context. Prefer disabling/invalidation for this slice to keep "same source segment" semantics unambiguous.

## Cancellation And Failure

- Cancel/discard:
  - If the current UI has only implicit discard through failed start or existing service discard, keep using existing service cleanup.
  - If a repeat recording is discarded by an existing path, active segment should remain selected and no metadata/artifact should be created.
  - Do not add new cancel UI unless it already exists in the recording controls.
- Permission/start failure:
  - If `startCapture()` rejects, return to idle, preserve active segment, call `failWorkflowRecording` or `failRerecord` according to existing store semantics, and show the permission/error message.
  - Do not create a rerecord source from a failed start.
- Save failure:
  - Existing `stopAndSave` rollback remains authoritative.
  - Return local recording state to idle or recoverable error exactly as normal recording does.
  - Preserve active segment.
  - Do not create a new source from partial metadata or partial artifact state.
  - A previous ready source may remain only if implementation can preserve it safely; otherwise clearing to unavailable is acceptable and must be tested.

## Edge Cases

- No eligible source:
  - `Record again` hidden or disabled.
  - Normal `Record` remains available.
- Source recording deleted/missing:
  - Existing P1-10 latest/source invalidation should clear readiness.
  - `Record again` must be disabled and must not use stale Zustand source data.
- Current selected segment changed:
  - P1-10 `setActiveSegment` invalidates readiness with `selection-changed`.
  - Button disabled/hidden; normal `Record` records the newly selected segment.
- Source segment deleted/missing:
  - Selector clears active segment and invalidates rerecord source with `source-segment-missing`.
  - Button disabled/hidden.
  - Saved historical first take remains readable.
- Source segment renamed after first take:
  - Saved first context remains immutable.
  - For P1-11, prefer disabling/invalidation if the app can detect mismatch with source context; otherwise the save path will snapshot current live values and tests must document that this is current selected segment behavior, not two-artifact equivalence.
  - Do not mutate the first recording's saved context.
- Source segment range/grid edited after first take:
  - Same policy as rename. Prefer invalidating readiness if source context no longer matches live selected segment timing.
- Sheet switch:
  - Workflow store resets for new sheet.
  - Button disabled/hidden on Sheet B.
  - Sheet A source must not be used on Sheet B.
- Active recording:
  - `Record again` disabled while any recording is active or saving.
  - Rapid double click should call `startCapture` at most once.
- Permission denial:
  - Show recoverable error from `startCapture`.
  - No session/metadata/artifact should be created from the denied repeat start.
- No-segment recordings:
  - Successful no-segment save clears rerecord readiness with `no-segment-context`.
  - `Record again` segment-specific action remains unavailable.
- Legacy recordings without segment metadata:
  - Not eligible.
  - Existing display/playback remains unchanged.

## Boundary Rules

- UI components may call only high-level store/service ports:
  - `useSheetPracticeRecordingWorkflowStore`
  - `SheetRecordingService`
  - `PracticeSegmentService`
  - `MeasureGridService` only where already used for segment selection/context
  - `PracticeSessionService`
- UI must not call IndexedDB, Dexie, localStorage, `recordingHistoryRepository`, MediaRecorder, Web Audio, or audio adapters directly.
- `src/lib/sheet-practice/recording-service.ts` may continue to start/stop/save through its existing capture and metadata inputs. It must not fetch segment/grid records or decide rerecord eligibility.
- Low-level adapters must not fetch segment/grid context.
- Rerecord action eligibility must come from P1-10 workflow state and current selected segment state, not direct recording-history scans in the UI.
- Zustand remains ephemeral. Do not persist rerecord state.

## Likely Files To Change

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - Add guarded `startRecordAgain` handler or refactor `startSheetRecording` to accept a mode.
  - Read rerecord source/status and active segment match.
  - Pass repeat action props to `TransportActionsPanel`.
  - Preserve normal record/stop/save behavior.
- `src/components/sheet-practice/controls/transport-actions-panel.tsx`
  - Render compact `Record again` action with enabled/disabled states and accessible label.
  - Keep layout stable with existing transport controls.
- `src/components/sheet-practice/controls/types.ts`
  - Only if shared prop/service test types need adjustment.
- `src/stores/sheet-practice-recording-workflow-store.ts`
  - Only if P1-11 needs a narrow action/reason not covered by P1-10. Avoid reshaping the state contract.
- Tests:
  - `tests/unit/sheet-practice-recording-workflow-store.test.ts`
  - `tests/unit/sheet-practice-controls.test.tsx`
  - `tests/e2e/sheet-segment-recording.spec.ts`
  - Relevant recording review tests only if a shared recording service or latest-recording behavior changes.

## Explicitly Out Of Scope Files

- `src/components/recordings-review/*`
- `src/lib/recordings-review/repository.ts`, unless a regression in previous-take preservation is exposed and the fix is narrowly required
- `src/lib/recordings-review/artifact-service.ts`
- `src/infrastructure/audio/*`
- `src/infrastructure/db/browser-practice-segment-service.ts`
- `src/infrastructure/db/browser-measure-grid-service.ts`
- `src/lib/quick-metronome/*`, except only if an existing type import is needed
- New take-management, best-take, comparison, waveform, analytics, session-summary, or review-grouping modules

## Test Plan

### Store Unit Tests

Extend `tests/unit/sheet-practice-recording-workflow-store.test.ts` only if needed:

- `beginRecording(sheetId, sourceSegmentId)` clears ready state with `recording-active` while preserving the active segment id.
- `finishRecording` after a second segmented save replaces the source with the new recording id and same segment context.
- `failRecording` during repeat preserves active segment and does not fabricate a new source.
- Existing selected segment state and no-segment readiness regression tests remain passing.

If P1-10 store actions already cover these, do not add duplicate tests for the same state transitions; reference existing coverage and add only P1-11-specific gaps.

### Component Tests

Extend `tests/unit/sheet-practice-controls.test.tsx`:

- After first segment-linked save, `Record again` appears/enables and normal `Record` remains present.
- Clicking `Record again` calls `startCapture` once, sets active recording state, and uses the same active segment id.
- Rapid double click on `Record again` calls `startCapture` at most once.
- `Record again` is disabled while recording is active and while saving.
- `Record again` is hidden/disabled for no-segment save and legacy/no-context source.
- Selection changed after first take invalidates readiness and disables/hides `Record again`; normal selected segment recording still works.
- Source segment missing before clicking disables/invalidate path and does not call `startCapture`.
- Permission/start failure from `startCapture` shows recoverable error, preserves active segment, and creates no save call.
- Save failure after repeat start preserves active segment and does not mark a new source from partial data.
- Successful repeat save calls `stopAndSave` with the expected `segmentContext`; returned second recording id becomes the new rerecord source.
- Regression: normal selected segment recording still passes context, and no selected segment still saves `segmentContext: null`.

### Targeted E2E

Extend `tests/e2e/sheet-segment-recording.spec.ts` with a focused browser flow:

- Install synthetic microphone.
- Clear local state through existing fixtures.
- Import/open a sheet.
- Save MeasureGrid.
- Create/select segment measures 5-12.
- Record first take and assert saved message.
- Assert `Record again` is visible/enabled.
- Click `Record again`.
- Assert recording becomes active.
- Stop/save second take.
- Read recording history with existing fixture helper.
- Assert two sheet recordings exist for the sheet.
- Assert both have real audio indicators already used by P1-09 tests, such as `audioDataUrl`, `sizeBytes > 0`, and non-empty `trustedPeaks`.
- Assert both `segmentContext` objects match the expected selected segment context, including segment id/name/range/target BPM/grid version/grid snapshot/measure range.
- Assert the two recording ids are distinct.
- Assert console errors are empty.

Keep this P1-11 E2E current-session focused. Do not add reload persistence, cancel-third-take, or broad artifact audit assertions unless needed to prevent a regression directly introduced by the action.

Add narrow negative E2E only if component coverage cannot realistically prove it:

- No-segment recording does not reveal an enabled `Record again`.
- Rapid double click is better covered in component tests; avoid flaky E2E double-click timing unless needed.

### Recording Review Tests

Run or extend relevant recording review tests only if P1-11 changes latest recording display, review recording persistence, or `createSheetReviewRecording` behavior. Otherwise, rely on targeted Sheet Practice unit/E2E coverage and existing P1-09/P1-10 tests.

## Verification Commands

Use README Windows command style:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-recording-workflow-store.test.ts tests/unit/sheet-practice-controls.test.tsx
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-recording.test.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-segment-recording.spec.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run typecheck
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run lint
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run build
```

If the implementation touches shared recording review display or repository behavior, also run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-recording-review.spec.ts
```

If local Playwright browsers are missing:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run playwright:install
```

E2E escalation note: Playwright and synthetic microphone/browser recording paths may need browser binaries, dev server access, and broader cache permissions. If sandboxed E2E fails due to browser launch, server binding, microphone fixture, or filesystem/cache restrictions, rerun with appropriate approval/escalation and report the reason.

## Acceptance Checklist

- [ ] A compact accessible `Record again` action appears only when P1-10 rerecord state is ready for the active sheet/source segment.
- [ ] `Record again` starts a new recording through the existing recording service path.
- [ ] `Record again` is disabled or hidden when there is no eligible segmented source.
- [ ] The action is disabled during active recording/saving and rapid double-click starts at most one capture.
- [ ] Previous take remains persisted after the second save.
- [ ] Second save creates a separate recording id.
- [ ] First and second recordings have matching segment context for the same unchanged selected/source segment.
- [ ] The second save updates rerecord source to the newest recording.
- [ ] Active segment remains selected after first save, repeat start, repeat save, recoverable start failure, and recoverable save failure unless the segment is proven missing/cross-sheet.
- [ ] No-segment and legacy recording paths remain valid and do not show an enabled segment rerecord action.
- [ ] Source missing/deleted, source segment missing/deleted, selection changed, sheet switch, permission denial, active recording, and save failure are recoverable and do not create fake takes.
- [ ] UI does not overlap existing recording controls and remains usable on desktop, tablet-like, and narrow mobile widths.
- [ ] No direct UI storage/audio adapter access is introduced.
- [ ] Low-level recording services/adapters do not fetch segments or grids.
- [ ] No take grouping, best/latest semantics, review comparison, waveform comparison, scoring, trimming, cloud, or analysis behavior is implemented.
- [ ] Targeted unit/component tests and P1-11 E2E pass.
- [ ] Typecheck, lint, and build pass.

## Handoff Notes For Coding Agent

- Treat P1-11 as a small action path on top of P1-10 state. The safest center is: ready source -> guarded button -> existing start/stop/save path -> new recording id.
- Prefer refactoring `startSheetRecording` to accept a repeat mode over duplicating capture/session code.
- The second recording's segment context should come from the same P1-09 live selected-segment resolver, not from direct storage and not from low-level recording service lookups.
- Keep P1-12 in its lane. P1-11 needs enough evidence that the action works and creates a second same-context recording, not the full artifact verification matrix.
- Preserve the normal `Record` button behavior first; regressions in no-segment recording are a slice failure.
