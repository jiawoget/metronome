# P4-03 Bar Count-In Domain Plan

## Slice

- Slice: `P4-03 bar-count-in-domain`
- Product feature: `controls.bar-aware-count-in`
- Product contract: `docs/v1/05b-practice-controls.md`
- Slice file: `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- Required prerequisites: verified `P4-01 segment-tempo-apply-policy`, verified `P4-02 segment-tempo-ui`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Recommended implementation tier: Tier A, pure logic/types

## Refined Scope

Create a pure domain helper that calculates a bar-aware count-in plan from an existing `MeasureGrid` and an optional selected `PracticeSegment`.

The helper should answer, without side effects:

- which measure playback/practice starts from;
- which beat positions make up the count-in;
- each count-in beat's relative offset before the practice start;
- the total count-in duration;
- the selected segment range context, when a segment is selected;
- a stable status/reason that later P4-04 scheduler wiring and P4-05 UI can consume.

The domain output must be independent from React, Zustand, Tone/WebAudio, metronome service classes, browser clocks, persisted repositories, recording/session schemas, and UI copy. P4-03 should only make the math reusable and deterministic so P4-04 can schedule it later.

## Out Of Scope

- P4-04 scheduler wiring: no metronome service changes, Tone/WebAudio changes, transport changes, scheduler traces, real timers, playback state, or timing E2E.
- P4-05 UI: no count-in controls, visible countdown state, buttons, labels, responsive layout, or browser tests.
- P4-06/P4-07 presets: no per-sheet preset domain/repository/UI, Dexie schema, migrations, save/load/rename/delete.
- Recording/session changes: no `SheetRecordingMetadata`, recording artifacts, rerecord state, session events, session repositories, or analytics changes.
- Measure grid persistence or calibration UI changes.
- Segment CRUD, segment selector, target tempo, Home, command palette, Quick Metronome UI, or Pack 6 advanced countdown work.
- New dependencies or low-level metronome scheduler implementation.

## Likely Files And Areas

Primary implementation candidates:

- `src/domain/practice/bar-count-in.ts`
  - Preferred new pure domain module for P4-03 count-in types and helper.
- `src/domain/practice/index.ts`
  - Add a barrel export for the new domain module.
- `tests/unit/bar-count-in-domain.test.ts`
  - Preferred focused unit test file for count-in math and validation behavior.

Existing domain APIs to reuse:

- `src/domain/practice/measure-grid/index.ts`
  - `MeasureGrid`, `MeasureRange`, `validateMeasureGrid`, `validateMeasureRange`, `getMeasureStartMs`, `getTimeSignatureParts`.
- `src/domain/practice/segments/index.ts`
  - `PracticeSegment`, `validatePracticeSegment`, `getPracticeSegmentGridStatus`, `getMeasureGridVersion` if current-grid status is included.
- `src/domain/practice/meter-timing.ts`
  - `getMeterBeatDurationMs` for denominator-aware beat duration.

Do not edit service, UI, repository, scheduler, recording, or session files for this slice.

## Proposed Domain Contract

The coding agent may adjust exact names to match local style, but should preserve the shape and semantics below.

```ts
type BarCountInScope = "selected-segment" | "whole-sheet";

type BarCountInStatus = "ready" | "segment-grid-stale";

type BarCountInBeat = {
  count: number;
  sourceMeasureNumber: number | null;
  isPreRoll: boolean;
  beatNumber: number;
  offsetMs: number;
  durationMs: number;
  startsAtMs: number;
};

type BarCountInReadyPlan = {
  status: "ready";
  scope: BarCountInScope;
  startMeasure: number;
  startMs: number;
  beatCount: number;
  totalDurationMs: number;
  beatDurationMs: number;
  beatsPerMeasure: number;
  timeSignature: MeasureGrid["timeSignature"];
  pickupBeats: number;
  segmentId: string | null;
  segmentName: string | null;
  segmentRange: MeasureRange | null;
  beats: BarCountInBeat[];
};

type BarCountInStalePlan = {
  status: "segment-grid-stale";
  scope: "selected-segment";
  startMeasure: number;
  startMs: number;
  beatCount: 0;
  totalDurationMs: 0;
  beatDurationMs: 0;
  beatsPerMeasure: number;
  timeSignature: MeasureGrid["timeSignature"];
  pickupBeats: number;
  segmentId: string;
  segmentName: string;
  segmentRange: MeasureRange;
  beats: [];
};

type BarCountInPlan = BarCountInReadyPlan | BarCountInStalePlan;
```

Preferred helper shape:

```ts
function getBarCountInPlan(input: {
  measureGrid: MeasureGrid;
  selectedSegment: PracticeSegment | null;
  countInMeasures?: number;
}): BarCountInPlan
```

Required semantics:

- `countInMeasures` defaults to `1`.
- P4-03 supports exactly positive integer `countInMeasures`; non-finite, fractional, zero, or negative values throw through a narrow domain validation helper. Do not silently coerce.
- Validate `measureGrid` with `validateMeasureGrid` before doing math.
- For non-null `selectedSegment`, validate with `validatePracticeSegment` before reading fields.
- Invalid `measureGrid`, invalid non-null `selectedSegment`, and invalid `countInMeasures` throw through validation. They must not be represented as `BarCountInStatus` values.
- When no segment is selected, use whole-sheet behavior: `scope: "whole-sheet"`, `startMeasure: 1`, `segment*` fields null.
- When a segment is selected, use `scope: "selected-segment"` and `startMeasure: selectedSegment.range.startMeasure`.
- Use the live/current `measureGrid` argument for count-in timing. The selected segment identifies the start measure; it must not cause P4-03 to schedule against the stale `segment.grid.measureGridSnapshot`.
- If a valid selected segment's grid association does not match the valid live `measureGrid`, return `BarCountInStalePlan`.
- `BarCountInStalePlan` is explicitly non-schedulable: `scope: "selected-segment"`, `startMeasure` from the validated segment, `startMs` from the live grid and selected segment start measure, `beatCount: 0`, `totalDurationMs: 0`, `beatDurationMs: 0`, segment context populated, and `beats: []`.
- `beatsPerMeasure` is the time-signature numerator from `getTimeSignatureParts`.
- `beatDurationMs` must come directly from `getMeterBeatDurationMs({ bpm, timeSignature })`; do not hand-write denominator math in P4-03.
- The plan uses generated beat-duration sums, not rounded measure duration. Fractional millisecond values are valid domain output, and P4-04 scheduler wiring must handle fractional offsets/durations. Do not call `getMeterMeasureDurationMs` for `totalDurationMs`, because that helper rounds.
- Example beat durations: `4/4` at 120 BPM is `500`, `3/4` at 90 BPM is about `666.666...`, `6/8` at 120 BPM is `250`, and `12/8` at 120 BPM is `250`.
- `beatCount = beatsPerMeasure * countInMeasures`.
- `totalDurationMs = beatDurationMs * beatCount`, preserving fractional values when present.
- `startMs` is `getMeasureStartMs(measureGrid, startMeasure)`.
- Each count-in beat is relative to `startMs`: the first generated beat starts at `-totalDurationMs`, the final beat starts at `-beatDurationMs`, and practice starts at offset `0`.
- `startsAtMs` should be `startMs + offsetMs`, which may be negative when measure 1 starts before enough real sheet time exists for a count-in. Negative `startsAtMs` is allowed in domain output because P4-04 owns scheduler pre-roll/fallback behavior.
- Beat labels use one stable representation: `sourceMeasureNumber: number | null`, `isPreRoll: boolean`, and `beatNumber: number`.
- For count-in before measure 1, use `sourceMeasureNumber: null` and `isPreRoll: true`; never expose measure `0` or negative measure labels.
- For a one-measure count-in to selected segment start measure 5 in 4/4, generated beats map to `sourceMeasureNumber: 4`, `isPreRoll: false`, and `beatNumber` 1 through 4.
- For `countInMeasures: 2` into selected segment start measure 5 in 4/4, generated beats map to source measure 3 beats 1-4, then source measure 4 beats 1-4.
- For `countInMeasures: 2` into whole-sheet measure 1, every beat has `sourceMeasureNumber: null` and `isPreRoll: true`, with `beatNumber` cycling 1-4 for each pre-roll bar.

## Selected Segment Vs Whole Sheet Behavior

- `selectedSegment: null` means count into the whole sheet from measure 1.
- A valid selected segment means count into `segment.range.startMeasure`, not the segment grid snapshot's measure 1.
- Segment end measure does not affect the count-in duration; only `range.startMeasure` decides where count-in resolves.
- A one-measure segment is valid and behaves the same as a multi-measure segment with the same `startMeasure`.
- If the selected segment belongs to another sheet, P4-03 has no sheet id input to compare against; this remains a P4-04/P4-05 caller responsibility. P4-03 only validates the segment object and live-grid association.

## Pickup And Measure-Grid Edge Cases

- Existing `MeasureGrid` stores `pickupBeats` but does not shift numbered measure 1; P4-03 must preserve that policy. `startMs` for measure 1 remains `measureOneOffsetMs`.
- Pickup beats should be included in the output as context, not used to move `startMeasure` or `startMs`.
- For `startMeasure: 1`, the count-in is pre-roll before the first numbered measure and may have negative `startsAtMs` if `measureOneOffsetMs < totalDurationMs`.
- For `startMeasure > 1`, count-in beat labels refer to the preceding measure(s), for example measure 4 before segment start measure 5.
- For `6/8` and `12/8`, use the existing denominator-aware beat duration. Do not reinterpret compound meter into dotted-quarter beats in P4-03 unless the product contract is updated.
- A segment whose stored grid snapshot is stale against the live grid should not be scheduled as if current. It returns `status: "segment-grid-stale"` with `beats: []`, with scheduler/UI handling deferred.

## Acceptance Criteria

- A valid 4/4 grid at 120 BPM with no selected segment returns a ready one-bar count-in into measure 1 with 4 beats, `beatDurationMs: 500`, `totalDurationMs: 2000`, `startMs` equal to `measureOneOffsetMs`, and beat offsets ending at `-500`.
- Whole-sheet count-in before measure 1 labels every beat with `sourceMeasureNumber: null` and `isPreRoll: true`, never measure 0.
- A valid selected segment starting at measure 5 returns a ready count-in into measure 5, carries `segmentId`, `segmentName`, and `segmentRange`, maps one-bar count-in labels to source measure 4 beats 1-4, and does not use the segment end measure to change duration.
- `3/4`, `6/8`, and `12/8` use `getMeterBeatDurationMs({ bpm, timeSignature })` and generate the expected number of beats per one-measure count-in.
- `countInMeasures: 2` generates two measures worth of beats, doubles total duration through generated beat-duration sums, and labels the two pre-roll bars deterministically.
- Pickup beats are preserved in output context but do not shift measure 1 timing.
- Whole-sheet count-in may produce pre-roll before measure 1; the domain helper returns deterministic offsets rather than clamping or starting playback.
- Fractional millisecond beat durations and totals are valid domain output; P4-04 scheduler wiring must consume them instead of assuming rounded measure duration.
- Invalid grids, invalid non-null segments, and invalid count-in measure values throw through validation.
- A valid selected segment with a stale/mismatched grid association returns `BarCountInStalePlan` with `status: "segment-grid-stale"`, segment context populated, `beatCount: 0`, duration fields `0`, and `beats: []`.
- The output can be consumed by P4-04 with only domain types: no UI, scheduler, Tone, WebAudio, React, Zustand, repository, or service imports are required.

## Boundary Conditions

- Minimum valid grid BPM is 30 and maximum is 300 per existing `MeasureGrid` validation; P4-03 must not introduce metronome playback clamping.
- Supported time signatures remain the existing `2/4`, `3/4`, `4/4`, `6/8`, and `12/8`.
- `pickupBeats` must remain nonnegative and smaller than the numerator through existing validation.
- `measureOneOffsetMs` must remain a nonnegative integer through existing validation.
- Measure numbers must remain integer and 1-based through existing `MeasureRange` validation.
- A selected segment whose range starts at 1 is valid; the count-in is still pre-roll.
- A stale segment grid association must not fall back to the segment snapshot silently.
- The helper must not mutate the input grid or segment.

## Test Coverage Plan

Pure unit tests are the main verification for P4-03.

Add focused tests for:

- Whole-sheet 4/4 at 120 BPM, measure 1 offset 0: 4 beats, offsets `[-2000, -1500, -1000, -500]`, startsAt values matching `startMs + offsetMs`, total `2000`.
- Whole-sheet measure 1 labels: every beat has `sourceMeasureNumber: null`, `isPreRoll: true`, and `beatNumber` 1-4.
- Selected segment in 4/4 at 120 BPM starting at measure 5: `startMs` equals existing `getMeasureStartMs(grid, 5)`, segment context is included, and one-bar count-in labels map to source measure 4 beats 1-4.
- 3/4 at 90 BPM: 3 count-in beats with `beatDurationMs` from `getMeterBeatDurationMs`, fractional duration preserved, and `totalDurationMs` equal to the generated beat-duration sum.
- 6/8 at 120 BPM and 12/8 at 120 BPM: numerator beat counts of 6 and 12 with eighth-note beat duration from the shared meter policy.
- `countInMeasures: 2` in 4/4 for a selected segment starting at measure 5: 8 beats, doubled total duration, source measure 3 beats 1-4 then source measure 4 beats 1-4.
- `countInMeasures: 2` in 4/4 for whole-sheet measure 1: 8 beats, all `sourceMeasureNumber: null`, all `isPreRoll: true`, and `beatNumber` cycles 1-4 twice.
- Pickup grid, for example 4/4 with `pickupBeats: 2` and `measureOneOffsetMs: 750`: `startMs` remains `750` for measure 1 and pickup is reported but not used to shift the plan.
- Non-zero `measureOneOffsetMs`: generated absolute `startsAtMs` accounts for the offset.
- One-measure selected segment and multi-measure selected segment with the same start measure produce the same count-in duration and start.
- Stale selected segment association against the live grid produces the exact `BarCountInStalePlan` shape: `status: "segment-grid-stale"`, `scope: "selected-segment"`, segment context populated, `beatCount: 0`, `totalDurationMs: 0`, `beatDurationMs: 0`, and `beats: []`.
- Invalid grid cases: BPM out of range, unsupported time signature, invalid pickup beats, missing `measureOneOffsetMs`.
- Invalid segment cases: malformed range, empty id/name, invalid grid association.
- Invalid `countInMeasures`: 0, negative, fractional, `NaN`, infinite.
- Input immutability for grid and segment.

No integration tests, browser E2E, reload/persistence tests, audio fixtures, PDF fixtures, Dexie tests, or scheduler timing traces are required for P4-03. Those belong to P4-04/P4-05 or later slices.

## Negative Cases

- `measureGrid` is invalid.
- `selectedSegment` is malformed.
- Selected segment range is invalid or starts before measure 1.
- Selected segment grid association is stale/mismatched against the live grid.
- `countInMeasures` is missing but defaultable, versus explicitly invalid values that must throw.
- Pre-roll before measure 1 produces negative absolute starts; this is valid domain output, not an error.

## Deferred Work

| Deferred work | Owning slice |
|---|---|
| Scheduler wiring, Tone/WebAudio integration, playback countdown state, and timing trace evidence | P4-04 |
| Count-in controls, visible countdown UI, responsive browser E2E, and user-facing copy | P4-05 |
| Per-sheet preset persistence, schema/repository work, and preset UI | P4-06/P4-07 |
| Shared advanced countdown infrastructure, if still needed after P4-03 through P4-07 | P4-08 |
| Quick Metronome advanced countdown, mute training, auto-increase, and other Pack 6 training behavior | Pack 6 |

## Verification Evidence

Planning verification for this docs-only slice:

```powershell
Get-Content -Raw docs/v1/status.json | ConvertFrom-Json | Out-Null
git diff --check
```

Expected coding verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/bar-count-in-domain.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/bar-count-in.ts src/domain/practice/index.ts tests/unit/bar-count-in-domain.test.ts
git diff --check
```

Verification should explicitly report that no browser E2E, real Chrome, scheduler timing trace, Tone/WebAudio evidence, Dexie migration, reload/persistence, recording artifact, or session repository evidence was required for P4-03 because the slice is pure domain math.

## Reuse And Boundary Constraints

- Reuse `MeasureGrid` validation and meter timing helpers; do not duplicate time-signature parsing, denominator math, or measure duration calculations.
- Use `getMeterBeatDurationMs({ bpm, timeSignature })` for beat duration and preserve fractional millisecond values in generated sums.
- Reuse `PracticeSegment` validation and grid association/version helpers.
- Keep count-in output expressed in domain primitives and plain serializable data.
- Do not import from `src/components`, `src/services`, `src/hooks`, `src/stores`, `src/infrastructure`, `src/lib/quick-metronome`, Tone, WebAudio, or browser APIs.
- Do not add new dependencies.
- Do not change existing segment tempo policy or UI behavior.
- Do not alter persisted schemas, repositories, services, scheduler contracts, or test fixtures outside the new focused unit coverage.

## Status And Review Gates

- External web ChatGPT delta review returned `PASS`; implementation has started and P4-03 is now `review_in_progress`.
- `pack-4-practice-controls-upgrade` remains `planning_in_progress`.
- `P4-01 segment-tempo-apply-policy` and `P4-02 segment-tempo-ui` remain `verified`.
- `P4-04` and later Pack 4 slices remain `not_started`.

## Handoff Notes

The coding agent should implement only the pure domain helper and tests. If implementation appears to require scheduler wiring, playback countdown state, UI controls, persistence, presets, recording/session schema changes, Tone/WebAudio changes, or E2E, stop and request a planning update because that work belongs to P4-04/P4-05 or later slices.

Recommended coding prompt paths after external review PASS:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P4-03-bar-count-in-domain.md`
- `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- `docs/v1/05b-practice-controls.md`
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- `src/domain/practice/measure-grid/index.ts`
- `src/domain/practice/segments/index.ts`
- `src/domain/practice/meter-timing.ts`
- `src/domain/practice/index.ts`
- `tests/unit/measure-grid.test.ts`
- `tests/unit/practice-segment-domain.test.ts`
