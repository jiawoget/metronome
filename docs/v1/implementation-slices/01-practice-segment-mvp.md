# Pack 1 Implementation Slices: Practice Segment MVP

## Pack Goal

Deliver the end-to-end Practice Segment MVP:

```text
Open a sheet
  -> Calibrate measure 1
  -> Create a segment for measures 5-12
  -> Select the segment
  -> Record one take
  -> Record again
  -> Confirm both recordings exist and carry segment context
```

## Dependencies

Product contracts:

- `practice.measure-grid` in `docs/v1/05f-practice-segments.md`
- `practice.practice-segments` in `docs/v1/05f-practice-segments.md`
- `practice.segment-recording` in `docs/v1/05f-practice-segments.md`
- `practice.segment-rerecording` in `docs/v1/05f-practice-segments.md`

## Slice List

### P1-01 `measure-grid-types-and-math`

Scope:

- Add MeasureGrid domain types.
- Add validation.
- Add deterministic measure and range timestamp math.

Out of scope:

- No UI.
- No persistence.
- No Sheet Practice wiring.

Acceptance:

- [ ] 120 BPM, 4/4, offset `0 ms`, measures 1-4 produce `0-8000 ms`.
- [ ] 120 BPM, 4/4, offset `1000 ms`, measures 1-4 produce `1000-9000 ms`.
- [ ] 90 BPM, 3/4 uses three quarter-note beats per measure.
- [ ] 120 BPM, 6/8 follows the literal denominator policy.
- [ ] Invalid measure numbers and ranges are rejected.

Verification:

- Unit tests for pure math and validation.
- Source inspection confirms no UI, storage, or audio changes.

### P1-02 `measure-grid-repository`

Scope:

- Add local MeasureGrid repository/service.
- Save/read/update/clear one active grid per sheet.
- Preserve service boundary for UI consumers.

Out of scope:

- No calibration UI.
- No segment records.

Acceptance:

- [ ] Grid persists by `sheetId`.
- [ ] Updating one sheet does not affect another.
- [ ] Clear removes only that sheet's grid.
- [ ] Invalid saved data is handled safely.

Verification:

- Unit/integration tests for repository behavior.
- Reload or storage-boundary test where feasible.

### P1-03 `measure-grid-calibration-ui`

Scope:

- Add compact Sheet Practice calibration UI.
- Display/edit BPM, time signature, pickup beats, and offset.
- Wire `Set measure 1 here` to current playback/scrub timestamp.

Out of scope:

- No segment CRUD.
- No recording changes.

Acceptance:

- [ ] User can save calibration from visible UI.
- [ ] Calibration persists after reload.
- [ ] Needs-calibration/calibrated/unsaved states are visible.
- [ ] Existing sheets without grids still open.
- [ ] Desktop, tablet-like, and mobile layouts keep sheet and transport usable.

Verification:

- Real browser E2E for calibrate/save/reload.
- Console check.
- Responsive visual evidence.

### P1-04 `segment-types-and-validation`

Scope:

- Add Practice Segment domain types.
- Add validation for name, measure range, optional target BPM, and notes.
- Add grid association/stale status helpers.

Out of scope:

- No persistence.
- No UI.
- No recording.

Acceptance:

- [ ] Valid segment accepts name and inclusive range.
- [ ] Invalid ranges are rejected.
- [ ] Optional target BPM follows BPM policy.
- [ ] Stale grid status is detectable.

Verification:

- Unit tests only.
- Source inspection confirms no UI/storage changes.

### P1-05 `segment-repository`

Scope:

- Add local segment repository/service.
- Create/read/update/delete segments scoped to sheet.

Out of scope:

- No selector UI.
- No recording metadata.

Acceptance:

- [ ] CRUD persists by `sheetId`.
- [ ] Segments do not leak between sheets.
- [ ] Delete removes only the segment.
- [ ] Missing sheet/invalid grid association is safe.

Verification:

- Repository integration tests.
- Persistence/reload test where feasible.

### P1-06 `segment-selector-read-ui`

Scope:

- Display segment selector/list in Sheet Practice.
- Show active segment, range, target BPM, and needs-calibration/stale states.
- Select an existing segment.

Out of scope:

- No create/edit/delete UI.
- No recording changes.

Acceptance:

- [ ] Existing segments appear for the active sheet.
- [ ] Selecting a segment updates active selection.
- [ ] Other sheets' segments do not appear.
- [ ] Empty and needs-calibration states are clear.

Verification:

- Real browser E2E for list/select/sheet switch.
- Console and responsive checks.

### P1-07 `segment-create-edit-delete-ui`

Scope:

- Add create/edit/delete UI for segments in Sheet Practice.
- Persist changes through segment service.

Out of scope:

- No recording metadata.
- No take review.

Acceptance:

- [ ] User can create segment by measure range.
- [ ] User can edit name/range/target BPM/notes.
- [ ] User can delete segment safely.
- [ ] Changes persist after reload.
- [ ] Invalid input is rejected without corrupting saved data.

Verification:

- Real browser E2E for create/edit/delete/reload.
- Console and responsive checks.

### P1-08 `recording-metadata-segment-fields`

Scope:

- Extend recording metadata types/services to allow optional `segmentId` and segment snapshot.
- Preserve legacy/no-segment recordings.

Out of scope:

- No recording UI changes.
- No rerecording.
- No take grouping.

Acceptance:

- [ ] Metadata accepts optional segment context.
- [ ] Metadata remains valid without segment context.
- [ ] Segment snapshot is stable after source segment mutation.
- [ ] Legacy recordings still parse/read.

Verification:

- Unit/integration tests for metadata and read paths.
- Source inspection for backwards compatibility.

### P1-09 `recording-save-segment-context`

Scope:

- Capture selected segment at recording start.
- Save real recording artifact with segment metadata.
- Preserve no-segment recording path.

Out of scope:

- No `Record again`.
- No multi-take grouping.

Acceptance:

- [ ] Segment-linked recording saves a real artifact.
- [ ] Metadata includes sheet/session where available and segment context.
- [ ] No-segment recording remains valid.
- [ ] Segment edit/delete after save does not break recording display fallback.

Verification:

- Real browser E2E with recording artifact or accepted controlled artifact fixture.
- Persistence after reload.
- Console check.

### P1-10 `rerecord-workflow-state`

Scope:

- Preserve active segment after save/cancel/failure.
- Add ready/error state for repeated segment recording.

Out of scope:

- No new `Record again` action yet.
- No take grouping.

Acceptance:

- [ ] Active segment remains after successful save.
- [ ] Active segment remains after cancel.
- [ ] Active segment remains after recoverable save failure.
- [ ] Switching sheets clears or reloads state safely.

Verification:

- Unit/integration workflow tests.
- Browser E2E where current UI permits.

### P1-11 `rerecord-record-again-action`

Scope:

- Add compact `Record again` action.
- Start a new recording using the same active segment context.
- Prevent duplicate starts.

Out of scope:

- No best/latest take UI.
- No review grouping.

Acceptance:

- [ ] `Record again` starts a new recording for selected segment.
- [ ] Previous take remains.
- [ ] Duplicate active recordings are prevented.
- [ ] No-segment recording path remains unchanged.

Verification:

- Real browser E2E for first take plus record again.
- Console and responsive checks.

### P1-12 `rerecord-two-artifact-verification`

Scope:

- Add/strengthen verification coverage proving two repeated takes create two separate real artifacts and metadata records.
- This is a verification-hardening slice, not new product UI.

Out of scope:

- No review grouping or best take.

Acceptance:

- [ ] Two repeated recordings produce two distinct artifacts.
- [ ] Both metadata records share expected sheet/segment context.
- [ ] Reload preserves both recordings.
- [ ] Cancel path does not create fake third take.

Verification:

- Dedicated E2E or integration artifact evidence.
- Console check.

## Pack-Level Acceptance Gate

Pack 1 can be presented for user acceptance only when all P1 slices are verified and the pack acceptance path passes in a final browser E2E run.

