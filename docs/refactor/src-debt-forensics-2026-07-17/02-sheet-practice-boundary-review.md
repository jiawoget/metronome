# Sheet Practice candidate boundary review

Date: 2026-07-17

Verdict: `PLAN_READY` for one bounded R01 candidate; implementation plan not yet written

## Question

Should the two CodeScene-recommended Sheet Practice files be one multi-file refactor cluster?

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`

## Evidence

### CodeScene web baseline

| File | Code Health | Commits / 1 year | Friction | LOC |
| --- | ---: | ---: | ---: | ---: |
| `sheet-practice-controls.tsx` | 6.51 | 32 | 36% | 1,271 |
| `practice-segment-selector-panel.tsx` | 6.69 | 8 | 8% | 929 |

### Local CodeScene MCP review

The local MCP analyzer reports a separate baseline from the web job. These scores are not compared numerically across analyzers; the MCP results are used for smell locations and will be the before/after control signal during implementation.

`sheet-practice-controls.tsx` — local score `6.22`:

- `startSheetRecording`: cyclomatic complexity 19;
- `validateRecordAgainSource`: cyclomatic complexity 16;
- `hydratePracticeAgainSource`: cyclomatic complexity 13;
- component top-level context: cyclomatic complexity 13 and 158 LOC;
- additional complexity in recording stop, segment-context resolution, and test-harness handling.

`practice-segment-selector-panel.tsx` — local score `6.31`:

- component top-level context: cyclomatic complexity 49 and 204 LOC;
- `saveEditor`: cyclomatic complexity 20, nesting depth 3, and two conditional bumps;
- `validateSegmentDraft`: cyclomatic complexity 16;
- `deleteSegment`: cyclomatic complexity 11.

### Dependency and history boundary

- `SheetPracticeControls` renders `PracticeSegmentSelectorPanel` and communicates through props plus `onSelectedSegmentChange`.
- The selector does not import or call `SheetPracticeControls`.
- The controls unit tests can and do mock the selector component, while the selector has its own focused unit suite.
- Full Git history contains 32 controls commits, 8 selector commits, and 7 shared commits. The high overlap proves workflow adjacency, but not a shared unhealthy construct.
- The controls smells are concentrated in recording/rerecord lifecycle orchestration. The selector smells are concentrated in segment loading, validation, editor mutations, and stale-sheet protection.

## Conclusion

Do not combine the two recommended files into one R01.

They belong to the same product workflow but expose two independent debt roots. Combining them would create a broad feature-area refactor with two different behavioral risk sets and two different CodeScene improvement signals.

### Proposed R01 candidate

Debt root: Record Again source-integrity rules are duplicated between Practice Again hydration and pre-start validation inside the `SheetPracticeControls` React component. The first plan should consolidate those pure inspection rules without moving service I/O or workflow side effects.

Primary production target:

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`

The implementation plan authorizes one small sibling helper only for the shared, side-effect-free inspection rules. Multi-file scope is allowed because the new file is part of the same bounded extraction; no adjacent existing file is approved merely because it shares the directory.

### Explicit R01 exclusions

- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
- segment editor, selection, and CRUD behavior;
- metronome settings and preset behavior;
- measure-grid calibration behavior;
- viewer behavior;
- test-suite cleanup unrelated to the production extraction.
- recording start/stop transaction restructuring beyond replacing the duplicated validation call;

The following existing production boundaries are reuse requirements, not default modification targets:

- `SheetRecordingService` remains the capture and persistence boundary;
- `PracticeSessionService` remains the session/event boundary;
- `useSheetPracticeRecordingWorkflowStore` remains the synchronous workflow-state boundary;
- `createSheetRecordingSegmentContext` remains the domain conversion;
- injected service props in `controls/types.ts` remain the test and runtime seam.

`src/lib/sheet-practice/recording-service.ts`, the workflow store, and `controls/types.ts` remain unchanged. The current evidence supports a pure sibling helper, not a service, store, hook, controller, or domain rewrite.

### Later independent candidate

`practice-segment-selector-panel.tsx` should receive its own boundary review and plan. Its likely debt root is the co-location of loading, stale-response protection, selection synchronization, editor validation, save/delete orchestration, and rendering. It must not be changed opportunistically by R01.

## Behavior proof for the future R01 plan

The plan should preserve the existing controls tests that cover:

- normal recording start/stop and save;
- Record Again source hydration and validation;
- rapid double-start prevention;
- permission, session, selected-segment, and save failures;
- workflow-store transitions and recovery;
- recording with and without metronome playback.

Tests may be adjusted for the production extraction, but test debt reduction is out of scope for this stage.

## Stop conditions

Return `PLAN_BLOCKED` instead of widening R01 if planning shows that:

- the extraction requires selector/editor behavior changes;
- the recording service or workflow store needs a new business path rather than a moved orchestration path;
- behavior cannot be preserved through the current injected services and tests; or
- the proposed sibling module becomes a second general-purpose recording architecture.
