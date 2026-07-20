# P4-01 Segment Tempo Apply Policy Plan

## Slice

- Slice: `P4-01 segment-tempo-apply-policy`
- Product feature: `controls.segment-tempo`
- Product contract: `docs/v1/05b-practice-controls.md`
- Slice file: `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Recommended implementation tier: Tier A, pure logic/types

## Refined Scope

Define the pure domain policy for how a selected practice segment's `targetBpm` applies to the current Sheet Practice metronome BPM.

This slice should produce deterministic, reusable logic that answers:

- whether a selected segment has an applicable target BPM;
- whether applying the segment tempo would change the current practice BPM;
- the exact next BPM to use after applying the segment tempo;
- a stable result reason for later UI callers to render or branch on.

The expected policy is:

- If no segment is selected, keep the current BPM and return a `no-segment` result.
- If the selected segment has `targetBpm: null`, keep the current BPM and return a `no-target-bpm` result.
- If the selected segment has a target BPM, validate it with existing segment validation rules and normalize it into the metronome-supported BPM range with existing metronome BPM clamping.
- If the normalized target BPM equals the normalized current BPM, keep the normalized current BPM and return an `already-applied` result.
- If the normalized target BPM differs from the normalized current BPM, return an `applied` result with the next BPM.

The result should preserve enough context for later P4-02 UI wiring, such as `segmentId`, `segmentName`, original `targetBpm`, `previousBpm`, `nextBpm`, and a status/reason enum. The policy must be pure and safe to call before a run starts; it must not start, stop, reschedule, or update the metronome by itself.

## Out Of Scope

- P4-02 UI: no buttons, compact controls, visual badges, copy changes, responsive layout, or browser E2E.
- P4-03 and later count-in work: no bar-aware countdown, measure-aware scheduling, count-in UI, or scheduler evidence.
- P4-06/P4-07 presets: no per-sheet preset storage, save/load/rename/delete, Dexie schema changes, or migrations.
- Recording model changes: do not change `SheetRecordingMetadata`, recording artifacts, rerecord workflow state, or persisted recording context.
- Practice session persistence changes: do not change session repository schema or stored session shape.
- Broad Home, command palette, Continue Practice, or analytics behavior.
- Metronome scheduler/timing changes in `BrowserMetronomeService` or Tone adapter code.
- Changing the allowed segment `targetBpm` validation range unless the product contract is updated.

## Likely Files And Areas

Primary implementation candidates:

- `src/domain/practice/segments/index.ts`
  - Existing `PracticeSegment` and `targetBpm` validation live here.
  - A pure helper can live here if it is framed as segment-domain policy.
- `src/domain/practice/segment-tempo-apply-policy.ts`
  - Acceptable alternative if keeping the policy in a focused pure domain file is cleaner than extending the existing segment module.
- `src/domain/practice/types.ts`
  - Add exported result/input types only if keeping them out of the segment module improves reuse.
- `src/domain/practice/index.ts`
  - Existing barrel already exports `segments`; only touch for type-only or barrel export reachability if a new pure domain module is created, and explain why.

Service files are out of implementation scope:

- `src/services/practice-segments/types.ts`
- `src/services/practice-segments/service.ts`

P4-01 must not add methods to `PracticeSegmentService`, repository-backed service wrappers, or repository interfaces. The default implementation must stay in a domain/segment module or a pure domain file. At most, the coding agent may add a type-only/barrel export needed for import reachability, with a short explanation in the handoff.

Test candidates:

- `tests/unit/practice-segment-domain.test.ts`
  - Preferred home for pure policy tests if added to `src/domain/practice/segments/index.ts`.
- A new focused unit test such as `tests/unit/segment-tempo-apply-policy.test.ts`
  - Acceptable if the helper becomes a separate domain file.

Boundary reference only, not expected to edit in this slice:

- `src/components/sheet-practice/controls/practice-control-state.ts`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/lib/quick-metronome/control.ts`
- `src/lib/quick-metronome/types.ts`
- `src/services/metronome/*`

## Proposed Domain Contract

The coding agent may adjust exact names to match local style, but should preserve this behavior:

```ts
type SegmentTempoApplyStatus =
  | "applied"
  | "already-applied"
  | "no-segment"
  | "no-target-bpm";

type SegmentTempoApplyResult = {
  status: SegmentTempoApplyStatus;
  segmentId: string | null;
  segmentName: string | null;
  targetBpm: number | null;
  previousBpm: number;
  nextBpm: number;
};
```

Preferred helper shape:

```ts
function getSegmentTempoApplyPolicy(input: {
  currentBpm: number;
  segment: PracticeSegment | null;
}): SegmentTempoApplyResult
```

Policy details:

- `SegmentTempoApplyStatus` remains exactly `"applied" | "already-applied" | "no-segment" | "no-target-bpm"`. P4-01 must not add an `"invalid"` status or typed invalid result.
- For non-null segment input, call `validatePracticeSegment(segment)` before trusting segment fields.
- Invalid non-null segment input must follow the existing Zod/domain validation failure style by throwing. Do not catch and convert invalid segments into status results.
- Use the existing metronome BPM normalization from `src/lib/quick-metronome/control.ts` (`clampBpm`) for both `currentBpm` and the target BPM used as the resulting metronome BPM.
- Do not duplicate `MIN_BPM`, `MAX_BPM`, or default BPM constants.
- Do not mutate the input segment.
- Do not call repository, Dexie, React state, metronome service, session service, or recording service from the pure helper.

## Acceptance Criteria

- A selected segment with a valid `targetBpm` returns `status: "applied"` and `nextBpm` equal to the metronome-clamped target BPM when that BPM differs from the current BPM.
- A selected segment with normalized target BPM equal to normalized current BPM returns `status: "already-applied"` and keeps `nextBpm` equal to `previousBpm`.
- A selected segment with `targetBpm: null` returns `status: "no-target-bpm"` and keeps the current BPM.
- A null selected segment returns `status: "no-segment"` and keeps the current BPM.
- Current BPM and target BPM normalization reuse existing `clampBpm` behavior; comparisons are normalized-to-normalized and no new BPM range constants are invented.
- Invalid non-null segment input throws through existing validation and never returns an invalid status object.
- Result context includes stable segment identity and name when a valid segment is present, so P4-02 can render without re-deriving policy details.
- No product UI, persistence schema, scheduler, recording artifact, or session repository behavior changes in this slice.

## Boundary Conditions

- `currentBpm` below or above metronome range should normalize through `clampBpm` before comparison and result output.
- Segment `targetBpm` may be valid for segment storage up to 300, but the metronome currently supports up to 240; applying a `targetBpm` above 240 should produce `nextBpm: 240` rather than changing metronome constants.
- Segment `targetBpm` below the segment validation minimum should be rejected by existing segment validation.
- Fractional, `NaN`, infinite, string, or otherwise malformed target BPM values should follow existing `validatePracticeSegment` failure behavior.
- A target BPM that clamps to the same value as the normalized current BPM should be `already-applied`, not `applied`.
- The helper must not infer bar or measure timing from the segment range; target tempo is independent from count-in and scheduling.
- The helper must work without a saved/current measure grid lookup because segment validity is based on the existing segment object and its stored grid association.

## Test Coverage Plan

Unit tests:

- Add pure domain tests for `applied`, `already-applied`, `no-target-bpm`, and `no-segment`.
- Test target BPM above metronome maximum, for example segment `targetBpm: 300`, produces `nextBpm: 240` using existing clamping.
- Test current BPM normalization, for example current `12` normalizes before comparison/output.
- Test normalized-to-normalized comparison is mandatory: for example `currentBpm: 240, targetBpm: 300` returns `already-applied` with `previousBpm: 240` and `nextBpm: 240`.
- Test an out-of-range current BPM that clamps to the same normalized value as the target: for example `currentBpm: 300, targetBpm: 300` returns `already-applied` with both previous and next BPM set to `240`.
- Keep a distinct applied case where target clamping changes the BPM, for example `currentBpm: 120, targetBpm: 300` returns `applied` with `previousBpm: 120` and `nextBpm: 240`.
- Test invalid segment target BPM, malformed range, or malformed grid association by casting an invalid object as `PracticeSegment` and expecting `validatePracticeSegment`/the helper to throw.
- Test the input segment is not mutated.
- Test result context includes `segmentId`, `segmentName`, `targetBpm`, `previousBpm`, and `nextBpm`.

Integration tests:

- Not required for P4-01.
- Do not add repository-backed service wrapper tests because P4-01 must not add service methods.

Browser E2E:

- Not required. P4-02 owns user-facing controls and E2E.

Reload/persistence:

- Not required. P4-01 must not persist data or change Dexie/local storage/session repository schemas.

Fixtures:

- Reuse existing in-test segment builders or the `PracticeSegment` fixture style from `tests/unit/practice-segment-domain.test.ts`.
- No new audio, PDF, IndexedDB, or browser fixtures.

Negative cases:

- Null segment.
- Segment with null target BPM.
- Invalid `PracticeSegment` cast in tests to verify validation throw behavior.
- Target BPM valid for segment storage but above metronome playback range.

## Deferred Work

| Deferred work | Owning slice |
|---|---|
| Applying the policy result to Sheet Practice controls, `useMetronomeSettingsState`, or a user-triggered apply action | P4-02 |
| Bar-aware count-in domain calculations | P4-03 |
| Bar-aware count-in scheduler wiring and timing evidence | P4-04 |
| Count-in controls and visible countdown state in UI | P4-05 |
| Per-sheet preset storage, Dexie schema/migration work, and preset persistence rules | P4-06 |
| Preset save/load/rename/delete UI | P4-07 |
| Shared advanced countdown infrastructure | P4-08 |

## Status And Review Gates

- External plan review must be `PASS` before implementation starts.
- The initial external plan verdict was `PASS_WITH_CHANGES`; the required deltas were applied and the delta review returned `PASS`, so P4-01 may be treated as implementation-ready.
- After that `PASS` verdict, `docs/v1/status.json` may move `pack-4-practice-controls-upgrade` to `planning_in_progress` and `P4-01 segment-tempo-apply-policy` to `ready_for_coding`.
- `P4-02` and later Pack 4 slices must remain `not_started` after P4-01 planning.
- Pack 4 must not be marked `coding_in_progress`, `review_in_progress`, `verification_in_progress`, or `verified` as part of P4-01 planning.
- Do not start implementation from any future plan revision that has not also passed the external plan review gate.

## Verification Evidence

Coding verification should run the narrowest relevant commands first:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-segment-domain.test.ts
```

If a new test file is created, run that exact file instead or alongside the existing domain test file.

Then run targeted type/lint checks for changed files:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- <changed source and test files>
git diff --check
```

Verification should explicitly report that no browser E2E, timing trace, Dexie migration, recording artifact, or session persistence evidence was required for P4-01 because the slice is pure policy/domain work.

## Reuse And Boundary Constraints

- Reuse `PracticeSegment`, `validatePracticeSegment`, and existing segment validation helpers.
- Reuse `clampBpm` from `src/lib/quick-metronome/control.ts`; do not duplicate BPM min/max/default constants.
- Keep the policy free of React, Zustand, Dexie, browser APIs, Tone.js, MediaRecorder, and metronome service side effects.
- Keep Sheet Practice UI files unchanged unless the coding agent finds an unavoidable type-export issue; if touched, explain why and do not add visible UI.
- Keep `src/services/practice-segments/service.ts`, repository interfaces, and repository-backed service methods unchanged.
- Do not alter `MetronomeSettings`, `BrowserMetronomeService`, scheduler behavior, countdown behavior, or `METRONOME_TRACE_EVENT`.
- Do not add new dependencies.

## Handoff Notes

The next coding agent should implement only the pure policy and tests. P4-02 will decide when and how users apply the result to `useMetronomeSettingsState`; P4-01 should only make that decision safe and deterministic.

Recommended coding prompt paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P4-01-segment-tempo-apply-policy.md`
- `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- `docs/v1/05b-practice-controls.md`
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- `src/domain/practice/segments/index.ts`
- `src/lib/quick-metronome/control.ts`
- `tests/unit/practice-segment-domain.test.ts`

The coding agent should stop and ask for a planning update if applying the policy appears to require UI controls, scheduler changes, persisted settings, or recording/session schema changes.
