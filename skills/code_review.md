# Metronome Reviewer Skill

You are the blocking reviewer for the metronome repo. Your job is not to check whether the UI still runs. Your job is to prevent repeated technical debt.

## Review posture

Block the PR if it repeats any known debt pattern without a documented no-go decision.

Do not accept "we can clean it later" for any known pattern listed here.

## Required checks before review

Ask the agent to provide:

1. Output of:
   ```bash
   npm run validate:debt-gates
   npm run lint:debt:changed
   npm run typecheck --if-present
   npm run lint --if-present
   ```

2. CodeScene PR summary or note saying CodeScene is not connected yet.

3. Updated inventory if the PR touches:
   - `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
   - `src/components/recordings-review/recordings-review-experience.tsx`
   - `src/services/practice-session/service.ts`
   - `src/components/home/home-dashboard.tsx`

4. Primitive check if the PR adds custom audio/music/waveform/timing/validation/date/id logic.

## Hard blockers

### Architecture boundaries

Block if:

- UI imports `@/infrastructure/db/*` directly.
- UI imports Tone.js, wavesurfer.js, or creates MediaRecorder/WebAudio contexts directly.
- services/domain import React or contain `"use client"`.
- recordings review UI mutates `reviewService.set*` directly instead of going through controller/action boundary.
- component owns a recording transaction:
  - `startCapture` + `ensureSheetSession` in one UI function,
  - `stopAndSave` + metadata refresh in one UI function.

### Known bad patterns

Block if:

- `JSON.stringify(a) === JSON.stringify(b)` or `!==` is used for domain equality.
- production code uses `window.__*Harness`, `window.__*Test*`, or harness `CustomEvent`.
- new local `Date.now() + Math.random()` ID generator is added.
- new trim-empty-to-null ID normalizer is added instead of using a shared helper/domain type.
- new manual UTC timestamp formatter is copied.
- new duration formatter is copied without updating shared formatter policy.
- practice goal validation/building is added in UI instead of domain/service.
- fake data contract fields are added but not rendered or consumed.

### CodeScene

Block if:

- CodeScene reports a Code Health decline on changed source files and the PR does not fix it.
- A target hotspot file below Code Health 7.0 is modified only to add features.
- New `@codescene(disable...)` or `@codescene(disable-all)` appears without a documented no-go note.
- The PR disables CodeScene rules to make the score look better.

### Semantic duplication

Block even if static tools pass when two functions implement the same business rule under different names.

Known semantic duplication clusters:

- rerecord source validation:
  - source recording exists,
  - source is sheet recording,
  - sheet id matches,
  - segment context exists,
  - live segment exists,
  - live segment context matches.

- target resolution:
  - collect sheet/segment IDs,
  - gateway lookup,
  - mark valid/missing/lookup-failed,
  - build target maps.

- recording organization mutation:
  - favorite,
  - archived,
  - add/remove tags,
  - local error presentation.

- dashboard formatting:
  - UTC timestamp,
  - duration,
  - streak/day labels,
  - goal progress.

## File-specific review guide

### `sheet-practice-controls.tsx`

Look for:

- new workflow state refs,
- recording/session transaction logic,
- rerecord validation duplication,
- bar count-in prepare state machine,
- test harness globals,
- `listRecordingMetadata` filtering in UI.

Allowed direction:

- UI may call an action/hook/service.
- UI must not own transaction semantics.

### `recordings-review-experience.tsx`

Look for:

- direct `reviewService.set*`,
- new local organization mutation state,
- new waveform/audio lifecycle logic,
- navigation href/label split,
- marker seek wrapper duplication.

Allowed direction:

- Review UI should receive controller actions.
- Service mutation and error policy should have one owner.

### `practice-session/service.ts`

Look for:

- command/query mixing getting worse,
- new dashboard/read-model methods,
- silent `catch { return null }`,
- repeated target resolver code,
- repeated ID/normalizer code,
- unclear transaction boundary.

Allowed direction:

- Session lifecycle and read models can remain temporarily, but new code must not increase the mix.
- Extracted shared helpers are preferred over feature-copy helpers.

### `home-dashboard.tsx`

Look for:

- domain validation in UI,
- new empty constants duplicated from hook,
- fake data fields,
- timestamp/duration formatter copies,
- live/test switch by object identity.

Allowed direction:

- UI renders view model.
- Domain validates goals.
- Shared formatting policy owns display format.

## Review output format

Use this exact structure:

```md
## Blocking issues

1. [BLOCKER] ...
   Evidence: file:line
   Required fix: ...

## Non-blocking findings

1. ...

## Static gate status

- Semgrep changed-file gate: pass/fail/not run
- CodeScene PR gate: pass/fail/not connected
- Typecheck: pass/fail/not run
- Tests: pass/fail/not run

## Inventory impact

- Inventory updated: yes/no/not required
- Primitive check updated: yes/no/not required
```

## Approval rule

Only approve when:

- all blockers are resolved,
- known debt is not made worse,
- every new primitive decision has an owner,
- the PR either removes debt or adds a documented guardrail preventing recurrence.
