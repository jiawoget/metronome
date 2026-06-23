# P1-05 Segment Repository Plan

## 1. Slice Identity And Status Assumptions

- Slice: `P1-05 segment-repository`.
- Product feature: `practice.practice-segments`.
- Pack: `pack-1-practice-segment-mvp`.
- Current status assumption from `docs/v1/status.json`: `planning_ready`.
- Dependency assumptions: `P1-01 measure-grid-types-and-math`, `P1-02 measure-grid-repository`, `P1-03 measure-grid-calibration-ui`, and `P1-04 segment-types-and-validation` are `verified`.
- Latest commit before this slice, per assignment: `65148b6 feat: add v1 practice segment domain`.
- Planning agent policy: `gpt-5.5`, medium effort, standard speed.
- Expected coding/review/verification tier from Pack 1: Tier B, local persistence/service boundary.
- Escalation recommendation: stay Tier B. The slice adds local Dexie-backed CRUD and service tests, but no UI, browser E2E, media artifacts, destructive cleanup, migration, or sheet deletion cascade.
- This plan is documentation only. Do not edit product code and do not edit `docs/v1/status.json` during planning.

Recommendation after this file exists: P1-05 can move to `ready_for_coding` because the repository/service contract, persistence shape, boundary cases, verification commands, and coding-agent handoff are defined below.

## 2. Product And Design Intent From Docs

`practice.practice-segments` lets a user save focused passages for one sheet, such as measures `5-12`, using the manually calibrated `practice.measure-grid`. Segments are measure-aware through deterministic MeasureGrid math, not PDF bar-line recognition, score following, BPM detection, mistake detection, or audio analysis.

For P1-05 only, the product intent is the local persistence and service boundary for saved segment metadata:

- Store Practice Segment records locally and scope every record to a `sheetId`.
- Read all valid segments for a sheet so later selector/UI slices can display them.
- Read one valid segment by `sheetId` and `segmentId` for later edit/select/recording flows.
- Create, replace/update, and delete segment records without affecting other sheets.
- Preserve the grid association snapshot created by P1-04 so later UI can detect current, stale, missing-grid, or invalid-association states.
- Treat missing MeasureGrid or stale MeasureGrid as safe segment state, not as repository failure.

Design/UI intent is informative but not implemented here. Later UI slices must keep segment controls compact and honest about manual calibration; P1-05 only provides the storage boundary that those UI slices will call.

## 3. Service And Repository Contract

Add a narrow service boundary, preferably:

```text
src/services/practice-segments/index.ts
src/services/practice-segments/service.ts
src/services/practice-segments/types.ts
src/services/practice-segments/validation.ts
```

Recommended interfaces:

```ts
export type PracticeSegmentRepository = {
  listSegments: (sheetId: string) => Promise<PracticeSegment[]>;
  getSegment: (sheetId: string, segmentId: string) => Promise<PracticeSegment | null>;
  saveSegment: (segment: PracticeSegment) => Promise<void>;
  deleteSegment: (sheetId: string, segmentId: string) => Promise<void>;
};

export type PracticeSegmentService = {
  listSegments: (sheetId: string) => Promise<PracticeSegment[]>;
  getSegment: (sheetId: string, segmentId: string) => Promise<PracticeSegment | null>;
  saveSegment: (segment: PracticeSegment) => Promise<PracticeSegment>;
  deleteSegment: (sheetId: string, segmentId: string) => Promise<void>;
};
```

Method semantics:

- `listSegments(sheetId)` trims and validates `sheetId`; empty ids reject. For a valid sheet with no rows, return `[]`. Rows whose payloads are malformed or whose embedded `sheetId` does not match the requested sheet must be ignored, not thrown.
- `getSegment(sheetId, segmentId)` trims and validates both ids; empty ids reject. Return `null` when no matching row exists, when a row is malformed, or when a stored row's embedded `sheetId`/`id` does not match the requested ids.
- `saveSegment(segment)` validates and normalizes the full `PracticeSegment` through `validatePracticeSegment`, including id, sheetId, name, range, optional target BPM, notes, and grid association. It replaces the full stored segment for the `(sheetId, id)` pair and returns the validated segment from the service.
- `deleteSegment(sheetId, segmentId)` trims and validates both ids, deletes only that segment for that sheet, and is idempotent for a missing segment.

ID and key semantics:

- `sheetId` and `segmentId` are required non-empty strings after trimming.
- P1-05 should normalize ids at the service boundary before repository calls. If P1-04 validation already trims `id` and `sheetId`, reuse it; otherwise add service-level id normalizers matching `normalizeMeasureGridSheetId`.
- The repository must prevent cross-sheet deletes and reads. A `segmentId` alone is not enough for deletion or get semantics.
- If the persisted table uses a composite key, use a stable derived key such as `${sheetId}::${segmentId}` or Dexie compound key support. Keep this key infrastructure-only; domain objects remain `PracticeSegment`.

Update semantics:

- Save is replacement, not merge. A later save for the same sheet/segment replaces name, range, target BPM, notes, and grid association with the validated payload.
- Saving the same `segmentId` under a different `sheetId` is a separate segment row because the repository scopes by sheet. Do not enforce global segment id uniqueness in this slice.
- Duplicate names within a sheet are allowed in P1-05 unless the domain contract is later changed. Duplicate-name UX belongs to P1-07.

Delete semantics:

- Delete removes only the requested segment row.
- Deleting a missing segment resolves successfully.
- Delete must not delete a MeasureGrid, sheet, recording, session, marker, reference, waveform, setting, or another sheet's segment.
- P1-05 does not implement cascading delete when a sheet is deleted.

Validation and missing sheet behavior:

- Use `validatePracticeSegment` and `parsePracticeSegment` from `src/domain/practice/segments/index.ts`; do not copy domain validation rules into the repository.
- Invalid save payloads reject before repository mutation.
- Failed validation must preserve prior valid data.
- A missing sheet library row is not an error. This repository stores segment metadata by `sheetId` and does not check whether the sheet exists.
- Storage/Dexie failures should propagate. The service must not report a saved or deleted state when IndexedDB operations fail.

Grid association safety:

- A segment must contain a valid P1-04 grid association to be saved.
- The repository does not read the current MeasureGrid and does not fail merely because the current grid is missing, stale, or changed.
- Stale/missing-grid status is a read-time concern for later UI/services using `getPracticeSegmentGridStatus(segment, currentGrid)`.
- Malformed saved grid associations make that persisted row invalid for reads; return safe absence for `getSegment` and omit from `listSegments`.

## 4. Persistence Design

Use Dexie/IndexedDB behind `src/infrastructure/db/`, matching the verified MeasureGrid repository:

```text
src/infrastructure/db/browser-practice-segment-service.ts
```

Recommended DB/table shape:

- DB name: `metronome-practice-v1-practice-segments`.
- Table: `segments`.
- Primary key: a stable repository key for `(sheetId, segmentId)`, for example `key`.
- Indexes: `sheetId`, `segmentId`, and `updatedAt`; if using a compound primary key, still make per-sheet listing efficient.

Suggested persisted row:

```ts
type PersistedPracticeSegmentRecord = {
  key: string;
  sheetId: string;
  segmentId: string;
  segment: PracticeSegment;
  updatedAt: string;
};
```

Serialized payload:

- `segment.id`: normalized segment id.
- `segment.sheetId`: normalized sheet id and must match row `sheetId`.
- `segment.name`: normalized segment name.
- `segment.range`: inclusive P1-04 `MeasureRange`.
- `segment.targetBpm`: integer `30..300` or `null`.
- `segment.notes`: trimmed text or `null`.
- `segment.grid.measureGridVersion`: deterministic version string from P1-04.
- `segment.grid.measureGridSnapshot`: validated `MeasureGrid` snapshot from P1-04.
- `updatedAt`: ISO timestamp for storage/debugging; not part of the domain segment returned to consumers.

Reload/service recreation:

- Closing/resetting the Dexie singleton and reading again must return saved valid segments.
- Multiple sheets and multiple segments per sheet must survive reload independently.
- Service recreation must not rely on React state, singleton in-memory maps, localStorage, or current sheet UI state.

Malformed data behavior:

- `parsePersistedPracticeSegmentRecord(value)` or equivalent should return `PracticeSegment | null`.
- Non-object rows, missing `segment`, missing row ids, mismatched row ids, invalid segment fields, invalid range, invalid target BPM, invalid notes, invalid grid association, malformed grid snapshot, and unsupported time signature all map to `null` on read.
- `listSegments` filters malformed rows out.
- `getSegment` returns `null` for malformed matching rows.
- Do not auto-delete malformed rows in P1-05; safe absence is enough.

No sheet lifecycle coupling:

- Do not import or call sheet-library repositories/services.
- Do not cascade delete segments when a sheet is deleted.
- Do not validate sheet existence before saving a segment.
- Later cleanup/import/export/migration slices may add lifecycle behavior, but P1-05 must remain a narrow per-sheet segment store.

## 5. Existing Patterns To Reuse And Constraints

Reuse:

- P1-04 domain validation and helpers in `src/domain/practice/segments/index.ts`.
- P1-01/P1-02 MeasureGrid domain/service patterns for validation-before-write and safe malformed reads.
- `src/services/measure-grid/service.ts`, `types.ts`, and `validation.ts` as the nearest service-boundary template.
- `src/infrastructure/db/browser-measure-grid-service.ts` for Dexie class, lazy singleton, exported browser repository/service, parser helper, seed/reset/clear test helpers, and reload tests.
- `tests/unit/measure-grid-repository.test.ts` for memory repository service tests, Dexie integration tests, malformed fixtures, validation preservation, and fake-indexeddb setup.
- Zod at domain/data boundaries. Do not add another validation library.

Constraints:

- No new framework, persistence library, global state library, or test runner.
- No localStorage for required segment data.
- UI and future UI code must call services, not Dexie directly.
- Repository code must not duplicate measure duration/range math.
- No broad app DB migration framework.
- No browser E2E in this slice unless implementation unexpectedly touches UI, which should be treated as a scope violation.

## 6. Out Of Scope

P1-05 must not implement:

- Segment selector UI, create/edit/delete UI, dialogs, drawers, panels, active selection state, hooks, stores, or Sheet Practice route wiring.
- Applying `targetBpm` to metronome controls.
- MeasureGrid calibration changes, MeasureGrid schema changes, or current-grid lookups inside the segment repository.
- Segment-aware recording metadata, recording artifacts, session metadata, rerecording, take grouping, take history, review pages, waveform comparison, or Continue Practice targets.
- Sheet deletion cascade cleanup or sheet existence validation.
- Import/export, backup/restore, cleanup, migration, cloud sync, login, or conflict handling.
- Reference binding, AB looping, marker integration, bar-aware count-in, assisted page turning, automatic transport looping, automatic PDF/image bar-line detection, automatic score following, BPM detection, mistake detection, or scoring.
- Editing `docs/v1/status.json`.

## 7. Boundary Matrix

| Condition | Required behavior | Required evidence |
| --- | --- | --- |
| No segments for valid sheet | `listSegments` returns `[]`; `getSegment` returns `null` | Service unit and Dexie tests |
| Per-sheet isolation | Sheet A list/get/update/delete never exposes or mutates sheet B segments | Service and Dexie tests |
| Multiple segments in one sheet | `listSegments` returns all valid segments for that sheet | Service and Dexie tests |
| Invalid segment save | `saveSegment` rejects before mutation | Service test with mocked repository and Dexie preservation test |
| Invalid `sheetId` | list/get/delete reject; save rejects through segment validation | Negative service tests |
| Invalid `segmentId` | get/delete reject and do not call repository | Negative service tests |
| Delete missing segment | Resolves successfully and preserves other rows | Service or Dexie test |
| Update missing segment | `saveSegment` creates/replaces the requested row; no separate update-only API in P1-05 | Service and Dexie test |
| Update existing segment | Later save replaces full segment payload | Service and Dexie test |
| Stale grid association | Valid segment with stale association remains readable; later status helper can report stale | Repository test using changed current grid outside repository, or source inspection plus domain regression |
| Missing current grid | Repository reads saved valid segment; it does not require MeasureGrid lookup | Source inspection and test without measure-grid DB seed |
| Invalid/malformed association | Malformed persisted row is omitted/`null`; invalid save rejects | Malformed fixture and save validation tests |
| Malformed persisted rows | Reads return safe absence and never crash | Parser and Dexie malformed fixture tests |
| Failed validation preserving prior data | Prior valid row remains after invalid save attempt | Service memory test and Dexie test |
| Storage write failure | Error propagates to caller | Service test with throwing repository |
| Reload/service recreation | Saved segments remain readable after Dexie connection reset | Dexie test |
| No sheet lifecycle coupling | No sheet repository imports; missing sheet is not an error | Source inspection |

## 8. Exact Test Plan

Create a focused test file:

```text
tests/unit/practice-segment-repository.test.ts
```

Service unit tests with an in-memory `PracticeSegmentRepository`:

- `listSegments returns an empty array when a valid sheet has no segments`.
- `saveSegment returns the validated segment and trims id/sheetId/name/notes through domain validation`.
- `listSegments returns only segments for the requested sheet`.
- `getSegment returns one segment scoped by sheetId and segmentId`.
- `saveSegment replaces the full segment payload for the same sheet and id`.
- `saveSegment with the same segmentId on another sheet does not affect the first sheet`.
- `deleteSegment removes only the requested segment`.
- `deleteSegment is idempotent for a missing segment`.
- `listSegments rejects empty sheetId without touching repository`.
- `getSegment rejects empty sheetId or segmentId without touching repository`.
- `deleteSegment rejects empty sheetId or segmentId without touching repository`.
- `saveSegment rejects invalid segment payloads and does not call repository`.
- `saveSegment validation failure preserves prior valid data`.
- `saveSegment propagates repository storage failures`.

Repository/Dexie integration tests with fake-indexeddb/real Dexie:

- Browser repository returns `[]`/`null` for missing data.
- Browser repository persists one valid segment by sheet id.
- Browser repository persists multiple segments for the same sheet.
- Browser repository isolates two sheets with overlapping segment ids.
- Browser repository updates/replaces the same sheet/segment row.
- Browser repository deletes only the requested row.
- Browser repository delete is idempotent for a missing row.
- Browser repository validates before write and preserves prior valid row when validation fails.
- Browser repository survives connection reset/reload with all valid segments intact.
- Browser repository reads a segment with stale-but-valid grid association without requiring current grid lookup.

Malformed fixtures:

- Non-object row.
- Row with no `segment`.
- Row with mismatched row `sheetId` and `segment.sheetId`.
- Row with mismatched row `segmentId` and `segment.id`.
- Segment missing id or sheetId.
- Empty name.
- Invalid range: start `0`, fractional start, end before start.
- Invalid target BPM: `29`, `301`, fractional, string, `NaN`.
- Invalid notes: over `1000` chars or non-string.
- Missing grid association.
- Empty `measureGridVersion`.
- Grid snapshot missing offset.
- Grid snapshot with unsupported time signature such as `5/4`.
- Grid snapshot with invalid pickup or BPM.

Negative/scope cases:

- Do not test sheet existence lookup because P1-05 must not perform one.
- Do not add Playwright/browser UI tests because no UI should change.
- Do not modify P1-04 domain tests except for a narrow import/export regression if needed.

Tier B E2E rationale:

- No browser E2E is required for P1-05 because the slice has no user-facing UI, no route wiring, no media capture, and no browser layout behavior. Persistence/reload must be verified at the Dexie repository boundary with fake-indexeddb and a connection-reset test. P1-06/P1-07 own real browser UI and reload-through-page evidence.

## 9. Verification Commands

Use README-style PowerShell commands.

Targeted unit commands:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit -- tests/unit/practice-segment-repository.test.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit -- tests/unit/practice-segment-domain.test.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit -- tests/unit/measure-grid-repository.test.ts
```

Typecheck and lint:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run typecheck
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run lint
```

Broader unit regression when time allows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit
```

Do not run `test:e2e` for this Tier B slice unless the coding agent changes UI or route code, which should be reviewed as an out-of-scope change.

## 10. Review And Verification Checklist

Review checklist:

- [ ] Changed files stay inside the allowed P1-05 service/infrastructure/test scope.
- [ ] Service methods validate/normalize ids before repository calls.
- [ ] `saveSegment` uses P1-04 `validatePracticeSegment` and does not duplicate domain validation.
- [ ] Reads of malformed persisted data return safe absence.
- [ ] List/get are scoped by `sheetId`; deletes cannot cross sheets.
- [ ] Save is full replacement and preserves other sheet rows.
- [ ] Failed validation preserves prior valid data.
- [ ] Storage errors propagate.
- [ ] Valid stale or missing-current-grid associations remain repository-readable.
- [ ] No sheet-library lookup, sheet lifecycle coupling, MeasureGrid mutation, UI, hook, store, route, recording, session, marker, reference, cleanup, import/export, backup, migration, cloud, or analysis behavior was added.
- [ ] `docs/v1/status.json` was not edited.

Verification checklist:

- [ ] Run targeted practice segment repository tests.
- [ ] Run practice segment domain regression tests.
- [ ] Run MeasureGrid repository regression tests.
- [ ] Run typecheck.
- [ ] Run lint.
- [ ] Inspect Dexie schema, primary key/indexes, row shape, and parser behavior.
- [ ] Inspect source boundaries for no UI/storage bypass from components.
- [ ] Confirm reload/connection-reset coverage exists.
- [ ] Confirm malformed fixtures cover invalid segment fields and invalid grid associations.
- [ ] Confirm no browser E2E was added for this Tier B repository-only slice.

## 11. Coding-Agent Handoff

Read before coding:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/01-practice-segment-mvp.md`
- `docs/v1/implementation-slices/plans/P1-05-segment-repository.md`
- `docs/v1/05f-practice-segments.md`, especially `practice.practice-segments` and MeasureGrid dependencies
- `docs/v1/agent-implementation-rules.md`
- `README.md` verification command section
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`

Narrow code patterns to inspect:

- `src/domain/practice/segments/index.ts`
- `src/domain/practice/measure-grid/index.ts`
- `src/services/measure-grid/index.ts`
- `src/services/measure-grid/service.ts`
- `src/services/measure-grid/types.ts`
- `src/services/measure-grid/validation.ts`
- `src/infrastructure/db/browser-measure-grid-service.ts`
- `tests/unit/measure-grid-repository.test.ts`
- `tests/unit/practice-segment-domain.test.ts`
- Other Dexie repository patterns only if needed: `src/infrastructure/files/sheet-library-repository.ts` and `src/infrastructure/db/practice-session-repository.ts`

Allowed write scope:

- `src/services/practice-segments/*`
- `src/infrastructure/db/browser-practice-segment-service.ts`
- `tests/unit/practice-segment-repository.test.ts`
- Minimal barrel export updates required for the new service.
- If strictly necessary, tiny shared id-normalization helpers inside the new segment service files. Prefer not to change P1-04 domain files unless a missed export blocks reuse.

Forbidden write scope:

- Do not edit `docs/v1/status.json`.
- Do not edit product docs other than implementation notes explicitly assigned by the scheduler.
- Do not change MeasureGrid repository, MeasureGrid calibration UI, MeasureGrid persisted schema, or P1-04 segment domain semantics.
- Do not create React components, hooks, stores, app routes, selector UI, create/edit/delete UI, dialogs, drawers, panels, or browser E2E tests.
- Do not modify recording, session, marker, reference, waveform, audio, sheet import, settings, cleanup, import/export, backup/restore, cloud, or review modules.
- Do not add dependencies or test tooling.
- Do not implement duplicate-name enforcement, active segment selection, sheet deletion cascade, segment recording metadata, target BPM application, or reload-through-page behavior.

Preserve verified behavior:

- P1-01 MeasureGrid math and validation remain the source of truth for range/timing rules.
- P1-02 MeasureGrid repository remains unchanged.
- P1-03 calibration UI remains unchanged.
- P1-04 segment domain validation remains the source of truth for segment shape and grid association.
- Existing v0 Sheet Practice, Sheet Library, metronome, recording, review, session, and settings tests must continue to pass if affected.

## 12. Ready For Coding Recommendation

P1-05 can move to `ready_for_coding` after this planning file is accepted as the durable planning artifact. Keep coding/review/verification at Tier B. Escalate only if implementation discovers unavoidable schema migration, sheet lifecycle cleanup, UI route wiring, or recording/session metadata coupling; in that case, stop and return to planning instead of expanding the slice.
