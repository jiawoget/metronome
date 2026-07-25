# Replacement and Refactor Pitfalls

**Domain:** v1.1 R01 evidence-first code slimming in a local-first browser application
**Baseline:** current `main` at `6c0089b9cac378214ff4f4ecdbe2f3f5b42c81a4`
**Researched:** 2026-07-21
**Confidence:** MEDIUM overall; HIGH for literal current-main observations, MEDIUM for verified official web documentation

## Decision Rule

R01 must select exactly one candidate, and every unknown is a veto rather than an invitation to implement speculatively. A candidate is acceptable only when the planner can name the current implementation owner, the reused implementation owner, every observable behavior that crosses the seam, the tests that characterize those behaviors, the exact production code that disappears, and the external cost of the replacement.

The baseline semantic-discovery prerequisite is satisfied on this exact current-main checkout by the final code-focused Lumen CLI rebuild. After root `.lumenignore` excluded `.planning/`, `.semgrep/`, and `docs/legacy/`, the explicit rebuild indexed 345 files into 2,859 chunks in 28.059 seconds. Its CLI semantic query ranked the Home formatter group first at 0.85, the dashboard-hook formatter group second at 0.81, and the existing domain `formatTimestamp` owner third at 0.68, with no planning, legacy, or Semgrep results. This closes the baseline availability gate and corroborates the literal shortlist. Candidate approval still requires exact call-site/test verification and an alternatives record. After an ignore-rule change, evidence is valid only from an explicit rebuilt CLI index or a freshly loaded MCP host; selection must rerun if the HEAD or index freshness changes.

## Critical Replacement Pitfalls

### Pitfall 1: Library capability is mistaken for product policy

**What goes wrong:**
A broad library parser or helper is treated as semantically equivalent to the narrower Metronome contract. Directly exposing the library then admits inputs, rounding, labels, or states the product intentionally rejects.

**Current-main evidence:**
- `parseMusicTimeSignature` delegates parsing to `@tonaljs/time-signature`, but `SUPPORTED_TIME_SIGNATURES` in `src/domain/music/meter-policy.ts` is the product allowlist. `tests/unit/music-domain.test.ts` proves Tonal parses `5/4`, `3+2+3/8`, and `12/10` while product support remains false.
- `getMusicDurationForDenominator` accepts only denominators 4 and 8 even though `@tonaljs/duration-value` is broader. `getMusicBeatDurationMs` also carries the repo's quarter-note ratio and error behavior.
- `formatPracticeDuration` rounds seconds and returns `0:00` for non-finite or non-positive input; `formatAnalyticsDuration` in `home-dashboard.tsx` intentionally uses different minute/hour labels, with boundary assertions in `home-dashboard.test.tsx` (`formats analytics duration boundaries honestly`).
- Similar-looking string normalizers are not interchangeable: `normalizeRequiredString` returns `null`, `normalizeMeasureGridSheetId` throws through Zod, and `normalizeOptionalContextId` converts blank context IDs to `null`. Their callers depend on those different failure modes.

**How to avoid:**
Build a behavior matrix before implementation: accepted inputs, rejected inputs, output shape, rounding, ordering, mutation, thrown/returned error, and fallback. Compare the matrix against the exact locked OSS version, not the package's general marketing description. Retain a product-policy owner when the library is only a parser or primitive.

**Warning signs:**
- Proposal says “the library already supports this” without listing unsupported-but-parseable values.
- Tests are rewritten to assert the library result instead of preserving current expected output.
- A domain allowlist, validation error, null normalization, or deterministic tie-breaker disappears.
- The replacement accepts `unknown` differently, mutates input, changes rounding, or changes thrown errors into sentinel values.

**Phase to address:**
Phase 1 candidate approval and pre-implementation characterization.

---

### Pitfall 2: A storage rewrite preserves records but changes persistence semantics

**What goes wrong:**
A shared repository, generic CRUD helper, Dexie abstraction, or OSS persistence wrapper keeps happy-path values while breaking database names, schema versions, legacy reads, malformed-row filtering, event delivery, clear isolation, sort order, or reopen behavior.

**Current-main evidence:**
- `src/infrastructure/storage/storage-contracts.ts` defines durable IndexedDB names and the `metronome-practice:v0:quick-recordings` localStorage key. These strings are compatibility contracts, not duplication.
- `PracticeSessionDexieDatabase` has an explicit v1-to-v2 schema transition that removes the old `recordings` store. Repository reads parse and filter malformed rows; subscriptions combine a custom same-window event with the browser `storage` event.
- `practiceGoalRepository.clear` emits only when state changed, validates on write, sorts by parsed time with an ID tie-breaker, and remains isolated from session and recording storage. Tests cover malformed records, subscription counts, reopen persistence, and clear isolation.
- `recordingHistoryRepository` still owns a localStorage snapshot with legacy/malformed normalization and coupled recording, marker, take-selection, and organization metadata. It is not equivalent to a Dexie table even when both expose CRUD-shaped methods.

**How to avoid:**
For a persistence candidate, characterize old database/key names, schema upgrades, valid and malformed legacy fixtures, cross-reopen reads, clear isolation, ordering, subscriptions, and same-window/cross-window notification behavior. Run tests against populated pre-change storage, not only a fresh database.

**Warning signs:**
- Proposal consolidates databases or converts localStorage to Dexie because the APIs “look the same.”
- Existing schema versions or storage keys are renamed as cleanup.
- Replacement tests begin from empty storage only.
- A generic repository removes parser/filter steps or changes `put` upsert behavior.
- Clear/delete starts notifying on no-op operations or clears another local data family.

**Phase to address:**
Phase 1 candidate veto and persistence-specific verification.

---

### Pitfall 3: Multi-owner mutation is collapsed into a false transaction

**What goes wrong:**
A concise OSS call or shared transaction wrapper changes operation ordering or rollback behavior across IndexedDB, localStorage metadata, practice-session snapshots, artifact blobs, and best-effort event capture. The result looks more atomic in code while becoming less recoverable in failure paths.

**Current-main evidence:**
- `BrowserSheetRecordingService.stopAndSave` performs decode/peak validation, metadata preparation, artifact save, history save, prepared-session commit, and best-effort event capture. Its catch path rolls back history/artifacts and restores or deletes the practice-session snapshot; rollback failure is surfaced explicitly.
- `quickRecordingController.saveCapturedQuickRecording` deliberately saves body, links the session, saves metadata, and then ends the session, with compensating cleanup on each partial state.
- Tests name the contract directly: `sheet-practice-recording.test.ts` covers artifact/session/history failure and restoration; `quick-metronome-session.test.ts` covers link failure, post-link failure, and UI stop-flow rollback.
- These owners span different persistence mechanisms, so a single Dexie transaction cannot make the whole workflow atomic.

**Official constraint:**
Dexie transactions include only declared tables, auto-commit when IndexedDB work becomes inactive, and can fail on unrelated awaited async work or incompatible promise zones. Nested failure propagates to the parent. A wrapper must not imply broader atomicity than the underlying stores provide.

**How to avoid:**
Map the mutation sequence and every injected failure point before changing it. Preserve commit order, compensating actions, error precedence, and the rule that telemetry/event capture is best-effort only after durable success. If the replacement cannot express the same partial-failure semantics, veto it.

**Warning signs:**
- The proposal calls a multi-store workflow “one transaction” without naming every physical store.
- Catch blocks swallow a rejected write inside a Dexie transaction.
- Non-IndexedDB async work is awaited within a Dexie transaction.
- Rollback tests are deleted, mocked above the changed seam, or reduced to one happy path.
- Event capture moves before durable commit or becomes capable of failing a completed save.

**Phase to address:**
Phase 1 characterization, implementation, and failure-injection verification.

---

### Pitfall 4: Browser fallbacks and resource ownership disappear behind a cleaner API

**What goes wrong:**
A replacement works in the primary development browser but changes secure-context behavior, codec choice, microphone constraints, stop-event ordering, track cleanup, audio-context cleanup, object-URL lifetime, or local PDF worker loading.

**Current-main evidence:**
- `BrowserRecordingService` feature-detects `MediaRecorder`, negotiates `audio/webm;codecs=opus`, then `audio/webm`, then `audio/mp4`, falls back to the recorder-selected MIME, disables echo cancellation/noise suppression/auto gain, waits for `stop`, and stops tracks before returning analysis.
- `BrowserAudioDecodeAdapter` supports `webkitAudioContext`, copies the ArrayBuffer before decode, maps unavailable versus decode-failed errors, and closes the context in `finally`.
- Object URLs have explicit owners and revocation timing in the sheet viewer, recording artifact resolver, local reference player, and download adapter.
- `architecture-boundaries.test.ts` requires the PDF worker to be local, forbids CDN URLs and `pdfjs-dist/legacy`, and constrains PDF.js import sites.
- ID generators differ in prefix and capability checks. `crypto.randomUUID()` is available only in secure contexts in supporting browsers; blindly replacing fallbacks can make local HTTP or older-browser paths fail.

**How to avoid:**
Characterize the actual adapter before substitution, then run focused tests plus relevant Playwright `[chromium]` E2E. If the seam depends on permission, codec, worker, Web Audio, object URL, or secure-context behavior and lacks a direct test, add characterization tests before implementation. Do not infer parity from TypeScript compatibility.

**Warning signs:**
- OSS wrapper hard-codes one MIME type or file extension.
- Object URLs are returned without a named revocation owner.
- `AudioContext.close`, media-track stop, or recorder `stop` event waiting disappears.
- A worker URL moves to a CDN or a dependency begins fetching runtime assets.
- A shared ID helper drops required prefixes or removes the non-`randomUUID` fallback.

**Phase to address:**
Phase 1 pre-implementation characterization and browser verification.

---

### Pitfall 5: Source LOC falls while dependency and bundle cost rises

**What goes wrong:**
Deleting ten local lines by importing a runtime package appears to satisfy slimming, while the lock tree, client JavaScript, install scripts, vulnerability surface, license obligations, or upgrade burden grows. Dependency code is production code even though it is not counted under `src/`.

**Current-main evidence:**
- The lockfile pins exact resolved artifacts and integrity hashes. Relevant installed versions include Dexie 4.4.4 (Apache-2.0), Tonal time-signature/duration-value 4.9.0 (MIT), Tone 15.1.22 (MIT), WaveSurfer 7.12.8 (BSD-3-Clause), Zod 4.4.3 (MIT), Zustand 5.0.14 (MIT), PDF.js 5.4.296 (Apache-2.0), and React-PDF 10.4.1 (MIT).
- `package.json` explicitly permits install scripts only for `sharp@0.34.5` and `unrs-resolver@1.12.2`; a replacement that adds a new install-time executable changes the security posture.
- Client components transitively pull their imports into the client bundle. Next 16.2.9 provides bundle analysis that can record route/environment/import-chain evidence.

**How to avoid:**
Prefer already installed, already bundled, authoritative APIs when behavior matches. For any new runtime dependency, require before/after lockfile, transitive-package count, license, install-script, `npm audit --package-lock-only --json`, and client bundle evidence. Veto a dependency whose total operational burden exceeds the custom logic it removes.

**Warning signs:**
- Only `src` LOC is presented; `package-lock.json` and bundle deltas are omitted.
- A whole umbrella package replaces an already installed leaf import.
- The proposal cites `latest` docs instead of the locked version/API.
- New optional/native/WASM/postinstall packages appear.
- An existing server-only dependency becomes reachable from a `"use client"` tree.

**Phase to address:**
Phase 1 candidate approval and final cost verification.

---

### Pitfall 6: The wheel is retained under a facade, adapter, or compatibility alias

**What goes wrong:**
The diff adds an OSS-facing wrapper but leaves the custom algorithm, policy table, serializer, or state model reachable. LOC may move, compress, or be hidden behind re-exports, while the project now maintains two concepts and a translation layer.

**Current-main evidence:**
- `formatDuration` already delegates to `formatPracticeDuration`; replacing that one-line alias alone is not a meaningful retirement.
- The repository intentionally uses adapters at true platform boundaries (Tone, WaveSurfer, MediaRecorder, PDF.js). Adding another adapter above an existing adapter is parallel abstraction unless it deletes an owner and its callers.
- The Zustand store is explicitly ephemeral and must not become persistence. A “unified state” wrapper that mirrors repository data would create a second model.
- ID-generation and normalization snippets look repetitive, but their prefixes, injection seams, null/throw behavior, and persistence roles differ. A generic helper with flags can preserve every branch while merely centralizing it.

**How to avoid:**
Require a deletion map: each removed branch must map to an existing project symbol or an authoritative OSS call. After the diff, the retired symbol/file must have zero production callers, no equivalent decision table/loop may remain elsewhere, and no compatibility layer may expose both old and new models. A new wrapper is acceptable only when it is the already-required platform boundary and the underlying custom behavior is actually gone.

**Planner/reviewer wrapper test:**
1. Locate the new dependency's production import sites. If it is imported only by a newly added facade, inspect the facade branch-for-branch.
2. Search for the retired function names, policy constants, error strings, serialization keys, and algorithmic loops. Any reachable duplicate is a veto.
3. Compare new wrapper LOC plus retained custom LOC with deleted custom LOC. If the wrapper re-implements validation, fallback, mutation order, or normalization, the library is a primitive rather than a replacement.
4. Confirm callers now depend on one owner and one data model. Re-export aliases or bidirectional converters are parallel paths unless an external public API requires them; this private app has no such default justification.
5. Ignore rename credit: review `git diff -M --ignore-all-space` and the import graph, not only `--stat`.

**Warning signs:**
- New file names include `adapter`, `facade`, `compat`, `bridge`, or `mapper` while the old implementation remains.
- Tests mock the wrapper and never execute the locked OSS package.
- The proposal needs feature flags to choose old versus new logic.
- Most deleted lines reappear as option objects, mapping tables, or wrapper conditionals.

**Phase to address:**
Phase 1 plan review, diff review, and final verification.

---

### Pitfall 7: Green default gates are mistaken for complete evidence

**What goes wrong:**
Lint, unit tests, and build pass while the target has no direct characterization, the relevant E2E was not run, source LOC did not actually shrink, CodeScene declined after the change, or discovery evidence came from a different/stale HEAD.

**Current-main evidence:**
- The pre-commit hook runs debt-gate self-test, changed-file Semgrep/XO, lint, typecheck, unit tests, and build. It does not run E2E, CodeScene, a LOC gate, bundle analysis, license review, or dependency audit.
- Local CodeScene installation verification passed all 5 of 5 checks. Current-main file baselines are `home-dashboard.tsx` 6.46, `use-practice-session-dashboard.ts` 8.11, `session-comparison.ts` 8.54, `validation.ts` 9.38, `session-events.ts` 9.09, `sheet-metronome-presets.ts` 9.38, and `reference-repository.ts` 10.0.
- The detailed `home-dashboard.tsx` review explicitly reports **Code Duplication** for `formatActivityTime` at lines 1450-1468 and `formatAnalyticsTimestamp` at lines 1491-1505. This is direct baseline support for evaluating the formatter candidate; it is not a substitute for analyzing the resulting diff.
- Root `.lumenignore` excludes `.planning/`, `.semgrep/`, and `docs/legacy/`. The final explicit CLI rebuild completed in 28.059 seconds with 345 files and 2,859 chunks; its semantic query ranked the Home formatter group first (0.85), the hook formatter group second (0.81), and domain `formatTimestamp` third (0.68), with no ignored planning/history/gate-definition results.
- The long-lived MCP process retained its prior cached database after the ignore change and continued reporting 349 files / 2,877 chunks until host restart. That status is stale and is not evidence of the final configuration. Use the explicit CLI rebuild/query or restart the MCP host and verify it freshly loaded the rebuilt index.
- CodeScene policy requires no decline on changed source files, no new severe findings, and at least 7.0 for four named hotspots when touched.
- Semgrep is baseline-aware and scans changed indexed files; it does not establish semantic equivalence or detect a cost-negative dependency.

**How to avoid:**
Treat the phase-gate table below as conjunctive. Baseline discovery and CodeScene availability now pass, but they do not pre-approve a candidate or a code change. `UNKNOWN`, skipped, unavailable, flaky, or “not applicable” without evidence at any remaining candidate-specific or post-change gate means fail closed. Tests must exercise the changed seam below its mocks.

**Warning signs:**
- Verification says only “all tests pass.”
- Only baseline CodeScene scores are quoted; the exact post-change revision and per-file delta were not analyzed.
- Browser behavior is tested only in JSDOM.
- Added characterization tests pass only after implementation, so they cannot prove preserved behavior.
- Net deletion includes tests, planning files, generated output, comments, or formatting churn.

## Current Baseline Evidence Status

| Admission evidence | Status | Exact current-main result | What remains fail-closed |
|---|---|---|---|
| Semantic discovery availability | **PASS** | Code-focused CLI rebuild: 345 files / 2,859 chunks in 28.059s; Home 0.85, hook 0.81, domain `formatTimestamp` 0.68; no `.planning/`, `.semgrep/`, or `docs/legacy/` results | Literal call-site/test verification, alternatives record, and a fresh CLI rebuild or freshly loaded MCP host after any HEAD/ignore/index change |
| CodeScene installation and pre-change baselines | **PASS** | Installation verification 5/5; seven file scores recorded; Home detailed review names both duplicate formatter ranges | Exact post-change file analysis/delta, no new severe finding, policy thresholds, and no changed-source decline |
| Behavior and deletion proof | **OPEN / VETO UNTIL PASS** | Existing tests and literal bodies identify likely seams | Pre-change mutation-sensitive characterization, deletion map, zero wrapper/parallel path, and strictly net-negative formatted `src/**` LOC |
| Rollback proof | **OPEN / VETO UNTIL PASS** | Candidate has not been implemented | One bounded version-control revert must restore behavior without migration, manual repair, or local-artifact loss |

**Phase to address:**
Every Phase 1 gate, especially terminal verification.

## Candidate Veto Checklist

Any checked item rejects the candidate before implementation:

- [ ] The candidate was not discovered/corroborated by successful semantic search against the exact current-main HEAD used for selection, or the index became stale before selection.
- [ ] Semantic evidence came from a long-lived MCP cache retained across an ignore-rule change instead of an explicit rebuilt CLI index or a freshly loaded MCP host.
- [ ] The current owner, proposed reused owner, production callers, and behavior matrix are not all named.
- [ ] The proposal relies on package/API behavior that is not verified against the exact locked or proposed version from an authoritative source.
- [ ] Accepted/rejected input sets, output shape, errors, ordering, rounding, mutation, fallback, and cleanup differ or remain unknown.
- [ ] The seam touches persisted data without legacy, malformed, reopen, clear-isolation, and storage-key/schema compatibility evidence.
- [ ] The seam touches a multi-owner mutation without failure injection for every durable write and compensating rollback.
- [ ] The seam touches browser APIs without capability, permission/codec, lifecycle cleanup, and relevant Playwright `[chromium]` evidence.
- [ ] A new dependency has unknown/unsuitable license, new install scripts, new audit findings, unexplained transitive growth, or unmeasured client bundle impact.
- [ ] The replacement adds a facade/adapter/compatibility model while the custom owner or equivalent branches remain reachable.
- [ ] Production LOC is not strictly net negative after formatting, or the apparent reduction is a rename, reformat, minification, generated-code move, or migration into another production path.
- [ ] Characterization tests do not fail when the old behavior is intentionally perturbed, or they mock above the replacement seam.
- [ ] Architecture boundaries, storage ownership, local PDF worker, Zustand ephemerality, or local-first behavior would weaken.
- [ ] Post-change CodeScene delta evidence is unavailable, shows any changed-source decline/new severe finding, or leaves a touched named hotspot below 7.0.
- [ ] The change cannot be reverted without a data migration, manual user repair, or loss of local artifacts.

## Cost-Negative and Debt-Preserving Patterns

| Shortcut | Immediate appearance | Long-term/current-main cost | Acceptable here? |
|---|---|---|---|
| Add a package for ID generation | Deletes repeated `randomUUID` fallbacks | Changes prefixes/fallbacks, lock tree, bundle, license/security surface | No, unless it retires materially more behavior and passes every dependency gate |
| Centralize all `trim` logic | Fewer helpers | Collapses null/throw/validation semantics and domain error messages | No; reuse only among proven identical contracts |
| Replace localStorage history with generic Dexie CRUD | One persistence style | Risks storage-key compatibility, snapshot normalization, subscriptions, and coupled metadata cleanup | No for R01 without migration-grade evidence; likely too broad |
| Wrap an OSS primitive behind a new facade | Clean import boundary | Keeps the wheel plus mapping and upgrade burden | No when an existing boundary can own the direct call |
| Count only deleted `src` lines | Easy metric | Ignores dependencies, bundle, generated moves, and formatting games | Never sufficient; net source deletion is necessary but not sufficient |
| Keep old path as a fallback | Easy rollback | Creates parallel runtime behavior and doubles future tests | No; rollback must be version-control based before merge |

## OSS and Browser Integration Gotchas

| Seam | Current-main warning | Required evidence |
|---|---|---|
| Tonal time signatures/durations | Library parses a superset; repo policy supports only five meters and two denominators | Exact locked 4.9.0 behavior plus `music-domain.test.ts`, meter/count-in consumers, and unchanged architecture allowlist |
| Dexie repositories | Database names, schema versions, indexes, parser filtering, and event dispatch vary by repository | Reopen/legacy/malformed/no-op subscription/clear-isolation tests and declared-table transaction analysis |
| Quick/sheet recording saves | Multiple stores use compensating rollback, not one physical transaction | Existing rollback suites plus new failure injection at every changed write |
| MediaRecorder | `isTypeSupported` is advisory; actual recording may still fail, and chosen `mimeType` is observable in export | Capability and fallback tests, supported/unsupported MIME export tests, and Playwright `[chromium]` recording flow |
| Web Audio/object URLs | Contexts, tracks, blobs, timers, and URL references have explicit owners | Close/stop/revoke assertions on success and failure; no leaked timers or URLs |
| PDF.js/React-PDF | Worker must remain local and versions/import paths are coupled | Architecture test, build, relevant viewer unit/E2E, no CDN/network runtime fetch |
| Zustand | Store is ephemeral workflow state only | Store tests remain green and no persist middleware/repository mirroring is introduced |

## Runtime, Bundle, and Scale Traps

| Trap | Symptoms | Prevention | Failure point |
|---|---|---|---|
| Client import widens | New package appears in a `"use client"` import chain | Record Next bundle analyzer output before/after by affected route and environment | Any measurable unexplained client bundle or execution increase makes a tiny LOC win cost-negative |
| Full-table replacement query | Repository helper uses `toArray().filter()` where an indexed query existed, or vice versa with changed ordering | Preserve query/index semantics and test deterministic ordering on reopened data | Local history growth reveals latency and memory regression |
| Resource cleanup removed | Repeated recording/viewing increases active tracks, contexts, URLs, or timers | Assert cleanup in failure and success paths; browser smoke repeated operations | Breaks after repeated use, not the first happy path |
| Dependency drift | Caret manifest and docs differ from locked artifact | Verify lock version, integrity, release/API docs, and lock diff in the PR | Reinstall/upgrade changes behavior despite stable source |

## Security and Licensing Mistakes

| Mistake | Risk | Fail-closed prevention |
|---|---|---|
| Trust package reputation instead of the exact artifact | Supply-chain or version-specific behavior is missed | Record exact version, resolved source, integrity, maintainer/repository provenance, and authoritative docs |
| Add unreviewed install scripts/native/WASM code | Installation executes code or expands attack surface | Veto any new script allowance or executable artifact until separately reviewed and justified |
| Treat a current clean audit as permanent proof | Newly disclosed vulnerabilities or transitive changes escape review | Compare `npm audit --package-lock-only --json` before/after and rerun at verification |
| Ignore license because existing packages are permissive | New dependency may impose incompatible obligations | Record SPDX license and approval for every new runtime/transitive package; unknown license is a veto |
| Load worker/runtime assets from CDN | Violates local-first behavior and adds mutable remote code/data flow | Architecture test and literal URL inspection must remain clean |
| Replace secure randomness with `Math.random` only | Collision/predictability can corrupt local identity links | Preserve secure `randomUUID` when available and explicitly characterize the fallback/prefix contract |

## Behavior and UX Pitfalls

| Pitfall | User impact | Required preservation |
|---|---|---|
| Duration/date formatter “cleanup” | Labels round or localize differently, breaking history comparison and tests | Exact boundary values, invalid dates, UTC/local-day semantics, and current strings |
| MIME simplification | Saved audio cannot replay/export in some browsers or gets the wrong extension | Recorder-selected MIME, supported codec parameters, and unsupported-artifact errors |
| Changed rollback message/state | User sees a completed-looking save with missing artifact or an unexplained failure | Existing atomicity/rollback error paths and settled UI states |
| Storage consolidation | Existing local sheets, sessions, goals, recordings, or references disappear | Legacy fixture reopen and independent clear behavior |
| Persisting ephemeral workflow | Stale rerecord/segment state returns after reload or on another sheet | Zustand reset/scoping behavior and explicit no-persistence boundary |

## Phase 1 Fail-Closed Gates

All rows must be `PASS`. `UNKNOWN`, `SKIPPED`, or unavailable evidence is `BLOCK`.

| Gate | Required evidence | PASS | BLOCK / veto |
|---|---|---|---|
| Baseline identity | Branch `main`, exact HEAD recorded, clean candidate worktree scope | Selection and later diff share a traceable base commit | Detached/other branch, stale evidence, or unexplained working-tree overlap |
| Semantic discovery | Successful Lumen search on exact selection HEAD plus literal verification | Candidate emerged from current-main search and alternatives were considered; current code-focused CLI baseline is satisfied at 345 files / 2,859 chunks with ranked scores 0.85 / 0.81 / 0.68 | Lumen unhealthy/stale/no result, selection HEAD differs without rerun, ignored paths reappear, or evidence comes from an MCP cache retained across ignore changes |
| Reuse proof | Existing project/dependency/OSS symbol, exact version/API, and production call sites | One existing owner can replace one custom owner | New custom implementation or speculative package comparison |
| Behavior characterization | Pre-change tests cover equivalence matrix and fail under intentional perturbation | Accepted/rejected/error/mutation/ordering/fallback behavior is locked | Happy-path snapshots only, mocks above seam, or unknown edge case |
| Mutation/persistence safety | Legacy/reopen/malformed/isolation and failure-injection evidence when relevant | No durable compatibility or rollback change | Any uncharacterized storage key/schema/event/partial write |
| No parallel abstraction | Deletion map, zero retired production callers, one owner/model after diff | OSS/internal reuse is called directly through the existing correct boundary | New facade/compat path, old fallback, duplicated mapping/algorithm |
| Production LOC | Formatted diff, `git diff --numstat` limited to tracked `src/**`, with `deletions > additions`; rename/reformat reviewed using `git diff -M --ignore-all-space` | Strictly positive net deletion and deleted behavior is absent | Zero/positive net LOC, gaming, generated move, or logic merely compressed |
| Dependency cost | Manifest/lock diff, license, scripts, audit delta, transitive count, exact docs | No new dependency, or measured total cost is justified by materially larger retirement | Unknown license/security/scripts/API drift or cost larger than removal |
| Bundle/runtime cost | Next bundle analyzer before/after on affected route when client graph changes | No unexplained client increase; import chain is intentional | Unmeasured or regressed client payload/execution |
| Architecture/debt gates | `validate:debt-gates`, changed Semgrep/XO, `architecture-boundaries.test.ts`, full lint/typecheck | All pass with no new suppression/exception | New exception marker, direct UI infrastructure import, or gate failure |
| Behavior tests | Focused target tests, full unit suite, build, and relevant Playwright `[chromium]` E2E for browser/platform seams | All pass on the reviewed commit | Flaky/skipped test, JSDOM-only browser proof, or untested changed branch |
| Code Health | CodeScene baseline and exact analyzed post-change revision/delta, plus policy review | Baseline availability is satisfied (installation 5/5 and seven scores recorded); changed files show no decline/new severe finding and every touched named hotspot is at least 7.0 | Post-change revision/delta absent, baseline/head mismatch, decline, severe finding, or threshold miss |
| Review and rollback | Reviewer independently traces deletion and a one-commit/version-control revert restores old behavior without data repair | Revert is clean and no irreversible migration shipped | Dual runtime kept “for safety,” destructive migration, or manual user repair needed |

## “Looks Done but Is Not” Checklist

- [ ] **Reuse:** The package is imported, but the old algorithm is still reachable — verify zero production callers and search distinctive branches/error strings.
- [ ] **Slimming:** `src` is net negative, but the lock tree or client bundle grew — verify both external deltas.
- [ ] **Equivalence:** Happy paths match, but invalid/legacy/partial-failure behavior changed — run the full characterization matrix.
- [ ] **Persistence:** Fresh-storage tests pass, but reopened v0/v1 data fails — seed old shapes and reopen the database.
- [ ] **Browser safety:** JSDOM tests pass, but codec/permission/resource behavior is unproven — run relevant Playwright `[chromium]` and explicit cleanup assertions.
- [ ] **Architecture:** Imports compile, but UI now reaches infrastructure or an ephemeral store persists data — run architecture and Semgrep gates.
- [ ] **Code Health:** the pre-change baseline exists, but the exact post-change revision/delta was not analyzed — baseline availability alone is not terminal pass.
- [ ] **Discovery:** the candidate appears in the healthy baseline search, but selection moved to another HEAD, ignore rules changed without rebuild/reload, or literal call-site/test confirmation and alternatives are missing — rebuild/reload, rerun, or complete the selection record before implementation.

## Recovery and Rollback Strategies

| Failure | Recovery cost | Required response |
|---|---|---|
| Weak candidate discovered before coding | LOW | Mark candidate vetoed with the failed gate and evaluate the next current-main semantic result; do not weaken the gate |
| Behavior mismatch during characterization | LOW | Stop implementation, preserve the failing characterization test, and reject or narrow the candidate |
| Partial write/rollback mismatch | HIGH | Revert the implementation before merge; do not patch over it with a second persistence path |
| Bundle/audit/license regression | MEDIUM | Remove the dependency and restore the prior lockfile through a normal revert; prefer installed/internal reuse |
| Code Health decline | MEDIUM | Refactor within the same single owner or reject the candidate; do not add a suppression without an approved no-go decision |
| Post-merge observable regression | HIGH | Revert the single bounded refactor commit/PR, restore the exact locked dependency tree, and verify local data with legacy fixtures before any alternate attempt |

The phase plan should keep the change revertable as one bounded production refactor. It must not ship schema/key migrations for a slimming-only goal unless rollback has been demonstrated with preserved user data; such a candidate is normally too broad for R01.

## Pitfall-to-Phase Mapping

| Pitfall | Prevention point in Phase 1 | Verification |
|---|---|---|
| False semantic equivalence | Candidate approval | Behavior matrix plus pre-change characterization tests against exact library version |
| Persistence compatibility loss | Candidate veto / implementation | Legacy, malformed, reopen, subscription, and clear-isolation tests |
| False transaction / rollback drift | Plan and implementation | Failure injection at each write; existing quick/sheet rollback suites |
| Browser/platform regression | Characterization and verification | Adapter-level tests, relevant Playwright `[chromium]`, cleanup assertions |
| Dependency/bundle cost | Candidate approval and terminal gate | Lock/license/audit/transitive/bundle before-after evidence |
| Wheel under wrapper / LOC gaming | Plan review and diff review | Deletion map, zero retired callers, one model, net-negative formatted `src` diff |
| Incomplete gate evidence | Terminal verification | Full repository gates plus separate CodeScene, E2E, LOC, and discovery evidence |

## Sources

### Current-main primary evidence — HIGH

- `.planning/PROJECT.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`
- `package.json`, `package-lock.json` (lockfile version 3; exact versions, resolved artifacts, integrity, and license metadata)
- `src/domain/music/{time-signature,duration,meter-policy}.ts`; `tests/unit/music-domain.test.ts`
- `src/infrastructure/storage/storage-contracts.ts`; Dexie repositories and repository/service tests listed above
- `src/lib/{quick-metronome/recording-controller,sheet-practice/recording-service}.ts`; rollback test suites listed above
- `src/infrastructure/audio/{browser-recording-capture,browser-audio-decode-adapter}.ts`
- `tests/unit/architecture-boundaries.test.ts`; `.semgrep/*.yml`; `.codescene/{quality-gate-policy.md,code-health-rules.json}`
- `scripts/run-{metronome-semgrep-changed,codescene-debt-changed}.mjs`; `.git/hooks/pre-commit`; `docs/architecture/debt-gate-map.md`
- Root `.lumenignore` and final explicit Lumen CLI rebuild/query on current main: `.planning/`, `.semgrep/`, and `docs/legacy/` excluded; 345 files, 2,859 chunks, 28.059s; Home formatter group 0.85, hook formatter group 0.81, domain `formatTimestamp` 0.68; no ignored-path results. The long-lived MCP's cached 349-file / 2,877-chunk status is not final evidence.
- Local CodeScene current-main evidence: installation verification 5/5; seven recorded file baselines; detailed `home-dashboard.tsx` review reporting Code Duplication at lines 1450-1468 and 1491-1505.

### Verified official documentation — MEDIUM (confidence classified by research seam)

- [Dexie transaction documentation](https://dexie.org/docs/Dexie/Dexie.transaction%28%29)
- [Dexie best practices](https://dexie.org/docs/Tutorial/Best-Practices)
- [Tonal official repository documentation](https://github.com/tonaljs/tonal/blob/main/README.md)
- [MDN: Crypto.randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
- [MDN: MediaRecorder.isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static)
- [MDN: MediaRecorder.mimeType](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/mimeType)
- [MDN: URL.revokeObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)
- [MDN: AudioContext.close](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/close)
- [npm package-lock documentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/)
- [npm audit documentation](https://docs.npmjs.com/cli/audit/)
- [Next.js package bundling guide](https://nextjs.org/docs/pages/guides/package-bundling)

## Open Evidence Gaps

- Baseline semantic discovery is satisfied by the explicit code-focused CLI rebuild. Selection still needs literal call-site/test confirmation and an alternatives record; rerun after a selection-HEAD change, and after an ignore change accept only an explicit rebuilt CLI index or a freshly loaded/restarted MCP host.
- No concrete OSS proposal exists yet, so license, vulnerability, transitive, bundle, and exact API compatibility must be evaluated candidate-by-candidate.
- CodeScene installation and pre-change baselines are satisfied. The exact implementation revision still needs a before/after delta proving no changed-source decline or new severe finding and all applicable policy thresholds.
- `BrowserRecordingService` has broad workflow/E2E coverage but no obvious focused unit suite for its MIME negotiation, track cleanup, and stop-event sequencing. Any candidate touching it needs characterization first.

---
*Pitfalls research for: Metronome v1.1 R01 Evidence-First Code Slimming*
*Researched: 2026-07-21*
