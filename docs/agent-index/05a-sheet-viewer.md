# 05a Sheet Viewer Agent Index

## Contract

Spec: `docs/v0/05a-sheet-viewer.md`

This module owns rendering imported sheet artifacts in Sheet Practice: PDF,
image, page navigation, zoom, reload persistence, route handling, and clear
error states.

## Code Map

- Viewer composition: `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- PDF renderer: `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx`
- Viewer service: `src/services/sheet-viewer/service.ts`
- Browser adapter/object URLs: `src/infrastructure/sheet-viewer/*`
- Sheet route support: `src/app/sheet-practice/[sheetId]/page.tsx`

## Technologies And Boundaries

- PDF rendering is through PDF.js/react-pdf related adapters.
- Object URL lifecycle is owned by infrastructure hooks; do not leak URLs from
  UI code.
- Viewer should read sheet metadata/artifacts through service boundaries.

## Tests

- Unit: `tests/unit/sheet-viewer-service.test.ts`
- E2E: `tests/e2e/sheet-viewer.spec.ts`
- Final acceptance fix `904652b` made PDF canvas checks wait for non-white
  rendered pixels instead of sampling before PDF.js paint.

## Spec Audit Notes

- Current status is verified.
- PDF and image rendering, zoom, page navigation, resize, reload, missing sheet,
  bad artifact, bad PDF, and bad image paths are covered.
- No known unimplemented v0 sheet-viewer item remains.

