# P1-02 Measure Grid Repository Plan

## 1. Slice Identity And Status Assumptions

- Slice: `P1-02 measure-grid-repository`.
- Product feature: `practice.measure-grid`.
- Pack: `pack-1-practice-segment-mvp`.
- Current status assumption from `docs/v1/status.json`: `planning_ready`.
- Dependency assumption: `P1-01 measure-grid-types-and-math` is `verified` and the domain API in `src/domain/practice/measure-grid/index.ts` is available.
- Planning agent policy: `gpt-5.5`, medium effort, standard speed.
- Coding/review/verification tier from Pack 1: Tier B, local persistence/service boundary.
- This plan is documentation only. Do not edit product code and do not mark `status.json` during planning.

Recommendation after this file exists: P1-02 can move to `ready_for_coding` because the scope, persistence contract, boundary cases, and verification commands are defined below.

## 2. Product And Design Intent

`practice.measure-grid` defines one deterministic musical time grid per sheet. It exists so later Practice Segment features can convert inclusive measure ranges into stable timestamps without automatic PDF bar-line recognition, score following, or audio analysis.

For this slice only, the product intent is storage and service access for one active saved grid per `sheetId`:

- Persist local grid metadata for a sheet.
- Read the saved grid for a sheet, returning safe absence when missing or malformed.
- Replace the existing grid for a sheet on update.
- Clear only the requested sheet's grid.
- Keep the boundary ready for P1-03 calibration UI and later segment services.

This slice must not implement calibration UI, draft defaults, unsaved state, sheet page reload behavior, segment CRUD, segment selection, recording metadata, sessions, markers, reference media, analysis, cloud sync, backup/restore, or cleanup flows.

## 3. Concrete Service Contract

Create or finalize a service boundary under `src/services/measure-grid/` using the verified P1-01 domain type:

```ts
export type MeasureGridRepository = {
  getGrid: (sheetId: string) => Promise<MeasureGrid | null>;
  saveGrid: (sheetId: string, grid: MeasureGrid) => Promise<void>;
  clearGrid: (sheetId: string) => Promise<void>;
};

export type MeasureGridService = {
  getGrid: (sheetId: string) => Promise<MeasureGrid | null>;
  saveGrid: (sheetId: string, grid: MeasureGrid) => Promise<MeasureGrid>;
  clearGrid: (sheetId: string) => Promise<void>;
};
```

Method semantics:

- `getGrid(sheetId)` trims and validates `sheetId`; empty or non-string-equivalent ids are invalid input and should throw a validation error rather than silently reading a shared empty key. For a valid id with no row, return `null`. For a row whose grid payload is malformed, return `null` and do not crash.
- `saveGrid(sheetId, grid)` trims and validates `sheetId`, validates `grid` through `validateMeasureGrid`, replaces the existing active grid for that sheet, and returns the validated normalized grid from the service. It must reject invalid grid values and invalid sheet ids before repository mutation.
- `clearGrid(sheetId)` trims and validates `sheetId`, deletes only that sheet's row, and is idempotent: clearing a missing grid resolves successfully.

Validation and error behavior:

- Reuse P1-01 validation for `MeasureGrid`; do not duplicate BPM, time signature, pickup, offset, or measure math rules.
- Invalid `sheetId` and invalid save payloads should reject with ordinary validation errors suitable for calling UI/service code to catch.
- Missing persisted data and malformed persisted rows are not exceptional for reads; they map to `null`.
- Dexie/storage failures should propagate. The service must not claim success if IndexedDB writes fail.

Idempotency and atomicity:

- `saveGrid` is replacement, not merge. A later save fully replaces `bpm`, `timeSignature`, `pickupBeats`, and `measureOneOffsetMs`.
- Failed validation must preserve the prior valid row.
- Failed storage writes should not be swallowed. Use Dexie `put` as the single-row atomic operation; if a wider transaction is introduced later, keep it scoped to the measure-grid table only.
- `clearGrid` must not affect sheets, sessions, recordings, segments, settings, or other grids.

## 4. Persistence Design

Use Dexie/IndexedDB behind `src/infrastructure/db/`, matching existing repository style:

- Add or finalize `src/infrastructure/db/browser-measure-grid-service.ts`.
- Use a dedicated local DB name such as `metronome-practice-v1-measure-grids` unless the coding agent has a concrete reason to share an existing DB. Do not couple this table to sheet-library lifecycle or settings DB internals.
- Use a single table, for example `grids`, keyed by `sheetId`.
- Suggested index: `grids: "sheetId, updatedAt"`.

Persisted row shape:

```ts
type PersistedMeasureGridRecord = {
  sheetId: string;
  grid: MeasureGrid;
  updatedAt: string;
};
```

Serialized payload shape:

- `grid.bpm`: integer BPM accepted by P1-01 domain validation.
- `grid.timeSignature`: supported `PracticeTimeSignature` string.
- `grid.pickupBeats`: finite non-negative integer less than numerator.
- `grid.measureOneOffsetMs`: finite non-negative integer timestamp.
- `updatedAt`: ISO timestamp for storage/debugging; it is not part of the domain grid returned to consumers.

Reload behavior:

- Closing/resetting the Dexie connection and reading again must return the saved grid for the same `sheetId`.
- Multiple sheets must survive reload independently.
- Browser page-level reload is P1-03 UI scope, but this slice must test repository reload/storage-boundary behavior.

Malformed data behavior:

- If a persisted row is missing, return `null`.
- If a row exists but is non-object, has no `grid`, has missing grid fields, unsupported time signature, out-of-range BPM, invalid pickup, invalid offset, `NaN`, fractional values, or negative values, return `null`.
- Do not auto-delete malformed rows in P1-02 unless explicitly added to the contract later; safe absence is enough.

No sheet lifecycle coupling:

- P1-02 does not create sheets, read sheets, update sheet defaults, cascade-delete with sheet deletion, or validate that a `sheetId` exists in the sheet library.
- Later cleanup/migration work may add lifecycle coupling, but this repository should remain a narrow per-sheet grid store.

## 5. Existing Patterns To Reuse

Reuse these patterns and do not rebuild them:

- Domain validation from `src/domain/practice/measure-grid/index.ts`.
- Service factory pattern from `src/services/settings/service.ts` and `src/services/practice-session/service.ts`.
- Repository interfaces under `src/services/*/types.ts`.
- Dexie class, lazy singleton connection, exported browser repository/service, and test reset helper patterns from `src/infrastructure/db/browser-settings-service.ts` and `src/infrastructure/db/practice-session-repository.ts`.
- Zod at data boundaries. Do not hand-roll ad hoc validation when P1-01 schemas already exist.
- Vitest unit/integration style in `tests/unit/measure-grid.test.ts`, `tests/unit/settings-service.test.ts`, and `tests/unit/practice-session-service.test.ts`.

No-new-wheel constraints:

- Do not introduce another local persistence library.
- Do not let UI or future UI code call Dexie directly.
- Do not add global state, hooks, or React components in this slice.
- Do not create a broad app database migration framework.
- Do not copy measure duration/range math into the repository.
- Do not add Playwright tests for this slice unless implementation unexpectedly touches UI.

## 6. Functional Boundaries And Out Of Scope

In scope:

- Measure grid service/repository interfaces.
- Browser Dexie repository and exported browser service.
- Safe parsing of persisted rows.
- Save/read/update/clear behavior scoped by `sheetId`.
- Unit tests for service validation/semantics.
- Repository/Dexie tests for persistence, reload, malformed rows, update replacement, and clear isolation.
- Minimal barrel exports needed for future slices.

Out of scope:

- Calibration UI and visible statuses.
- Initializing draft grid defaults from sheet BPM, time signature, or current metronome.
- Sheet Practice page wiring.
- Practice Segment records or selectors.
- Recording/session metadata changes.
- Cleanup UI, import/export, migrations, backup/restore, or cloud sync.
- Sheet deletion cascade behavior.
- Automatic PDF/image recognition, score following, BPM detection, mistake detection, or scoring claims.

## 7. Boundary Condition Matrix

| Condition | Required behavior | Required evidence |
| --- | --- | --- |
| Missing grid for valid `sheetId` | `getGrid` resolves `null` | Service unit test and Dexie repository test |
| Empty `sheetId` | `getGrid`, `saveGrid`, and `clearGrid` reject; no empty-key row is created | Negative service tests |
| Whitespace `sheetId` | Trim before use or reject consistently; document chosen behavior in test names | Negative/normalization service tests |
| Invalid save grid | `saveGrid` rejects before repository mutation | Unit test with previous valid grid preserved |
| Invalid persisted row | Repository read returns `null` and does not throw | Malformed fixture tests |
| Update existing grid | Later `saveGrid` replaces the full grid for same sheet | Service and Dexie tests |
| Multi-sheet isolation | Save/update/clear for sheet A does not affect sheet B | Service and Dexie tests |
| Clear missing grid | `clearGrid` resolves successfully | Service or Dexie test |
| Clear existing grid | Only requested sheet becomes `null` | Service and Dexie tests |
| Reload/storage boundary | After connection reset, saved grid is still readable | Dexie test |
| Legacy/no-grid records | Missing table row or row without `grid` maps to `null` | Malformed fixture tests |
| Failed validation after valid save | Previous valid row remains readable | Service unit test; Dexie test if repository validates too |
| Storage write failure | Error propagates and caller cannot mistake it for saved calibration | Repository fake that throws, or service unit with throwing repository |
| Sheet lifecycle absence | Repository does not require sheet library lookup | Source inspection checklist |

## 8. Test Plan

Unit/service tests in `tests/unit/measure-grid-repository.test.ts` or an equivalent dedicated file:

- `getGrid returns null when a valid sheet has no grid`.
- `saveGrid returns the validated grid and repository receives that validated grid`.
- `saveGrid updates one active grid by replacing the previous grid for the same sheet`.
- `saveGrid isolates grids across two sheet ids`.
- `clearGrid removes only the requested sheet grid`.
- `clearGrid is idempotent for a missing grid`.
- `getGrid rejects empty sheetId`.
- `saveGrid rejects empty sheetId and does not mutate repository`.
- `clearGrid rejects empty sheetId and does not call repository delete`.
- `saveGrid rejects invalid BPM, unsupported time signature, invalid pickup, negative/fractional/NaN offset`.
- `saveGrid validation failure preserves previous valid data`.
- `repository storage failure from saveGrid propagates`.

Repository/Dexie integration tests:

- `browser repository returns null for missing grid`.
- `browser repository persists a grid by sheetId`.
- `browser repository updates/replaces the same sheet row`.
- `browser repository stores two sheets independently`.
- `browser repository clears only the requested sheet`.
- `browser repository clear is idempotent for missing sheet`.
- `browser repository survives Dexie connection reset/reload`.
- `browser repository validates before write and preserves prior valid row when validation fails`.

Malformed fixture cases:

- Non-object row.
- Row with no `grid`.
- Grid missing `measureOneOffsetMs`.
- Unsupported time signature such as `5/4`.
- BPM below minimum and above maximum.
- Pickup equal to numerator.
- Negative offset.
- `NaN` offset.
- Fractional offset.
- Non-integer BPM or pickup.

Negative cases:

- Do not add tests that expect sheet existence checks.
- Do not add E2E tests for calibration UI in P1-02.
- Do not update existing P1-01 measure math tests except if imports need a narrow barrel export adjustment.

E2E scope:

- Browser E2E is out of scope for P1-02 because no UI should change. Reload must be covered at the Dexie repository boundary. P1-03 owns real Sheet Practice reload-through-page evidence.

## 9. Verification Commands

Use the known PowerShell form:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/measure-grid-repository.test.ts
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/measure-grid.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
```

If the coding agent changes shared practice exports or service barrels, also run the nearest affected service tests, for example:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-service.test.ts
```

## 10. Review Checklist And Verification Checklist

Review checklist:

- [ ] Changed files are limited to the allowed P1-02 scope.
- [ ] Service boundary exists and UI consumers can depend on it without Dexie imports.
- [ ] Invalid `sheetId` cannot create or read an empty-key row.
- [ ] Domain grid validation is reused, not copied.
- [ ] Reads of malformed persisted data return `null`.
- [ ] Saves replace the full grid for one sheet and preserve other sheets.
- [ ] Failed validation preserves the prior valid grid.
- [ ] Storage errors propagate.
- [ ] No calibration UI, segment, recording, session, sheet lifecycle, cleanup, import/export, or cloud behavior was added.

Verification checklist:

- [ ] Run the P1-02 repository test command.
- [ ] Run the P1-01 measure-grid domain test command.
- [ ] Run typecheck.
- [ ] Inspect Dexie schema and row shape.
- [ ] Inspect service methods for sheetId validation, validation-before-write, and no swallowed storage errors.
- [ ] Confirm repository tests include reload/connection reset.
- [ ] Confirm malformed fixtures cover missing, invalid, and legacy/no-grid records.
- [ ] Confirm `docs/v1/status.json` was not changed by the coding agent unless separately instructed.

## 11. Coding-Agent Handoff

Read before coding:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/01-practice-segment-mvp.md`
- `docs/v1/implementation-slices/plans/P1-02-measure-grid-repository.md`
- `docs/v1/05f-practice-segments.md`, only `practice.measure-grid`
- `docs/v1/agent-implementation-rules.md`
- `README.md` test command section
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`

Code/design patterns to inspect:

- `src/domain/practice/measure-grid/index.ts`
- `src/domain/practice/index.ts`
- `src/services/settings/*`
- `src/services/practice-session/*`
- `src/infrastructure/db/browser-settings-service.ts`
- `src/infrastructure/db/practice-session-repository.ts`
- `tests/unit/measure-grid.test.ts`
- Relevant existing service/repository tests.

Allowed write scope:

- `src/services/measure-grid/*`
- `src/infrastructure/db/browser-measure-grid-service.ts`
- `tests/unit/measure-grid-repository.test.ts`
- Minimal barrel export updates needed for the new service.

Forbidden write scope:

- No React components, hooks, stores, routes, Sheet Practice pages, or calibration UI.
- No segment service/repository/UI.
- No recording, session, marker, reference, waveform, audio, cleanup, import/export, backup/restore, or cloud code.
- No broad refactors, dependency changes, or schema migrations outside the measure-grid repository.
- Do not edit `docs/v1/status.json` during coding unless the scheduler explicitly assigns status updates.

Provisional implementation alignment notes:

- Draft files currently exist in `src/services/measure-grid/`, `src/infrastructure/db/browser-measure-grid-service.ts`, and `tests/unit/measure-grid-repository.test.ts`. Treat them as a draft, not authoritative.
- The draft already follows the expected service/repository/Dexie split and tests many core cases.
- Before considering it complete, align it with this plan by checking explicit `sheetId` validation for get/save/clear, clear idempotency, validation-before-write preservation in the Dexie repository, and storage-error propagation tests.

## 12. Ready For Coding Recommendation

P1-02 can move to `ready_for_coding` after this plan file is committed or otherwise accepted as the durable planning artifact. The scheduler should move only this slice status when appropriate; this planning pass intentionally leaves `docs/v1/status.json` unchanged.
