# Sheet Library

## Purpose

This module lets the user import, find, filter, open, and delete practice sheets. It is the v0 entry point for practice materials and the gateway into Sheet Practice.

It must prove that imported sheets are real persisted file artifacts with metadata, not fake list rows.

## User Value

- The user can import a PDF or image sheet.
- The user can manually enter useful practice metadata.
- The user can find sheets later.
- The user can open a sheet directly into Sheet Practice.
- The user can delete sheets they no longer need.

## v0 Scope

- Sheet Library page.
- Empty state.
- PDF import.
- Image import.
- Manual sheet metadata entry.
- Sheet list.
- Search.
- Fixed category filtering.
- Open Sheet Practice route.
- Delete sheet.
- Unsupported file error state.
- Bad file error state.

## Out of Scope for v0

- Folder system.
- Tags.
- Favorites.
- Batch import.
- Guitar Pro import.
- MusicXML import.
- Automatic BPM detection.
- Automatic time signature detection.
- Automatic bar detection.
- Cloud-synced sheet library.
- Sheet sharing.
- Separate sheet detail page.

## User Paths

```text
Open Sheet Library with no sheets
  -> See an empty state
  -> Import a PDF
  -> Enter name, category, BPM, and time signature
  -> Save
  -> See the sheet in the list
  -> Open Sheet Practice
```

```text
Open Sheet Library
  -> Import an image sheet
  -> Enter metadata
  -> Save
  -> Refresh
  -> See the sheet still available
```

```text
Open Sheet Library
  -> Search for a sheet
  -> Filter by category
  -> Delete a sheet
  -> Refresh
  -> Confirm it is gone
```

## Product Decisions

- Categories are fixed to `song`, `exercise`, and `scale`.
- v0 does not include folders.
- v0 does not include tags.
- Users manually enter sheet name, category, BPM, and time signature during import.
- v0 does not automatically detect BPM, time signature, or bars.
- A sheet can be a PDF or an ordered set of images.
- Clicking a sheet opens Sheet Practice directly.
- A separate sheet detail page is not required for v0.

## Data Boundary

This module creates:

- Sheet metadata.
- PDF file artifact or local copy.
- Image file artifact or local copy.

This module reads:

- Sheet metadata.
- Sheet file artifact.
- Last practiced date when available.

This module deletes:

- Sheet metadata.
- Sheet file artifact or local copy.
- Sheet reference associations when required by the data contract.

This module must not create:

- Practice Sessions.
- Recordings.
- Error markers.
- Automatically detected analysis data.

## State Boundary

Module-owned state:

- Search query.
- Category filter.
- Import dialog state.
- Selected upload files.
- Metadata form state.
- Import validation errors.
- Delete confirmation state if needed.

Shared state:

- Sheet list.
- Sheet persistence status.
- Navigation target for Sheet Practice.

## Architecture Boundary

The UI may call sheet library, file import, and navigation services.

The UI must not directly call:

- IndexedDB / Dexie.
- Raw browser storage APIs as the source of truth.
- PDF parser internals.
- Image decoding internals.

File validation, file persistence, and page/image metadata extraction should sit behind service or adapter boundaries.

## Dependencies

- App Shell / Home for route access.
- Local Data for metadata and file artifact persistence.
- Sheet Practice route shell for opening a sheet.
- Settings / Local Data for future cleanup behavior.

## Acceptance Criteria

- [ ] The user can open Sheet Library.
- [ ] Empty sheet library shows a clear empty state.
- [ ] The user can import a real PDF fixture.
- [ ] The user can import a real image fixture.
- [ ] Import requires or captures sheet name, category, BPM, and time signature.
- [ ] Imported sheet appears in the list.
- [ ] The list displays name, category, page count, BPM, time signature, and last practiced state.
- [ ] Search finds sheets by visible metadata.
- [ ] Category filter supports Songs, Exercises, and Scales.
- [ ] Clicking a sheet opens Sheet Practice route or route shell.
- [ ] Sheet metadata persists after refresh or reload.
- [ ] Sheet file artifact remains readable after refresh or reload.
- [ ] The user can delete a sheet.
- [ ] Deleted sheet disappears from the list.
- [ ] Deleted sheet remains gone after refresh or reload.
- [ ] Deleted sheet file artifact is deleted or no longer accessible.
- [ ] Unsupported file type shows a clear error state.
- [ ] Bad PDF or bad image file shows a clear error state.
- [ ] No fake imported sheet is accepted.

## Test Plan

### Unit Tests

- Category validation.
- BPM validation.
- Time signature validation.
- Supported file type detection.
- Search matching.
- Category filtering.
- Sheet route target generation.
- Page count display fallback.

### Integration Tests

- Import PDF saves metadata and file artifact.
- Import image saves metadata and file artifact.
- Reloading data returns metadata and readable artifact.
- Delete sheet removes metadata and artifact.
- Unsupported file type produces validation error.
- Bad PDF produces import error.
- Bad image produces import error.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Open Sheet Library and verify empty state.
- Click Import.
- Upload a real PDF fixture.
- Fill name, category, BPM, and time signature through visible controls.
- Save.
- Verify the imported sheet appears in the list.
- Reload and verify the sheet still appears.
- Verify the PDF artifact remains readable or openable.
- Search for the sheet.
- Filter by the selected category.
- Click the sheet and verify Sheet Practice route or route shell.
- Return to Sheet Library.
- Delete the sheet through the UI.
- Reload and verify the sheet is gone.
- Repeat import flow with a real image fixture.
- Try an unsupported file type and verify error state.
- Try a bad PDF or bad image fixture and verify error state.
- Check browser console errors during the tested flows.

### Manual QA

- Confirm import form is understandable.
- Confirm list layout works on desktop and mobile.
- Confirm delete interaction is clear.
- Confirm long sheet names do not break layout.

### Specialized Verification

#### PDF Artifact Verification

Verification must use a real PDF fixture.

The verifier must check:

- PDF artifact is saved.
- PDF artifact remains readable after reload.
- PDF can be parsed or opened by the selected viewer/service.
- Page count metadata matches the fixture when page count is available.

#### Image Artifact Verification

Verification must use a real PNG or JPG fixture.

The verifier must check:

- Image artifact is saved.
- Image artifact remains readable after reload.
- Image can be decoded.
- Image dimensions can be read when available.
- Ordered image sheets preserve order when multiple images are supported.

#### Delete Persistence

The verifier must check:

- Sheet metadata is removed.
- Sheet artifact is deleted or no longer accessible.
- Reload does not restore deleted data.

## QA Checklist

- [ ] Real browser E2E testing was performed.
- [ ] Real PDF fixture was imported.
- [ ] Real image fixture was imported.
- [ ] Metadata and file artifact were both verified.
- [ ] Refresh persistence was tested.
- [ ] Search and category filtering were tested.
- [ ] Sheet Practice route target was tested.
- [ ] Delete was tested through the UI.
- [ ] Delete persistence was tested after reload.
- [ ] Unsupported and bad file states were tested.
- [ ] No console errors appeared during tested flows.

## Failure / Edge Cases

- No sheets: show empty state.
- Unsupported file type: show error and do not create sheet.
- Bad PDF: show error and do not create sheet.
- Bad image: show error and do not create sheet.
- Missing artifact after metadata load: show recoverable error.
- Delete fails: keep sheet visible and show failure state.
- Long file name or sheet name: do not break layout.
- Storage quota failure: show clear error.

## Implementation Contract

The implementation agent may build:

- Sheet Library UI.
- Import dialog and metadata form.
- PDF import integration.
- Image import integration.
- Search and category filters.
- Sheet list.
- Delete flow.
- Sheet Practice route navigation.
- Real PDF and image test fixtures.

The implementation agent must not build:

- Folder system.
- Tags.
- Favorites.
- Batch import.
- Guitar Pro or MusicXML import.
- Automatic BPM, meter, or bar detection.
- Cloud sync.
- Fake imported sheet rows.

Implementation handoff must include:

- Sheet list, import, validation, persistence, and delete areas changed.
- Tests run.
- PDF fixture used.
- Image fixture used.
- Persistence behavior checked.
- Known limitations or risks.

## Verification Contract

The verification agent must:

- Be a separate agent pass from the implementation agent.
- Run relevant automated tests.
- Use real browser interaction for import, search, filter, open, and delete flows.
- Import a real PDF fixture.
- Import a real image fixture.
- Verify metadata and file artifacts persist after reload.
- Verify imported files remain readable.
- Verify delete removes metadata and artifact.
- Verify unsupported and bad file error states.
- Check browser console errors.

The verifier must report FAIL if imports are metadata-only, imported files cannot be read after reload, delete does not remove persisted data, or E2E interaction is skipped.

## Implementation Handoff Requirements

- Summary of UI, service, validation, and storage changes.
- Test commands run.
- PDF and image fixtures used.
- Persistence checks performed by implementer.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Real browser E2E evidence.
- PDF artifact evidence.
- Image artifact evidence.
- Persistence reload evidence.
- Delete persistence evidence.
- Bad file evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This module is complete only when:

- All acceptance criteria pass.
- Real browser E2E covers import, list, search, filter, open, and delete.
- Real PDF and image artifacts are imported and verified.
- Metadata and artifacts persist after reload.
- Delete persistence is verified after reload.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- Folder system.
- Tags.
- Favorites.
- Batch import.
- Guitar Pro import exploration.
- MusicXML import exploration.
- Automatic BPM detection.
- Automatic time signature detection.
- Assisted bar detection.
- Cloud-synced sheet library.
- Sheet sharing.
- Richer sheet detail pages.
- Recent practice summary per sheet.
- Review grouped by sheet.

Do not implement these in v0.
