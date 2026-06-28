# P2-01 Take Grouping Domain Plan

## Slice

- Slice id: P2-01 `take-grouping-domain`
- Pack: Pack 2 Segment Take Review
- Product contracts: `recordings.review-grouping` in `docs/v1/03-recordings-review.md` and `takes.multi-take-management` in `docs/v1/05c-sheet-recording-review.md`
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier B, local persistence/service boundary with backwards-compatible metadata reads
- Status: ready for a fresh coding agent after this planning artifact; no product code is changed by this plan

## Goal

Add a deterministic domain/service boundary that groups existing review recordings into take groups by `sheetId` and optional `segmentId`, while preserving quick recordings and legacy sheet recordings that do not have segment metadata. This is a pure grouping/read-model slice for later review UI. It must not add UI, best/active take metadata, waveform comparison, scoring, export, or a new persistence backend.

## Refined Scope

- Define a reusable take-grouping read model for review recordings.
- Group sheet recordings by:
  - `sheetId`
  - `segmentContext.segmentId` when present and valid
  - an explicit no-segment bucket when `segmentContext` is absent or `null`
- Preserve quick recordings in a separate grouping path so the unified Recordings/Review system can still show them.
- Preserve legacy sheet recordings that have no `segmentContext` property.
- Sort recordings inside each group by recording time, newest first.
- Derive each group's latest take from recording time, not insertion order and not best/active metadata.
- Sort groups deterministically by their latest recording time, newest first, with stable tie-breakers.
- Expose enough summary fields for P2-02 UI to render groups without directly reimplementing grouping rules.
- Add focused tests for grouping, sorting, latest-take derivation, compatibility, and negative/boundary cases.

## Explicit Out Of Scope

- No UI changes in `src/app/recordings/`, `src/components/recordings/`, or sheet-practice review components.
- No best take, active take, favorite, archived, tag, or user-selected take metadata. P2-03/P2-04/P2-09 own those.
- No waveform comparison, waveform source changes, decoded peak work, or wavesurfer changes. P2-07/P2-08 own that.
- No automatic scoring, timing feedback, mistake detection, or analysis-backed ranking.
- No new recording capture behavior, MediaRecorder changes, playback changes, or metronome coupling.
- No export, import, migration script, backup/restore, or cleanup behavior.
- No new persistence backend and no schema rewrite. Reuse existing review recording shapes and repository normalization.
- No direct live segment repository lookup while grouping. Grouping uses immutable metadata already saved on recordings.
- No deletion behavior changes.

## Product Contracts Covered

`recordings.review-grouping`:

- The Recordings/Review module can support review views grouped by sheet, segment, or practice date.
- Quick and sheet recordings remain in one unified review system.
- Review UI must not depend directly on storage, waveform, or audio-analysis libraries.
- Existing real recording artifacts, playback, details, markers, delete, and continue-practice boundaries must remain stable.

`takes.multi-take-management`:

- Sheet recording review needs a take history per sheet or segment.
- Repeated recordings are treated as comparable takes without becoming DAW-like editing.
- Latest take is derived from recording time.
- Segment-aware takes use saved segment context, not current mutable segment definitions.

For this slice, implement only the domain/read-model basis that future UI can consume.

## Existing Repo Context

Likely existing areas, based on current filenames and small snippets:

- `src/lib/recordings-review/types.ts`
  - Defines `ReviewRecording` with `type`, `sheetId`, `createdAt`, and optional `segmentContext?: SheetRecordingSegmentContext | null`.
- `src/lib/recordings-review/repository.ts`
  - Normalizes the local recording history snapshot.
  - Keeps legacy sheet recordings without `segmentContext`.
  - Parses malformed sheet `segmentContext` to `null` rather than dropping otherwise valid recordings.
- `src/lib/recordings-review/history.ts`
  - Currently owns pure review helpers such as `sortRecordingsByNewest`, `filterRecordings`, and continue-practice hrefs.
- `src/domain/practice/types.ts`
  - Defines `SheetRecordingSegmentContext`.
- Existing tests to extend or mirror:
  - `tests/unit/recordings-review-history.test.ts`
  - `tests/unit/recordings-review-repository.test.ts`

Preferred placement is a pure helper in the recordings review area, either:

- Add focused grouping functions/types to `src/lib/recordings-review/history.ts` if the file remains readable, or
- Create `src/lib/recordings-review/take-groups.ts` and export/import it from tests and later UI.

Do not move the repository or convert the localStorage-backed review history to Dexie in this slice.

## Domain Model Expectations

The coding agent should choose names that fit local style, but the read model should express these concepts:

- A take group has a stable `groupId`.
- A take group has a `kind` or equivalent discriminator:
  - sheet segment group
  - sheet no-segment group
  - quick group
- A sheet group includes:
  - `sheetId`
  - `sheetName` snapshot where available
  - `segmentId` only for segment groups
  - `segmentName` snapshot where available
  - `recordings`
  - `takeCount`
  - `latestRecording`
  - `latestRecordedAt`
- A no-segment sheet group includes:
  - same sheet fields
  - `segmentId: null` or equivalent explicit no-segment marker
- A quick group should preserve quick recordings without pretending they belong to a sheet or segment.

Suggested group key semantics:

- Segment sheet recording: `sheet:<sheetId>:segment:<segmentId>`
- No-segment sheet recording: `sheet:<sheetId>:segment:none`
- Quick recording: `quick` or a clearly separate quick bucket

Do not expose keys that are ambiguous between literal ids and separators if a safer internal helper is cheap. If ids are concatenated into keys, keep it internal and expose structured fields on the group.

## Grouping Rules

- Only `recording.type === "sheet"` recordings with a non-empty `sheetId` can enter sheet take groups.
- `segmentContext?.segmentId` is the segment grouping id when the context exists and the id is non-empty.
- `segmentContext: null`, absent `segmentContext`, and normalized malformed contexts belong to the no-segment group for that sheet.
- Quick recordings must not be discarded. They should either:
  - appear in a distinct quick group/read-model collection, or
  - be returned unchanged beside grouped sheet takes in a wrapper result.
- Legacy sheet recordings without the `segmentContext` property must behave exactly like no-segment recordings.
- Grouping must not resolve segment names or sheet names from live repositories. Use the recording snapshot fields only.
- If recordings in the same group disagree on `sheetName` or `segmentName`, prefer the latest recording's snapshot for group display fields.
- Duplicate recording ids should not cause crashes. If the existing system permits duplicates, grouping should include both records unless an existing repository normalizer already removes them. Do not add broad deduplication unless tests prove the current contract requires it.

## Sorting And Latest-Take Rules

- Recording time source: `ReviewRecording.createdAt`.
- Recordings inside every group sort newest first by parsed `createdAt`.
- `latestRecording` is the first recording after that sort.
- Group sort is newest first by each group's `latestRecording.createdAt`.
- Use deterministic tie-breakers when two recordings or groups have the same timestamp:
  - Prefer stable string comparisons such as `id`, `sheetId`, `segmentId`, then `groupId`.
  - Tests should assert ties do not depend on original array order.
- Do not use session id, duration, bpm, or array insertion as latest-take logic.
- Invalid or unparsable `createdAt` values should not crash. Recommended behavior:
  - Treat invalid timestamps as the oldest possible recordings for sorting.
  - Keep them in their correct group if the rest of the record is otherwise valid.
  - Document this behavior in tests.

## Data Compatibility Expectations

- Old quick recordings remain valid and visible to P2-02 through the grouping service output.
- Old sheet recordings with no `segmentContext` property remain valid no-segment takes.
- Newer no-segment sheet recordings with `segmentContext: null` group with legacy absent-field recordings for the same `sheetId`.
- Malformed segment metadata that the repository normalizes to `null` groups as no-segment.
- Grouping must not require a migration or rewrite persisted localStorage.
- Grouping must not mutate `ReviewRecording` objects or write normalized values back to storage.
- Recording artifacts remain real and decodable, but this slice does not inspect or decode audio.

## Boundary Conditions And Negative Cases

Cover these explicitly in code or tests:

- Empty recordings array returns empty groups/quick collection.
- Only quick recordings returns no sheet groups and preserves quick recordings.
- One sheet recording with segment context produces one segment group and one latest take.
- Multiple recordings for same sheet and same segment group together.
- Same `segmentId` on different `sheetId`s creates separate groups.
- Same `sheetId` with different `segmentId`s creates separate groups.
- Same `sheetId` with no segment and with a segment creates separate groups.
- Legacy absent `segmentContext` and explicit `segmentContext: null` group together.
- Sheet recording with `sheetId: null` should not enter sheet groups. Prefer preserving it in an `ungrouped`/unsupported collection only if the API shape needs lossless output; otherwise document that valid sheet groups require `sheetId`.
- Invalid `createdAt` does not throw and sorts last.
- Equal timestamps sort deterministically.
- Group display names come from latest recording snapshots.
- The helper returns new arrays and does not mutate caller input.

## Expected Files And Areas To Touch

Likely touch:

- `src/lib/recordings-review/history.ts` or new `src/lib/recordings-review/take-groups.ts`
- `src/lib/recordings-review/types.ts` if shared exported types are needed
- `tests/unit/recordings-review-history.test.ts` or new `tests/unit/recordings-review-take-groups.test.ts`

Maybe touch, only if needed for clean exports:

- `src/lib/recordings-review/repository.ts` to add a read-only service method that returns grouped data from `getSnapshot().recordings`; keep it thin.
- `src/components/recordings-review/*` only if a type import break occurs, with no visible behavior change.

Avoid:

- `src/app/*` UI routes
- `src/services/recording/*` capture facade unless existing exports require a narrow type barrel
- `src/infrastructure/db/*` persistence implementation
- `src/infrastructure/audio/*`
- `src/lib/recordings-review/artifact-service.ts`
- `src/lib/recordings-review/wavesurfer-adapter.ts`

## Service Boundary

The preferred boundary is:

- Pure grouping function accepts `ReviewRecording[]`.
- Optional service/repository convenience function reads the existing snapshot and calls the pure grouping function.
- UI in P2-02 should consume the grouping result through this helper/service, not duplicate grouping logic.

Do not let the grouping helper:

- call `window.localStorage` directly
- call Dexie directly
- call segment or sheet repositories
- inspect audio artifacts
- create or update persisted metadata
- choose best/active take

## Acceptance Criteria

- Sheet recordings are grouped by `sheetId` plus optional saved `segmentContext.segmentId`.
- No-segment sheet recordings, including legacy missing-field recordings, group by `sheetId` in an explicit no-segment bucket.
- Quick recordings are preserved in the output and are not misclassified as sheet take groups.
- Recordings and groups are sorted newest first by `createdAt`; latest take is derived only from recording time.
- Invalid timestamps are deterministic and do not crash grouping.
- The helper is pure and does not mutate input recordings or persistence.
- Tests cover segment, no-segment, quick, legacy, malformed/null, and deterministic time-ordering cases.
- Existing recording review repository/history tests still pass.

## Test Coverage Plan

Unit tests:

- Add a focused suite for the pure grouping helper.
- Use in-memory `ReviewRecording` fixtures with deterministic ISO timestamps.
- Include:
  - quick-only fixture
  - sheet no-segment fixture with absent `segmentContext`
  - sheet no-segment fixture with `segmentContext: null`
  - sheet segment fixture with valid `segmentContext`
  - two sheets sharing a segment id
  - one sheet with two segment ids
  - one sheet with no-segment and segment takes
  - invalid `createdAt`
  - equal timestamp tie-breaker
  - input mutation guard

Integration-style unit tests:

- Seed `recordingHistoryRepository.saveSnapshot(...)` or `window.localStorage` with mixed legacy/current recordings.
- Read through `recordingHistoryRepository.getSnapshot().recordings`.
- Pass those recordings to the grouping helper or repository convenience method.
- Assert malformed segment contexts already normalized to `null` group as no-segment.
- Assert quick recordings survive the service boundary.

Fixtures:

- Reuse existing lightweight `ReviewRecording` object fixtures in `recordings-review-history.test.ts` where practical.
- Do not require real audio fixtures for this slice because no audio artifact decoding is touched.
- If a test includes `audioDataUrl`, keep it as the existing tiny `data:audio/wav;base64,UklGRg==` placeholder used by current unit tests; do not add media verification.

No browser E2E is required for P2-01 because there is no UI. P2-02 should own UI/browser coverage.

## Verification Commands

Use the local npm wrapper from the repo root:

```powershell
.\scripts\npm-local.ps1 run lint
.\scripts\npm-local.ps1 run typecheck
.\scripts\npm-local.ps1 run test:unit
```

For a narrower development loop, a coding agent may run:

```powershell
.\scripts\npm-local.ps1 exec vitest run tests/unit/recordings-review-history.test.ts
```

or the new take-groups test file if one is created. Final verification should include lint, typecheck, and unit tests.

## Model Tier Recommendation

- Coding agent: GPT-5.4, high effort, standard speed
- Review agent: GPT-5.4-mini, high effort, standard speed
- Verification agent: GPT-5.4-mini, high effort, standard speed

Rationale: This is non-UI logic, but it touches recording review read models and backwards-compatible metadata behavior. Tier B is safer than pure logic because future UI depends on this service boundary and old recordings must remain readable. Do not use fast tier.

## Constraints For Coding Agent

- Reuse existing `ReviewRecording`, `RecordingReviewSnapshot`, `SheetRecordingSegmentContext`, and recording review helpers.
- Reuse existing repository normalization for legacy and malformed segment contexts.
- Keep grouping logic deterministic and pure.
- Preserve quick and sheet recordings in the unified review model.
- Do not add new packages.
- Do not add a new persistence backend.
- Do not add migration code.
- Do not read or decode artifacts.
- Do not implement UI.
- Do not add best/active metadata, waveform, scoring, tags, favorites, archive, export, or cleanup behavior.
- Keep file changes scoped to recording review domain/service helpers and tests.

## Handoff Notes For P2-02 UI

P2-02 should consume the grouping output rather than re-sorting or regrouping raw recordings in React components.

The P2-01 read model should give P2-02 enough information to render:

- sheet group vs no-segment group vs quick recordings
- take count
- latest take
- latest recorded time
- sheet name snapshot from latest take
- segment name snapshot from latest take when available
- stable group id for React keys and route/query state

P2-02 still owns:

- visual layout on Recordings/Review
- responsive behavior
- preserving existing playback/details/delete/continue-practice interactions
- browser E2E coverage
- empty states and copy

P2-02 must not infer best/active take from P2-01. Latest is derived only from recording time until P2-03 adds explicit metadata.
