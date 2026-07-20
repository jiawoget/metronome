# P3-01 Session Event Model Plan

## Slice

- Slice id: `P3-01 session-event-model`
- Pack: `pack-3-sessions-continue-practice`
- Current scheduler status: `planning_in_progress`
- Product features:
  - `sessions.event-timeline`
  - `practice-session.event-timeline`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Coding/review/verification tier: Tier A - Pure Logic / Types

## External Plan Review Gate

- Web ChatGPT metronome project review: `PASS_WITH_CHANGES`.
- Web ChatGPT metronome project delta review: `PASS`.
- Review effort: Extra High.
- Required changes applied in this plan revision:
  - Added a kind/payload/context-field matrix.
  - Removed `note_added` from the P3-01 owned event union and deferred it.
  - Tightened `source`, `schemaVersion`, unknown-field, and passthrough rules.
  - Added field-matrix and non-behavior tests.
  - Added a deferred work register.
  - Tightened `src/services/practice-session/` touch rules to export-only bridge work.
- Remaining required changes after delta review: none.

## Implementation Evidence

- Implementation agent: fresh coding agent, extra-high effort.
- Changed implementation files:
  - `src/domain/practice/session-events.ts`
  - `src/domain/practice/index.ts`
  - `tests/unit/practice-session-events.test.ts`
- Review agent result: PASS after a narrow fix pass.
- Verification agent result: PASS.
- Scheduler verification after fix pass:
  - `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-events.test.ts` -> PASS, 1 file / 7 tests.
  - `& .\scripts\npm-local.ps1 --% run typecheck` -> PASS.
  - `& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/session-events.ts src/domain/practice/index.ts tests/unit/practice-session-events.test.ts` -> PASS.
  - `git diff --check` -> PASS, with CRLF warnings only for existing Windows line-ending behavior.

## Refined Scope

Define the local TypeScript domain model and runtime validation for practice session timeline events. This slice creates a deterministic, local-first event record contract that later slices can use for event capture, duration calculation, history grouping, Home activity, and continue-practice recommendations.

The implementation should cover:

- A stable session event record shape for local use.
- Runtime validation for persisted or service-boundary event data.
- Type-safe event kinds for the first v1 event timeline surface.
- Minimal normalization helpers only where needed to keep validation deterministic.
- Unit-test fixtures/builders for valid and invalid event records.

The model must support both quick and sheet practice sessions without requiring a recording. It must preserve the v0 rule that practice sessions are practice context, not a transport coupling layer.

## Out Of Scope

- Capturing events from metronome, recording, reference playback, sheet practice, or UI interactions.
- Writing a session event repository or changing IndexedDB/Dexie tables.
- Migrating existing practice session records.
- Computing practice duration, streaks, goal progress, recent activity, or analytics.
- Grouping sessions by date, sheet, segment, or recording.
- Creating Home, Practice Session, Sheet Practice, or timeline UI.
- Adding segment session metadata beyond optional forward-compatible fields needed by the event record shape.
- Coupling recording lifecycle to metronome/reference/playback lifecycle.
- Cross-device sync, merge policy, login, cloud backup, scoring, automatic mistake detection, automatic PDF recognition, or automatic score following.

## Likely Files And Areas

The coding agent must inspect existing local files before choosing exact names, but should keep edits in the Pack 3 ownership areas:

- `src/domain/practice/`
  - Add or extend a session event domain module, such as `session-events.ts`.
  - Export event types, event-kind constants, Zod schemas, parse helpers, and narrow validation results.
- `src/services/practice-session/`
  - Touch only if the existing service boundary already centralizes practice-session schemas and needs a type export bridge. Do not add capture or persistence behavior here in this slice.
- `tests/unit/`
  - Add focused unit tests for event validation and type-level behavior.
- `src/test/fixtures/` or `tests/fixtures/`
  - Add small deterministic fixtures only if an existing project fixture pattern already exists.

Do not edit package files, app routes, UI components, repositories, database schema, or Playwright specs for this slice unless the existing project layout makes a tiny export update unavoidable.

## Event Record Contract

The exact names should match existing project conventions. The planned contract must include these concepts:

- `id`: local event id, required string, non-empty, whitespace-only rejected.
- `sessionId`: required string linking the event to a practice session, non-empty, whitespace-only rejected.
- `occurredAt`: required deterministic timestamp, preferably the existing project timestamp type or ISO string parser.
- `kind`: required event kind from the owned P3-01 union below.
- `sheetId`: optional string for sheet practice context only; never globally required.
- `segmentId`: optional string for later segment-aware slices; validates only as an id here.
- `recordingId`: allowed only for recording event kinds and only if the event already knows the local recording id. The schema must not assume an artifact body or saved artifact exists.
- `referenceId`: allowed only for reference event kinds. The schema must not expose Bilibili, local-audio, offset, waveform, or playback-source details in event payloads.
- `payload`: event-kind-specific strict object. Use `{}` for empty payloads unless an existing local schema pattern requires a named empty-payload type.
- `schemaVersion`: literal `1`. This is only the event-record schema version; it does not add Dexie schema, migration, repository, or persistence behavior.

Do not add a generic `source` discriminator in P3-01 unless the current codebase already has a same-meaning practice-session context type. If quick vs sheet context must be represented, reuse that existing mode/context type. Do not introduce `source: "recording" | "metronome" | "reference"` because `kind` already owns transport semantics. If no existing practice-session context type is available, leave `source` out of P3-01 and rely on `sessionId`, optional `sheetId`, and optional `segmentId`.

Owned P3-01 event kinds:

- `session_started`
- `session_resumed`
- `session_paused`
- `session_ended`
- `metronome_started`
- `metronome_stopped`
- `recording_started`
- `recording_stopped`
- `reference_started`
- `reference_stopped`

Deferred event kinds:

- `note_added`: deferred to a future notes/annotations slice. Do not include it in the exported P3-01 event-kind union.
- Error marker events: not part of session events; they remain recording-scoped under the recording review/error marker contracts.

If existing v0 naming uses different verbs, prefer existing names over these proposed names while preserving the same behavior boundary.

### Kind, Payload, And Context Field Matrix

The coding agent must implement the event contract as a discriminated schema or equivalent strict union. It must not infer allowed fields from prose.

| Event kind group | Payload contract | Allowed context fields | Forbidden context fields and behavior |
| --- | --- | --- | --- |
| `session_started`, `session_resumed`, `session_paused`, `session_ended` | Empty object unless an existing practice-session context type requires a narrow reused field. | `sheetId` and `segmentId` are optional. | `recordingId` and `referenceId` are forbidden. No sequence, order, or duration calculation. |
| `metronome_started`, `metronome_stopped` | Empty object by default. Tempo, time signature, subdivision, or scheduler details are allowed only if existing domain types already expose them and can be reused directly. | Optional `sheetId` and `segmentId`. | `recordingId` and `referenceId` are forbidden. Do not invent a tempo/timing contract in this slice. |
| `recording_started`, `recording_stopped` | Empty object by default. No artifact payload. | `recordingId` is allowed only if already known; it is not globally required. Optional `sheetId` and `segmentId`. | `referenceId` is forbidden. Do not assume a local artifact body exists. Do not capture/save recording artifacts. |
| `reference_started`, `reference_stopped` | Empty object by default. | `referenceId` is allowed only if already known. Optional `sheetId` and `segmentId`. | `recordingId` is forbidden. Do not put Bilibili, local audio, offsets, waveform, AB-loop, or playback-source details in payload. |

Unknown top-level fields must be rejected unless the coding agent finds and cites a concrete existing same-boundary schema convention requiring passthrough. Without that evidence, use Zod `.strict()` or equivalent strict behavior.

## Validation Rules

The implementation should use Zod at the data boundary. Validation must be strict enough that later persistence and analytics code can trust accepted records.

Required validation behavior:

- Reject missing or empty `id`.
- Reject missing or empty `sessionId`.
- Reject unknown `kind`.
- Reject invalid timestamps.
- Reject event-kind payloads that contain impossible values, such as negative duration, invalid tempo, or malformed local ids.
- Accept sessions without `recordingId`.
- Accept quick-session events without `sheetId`.
- Accept sheet-session events with `sheetId`.
- Accept optional `segmentId` without requiring segment-session behavior to exist yet.
- Reject recording-scoped fields on event kinds that should not carry recording context.
- Reject reference-scoped fields on event kinds that should not carry reference context.
- Reject unknown top-level fields by default. Do not silently drop or pass through fields unless a concrete existing same-boundary schema convention requires it and the implementation cites that file.
- Reject whitespace-only `id` and `sessionId`; do not trim them into valid ids unless an existing id convention already requires trimming.
- Parse individual records only. Do not validate event sequence, capture order, elapsed duration, session activity, transport state, or prior/future events.

Timestamp handling must be deterministic and local-first:

- Persist and validate an unambiguous timestamp format, preferably ISO string or existing project timestamp type.
- Do not derive browser-local day in this slice.
- Do not compute elapsed practice duration in this slice.
- Do not use wall-clock time inside validation tests except through explicit fixture values.

## Acceptance Criteria

1. A session event domain module exports TypeScript types and Zod schemas for the local event record.
2. The event model can represent quick and sheet practice session timeline events without requiring recordings.
3. The model preserves independence between metronome, recording, and reference events; no event kind requires another transport to be active.
4. Validation rejects missing ids, missing session ids, unknown event kinds, invalid timestamps, and invalid event-specific payloads.
5. Validation accepts valid event sequences as individual records without attempting to compute duration or enforce capture order.
6. Optional `sheetId`, `segmentId`, `recordingId`, and `referenceId` fields are validated by the kind matrix without implementing segment sessions, recording capture, recording artifacts, or reference playback.
7. Unit tests cover valid quick, sheet, recording-linked, and reference-linked event records plus representative invalid records.
8. Unit tests prove unknown top-level fields are rejected, contextual fields are allowed/forbidden by event kind, and validation does not compute sequence/order/duration.
9. No UI, persistence schema, capture service, duration rule, grouping selector, analytics, or package-file changes are included.

## Boundary Conditions

- Practice can be counted without recording, so the model must not make `recordingId` globally required.
- Recording and transport controls remain independent, so metronome and recording event kinds must not be mutually required by validation.
- Error markers remain recording-scoped, not session-scoped. Do not add marker events here unless a future Pack 7 plan explicitly approves it.
- Viewing a sheet alone does not count as practice. This slice defines possible timeline records but must not introduce a sheet-view event that later code could treat as practice activity.
- Continue Practice remains session-based. The model may expose session ids but must not implement continue target selection.
- Cross-device continuity and merge behavior are v2. Do not add conflict-resolution fields unless they already exist in the local model contract.
- Analytics must not imply precision that event data cannot support. Do not add scoring, detected mistakes, or inferred quality metrics.
- The validation layer should be deterministic for tests and should not depend on browser APIs, timers, IndexedDB, Tone.js, MediaRecorder, wavesurfer, PDF rendering, or React.

## Deferred Work Register

P3-01 must leave the following work to later slices instead of implementing it implicitly:

- Event capture from quick practice controls.
- Event capture from sheet practice controls.
- Session event repository, IndexedDB schema, and migration.
- Duration calculation from event records.
- Session history grouping by date, sheet, segment, and recording.
- Home recent activity and practice statistics.
- Continue Practice target selection and stale target rejection.
- Recording error markers and review annotations.
- ReferenceTrack and PracticeSegment event integration.
- Cross-device merge/sync, conflict resolution, login, or cloud backup behavior.

## Test Coverage Plan

Unit tests:

- Validates a minimal `session_started` event.
- Validates quick-session metronome events without `sheetId` or `recordingId`.
- Validates sheet-session events with `sheetId`.
- Validates optional `segmentId` on an otherwise valid sheet event.
- Validates recording-linked events without requiring metronome fields.
- Validates reference-linked events without requiring recording fields.
- Rejects missing `id`, missing `sessionId`, unknown `kind`, invalid timestamp, empty ids, and malformed payloads.
- Rejects inappropriate contextual fields when event-kind-specific schemas disallow them.
- Rejects unknown top-level fields.
- Rejects whitespace-only `id` and `sessionId` unless an existing id convention explicitly trims them.
- Tests every owned event kind group against the allowed/forbidden context field matrix.
- Proves `recordingId` is not globally required.
- Proves `sheetId` is not globally required.
- Proves reference events do not expose Bilibili, local-audio, offset, waveform, or playback-source payload details.
- Proves validation does not require event order or compute duration; for example, a single `session_ended` record can parse without a prior `session_started` record.
- Verifies parse helpers return the existing project result/error style if such a style exists.

Integration tests:

- Not required unless the existing practice-session service already exposes schemas through a shared boundary. If touched, add a narrow integration test proving the service accepts only validated domain records.

Browser E2E:

- Not required for this pure model slice. Event capture and visible timeline behavior belong to later slices.

Reload/persistence:

- No IndexedDB writes in this slice. Persistence verification is limited to serializable fixture round-trips through the Zod schema.

Fixtures:

- Add small hand-written event fixtures for quick, sheet, recording-linked, reference-linked, and invalid cases if existing fixture conventions support them.

Negative cases:

- Unknown event kind.
- Invalid timestamp.
- Empty ids.
- Payload with negative numeric values.
- Recording context attached to a non-recording event.
- Reference context attached to a non-reference event.
- Unknown top-level field.
- Event order or duration assumptions encoded in validation.
- Sheet-only viewing event treated as practice activity; this should be impossible because no such event kind is introduced.

## Verification Evidence Required

The coding agent should report:

- Changed file list, confirming no product UI, package, repository, database schema, or git state changes.
- `git diff --name-only` must not include `src/infrastructure/`, repositories, app routes, UI components, stores, hooks, `package.json`, or package lockfiles.
- The exact unit/integration command run.
- Passing output for the focused session event model tests.
- Passing typecheck command if available in existing project scripts.
- Passing lint or equivalent static check if available and fast enough for the focused change.
- Brief note explaining why Tier A remains sufficient, or why the implementation had to escalate.

The verification agent should independently confirm:

- The diff is limited to domain model/validation and focused tests/fixtures.
- No capture, persistence, duration, grouping, analytics, Home UI, Practice Session UI, or package changes slipped in.
- The test evidence covers both valid and invalid records.
- The implementation preserves v0 boundaries called out in `docs/v1/05e-session-integration.md` and `docs/v1/08-practice-session.md`.

## Model Tier

Use Tier A for coding, review, and verification:

- Coding agent: `gpt-5.4`, extra-high effort, standard speed
- Review agent: `gpt-5.4-mini`, extra-high effort, standard speed
- Verification agent: `gpt-5.4-mini`, extra-high effort, standard speed

Reason: this slice should be pure TypeScript domain modeling and Zod validation. It must not touch UI, persistence, media, waveform, timing, migration, cleanup, or destructive data operations. Tier A model family remains correct, with the user's P3 pipeline override that ChatGPT/Codex efforts default to extra high.

Escalate to Tier B only if the coding agent discovers that event validation cannot be introduced without changing an existing persisted practice-session schema or repository. If that happens, stop and return to planning rather than expanding the slice silently.

## Reuse Constraints

- Use Zod for runtime validation; do not hand-roll validation logic.
- Use existing local id, timestamp, parse-result, and schema-version conventions if present.
- Use existing practice-session domain types instead of duplicating session concepts.
- Do not create shared id, timestamp, parse-result, or validation framework helpers unless the codebase already has the same local pattern. If no reusable helper exists, keep the minimal helper inside the session event module.
- Keep event-kind and payload definitions in a single domain boundary so later capture and duration slices can reuse them.
- Do not add a generic event bus, analytics engine, repository abstraction, database adapter, transport coordinator, or UI state store.
- Do not introduce new npm dependencies.
- Do not change package files.
- Do not move existing files or perform broad shared refactors.

## Handoff Notes

- Start by reading this plan, `docs/v1/START-HERE.md`, `docs/v1/implementation-slices/03-sessions-continue-practice.md`, `docs/v1/05e-session-integration.md`, `docs/v1/08-practice-session.md`, `docs/v0/project-structure.md`, and `docs/v0/tech-stack-decisions.md`.
- Inspect existing `src/domain/practice/`, `src/services/practice-session/`, and related tests before editing so naming and validation style match the codebase.
- Implement exactly this model/validation slice. Do not reinterpret Pack 3 as permission to build event capture or timeline UI.
- Prefer `src/domain/practice/session-events.ts` and a focused unit test such as `tests/unit/session-events.test.ts` if that matches existing layout. Do not create broad `timeline/`, `analytics/`, or `events/` directories for this slice.
- If `src/services/practice-session/` is touched, it may only be an export-only bridge for an existing schema boundary. Do not add parser orchestration, capture helpers, session lifecycle helpers, repository calls, or duration helpers there.
- If service changes exceed an export bridge, stop and return to planning.
- If existing practice-session persisted records already have a conflicting event/timeline shape, stop and ask for a planning update before changing persistence contracts.
- Leave `docs/v1/status.json` unchanged; the scheduler will run the ChatGPT plan-review gate before coding.
