# P1-09 Recording Save Segment Context Plan

## Slice

- Slice id: P1-09 `recording-save-segment-context`
- Pack: Pack 1 Practice Segment MVP
- Product contract: `practice.segment-recording` in `docs/v1/05f-practice-segments.md`
- Dependencies: P1-08 `segmentContext` metadata contract and P1 preflight recording/store boundaries
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier D, recording/media/timing plus persistence
- Status: planning artifact only; do not implement from this file directly without a fresh coding agent

## Goal

Bind the currently selected Practice Segment context into normal Sheet Practice recording save metadata. A selected segment should produce a real saved recording artifact whose metadata includes the immutable P1-08 `segmentContext` snapshot. Recording with no selected segment must remain valid and save `segmentContext: null`.

This slice is the normal save path only. It should create the selected segment snapshot at the Sheet Practice control/workflow boundary, pass it through the recording service port, and let existing session/review persistence keep it. It must not turn into rerecord workflow or take management.

## Scope

- Expose the selected segment from `PracticeSegmentSelectorPanel` to Sheet Practice recording controls through the preflight workflow store or a narrow callback/prop that updates that store.
- Build a `SheetRecordingSegmentContext` snapshot for the active sheet at recording save time from:
  - selected segment id/name/range/target BPM
  - the selected segment's saved grid association
  - deterministic `measureRangeMs` computed from the segment's `measureGridSnapshot` and range
- Pass the context through `SaveSheetRecordingInput` to `sessionService.createSheetRecordingMetadata`.
- Preserve `segmentContext: null` when no segment is selected.
- Ensure metadata-only placeholder replacement and final artifact-backed review record keep the same segment context through existing P1-08 repository paths.
- Add focused unit/component/E2E coverage for selected, no-selected, deleted/renamed/stale, reload/review, and sheet-switch behavior.

## Non-Scope

- No `Record again` button, repeat action, duplicate-start guard, last-take repeat readiness, or retry workflow from P1-10/P1-11.
- No take grouping, best/latest take semantics beyond the existing latest sheet recording behavior, take history, waveform comparison, or review grouping.
- No review-page UI badges or filters for segment context unless a null-safe fixture update is unavoidable.
- No new segment CRUD behavior, MeasureGrid calibration behavior, or automatic PDF/bar detection.
- No live segment lookup inside low-level recording capture/adapters.
- No direct IndexedDB/localStorage access from React UI.
- No expansion of `src/lib/sheet-practice/recording-service.ts` into a segment repository/service owner. It may accept and forward an already-built context only.
- No migration script for old recordings; legacy/no-segment compatibility remains tolerant read behavior from P1-08.

## Data Flow

1. Segment selector loads segments and current grid for the active `sheetId` through `PracticeSegmentService` and `MeasureGridService`.
2. User selects a segment.
3. The selector publishes active selection to the Sheet Practice recording workflow state:
   - `activeSegmentId` in `useSheetPracticeRecordingWorkflowStore`
   - preferably a small selected-segment snapshot/candidate if needed to avoid reloading in multiple components
4. When saving a normal recording, `SheetPracticeControls` resolves the selected segment for the current `sheetId`.
5. If there is no selected segment, it passes `segmentContext: null`.
6. If a selected segment exists and is valid for the current sheet, construct:

```ts
{
  segmentId: segment.id,
  segmentName: segment.name,
  range: segment.range,
  targetBpm: segment.targetBpm,
  measureGridVersion: segment.grid.measureGridVersion,
  measureGridSnapshot: segment.grid.measureGridSnapshot,
  measureRangeMs: getMeasureRangeMs(segment.grid.measureGridSnapshot, segment.range)
}
```

7. `getMeasureRangeMs` must be computed exactly once from the saved segment grid snapshot and saved range, not from whatever live grid happens to be loaded later.
8. Pass the resulting context via `sheetRecordingService.stopAndSave({ ..., segmentContext })`.
9. `BrowserSheetRecordingService.stopAndSave` forwards `input.segmentContext ?? null` into `sessionService.createSheetRecordingMetadata`.
10. `createSheetRecordingMetadata` validates through P1-08 `validateSheetRecordingMetadata`.
11. Existing recording history metadata repository and `createSheetReviewRecording` persist the same context to the final `ReviewRecording`.
12. Review/history read paths surface the saved snapshot without live segment or grid lookup.

Consistency rule: the `segmentContext` object must be internally self-consistent. Domain validation already rejects `measureRangeMs` that does not match the embedded `measureGridSnapshot` and `range`; use that as the final guard. Do not compute `measureRangeMs` from the current grid while storing an older segment grid snapshot.

## Boundary Rules

- UI components may call service/store ports only:
  - `PracticeSegmentService`
  - `MeasureGridService`
  - `SheetRecordingService`
  - `PracticeSessionService`
  - `useSheetPracticeRecordingWorkflowStore`
- UI must not call IndexedDB, Dexie, localStorage, MediaRecorder, Web Audio, or recording history repository directly.
- `src/services/recording/index.ts` should own the `SaveSheetRecordingInput` type extension.
- `src/lib/sheet-practice/recording-service.ts` may forward an optional already-built `segmentContext`; it must not fetch segments, fetch grids, or recalculate context from repositories.
- `src/services/practice-session/service.ts` remains the metadata/session owner and validates supplied context; it must not fetch segments/grids to build context.
- `src/services/practice-segments/*` remains segment CRUD/list/get only. If a helper is added, prefer a pure domain/service utility for constructing context from a supplied `PracticeSegment`.
- No new persistent state in Zustand. The store is ephemeral workflow state only.

## Edge Cases

- No selected segment: save real recording with `segmentContext: null`; existing no-segment messages and latest recording UI keep working.
- Selected segment deleted before save:
  - If the selected segment no longer exists in loaded selector state before recording starts/stops, clear selection and save as no-segment, or block with a recoverable message before metadata creation.
  - Do not persist a context built from a missing live segment unless a snapshot was intentionally captured from valid selected state.
- Selected segment renamed before save:
  - Normal save should snapshot the name/range/target BPM visible/current at save time.
  - If rename happens after save, existing recording keeps the saved old name.
- Segment edited after recording start but before save:
  - Preferred P1-09 behavior is "save-time snapshot" per this plan target. Capture the active segment context immediately before `stopAndSave`, then persist that object.
  - Do not implement rerecord retry semantics around this.
- Missing or changed current measure grid:
  - Context construction should use `segment.grid.measureGridSnapshot`.
  - Current grid is used only to show ready/stale status, not to calculate persisted snapshot.
  - Stale status may be visible, but saved metadata remains internally consistent if based on the segment's own snapshot.
- Invalid segment range or invalid grid association:
  - Do not pass malformed context to recording save.
  - Surface a recoverable error such as "Selected segment timing is invalid. Recording was not saved with segment context." The implementation may either block the save before stopping capture if feasible, or save no-segment only if the UI clearly does not claim segment recording. Prefer blocking before metadata creation for invalid selected context.
- Segment or grid service errors:
  - Keep existing selector error state.
  - Recording without a valid selected context remains possible only when the UI state is no selected segment.
  - If the UI shows a selected segment but the service cannot validate/build context, block segment-linked save with a recoverable error.
- Sheet switch:
  - Reset or scope workflow store state by `sheetId`.
  - A segment selected on Sheet A must not be used for Sheet B.
- Recording cancellation/discard:
  - If capture is discarded before save, no metadata or artifact is created and selected segment state remains normal selector state.
  - Do not add P1-10 cancel preservation workflows beyond not corrupting selection.
- Save failure:
  - Existing rollback of metadata/history/session must still run.
  - Workflow store should return to recoverable error/idle without creating fake segment metadata.
- Legacy/no-segment recordings:
  - Continue parsing and rendering. They should expose `segmentContext: null` or absent according to the existing P1-08 compatibility path.

## UI And State Contract

- `PracticeSegmentSelectorPanel` should publish active selection to the workflow store when:
  - user selects a segment
  - a newly created segment is auto-selected
  - selected segment disappears from reload/delete
  - `sheetId` changes
- `SheetPracticeControls` should subscribe narrowly to active selected segment state for its own `sheetId`.
- The controls need enough data to build a context at save time. Acceptable implementation options:
  - Lift selected `PracticeSegment | null` through a prop/callback into `SheetPracticeControls` state while also updating the store.
  - Extend the store to hold a small active segment candidate/snapshot keyed by `sheetId`, while keeping it ephemeral and not persisted.
  - Re-read `practiceSegmentService.getSegment(sheetId, activeSegmentId)` at save time through the service port, then build the context from the returned segment.
- Avoid inconsistent context:
  - If re-reading at save time, snapshot the returned segment and its embedded grid association immediately.
  - If using store/lifted state, clear it whenever the selector reloads and no longer contains that id.
- User-visible indication:
  - Existing active segment summary is sufficient.
  - No new review display is required.
  - A small existing message-area update may mention "Recording saved for <segment name>" if it fits current copy patterns, but this is optional. Do not add large explanatory UI.
- Reset rules:
  - Sheet switch clears active selection/workflow state for the old sheet.
  - Deleted selected segment clears active selection.
  - Successful normal save does not need to preserve active segment for rerecord readiness; preserving selector choice naturally is okay, but no repeat action should appear.

## Likely Files To Change

- `src/stores/sheet-practice-recording-workflow-store.ts`
  - Possibly extend state/actions from `activeSegmentId` to a small active segment candidate, or add selectors/reset behavior needed by controls.
- `src/domain/practice/segments/index.ts`
  - Add a pure helper such as `createSheetRecordingSegmentContext(segment)` if useful.
  - Use `getMeasureRangeMs(segment.grid.measureGridSnapshot, segment.range)`.
- `src/services/recording/index.ts`
  - Extend `SaveSheetRecordingInput` with `segmentContext?: SheetRecordingSegmentContext | null`.
- `src/lib/sheet-practice/recording-service.ts`
  - Forward `input.segmentContext ?? null` to `createSheetRecordingMetadata`.
  - Do not fetch segment/grid data here.
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
  - Publish active selection to workflow store or invoke a narrow callback.
  - Clear workflow selection on delete, missing selected segment, and sheet switch.
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - Build/resolve selected segment context before `stopAndSave`.
  - Pass context to recording service.
  - Keep current recording start/stop UX intact.
- `src/components/sheet-practice/controls/types.ts`
  - Adjust prop/service types only if needed for selected segment context plumbing.
- `src/components/sheet-practice/controls/transport-actions-panel.tsx`
  - Optional only if a compact save message/status copy is needed; no new rerecord UI.
- Tests:
  - `tests/unit/sheet-practice-recording-workflow-store.test.ts`
  - `tests/unit/practice-segment-selector.test.tsx`
  - `tests/unit/sheet-practice-controls.test.tsx`
  - `tests/unit/sheet-practice-recording.test.ts`
  - `tests/e2e/sheet-recording-review.spec.ts` or a new focused segment-recording E2E spec

## Explicitly Out Of Scope Files

- `src/components/recordings-review/*`, except fixture null-safety if tests require it.
- `src/lib/recordings-review/repository.ts`, unless a P1-08 regression is found.
- `src/infrastructure/db/recording-history-metadata-repository.ts`, unless a P1-08 mapping regression is found.
- `src/infrastructure/db/browser-practice-segment-service.ts`, unless existing service contract has a defect exposed by tests.
- `src/infrastructure/db/browser-measure-grid-service.ts`
- `src/infrastructure/audio/*`
- `src/lib/quick-metronome/*`
- Any P1-10/P1-11 rerecord workflow/action files or new take-management files.

## Test Plan

### Unit And Component

- Domain/helper:
  - Builds `SheetRecordingSegmentContext` from a valid `PracticeSegment`.
  - Computes `measureRangeMs` from `segment.grid.measureGridSnapshot`.
  - Snapshot preserves segment id, name, range, target BPM, grid version, grid snapshot, and derived ms range.
  - Rejects/throws on invalid range or invalid grid association through existing domain validation.
- Recording service:
  - `stopAndSave` passes `segmentContext` through to `createSheetRecordingMetadata`.
  - Omits or passes `null` when no segment is selected.
  - Final `ReviewRecording` keeps the context returned by metadata service.
  - Rollback tests still pass with segment context.
- Workflow store:
  - Active segment state scopes by `sheetId`.
  - Switching sheets resets/does not leak active segment.
  - Successful save and save failure do not create persisted store data.
- Segment selector component:
  - Selecting a row updates active workflow selection.
  - Creating a segment and auto-selecting it updates workflow selection.
  - Deleting the selected segment clears workflow selection.
  - Reloading list without selected segment clears workflow selection.
  - Switching sheets clears selection and does not restore stale old-sheet selection.
- Sheet Practice controls component:
  - Selected segment causes `stopAndSave` to receive the expected context.
  - No selected segment causes `stopAndSave` to receive null/undefined and metadata saves as no-segment.
  - Renamed/edited selected segment snapshots the current save-time segment values.
  - Invalid selected segment context shows a recoverable error and does not create metadata if service save is not called.
  - Segment service error while resolving selected context is recoverable.

### Targeted E2E

Use real browser interaction and real or accepted synthetic recording artifact evidence.

- Selected segment save:
  - Import/create sheet.
  - Save measure grid.
  - Create/select segment measures 5-12.
  - Record and stop with synthetic microphone.
  - Read recording history and assert one sheet recording has real audio fields plus `segmentContext`.
  - Assert context includes selected segment id/name/range/target BPM/grid snapshot/version and correct `measureRangeMs`.
- No selected segment:
  - Reload or clear active selection.
  - Record and stop.
  - Assert saved recording has `segmentContext: null` or absent normalized to null.
- Snapshot rename/delete:
  - Save a segment-linked recording.
  - Rename or delete the source segment.
  - Reload Sheet Practice and/or `/recordings`.
  - Assert saved recording history still has the original saved segment name/range/context and remains readable/playable.
- Reload/review persistence:
  - Reload after segment-linked save.
  - Assert latest sheet recording remains present and recording history still contains the same segment context.
- Sheet isolation:
  - Select a segment on Sheet A.
  - Navigate to Sheet B and record.
  - Assert Sheet B recording does not contain Sheet A segment context.
- Console:
  - Collect browser console errors and expect none for the tested happy paths.

### README-Style Commands

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-recording-workflow-store.test.ts tests/unit/practice-segment-selector.test.tsx tests/unit/sheet-practice-controls.test.tsx tests/unit/sheet-practice-recording.test.ts tests/unit/practice-session-service.test.ts tests/unit/recordings-review-repository.test.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run typecheck
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run lint
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run build
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-recording-review.spec.ts tests/e2e/practice-segment-selector.spec.ts
```

If a new focused E2E spec is added, run that spec instead of or in addition to the broad existing specs:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-segment-recording.spec.ts
```

E2E escalation note: Playwright and synthetic microphone/browser recording paths may need browser binaries, dev server access, and broader environment permissions. If local browsers are missing, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run playwright:install
```

If sandboxed E2E fails due to browser launch, server binding, microphone fixture, or filesystem/cache restrictions, rerun with appropriate approval/escalation and report the reason.

## Acceptance Checklist

- [ ] Selecting a Practice Segment makes that segment available to Sheet Practice recording controls through store/service boundaries.
- [ ] Normal save with a selected segment creates a real recording artifact.
- [ ] Saved metadata includes P1-08 `segmentContext` with segment id, name snapshot, range, target BPM, grid version, grid snapshot, and derived `measureRangeMs`.
- [ ] `measureRangeMs` is computed from the same grid snapshot stored in the context.
- [ ] No selected segment still saves a valid recording with no segment context.
- [ ] Source segment rename/edit/delete after save does not mutate or break saved recording context.
- [ ] Missing/invalid selected segment context is handled as a recoverable error and does not create inconsistent metadata.
- [ ] Segment selection and saved metadata do not leak across sheets.
- [ ] Existing legacy/no-segment recordings still read and render.
- [ ] No direct UI storage/audio adapter access is introduced.
- [ ] Low-level recording service does not fetch live segments or grids.
- [ ] No P1-10/P1-11 rerecord action, repeat workflow, take grouping, or review comparison is implemented.
- [ ] Focused unit/component tests and targeted E2E cover selected segment, no segment, snapshot mutation, reload/review persistence, deleted/renamed segment, and sheet isolation.
- [ ] Typecheck, lint, build, targeted unit tests, and targeted E2E are run and reported by the coding agent.

## Handoff Notes For Coding Agent

- Treat P1-09 as binding and snapshot plumbing, not a workflow redesign.
- The clean center of gravity is: selector publishes selected segment, controls construct a valid context, recording service forwards it, P1-08 persistence keeps it.
- Prefer a pure helper for context construction so tests can assert the exact snapshot and ms range without rendering React.
- Keep optional user-facing copy small. The visible active segment panel already tells the user what is selected.
- Preserve no-segment recording behavior before adding selected-segment assertions; it is the main regression guard.
