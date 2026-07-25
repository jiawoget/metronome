# Stack Research: Reuse-First Code Slimming

**Project:** Metronome v1.1 R01 Evidence-First Code Slimming  
**Domain:** Local-first Next.js maintenance refactor  
**Baseline:** current `main` at `6c0089b9cac378214ff4f4ecdbe2f3f5b42c81a4`; the commit ahead of `origin/main` changes only `.planning/PROJECT.md` and `.planning/STATE.md`, so inspected production code matches the current shipped baseline  
**Researched:** 2026-07-21  
**Overall confidence:** MEDIUM — exact local versions, declarations, source, and call sites were checked; authoritative web findings classify as MEDIUM after local cross-checking, and the leading boundary still lacks a direct infrastructure test

## Recommendation

Keep the current stack. The best dependency-backed R01 boundary is the manual active-reference fan-out in `referenceRepository.saveReference`: use the already-direct `dexie@4.4.4` API `Collection.modify({ isActive: false })` inside the existing transaction, then keep the existing `Table.put(persistedReference)`. This is a one-symbol, one-file replacement with no schema migration, no new abstraction, no dependency or bundle change, and an estimated **14 production lines retired / 4 added (net -10)**.

The largest raw deletion is the 27-line `areSegmentContextsEqual` field table, which `dequal/lite@2.0.3` can replace with one import. That package is already installed as a production transitive dependency of `react-pdf@10.4.1`; selecting it would require declaring it directly. It is technically compatible and tiny, but its latest release is from 2022 and the boundary is less preferable than direct Dexie reuse for this maintenance milestone.

Do not add a general query/cache layer, another IndexedDB wrapper, a second state system, or a new persistence abstraction. The credible overlaps are narrow API substitutions, not stack migrations.

## Current Version-Matched Stack

| Technology | Installed version | Current role | Maintenance decision | Local evidence |
|---|---:|---|---|---|
| Next.js | 16.2.9 | App Router and build/runtime | Keep; no framework-level custom logic is a safe deletion target in this scope | `package.json`; `package-lock.json` `node_modules/next` |
| React | 19.2.7 (`@types/react` 19.2.17) | UI and external-store subscription | Keep; use its full `useSyncExternalStore` hydration contract before adding client-ready gates | `node_modules/react/package.json`; `node_modules/@types/react/index.d.ts:1924` |
| Dexie | 4.4.4 | Browser-local IndexedDB repositories and transactions | Keep; prefer `Collection.modify`, `Table.update`, and bulk APIs over materialize/map/put loops when semantics match | `node_modules/dexie/package.json`; `node_modules/dexie/dist/dexie.d.ts:443` |
| Zod | 4.4.3 | Runtime validation, coercion, parsing, discriminated unions | Keep; do not introduce another validator or hand-written shape parser | `package.json`; `node_modules/zod/package.json`; current validation modules |
| Zustand | 5.0.14 | Ephemeral sheet-practice workflow state | Keep within its documented ephemeral boundary; do not turn it into a second persistence layer | `package.json`; `src/stores/README.md`; `node_modules/zustand/package.json` |
| dequal | 2.0.3, production transitive | Used by `react-pdf@10.4.1`; not directly imported by Metronome | Only promote to direct if the bounded deep-comparison candidate is selected | `package-lock.json` `node_modules/react-pdf.dependencies.dequal`; `node_modules/dequal/package.json` |

## Already available — do not reimplement

| Available API | Exact version and signature/evidence | Existing custom overlap | Decision |
|---|---|---|---|
| Dexie `Collection.modify(changes)` | `dexie@4.4.4`; local type: `modify(changes: UpdateSpec<TInsertType>): PromiseExtended<number>`; official docs say it modifies every object in the collection and rejects/aborts on uncaught failure ([Dexie docs](https://dexie.org/docs/Collection/Collection.modify%28%29)) | `src/infrastructure/reference/reference-repository.ts:82-95` reads all same-sheet references and issues one `put` per row merely to clear `isActive` | **Use for the leading candidate.** No new helper or repository layer |
| Dexie `transaction`, `Table.put`, `bulkPut`, `bulkUpdate`, `bulkDelete` | `dexie@4.4.4`; exact local overloads in `node_modules/dexie/dist/dexie.d.ts:765-797` | Any future IndexedDB batch mutation or atomic multi-table write | Use directly; do not add `idb`, localForage, or a home-grown transaction wrapper |
| React `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)` | `react@19.2.7`; exact local generic signature in `@types/react@19.2.17`; React documents the third argument for server render and initial hydration ([React docs](https://react.dev/reference/react/useSyncExternalStore)) | `src/components/recordings-review/use-recordings-review-controller.ts:31-43` supplies a server snapshot but then adds a separate `clientReady` state and zero-delay timer | Credible secondary deletion; prove hydration timing before selection |
| React `useEffectEvent(callback)` | Available in installed React 19.2; returns a same-signature Effect Event that sees latest committed values ([React 19.2 docs](https://react.dev/reference/react/useEffectEvent), [release](https://react.dev/blog/2025/10/01/react-19-2)) | `loadSourcesRef` plus its synchronization effect in `useWaveformComparisonSources` | Available, but only about four net production lines; too small to justify the sole R01 target |
| Zod `schema.safeParse`, `schema.parse`, `z.discriminatedUnion`, `z.iso.datetime` | `zod@4.4.3`; locally imported throughout domain modules; official v4 docs cover `safeParse` and discriminated unions ([Zod basics](https://zod.dev/basics), [Zod API](https://zod.dev/api)) | Runtime validation and parse-or-null helpers | Continue reuse; no second validator and no generic validation facade |
| `dequal/lite` `dequal(foo, bar): boolean` | `dequal@2.0.3`; local type `export function dequal(foo: any, bar: any): boolean`; official package exports `./lite` as ESM/CJS ([official repository](https://github.com/lukeed/dequal), [package metadata](https://github.com/lukeed/dequal/blob/master/package.json)) | `areSegmentContextsEqual` manually enumerates 12 nested scalar pairs | Credible only if promoted to a direct dependency; do not write another deep-equality helper |
| Existing `cn(...inputs)` facade over `clsx` + `tailwind-merge` | `clsx@2.1.1`, `tailwind-merge@3.6.0`; `src/lib/utils.ts` | Conditional class concatenation and Tailwind conflict resolution | Reuse `cn`; do not add another class builder or duplicate the merge recipe |

## Ranked Overlap Candidates

| Rank | Boundary and custom symbol | Replacement API | Semantic fit and required glue | Estimated production LOC | Dependency/runtime cost | Confidence |
|---:|---|---|---|---:|---|---|
| **1** | `src/infrastructure/reference/reference-repository.ts:77-103`, `referenceRepository.saveReference`; specifically lines 82-95 | `db.references.where("sheetId").equals(id).modify({ isActive: false })` within the existing `db.transaction`, followed by the existing `put` | Exact final-state match: old references retain `updatedAt`, all matching rows become inactive, and `persistedReference` restores its own requested active state. Add one fake-IndexedDB test for same-sheet deactivation, cross-sheet isolation, and rollback/error behavior. No new abstraction | Retire 14 / add about 4 / **net -10** | Already-direct Dexie; zero dependency, bundle, schema, or persistence-format change | **MEDIUM** |
| **2** | `src/components/sheet-practice/controls/rerecord-source-validation.ts:75-101`, `areSegmentContextsEqual` | `import { dequal } from "dequal/lite"`; call `dequal(liveContext, sourceContext)` | Current values are validated plain nested objects containing strings, finite numbers, `null`, and ordered object fields; lite mode supports these. Add focused equality tests covering every nested field, `null` BPM, and independently allocated equal objects. Gap: `dequal` compares all enumerable fields, whereas the current function ignores future extra fields | Retire 27 / add 1 import / **net -26** | Promote installed transitive to direct; official gzip size 304 B for lite; no material runtime state. Low release activity is the main risk | **MEDIUM** |
| **3** | `src/components/recordings-review/use-recordings-review-controller.ts:31-43`, `useRecordingsReviewController` client-ready timer | Use the already-supplied third `getServerSnapshot` argument as designed and return the hook snapshot directly | React guarantees `getServerSnapshot` for server render and initial hydration, then reads the client snapshot. Gap: the current code deliberately waits one macrotask after mount; removing it can change the exact paint/update timing. Add a hydration test with non-empty local snapshot before approval | Retire 8 / add 0 / **net -8** | Already-direct React; zero bundle cost | **MEDIUM** |

### Why Rank 1 First

- It uses an already-direct dependency and an API already typed in the installed version.
- It changes no public service or repository interface, database version, store name, index, persisted row shape, event contract, or local-first boundary.
- It preserves the existing transaction and the final values written by the current loop.
- It produces a measurable production-only deletion without introducing a shared helper or parallel path.
- The only meaningful gap is verification: current service tests use an in-memory repository, so the Dexie repository behavior needs a direct fake-IndexedDB test.

## Candidate Detail

### 1. Dexie batch modification — recommended

**Current custom behavior**

`referenceRepository.saveReference` currently:

1. Materializes every reference for the target sheet with `toArray()`.
2. Maps those rows into individual `Table.put()` promises.
3. Preserves every older row's `updatedAt` while changing only `isActive`.
4. Puts the incoming validated reference and optional artifact in the same transaction.

The only net effect of steps 1-3 after the incoming `put` is: every pre-existing same-sheet row other than the incoming row is inactive. `Collection.modify({ isActive: false })` expresses that operation directly.

**Exact replacement API**

```ts
await db.references
  .where("sheetId")
  .equals(persistedReference.sheetId)
  .modify({ isActive: false });
```

Installed declarations provide both callback and object overloads and return `PromiseExtended<number>`. Official Dexie documentation states that the object form changes the named property for every row in the collection; an uncaught failure aborts the surrounding transaction. Dexie 4.4.4 is also the current installed direct version, Apache-2.0 licensed, and its official release page marks it as the latest maintenance release ([v4.4.4 release](https://github.com/dexie/Dexie.js/releases/tag/v4.4.4), [license](https://github.com/dexie/Dexie.js/blob/master/LICENSE)).

**Semantic gaps to close**

- The rejected error class can become `Dexie.ModifyError` instead of an individual `put` failure. No current public contract inspects the error type, but a test should assert transaction rollback rather than exact exception class.
- The infrastructure repository has no direct unit test; `tests/unit/reference-service.test.ts` uses a memory implementation. Add a direct test against the existing `fake-indexeddb/auto` setup.
- Do not change the versioned schema or replace `dispatchReferenceChange`; those are outside this target.

**Browser/Next.js and cost**

The API runs in the same browser-only IndexedDB path already shipping Dexie. There is no new import, server execution, bundle module, tree-shaking concern, schema migration, or runtime data migration.

### 2. `dequal/lite` deep equality — secondary

**Current custom behavior**

`areSegmentContextsEqual` manually lists 12 scalar comparisons across `range`, `measureGridSnapshot`, and `measureRangeMs`. It is called by both live-segment validation and persisted-recording validation. Current Zod schemas and `createSheetRecordingSegmentContext` normalize the compared values into plain nested objects.

**Exact replacement API**

```ts
import { dequal } from "dequal/lite";

dequal(left, right); // boolean
```

The official README states that object key order does not matter and array value order does; lite mode covers the primitive/plain object/array shapes used here. The installed declaration is exactly `dequal(foo: any, bar: any): boolean`.

**New direct-dependency record**

| Attribute | Evidence and assessment |
|---|---|
| Version | `2.0.3`, already resolved in `package-lock.json`; required by installed `react-pdf@10.4.1` as `^2.0.3` |
| Maintenance/activity | Official repository shows 58 commits and latest release `v2.0.3` on 2022-07-11. Treat as mature/stable but low-activity, not actively evolving ([release](https://github.com/lukeed/dequal/releases/tag/v2.0.3)) |
| License | MIT in both local manifest and official license ([license](https://github.com/lukeed/dequal/blob/master/license)) |
| Browser/Next.js compatibility | Official package exposes ESM and CommonJS subpath exports; lite supports the plain JavaScript values in this boundary. Next.js 16 can consume the ESM export already consumed transitively by `react-pdf` |
| Bundle/runtime cost | Official README: 304 B gzip for `dequal/lite`; recursive comparison cost is proportional to the small segment-context object. It would become reachable from the sheet-practice client chunk |
| Tree-shaking | Use the explicit `dequal/lite` subpath, not the full build. The package manifest has ESM exports but no explicit `sideEffects` field; budget the full 304 B rather than claiming additional tree-shaking savings |
| API stability | One two-argument boolean API at 2.0.3; unchanged latest release since 2022. Low churn lowers migration risk but also means low maintenance activity |
| Why internal/platform APIs are insufficient | ECMAScript/browser APIs have no deep structural equality primitive. `JSON.stringify` is order-sensitive and creates strings; Zod validates/canonicalizes but does not compare; adding an internal comparator merely preserves the custom logic the milestone is meant to retire |

**Dependency action if and only if selected**

Promote the already-resolved package to direct production dependency and keep the lockfile at 2.0.3:

```bash
npm install dequal@2.0.3
```

Do not import it only because it happens to be transitive; direct imports require direct ownership in `package.json`.

### 3. React hydration snapshot — prove before selecting

The installed `useSyncExternalStore` signature is:

```ts
useSyncExternalStore<Snapshot>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot?: () => Snapshot
): Snapshot;
```

The controller already passes `() => emptyClientSnapshot` as the server snapshot, then duplicates the server-to-client transition with `clientReady` and a zero-delay timer. React's official contract says `getServerSnapshot` runs on the server and during initial client hydration; after hydration React uses `getSnapshot`.

This is a valid installed-API overlap, but it is not the first choice because the exact paint timing is observable and there is no focused hydration test. It should not be bundled with either other candidate.

## Screened but Cost-Positive or Semantically Unsafe

| Installed API or tempting library | Current overlap | Why it is not an R01 candidate |
|---|---|---|
| Zustand `persist` / `createJSONStorage` | `src/lib/recordings-review/repository.ts` contains localStorage snapshot validation, normalization, stale-write protection, cross-context events, and domain mutations | Official Zustand docs warn JSON storage does not runtime-validate data. Preserving current corrupt/stale-data handling, legacy normalization, CAS-like stale-write detection, and event behavior would require custom storage/migration glue and create a second persistence path ([official persist docs](https://zustand.docs.pmnd.rs/reference/middlewares/persist)) |
| Dexie `liveQuery` | Custom same-tab change events in reference, practice-session, and practice-goal repositories | `liveQuery` emits query results asynchronously and has an initial emission, while current repository `subscribe(listener)` is notification-only and spans additional localStorage sources through the global repository. Adapting all consumers is multi-boundary and not reliably net-negative ([official liveQuery docs](https://dexie.org/docs/liveQuery%28%29)) |
| Dexie `orderBy(...).reverse().first()` | Practice-session repositories materialize and sort sessions in JavaScript | Domain ordering is not only `updatedAt`: it falls back to activity timestamps and deterministic tie-breakers, while malformed persisted rows are skipped. A single indexed `first()` would change those semantics or require a schema migration |
| `Intl.DateTimeFormat` / `Intl.NumberFormat` | Several UI files contain small date, duration, count, and byte formatters | ECMA-402 formatting is locale-sensitive; current helpers include English product wording, explicit fallbacks, and custom rounding. Consolidation needs a separate presentation contract and can easily change visible strings ([ECMA-402](https://tc39.es/ecma402/)) |
| React `use` for asynchronous client reads | Manual effect/state loading in browser hooks and dashboard hooks | `use(promise)` suspends and needs cached promises plus Suspense/error boundaries; current hooks expose explicit loading/error/refresh states and subscribe to local repositories. The migration adds infrastructure rather than retiring it ([React `use`](https://react.dev/reference/react/use)) |
| A new equality or utility suite | Manual segment-context comparator | `dequal@2.0.3` is already resolved and provides the exact tiny API. Do not add Lodash, another equality package, or a generic utilities facade |

## What NOT to Add

| Avoid | Why | Use instead |
|---|---|---|
| Second IndexedDB abstraction | Dexie already owns all current IndexedDB databases; another wrapper creates parallel transaction and migration semantics | Installed Dexie 4.4.4 methods on existing tables |
| Server database, cloud sync, remote cache | Violates the retained browser-local contract and is unrelated to code slimming | Existing IndexedDB/localStorage boundaries |
| General client query/cache library | Current reads are local, bounded, and already expose explicit service subscriptions; adoption is multi-file and cost-positive | Existing services plus React APIs; refactor only a proven local overlap |
| New persistent Zustand store | Repository policy explicitly keeps Zustand ephemeral, and persistence would duplicate current repository authority | Existing repositories; keep Zustand for workflow UI state |
| Generic `deepEqual` wrapper around an OSS function | Merely renames the parallel custom abstraction | Direct `dequal/lite` import if candidate 2 is selected |
| Generic `batchUpdateReferences` helper | Dexie already names and implements the operation | Direct `Collection.modify` at the one repository call site |

## Version and Compatibility Matrix

| Consumer | API provider | Compatibility evidence | Result |
|---|---|---|---|
| `referenceRepository.saveReference` | `dexie@4.4.4` | Current repository already imports Dexie and operates on `Table<SheetReference, string>`; local types expose object-form `Collection.modify` | Compatible with no new import or schema change |
| `useRecordingsReviewController` | `react@19.2.7`, `@types/react@19.2.17` | Current code already calls the three-argument hook; installed types exactly match official signature | Compatible, pending hydration timing test |
| `areSegmentContextsEqual` | `dequal/lite@2.0.3` | Package is present as a non-dev lock entry; ESM/CJS lite export and TypeScript declaration exist locally | Compatible only after direct dependency promotion |
| Local validation modules | `zod@4.4.3` | Current main already imports Zod schemas across domain modules | Continue current reuse; no migration |

## Verification Contract for the Leading Candidate

Before roadmap promotion, require one focused test around the real Dexie repository—not only the existing in-memory service repository—to prove:

1. Saving an active reference deactivates every older reference for that sheet.
2. References for another sheet are untouched.
3. Re-saving an existing ID preserves the incoming reference exactly.
4. Optional artifact write remains atomic with reference changes.
5. A rejected mutation leaves the transaction unchanged.
6. The repository emits one post-commit notification, as it does today.
7. Production diff accounting is restricted to the selected boundary and is net-negative.

Then run the repository's normal lint, typecheck, unit-test, build, and Code Health gates. Do not combine candidates in one phase merely to increase deleted LOC.

## Sources

### Local version and behavior evidence

- `package.json` — direct dependency declarations and browser stack.
- `package-lock.json` — exact installed versions; `dequal@2.0.3` is a production transitive of `react-pdf@10.4.1`.
- `node_modules/dexie/package.json` and `node_modules/dexie/dist/dexie.d.ts:443,765-797` — exact Dexie version, license, and API overloads.
- `node_modules/dequal/package.json`, `node_modules/dequal/index.d.ts`, and `node_modules/dequal/lite/index.d.ts` — exact version, export map, license, and signature.
- `node_modules/react/package.json` and `node_modules/@types/react/index.d.ts:1924` — exact React runtime/type versions and hook signature.
- `src/infrastructure/reference/reference-repository.ts:77-103` — leading manual batch-mutation overlap.
- `src/components/sheet-practice/controls/rerecord-source-validation.ts:75-101` — deep-equality overlap.
- `src/components/recordings-review/use-recordings-review-controller.ts:28-43` — redundant hydration gate candidate.
- `tests/unit/reference-service.test.ts:222` and `tests/unit/setup.ts:2` — existing behavior expectation and available fake IndexedDB setup; also evidence that the real infrastructure repository is not directly covered.
- An isolated read-only `fake-indexeddb` probe against installed Dexie 4.4.4 confirmed that `modify({ isActive: false })` plus the existing `put` deactivates only same-sheet rows, preserves older timestamps, restores the incoming active row, and leaves another sheet untouched. This is supporting evidence, not a substitute for a committed repository test.

### Authoritative primary sources

- [Dexie `Collection.modify()` documentation](https://dexie.org/docs/Collection/Collection.modify%28%29) — semantics, return value, and transaction failure behavior.
- [Dexie 4.4.4 official release](https://github.com/dexie/Dexie.js/releases/tag/v4.4.4) — installed release currency and maintenance status.
- [Dexie official license](https://github.com/dexie/Dexie.js/blob/master/LICENSE) — Apache-2.0.
- [dequal official repository and README](https://github.com/lukeed/dequal) — exact API, supported values, modes, and gzip sizes.
- [dequal official package metadata](https://github.com/lukeed/dequal/blob/master/package.json) — version, ESM/CJS exports, types, engine, and license field.
- [dequal v2.0.3 official release](https://github.com/lukeed/dequal/releases/tag/v2.0.3) — latest release/activity evidence.
- [dequal official license](https://github.com/lukeed/dequal/blob/master/license) — MIT.
- [React `useSyncExternalStore` reference](https://react.dev/reference/react/useSyncExternalStore) — subscription and server-snapshot/hydration contract.
- [React 19.2 release](https://react.dev/blog/2025/10/01/react-19-2) and [useEffectEvent reference](https://react.dev/reference/react/useEffectEvent) — installed major/minor availability and intended use.
- [Zod basic usage](https://zod.dev/basics) and [Zod v4 API](https://zod.dev/api) — existing validation capabilities.
- [Zustand `persist` reference](https://zustand.docs.pmnd.rs/reference/middlewares/persist) — persistence API and runtime-validation warning.
- [Dexie `liveQuery()` documentation](https://dexie.org/docs/liveQuery%28%29) — observable semantics used to reject a broad subscription rewrite.
- [ECMA-402 specification](https://tc39.es/ecma402/) — platform internationalization semantics.

---
*Stack research for one bounded, behavior-preserving, net-negative production refactor. No product code changed and no commit created.*
