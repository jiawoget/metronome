# OpenGSD Completed Legacy Archive Migration Plan (Executed Historical Record)

> **Status:** Executed historical migration plan, subsequently repaired through whole-branch review. Do not execute these tasks again. Checked steps record completed historical work. The repaired final state uses native dormant seeds as the sole deferred-capability carrier, leaves the primary repository between milestones, and keeps the R-01 proof under its separate pending isolated pilot contract. A late task review after commit `3baa742` invalidated promotion until the future seed-promotion transaction was made atomic; that later contract is recorded below and does not rewrite the checked migration actions.

**Goal:** Migrate only completed legacy delivery into native OpenGSD history, preserve every unfinished capability durably, and freeze `docs/v1/` as the legacy record. Review repaired the initial Backlog/R01 cutover so the durable result is 32 archived Complete capabilities plus 32 dormant native seeds while the primary repository awaits its next real milestone.

**Architecture:** The executed migration built a truthful eight-phase legacy staging milestone, verified it, and archived it through OpenGSD's native milestone command. The repaired primary repository now has zero current phases or plans and no top-level `REQUIREMENTS.md`; 32 dormant `.planning/seeds/SEED-*.md` files carry all Pending/unimplemented capability truth into native `$gsd-new-milestone` questioning. The separate historical-base R-01 pilot is the only R-01 execution contract and never mutates or merges into primary-repository lifecycle state. Final pull-request review remains a separate read-only `@codex` gate, not another lifecycle.

Native active-only progress therefore reports `0/0 plans (0%)`. The 100% progress retained in `STATE.md` is explicitly archived v1.0 history: 8 completed archived phases and 8 completed archived plans, not current work.

Seed promotion preserves one authoritative carrier per deferred legacy capability. Surfacing or selecting a seed does not consume it. Keep it until an approved current `REQUIREMENTS.md` contains the same legacy capability ID, feature key, and required behavior, then delete it in that same planning commit. If approval does not occur, keep the seed; unselected seeds remain untouched. OpenGSD does not delete seeds automatically, and no consumed or implemented seed state is introduced. After promotion, native requirements, PLAN/SUMMARY/VERIFICATION artifacts, and milestone archives carry implementation and completion truth.

Late atomic transaction repair, added after the checked migration work:

1. Immediately before the requirements commit, require an empty index, no `MERGE_HEAD`, an existing `.planning/seeds` directory, and an exact `git status --porcelain=v1 --untracked-files=all -- .planning` path set containing only the current `.planning/REQUIREMENTS.md` add/modify and the expected matching selected-seed deletions. Stop without cleaning, staging, or rewriting history on any mismatch; rejected, unmatched, and unselected seeds remain unchanged.
2. Override the native requirements command with `gsd_run query commit "docs: define milestone v[X.Y] requirements" --files .planning/REQUIREMENTS.md .planning/seeds`. OpenGSD 1.7.0 skips explicitly named paths that no longer exist, so individual deleted seed paths cannot stage their deletions. The existing directory pathspec is the proven native mechanism: an isolated real helper run committed exactly modified `REQUIREMENTS.md` plus the matching deleted seed while an unrelated `.planning/UNRELATED.md` remained outside the commit. Never use an explicit deleted-file path, an unscoped helper call, or the helper's merge fallback.
3. After the helper commits, require an empty index and use `git diff-tree --no-commit-id --name-status -r HEAD` to require the exact commit set: only added/modified `.planning/REQUIREMENTS.md` and the expected deleted matching seeds. Confirm rejected, unmatched, and unselected seeds remain unchanged; otherwise stop without cleaning or rewriting history.

**Tech Stack:** OpenGSD 1.7.0, Markdown/JSON planning artifacts, Windows PowerShell, repository-local Node.js 24.17.0, Git hooks.

## Global Constraints

- The approved design source is `docs/superpowers/specs/2026-07-20-opengsd-capability-discovery-design.md`.
- Legacy truth is fixed at 15 modules, 64 capabilities, 13 packs, and 132 slices: 8 completed packs / 83 verified slices and 5 unfinished packs / 49 not-started slices.
- Semantic product truth is exactly 32 Complete / 32 Pending. The old mechanical 37/27 inference is historical only.
- `docs/v1/status.json` remains byte-identical as frozen legacy evidence. It is not deleted or used as current lifecycle authority.
- The local `docs/v1/code-review-workflow.md` remains ignored, untracked, and uncommitted and must be absent from migration diff, index, staging, and commit scope. Do not modify `.git/info/exclude`. The file's local bytes and local edit history are outside migration acceptance.
- The five unfinished packs and 49 not-started slices never become current OpenGSD phases or plans.
- No Phase 3.1 is created. The five corrected false completions remain Pending/unimplemented dormant seeds.
- R01 is not a current primary-repository phase. Its only execution contract is the pending isolated historical-base pilot plan, where it is native Phase 1 and pilot code never merges.
- Do not add a migration script, validator, status mirror, graph, registry, or second workflow.
- Run each independent review once. On failure, stop with the exact evidence; do not rerun or weaken the design without user approval.
- The user explicitly authorized `--no-verify` for intermediate planning-only checkpoint commits in Tasks 1-3. Commit `3baa742` subsequently passed one normal full pre-commit hook, but late task review found the future seed-promotion transaction non-atomic and invalidated promotion until this repair. The next exact repaired candidate must pass one new normal full hook before promotion. That controller-owned run is an approved review-driven validation, not a blind retry.
- Every Git write requires elevated permission. If the final verified commit outlives the initial tool yield, wait on that same process instead of starting another commit.
- Do not change product source or product behavior in this migration.
- Final pull-request review is performed read-only by `@codex` through `skills/reviewing-metronome-prs/SKILL.md`; it does not replace or orchestrate native OpenGSD.

## File Structure

Created or replaced during the historical staging sequence:

- `.planning/PROJECT.md` — living product context, now explicitly between milestones.
- `.planning/REQUIREMENTS.md` — contained only the 32 completed legacy capabilities during staging and was removed after archival; no current file exists.
- `.planning/ROADMAP.md` — contained eight completed phases and an interim Backlog during staging; it now has only the shipped v1.0 link and between-milestones transition state.
- `.planning/STATE.md` — records v1.0 complete with 8 completed phases/plans and `Awaiting next milestone`.
- `.planning/seeds/` — exactly 32 dormant native seeds carrying the Pending/unimplemented capabilities.
- `.planning/phases/01-pack-1-practice-segment-foundation/` through `.planning/phases/08-pack-f-audio-music-library-alignment/` — one compact import PLAN/SUMMARY/VERIFICATION set per completed pack.

Create through native milestone archival:

- `.planning/MILESTONES.md`
- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- `.planning/milestones/v1.0-phases/` — the eight archived completed phase directories.
- `.planning/milestones/v1.0-SEMANTIC-IMPORT-AUDIT.md` — durable independent semantic review evidence reached by all eight verifications.

Modify only to mark the eight tracked legacy lifecycle entrypoints as frozen while retaining their content:

- `docs/v1/START-HERE.md`
- `docs/v1/agent-implementation-rules.md`
- `docs/v1/scheduler-handoff.md`
- `docs/v1/development-plan.md`
- `docs/v1/feature-inventory.md`
- `docs/v1/05f-practice-segments.md`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/product-feature-map.md`

Create the thin final-review interface:

- `skills/reviewing-metronome-prs/SKILL.md` — concise read-only final PR-review contract.
- `skills/reviewing-metronome-prs/agents/openai.yaml` — generated skill interface metadata.

Modify the thin index and decision records:

- `AGENTS.md` — retain native lifecycle routing and the `@codex` final-review index; whole-branch task review later added one `$gsd-new-milestone` controller rule for the selected-seed carrier transfer, and late task review made its native atomic mechanics explicit.
- `docs/superpowers/specs/2026-07-20-opengsd-capability-discovery-design.md` — record the final-review architecture and ignored-file correction.
- `docs/superpowers/plans/2026-07-20-opengsd-roadmap-semantic-migration.md` — keep Task 4 and Task 5 consistent with the user decision.

Keep immutable repository-controlled inputs unchanged:

- `docs/v1/status.json` and all legacy product contracts, pack specifications, slice plans, and historical evidence.
- `.planning/config.json` from the completed governance foundation.

Historical scope note: the original migration reused `skills/metronome-policy/SKILL.md` unchanged. Whole-branch repair later extended that policy only with `Dormant seed promotion` and added the matching thin root `AGENTS.md` controller rule because `agent_skills` injects the policy into six mapped subagents, not the native `$gsd-new-milestone` controller or every lifecycle actor. Late task review subsequently repaired only that controller rule's commit mechanics; it did not change the policy, config, seeds, source, tests, or architecture.

Local-only exclusion:

- `docs/v1/code-review-workflow.md` remains ignored, untracked, and uncommitted and is absent from migration diff, index, staging, and commit scope. `.git/info/exclude` is not modified. The file's local bytes and local edit history are outside migration acceptance.

---

### Task 1: Build the completed-only legacy staging milestone

**Files:**

- Create/replace: `.planning/PROJECT.md`
- Create/replace: `.planning/REQUIREMENTS.md`
- Create/replace: `.planning/ROADMAP.md`
- Create/replace: `.planning/STATE.md`
- Reconcile: the eight existing `.planning/phases/*/*-PLAN.md` and `*-SUMMARY.md` files

**Interfaces:**

- Consumes: `docs/v1/status.json`, `docs/v1/implementation-slices/product-feature-map.md`, the linked frozen legacy product, pack, and slice contracts, reachable runtime and evidence, and the approved design.
- Produces: the historical interim OpenGSD-loadable v1.0 staging milestone with 8 completed phases, 32 completed requirements, 83 verified slice records, and the then-used 32-item non-phase Backlog.
- Source authority: preserve the stable `REQ-` IDs, feature keys, and authoritative 32 Complete / 32 Pending truth, then semantically reconcile every migrated record to the frozen sources above.
- Non-authority: any overwritten pre-migration candidate is implementation scratch, not an input authority. Byte-for-byte or verbatim equality to that candidate is not a Task 1 acceptance criterion.

- [x] **Step 1: Capture the immutable legacy baseline**

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

- [x] **Step 2: Make the historical staging `PROJECT.md` distinguish validated history, then-current work, and the interim future backlog**

Write `PROJECT.md` so that:

- `Requirements / Validated` links the 32 evidence-backed capabilities to the v1.0 requirements archive that Task 3 will create.
- During the now-superseded interim cutover, `Requirements / Active` contained only the R01 discovery-and-slimming pilot; the repaired final `Active` section is empty between milestones.
- `Context` records 8 completed packs / 83 verified slices and 32 Complete / 32 Pending capabilities.
- `Out of Scope` says the five unfinished pack boundaries and 49 not-started slice decomposition are historical proposals, not the future roadmap.
- `Key Decisions` historically recorded completed-only archival plus the then-proposed Backlog/R01 cutover; whole-branch review later superseded that interim architecture with native dormant seeds and a between-milestones primary state.

- [x] **Step 3: Split the 64 capability records into 32 completed requirements and 32 Backlog rows**

Preserve the stable requirement IDs, feature keys, and Complete classification for these entries in staging `REQUIREMENTS.md`. Semantically reconcile each required-behavior sentence, contract link, runtime link, and evidence link to `docs/v1/status.json`, the product-feature map, its linked frozen legacy contract, and reachable runtime/evidence:

`REQ-004` through `REQ-009`, `REQ-016` through `REQ-038`, `REQ-045`, `REQ-059`, and `REQ-060`.

The resulting file must contain exactly 32 checked requirements, each mapped to one of completed Phases 1-5. Phases 6-8 remain maintenance history and map no product requirement.

Move these exact Pending IDs and stable feature keys into a `ROADMAP.md` `## Backlog` table. Source-ground each `Required behavior` sentence and `Legacy source` link in the product-feature map and its linked frozen legacy contract:

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

- [x] **Step 4: Reduce the staging roadmap to completed history only**

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

- [x] **Step 5: Reconcile the eight compact PLAN/SUMMARY pairs**

Require one PLAN and one SUMMARY in each Phase 1-8 directory. Update Phase 3's pair to claim only its nine complete requirements. Remove every reference to Phase 3.1, reopening Phase 3, or executing an unfinished legacy pack.

All eight pairs must continue to state that they are semantic imports of already-completed work, not fabricated executions. Do not create verification reports in this task.

- [x] **Step 6: Verify the staging artifact model**

Run:

```powershell
$nodePath = Resolve-Path '.\.tools\node-v24.17.0-win-x64\node.exe'
$gsdPath = Join-Path $env:USERPROFILE '.codex\gsd-core\bin\gsd-tools.cjs'
& $nodePath $gsdPath roadmap analyze --raw
& $nodePath $gsdPath state json --raw
```

Expected roadmap fields: `phase_count=8`, `completed_phases=8`, `total_plans=8`, `total_summaries=8`, and `next_phase=null`.

Run a one-time PowerShell reconciliation over `REQUIREMENTS.md` and `ROADMAP.md`. Require 32 checked requirements, 32 unique Backlog IDs, a 64-ID union, no intersection, and inclusion of `REQ-042`, `REQ-043`, `REQ-044`, `REQ-057`, and `REQ-058` in Backlog.

Also require authoritative-source reconciliation: every completed behavior and contract/runtime/evidence link is semantically supported by `docs/v1/status.json`, the product-feature map, the linked frozen legacy contracts, and reachable runtime/evidence; every Pending Backlog behavior and legacy link is grounded in the product-feature map and linked frozen contract. Do not compare against, hash, or require literal equality with an overwritten candidate artifact.

- [x] **Step 7: Commit the mechanically reconciled staging milestone**

Stage only the four top-level planning artifacts and eight Phase 1-8 directories. Commit with elevated Git permission:

```powershell
git add -- .planning/PROJECT.md .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/STATE.md .planning/phases
git commit --no-verify -m "Stage completed legacy history for OpenGSD"
```

Expected: this user-authorized planning-only checkpoint skips the hook; no `docs/v1` or product file is part of this commit.

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
- Independent evidence: originally produced outside the repository and now preserved durably in `.planning/milestones/v1.0-SEMANTIC-IMPORT-AUDIT.md`

**Interfaces:**

- Consumes: the Task 1 staging commit, all 32 completed requirement records, reachable runtime, tests, legacy pack evidence, and the actual eight import PLAN/SUMMARY pairs.
- Produces: one bounded independent verdict and eight current passing native verification reports.

- [x] **Step 1: Dispatch one xhigh read-only semantic reviewer**

Give the reviewer only the approved spec, Task 1 commit, `docs/v1/status.json`, the feature map, completed pack sources, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and the eight import pairs.

Require exhaustive review of every claimed Complete requirement:

`requirement ID -> user-visible contract -> reachable runtime path -> automated or repeatable acceptance evidence -> correct completed phase`.

Require exact terminal output:

- `LEGACY_IMPORT_APPROVED`, or
- `LEGACY_IMPORT_BLOCKED` followed by concrete requirement IDs and evidence gaps.

The executed review originally saved its report outside the repository. Whole-branch repair preserved its substantive audit and final verdict in `.planning/milestones/v1.0-SEMANTIC-IMPORT-AUDIT.md`. Do not launch a second reviewer or rerun this historical stage.

- [x] **Step 2: Stop on any semantic blocker**

If the reviewer does not return `LEGACY_IMPORT_APPROVED`, do not create verification reports and do not archive the milestone. Report the evidence to the user and wait for a design or truth correction.

- [x] **Step 3: Write eight native verification reports after approval**

Use OpenGSD's `verification-report.md` schema. Each report must:

- use `status: passed`;
- be newer than its SUMMARY;
- list the exact phase goal and every mapped completed requirement;
- link runtime and behavioral evidence for product phases;
- verify identity/count preservation for maintenance-only Phases 6-8 without inventing product requirements;
- state that no product code was executed or changed by semantic import;
- contain no human-needed item and no unresolved gap.

- [x] **Step 4: Verify all eight reports through the native status query**

Run:

```powershell
$nodePath = Resolve-Path '.\.tools\node-v24.17.0-win-x64\node.exe'
$gsdPath = Join-Path $env:USERPROFILE '.codex\gsd-core\bin\gsd-tools.cjs'
Get-ChildItem -Directory -LiteralPath '.planning/phases' | Sort-Object Name | ForEach-Object {
  & $nodePath $gsdPath query verification.status $_.FullName --raw
}
```

Expected: eight results with `status=passed` and none with `missing`, `stale`, `gaps_found`, `human_needed`, or `unknown`.

- [x] **Step 5: Commit the sealed legacy history**

```powershell
git add -- .planning/phases
git commit --no-verify -m "Verify completed legacy OpenGSD history"
```

Expected: this user-authorized planning-only checkpoint skips the hook, and the diff contains only the eight verification reports plus any reviewer-required evidence-link correction approved by the user.

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
- Produces: native archived v1.0 history plus the historical safety-commit transition state that temporarily retained the 32-item Backlog before review repair converted it to dormant seeds.

- [x] **Step 1: Preview native archival without mutation**

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

- [x] **Step 2: Run the native archive command once**

```powershell
& $nodePath $gsdPath milestone complete v1.0 --name "Legacy Delivered Baseline" --raw
```

Do not pass `--force` or `--no-archive-phases`.

- [x] **Step 3: Normalize links inside the moved archive**

Update archived PLAN/SUMMARY/VERIFICATION links so that:

- archived requirement links target `../../v1.0-REQUIREMENTS.md` from each archived phase directory;
- archived roadmap links target `../../v1.0-ROADMAP.md`;
- legacy source and evidence links climb to repository root and target `../../../../docs/v1/...`, `../../../../src/...`, or `../../../../tests/...` as applicable;
- no archived file links to the soon-to-be-replaced top-level `.planning/REQUIREMENTS.md`.

This is a mechanical link repair caused by OpenGSD's native directory move; it must not change status or requirement truth.

- [x] **Step 4: Rewrite top-level roadmap to the archive transition view**

Keep:

- a shipped v1.0 milestone summary linking `.planning/milestones/v1.0-ROADMAP.md`;
- the exact 32-row `## Backlog` table from Task 1.

Do not include an active phase yet. This transition commit exists only to satisfy OpenGSD's safety-commit ordering before current v1.1 artifacts are created.

- [x] **Step 5: Make the native archive safety commit**

```powershell
git add -A -- .planning
git commit --no-verify -m "Archive the completed legacy milestone"
```

Expected: the archive exists in Git before staging requirements are removed.

- [x] **Step 6: Remove only the staging requirements file and commit the transition**

```powershell
git rm .planning/REQUIREMENTS.md
git commit --no-verify -m "Close legacy milestone requirements"
```

Expected: `v1.0-REQUIREMENTS.md` remains committed and contains all 32 Complete IDs; only the top-level staging copy is removed.

---

### Task 4: Repair the final between-milestones state and freeze legacy lifecycle docs

**Files:**

- Modify: `.planning/PROJECT.md`
- Delete: `.planning/REQUIREMENTS.md`
- Modify: `.planning/ROADMAP.md`
- Modify: `.planning/STATE.md`
- Create: exactly 32 `.planning/seeds/SEED-*.md` native dormant capability seeds
- Create: `.planning/milestones/v1.0-SEMANTIC-IMPORT-AUDIT.md`
- Repair: the eight archived PLAN/SUMMARY pairs and eight archived VERIFICATION files
- Modify with archive markers: the eight tracked `docs/v1` lifecycle files listed in File Structure
- Modify: `AGENTS.md`
- Create: `skills/reviewing-metronome-prs/SKILL.md`
- Create: `skills/reviewing-metronome-prs/agents/openai.yaml`
- Modify: the approved design and this migration plan
- Modify: the executed governance foundation plan and pending isolated R-01 pilot plan
- Exclude from repository scope: `docs/v1/code-review-workflow.md` remains ignored, untracked, and uncommitted and is absent from diff, index, staging, and commit; `.git/info/exclude` is not modified; the ignored file's local bytes and local edit history are outside migration acceptance
- Keep byte-identical: `docs/v1/status.json`

**Interfaces:**

- Consumes: archived v1.0 history, the exact 32-row interim Backlog at the pre-repair head, the pinned native seed/new-milestone contract, and the approved governance design.
- Produces: a primary repository between milestones with zero current phases/plans, 32 native dormant seeds as sole deferred-capability truth, portable and repaired archive provenance, a pending isolated historical-base R-01 contract, and the existing thin read-only `@codex` final-review interface.

- [x] **Step 1: Replace the non-durable Backlog with native dormant seeds**

Consume the exact 32 Pending rows from the pre-repair `ROADMAP.md` in their existing order. Create `SEED-001` through `SEED-032` under `.planning/seeds/`, with each unique filename containing its legacy `REQ-nnn` identity and a concise slug.

Each seed uses native frontmatter (`id`, `status: dormant`, `planted: 2026-07-20`, `planted_during`, behavior/category-specific `trigger_when`, `scope: unknown`) and the standard sections `Why This Matters`, `When to Surface`, `Scope Estimate`, `Breadcrumbs`, and `Notes`. Preserve exactly once the legacy capability ID, feature key, required behavior, Pending/unimplemented truth, reachable legacy-source link, and frozen v1.0 roadmap link. Do not preselect a milestone, phase, owner, implementation, API, helper, or dependency.

At future milestone definition, a surfaced or selected seed remains authoritative until the matching requirement is approved. The same planning commit that approves the matching legacy capability ID, feature key, and required behavior deletes that seed. This is a project-policy action, not automatic OpenGSD behavior; if approval does not occur, keep the seed.

Delete the current top-level `REQUIREMENTS.md`. Native milestone completion requires the next real milestone to define a fresh file.

- [x] **Step 2: Restore the top-level roadmap to a native transition state**

Write current `ROADMAP.md` with:

- one shipped v1.0 milestone link;
- a clear between-milestones transition state;
- zero current phases and zero current plans;
- no current Backlog;
- a link to native dormant seeds as the current deferred-capability carrier, subject to the approved promote-and-delete rule;
- `$gsd-new-milestone` as the next future product-lifecycle action after governance acceptance.

The historical R-01 proof is not a current phase and links only to its pending isolated pilot contract.

- [x] **Step 3: Reset current state to Awaiting next milestone**

Set `STATE.md` to:

- milestone `v1.0`, milestone name `Legacy Delivered Baseline`, and native status/focus `Awaiting next milestone`;
- native current-position body fields `Phase: Milestone v1.0 complete`, `Plan: —`, and `Status: Awaiting next milestone`;
- 8 completed archived phases and 8 completed archived plans;
- no current phase or plan;
- 32 dormant native seeds;
- a native `Operator Next Steps` section pointing to `$gsd-new-milestone` after governance acceptance;
- no legacy pack, Pending capability, or R-01 proof listed as current work.

- [x] **Step 4: Evolve `PROJECT.md` for native seeds and no open next milestone**

Link 32 validated capabilities to `.planning/milestones/v1.0-REQUIREMENTS.md`; state that Active requirements are none between milestones; link the 32 deferred capabilities to `.planning/seeds/`; and state that native `$gsd-new-milestone` questioning may surface or select relevant seeds while leaving unselected seeds untouched. Record the promote-and-delete rule and the exact one-carrier invariant before requirement approval and afterward. Record 32 archived Complete plus 32 dormant seeds as the exact disjoint 64-capability union.

- [x] **Step 5: Retain the tracked `docs/v1/` frozen archive markers without further repair edits**

Prepend a consistent warning to the eight tracked lifecycle files listed in File Structure:

> Frozen legacy v1 record. Preserve for historical product, pack, slice, and evidence context. Do not use this document or `status.json` as current lifecycle authority. Read root `AGENTS.md` and current `.planning/` authority for routing.

Retain the original body below the warning. In `05f-practice-segments.md`, label the four `contract_ready` predicates as historical legacy readiness records and point current readiness to OpenGSD; do not change the product behavior contracts.

The original migration left these eight frozen legacy files unchanged. The later whole-branch repair changed only their routing warning banners while preserving their historical bodies. The local `docs/v1/code-review-workflow.md` remains ignored, untracked, and uncommitted and must be absent from migration diff, index, staging, and commit scope. `.git/info/exclude` is not modified. The file's local bytes and local edit history are outside migration acceptance.

- [x] **Step 6: Retain the thin final `@codex` PR-review interface**

Initialize `skills/reviewing-metronome-prs/` with the repository-approved skill-creator script and retain its generated `agents/openai.yaml`. Use these exact interface values:

- `display_name=Reviewing Metronome PRs`
- `short_description=Traceable final PR review for Metronome`
- `default_prompt=Use $reviewing-metronome-prs to perform the final read-only review of this Metronome pull request.`

Replace the template with a concise, general, read-only skill that:

- discovers current `.planning` inputs and treats `docs/v1/status.json` only as frozen evidence;
- conditionally reads `skills/metronome-policy/SKILL.md` for production behavior or surface changes;
- reconciles every production surface to Capability Admission, Approved Surface, PLAN, the real diff, tests, and verification;
- independently checks local, installed, dependency, platform, and OSS reuse decisions;
- reports retired, added, and net production LOC plus Code Health and remaining complexity separately;
- emits findings first with severity, file/line, violated contract, and impact, followed by open questions, scope, reuse, and verification summaries;
- never edits files, repairs artifacts, merges the pull request, or orchestrates lifecycle state.

Original checked action, before the later controller-seam extension: add only a minimal `AGENTS.md` index for `@codex` final review, require the reviewer to read the new skill first, and keep the gate read-only and separate from native OpenGSD.

That checked sentence records the original Step 6 interface work. Whole-branch task review later retained the final-review index and added one thin `$gsd-new-milestone` controller rule: before approving or committing selected-seed requirements, read `Dormant seed promotion`; after approval, verify the exact legacy capability ID, feature key, and required behavior, then commit `REQUIREMENTS.md` and matching selected-seed deletions together. Rejected, unmatched, and unselected seeds remain. `.planning/config.json` remains unchanged because its `agent_skills` mapping reaches only the six mapped subagents, not this controller. Late task review after commit `3baa742` showed that the same-commit intent was insufficient because OpenGSD 1.7.0 skips explicitly named deleted files; the fail-closed preflight, existing-directory-scoped helper call, and exact post-commit verification recorded above now govern future promotions without rewriting this checked action.

- [x] **Step 7: Record the final review-driven architecture and repair archive provenance**

Update the approved design and durable plans to record native seeds, the between-milestones primary state, and the isolated historical-base R-01 contract. Mark the foundation and migration plans executed/historical; record the foundation's actual narrow `.xo-suppressions.json` cleanup; keep the R-01 pilot pending.

Repair exactly 24 stale archived PLAN/SUMMARY path records to their actual `.planning/milestones/v1.0-phases/...` locations. Add the durable semantic import audit and make all eight archived verifications link to it with an archive-maintenance note. Change no imported behavior, requirement mapping, slice identity, count, status, or product evidence.

- [x] **Step 8: Verify native transition state, seeds, and archive integrity**

Run:

```powershell
$nodePath = Resolve-Path '.\.tools\node-v24.17.0-win-x64\node.exe'
$gsdPath = Join-Path $env:USERPROFILE '.codex\gsd-core\bin\gsd-tools.cjs'
& $nodePath $gsdPath roadmap analyze --raw
& $nodePath $gsdPath state json --raw
& $nodePath $gsdPath state get --raw
& $nodePath $gsdPath list-seeds dormant --raw
& $nodePath $gsdPath smart-entry --json
Get-FileHash -Algorithm SHA256 -LiteralPath 'docs/v1/status.json'
```

Expected roadmap fields after repair: `phase_count=0`, `completed_phases=0`, `total_plans=0`, and `next_phase=null`. Native active-only progress is `0/0 plans (0%)`; `STATE.md`'s 100% is archived v1.0 history. `state json --raw` must report milestone `v1.0`, native status `Awaiting next milestone`, and the archived 8/8 completion counters; with this zero-phase roadmap the pinned native command currently derives the generic milestone name `milestone`, so the exact preserved `Legacy Delivered Baseline` name is verified through `state get --raw` together with `Phase: Milestone v1.0 complete` and `Plan: —`. `list-seeds dormant --raw` must return exactly 32 seeds. The pinned native `smart-entry --json` currently reports `situation=unknown` and recommends `progress` while surfacing status `awaiting next milestone`; record that classifier behavior truthfully, but do not treat it as a state-shape failure or patch OpenGSD. Also require exact seed semantic equality to the pre-repair Pending rows, the five corrected IDs, the disjoint 32+32=64 union, 8/8/8 archive inventory, 83 preserved slice identities, 32 archived Complete requirements, zero archived `.planning/phases/` references, eight durable-audit links, and all relevant local paths/Markdown links resolving.

**Controller promotion handoff (not an executable migration step): exact-candidate full-hook gate**

The original repair worker did not stage, commit, or run the full hook. The controller later committed `3baa742`, whose normal full pre-commit hook passed, but late task review invalidated promotion because the future seed-promotion transaction was still non-atomic. The atomic repair worker likewise does not stage, commit, or run the full hook. After focused review approves the next exact repaired tree, the controller stages the approved scope and runs one new normal full pre-commit hook on that candidate before promotion. This is the single approved review-driven validation; do not blind-retry it. `docs/v1/status.json`, ignored `docs/v1/code-review-workflow.md`, `.git/info/exclude`, and user-owned `.superpowers/` scratch remain outside staged repository scope.

---

### Task 5: Prove the repaired final state before controller promotion

**Files:** focused read-only verification plus the untracked controller report under `.superpowers/sdd/`; no product or lifecycle implementation artifact.

**Interfaces:**

- Consumes: the archived v1.0 history and exact repaired between-milestones artifacts.
- Produces: a focused repair verdict and handoff to the controller-owned exact-candidate full-hook gate. It does not begin Lumen/Ollama or R-01.

- [x] **Step 1: Verify repaired archive inventory and portable evidence**

Require:

- 8 archived phase directories;
- 8 PLAN files;
- 8 SUMMARY files;
- 8 passed, non-stale VERIFICATION files;
- 32 checked archived requirements;
- 83 verified legacy slice identities in archived completed history;
- no unfinished pack phase and no not-started slice represented as completed history;
- zero `.planning/phases/` references in archived PLAN/SUMMARY/VERIFICATION files;
- exactly 24 repaired archive-location records across the eight PLAN/SUMMARY pairs;
- every verification reaches the durable semantic import audit, which ends `LEGACY_IMPORT_APPROVED`;
- every archive-local and product-evidence path resolves.

- [x] **Step 2: Verify seed semantic equality and capability conservation**

Parse archived `v1.0-REQUIREMENTS.md`, the exact pre-repair Pending table at head `471c62f858d5ecb20a9f574155cd61a1679ab576`, frozen `docs/v1/status.json`, and current `.planning/seeds/`. Require:

- 32 unique Complete IDs in the archive;
- exactly 32 seed files with unique `SEED` IDs, legacy `REQ` IDs, and feature keys;
- exact row-order and semantic equality between the seeds and the old Pending table;
- native dormant frontmatter, standard sections, category-specific triggers, reachable legacy links, and frozen-roadmap links;
- union size 64 and intersection size 0;
- all 64 original feature keys present exactly once across those two sets;
- all five corrected false completions present as dormant seeds;
- the pinned `new-milestone.md` discovers `SEED-*.md`, sends selected seed context to requirement definition, and leaves unselected seeds untouched.
- future review verifies the one-carrier invariant and exact approval-commit name/status set immediately after requirement approval and again after completion or archival: selection alone retains the seed, the matching approval commit contains only added/modified `.planning/REQUIREMENTS.md` plus the expected deleted matching seeds, and native lifecycle artifacts then carry the truth.

- [x] **Step 3: Verify native between-milestones state and R-01 isolation**

Require:

- current roadmap has zero phases and zero plans, and `roadmap analyze --raw` reports no next phase;
- current top-level `REQUIREMENTS.md` is absent;
- `state json --raw` reports milestone `v1.0`, native status `Awaiting next milestone`, and 8 completed archived phases/plans; `state get --raw` preserves milestone name `Legacy Delivered Baseline` and exposes `Phase: Milestone v1.0 complete` and `Plan: —`; the native JSON projection's generic milestone name is recorded rather than hidden;
- `list-seeds dormant --raw` returns exactly 32 seeds, and the native `smart-entry --json` result (`situation=unknown`, recommended `progress`, status signal `awaiting next milestone`) is recorded without coercing its classifier;
- `PROJECT.md`, `ROADMAP.md`, and `STATE.md` identify 32 dormant seeds and `$gsd-new-milestone` as the next future product-lifecycle command after governance acceptance;
- `PROJECT.md`, `ROADMAP.md`, `STATE.md`, the approved design, project policy, and root `AGENTS.md` all require the same promote-and-delete rule without claiming automatic OpenGSD deletion;
- the approved design and both durable plans state that `.planning/config.json` injects policy only into the six mapped `agent_skills` subagents, not the `$gsd-new-milestone` controller or every lifecycle actor;
- all eight tracked lifecycle entrypoints begin with the frozen archive warning and preserve their historical bodies;
- the local `docs/v1/code-review-workflow.md` remains ignored, untracked, and uncommitted, is absent from diff, index, staging, and commit scope, and is excluded from the archive-marker count; `.git/info/exclude` is not modified; the ignored file's local bytes and local edit history are outside migration acceptance;
- `docs/v1/status.json` still exists and matches its Task 1 SHA-256;
- root `AGENTS.md` still routes lifecycle work to native OpenGSD, contains exactly one actual-controller rule for reading `Dormant seed promotion`, requiring an empty index/no merge/exact `.planning` path set, committing through the scoped existing `.planning/seeds` directory, and verifying the exact approval-commit set, and minimally indexes `@codex` final review to `skills/reviewing-metronome-prs/SKILL.md`;
- the final-review skill remains read-only, discovers current `.planning` authority, and does not become an OpenGSD agent mapping;
- no current OpenGSD artifact links an unfinished product capability or R-01 to a phase;
- the pending isolated historical-base pilot plan is the only R-01 execution contract and explicitly never advances primary-repository state or merges pilot code.

- [x] **Step 4: Check all changed local Markdown links**

Run one disposable PowerShell link scan over changed Markdown files, including every seed and the durable semantic audit. Ignore HTTP(S), mail, and fragment-only links. Resolve every remaining link relative to its containing file and require zero missing paths. Do not commit the scanner.

- [x] **Step 5: Search for stale final-state claims and machine-local evidence**

Search the repaired current planning artifacts and durable design/plan documents for claims that a current ROADMAP Backlog, primary-repository Phase 9/R-01, or top-level R-01 requirements remain authoritative. Search archived PLAN/SUMMARY/VERIFICATION files for `.planning/phases/` and all repository artifacts for the former machine-local independent-audit path. Require zero active/final-state stale claims; explicitly labeled historical intermediate descriptions may remain only inside this executed historical record.

- [x] **Step 6: Confirm diff hygiene, scope, and hook handoff state**

Run:

```powershell
git diff --check
git diff --name-only 471c62f858d5ecb20a9f574155cd61a1679ab576
git diff --cached --name-only
git status --short --untracked-files=all
```

Expected for the original checked verification: no forbidden path changed, the index remained empty, and pre-existing user-owned `.superpowers/` scratch remained untouched except for the requested repair report. The worker did not run the full hook or E2E. Commit `3baa742` later passed one normal full pre-commit hook, but late task review invalidated promotion until the atomic seed-transaction repair. This repair worker also does not run the hook; after focused approval the controller must run one new normal full hook on the next exact repaired candidate before promotion.

Return:

- `MIGRATION_REPAIR_FOCUSED_APPROVED` with exact seed, 32+32 union, native zero-phase, 8/8/8 archive, 83/32 semantic-count, link, stale-claim, diff, scope, and empty-index evidence; or
- `MIGRATION_REPAIR_BLOCKED` with the failed invariant and file path.

Do not begin Lumen/Ollama or R01 execution before the exact repaired candidate passes the controller-owned hook and receives governance approval.

## Acceptance Criteria

- The tracked `docs/v1/` tree remains the complete frozen legacy record, including byte-identical `status.json`, all 13 pack records, all 132 slice identities, and archive warnings on exactly eight tracked lifecycle entrypoints.
- The local review tutorial remains ignored, untracked, and uncommitted and is absent from diff, index, staging, and commit scope; `.git/info/exclude` is not modified; its local bytes and local edit history are outside migration acceptance.
- Native OpenGSD completed history contains only 8 completed packs, 83 verified slices, and 32 evidence-backed Complete capabilities.
- Native archived verification is passed and current for all eight completed phases; 24 stale path records are repaired, all eight verifications reach the durable audit, and that audit ends `LEGACY_IMPORT_APPROVED`.
- The five unfinished packs and 49 not-started slices are never imported as current phases or plans.
- Current `ROADMAP.md` and `STATE.md` place the primary repository between milestones with zero current phases/plans and no next phase; current top-level `REQUIREMENTS.md` is absent.
- Exactly 32 native dormant seeds are the current deferred-capability truth, preserve exact semantic equality to the former Pending rows, and include the five corrected false completions.
- The archived Complete set and dormant seed set form an exact, non-overlapping 64-capability/feature-key union.
- Native `$gsd-new-milestone` discovers matching seeds, feeds selected seed context into requirement definition, and leaves unselected seeds untouched. Its controller follows the single root `AGENTS.md` rule to read `Dormant seed promotion` before approving or committing selected-seed requirements. Selection retains the seed until approval of the matching legacy ID, feature key, and behavior. The controller then requires an empty index, no merge, an existing `.planning/seeds` directory, and the exact expected `.planning` worktree set; invokes the native helper scoped to `.planning/REQUIREMENTS.md` and `.planning/seeds`; and verifies that the resulting commit contains only the requirements add/modify plus matching selected-seed deletions. Explicit deleted seed paths, unscoped commits, and merge fallback are prohibited; rejected, unmatched, and unselected seeds remain unchanged. Review rechecks the one-carrier invariant and exact commit after approval and after completion.
- The pending isolated historical-base pilot plan is the only R-01 execution contract; it uses native Phase 1 only in its independent repository, never advances primary-repository lifecycle state, and never merges pilot code.
- No Phase 3.1, status mirror, migration validator, graph, registry, or custom lifecycle is added.
- Root `AGENTS.md` remains thin: native OpenGSD is the sole lifecycle entrypoint, one actual-controller rule bridges the `agent_skills` limitation and supplies the fail-closed native atomic seed-promotion transaction, and a validated read-only `@codex` final-review skill remains separate from native OpenGSD lifecycle roles.
- No product source or behavior changes.
- Intermediate planning-only checkpoints used the explicitly authorized `--no-verify`. Commit `3baa742` passed one normal full pre-commit hook, but late task review invalidated promotion until the atomic seed-promotion repair. Promotion now requires one new normal full-hook pass on the next exact repaired candidate. This is the approved review-driven validation, not a blind retry.
