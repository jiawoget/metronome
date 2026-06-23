# P1-04 Segment Types And Validation Plan

## 1. Slice Identity And Status Assumptions

- Slice: `P1-04 segment-types-and-validation`.
- Product feature: `practice.practice-segments`.
- Pack: `pack-1-practice-segment-mvp`.
- Current status assumption from `docs/v1/status.json`: `planning_ready`.
- Dependency assumptions: `P1-01 measure-grid-types-and-math`, `P1-02 measure-grid-repository`, and `P1-03 measure-grid-calibration-ui` are `verified`.
- Latest commit before this slice, per assignment: `dec69f6 feat: add v1 measure grid calibration UI`.
- Planning agent policy: `gpt-5.5`, medium effort, standard speed.
- Coding/review/verification tier from Pack 1: Tier A, pure logic/types/validation.
- Escalation recommendation: stay Tier A. This slice should add only deterministic domain types, validation, and stale-grid helpers. It must not touch UI, storage, browser E2E, media, migrations, or data cleanup.
- This plan is documentation only. Do not edit product code and do not edit `docs/v1/status.json` during planning.

Recommendation after this file exists: P1-04 can move to `ready_for_coding` because the domain contract, validation behavior, boundary matrix, test plan, and handoff scope are defined below.

## 2. Product And Design Intent From Docs

`practice.practice-segments` lets a user save a focused passage for one sheet, such as measures `5-12`, using the manually calibrated `practice.measure-grid`. Segment timing must remain deterministic because start/end timestamps are derived from MeasureGrid utilities rather than automatic PDF recognition, score following, or audio analysis.

For P1-04 only, the product intent is the pure domain foundation for later segment repository and UI slices:

- Define a Practice Segment data shape that can support later create/edit/delete/select flows.
- Validate segment identity, sheet scoping, display name, inclusive measure range, optional target BPM, optional notes, and grid association metadata.
- Provide deterministic helpers that associate a segment with the MeasureGrid it was created against and detect when the current grid is missing or changed.
- Preserve room for later P1 slices to persist segments, show stale status, compute timestamps, select segments, and attach segment snapshots to recordings.

Design/UI intent from the product contract is informative but not implemented here. Later UI must be compact, sheet-secondary, honest about manual calibration, and show statuses such as `Needs calibration` and `Grid changed`. P1-04 only gives those later slices stable domain statuses to consume.

## 3. Domain Model Contract

Add a narrow segment domain module, preferably:

```text
src/domain/practice/segments/index.ts
```

and export it through:

```text
src/domain/practice/index.ts
```

Recommended types:

```ts
export type PracticeSegmentGridAssociation = {
  measureGridVersion: string;
  measureGridSnapshot: MeasureGrid;
};

export type PracticeSegment = {
  id: string;
  sheetId: string;
  name: string;
  range: MeasureRange;
  targetBpm: number | null;
  notes: string | null;
  grid: PracticeSegmentGridAssociation;
};

export type PracticeSegmentGridStatus =
  | "current"
  | "stale"
  | "missing-grid"
  | "invalid-association";
```

Field contract:

- `id`: required non-empty string after trimming. P1-04 validates IDs but does not generate IDs. Generation belongs to repository/UI slices if needed.
- `sheetId`: required non-empty string after trimming. P1-04 validates sheet scoping but does not check whether the sheet exists.
- `name`: required plain local text, trimmed for validation and returned normalized. Use a documented max length of `80` characters. Empty or whitespace-only names are invalid; do not create default names in this slice.
- `range`: existing `MeasureRange` shape with 1-based inclusive `startMeasure` and `endMeasure`. Reuse `measureRangeSchema` behavior through exported MeasureGrid domain helpers or a shared schema, and reject start greater than end.
- `targetBpm`: optional descriptive BPM, normalized as `number | null`. Valid non-null values are integers `30` through `300`, matching the approved MeasureGrid/session BPM policy. It must not apply tempo to transport controls.
- `notes`: optional plain text, normalized as `string | null`. Trim surrounding whitespace. Use a documented max length of `1000` characters. Empty or whitespace-only notes normalize to `null`.
- `grid`: required association with the active MeasureGrid used when the segment was created or last saved. Because the verified MeasureGrid type currently has no persisted id/version field, P1-04 should create a deterministic version/fingerprint from validated grid values and also store a validated grid snapshot.

Grid association policy:

- `createPracticeSegmentGridAssociation(grid: MeasureGrid): PracticeSegmentGridAssociation` validates the grid, creates a deterministic `measureGridVersion`, and stores the validated `measureGridSnapshot`.
- `getMeasureGridVersion(grid: MeasureGrid): string` should be deterministic and based only on normalized grid fields: `bpm`, `timeSignature`, `pickupBeats`, and `measureOneOffsetMs`.
- Do not add a version field to the MeasureGrid repository or persisted grid schema in P1-04. That would be persistence scope and would risk disturbing verified P1-02/P1-03 behavior.
- `isPracticeSegmentGridStale(segment, currentGrid)` returns whether a valid associated segment's stored version differs from the current validated grid version, or whether no current grid exists.
- `getPracticeSegmentGridStatus(segment, currentGrid)` returns:
  - `"current"` when the segment association is valid and versions match;
  - `"stale"` when the segment association is valid, a current grid exists, and versions differ;
  - `"missing-grid"` when the segment association is valid but no current grid exists;
  - `"invalid-association"` when the segment itself or stored association is malformed.

Optional helper allowed in this slice:

```ts
export function getPracticeSegmentRangeMs(segment: PracticeSegment, grid: MeasureGrid): MeasureRangeMs;
```

If implemented, it must delegate to `getMeasureRangeMs(grid, segment.range)`. It must not duplicate MeasureGrid math. This helper is useful but not required for P1-04 readiness; stale-status and validation are the required helpers.

## 4. Validation Behavior And API Shape

Follow existing `src/domain/practice/measure-grid/index.ts` patterns:

- Use Zod. It is already an approved dependency and used at domain/data boundaries.
- Export schemas only if useful to tests or later service layers. Keep public helper functions stable.
- Provide paired `parse*` and `validate*` functions:

```ts
export function parsePracticeSegment(value: unknown): PracticeSegment | null;
export function validatePracticeSegment(value: PracticeSegment): PracticeSegment;
export function parsePracticeSegmentGridAssociation(value: unknown): PracticeSegmentGridAssociation | null;
export function validatePracticeSegmentGridAssociation(
  value: PracticeSegmentGridAssociation
): PracticeSegmentGridAssociation;
export function parsePracticeSegmentName(value: unknown): string | null;
export function validatePracticeSegmentName(value: string): string;
export function parsePracticeSegmentNotes(value: unknown): string | null;
export function validatePracticeSegmentNotes(value: string | null): string | null;
export function parsePracticeSegmentTargetBpm(value: unknown): number | null;
export function validatePracticeSegmentTargetBpm(value: number | null): number | null;
```

Name behavior:

- Accept normal names such as `Bridge`, `mm. 5-12`, and names with internal spaces.
- Trim leading/trailing whitespace.
- Reject empty strings, whitespace-only strings, non-strings, and names longer than `80` characters after trimming.
- Do not enforce duplicate-name rules in P1-04 because duplicates require repository/sheet-list context. Later slice P1-05 or P1-07 must choose reject-or-disambiguate behavior.

Range behavior:

- Accept `{ startMeasure: 5, endMeasure: 12 }`.
- Accept one-measure ranges such as `{ startMeasure: 8, endMeasure: 8 }`.
- Reject start/end less than `1`, negative values, `0`, fractions, `NaN`, infinity, non-numeric strings, missing values, and start greater than end.
- Reuse existing `parseMeasureRange`/`validateMeasureRange` behavior rather than copying range rules into unrelated code.

Target BPM behavior:

- `null` and omitted/undefined input normalize to `null` only in parse/normalization entry points where the API explicitly accepts draft-like unknown data.
- Non-null target BPM must be a finite integer from `30` through `300`.
- Reject `29`, `301`, fractions, `NaN`, infinity, strings, and negative values.
- Do not clamp invalid target BPM. Reject it so later UI can show recoverable validation.

Notes behavior:

- `null`, omitted/undefined, empty string, and whitespace-only string normalize to `null` in parse/normalization helpers.
- Non-empty notes trim leading/trailing whitespace and preserve internal whitespace/newlines.
- Reject non-string notes and notes longer than `1000` characters after trimming.
- Notes are plain text only. Do not parse Markdown, HTML, tags, mentions, or links in this slice.

Grid association/stale behavior:

- A valid association must include both a non-empty deterministic `measureGridVersion` and a valid `measureGridSnapshot`.
- `getMeasureGridVersion` validates the grid before building the version string.
- The version string must be deterministic across process runs and object key order. Use explicit field order rather than `JSON.stringify` on arbitrary objects.
- A current grid with the same validated fields returns `"current"`.
- A changed BPM, time signature, pickup beats, or measure-one offset returns `"stale"`.
- `null` current grid returns `"missing-grid"`.
- Malformed segment/association returns `"invalid-association"` or throws from `validate*`, depending on which API is called.

Error behavior:

- `parse*` returns `null` on invalid input and never throws for ordinary invalid user/persisted data.
- `validate*` throws Zod validation errors on invalid input, matching existing MeasureGrid behavior.
- Helper functions that accept typed values may call `validate*` internally and throw on impossible invalid inputs.
- Do not create user-facing error copy in P1-04 beyond concise schema messages useful to tests/debugging. UI copy belongs to later UI slices.

## 5. Existing Patterns To Reuse And Constraints

Reuse:

- `src/domain/practice/measure-grid/index.ts` for `MeasureGrid`, `MeasureRange`, range validation, BPM limits, and deterministic range conversion.
- Existing `parse*` returns `null` and `validate*` throws pattern from MeasureGrid and practice validation.
- Existing `PracticeTimeSignature` and BPM validation policy from `src/domain/practice/types.ts` and `src/domain/practice/validation.ts`.
- Existing barrel export style in `src/domain/practice/index.ts`.
- Vitest domain test style in `tests/unit/measure-grid.test.ts`.
- README PowerShell verification command style using `scripts/npm-local.ps1`.

Constraints:

- No new libraries. Zod is already present and approved.
- No storage, Dexie, repository, service, hook, React component, route, or browser E2E code.
- No changes to MeasureGrid persistence schema or calibration UI.
- No duplicate MeasureGrid timing math.
- No generated ids, timestamps, current user/session lookup, or sheet existence lookup.
- No global state or active selection behavior.
- No product status update in `docs/v1/status.json`.

## 6. Out Of Scope

P1-04 must not implement:

- Segment repository/service or IndexedDB persistence.
- Segment create/edit/delete UI, selector UI, active segment state, dialogs, drawers, or panels.
- Browser reload behavior for saved segments.
- Duplicate-name enforcement across a sheet's segment list.
- Segment deletion behavior.
- Applying `targetBpm` to metronome controls.
- Segment-aware recording metadata, session metadata, rerecording, take grouping, review pages, waveform comparison, or Continue Practice targets.
- MeasureGrid calibration, MeasureGrid repository migration, or MeasureGrid UI changes.
- Sheet deletion cascade cleanup.
- Reference binding, AB looping, marker integration, bar-aware count-in, assisted page turning, or automatic transport looping.
- Automatic PDF/image bar-line detection, automatic score following, BPM detection, mistake detection, scoring, cloud sync, login, import/export, backup/restore, or conflict handling.

## 7. Boundary Condition Matrix

| Condition | Required behavior | Required evidence |
| --- | --- | --- |
| Valid segment | Accept non-empty id, sheetId, name, range `5-12`, optional target BPM, notes, and valid grid association | Unit test |
| Empty id | Reject; `parsePracticeSegment` returns `null`, `validatePracticeSegment` throws | Negative unit test |
| Empty sheetId | Reject; no sheet existence lookup | Negative unit test and source inspection |
| Name with leading/trailing spaces | Normalize to trimmed name | Unit test |
| Empty or whitespace name | Reject | Negative unit test |
| Long name over 80 chars | Reject | Boundary unit test |
| Name exactly 80 chars | Accept | Boundary unit test |
| One-measure range | Accept start equal to end | Unit test |
| Start measure 0/negative/fractional | Reject through MeasureGrid range validation | Negative unit test |
| End before start | Reject | Negative unit test |
| Missing/non-numeric range fields | Reject | Negative unit test |
| `targetBpm` null | Accept and preserve/null-normalize | Unit test |
| `targetBpm` 30 and 300 | Accept | Boundary unit test |
| `targetBpm` 29, 301, fractional, string, NaN | Reject | Negative unit test |
| Notes null/empty/whitespace | Normalize to `null` | Unit test |
| Notes with internal newline | Accept as plain text | Unit test |
| Notes over 1000 chars | Reject | Boundary unit test |
| Notes exactly 1000 chars | Accept | Boundary unit test |
| Valid grid association | Deterministic version and validated snapshot are created | Unit test |
| Same grid object values, different object identity | Status is `current` | Unit test |
| Grid BPM changed | Status is `stale` | Unit test |
| Grid time signature changed | Status is `stale` | Unit test |
| Grid pickup beats changed | Status is `stale` | Unit test |
| Grid offset changed | Status is `stale` | Unit test |
| Missing current grid | Status is `missing-grid` | Unit test |
| Malformed association | Parse returns `null` or status is `invalid-association`; validate throws | Negative unit test |
| Deterministic helpers | Same validated grid always produces same version string | Unit test |
| Source boundary | No UI/storage/service files changed | Source inspection |

## 8. Exact Test Plan

Create a focused unit test file:

```text
tests/unit/practice-segment-domain.test.ts
```

Core valid cases:

- Validates a segment named `Bridge` for sheet `sheet-alpha` with range `5-12`, `targetBpm: 96`, notes, and a grid association.
- Accepts a one-measure range `8-8`.
- Trims `id`, `sheetId`, `name`, and notes where applicable.
- Normalizes empty/whitespace notes to `null`.
- Accepts `targetBpm: null`.
- Accepts target BPM boundaries `30` and `300`.
- Accepts name length exactly `80`.
- Accepts notes length exactly `1000`.

Negative validation cases:

- Rejects empty/whitespace `id`.
- Rejects empty/whitespace `sheetId`.
- Rejects empty/whitespace name.
- Rejects name length `81`.
- Rejects start measure `0`, negative, fractional, `NaN`, string, missing.
- Rejects end measure `0`, negative, fractional, `NaN`, string, missing.
- Rejects end measure less than start measure.
- Rejects target BPM `29`, `301`, fractional, `NaN`, infinity, string.
- Rejects notes length `1001` and non-string notes.
- Rejects missing grid association, malformed version, malformed snapshot, and unsupported grid values.

Grid helper cases:

- `createPracticeSegmentGridAssociation` returns a snapshot equal to the validated grid and a deterministic version string.
- `getMeasureGridVersion` returns the same version for equivalent grid values.
- `getMeasureGridVersion` changes when BPM changes.
- `getMeasureGridVersion` changes when time signature changes.
- `getMeasureGridVersion` changes when pickup beats changes.
- `getMeasureGridVersion` changes when `measureOneOffsetMs` changes.
- `getPracticeSegmentGridStatus` returns `current` for matching current grid.
- `getPracticeSegmentGridStatus` returns `stale` for changed current grid.
- `getPracticeSegmentGridStatus` returns `missing-grid` for `null` current grid.
- `getPracticeSegmentGridStatus` returns `invalid-association` for malformed segment-like input, if the status helper accepts unknowns; otherwise `validatePracticeSegmentGridAssociation` throws and `parsePracticeSegmentGridAssociation` returns `null`.

Source-boundary checks:

- Review changed files and confirm they are limited to `src/domain/practice/segments/*`, `src/domain/practice/index.ts`, and `tests/unit/practice-segment-domain.test.ts` unless a tiny shared schema export is justified.
- Confirm no files under `src/services/`, `src/infrastructure/`, `src/components/`, `src/app/`, `src/hooks/`, or `tests/e2e/` changed.
- Confirm MeasureGrid math is reused by import, not copied.

Explicitly no browser E2E:

- P1-04 is Tier A and has no UI, persistence, or browser behavior. Do not add Playwright tests. Browser E2E belongs to later P1-06/P1-07 segment UI slices.

## 9. Verification Commands

Use README-style PowerShell commands.

Targeted unit commands:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit -- tests/unit/practice-segment-domain.test.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit -- tests/unit/measure-grid.test.ts
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

Do not run or add browser E2E for this Tier A slice unless the coding agent violates scope by touching UI, which should be treated as a review finding rather than expanded verification.

## 10. Review And Verification Checklist

Review checklist:

- [ ] Changed files stay inside the allowed P1-04 domain/test scope.
- [ ] Zod is reused; no new validation library is introduced.
- [ ] `parse*` helpers return `null` and `validate*` helpers throw, matching existing domain style.
- [ ] Name, range, target BPM, notes, id, sheetId, and grid association rules match this plan.
- [ ] Grid version/fingerprint is deterministic and based on validated MeasureGrid fields in explicit field order.
- [ ] Stale-grid helpers handle matching, changed, missing, and invalid association cases.
- [ ] Existing MeasureGrid range validation and optional range conversion are reused, not copied.
- [ ] No repository, Dexie, service, UI, route, hook, E2E, recording, session, marker, reference, cloud, or analysis behavior was added.
- [ ] `docs/v1/status.json` was not edited.

Verification checklist:

- [ ] Run targeted practice segment domain tests.
- [ ] Run MeasureGrid domain regression tests.
- [ ] Run typecheck.
- [ ] Run lint.
- [ ] Inspect source boundaries for no storage/UI/service changes.
- [ ] Confirm no browser E2E was added for this Tier A slice.
- [ ] Confirm exported APIs are reachable from `@/domain/practice`.
- [ ] Confirm the implementation can support later P1-05 repository and P1-06/P1-07 UI slices without changing this contract.

## 11. Coding-Agent Handoff

Read before coding:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/01-practice-segment-mvp.md`
- `docs/v1/implementation-slices/plans/P1-04-segment-types-and-validation.md`
- `docs/v1/05f-practice-segments.md`, especially `practice.practice-segments` and relevant `practice.measure-grid` references
- `docs/v1/agent-implementation-rules.md`
- `README.md` verification command section
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`

Narrow code patterns to inspect:

- `src/domain/practice/measure-grid/index.ts`
- `src/domain/practice/index.ts`
- `src/domain/practice/types.ts`
- `src/domain/practice/validation.ts`
- `tests/unit/measure-grid.test.ts`
- `tests/unit/measure-grid-repository.test.ts` only for validation-before-write style and malformed-data expectations

Allowed write scope:

- `src/domain/practice/segments/index.ts`
- Minimal export update in `src/domain/practice/index.ts`
- `tests/unit/practice-segment-domain.test.ts`
- If strictly necessary, a tiny shared schema/export inside `src/domain/practice/measure-grid/index.ts` to reuse measure-range validation without duplication; prefer existing public helpers first and document any shared edit.

Forbidden write scope:

- Do not edit `docs/v1/status.json`.
- Do not edit product docs other than this plan.
- Do not change MeasureGrid repository, MeasureGrid UI, persisted DB schema, calibration behavior, or E2E tests.
- Do not create `src/services/practice-segments`, Dexie repositories, infrastructure DB files, hooks, stores, React components, app routes, or browser tests.
- Do not modify recording, session, marker, reference, waveform, audio, sheet import, settings, cleanup, cloud, or review modules.
- Do not add dependencies or test tooling.
- Do not implement duplicate-name enforcement, id generation, segment selection, deletion, persistence, or reload behavior.

Preserve verified behavior:

- P1-01 MeasureGrid math and validation remain the source of truth for range rules and timing.
- P1-02 MeasureGrid service/repository remains unchanged.
- P1-03 calibration UI remains unchanged.
- Existing v0 Sheet Practice, Sheet Library, metronome, recording, review, and MeasureGrid tests must continue to pass.

## 12. Ready For Coding Recommendation

P1-04 can move to `ready_for_coding` after this planning file is accepted as the durable planning artifact. Keep coding/review/verification at Tier A. Escalate only if implementation discovers that the segment stale-grid requirement cannot be met without changing MeasureGrid persistence schema or UI behavior; in that case, stop and return to planning instead of expanding the slice.
