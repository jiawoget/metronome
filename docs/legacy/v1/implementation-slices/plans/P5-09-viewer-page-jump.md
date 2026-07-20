# P5-09 Viewer Page Jump Plan

## Slice

- Slice id: P5-09 `viewer-page-jump`
- Pack: Pack 5 Library / Viewer Upgrade
- Product feature: `viewer.multi-page-jump`
- Product contract: `docs/v1/05a-sheet-viewer.md`
- Slice file: `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- Required reuse boundary: P5-08 current-page state and thumbnail page-selection flow in `SheetViewerReady`
- Planning model: `gpt-5.5`, medium effort, standard-only/no-fast
- Recommended implementation tier: Tier C, focused user-facing UI with browser E2E
- Status: planning artifact only; no product source code, tests, or `docs/v1/status.json` changed by this plan

## Refined Scope

P5-09 adds a compact page-number jump control to the existing Sheet Viewer. It lets a user type a target page number and jump to that page when the page is valid.

This slice owns:

- a small page jump form/control in the existing sheet viewer toolbar area;
- controlled input state for the transient typed value and validation message;
- validation for blank, non-numeric, decimal, negative, zero, and out-of-range page input;
- submitting a valid integer page number by button click or Enter key;
- updating the existing `currentPage` state used by previous/next buttons, thumbnails, PDF rendering, image rendering, and the `Page N of M` label;
- visible, recoverable invalid-input feedback that does not change the current page;
- responsive placement so the control remains usable on desktop, tablet-like widths, and narrow mobile;
- focused unit/component tests plus Playwright evidence for real multi-page PDF navigation and invalid input behavior.

This slice does not own:

- P5-10/P5-11 zoom-pan domain state, zoom-pan UI, gestures, scroll anchoring, or transform refactors;
- P5-12 assisted page turning, manual/segment-boundary assisted turns, score following, timing rules, reference playback coordination, or automatic page changes;
- P5-07 thumbnail generation/service changes;
- P5-08 thumbnail rail/drawer behavior beyond sharing the existing page-selection state;
- persistence, schema, migrations, storage cleanup, export/import, URL query params, deep links, or cross-session selected-page restore;
- changing Sheet Library import, artifact repository, PDF worker setup, full-size PDF/image rendering, or thumbnail object URL lifecycle;
- updating `docs/v1/status.json`.

## Current Code Shape

Relevant existing files:

- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
  - Primary integration point.
  - `SheetViewerReady` owns `const [currentPage, setCurrentPage] = useState(1)`.
  - Previous/next buttons already update `currentPage`.
  - Thumbnail rail/drawer from P5-08 calls the same `setCurrentPage`.
  - The toolbar already receives `currentPage`, `totalPages`, and navigation callbacks.
- `src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx`
  - Existing page navigation component.
  - Filters page numbers to `1..totalPages`, uses accessible labels such as `Go to page 2`, and marks current page with `aria-current="page"`.
  - P5-09 should mirror this "navigation to a page" semantic, not create another page model.
- `src/services/sheet-viewer/service.ts`
  - `formatSheetViewerPageLabel(currentPage, totalPages)` formats the current `Page N of M` label.
  - `stepSheetViewerZoom(...)` is unrelated and should not be modified.
- `tests/unit/sheet-viewer-thumbnails-ui.test.tsx`
  - Existing React unit/component test setup with Testing Library and `userEvent`.
  - Best place to add page-jump component tests, or use a new focused unit test file if the control is extracted.
- `tests/e2e/sheet-viewer.spec.ts`
  - Existing real PDF/image Sheet Viewer E2E coverage.
  - Already verifies thumbnail page selection, resize, reload, and invalid sheet states.
  - Best place to add the P5-09 PDF jump and invalid-input scenarios.

## UI Contract

Add the page jump control as a compact form near the existing page navigation controls in `SheetViewerToolbar`.

Preferred desktop shape:

- Keep sheet name and `Page N of M` label unchanged.
- Keep previous/next icon buttons unchanged.
- Place a small text input and submit button near previous/next, for example:
  - input accessible name: `Page number`
  - button accessible name/text: `Go`
  - optional compact visible label such as `Page` is acceptable if it does not crowd the toolbar.
- The input must not use `type="number"` as the primary implementation. Use a text field with numeric keyboard hints instead, for example:
  - `type="text"`
  - `inputMode="numeric"`
  - `pattern="[0-9]*"`
- Treat `inputMode` and `pattern` only as mobile-keyboard/progressive-enhancement hints. The real validation path must be app-owned parsing and app-visible error text.
- The control must fit inside the existing toolbar without pushing zoom controls or the Library link into awkward overlap.
- Use existing `Button` styles and Tailwind/shadcn-compatible form styling already present in the app. Do not add a new UI library.

Preferred mobile/tablet shape:

- The control may wrap onto a second toolbar row with the existing controls.
- It must remain reachable without opening the thumbnail drawer.
- It must not cover the sheet, right reference panel, or bottom practice controls.
- Text must not clip in the input, button, page label, or error message.

Accessibility expectations:

- The input has an accessible name, preferably `Page number`.
- The input indicates invalid state with `aria-invalid="true"` when invalid.
- The error text is associated with the input using `aria-describedby`.
- The error text uses `role="alert"` or another screen-reader-friendly pattern that announces failed submit without spamming during ordinary typing.
- Pressing Enter in the input submits the form.
- Focus remains usable after submit. Do not forcibly blur or move focus unless a test proves it improves recovery.
- The previous/next buttons and thumbnail buttons remain keyboard reachable in a predictable order.

## Page Jump Behavior

Use the existing `currentPage` and `setCurrentPage` in `SheetViewerReady`.

Recommended shape:

- Keep transient input text local to a small component or to `SheetViewerToolbar`.
- Pass `currentPage`, `totalPages`, and an `onJumpToPage(pageNumber)` callback down from `SheetViewerReady`.
- `onJumpToPage` must call `setCurrentPage(pageNumber)` only after validation has confirmed `1 <= pageNumber <= totalPages`.
- Do not introduce a second page state, Zustand store, context provider, URL state, or persisted page field.
- Do not synchronize the input on every page change in a way that overwrites an actively typed value unexpectedly. A simple acceptable behavior is:
  - initialize/keep placeholder or current value from `currentPage`;
  - after a successful jump, set the input text to the successful page number and clear errors;
  - when previous/next or thumbnail selection changes `currentPage`, either update an untouched/clean input to the new page or leave an empty input with a placeholder. Choose the simplest behavior that is testable and not surprising.
- A one-page sheet may show the jump control disabled or usable with only page `1`. If disabled, it must be clear via native disabled state and must not remove the `Page 1 of 1` label.

## Invalid Input Handling

Invalid input must be visible, recoverable, and must not change `currentPage`.

Required invalid cases:

- blank input or whitespace-only input;
- non-numeric input such as `abc`;
- decimal input such as `1.5`;
- signed or negative input such as `-1`;
- zero;
- page numbers above `totalPages`;
- numerically valid but unsafe/non-finite values if the parser can produce them.

Validation rules:

- Trim the value before validation.
- Accept only base-10 integer page numbers represented by digits.
- Do not use `parseInt` alone because it accepts partial strings such as `2abc`.
- Do not silently clamp invalid page input. Page `999` on a two-page PDF must show an error and leave the current page unchanged.
- Do not use browser-native validation as the only feedback path. Native constraints may be added only as hints, but app-visible error text is required.
- Do not rely on `<input type="number">`: browsers can swallow or normalize invalid strings such as `abc`, allow browser-dependent exponent/decimal/signed formats, and make Playwright/browser validation evidence unstable.

Suggested messages:

- Blank/non-numeric/decimal/negative/zero: `Enter a page number from 1 to {totalPages}.`
- Out of range: `Page must be between 1 and {totalPages}.`

Recovery behavior:

- Editing the input after an error may clear the error immediately or on the next valid submit. Pick one behavior and test it.
- A valid subsequent submit must clear the error and change `currentPage`.
- Previous/next and thumbnail navigation must continue to work after an invalid jump attempt.
- Invalid page jump attempts must not trigger PDF render errors, thumbnail selection changes, object URL revocation, reload, or navigation away from the page.

## Expected Files And Areas

Primary allowed implementation files:

- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/components/sheet-practice/viewer/sheet-page-jump.tsx` only if extracting a small component keeps `sheet-viewer-experience.tsx` easier to read

Primary allowed test files:

- `tests/unit/sheet-viewer-thumbnails-ui.test.tsx`, if adding the small control tests there is practical
- `tests/unit/sheet-viewer-page-jump.test.tsx`, if a separate focused file is cleaner
- `tests/e2e/sheet-viewer.spec.ts`

Allowed supporting files only if needed:

- `src/services/sheet-viewer/service.ts` only for a tiny pure helper such as `parseSheetViewerPageJump(...)` if unit coverage would be materially cleaner. Do not touch zoom helpers or load/thumbnail service behavior.
- `src/services/sheet-viewer/index.ts` only if a new helper/type export is needed.

No-go files:

- `docs/v1/status.json`
- `src/services/sheet-viewer/types.ts`, unless a small pure helper type is truly needed
- `src/infrastructure/sheet-viewer/*`
- `src/infrastructure/files/*`
- Dexie schema/version/migration files
- `package.json`, lockfiles, Playwright config, test framework config
- Sheet Library import/orchestrator files
- recording, metronome, marker, segment, reference playback, analysis, or assisted-turning modules

## Acceptance Criteria

1. A real imported two-page PDF shows a page jump control in the Sheet Viewer.
2. Entering `2` and submitting jumps to page 2, updates the full-size PDF render, updates `Page 2 of 2`, and updates the P5-08 current thumbnail selected state.
3. Entering `1` afterward jumps back to page 1 with the same shared page state.
4. Pressing Enter in the page input submits the jump.
5. Invalid inputs are visibly rejected and leave the current page unchanged.
6. After an invalid input, a valid page number is accepted without needing a reload.
7. Previous/next buttons and thumbnail selection still work after both valid and invalid jump attempts.
8. A one-page image sheet remains usable and does not show impossible page jumps.
9. Desktop, tablet-like, and narrow mobile layouts keep the sheet dominant and avoid overlap with the thumbnail drawer/rail, reference panel, and bottom practice controls.
10. Reloading the Sheet Practice page still starts from the existing viewer default page behavior; P5-09 does not add persistence or URL restore.
11. No P5-10/P5-11 zoom-pan changes, P5-12 assisted page turning, persistence/schema/storage changes, new dependency, or `docs/v1/status.json` change is introduced.

## Test Coverage Plan

### Unit Or Component Tests

Add focused tests using the existing Testing Library/Vitest pattern.

Required cases:

- renders input and submit button with accessible names;
- valid submit calls the supplied page-selection callback with the exact valid page number;
- Enter key submit works;
- blank input shows an error and does not call the callback;
- non-numeric input shows an error and does not call the callback;
- decimal input shows an error and does not call the callback;
- zero/negative input shows an error and does not call the callback;
- out-of-range input shows an error and does not call the callback;
- after an invalid submit, entering a valid page clears/replaces the error and calls the callback;
- changing current page through props, if supported by the chosen component shape, does not create stale visible state.

If the parsing/validation logic is extracted as a pure helper, add direct helper tests for:

- `"1"` -> valid page 1;
- `" 2 "` -> valid page 2;
- `"2abc"`, `"1.5"`, `"-1"`, `"0"`, `""`, and `"999"` on a two-page sheet -> invalid.

Do not add a new test framework.

### Browser E2E

Extend `tests/e2e/sheet-viewer.spec.ts`.

Required PDF proof:

1. Clear `SHEET_LIBRARY_DB_NAME`.
2. Import `two-page-sheet.pdf` through the existing `importTestSheet(...)` helper.
3. Open Sheet Practice.
4. Assert heading and `Page 1 of 2` are visible.
5. Fill the page number input with `2` and submit by clicking `Go`.
6. Assert `Page 2 of 2` is visible.
7. Assert the PDF canvas renders non-empty using the existing `expectPdfCanvasRendered(...)`.
8. Assert thumbnail `Go to page 2` has `aria-current="page"`.
9. Fill the input with `1` and submit with Enter.
10. Assert `Page 1 of 2` and thumbnail selected state return to page 1.

Required negative proof:

1. From page 1, try `999` and submit.
2. Assert a visible error such as `Page must be between 1 and 2.`
3. Assert the viewer still says `Page 1 of 2`.
4. Try `abc`, `1.5`, `-1`, and `0` in E2E and assert each produces app-visible error text without changing the current page.
5. After the error loop, submit `2` and assert the jump succeeds.
6. Click previous/next and a thumbnail after invalid input to prove existing navigation still works.

Responsive proof:

- Run the PDF jump case at desktop width, for example `1280x800`.
- Resize to narrow mobile, for example `390x844`.
- Assert the page jump control is reachable and can jump between pages.
- Open/close the P5-08 thumbnail drawer and assert it does not overlap the jump control or bottom practice controls in a way that blocks interaction.
- Resize back to desktop and assert the rail/current thumbnail state remains usable.

Reload proof:

- After jumping to page 2, reload the route.
- Assert the existing default behavior remains `Page 1 of 2`.
- Do not add persistence assertions because this slice explicitly does not persist page state.

Image proof:

- Existing image viewer E2E should keep passing.
- Add a light assertion that a one-page image sheet renders the jump control without allowing a jump to page 2, or cover this in unit tests if the E2E would become noisy.

### Existing Tests To Preserve

Keep these passing:

- `tests/unit/sheet-viewer-thumbnails-ui.test.tsx`
- `tests/unit/sheet-viewer-service.test.ts`
- `tests/e2e/sheet-viewer.spec.ts`
- existing Sheet Practice layout assertions around `sheet-viewer-scroll` and `sheet-practice-controls`

Do not weaken existing P5-07/P5-08 thumbnail service or UI assertions.

## Verification Commands For Coding Agent

Adjust scoped file lists to the final implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-viewer-thumbnails-ui.test.tsx
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-viewer.spec.ts --project=chromium
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/viewer/sheet-viewer-experience.tsx src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx tests/unit/sheet-viewer-thumbnails-ui.test.tsx tests/e2e/sheet-viewer.spec.ts
git diff --check
```

If a new `sheet-page-jump.tsx` or `sheet-viewer-page-jump.test.tsx` file is added, include it in the scoped lint/test command. If the validation helper is placed in `src/services/sheet-viewer/service.ts`, include `tests/unit/sheet-viewer-service.test.ts` in the unit command.

Final PR merge gate:

- Before marking the implementation PR ready, run the full local E2E suite in `[chromium]`, not only the scoped jump checks.
- GitHub CI must be green before ready/merge/status closeout.
- `docs/v1/status.json` remains untouched by the implementation PR; status closeout is a separate scheduler/status step after merge readiness is proven.

## Model Gates

- Planning agent: `gpt-5.5`, medium effort, standard-only/no-fast
- Coding agent: `gpt-5.5`, high effort, standard-only/no-fast
- Code review agent: `gpt-5.5`, extra-high effort, standard-only/no-fast
- Verification agent: `gpt-5.5`, high effort, standard-only/no-fast
- Web ChatGPT planning/PR gates: Extra High, not Pro

Reason: this is compact UI work, but it sits in the core Sheet Practice viewer and needs real browser evidence across responsive layouts. Tier C is appropriate; no media/timing/storage escalation is needed unless the implementation unexpectedly touches those boundaries.

## Handoff Notes For One Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P5-09-viewer-page-jump.md`
- `docs/v1/implementation-slices/plans/P5-08-viewer-page-thumbnails-ui.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/05a-sheet-viewer.md`
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx`
- `src/services/sheet-viewer/service.ts`
- `tests/unit/sheet-viewer-thumbnails-ui.test.tsx`
- `tests/e2e/sheet-viewer.spec.ts`

Implement P5-09 only. The shortest correct path is to add a small page jump form to the existing viewer toolbar, validate typed page numbers, and call the same `setCurrentPage` path already used by previous/next and thumbnails. Invalid input must show a recoverable error and must not alter `currentPage`.

## Split Triggers

Stop and return to planning if implementation appears to require:

- production-code changes above roughly 150-250 LOC excluding tests;
- a new global store, context provider, URL query state, or persisted selected-page field;
- any Dexie schema/version/migration/storage cleanup/export/import change;
- changes to thumbnail generation, thumbnail service caching, object URL lifecycle, PDF.js worker setup, or Sheet Library import;
- zoom-pan transform state or gesture work;
- assisted page turning, score following, segment-boundary rules, reference playback coupling, or timing logic;
- a broad rewrite of `SheetViewerExperience`, `PdfSheetRenderer`, `ReferencePanel`, `SheetPracticeControls`, or the thumbnail rail/drawer.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Viewer zoom-pan domain state | P5-10 |
| Viewer zoom-pan UI controls and gestures | P5-11 |
| Assisted/manual page turning at segment boundaries | P5-12 |
| Persisted last-viewed page or URL deep-link page restore | Future reviewed navigation/persistence slice |
| Page jump history, named bookmarks, or section labels | Future viewer/navigation slice |
| Thumbnail virtualization / progressive rendering for very large PDFs | Future viewer performance slice |
| Cloud sync, score following, automatic recognition, mistake detection | v2 or future reviewed feature |
