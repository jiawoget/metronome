# Architecture Research: v1.1 R01 Evidence-First Code Slimming

**Domain:** Local-first TypeScript/React/Next.js maintenance refactor
**Baseline:** current `main` at `6c0089b9cac378214ff4f4ecdbe2f3f5b42c81a4`
**Researched:** 2026-07-21
**Confidence:** HIGH for repository structure and candidate boundaries; MEDIUM for external API conclusions

## Research Boundary and Method

This research asks where current production code can be replaced by an existing implementation without adding a wrapper, compatibility facade, parallel model, or second source of truth. It does not select the final R01 target; it supplies a small architecture-vetted candidate set for cross-research synthesis.

- Lumen semantic search was invoked first, but its configured Ollama endpoint at `127.0.0.1:11434` was unavailable. Discovery then continued from exact current-main source, import, call-site, and test evidence. No alternate worktree was inspected.
- Installed versions were verified from `package-lock.json`: Zod `4.4.3`, Dexie `4.4.4`, `@tonaljs/time-signature` `4.9.0`, and `@tonaljs/duration-value` `4.9.0`.
- The relevant current-main test seam is green: 9 test files and 175 tests passed, including architecture boundaries, Home/session comparison, practice-session validation/events, sheet metronome presets, and recordings-review formatting.
- A live CodeScene file review was unavailable because the environment denied transmission of repository source. Code Health effects below are therefore directional estimates only. The implementation phase must obtain a local pre-change baseline and compare it with the exact candidate diff.

## Current Authoritative Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│ React/Next UI                                                   │
│ home-dashboard · recordings-review · sheet-practice             │
└───────────────────────────────┬─────────────────────────────────┘
                                │ calls/subscribes
┌───────────────────────────────▼─────────────────────────────────┐
│ Hooks and application services                                  │
│ use-practice-session-dashboard · practice-session service       │
└───────────────────────────────┬─────────────────────────────────┘
                                │ invokes pure policy/validation
┌───────────────────────────────▼─────────────────────────────────┐
│ Domain                                                           │
│ practice rules · session comparison · Zod validation · music    │
└───────────────────────────────┬─────────────────────────────────┘
                                │ repository/service contracts
┌───────────────────────────────▼─────────────────────────────────┐
│ Infrastructure                                                   │
│ Dexie repositories · browser audio/PDF/file adapters            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│ Browser-local authorities                                        │
│ IndexedDB · Blob/Object URL · MediaRecorder · Web Audio          │
└─────────────────────────────────────────────────────────────────┘
```

The executable boundary in `tests/unit/architecture-boundaries.test.ts` is authoritative: UI may depend on services and domain, but not concrete infrastructure; browser capture, audio decode, Tone, PDF worker, and persistence concerns remain in their existing adapters. A slimming candidate must shorten a path inside those directions, not bypass them.

### Component Responsibilities

| Component | Current owner | Architectural rule for substitution |
|---|---|---|
| UI presentation | `src/components/**`, with Home view-model mapping in `src/hooks/use-practice-session-dashboard.ts` | Reuse pure presentation logic already reachable through an existing dependency; do not make UI import infrastructure. |
| Practice policy and validation | `src/domain/practice/**` | One rule/schema implementation may be shared inside the domain; repository and service contracts must remain unchanged. |
| Application orchestration | `src/services/**` | Keep sequencing, subscriptions, error policy, and dependency injection here. Do not replace it with direct adapter calls. |
| Browser persistence | `src/infrastructure/db/**`, `src/infrastructure/files/**`, and `src/infrastructure/reference/**` | Dexie optimizations are valid only when they do not require schema migration or change corrupt-row filtering and ordering semantics. |
| Third-party music primitives | `src/domain/music/**` | Keep Tonal return shapes and broader parsing behind the existing domain owner; product-supported meter policy remains repository-owned. |
| Media/platform APIs | `src/infrastructure/audio/**` and related recording adapters | Platform capability checks are not substitutes for product policy, persisted MIME interpretation, or domain validation. |

## Substitution Architecture Rules

1. **Retain an existing owner.** Promote an implementation already in the correct dependency direction; do not create `common`, `shared`, `compat`, or another indirection module.
2. **Switch all equivalent callers in one bounded flow.** Partial migration would leave two authorities and fail the milestone goal.
3. **Delete the old implementations in the same change.** A new exported symbol is acceptable only when it exposes the retained implementation and the duplicate bodies disappear.
4. **Preserve output and failure text exactly.** UTC labels, invalid-date labels, validation acceptance, storage filtering, and exception behavior are observable contracts.
5. **Prove net-negative production LOC.** Count `src/**` additions and deletions separately from tests. Test additions do not excuse production growth.
6. **Keep rollback local.** A viable candidate should revert through a small set of files without data migration, storage version changes, or persisted-shape conversion.

## Candidate A: Consolidate Home Presentation Formatters

**Architecture verdict:** genuinely bounded and highest architectural leverage; final selection still requires cross-research confirmation.

### Existing implementations and duplicate path

Two usable implementations already exist:

- `src/domain/practice/session-comparison.ts::formatTimestamp` owns the exact `YYYY-MM-DD HH:mm UTC` assembly already used by `createCandidateLabel` and `timestampValue`.
- `src/hooks/use-practice-session-dashboard.ts::formatSessionComparisonDuration` owns the exact `0 min` / `<1 min` / `N min` / `N hr M min` behavior duplicated by Home analytics.

Current duplicates are:

- `src/hooks/use-practice-session-dashboard.ts::formatSessionComparisonTimestamp`
- `src/components/home/home-dashboard.tsx::formatActivityTime`
- `src/components/home/home-dashboard.tsx::formatAnalyticsTimestamp`
- `src/components/home/home-dashboard.tsx::formatAnalyticsDuration`

There are seven production timestamp-format call sites and three production minute/hour-duration call sites across these three files. The timestamp bodies are structurally identical except that analytics uses `"Unknown update time"` while the other paths use `"Unknown time"`.

### Current and replacement flow

```text
Current
Dexie repositories
  → browserPracticeSessionService
  → domain session comparison / analytics / recent activity
  → hook or Home component
  → four separate UTC formatter bodies + two separate duration bodies
  → rendered Home text

Replacement
Dexie repositories
  → browserPracticeSessionService
  → domain session comparison / analytics / recent activity
  → retained domain UTC formatter + retained Home hook duration formatter
  → rendered Home text (unchanged)
```

`getSessionComparison` in `src/services/practice-session/service.ts` remains the orchestration seam: it reads session and recording repositories, resolves targets, and calls domain `getSessionComparison`. `readHomeSessionComparison` in the hook remains the UI adapter. Only pure final-string assembly is consolidated.

### Exact integration shape

| Change kind | File/symbol | Required action |
|---|---|---|
| Modify | `src/domain/practice/session-comparison.ts::formatTimestamp` | Export the existing body under a precise name such as `formatUtcMinuteTimestamp`; accept an optional unknown-label argument so analytics retains `"Unknown update time"`. Keep `createCandidateLabel` and `timestampValue` on this implementation. |
| Modify | `src/hooks/use-practice-session-dashboard.ts::formatSessionComparisonDuration` | Export the existing implementation for the already-dependent Home component. |
| Delete symbol | `src/hooks/use-practice-session-dashboard.ts::formatSessionComparisonTimestamp` | Replace its two callers with the retained domain formatter, then delete the body. |
| Delete symbols | `src/components/home/home-dashboard.tsx::formatActivityTime`, `formatAnalyticsTimestamp`, `formatAnalyticsDuration` | Replace their five callers with the retained domain/hook implementations, passing `"Unknown update time"` only for analytics. |
| Retain | `getSessionComparison`, `readHomeSessionComparison`, `createHomeSessionComparisonData`, `RecentActivityPanel`, `PracticeAnalyticsPanel` | No ownership, data shape, subscription, or orchestration change. |
| New files | None | A new utility module is vetoed. |
| Deleted files | None | Deletion is at symbol/body level. |

### Boundary, test, and rollback assessment

- **Dependency direction:** unchanged. Home already imports the dashboard hook and the practice-domain barrel; the hook already depends on practice-domain types. No UI-to-infrastructure edge is introduced.
- **Plausible production delta:** approximately 64–69 fewer production lines after imports and the unknown-label parameter. Most deletion lands in `home-dashboard.tsx` (currently 1,674 lines) and the 656-line dashboard hook.
- **Test seam:** `tests/unit/session-comparison.test.ts` pins domain UTC labels and invalid timestamps; `tests/unit/home-dashboard.test.tsx` pins analytics, recent activity, continue-practice, and comparison labels including `"Unknown time"`, `<1 min`, and hour/minute cases. Add a direct invalid-analytics assertion if it is not already explicit.
- **Rollback surface:** three production files and two focused test files; no persisted data, service contract, or adapter changes.
- **Likely Code Health effect:** positive. It removes repeated branching and date-part assembly from two large UI hotspots without moving those branches into a new file. Verify that the promoted domain function itself does not gain condition complexity beyond the one fallback parameter.

### Safe build order

1. Add direct characterization for both unknown labels and duration boundary values.
2. Promote the existing domain timestamp implementation and existing hook duration implementation; do not copy either body.
3. Switch all equivalent Home/hook callers.
4. Delete all four duplicate bodies in the same diff.
5. Run the two focused test files, `architecture-boundaries.test.ts`, full repository gates, production-only LOC accounting, and before/after Code Health.

## Candidate B: Consolidate Strict ISO Date Schemas

**Architecture verdict:** genuinely bounded, lower UI blast radius, and a strong fallback if cross-research evidence rejects Candidate A.

### Existing implementation and duplicate path

`src/domain/practice/validation.ts::isoDateSchema` is the broad practice aggregate validator. It combines installed Zod's `z.iso.datetime({ offset: true })` with a `Date` round trip to require a real calendar date and canonical `toISOString()` representation.

The same policy body is duplicated in:

- `src/domain/practice/session-events.ts::isoDateSchema`
- `src/domain/practice/sheet-metronome-presets.ts::isoDateSchema`

Across the three modules, the schema governs nine fields: practice session `startedAt`, `endedAt`, and `updatedAt`; sheet recording `createdAt`; goal `createdAt` and `completedAt`; event `occurredAt`; and preset `createdAt` and `updatedAt`.

Official Zod documentation states that `z.iso.datetime` is regex-based and is not as strict as a full date/time library. Therefore the correct substitution is to reuse the existing refined schema, not delete the refinement in favor of raw `z.iso.datetime`.

### Data and control flow

```text
Session/preset UI action
  → practice-session or sheet-metronome-preset service
  → domain validate* function
  → Dexie repository write

Dexie repository read
  → domain parse* function
  → invalid local row rejected/filtered by existing repository policy
  → service result
  → UI

Replacement seam: all three domain aggregates reference one retained strict ISO schema.
```

For events, `src/services/practice-session/service.ts::recordEvent` continues to construct an event with `now().toISOString()` and call `validatePracticeSessionEvent`. For presets, the preset service and `browserSheetMetronomePresetRepository` continue to validate before writes and parse on reads. Session and goal repositories retain their current parse-versus-throw behavior.

### Exact integration shape

| Change kind | File/symbol | Required action |
|---|---|---|
| Modify | `src/domain/practice/validation.ts::isoDateSchema` | Export the existing implementation as a precisely named domain primitive such as `strictIsoDateSchema`; keep all existing aggregate field references on it. |
| Delete symbol | `src/domain/practice/session-events.ts::isoDateSchema` | Import the retained schema by direct module path and use it for `occurredAt`. |
| Delete symbol | `src/domain/practice/sheet-metronome-presets.ts::isoDateSchema` | Import the retained schema by direct module path and use it for `createdAt` and `updatedAt`. |
| Retain | All `parse*` and `validate*` public functions, schemas for aggregate shape, services, and repositories | No caller contract, error mode, persisted shape, or Dexie version changes. |
| New files | None | A `validation-primitives.ts` or schema facade would add a layer and is vetoed. |
| Deleted files | None | Deletion is limited to the two duplicate schema bodies. |

### Boundary, test, and rollback assessment

- **Dependency direction:** same-layer domain modules depend directly on the existing general practice validation owner. `validation.ts` has only type-only dependency on `practice/types.ts` and no runtime dependency on either importing module, so this route does not create a runtime cycle.
- **Plausible production delta:** approximately 12–16 fewer production lines after two imports and the exported name change.
- **Test seam:** `practice-session-events.test.ts`, `practice-session-service.test.ts`, `practice-goal-repository.test.ts`, `sheet-metronome-preset-domain.test.ts`, and `sheet-metronome-preset-repository.test.ts` exercise invalid real dates, noncanonical offsets, parse-null behavior, validation throws, persistence reads, and writes.
- **Rollback surface:** three domain files plus focused tests; persisted records and database schemas are untouched.
- **Likely Code Health effect:** modestly positive. It removes cloned policy code and prevents future acceptance drift; complexity and file responsibilities remain essentially flat.

### Safe build order

1. Characterize the shared acceptance matrix in tests: valid canonical UTC, impossible calendar date, explicit non-UTC offset, and malformed string.
2. Export the existing refined schema from `validation.ts` without changing its body.
3. Switch the event and preset aggregates and delete both local definitions atomically.
4. Run the five focused test files, architecture boundaries, full gates, production-only LOC accounting, and before/after Code Health.

## Candidate C: Retire Recordings-Review Formatting Pass-Throughs

**Architecture verdict:** behaviorally clear but weak value-to-churn ratio; retain only as a fallback candidate.

`src/lib/recordings-review/format.ts::formatDuration` simply returns `src/domain/practice/format.ts::formatPracticeDuration`, and `formatTimestamp` simply calls `formatDuration`. Direct imports (with local aliases where useful) could delete both pass-throughs while retaining `formatRecordingDate` in the recordings-review module.

The two aliases have approximately 15 production call expressions across nine production consumers: recordings-review history, error markers, take history, comparison UI, main review UI, waveform comparison UI, latest sheet recording, and the sheet-practice error-marker UI. `tests/unit/recordings-review-history.test.ts` directly tests the aliases, while UI tests pin the resulting labels.

### Exact integration shape

| Change kind | File/symbol | Required action |
|---|---|---|
| Delete symbols | `src/lib/recordings-review/format.ts::formatDuration`, `formatTimestamp` | Replace consumers with direct `formatPracticeDuration` imports, locally aliased only at import sites if needed. |
| Retain | `src/lib/recordings-review/format.ts::formatRecordingDate` | Date display behavior is distinct and has no current internal replacement. |
| Modify | Nine production importers plus `tests/unit/recordings-review-history.test.ts` | Import the authoritative domain function directly and move the primitive format assertions to its owner. |
| New/deleted files | None | Do not replace the removed aliases with another barrel or facade. |

- **Dependency direction:** valid (UI/lib to domain), but the change fans out across nine consumers.
- **Plausible production delta:** only about 3–6 fewer lines after split imports.
- **Rollback surface:** roughly ten production files for a very small deletion.
- **Likely Code Health effect:** neutral to slightly positive; alias removal improves ownership clarity but broad import churn is unlikely to move file scores materially.

This boundary is technically substitutable, but architecture alone does not justify choosing it over the two candidates above.

## Rejected Substitutions

### Direct `Intl.DateTimeFormat` for exact UTC labels

`Intl.DateTimeFormat` is explicitly language-sensitive. Locale, numerals, order, punctuation, and timezone labels can differ; `formatToParts` would still require reconstructing the current exact ASCII contract. Direct replacement would change observable text, while a compatibility formatter would recreate the custom path. Retain one existing exact formatter instead.

### Dexie indexes for validated multi-key in-memory ordering

Dexie `Table.orderBy` requires an index, compound multi-key ordering requires a declared compound index, and records missing compound-key fields are excluded. Filtered collections cannot simply append an independent `orderBy` in the documented API. Replacing current validated multi-key sorts would require a Dexie version/schema migration or retain manual post-validation sorting; either choice expands rollback and production LOC.

### Removing the music-domain Tonal boundary

Installed Tonal `get` APIs return library-specific discriminated empty values and accept broader signatures, including additive and irrational forms. Current symbols such as `parseMusicTimeSignature`, `getMusicTimeSignatureParts`, `parseMusicDuration`, and `getMusicBeatDurationMs` stabilize those shapes while `SUPPORTED_TIME_SIGNATURES` remains product policy. Direct Tonal imports in services would spread third-party behavior and create more than one policy owner.

### Raw Zod ISO validation without the existing refinement

Zod documents the ISO datetime validator as regex-based. Deleting the `Date` round-trip refinement can admit values the current tests reject or change canonical-offset behavior. Reuse the refined schema; do not weaken it.

### Platform media capability as persisted MIME policy

`MediaRecorder.isTypeSupported`, browser audio decode, and Blob MIME metadata answer different questions. They cannot replace the persisted export/decodability policy in `src/lib/recordings-review/audio-mime.ts` without a behavior fork between capture, storage, export, and review.

## Verification Contract for Any Selected Candidate

1. Record the exact current-main production line baseline for only the candidate's `src/**` files.
2. Add/confirm characterization before deleting a body; compare exact strings, null/throw behavior, and invalid-input cases.
3. Require zero new production files, zero storage-version changes, and no new dependency.
4. Run focused tests first, then `npm run lint`, `npm run typecheck`, `npm run test:unit`, and `npm run build` through the repository-local wrapper.
5. Re-run `tests/unit/architecture-boundaries.test.ts` to prove no UI-to-infrastructure or third-party-boundary regression.
6. Measure production additions/deletions from the immutable candidate baseline. Accept only a strictly negative `src/**` result.
7. Run local CodeScene `code_health_review`/score before and after on every modified production file; reject regressions even when aggregate LOC is negative.

## Sources

- Current-main architecture and symbols: `package.json`, `package-lock.json`, `src/domain/**`, `src/services/**`, `src/infrastructure/**`, `src/components/home/home-dashboard.tsx`, `src/hooks/use-practice-session-dashboard.ts`, and `tests/unit/architecture-boundaries.test.ts`.
- Installed Tonal declarations and implementation: `node_modules/@tonaljs/time-signature/dist/index.d.ts`, `node_modules/@tonaljs/time-signature/dist/index.mjs`, `node_modules/@tonaljs/duration-value/dist/index.d.ts`, and `node_modules/@tonaljs/duration-value/dist/index.mjs`.
- [Zod ISO datetime documentation](https://zod.dev/api#iso-datetimes) — MEDIUM confidence from official documentation; cross-checked against installed `4.4.3` usage and current tests.
- [MDN `Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) — MEDIUM confidence; official platform reference for locale-sensitive formatting behavior.
- [Dexie compound indexes](https://dexie.org/docs/Compound-Index) and [Dexie `Table.orderBy`](https://dexie.org/docs/Table/Table.orderBy%28%29) — MEDIUM confidence from official documentation; cross-checked against current repository schemas.
- [Tonal repository/package index](https://github.com/tonaljs/tonal) — MEDIUM external confidence; exact API shape verified from the installed `4.9.0` package.

## Candidate Boundary Matrix

| Candidate | Retained implementation | Production files modified | Deleted production symbols | New/deleted files | Call-site scope | Plausible net production LOC | Dependency effect | Test seam | Rollback surface | Likely Code Health | Architecture verdict |
|---|---|---:|---|---|---:|---:|---|---|---|---|---|
| A. Home presentation formatters | Domain `formatTimestamp` body plus hook `formatSessionComparisonDuration` | 3 | 4 duplicate formatter bodies | 0 / 0 | 10 calls | **−64 to −69** | Existing UI/hook → domain direction only | 2 focused files + architecture test | Small; no storage | Positive, especially large Home/hook files | **Bounded; strongest architecture candidate** |
| B. Strict ISO schema | `practice/validation.ts::isoDateSchema` body | 3 | 2 duplicate schema bodies | 0 / 0 | 9 schema fields | **−12 to −16** | Same-layer domain dependency; no runtime cycle | 5 focused files + architecture test | Small; no migration | Modestly positive; clone drift removed | **Bounded; strong fallback** |
| C. Recordings-review formatting pass-throughs | `domain/practice/format.ts::formatPracticeDuration` | ~10 | 2 pass-through functions | 0 / 0 | ~15 calls | **−3 to −6** | Valid lib/UI → domain direction | History + affected UI tests | Broad relative to deletion | Neutral/slight positive | **Conditional; poor value-to-churn ratio** |

## Architectural Vetoes

- **No new shared utility file.** Candidate A and B already have an owner; a new `shared`, `common`, or `primitives` module would add the layer this milestone is meant to remove.
- **No compatibility re-export.** Once callers switch, the duplicate symbol must disappear; leaving an alias preserves two names and weakens ownership.
- **No partial migration.** Equivalent callers must switch together or the codebase retains two behavior authorities.
- **No UI-to-infrastructure shortcut.** Dexie, browser audio, PDF, file, and concrete recording adapters remain behind their current service boundaries.
- **No database version/index change for a sorting cleanup.** A storage migration is not a bounded rollback surface for this milestone.
- **No direct spread of Tonal return types or broader parsing.** Product-supported meter policy and third-party parsing remain separate concerns.
- **No raw `Intl` or raw Zod substitution that changes exact text or accepted dates.** Platform/library availability is not evidence of behavior equivalence.
- **No final target choice from this file alone.** Select only after feature, stack, pitfall, LOC, and test evidence converge on one boundary and prove a strictly negative production delta.
