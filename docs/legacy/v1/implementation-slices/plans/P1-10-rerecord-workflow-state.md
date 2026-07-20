# P1-10 Rerecord Workflow State Plan

## Slice

- Slice id: P1-10 `rerecord-workflow-state`
- Pack: Pack 1 Practice Segment MVP
- Product contract: `practice.segment-rerecording` in `docs/v1/05f-practice-segments.md`
- Dependencies: P1-preflight workflow store, P1-08 recording `segmentContext`, P1-09 selected-segment recording save
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier B, local workflow state and service-boundary integration
- Status: planning artifact only; do not implement code from this planning pass

## Goal

Prepare the Sheet Practice rerecord workflow state that P1-11 will use to expose a compact `Record again` action after a segment-linked recording exists. After a normal segmented recording save, the app should know which saved recording can be used as the current rerecord source, whether the source is eligible, and which segment context it represents. The active selected segment must remain stable across save/cancel/recoverable failure paths.

This slice is state and eligibility only. It must not start a second recording, add a `Record again` button, or prove two artifact creation.

## Scope

- Extend `useSheetPracticeRecordingWorkflowStore` from the current minimal `rerecord.readyRecordingId` shape into an explicit rerecord state contract.
- Track the current rerecord source for the active sheet:
  - saved source recording id
  - source sheet id
  - immutable source `segmentContext`
  - readiness/eligibility status
  - recoverable rerecord error
  - optional reason when not eligible
- Set rerecord readiness after a successful normal recording save only when the saved `ReviewRecording` is a sheet recording for the active sheet and has non-null segment context.
- Preserve the active selected segment after successful save, cancel/discard, recoverable segment-context preparation errors, and recoverable save failures unless the segment itself is proven missing or cross-sheet.
- Clear or invalidate rerecord state on sheet switch, selected segment change, deleted/missing source recording, deleted/missing selected segment, and legacy/no-segment recordings.
- Add selectors/actions that P1-11 can consume without having UI query recording history directly.
- Keep Zustand state ephemeral and derived from service/review records; do not duplicate persisted recording history.

## Non-Scope

- No `Record again` UI, button, menu item, shortcut, or action handler.
- No second recording start, duplicate-start guard for repeat action, or special repeat-save path.
- No two-artifact verification; P1-12 owns proving two separate real recordings.
- No take grouping, take count, best/latest take semantics, take history, waveform comparison, or review grouping.
- No recording review page segment badges, filters, comparison UI, or source-take cards.
- No new persisted rerecord table, localStorage field, IndexedDB object store, or migration.
- No low-level recording adapter, MediaRecorder, Tone/Web Audio, waveform, or artifact decode changes.
- No segment CRUD, MeasureGrid calibration, or automatic stale-grid repair.

## State Contract

Replace or extend the current `SheetPracticeRerecordState` with an explicit shape similar to:

```ts
export type SheetPracticeRerecordStatus =
  | "unavailable"
  | "ready"
  | "invalid"
  | "error";

export type SheetPracticeRerecordUnavailableReason =
  | "no-source-recording"
  | "no-segment-context"
  | "sheet-mismatch"
  | "selection-changed"
  | "source-recording-missing"
  | "source-segment-missing"
  | "source-segment-invalid"
  | "recording-active";

export type SheetPracticeRerecordSource = {
  recordingId: string;
  sheetId: string;
  segmentContext: SheetRecordingSegmentContext;
};

export type SheetPracticeRerecordState = {
  status: SheetPracticeRerecordStatus;
  source: SheetPracticeRerecordSource | null;
  unavailableReason: SheetPracticeRerecordUnavailableReason | null;
  error: string | null;
};
```

Naming may be adjusted to match repo style, but the behavior must remain explicit: P1-11 should be able to ask "is rerecord ready, for which source recording, and for which segment context?" without interpreting a nullable id.

Initial state:

- `status: "unavailable"`
- `source: null`
- `unavailableReason: "no-source-recording"` or `null`; choose one consistent policy and test it
- `error: null`

Active segment relationship:

- `activeSegmentId` remains the selected live segment id for the current sheet.
- Rerecord `source.segmentContext.segmentId` is the immutable saved recording segment id.
- They should normally match immediately after a successful segmented save.
- If `activeSegmentId` changes to a different segment id, clear/invalidate rerecord readiness with `selection-changed`.
- If active selection is cleared, clear rerecord readiness. No-segment recording remains valid, but no rerecord source is ready for P1-11.

Reset and transition rules:

- `resetForSheet(sheetId)`:
  - Clear active segment, status/error, and rerecord source/readiness.
  - Set the store `sheetId` to the new sheet.
- Any action called with a different `sheetId`:
  - Must scope/reset through the existing `scopedState` pattern so Sheet A state never leaks into Sheet B.
- `setActiveSegment(sheetId, segmentId)`:
  - Preserve the selected segment.
  - Clear general recording error.
  - If `segmentId` is null, clear rerecord state.
  - If a rerecord source exists and `segmentId !== source.segmentContext.segmentId`, clear/invalidate rerecord state with `selection-changed`.
  - If `segmentId` matches the source segment id, keep rerecord ready unless another invalidation reason applies.
- `beginRecording(sheetId, segmentId?)`:
  - Preserve active segment when `segmentId` is omitted.
  - Set workflow status to `recording`.
  - Rerecord readiness should be unavailable or invalid while recording is active so P1-11 cannot enable repeat during capture.
  - Preserve enough source state to restore only if the implementation chooses to mark it temporarily unavailable; simpler acceptable behavior is to clear readiness and let successful save set a fresh source.
- `beginSaving(sheetId)`:
  - Set workflow status to `saving`.
  - Do not clear active segment.
  - Do not set rerecord ready until save returns a real saved recording.
- `finishRecording(sheetId, result?)` or a new `finishRecordingSave(sheetId, recording)`:
  - Set workflow status to `idle`.
  - Preserve active segment.
  - If the saved recording is a sheet recording for the same `sheetId` and has valid non-null `segmentContext`, set rerecord `status: "ready"` and store `{ recordingId, sheetId, segmentContext }`.
  - If saved recording has no segment context, clear rerecord state with `no-segment-context`.
  - If the result is omitted, keep old behavior for existing tests but do not accidentally mark ready.
- `failRecording(sheetId, error)`:
  - Set workflow status to `error`.
  - Preserve active segment.
  - Preserve existing ready source only if the failure happened after a previous valid source and the active segment still matches; otherwise keep rerecord unavailable/error.
  - Do not create or update a source from partial metadata.
- Cancel/discard path:
  - If a cancel/discard action exists or is added later, it should return workflow status to `idle`, preserve active segment, and leave prior rerecord readiness untouched only if the prior source still matches the selected segment.
  - This slice should add a store action such as `cancelRecording(sheetId)` only if current code has a cancel/discard path to wire. Do not invent user-facing cancel UI.
- Source delete/invalidation:
  - Add an action such as `clearRerecordSource(sheetId, reason)` or `invalidateRerecordSource(sheetId, reason)`.
  - When current/latest source recording is deleted or missing from review history, clear source with `source-recording-missing`.
  - When the selected/source segment is deleted or missing, clear active segment and rerecord source with `source-segment-missing`.
- Legacy/no-segment recordings:
  - They must never mark rerecord ready.
  - Existing no-segment recording save remains valid and should clear any ready source for that sheet unless a matching selected segment source is intentionally still valid. Prefer clearing to avoid stale repeat affordances.

## Data Flow

1. P1-09 normal save already creates the selected segment snapshot and passes it through `SheetRecordingService.stopAndSave`.
2. The final `ReviewRecording` returned from `stopAndSave` contains the same persisted `segmentContext` supplied by P1-08/P1-09.
3. `SheetPracticeControls.stopSheetRecording` should pass the saved `result.recording` or a narrow `{ recordingId, sheetId, segmentContext }` object into the workflow store after save succeeds.
4. The store records only the current ephemeral source pointer and immutable context snapshot. The source of truth for recording persistence remains `recordingHistoryRepository` behind `SheetRecordingService`/review services.
5. When controls refresh latest recording/session state, they may validate that the ready source still exists through high-level service output already available to controls, such as `sheetRecordingService.getLatestSheetRecording(sheetId)` or refreshed review records. UI must not query localStorage/IndexedDB directly.
6. P1-11 can later render/action against the store's `rerecord.status === "ready"` and `rerecord.source.segmentContext`, then call the existing recording service path. P1-11 should not need to rediscover the last eligible source from persistence.

The store must not become a persisted cache of recording history. It may hold a copy of the saved segment snapshot because that snapshot is already immutable metadata from the saved recording and is needed for immediate workflow readiness.

## Edge Cases

- Unsegmented recording:
  - Successful save keeps normal recording behavior.
  - Rerecord state becomes unavailable with `no-segment-context`.
  - No segment-specific repeat readiness appears.
- Deleted source recording:
  - If the ready source recording is removed through review history deletion, the next controls refresh/subscription should invalidate rerecord state.
  - Do not try to resurrect source data from stale Zustand state.
- Deleted source segment:
  - A saved recording's segment snapshot remains valid history.
  - P1-10 readiness for a future live rerecord should be invalid because P1-11 must record against a current valid selected segment context.
  - Clear active selection if the selected segment disappears from the segment selector/service.
- Renamed source segment:
  - Saved source recording context remains unchanged.
  - If the live selected segment id still exists, readiness can remain ready; P1-11 will record using the current selected segment resolution rules from P1-09 unless its plan says otherwise.
  - Do not mutate the saved source `segmentContext.segmentName`.
- Edited source segment range/grid:
  - Existing source recording metadata remains immutable.
  - Readiness may remain tied to the same segment id, but P1-11 must rebuild save context from the current selected segment before a new save. P1-10 should not compute new context from the old source snapshot.
- Current selection changed:
  - Changing from segment A to segment B clears source readiness for A with `selection-changed`.
  - Selecting no segment clears readiness.
- Recording failure before capture starts:
  - Workflow status becomes error.
  - Active segment remains.
  - No rerecord source is created.
- Save failure after capture stops:
  - Existing recording service rollback remains authoritative.
  - Active segment remains.
  - No new source is created from failed metadata or partial artifact state.
  - A previous ready source may remain only if it still matches the current active segment; test whichever policy is implemented.
- Segment context preparation failure while capture is still active:
  - Current code leaves capture active and reports an error. Preserve active segment unless the segment was proven missing/cross-sheet.
  - Do not set rerecord ready.
- Stale store after reload:
  - Zustand is not persisted, so reload starts unavailable.
  - This is acceptable for P1-10. Do not add persistence.
  - If controls choose to initialize from latest eligible recording on mount, it must go through service/review boundaries and be explicitly tested. This is optional; avoid it unless P1-11 needs it.
- Multiple recordings/takes:
  - The latest successful segmented save for the active sheet becomes the current source.
  - Earlier recordings remain persisted and untouched.
  - No take list, grouping, count, best take, or comparison semantics are introduced.
- Legacy malformed segment context:
  - Review repository normalizes malformed optional context to null. Such recordings are not rerecord eligible.

## Boundary Rules

- UI components may use only high-level store and service ports:
  - `useSheetPracticeRecordingWorkflowStore`
  - `SheetRecordingService`
  - `PracticeSegmentService`
  - `MeasureGridService` only where already needed by selector/context construction
  - `PracticeSessionService`
- UI must not query IndexedDB, Dexie, localStorage, recording history repository, MediaRecorder, Web Audio, or low-level adapters directly.
- Low-level recording capture and `src/lib/sheet-practice/recording-service.ts` must not fetch segments or grids.
- Do not add segment lookups to recording-history repository, artifact service, or audio capture adapters.
- Rerecord eligibility should be derived from saved `ReviewRecording.segmentContext` and live selected segment state already available through services/store.
- Zustand remains ephemeral workflow state. Persisted facts stay in repositories/services.
- Keep existing architecture-boundary source guards passing.

## Likely Files To Change

- `src/stores/sheet-practice-recording-workflow-store.ts`
  - Extend rerecord types/status/reasons/source.
  - Add actions/selectors for setting ready source, clearing/invalidation, and possibly save-finish with a recording input.
  - Preserve active segment across save/cancel/failure.
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - After successful `stopAndSave`, set rerecord ready from `result.recording` when segment-linked.
  - Clear/invalidate readiness for no-segment saves, sheet switch, deleted/missing selected segment, and source mismatch.
  - Keep current visible UI unchanged except existing messages already produced by P1-09.
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
  - Only if needed to invalidate rerecord readiness when the selected segment disappears or changes. Prefer using existing `setActiveSegment` behavior if it already centralizes selection updates.
- `src/components/sheet-practice/controls/types.ts`
  - Only if service prop typing needs a narrow method to inspect latest/source recording; avoid broadening.
- `src/services/recording/index.ts`
  - Only if a narrow service-port method is needed to check source existence. Prefer existing `getLatestSheetRecording`/subscriptions.
- Tests:
  - `tests/unit/sheet-practice-recording-workflow-store.test.ts`
  - `tests/unit/sheet-practice-controls.test.tsx`
  - Existing E2E specs only if state becomes user-visible through current UI text or if an existing P1-09 E2E can assert no leak cheaply.

## Explicitly Out Of Scope Files

- `src/components/sheet-practice/controls/transport-actions-panel.tsx`, unless only prop plumbing is required. Do not add a `Record again` control.
- `src/components/sheet-practice/recording/latest-sheet-recording.tsx`, unless a null-safe test fixture update is unavoidable.
- `src/components/recordings-review/*`
- `src/lib/recordings-review/repository.ts`, except if an existing deletion subscription bug is found and narrowly fixed.
- `src/lib/recordings-review/artifact-service.ts`
- `src/lib/sheet-practice/recording-service.ts`, unless only type compatibility is required. Do not add segment/grid lookups here.
- `src/infrastructure/db/browser-practice-segment-service.ts`
- `src/infrastructure/db/browser-measure-grid-service.ts`
- `src/infrastructure/audio/*`
- `src/lib/quick-metronome/*`
- Any new take-management, comparison, waveform, or review-grouping modules.

## Acceptance Criteria

- [ ] After a successful segment-linked recording save, active segment remains selected in workflow state.
- [ ] After that save, rerecord state is `ready` and identifies the saved source recording id, sheet id, and immutable source segment context.
- [ ] After a no-segment or legacy recording save, rerecord state is unavailable and no stale segmented source remains.
- [ ] Recording cancel/discard, if wired in current code, preserves active segment and does not create a rerecord source.
- [ ] Recoverable save failure preserves active segment and does not create a new source from partial metadata/artifact state.
- [ ] Selected segment lookup/context failure preserves active segment except when the segment is proven missing or cross-sheet; no rerecord source is created.
- [ ] Switching sheets clears active segment and rerecord source/readiness so state cannot leak between sheets.
- [ ] Changing selected segment clears or invalidates rerecord readiness for the previous source.
- [ ] Deleted/missing source recording or deleted/missing selected segment invalidates rerecord readiness through store/service boundaries.
- [ ] Multiple successful segmented saves update the current source to the latest saved recording without mutating prior recordings.
- [ ] Store state is not persisted and no new storage/migration is introduced.
- [ ] No `Record again` UI/action, duplicate repeat start, take grouping, best take, or two-artifact verification is implemented.

## Test Plan

### Store Unit Tests

Add focused coverage in `tests/unit/sheet-practice-recording-workflow-store.test.ts`:

- Initial rerecord state is unavailable and has no source.
- `setRerecordReady` or replacement action stores source recording id, sheet id, and segment context, and clears rerecord error.
- Setting ready for a different sheet resets old sheet state.
- Successful finish with segment-linked recording preserves `activeSegmentId` and marks ready.
- Successful finish with no segment context preserves normal idle state but clears rerecord source.
- `failRecording` preserves `activeSegmentId` and does not create a source.
- `setActiveSegment` to a different id invalidates the current source with `selection-changed`.
- `setActiveSegment` to null clears source.
- `resetForSheet` clears active segment, workflow status/error, and rerecord source.
- Invalidation actions set expected reasons for source recording missing, source segment missing, and recording active if implemented.
- Multiple saves replace the source with the newest recording id/context.

Use a small valid `SheetRecordingSegmentContext` fixture with deterministic measure grid/range values. Do not mock storage.

### Controls/Component Tests

Extend `tests/unit/sheet-practice-controls.test.tsx`:

- Segment-linked save calls the store action and leaves `activeSegmentId` selected after save.
- The resulting store rerecord source matches the returned `ReviewRecording.id`, current `sheetId`, and segment context.
- No selected segment save clears/unsets rerecord readiness.
- Save failure from `stopAndSave` keeps `activeSegmentId`, sets workflow error, and does not set rerecord ready.
- Selected segment missing during stop clears active segment and rerecord readiness.
- Selected segment lookup throws keeps active segment but does not mark rerecord ready.
- Changing selection after a ready source invalidates readiness.
- Navigating/rendering another `sheetId` resets/isolates store state.
- If source deletion can be simulated through the injected recording service subscription/latest recording output, assert readiness invalidates without direct repository access.

Keep component assertions on current UI stable. Do not assert for a `Record again` button.

### Targeted E2E

P1-10 does not require a new E2E if all behavior remains internal store state and existing P1-09 E2E already proves segment save and sheet isolation. Add or extend E2E only if coding exposes state through current user-visible text.

If an E2E is added, keep it narrow:

- Use `tests/e2e/sheet-segment-recording.spec.ts`.
- Record one selected segment take.
- Assert active segment summary remains selected after save.
- Assert no `Record again` button is present in P1-10.
- Navigate to another sheet and verify no stale segment-selected behavior leaks.
- Check console errors.

Do not add two-recording artifact assertions here; P1-12 owns that.

### Acceptance Coverage

- Active segment preservation: store unit plus controls component.
- Ready source after segmented save: store unit plus controls component.
- No-segment/legacy path: store unit plus controls component.
- Failure/cancel paths: store unit plus controls component; E2E only if existing UI exposes it cheaply.
- Sheet switch/selection change: store unit plus controls component; existing P1-09 E2E may remain sufficient for user-visible isolation.
- Deleted source/segment: controls component with mocked services; no direct storage calls.
- Multiple takes: store unit with two successful source updates.
- Boundary rules: source inspection and existing architecture-boundary tests.

## Verification Commands

Use README Windows command style:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-recording-workflow-store.test.ts tests/unit/sheet-practice-controls.test.tsx
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run typecheck
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run lint
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run build
```

If a targeted browser check is added or existing Sheet Practice segment recording E2E is touched:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-segment-recording.spec.ts
```

If broader recording-review behavior is touched despite being out of scope, also run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-recording-review.spec.ts
```

If local Playwright browsers are missing:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run playwright:install
```

## Handoff Notes For Coding Agent

- Treat this as a state contract slice. The most important output is a reliable, typed readiness model that P1-11 can consume without guessing.
- The existing store already has a placeholder `rerecord` field; evolve it rather than adding a second state mechanism.
- Do not persist Zustand state. Reload may lose immediate readiness unless the implementation explicitly initializes from existing service data, which is optional and must stay behind service boundaries.
- Use the saved `ReviewRecording.segmentContext` to mark readiness after save. Do not rebuild rerecord readiness by querying low-level storage.
- Keep active segment preservation boring and well tested; it is the main acceptance value of P1-10.
- Resist adding UI. Seeing `Record again` in this slice is a boundary failure, not a bonus.
