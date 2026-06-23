# 04 Sheet Library Agent Index

## Contract

Spec: `docs/v0/04-sheet-library.md`

This module owns local sheet import, metadata capture, PDF/image artifact
storage, list/search/filter, opening Sheet Practice, delete persistence, and
file error states.

## Code Map

- UI: `src/components/sheet-library/sheet-library-experience.tsx`
- Route: `src/app/sheet-library/page.tsx`
- Domain: `src/domain/sheet/*`
- Service: `src/services/sheet-library/service.ts`
- Import adapter: `src/infrastructure/files/sheet-import-adapter.ts`
- Repository/artifacts: `src/infrastructure/files/sheet-library-repository.ts`,
  `src/infrastructure/files/sheet-library-service.ts`

## Technologies And Boundaries

- PDF parsing uses PDF.js behind the import/viewer adapters.
- Images are decoded through browser image APIs behind infrastructure helpers.
- Metadata and artifacts are local-first, persisted in IndexedDB/Dexie.
- UI should call `SheetLibraryService`, not Dexie or raw file stores.

## Tests

- Unit: `tests/unit/sheet-library-domain.test.ts`,
  `tests/unit/sheet-library-service.test.ts`
- E2E: `tests/e2e/sheet-library.spec.ts`
- Fixtures: `test-fixtures/sheets/*`

## Spec Audit Notes

- Current status is verified.
- Delete checks include metadata and artifact removal.
- Bad PDF, bad image, and unsupported file states are covered.
- No known unimplemented v0 sheet-library item remains.

