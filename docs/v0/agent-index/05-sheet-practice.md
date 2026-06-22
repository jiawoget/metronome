# 05 Sheet Practice Parent Agent Index

## Contract

Spec: `docs/v0/05-sheet-practice.md`

This parent module proves the integrated Sheet Practice workspace: Sheet
Library entry, visible sheet, controls, session, recording, replay, markers,
Continue Practice, reference panel coexistence, and responsive layout.

## Code Map

- Parent composition: `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- Route shell: `src/app/sheet-practice/page.tsx`
- Sheet route: `src/app/sheet-practice/[sheetId]/page.tsx`
- Subfeatures are indexed in `05a` through `05e`, plus `06-reference-system`.

## Technologies And Boundaries

- This is an integration surface, not a separate business-logic owner.
- Do not put new domain logic in the parent composition; use subfeature services.
- Reference panel is expected in Sheet Practice after module 06. Tests should
  reject v1 automatic analysis/bar detection, not the v0 reference panel.

## Tests

- Parent E2E: `tests/e2e/sheet-practice-integration.spec.ts`
- Subfeature E2E: `tests/e2e/sheet-viewer.spec.ts`,
  `tests/e2e/sheet-practice-controls.spec.ts`,
  `tests/e2e/sheet-recording-review.spec.ts`,
  `tests/e2e/reference-system.spec.ts`,
  `tests/e2e/sheet-practice-session.spec.ts`

## Spec Audit Notes

- Current status is verified.
- Final acceptance fix `904652b` updated stale parent expectations so the
  verified v0 reference panel is allowed.
- No known unimplemented v0 parent-integration item remains.

