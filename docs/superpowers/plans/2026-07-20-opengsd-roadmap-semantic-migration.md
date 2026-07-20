# OpenGSD Completed Legacy Archive and R01 Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate only completed legacy delivery into native OpenGSD history, preserve every unfinished capability in a durable Backlog, freeze `docs/v1/` as the legacy record, and make R01 the only current phase.

**Architecture:** Build a truthful eight-phase legacy staging milestone, verify it, and archive it through OpenGSD's native milestone command. The current milestone then contains only R01; the 32 unfinished capability IDs remain non-phase Backlog rows linked to the frozen legacy source.

**Tech Stack:** OpenGSD 1.7.0, Markdown/JSON planning artifacts, Windows PowerShell, repository-local Node.js 24.17.0, Git hooks.

## Global Constraints

- The approved design source is `docs/superpowers/specs/2026-07-20-opengsd-capability-discovery-design.md`.
- Legacy truth is fixed at 15 modules, 64 capabilities, 13 packs, and 132 slices: 8 completed packs / 83 verified slices and 5 unfinished packs / 49 not-started slices.
- Semantic product truth is exactly 32 Complete / 32 Pending. The old mechanical 37/27 inference is historical only.
- `docs/v1/status.json` remains byte-identical as frozen legacy evidence. It is not deleted or used as current lifecycle authority.
- The five unfinished packs and 49 not-started slices never become current OpenGSD phases or plans.
- No Phase 3.1 is created. The five corrected false completions remain Pending Backlog capabilities.
- R01 is the only newly planned current phase. Do not prewrite its `PLAN.md` before native research and planning.
- Do not add a migration script, validator, status mirror, graph, registry, or second workflow.
- Run each independent review and each gate once. On failure, stop with the exact evidence; do not rerun or weaken the design without user approval.
- Every Git write requires elevated permission. If a commit outlives the initial tool yield, wait on that same process instead of starting another commit.
- Do not change product source or product behavior in this migration.

## File Structure

Create or replace during staging:

- `.planning/PROJECT.md` — living product context and the R01 next-work decision.
- `.planning/REQUIREMENTS.md` — staging contains only the 32 completed legacy capabilities; after archive it contains only R01 milestone requirements.
- `.planning/ROADMAP.md` — staging contains eight completed phases and the Backlog; after archive it contains one current R01 phase and the same Backlog.
- `.planning/STATE.md` — staging completion state, then current R01 state.
- `.planning/phases/01-pack-1-practice-segment-foundation/` through `.planning/phases/08-pack-f-audio-music-library-alignment/` — one compact import PLAN/SUMMARY/VERIFICATION set per completed pack.

Create through native milestone archival:

- `.planning/MILESTONES.md`
- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- `.planning/milestones/v1.0-phases/` — the eight archived completed phase directories.

Modify only to mark the legacy lifecycle as frozen while retaining its content:

- `docs/v1/START-HERE.md`
- `docs/v1/agent-implementation-rules.md`
- `docs/v1/code-review-workflow.md`
- `docs/v1/scheduler-handoff.md`
- `docs/v1/development-plan.md`
- `docs/v1/feature-inventory.md`
- `docs/v1/05f-practice-segments.md`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/product-feature-map.md`

Keep unchanged:

- `docs/v1/status.json` and all legacy product contracts, pack specifications, slice plans, and historical evidence.
- `.planning/config.json`, `AGENTS.md`, and `skills/metronome-policy/SKILL.md` from the completed governance foundation.

---

### Task 1: Build the completed-only legacy staging milestone

**Files:**

- Create/replace: `.planning/PROJECT.md`
- Create/replace: `.planning/REQUIREMENTS.md`
- Create/replace: `.planning/ROADMAP.md`
- Create/replace: `.planning/STATE.md`
- Reconcile: the eight existing `.planning/phases/*/*-PLAN.md` and `*-SUMMARY.md` files

**Interfaces:**

- Consumes: `docs/v1/status.json`, `docs/v1/implementation-slices/product-feature-map.md`, legacy pack files, the approved design, and the already-audited candidate artifacts.
- Produces: an OpenGSD-loadable v1.0 staging milestone with 8 completed phases, 32 completed requirements, 83 verified slice records, and a 32-item non-phase Backlog.

- [ ] **Step 1: Capture the immutable legacy baseline**

Run:

```powershell
$legacyPath = 'docs/v1/status.json'
$legacyHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $legacyPath).Hash
$legacy = Get-Content -Raw -LiteralPath $legacyPath | ConvertFrom-Json
$modules = @($legacy.product.modules)
$features = @($modules | ForEach-Object { $_.features })
$packs = @($legacy.implementation.packs)
$slices = @($packs | ForEach-Object { $_.slices })
[pscustomobject]@{
  Hash = $legacyHash
  Modules = $modules.Count
  Features = $features.Count
  Packs = $packs.Count
  CompletedPacks = @($packs | Where-Object status -eq 'verified').Count
  UnfinishedPacks = @($packs | Where-Object status -eq 'not_started').Count
  Slices = $slices.Count
  VerifiedSlices = @($slices | Where-Object status -eq 'verified').Count
  NotStartedSlices = @($slices | Where-Object status -eq 'not_started').Count
}
```

Expected: `Modules=15`, `Features=64`, `Packs=13`, `CompletedPacks=8`, `UnfinishedPacks=5`, `Slices=132`, `VerifiedSlices=83`, and `NotStartedSlices=49`. Keep the SHA-256 value in execution notes for Task 5; do not commit a hash ledger.

- [ ] **Step 2: Make `PROJECT.md` distinguish validated history, current work, and future backlog**

Write `PROJECT.md` so that:

- `Requirements / Validated` links the 32 evidence-backed capabilities to the v1.0 requirements archive that Task 3 will create.
- `Requirements / Active` contains only the R01 discovery-and-slimming pilot.
- `Context` records 8 completed packs / 83 verified slices and 32 Complete / 32 Pending capabilities.
- `Out of Scope` says the five unfinished pack boundaries and 49 not-started slice decomposition are historical proposals, not the future roadmap.
- `Key Decisions` records completed-only archival, persistent Backlog projection, and R01-only current planning.

- [ ] **Step 3: Split the 64 capability records into 32 completed requirements and 32 Backlog rows**

Retain the exact requirement text, feature key, contract link, runtime link, and evidence link for these completed entries in staging `REQUIREMENTS.md`:

`REQ-004` through `REQ-009`, `REQ-016` through `REQ-038`, `REQ-045`, `REQ-059`, and `REQ-060`.

The resulting file must contain exactly 32 checked requirements, each mapped to one of completed Phases 1-5. Phases 6-8 remain maintenance history and map no product requirement.

Move these exact Pending IDs and stable feature keys into a `ROADMAP.md` `## Backlog` table; preserve each existing contract sentence and legacy contract link verbatim:

| ID | Feature key |
|---|---|
| REQ-001 | `design-style.analytics-visuals` |
| REQ-002 | `design-style.segment-visual-states` |
| REQ-003 | `design-style.review-comparison-views` |
| REQ-010 | `quick.auto-increase` |
| REQ-011 | `quick.mute-training` |
| REQ-012 | `quick.practice-templates` |
| REQ-013 | `quick.warmup-routines` |
| REQ-014 | `quick.tempo-progress-history` |
| REQ-015 | `quick.advanced-countdown` |
| REQ-039 | `markers.categories-severity` |
| REQ-040 | `markers.segment-markers` |
| REQ-041 | `markers.waveform-overlay` |
| REQ-042 | `sessions.event-timeline` |
| REQ-043 | `sessions.segment-sessions` |
| REQ-044 | `sessions.session-history-grouping` |
| REQ-046 | `reference.ab-loop` |
| REQ-047 | `reference.playback-speed` |
| REQ-048 | `reference.manual-offset-alignment` |
| REQ-049 | `reference.segment-binding` |
| REQ-050 | `reference.waveform-display` |
| REQ-051 | `settings.audio-device-selection` |
| REQ-052 | `settings.theme-system` |
| REQ-053 | `settings.notification-settings` |
| REQ-054 | `settings.data-import-export` |
| REQ-055 | `settings.storage-usage-breakdown` |
| REQ-056 | `settings.selective-cleanup` |
| REQ-057 | `practice-session.event-timeline` |
| REQ-058 | `practice-session.segment-history` |
| REQ-061 | `analysis.engine-boundary` |
| REQ-062 | `analysis.peak-precomputation` |
| REQ-063 | `analysis.onset-detection-infrastructure` |
| REQ-064 | `analysis.reference-recording-support` |

Each Backlog row has columns `ID`, `Feature key`, `Required behavior`, `Status`, and `Legacy source`. Every status is `Pending`. Do not add a Phase column.

- [ ] **Step 4: Reduce the staging roadmap to completed history only**

Rewrite the phase portion of `ROADMAP.md` to contain exactly:

- Phase 1 — `pack-1-practice-segment-foundation`
- Phase 2 — `pack-2-segment-take-review`
- Phase 3 — `pack-3-sessions-continue-practice`
- Phase 4 — `pack-4-practice-controls-upgrade`
- Phase 5 — `pack-5-library-viewer-upgrade`
- Phase 6 — `pack-c-codebase-slimming`
- Phase 7 — `pack-d-codebase-slimming-follow-up`
- Phase 8 — `pack-f-audio-music-library-alignment`

Mark all eight complete. Keep exactly the 83 verified slice identities in completed-history traceability. The five unfinished packs and 49 not-started slices remain only in `docs/v1/` and must not appear as phases, plans, or imported completed trace rows.

Phase 3 maps only its nine semantically complete requirements. `REQ-042`, `REQ-043`, `REQ-044`, `REQ-057`, and `REQ-058` appear only in Backlog.

- [ ] **Step 5: Reconcile the eight compact PLAN/SUMMARY pairs**

Require one PLAN and one SUMMARY in each Phase 1-8 directory. Update Phase 3's pair to claim only its nine complete requirements. Remove every reference to Phase 3.1, reopening Phase 3, or executing an unfinished legacy pack.

All eight pairs must continue to state that they are semantic imports of already-completed work, not fabricated executions. Do not create verification reports in this task.

- [ ] **Step 6: Verify the staging artifact model**

Run:

```powershell
$nodePath = Resolve-Path '.\.tools\node-v24.17.0-win-x64\node.exe'
$gsdPath = Join-Path $env:USERPROFILE '.codex\gsd-core\bin\gsd-tools.cjs'
& $nodePath $gsdPath roadmap analyze --raw
& $nodePath $gsdPath state load --raw
```

Expected roadmap fields: `phase_count=8`, `completed_phases=8`, `total_plans=8`, `total_summaries=8`, and `next_phase=null`.

Run a one-time PowerShell reconciliation over `REQUIREMENTS.md` and `ROADMAP.md`. Require 32 checked requirements, 32 unique Backlog IDs, a 64-ID union, no intersection, and inclusion of `REQ-042`, `REQ-043`, `REQ-044`, `REQ-057`, and `REQ-058` in Backlog.

- [ ] **Step 7: Commit the mechanically reconciled staging milestone**

Stage only the four top-level planning artifacts and eight Phase 1-8 directories. Commit with elevated Git permission:

```powershell
git add -- .planning/PROJECT.md .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/STATE.md .planning/phases
git commit -m "Stage completed legacy history for OpenGSD"
```

Expected: the normal pre-commit hook passes; no `docs/v1` or product file is part of this commit.

---

### Task 2: Independently verify and seal the completed legacy milestone

**Files:**

- Create: `.planning/phases/01-pack-1-practice-segment-foundation/01-VERIFICATION.md`
- Create: `.planning/phases/02-pack-2-segment-take-review/02-VERIFICATION.md`
- Create: `.planning/phases/03-pack-3-sessions-continue-practice/03-VERIFICATION.md`
- Create: `.planning/phases/04-pack-4-practice-controls-upgrade/04-VERIFICATION.md`
- Create: `.planning/phases/05-pack-5-library-viewer-upgrade/05-VERIFICATION.md`
- Create: `.planning/phases/06-pack-c-codebase-slimming/06-VERIFICATION.md`
- Create: `.planning/phases/07-pack-d-codebase-slimming-follow-up/07-VERIFICATION.md`
- Create: `.planning/phases/08-pack-f-audio-music-library-alignment/08-VERIFICATION.md`
- External evidence only: `C:\tmp\metronome-opengsd-legacy-completion-review.md`

**Interfaces:**

- Consumes: the Task 1 staging commit, all 32 completed requirement records, reachable runtime, tests, legacy pack evidence, and the actual eight import PLAN/SUMMARY pairs.
- Produces: one bounded independent verdict and eight current passing native verification reports.

- [ ] **Step 1: Dispatch one xhigh read-only semantic reviewer**

Give the reviewer only the approved spec, Task 1 commit, `docs/v1/status.json`, the feature map, completed pack sources, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and the eight import pairs.

Require exhaustive review of every claimed Complete requirement:

`requirement ID -> user-visible contract -> reachable runtime path -> automated or repeatable acceptance evidence -> correct completed phase`.

Require exact terminal output:

- `LEGACY_IMPORT_APPROVED`, or
- `LEGACY_IMPORT_BLOCKED` followed by concrete requirement IDs and evidence gaps.

Save the report outside the repository at `C:\tmp\metronome-opengsd-legacy-completion-review.md`. Do not launch a second reviewer if it blocks or times out.

- [ ] **Step 2: Stop on any semantic blocker**

If the reviewer does not return `LEGACY_IMPORT_APPROVED`, do not create verification reports and do not archive the milestone. Report the evidence to the user and wait for a design or truth correction.

- [ ] **Step 3: Write eight native verification reports after approval**

Use OpenGSD's `verification-report.md` schema. Each report must:

- use `status: passed`;
- be newer than its SUMMARY;
- list the exact phase goal and every mapped completed requirement;
- link runtime and behavioral evidence for product phases;
- verify identity/count preservation for maintenance-only Phases 6-8 without inventing product requirements;
- state that no product code was executed or changed by semantic import;
- contain no human-needed item and no unresolved gap.

- [ ] **Step 4: Verify all eight reports through the native status query**

Run:

```powershell
$nodePath = Resolve-Path '.\.tools\node-v24.17.0-win-x64\node.exe'
$gsdPath = Join-Path $env:USERPROFILE '.codex\gsd-core\bin\gsd-tools.cjs'
Get-ChildItem -Directory -LiteralPath '.planning/phases' | Sort-Object Name | ForEach-Object {
  & $nodePath $gsdPath query verification.status $_.FullName --raw
}
```

Expected: eight results with `status=passed` and none with `missing`, `stale`, `gaps_found`, `human_needed`, or `unknown`.

- [ ] **Step 5: Commit the sealed legacy history**

```powershell
git add -- .planning/phases
git commit -m "Verify completed legacy OpenGSD history"
```

Expected: full pre-commit passes and the diff contains only the eight verification reports plus any reviewer-required evidence-link correction approved by the user.

---

### Task 3: Archive v1.0 through native OpenGSD milestone storage

**Files:**

- Create: `.planning/MILESTONES.md`
- Create: `.planning/milestones/v1.0-ROADMAP.md`
- Create: `.planning/milestones/v1.0-REQUIREMENTS.md`
- Move: `.planning/phases/01-*` through `08-*` to `.planning/milestones/v1.0-phases/`
- Modify: `.planning/ROADMAP.md` and `.planning/STATE.md`
- Remove after safety commit: staging `.planning/REQUIREMENTS.md`

**Interfaces:**

- Consumes: the verified eight-phase staging milestone.
- Produces: native archived v1.0 history plus a safe top-level transition state that retains the 32-item Backlog.

- [ ] **Step 1: Preview native archival without mutation**

Run:

```powershell
$nodePath = Resolve-Path '.\.tools\node-v24.17.0-win-x64\node.exe'
$gsdPath = Join-Path $env:USERPROFILE '.codex\gsd-core\bin\gsd-tools.cjs'
& $nodePath $gsdPath milestone complete v1.0 --name "Legacy Delivered Baseline" --dry-run --raw
```

Expected preview targets:

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- exactly eight Phase 1-8 directories under `.planning/milestones/v1.0-phases/`
- `.planning/MILESTONES.md` and `.planning/STATE.md` updates

If any unfinished legacy phase appears in the preview, stop.

- [ ] **Step 2: Run the native archive command once**

```powershell
& $nodePath $gsdPath milestone complete v1.0 --name "Legacy Delivered Baseline" --raw
```

Do not pass `--force` or `--no-archive-phases`.

- [ ] **Step 3: Normalize links inside the moved archive**

Update archived PLAN/SUMMARY/VERIFICATION links so that:

- archived requirement links target `../../v1.0-REQUIREMENTS.md` from each archived phase directory;
- archived roadmap links target `../../v1.0-ROADMAP.md`;
- legacy source and evidence links climb to repository root and target `../../../../docs/v1/...`, `../../../../src/...`, or `../../../../tests/...` as applicable;
- no archived file links to the soon-to-be-replaced top-level `.planning/REQUIREMENTS.md`.

This is a mechanical link repair caused by OpenGSD's native directory move; it must not change status or requirement truth.

- [ ] **Step 4: Rewrite top-level roadmap to the archive transition view**

Keep:

- a shipped v1.0 milestone summary linking `.planning/milestones/v1.0-ROADMAP.md`;
- the exact 32-row `## Backlog` table from Task 1.

Do not include an active phase yet. This transition commit exists only to satisfy OpenGSD's safety-commit ordering before current v1.1 artifacts are created.

- [ ] **Step 5: Make the native archive safety commit**

```powershell
git add -A -- .planning
git commit -m "Archive the completed legacy milestone"
```

Expected: the archive exists in Git before staging requirements are removed.

- [ ] **Step 6: Remove only the staging requirements file and commit the transition**

```powershell
git rm .planning/REQUIREMENTS.md
git commit -m "Close legacy milestone requirements"
```

Expected: `v1.0-REQUIREMENTS.md` remains committed and contains all 32 Complete IDs; only the top-level staging copy is removed.

---

### Task 4: Create the R01-only current milestone and freeze legacy lifecycle docs

**Files:**

- Modify: `.planning/PROJECT.md`
- Create: `.planning/REQUIREMENTS.md`
- Modify: `.planning/ROADMAP.md`
- Modify: `.planning/STATE.md`
- Modify with archive markers: the nine `docs/v1` lifecycle files listed in File Structure
- Keep byte-identical: `docs/v1/status.json`

**Interfaces:**

- Consumes: archived v1.0 history, the exact 32-row Backlog, and the approved R01 governance design.
- Produces: current milestone v1.1 with one unplanned Phase 9 for R01 and an explicit frozen legacy archive.

- [ ] **Step 1: Create current R01 requirements**

Create four unchecked current-milestone requirements:

- `R01-01`: The sheet re-recording workflow retains its existing observable behavior and automated acceptance evidence throughout the refactor.
- `R01-02`: Level 2 research resolves each required behavior against local code, installed dependencies, and authoritative platform/OSS evidence before implementation planning.
- `R01-03`: Any implementation introduces only an explicitly approved surface and retires redundant production responsibility rather than relocating it.
- `R01-04`: Verification reports preserved behavior, retired production LOC, added and net production LOC, Code Health, and remaining complexity separately.

Map all four to Phase 9 with `Pending` status. Do not copy the 32 future product capabilities into current `REQUIREMENTS.md`.

- [ ] **Step 2: Create the one-phase current roadmap**

Write current milestone v1.1 with:

- one shipped v1.0 milestone link;
- exactly one current phase, `Phase 9: R01 Sheet Re-record Source Validation Slimming Pilot`;
- dependencies: archived v1.0 baseline;
- requirements: `R01-01` through `R01-04`;
- success criteria copied from those four requirements;
- zero plans and no Phase 9 directory;
- the unchanged 32-row `## Backlog` table.

The next action is native R01 preflight/research, not an imported unfinished product pack.

- [ ] **Step 3: Reset current state to R01 planning**

Set `STATE.md` to:

- milestone `v1.1`, status `planning`;
- 1 current phase, 0 completed phases, 0 plans, and 0 percent;
- current focus Phase 9;
- next action: Lumen/Ollama readiness followed by native R01 Level 2 research;
- no product capability removed from Backlog;
- no legacy pack listed as current work.

- [ ] **Step 4: Evolve `PROJECT.md`**

Link 32 validated capabilities to `.planning/milestones/v1.0-REQUIREMENTS.md`. Keep only R01 under `Requirements / Active`. Point future product work to the `ROADMAP.md` Backlog and state that future milestones are redesigned from selected capabilities rather than legacy packs.

- [ ] **Step 5: Mark `docs/v1/` as a frozen archive without deleting its contents**

Prepend a consistent warning to the nine lifecycle files:

> Frozen legacy v1 record. Preserve for historical product, pack, slice, and evidence context. Do not use this document or `status.json` as current lifecycle authority. Current project state is under `.planning/` and routing starts with `$gsd-next`.

Retain the original body below the warning. In `05f-practice-segments.md`, label the four `contract_ready` predicates as historical legacy readiness records and point current readiness to OpenGSD; do not change the product behavior contracts.

- [ ] **Step 6: Verify current native routing and archive immutability**

Run:

```powershell
$nodePath = Resolve-Path '.\.tools\node-v24.17.0-win-x64\node.exe'
$gsdPath = Join-Path $env:USERPROFILE '.codex\gsd-core\bin\gsd-tools.cjs'
& $nodePath $gsdPath roadmap analyze --raw
& $nodePath $gsdPath state load --raw
Get-FileHash -Algorithm SHA256 -LiteralPath 'docs/v1/status.json'
```

Expected roadmap fields: `phase_count=1`, `completed_phases=0`, `total_plans=0`, and `next_phase=9`. The status hash must equal Task 1.

- [ ] **Step 7: Commit current R01 cutover**

```powershell
git add -- .planning/PROJECT.md .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/STATE.md docs/v1/START-HERE.md docs/v1/agent-implementation-rules.md docs/v1/code-review-workflow.md docs/v1/scheduler-handoff.md docs/v1/development-plan.md docs/v1/feature-inventory.md docs/v1/05f-practice-segments.md docs/v1/implementation-slices/README.md docs/v1/implementation-slices/product-feature-map.md
git commit -m "Open R01 with the legacy capability backlog"
```

Expected: full pre-commit passes; `docs/v1/status.json` is not staged.

---

### Task 5: Prove final cutover consistency

**Files:** read-only verification; no new repository artifact.

**Interfaces:**

- Consumes: the committed v1.0 archive and current v1.1 artifacts.
- Produces: a final migration verdict and handoff to the Lumen/Ollama R01 preflight plan.

- [ ] **Step 1: Verify archive inventory**

Require:

- 8 archived phase directories;
- 8 PLAN files;
- 8 SUMMARY files;
- 8 passed, non-stale VERIFICATION files;
- 32 checked archived requirements;
- 83 verified legacy slice identities in archived completed history;
- no unfinished pack phase and no not-started slice represented as completed history.

- [ ] **Step 2: Verify capability conservation**

Parse archived `v1.0-REQUIREMENTS.md` and current `ROADMAP.md`. Require:

- 32 unique Complete IDs in the archive;
- 32 unique Pending IDs in Backlog;
- union size 64 and intersection size 0;
- all 64 original feature keys present exactly once across those two sets;
- all five corrected false completions in Backlog.

- [ ] **Step 3: Verify lifecycle isolation**

Require:

- current roadmap has only Phase 9;
- current requirements contain only `R01-01` through `R01-04`;
- `roadmap analyze` reports Phase 9 as next;
- `docs/v1/START-HERE.md` begins with the frozen archive warning;
- `docs/v1/status.json` still exists and matches its Task 1 SHA-256;
- root `AGENTS.md` still routes to native OpenGSD;
- no current OpenGSD artifact links an unfinished product capability to a legacy phase.

- [ ] **Step 4: Check all changed local Markdown links**

Run one disposable PowerShell link scan over `.planning` and the nine modified `docs/v1` files. Ignore HTTP(S), mail, and fragment-only links. Resolve every remaining link relative to its containing file and require zero missing paths. Do not commit the scanner.

- [ ] **Step 5: Confirm repository and hook state**

Run:

```powershell
git status --short
git log -5 --oneline
```

Expected: only unrelated user-owned changes, if any, remain. All migration commits already passed the normal hook, so do not rerun the full hook or E2E suite solely to repeat evidence.

Return:

- `MIGRATION_APPROVED` with the exact 8/83, 32/32, 64-union, archive-path, Backlog, and current-Phase-9 evidence; or
- `MIGRATION_BLOCKED` with the failed invariant and file path.

Do not begin Lumen/Ollama or R01 execution on `MIGRATION_BLOCKED`.

## Acceptance Criteria

- `docs/v1/` remains the complete frozen legacy record, including byte-identical `status.json`, all 13 pack records, and all 132 slice identities.
- Native OpenGSD completed history contains only 8 completed packs, 83 verified slices, and 32 evidence-backed Complete capabilities.
- Native archived verification is passed and current for all eight completed phases.
- The five unfinished packs and 49 not-started slices are never imported as current phases or plans.
- Current `ROADMAP.md` contains only R01 Phase 9 and exactly 32 Pending Backlog capabilities.
- Current `REQUIREMENTS.md` contains only `R01-01` through `R01-04`.
- The archived Complete set and active Backlog form an exact, non-overlapping 64-capability union.
- No Phase 3.1, status mirror, migration validator, graph, registry, or custom lifecycle is added.
- No product source or behavior changes.
- Every Git commit uses normal hooks and elevated Git permission without blind retry.
