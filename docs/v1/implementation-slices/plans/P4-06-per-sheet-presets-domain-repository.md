# P4-06 Per-Sheet Presets Domain Repository Plan

## Slice

- Slice: `P4-06 per-sheet-presets-domain-repository`
- Product feature: `controls.per-sheet-metronome-presets`
- Product contract: `docs/v1/05b-practice-controls.md` and `docs/v1/remaining-feature-contracts.md#controlsper-sheet-metronome-presets`
- Slice file: `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- Prerequisites: verified `P4-01` through `P4-05`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Recommended implementation tier: Tier B, local persistence/service boundary

## Refined Scope

Add the non-UI foundation for local Sheet Practice metronome presets.

This slice should create a domain model, validation rules, repository interface, browser persistence implementation, and service boundary for presets scoped by sheet and optionally by practice segment. It should define how a saved preset represents the current Sheet Practice control state so P4-07 can add save/load/rename/delete UI without inventing storage or validation behavior.

The expected outcome is:

- a validated `SheetMetronomePreset` domain shape;
- reusable helpers for creating a preset settings snapshot from current Sheet Practice `MetronomeSettings`;
- a service with list/get/save-or-create/rename/delete methods and an explicit load-result shape;
- a browser repository using local IndexedDB/Dexie, isolated from Quick Metronome and practice sessions;
- tests proving CRUD, scoping, validation, malformed-row filtering, and reload persistence.

P4-06 may expose a pure "convert preset to control settings patch" helper for P4-07, but it must not wire that helper into `SheetPracticeControls` or mutate live UI state.

## Out Of Scope

- No visible preset UI in Sheet Practice: no save/load/rename/delete buttons, menus, lists, dialogs, toasts, keyboard flows, or responsive layout changes. P4-07 owns that.
- No auto-apply/default mutation. Opening a sheet, selecting a segment, creating a segment, saving a grid, or starting playback must not automatically apply a preset.
- No Sheet Practice control wiring beyond type-only exports or compile reachability if absolutely needed.
- No Quick Metronome templates, Quick Metronome persistence, Pack 6 training behavior, routines, or warmups.
- No cloud sync, account sync, import/export, backup/restore, conflict merge, or cross-device behavior.
- No broad countdown, scheduler, Tone/WebAudio, bar-count-in, or metronome transport rewrite.
- No recording artifact, recording metadata, practice-session schema, or session event changes unless the coding agent proves a tiny type reference is unavoidable. The default plan requires none.
- No migration of existing sheet defaults into presets and no mutation of sheet library BPM/time-signature defaults.

## Likely Files And Areas

Preferred production files:

- `src/domain/practice/sheet-metronome-presets.ts`
  - Domain schema, parse/validate helpers, settings snapshot validation, scope/id/name normalizers, scope helpers, and preset-to-settings conversion.
- `src/domain/practice/index.ts`
  - Barrel export for the new pure domain module.
- `src/services/sheet-metronome-presets/types.ts`
  - Repository and service interfaces.
- `src/services/sheet-metronome-presets/service.ts`
  - CRUD orchestration, validation, duplicate-name guard, and load result helper.
- `src/services/sheet-metronome-presets/index.ts`
  - Barrel export.
- `src/infrastructure/db/browser-sheet-metronome-preset-service.ts`
  - Dexie database/repository and exported browser service.
- `src/infrastructure/storage/storage-contracts.ts`
  - Add a dedicated local DB name, for example `SHEET_METRONOME_PRESET_DB_NAME = "metronome-practice-v1-sheet-metronome-presets"`.

Preferred tests:

- `tests/unit/sheet-metronome-preset-domain.test.ts`
- `tests/unit/sheet-metronome-preset-service.test.ts`
- `tests/unit/sheet-metronome-preset-repository.test.ts`

Reference existing patterns:

- `src/services/practice-segments/*`
- `src/infrastructure/db/browser-practice-segment-service.ts`
- `tests/unit/practice-segment-repository.test.ts`
- `src/components/sheet-practice/controls/practice-control-state.ts`
- `src/lib/quick-metronome/types.ts`
- `src/lib/quick-metronome/control.ts`

Files that should remain unchanged by default:

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/controls/metronome-settings-panel.tsx`
- `src/components/sheet-practice/controls/bar-count-in-control.tsx`
- `src/lib/quick-metronome/use-metronome-transport.ts`
- `src/lib/quick-metronome/bar-count-in-scheduler.ts`
- recording/session repositories and schemas

## Domain Schema

Use a first-version shape that stores only the Sheet Practice metronome control state needed to restore user-selected controls later:

```ts
type SheetMetronomePresetScope = {
  sheetId: string;
  segmentId: string | null;
};

type SheetMetronomePresetSettings = {
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  accent: AccentMode;
  countdownBeats: number;
  barCountIn: {
    enabled: boolean;
    bars: 1 | 2;
  };
};

type SheetMetronomePreset = {
  id: string;
  sheetId: string;
  segmentId: string | null;
  name: string;
  settings: SheetMetronomePresetSettings;
  createdAt: string;
  updatedAt: string;
};
```

Notes:

- `settings` intentionally represents Sheet Practice control state, not Quick Metronome templates.
- `bpm`, `timeSignature`, `subdivision`, `accent`, and `countdownBeats` should reuse existing Quick Metronome control validators/parsers or constants where possible. Do not duplicate BPM min/max/default values.
- `barCountIn.enabled` and `barCountIn.bars` capture the P4-05 UI state, including off-by-default state, without starting count-in or changing scheduler behavior.
- A preset may be sheet-wide with `segmentId: null` or segment-specific with a non-empty normalized `segmentId`.
- Presets do not store measure-grid snapshots, segment ranges, current count-in plans, session IDs, recording IDs, audio refs, or sheet defaults.
- `createdAt` and `updatedAt` are ISO strings generated by the service/repository boundary. Domain validation should require parseable non-empty strings if provided.

Recommended helper functions:

```ts
validateSheetMetronomePreset(value: SheetMetronomePreset): SheetMetronomePreset
parseSheetMetronomePreset(value: unknown): SheetMetronomePreset | null
validateSheetMetronomePresetSettings(value: SheetMetronomePresetSettings): SheetMetronomePresetSettings
parseSheetMetronomePresetSettings(value: unknown): SheetMetronomePresetSettings | null
createSheetMetronomePresetSettingsSnapshot(input: {
  settings: MetronomeSettings;
  barCountIn: { enabled: boolean; bars: 1 | 2 };
}): SheetMetronomePresetSettings
createMetronomeControlStateFromPreset(
  presetSettings: SheetMetronomePresetSettings
): {
  settings: MetronomeSettings;
  barCountIn: { enabled: boolean; bars: 1 | 2 };
}
```

The conversion helper should return a plain `MetronomeSettings` object plus a separate bar-count-in state object. Do not return callbacks, services, or UI actions.

This helper must be pure. It must not read or write stores, services, browser globals, timers, transport state, selected segments, measure grids, or React state. P4-07 may call it to derive data for UI state updates, but P4-06 must not apply that state.

## Persistence Shape

Use a dedicated Dexie database rather than attaching presets to practice sessions, sheet library, recordings, or practice segments:

```ts
type PersistedSheetMetronomePresetRecord = {
  sheetId: string;
  presetId: string;
  segmentId: string | null;
  preset: SheetMetronomePreset;
  updatedAt: string;
};
```

Recommended Dexie schema:

```ts
presets: "...implementation detail..."
```

The exact Dexie schema is an implementation detail. The repository may use a compound key, an internal primary key, or equivalent IndexedDB shape, but it must expose the repository contract without making index order or key encoding part of the domain/service API. Required lookup capabilities are:

- `listPresets(sheetId)` by sheet;
- `getPreset(sheetId, presetId)` by structured sheet+preset identity;
- idempotent `deletePreset(sheetId, presetId)`;
- segment filtering in service/domain without delimiter-encoded keys;
- updated timestamp reads for service-level sorting.

Do not create a delimiter-composed identity key such as `${sheetId}::${segmentId}::${presetId}`. Existing practice segment work already moved toward structured keys to avoid delimiter collisions.

The repository MUST NOT guarantee ordering. Any business ordering, such as updated-descending then name-ascending, belongs in the service. Dexie indexes may exist for efficient reads, but they must not become sorting semantics.

No legacy migration is required for P4-06 because this is a new DB. Tests should still prove malformed persisted rows are filtered out safely.

## Service And CRUD Semantics

Repository interface:

```ts
type SheetMetronomePresetRepository = {
  listPresets: (sheetId: string) => Promise<SheetMetronomePreset[]>;
  getPreset: (sheetId: string, presetId: string) => Promise<SheetMetronomePreset | null>;
  savePreset: (preset: SheetMetronomePreset) => Promise<void>;
  deletePreset: (sheetId: string, presetId: string) => Promise<void>;
};
```

Repository responsibilities:

- persist and retrieve validated records;
- scope reads/deletes by sheet id and preset id;
- treat `(sheetId, presetId)` as the immutable row identity after insertion;
- never generate ids, mutate ids, enforce duplicate-name business rules, sort business results, apply presets, or know UI state.

Service interface:

```ts
type CreateSheetMetronomePresetInput = {
  id?: string;
  sheetId: string;
  segmentId?: string | null;
  name: string;
  settings: SheetMetronomePresetSettings;
};

type RenameSheetMetronomePresetInput = {
  sheetId: string;
  presetId: string;
  name: string;
};

type SheetMetronomePresetLoadResult =
  | { status: "loaded"; preset: SheetMetronomePreset; settings: SheetMetronomePresetSettings }
  | { status: "missing" };
```

Required methods:

- `listPresets(sheetId, options?: { segmentId?: string | null })`
  - returns only presets for the normalized sheet;
  - if `segmentId` is omitted, returns all sheet presets;
  - if `segmentId: null`, returns sheet-wide presets only;
  - if `segmentId` is a string, returns segment-specific presets for that segment only;
  - sort by `updatedAt` descending, then `name` ascending for stable UI-ready output.
- `getPreset(sheetId, presetId)`
  - scopes by both sheet and preset id;
  - returns `null` for missing or malformed rows.
- `savePreset(input)`
  - creates or replaces the full preset payload for the same sheet and preset id;
  - trims and validates ids/name/settings;
  - generates `id` only in the service if omitted, using `crypto.randomUUID()` or an existing local id helper if one exists;
  - sets `createdAt` and `updatedAt` for new presets;
  - preserves `createdAt` and updates `updatedAt` when replacing an existing preset if the service can read the current row first;
  - rejects duplicate preset names within the same sheet and same segment scope using trimmed case-insensitive comparison.
- `renamePreset(input)`
  - loads the existing preset by sheet/id;
  - returns or throws a clear missing-preset error if absent;
  - updates name and `updatedAt` only;
  - uses the same duplicate-name rule in the same sheet/segment scope.
- `deletePreset(sheetId, presetId)`
  - idempotent;
  - deletes only the matching sheet + preset row.
- `loadPreset(sheetId, presetId)`
  - returns a typed load result without applying UI state;
  - must not call `updateSettings`, start/stop metronome, select a segment, or change sheet defaults.

Validation ownership:

- Domain owns primitive parsing, normalization, settings validation, persisted-row parsing, and pure conversion helpers.
- Service owns orchestration, timestamp/id generation, duplicate-name checks, missing-preset errors, and load-result shaping.
- Repository owns persistence only and should assume service/domain already validated writes. It may still defensively parse rows on reads.
- Do not add a separate `src/services/sheet-metronome-presets/validation.ts` unless implementation proves domain imports would create a cycle; prefer keeping validation in the domain module.

Recommended error messages:

- `sheetId is required.`
- `presetId is required.`
- `Preset name is required.`
- `Preset name already exists.`
- `Preset was not found.`

Exact text can follow local Zod/service style, but tests should pin user-relevant service errors.

## Sheet And Optional Segment Scoping Rules

- `sheetId` is required for every preset and every repository/service call.
- `segmentId` is optional and normalized to `null` when omitted, blank, or explicitly `null`.
- Sheet-wide presets (`segmentId: null`) are visible for the sheet but must not be silently treated as a segment preset.
- Segment-specific presets are visible only when listing that segment or all presets for the sheet.
- Duplicate names are rejected only within the same normalized `(sheetId, segmentId)` scope:
  - duplicate names for the same sheet-wide scope are rejected;
  - duplicate names for the same sheet and same segment are rejected;
  - the same name may exist for a different sheet;
  - the same name may exist for a different segment on the same sheet;
  - the same name may exist once sheet-wide and once segment-specific.
- Repository rows whose embedded preset `sheetId`, `id`, or `segmentId` do not match the row identifiers must be treated as malformed and ignored on reads.
- P4-06 should not validate that a segment currently exists. Segment lifecycle/UI can decide later how to present orphaned segment-scoped presets. The persisted scope is still useful local data and should not be deleted automatically.

## Interaction With Existing Pack 4 State

P4-01 tempo:

- Presets save the current effective BPM from `MetronomeSettings`, after existing BPM clamping/normalization.
- Presets do not store the segment target BPM policy result, `targetBpm`, or a "follow segment tempo" mode.
- If a user applied a segment target tempo before saving in P4-07, the saved preset captures the resulting current BPM as an explicit number.

P4-05 bar count-in:

- Presets save the current bar count-in UI state as data: `{ enabled, bars }`.
- Loading a preset in P4-07 may set the bar count-in toggle and bars, but P4-06 must only provide the data/helper.
- Saving/loading a preset must not prepare a bar-count-in plan, read the measure grid, start timers, or call scheduler helpers.

Legacy countdown, BPM, and time signature:

- Presets save `countdownBeats` exactly as part of `MetronomeSettings`.
- If `barCountIn.enabled` is true, the legacy countdown value is still preserved in the preset and can be restored later; P4-05 UI already decides that bar count-in replaces beat countdown while enabled.
- Presets save only supported Quick Metronome `TimeSignature` values because current Sheet Practice controls normalize unsupported sheet defaults through `createSheetPracticeControlInitialState`.
- Presets save `subdivision` and `accent` because they are current Sheet Practice metronome settings.
- Presets must not mutate sheet library defaults (`defaultBpm`, `defaultTimeSignature`) and must not bypass `createSheetPracticeControlInitialState` for initial sheet loading.

## Boundary Conditions And Failure Semantics

- Empty or whitespace `sheetId`, `presetId`, or name should throw validation errors before repository calls where possible.
- Invalid `segmentId` should normalize to `null` only when blank/omitted/null; non-string malformed values in persisted rows should be rejected as malformed.
- Invalid BPM, unsupported time signature, invalid subdivision/accent, invalid countdown, or invalid bar-count-in bars should fail validation and preserve prior saved data.
- Duplicate names should reject without partially writing or renaming.
- Repository storage failures should propagate to the caller and should not be swallowed as missing presets.
- Malformed persisted rows should be safe absence on `getPreset` and filtered from `listPresets`.
- Malformed persisted rows should also be trackable during development, for example by a small dev-only warning or optional malformed-row callback in repository tests. Do not add user-facing telemetry, analytics, or production reporting in P4-06.
- Delete is idempotent for missing presets.
- Reload persistence must survive `reset...DatabaseConnectionForTests()`-style Dexie connection resets.
- Concurrent duplicate-name saves may be covered only if the implementation adds a narrow transaction/guard. Do not require a concurrency test for the base P4-06 contract.
- Sorting must be deterministic so P4-07 UI can render stable lists without adding its own persistence-order assumptions.
- No browser globals should be required by pure domain/service unit tests. Browser/Dexie tests may use the existing Vitest IndexedDB environment.

## Acceptance Criteria

- A validated local preset domain model exists for Sheet Practice metronome control state.
- Preset settings can be created from current control state and converted back to loadable settings without side effects.
- Browser persistence stores presets locally in a dedicated DB and survives reload/connection reset.
- CRUD operations are scoped by sheet and optional segment.
- Duplicate preset names are rejected within the same sheet/segment scope and allowed across different scopes.
- Malformed persisted rows are ignored safely.
- Loading a preset returns data only and does not apply UI state, start playback, mutate defaults, or touch sessions/recordings.
- No visible preset UI is added.
- Existing P4-01 through P4-05 behavior remains untouched.

## Test Coverage Plan

Domain unit tests in `tests/unit/sheet-metronome-preset-domain.test.ts`:

- validates a complete preset with sheet-wide scope;
- validates a complete preset with segment scope;
- trims ids/name and normalizes blank optional `segmentId` to `null`;
- rejects blank ids/name, invalid dates, invalid settings, unsupported time signatures, invalid subdivisions/accents, invalid countdown, and invalid bar-count-in bars;
- creates a settings snapshot from `MetronomeSettings` plus bar-count-in state;
- converts preset settings back to `MetronomeSettings` plus bar-count-in state without mutating input;
- rejects malformed persisted-looking data through `parseSheetMetronomePreset`.

Service unit tests in `tests/unit/sheet-metronome-preset-service.test.ts`:

- returns empty list/null for a valid sheet with no presets;
- saves and returns a validated preset with generated id/timestamps when id is omitted;
- replaces an existing preset for the same sheet/id while preserving `createdAt` and updating `updatedAt`;
- renames an existing preset and rejects rename of a missing preset;
- filters list by all presets, sheet-wide only, and a specific segment;
- sorts by `updatedAt` descending then name;
- rejects duplicate names within the same `(sheetId, segmentId)` scope;
- allows duplicate names across sheets, across segments, and between sheet-wide and segment-specific scopes;
- rejects invalid sheet/preset ids before touching repository;
- propagates repository storage failures;
- `loadPreset` returns `{ status: "loaded" }` with settings for an existing preset and `{ status: "missing" }` for absent presets without applying state.
- includes one focused deterministic ordering test at the service boundary; repository tests must not assert ordering.

Repository integration tests in `tests/unit/sheet-metronome-preset-repository.test.ts`:

- persists one valid preset by normalized sheet id;
- isolates two sheets with overlapping preset ids;
- isolates delimiter-collision ids using structured identities rather than delimiter-composed keys;
- lists all sheet presets and segment-filtered presets correctly;
- updates/replaces the same sheet+preset row;
- deletes only the requested row and remains idempotent for missing rows;
- rejects or ignores invalid persisted record shapes without corrupting prior valid rows;
- filters malformed persisted rows from list/get, including embedded id/sheet/segment mismatch, and verifies the chosen dev-only malformed-row tracking path if implemented;
- survives Dexie connection reset/reload;
- does not assert repository result ordering;
- tests concurrent duplicate-name serialization only if the coding agent adds a narrow transaction/guard.

No-UI guarantee tests:

- Do not add a browser E2E for P4-06.
- Add a focused static/unit assertion only if the coding agent touches UI files, for example proving `SheetPracticeControls` still has no preset controls. Preferred path is stronger: do not touch UI files at all and verify via `git diff --name-only`.
- Existing `tests/unit/sheet-practice-controls.test.tsx` does not need new preset tests unless an unavoidable type import touches controls. If touched, run the existing file to prove no UI regression.

Reload/persistence:

- Covered by the Dexie repository connection reset test.
- Do not use localStorage for preset persistence.

Negative validation:

- Include both domain-level invalid settings and repository malformed-row filtering.
- Include duplicate-name and invalid-id service failures.

## Verification Commands For Coding Agent

Focused unit/repository verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-metronome-preset-domain.test.ts tests/unit/sheet-metronome-preset-service.test.ts tests/unit/sheet-metronome-preset-repository.test.ts
```

If implementation touches shared control-state helpers or existing Sheet Practice control files, also run:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-controls.test.tsx
```

Type/lint/diff checks:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/sheet-metronome-presets.ts src/domain/practice/index.ts src/services/sheet-metronome-presets/types.ts src/services/sheet-metronome-presets/service.ts src/services/sheet-metronome-presets/index.ts src/infrastructure/db/browser-sheet-metronome-preset-service.ts src/infrastructure/storage/storage-contracts.ts tests/unit/sheet-metronome-preset-domain.test.ts tests/unit/sheet-metronome-preset-service.test.ts tests/unit/sheet-metronome-preset-repository.test.ts
git diff --check
```

If exact filenames differ, run the same command shape against the actual changed source/test files and report the difference.

No E2E is required for P4-06 because no UI exists yet. P4-07 owns Playwright CRUD/load/reload and timing-visible load behavior.

## Planning Validation

For this planning-only slice:

```powershell
Get-Content -Raw docs/v1/status.json | ConvertFrom-Json | Out-Null
git diff --check
```

## Status And Review Gates

- External web ChatGPT plan review must return `PASS` before P4-06 can move to `ready_for_coding`.
- This planning artifact alone does not authorize coding.
- After writing this plan, `docs/v1/status.json` may move only `P4-06 per-sheet-presets-domain-repository` from `not_started` to `planning_in_progress`.
- Pack 4 remains `planning_in_progress`.
- `P4-01 segment-tempo-apply-policy`, `P4-02 segment-tempo-ui`, `P4-03 bar-count-in-domain`, `P4-04 bar-count-in-scheduler`, and `P4-05 bar-count-in-ui` remain `verified`.
- `P4-07 per-sheet-presets-ui` and `P4-08 advanced-countdown-shared-infrastructure` remain `not_started`.
- Do not mark P4-06 `ready_for_coding`, `coding_in_progress`, `review_in_progress`, `verification_in_progress`, or `verified` until the external plan review gate has passed and the scheduler explicitly advances it.

## Handoff Notes For Future Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P4-06-per-sheet-presets-domain-repository.md`
- `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- `docs/v1/05b-practice-controls.md`
- `docs/v1/remaining-feature-contracts.md` section `controls.per-sheet-metronome-presets`
- `src/lib/quick-metronome/types.ts`
- `src/lib/quick-metronome/control.ts`
- `src/components/sheet-practice/controls/practice-control-state.ts`
- `src/services/practice-segments/*`
- `src/infrastructure/db/browser-practice-segment-service.ts`
- `tests/unit/practice-segment-repository.test.ts`

Implement the domain/service/repository foundation only. Do not open a broad UI refactor. Stop and request a planning update if the work appears to require visible preset controls, auto-apply behavior, scheduler changes, session/recording schema changes, Quick Metronome templates, or cloud/import/export semantics.
