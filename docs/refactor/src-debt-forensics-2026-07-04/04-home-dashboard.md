## Source Debt Forensics: `src/components/home/home-dashboard.tsx`

Status: complete
Date: 2026-07-05
Scope: `src/components/home/home-dashboard.tsx`
Excluded: all `tests/**`, `*.test.*`, `*.spec.*`
Constraint: forensics only; no remediation plan; no test plan

Neighbor files reviewed:
- `src/hooks/use-practice-session-dashboard.ts`
- `src/components/home/continue-practice-navigation.ts`
- `src/components/home/session-comparison-panel.tsx`
- `src/components/app-shell/command-palette-commands.ts`
- `src/domain/practice/validation.ts`
- `src/domain/practice/rules.ts`
- `src/domain/practice/continue-practice.ts`
- `src/domain/practice/recent-activity.ts`
- `src/domain/practice/session-comparison.ts`
- `src/domain/sheet/routes.ts`
- `src/services/practice-session/service.ts`
- `src/services/practice-session/types.ts`
- `src/services/practice-goals/service.ts`
- `src/services/practice-goals/browser-service.ts`
- `src/infrastructure/db/practice-goal-repository.ts`
- `src/app/page.tsx`

### File Overview

- The file is physically large at 1532 lines. CodeScene reports 1124 lines of code after stripping comments.
- The module is not just a page shell. It contains a container mode switch, five inline panels, a form workflow, local async mutation handling, ID/timestamp creation, validation, formatting helpers, navigation guards, and presentation mapping.
- In production, the only non-test caller is `src/app/page.tsx:1-4`, which renders `<HomeDashboard />` without using the exported data-injection surface.
- Git history shows a clear accretion pattern: the file started as the home shell and then absorbed recent activity, continue practice, analytics, streaks, goals, and comparison work as direct append-only slices instead of being split into smaller home modules.

### CodeScene Baseline

Project context:
- `select_project` resolved to CodeScene project `82174` via the default project environment configuration.
- Project page: <https://codescene.io/projects>

File baseline:
- `code_health_score` => `6.46`
- Interpretation: yellow zone technical debt
- `list_technical_debt_hotspots_for_project_file` returned empty `data`, so the file is not a current CodeScene project hotspot even though the score is low.
- Hotspot page for the latest project analysis: <https://codescene.io/projects/82174/jobs/6844258/results/code/technical-debt/system-map?max-code-health=10.00&min-change-freq=0&showHotspotsOnly=true&min-coverage=0.00&max-coverage=100.00#hotspots>

CodeScene review findings:

| Category | Evidence |
|---|---|
| Lines of Code in a Single File | 1124 LoC after comment stripping; Brain Class risk |
| Overall Code Complexity | File-level complexity warning |
| Large Method | `HomeDashboard` at `src/components/home/home-dashboard.tsx:200-408` with 197 LoC |
| Complex Method | `PracticeStreaksPanel` at `855-943`, cyclomatic complexity 15 |
| Complex Method | `PracticeGoalsPanel.handleSubmit` at `514-560`, cyclomatic complexity 9 |
| Complex Method | `PracticeAnalyticsPanel` at `967-1056`, cyclomatic complexity 8 |
| Complex Method | `PracticeGoalsPanel` top-level context at `425-480`, cyclomatic complexity 8 |
| Complex Conditional | `formatPracticeGoalProgress` at `1638-1645` |
| Code Duplication | `formatActivityTime` at `1450-1468` and `formatAnalyticsTimestamp` at `1491-1505` |
| Code Duplication | `formatPracticeGoalProgressValue` at `1660-1666` and `clampGoalProgressRatio` at `1668-1674` |

### Semantic Duplication

1. Repeated status-shell logic across panels

   The same UI state machine shape is copied across multiple inline panels with noun-swapped strings: compute an initial-loading flag, then branch through loading, error, refresh, empty, and unavailable states before rendering the main surface.

   Evidence:
   - `src/components/home/home-dashboard.tsx:461-471,612-725` for goals
   - `src/components/home/home-dashboard.tsx:864-911` for streaks
   - `src/components/home/home-dashboard.tsx:976-1018` for analytics
   - `src/components/home/home-dashboard.tsx:1088-1140` for continue practice
   - `src/components/home/home-dashboard.tsx:1294-1327` for recent activity
   - `src/components/home/session-comparison-panel.tsx:62-105` shows the same pattern already living in a separate file

2. Goal mutation lifecycle duplicated between component and hook

   The home file runs its own async lifecycle with mounted guards, local mutation status, and local error slots while the dashboard hook already owns save/delete status and error state.

   Evidence:
   - Component-local state machine: `src/components/home/home-dashboard.tsx:452-479,514-589`
   - Hook-level state machine: `src/hooks/use-practice-session-dashboard.ts:210-214,405-471`

3. Time and duration formatting duplicated across adjacent home and practice modules

   The same UTC timestamp rendering and human-readable duration logic appears in multiple nearby layers.

   Evidence:
   - Home dashboard helpers: `src/components/home/home-dashboard.tsx:1450-1505`
   - Home dashboard hook helpers: `src/hooks/use-practice-session-dashboard.ts:611-656`
   - Session comparison domain helpers: `src/domain/practice/session-comparison.ts:444-523`
   - Recent activity domain helpers: `src/domain/practice/recent-activity.ts:268-304`

4. Continue-practice presentation mapping duplicated across home surfaces

   The dashboard row builder and the command palette both switch on `ContinuePracticeTargetIdentity.kind` and derive display text from the same target identity with parallel logic.

   Evidence:
   - Dashboard row mapping: `src/components/home/home-dashboard.tsx:1237-1268`
   - Command palette mapping: `src/components/app-shell/command-palette-commands.ts:78-166`

5. Goal progress normalization duplicated with domain rules

   The home file keeps its own goal progress value normalization and ratio clamping even though the domain goal evaluation logic already contains the same ratio clamp concept.

   Evidence:
   - Home file: `src/components/home/home-dashboard.tsx:1660-1674`
   - Domain rules: `src/domain/practice/rules.ts:599-605,611-649`

6. Dashboard state/data surface duplicated between the page and hook layers

   The home file exports a partial dashboard data contract that mirrors the hook result shape instead of consuming one stable dashboard view model.

   Evidence:
   - Home contract: `src/components/home/home-dashboard.tsx:55-103`
   - Hook contract: `src/hooks/use-practice-session-dashboard.ts:23-103`

### Deletion Candidates

1. Dead singular continue-practice path

   `continueTarget` remains in the home and hook state contracts, but the hook always writes `continueTarget: null`, the page never renders it, and the service still carries a parallel singular API.

   Evidence:
   - Home contract: `src/components/home/home-dashboard.tsx:82-86,171-175`
   - Hook state: `src/hooks/use-practice-session-dashboard.ts:68-72,172-176,277-280`
   - Service API residue: `src/services/practice-session/types.ts:143-145`
   - Service implementation residue: `src/services/practice-session/service.ts:815-823`
   - No non-test callers: `rg` over `src` only found the definitions for `getContinuePracticeTarget()`

2. Dead placeholder `recentSheets` and `recentRecordings` props

   These properties are typed as literal empty tuples, defaulted to empty tuples, never read, and coexist with fully static CTA cards instead of data-driven recent lists.

   Evidence:
   - Placeholder contract: `src/components/home/home-dashboard.tsx:99-100`
   - Placeholder defaults: `src/components/home/home-dashboard.tsx:196-197`
   - Static cards instead of reads: `src/components/home/home-dashboard.tsx:345-387`
   - No other non-test references in `src`

3. Unused production injection surface

   `HomeDashboardData`, `createPracticeGoalId`, and `getPracticeGoalNow` widen the runtime contract, but production only renders `<HomeDashboard />` with no injected data object.

   Evidence:
   - Exported injection contract: `src/components/home/home-dashboard.tsx:58-103`
   - Injection usage: `src/components/home/home-dashboard.tsx:325-328,436-450`
   - Only production caller: `src/app/page.tsx:1-4`

4. Duplicate callback aliases

   The file accepts both `savePracticeGoal` and `onSavePracticeGoal`, plus both delete variants, and then merges them at render time with nullish coalescing. The hook also publishes both names for the same functions.

   Evidence:
   - Home contract aliases: `src/components/home/home-dashboard.tsx:67-70`
   - Home merge point: `src/components/home/home-dashboard.tsx:325-326`
   - Hook duplicate export: `src/hooks/use-practice-session-dashboard.ts:93-99,494-500`

5. Duplicate empty-state scaffolding

   The component and hook each define their own empty analytics, recent activity, streaks, session comparison, and goal state objects even though they represent the same read surface.

   Evidence:
   - Home empties: `src/components/home/home-dashboard.tsx:109-198`
   - Hook empties: `src/hooks/use-practice-session-dashboard.ts:105-195`

6. Redundant limit enforcement

   The domain continue-practice selector already slices targets to the configured limit, but the UI slices the limited array again.

   Evidence:
   - Domain limit application: `src/domain/practice/continue-practice.ts:119-125`
   - UI re-slice: `src/components/home/home-dashboard.tsx:1088`

7. Redundant safe href wrapper

   `safelyGetContinuePracticeHref()` wraps a helper that already normalizes IDs and calls pure route builders that do not throw in the reviewed code path.

   Evidence:
   - Wrapper: `src/components/home/home-dashboard.tsx:1275-1282`
   - Helper normalization: `src/components/home/continue-practice-navigation.ts:7-45`
   - Route builders: `src/domain/sheet/routes.ts:1-45`

### Over-Complex Points

1. Implicit container/presentational mode switch by object identity

   `HomeDashboard` decides whether to self-fetch or use injected data via `data === emptyHomeDashboardData`. This makes behavior depend on a sentinel object identity rather than a clear prop or wrapper boundary.

   Evidence:
   - `src/components/home/home-dashboard.tsx:200-202`

2. `PracticeGoalsPanel` is a local state machine, not a simple panel

   It manages form mode, draft state, validation errors, mutation errors, delete confirmation, delete errors, mutation status, submit/delete control flow, and mounted lifecycle concerns. This is a substantial behavior surface inside one inline panel.

   Evidence:
   - `src/components/home/home-dashboard.tsx:425-755`

3. Broad handler contract multiplies control-flow paths

   Save/delete callbacks are optional and may return `Promise<void | boolean> | void | boolean`. The panel must support sync, async, success, false-return, absent-callback, and thrown-error flows.

   Evidence:
   - Contract width: `src/components/home/home-dashboard.tsx:447-448`
   - Submit branching: `src/components/home/home-dashboard.tsx:523-559`
   - Delete branching: `src/components/home/home-dashboard.tsx:563-591`

4. Domain rules live inside the UI file

   The page creates goal IDs, timestamps, enum validation, max target validation, progress wording, and unit selection locally. These are not mere render helpers; they are input and domain-shaping rules.

   Evidence:
   - Goal ID and timestamp creation: `src/components/home/home-dashboard.tsx:71-72,1515-1542`
   - Validation and enum rules: `src/components/home/home-dashboard.tsx:105-107,1545-1591`
   - Goal labeling and unit rules: `src/components/home/home-dashboard.tsx:1593-1658`

5. Long page shell collects every home feature slice

   The main render method is 197 lines long and acts as an index for every home concern. Blame shows multiple feature commits appending to the same section over time rather than shrinking the shell.

   Evidence:
   - Large method: `src/components/home/home-dashboard.tsx:200-408`
   - Feature accretion by blame: `src/components/home/home-dashboard.tsx:203-340`

6. Status handling is stringly coupled across layers

   The hook owns read and mutation statuses, but the component reinterprets them, duplicates the default strings, and adds a second local mutation layer.

   Evidence:
   - Hook error/status strings: `src/hooks/use-practice-session-dashboard.ts:198-206`
   - Component status/error branches: `src/components/home/home-dashboard.tsx:461-471,612-725,864-911,976-1018,1088-1140,1294-1327`

### Existing Primitives Or In-Repo Abstractions That Were Rebuilt

1. `validateLocalPracticeGoal` exists but the UI re-validates a parallel draft format

   The repository and domain already validate `LocalPracticeGoal`, but the page maintains its own enum lists, integer parsing, and max-target rule for the draft workflow.

   Evidence:
   - UI validation: `src/components/home/home-dashboard.tsx:1545-1591`
   - Domain validation schema: `src/domain/practice/validation.ts:166-174,210-217`
   - Repository validation call: `src/infrastructure/db/practice-goal-repository.ts:97-99`

2. `SessionComparisonResult` already exposes metrics and unavailability

   The practice-session service returns a domain result with `metrics` and `unavailable`, but the hook flattens that back into a home-specific candidate display model and the home area renders a separate panel contract.

   Evidence:
   - Service return type: `src/services/practice-session/types.ts:146-151`
   - Service implementation: `src/services/practice-session/service.ts:880-895`
   - Domain output: `src/domain/practice/session-comparison.ts:67-76,111-140,312-337,454-465`
   - Hook re-projection: `src/hooks/use-practice-session-dashboard.ts:504-656`

3. Continue-practice target selection already creates display-bearing data

   The continue-practice and recent-activity domain layers already produce labels, metadata ingredients, disabled reasons, and target identity. The dashboard still adds another mapping layer for row content and availability presentation.

   Evidence:
   - Recent activity display inputs: `src/domain/practice/recent-activity.ts:174-195,250-338`
   - Continue target identity: `src/domain/practice/continue-practice.ts:32-75,156-220`
   - Home row mapping: `src/components/home/home-dashboard.tsx:1145-1272`

4. Home already has an extraction precedent but stops halfway

   Session comparison was split into `session-comparison-panel.tsx`, but analytics, streaks, goals, continue practice, and recent activity remain inline inside the main file.

   Evidence:
   - Extracted panel import: `src/components/home/home-dashboard.tsx:52-53`
   - Remaining inline panel definitions: `src/components/home/home-dashboard.tsx:425-1431`

### Boundary Mixing

1. UI and domain logic are mixed

   The file does not just render domain data. It generates IDs, timestamps, enum guards, target limits, and progress formatting rules.

   Evidence:
   - `src/components/home/home-dashboard.tsx:105-107,1515-1674`

2. UI and service contracts are mixed

   The page accepts service-like save/delete callbacks and negotiates boolean return values, thrown errors, and lifecycle timing itself.

   Evidence:
   - `src/components/home/home-dashboard.tsx:67-72,447-448,514-589`

3. UI and browser-adapter concerns are mixed

   The home panels know about browser unavailability states and carry fallback behavior that depends on how the browser-facing hook chooses to expose missing local capabilities.

   Evidence:
   - `src/components/home/home-dashboard.tsx:867-911`
   - `src/hooks/use-practice-session-dashboard.ts:215-295,473-492`

4. Container and presentational roles are mixed

   The file is both the page data orchestrator and the page presentation surface. It calls `usePracticeSessionDashboard()` directly but also exports a large injected data shape that tries to support external callers.

   Evidence:
   - `src/components/home/home-dashboard.tsx:55-103,200-202`
   - `src/hooks/use-practice-session-dashboard.ts:208-502`

5. Domain read-model boundaries and home view-model boundaries are mixed

   The home area consumes domain selectors from practice services, then adds a second home-specific projection layer in the hook, and finally adds local UI-specific mapping in the page file itself.

   Evidence:
   - Service/domain read selectors: `src/services/practice-session/service.ts:839-895`
   - Hook home projection: `src/hooks/use-practice-session-dashboard.ts:504-656`
   - Page-local mapping: `src/components/home/home-dashboard.tsx:1237-1505`

### Debt Formation Forensics

This section is based on the current code, `git log --follow`, and `git blame` for the target file.

1. The file accumulated feature slices instead of feature boundaries

   Commit history shows a stepwise pattern:
   - `705b008e` initial home shell
   - `dc0c9c61` recent activity UI
   - `c2f54269` continue practice navigation
   - `6b14b66d` analytics UI
   - `c7cbddfa` streaks UI
   - `34cc5fed` goal management UI
   - `bc0b9a2e` session comparison

   These features landed as append-only additions to the same file instead of shrinking the shell after each slice.

2. The home file became the default landing zone for read-model features

   Blame shows one narrow band per feature being inserted into the same main render region between lines `203-340`, then a full goals panel block at `425-853`, then analytics/streak helpers below that.

3. Reuse-first work at the domain/service layer likely shifted complexity upward into the page surface

   The practice-session service stays thin for analytics, streaks, continue practice, and comparison reads. That keeps data access clean, but the page surface absorbs the presentation-specific orchestration, status branching, and helper sprawl.

   Evidence:
   - Thin service selectors: `src/services/practice-session/service.ts:815-895`
   - Thick page surface: `src/components/home/home-dashboard.tsx:200-1674`

4. Test/fallback flexibility leaked into the runtime contract

   The exported `HomeDashboardData` surface, optional callback aliases, injected time/ID factories, and local boolean-or-promise handler support all look like accommodation layers for callers or tests that do not exist in production code.

   Evidence:
   - `src/components/home/home-dashboard.tsx:58-72,103,325-328,447-450`
   - `src/app/page.tsx:1-4`

5. Singular-to-plural continue-practice migration left residue instead of cleanup

   The current UI is based on `continueTargets`, but `continueTarget` and `getContinuePracticeTarget()` still remain as unused parallel artifacts.

   Evidence:
   - `src/components/home/home-dashboard.tsx:82-86`
   - `src/hooks/use-practice-session-dashboard.ts:68-72,277-280`
   - `src/services/practice-session/service.ts:819-823`

### Review-Miss Forensics

This section is inference from the CodeScene snapshot, git history, current contracts, and the shape of the surrounding home/practice code.

1. Project-level debt scans would not naturally prioritize this file

   The file-level hotspot query returned no hotspot entry, so a hotspot-first sweep would skip it even with a `6.46` Code Health score.

2. Slice review could pass while aggregate file quality kept degrading

   Each recent feature commit added a local block that was individually small enough to review as a feature diff. The debt is cumulative across seven commits, not concentrated in one obviously reckless change.

3. The main debt is structural, not behavioral

   The problems here are duplicate view-models, dead props, alias contracts, inline state machines, and leaked domain rules. Those issues rarely fail behavior-focused tests or a correctness-first review loop.

4. Production usage does not exercise the broad injected contract

   The only production caller is `<HomeDashboard />` with no `data` prop. That means a large portion of the widened API surface can sit unchallenged because real runtime flows never use it.

5. Reuse was judged at the service/domain layer, not at the home module boundary

   The adjacent practice service and domain layers do show reuse-oriented selectors. That makes it easier for reviews to approve the feature direction while missing the fact that the home page file itself kept becoming the integration dump site.

6. The extracted `SessionComparisonPanel` may have created a false sense that the module boundary was already improving

   One panel was moved out, but the rest of the file remained inline. That masks the fact that the overall home dashboard still behaves like a brain file.

### Evidence Catalog

| Category | Location | Evidence |
|---|---|---|
| Large file / brain-class risk | `src/components/home/home-dashboard.tsx:200-408` | Main page render alone is 197 LoC; CodeScene flags the file at 1124 LoC after stripping comments. |
| Implicit mode switch | `src/components/home/home-dashboard.tsx:200-202` | Self-fetch vs injected-data mode depends on `data === emptyHomeDashboardData`. |
| Duplicated home contract | `src/components/home/home-dashboard.tsx:55-103` | Home exports a dashboard data contract that mirrors the hook result instead of consuming one stable view model. |
| Duplicated hook contract | `src/hooks/use-practice-session-dashboard.ts:23-103` | Hook publishes parallel status/data/action types that overlap heavily with the page contract. |
| Duplicate empty state objects | `src/components/home/home-dashboard.tsx:109-198` | Home file carries its own empty targets, analytics, streaks, comparison, and goal defaults. |
| Duplicate empty state objects | `src/hooks/use-practice-session-dashboard.ts:105-195` | Hook carries the same empty-state concepts again. |
| Dead singular continue target | `src/components/home/home-dashboard.tsx:82-86` | Singular `continueTarget` remains in the contract but is not used by the current page UI. |
| Dead singular continue target | `src/hooks/use-practice-session-dashboard.ts:68-72,277-280` | Hook keeps the field and sets it to `null` in refresh state updates. |
| Residual singular service API | `src/services/practice-session/service.ts:819-823` | Service still exposes `getContinuePracticeTarget()` alongside plural targets. |
| Placeholder-only props | `src/components/home/home-dashboard.tsx:99-100,196-197` | `recentSheets` and `recentRecordings` are typed and defaulted as empty tuples only. |
| Static recent cards | `src/components/home/home-dashboard.tsx:345-387` | Bottom cards are static CTA blocks and never read the placeholder props. |
| Unused production injection API | `src/app/page.tsx:1-4` | Production renders `<HomeDashboard />` directly; no non-test injected data caller was found in `src`. |
| Duplicate callback aliases | `src/components/home/home-dashboard.tsx:67-70,325-326` | Both save/delete and onSave/onDelete names exist for the same goal actions. |
| Duplicate callback aliases | `src/hooks/use-practice-session-dashboard.ts:93-99,494-500` | Hook also returns both callback names for the same implementations. |
| Duplicated mutation lifecycle | `src/components/home/home-dashboard.tsx:452-479,514-589` | Home file runs mounted guards, local mutation status, submit/delete error handling, and confirm-delete flow itself. |
| Duplicated mutation lifecycle | `src/hooks/use-practice-session-dashboard.ts:405-471` | Hook independently manages saving/deleting status and mutation error state. |
| UI-owned domain rules | `src/components/home/home-dashboard.tsx:1515-1674` | Goal ID generation, timestamping, validation, labeling, units, and progress formatting all live in the page file. |
| Domain validation already exists | `src/domain/practice/validation.ts:166-174,210-217` | `validateLocalPracticeGoal()` already defines the persisted goal constraints. |
| Duplicated ratio clamp | `src/components/home/home-dashboard.tsx:1668-1674` | Home file defines its own ratio clamp helper. |
| Duplicated ratio clamp | `src/domain/practice/rules.ts:599-605,611-649` | Practice goal evaluation already clamps progress ratio in domain rules. |
| Timestamp duplication | `src/components/home/home-dashboard.tsx:1450-1505` | Home file has two UTC timestamp formatters and one duration formatter. |
| Timestamp duplication nearby | `src/hooks/use-practice-session-dashboard.ts:611-656` | Hook has the same timestamp and duration formatting shape for session comparison data. |
| Domain comparison projection already exists | `src/domain/practice/session-comparison.ts:67-76,111-140,312-337,454-465` | Domain result already contains metrics and unavailable sections. |
| Hook rebuilds comparison view model | `src/hooks/use-practice-session-dashboard.ts:504-656` | Hook flattens the domain comparison result into a home-only candidate display model. |
| Continue mapping duplicated | `src/components/home/home-dashboard.tsx:1237-1268` | Dashboard row content is derived from target kind with local switch logic. |
| Continue mapping duplicated elsewhere | `src/components/app-shell/command-palette-commands.ts:78-166` | Command palette repeats kind-based target presentation logic from the same identity type. |
| Recent activity display data already exists | `src/domain/practice/recent-activity.ts:174-195,250-338` | Domain layer already computes `label`, `metadata`, and `disabledReason` for home activity items. |
| Panel accretion by commit band | `src/components/home/home-dashboard.tsx:203-340` | `git blame` shows recent activity, continue practice, analytics, streaks, goals wiring, and comparison arriving as adjacent feature bands. |
| Inline panels remain concentrated | `src/components/home/home-dashboard.tsx:425-1431` | Goals, streaks, analytics, continue practice, recent activity, and many helpers are still defined in one module. |
