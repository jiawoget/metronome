# OpenGSD Roadmap Semantic Migration Implementation Plan

> **Execution contract:** Execute only after the governance foundation commit passes native mapping smoke. Use native OpenGSD artifacts; do not create a replacement ledger, migration service, graph, or committed validator.

**Goal:** Replace `docs/v1/status.json` as the project roadmap source while preserving every product capability, implementation slice identity, and truthful implemented/unimplemented state in OpenGSD's native `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, and `STATE.md`.

**Baseline:** 15 product modules, 64 product capabilities, 13 packs, and 132 slices. Existing state is 8 verified packs / 83 verified slices and 5 not-started packs / 49 not-started slices. The product-feature map covers all 64 capabilities; 37 capabilities have all mapped slices verified and 27 do not.

**Design source:** `docs/superpowers/specs/2026-07-20-opengsd-capability-discovery-design.md`.

## Scope and file contract

Create:

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- one native import `PLAN.md`, `SUMMARY.md`, and passed `VERIFICATION.md` under each of the eight completed phase directories

Modify or retire as short historical redirects:

- `docs/v1/START-HERE.md`
- `docs/v1/agent-implementation-rules.md`
- `docs/v1/code-review-workflow.md`
- `docs/v1/scheduler-handoff.md`
- `docs/v1/development-plan.md`
- `docs/v1/feature-inventory.md`
- `docs/v1/05f-practice-segments.md` (replace only live readiness/status predicates)
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/product-feature-map.md` (banner/pointer only)

Delete only after all migration gates pass:

- `docs/v1/status.json`

Keep product contracts, pack specifications, and historical slice plans as evidence. They stop owning lifecycle state but remain linked from OpenGSD requirements and completed roadmap entries.

## Task 1: Freeze semantics and prove the native counter model

**Files:** read-only.

1. Parse `docs/v1/status.json` and `docs/v1/implementation-slices/product-feature-map.md` from the foundation commit.
2. Record and independently recheck these invariants:

   - 15 modules;
   - 64 unique product feature keys;
   - 13 unique pack IDs;
   - 132 unique slice IDs and names;
   - 8 verified / 5 not-started packs;
   - 83 verified / 49 not-started slices;
   - 64/64 product features mapped;
   - 108 mapped product-slice references and no missing reference;
   - 24 support/maintenance slices that are roadmap history, not invented product requirements;
   - 37 implemented / 27 not-implemented product capabilities under the existing “all mapped slices verified” rule.

3. Save the counts in execution notes, not a new repository ledger. Any duplicate, unmapped feature, or contradictory status blocks migration.
4. Before generating artifacts, run a disposable OpenGSD parser fixture outside the repository and prove these 1.7.0 behaviors with `query roadmap.analyze`, `query state.load`, and `query verification.status`:

   - a checked ROADMAP phase can be recognized as complete history;
   - ROADMAP slice/checklist rows are not counted as native plans;
   - native plan totals come from phase-directory `*-PLAN.md` / `*-SUMMARY.md` pairs;
   - a count-complete imported phase still requires a non-stale `*-VERIFICATION.md` with `status: passed`.

   Delete the scratch fixture after recording the output. It is a tool-compatibility preflight, not a committed validator or a substitute for semantic review.

## Task 2: Produce the four native OpenGSD artifacts

**Files:** create the four top-level native artifacts plus eight compact completed-phase import artifact sets.

Use the installed OpenGSD 1.7.0 roadmapper contract and templates. The migration agent reads the full legacy JSON, product-feature map, product contracts, pack specs, and approved governance design. It must not infer completion from prose alone.

### `PROJECT.md`

- Describe the existing local-first Metronome product and current architecture boundaries.
- Record OpenGSD as the sole project lifecycle/roadmap control plane.
- Summarize 37 validated and 27 active product capabilities.
- Preserve explicit non-goals such as cloud/sync scope where the product contracts defer it.
- Link the existing product contract directory rather than copying every contract body.

### `REQUIREMENTS.md`

- Contain exactly 64 product requirements, one for every original feature key.
- Preserve each original feature key verbatim as a stable identifier or alias.
- Mark exactly 37 as `[x]` / `Complete` and 27 as `[ ]` / `Pending`.
- Link each requirement to its product contract and exactly one OpenGSD phase.
- Link completed requirements to existing automated or repeatable acceptance evidence.
- Do not turn the 24 support/maintenance slices into fictional user capabilities.

### `ROADMAP.md`

- Contain 13 phases corresponding to the 13 legacy packs.
- Order completed history first, then the five unfinished packs, while preserving every original pack ID/name.
- Mark exactly 8 phases Complete and 5 Not started.
- Give each completed phase exactly one native import plan; leave each unfinished phase at `TBD` until OpenGSD normally plans it.
- Preserve exactly 132 legacy slice identities in an `Imported slice traceability` table with original ID, name, and legacy completion truth: 83 verified and 49 not started. These rows are migration evidence, not fake native PLAN files.
- Link verified slice rows to historical plan/evidence files where available.
- Identify the first unfinished phase as the next normal OpenGSD work target.

### Completed-phase import artifacts

- For each of the eight completed phases, first create one compact native `*-PLAN.md` and matching `*-SUMMARY.md`.
- Label both as a semantic import of already-completed work, not a newly executed plan.
- The plan names the legacy pack and its included verified slices; the summary links the original implementation/acceptance evidence.
- Do not write a passing verification before the independent semantic audit. After that audit passes, create one `*-VERIFICATION.md` per completed phase recording the audit and all completed requirements mapped to that phase.
- Write verification after summary and require `query verification.status <phase-dir>` to return `passed`, not `stale`.
- Do not create 132 PLAN files or 83 SUMMARY files. That would misrepresent old slices as native executions and add hundreds of redundant artifacts.

### `STATE.md`

- Load cleanly through OpenGSD's native state query.
- Report the native migrated baseline as 8/13 phases complete and 8/8 imported native plans complete; OpenGSD's phase-capped progress is approximately 62%.
- Report `83/132 legacy slices verified` only as labelled imported traceability, never as native `total_plans` / `completed_plans`.
- Point current focus to the first unfinished phase.
- Do not create another status vocabulary or shadow the requirement/roadmap checkboxes.

OpenGSD's normal generator may initialize items to Pending. That output is not accepted until legacy completion truth and the eight native import artifact sets are reconciled. Correct native artifacts directly; do not add a permanent migration script.

## Task 3: Run semantic equivalence gates before deleting anything

**Files:** read-only comparison.

1. Run native parse/load checks with the installed GSD tool:

   ```powershell
   $node = Resolve-Path '.\.tools\node-v24.17.0-win-x64\node.exe'
   $gsd = "$env:USERPROFILE\.codex\gsd-core\bin\gsd-tools.cjs"
   & $node $gsd query roadmap.analyze
   & $node $gsd query state.load
   ```

2. Use one-time read-only PowerShell/`rg` comparisons; do not commit a validator. Require:

   - legacy feature-key set equals the `REQUIREMENTS.md` feature-key set;
   - 37 complete and 27 pending requirements;
   - legacy slice ID/name set equals the ROADMAP imported-traceability set;
   - imported traceability records 83 verified and 49 not-started slices;
   - all 64 requirements map to exactly one phase;
   - all 108 product-slice references resolve;
   - every legacy `not_started` item remains pending;
   - no completed product capability lacks reachable behavior and evidence.

3. Before independent review, require the native queries to report:

   - `phase_count = 13`, `completed_phases = 8`, and the first unfinished phase as `next_phase`;
   - exactly eight native import plans and eight summaries across the completed phase directories;
   - `state.load` agrees with 13/8 phase truth and does not claim 83/132 as native plan counts.

4. Run the repository smoke suite:

   ```powershell
   & .\scripts\npm-local.ps1 --% run smoke
   ```

5. Dispatch an independent read-only migration reviewer. It must read the source JSON, mapping file, all native OpenGSD artifacts, and a one-time execution-note matrix for every one of the 37 completed requirements: requirement ID -> reachable runtime path -> automated or repeatable manual evidence. Sampling by module is not sufficient. Required verdict: semantic equivalence with no false completion.
6. Only after that verdict passes, write the eight native verification artifacts with `status: passed`; rerun `verification.status`, `roadmap.analyze`, and `state.load`, and require all eight verifications to be current and passed.

Any reset of 37 requirements or 83 imported slice records to Pending, any false promotion, any missing ID, any incomplete native phase, or any native counter drift is a migration failure. Keep `status.json` and stop; do not call format correctness a pass.

## Task 4: Retire the live legacy entrypoints

**Files:** modify the active v1 entrypoints and readiness predicates listed in Scope.

1. Replace `docs/v1/START-HERE.md` with a short current entrypoint:

   - `.planning/PROJECT.md` for scope and locked decisions;
   - `.planning/REQUIREMENTS.md` for product capability truth;
   - `.planning/ROADMAP.md` for phase/plan order;
   - `.planning/STATE.md` for current work;
   - `$gsd-next` for routing.

2. Replace the old agent rules, code-review workflow, scheduler handoff, development plan, and implementation-slices lifecycle README with short historical notices pointing to OpenGSD. Do not preserve their fresh-agent lifecycle, status transitions, model matrix, or scheduler protocol as active instructions.
3. Update `feature-inventory.md` and the four `05f-practice-segments.md` readiness predicates so they reference the corresponding OpenGSD requirement/phase truth instead of requiring `contract_ready` in a deleted JSON file. Do not alter their product behavior contracts.
4. Add a historical-evidence banner to `product-feature-map.md`; keep its mapping content for migration audit and product traceability.
5. Historical plan/report files may mention `status.json`, but no live entrypoint or product readiness rule may depend on it.

## Task 5: Delete the old state source and commit migration

1. Re-run Task 3 after the live-entrypoint edits.
2. Delete `docs/v1/status.json` only after the independent migration verdict passes.
3. Verify active instructions no longer route to it:

   ```powershell
   rg -ni 'status\.json.*(source of truth|current status|canonical|contract_ready|before implementation)|Use one status file|All v1 status lives' AGENTS.md docs/v1/START-HERE.md docs/v1/agent-implementation-rules.md docs/v1/code-review-workflow.md docs/v1/scheduler-handoff.md docs/v1/development-plan.md docs/v1/feature-inventory.md docs/v1/05f-practice-segments.md docs/v1/implementation-slices/README.md
   ```

   Expected result: no match.

4. Run the full repository gates once.
5. Stage and commit with elevated Git permission and normal hooks:

   ```powershell
   git add -A
   git commit -m "Migrate project roadmap state to OpenGSD"
   ```

6. Use a hook timeout of at least 10 minutes and diagnose an elevated long-running hook before any retry.

## Acceptance criteria

- OpenGSD natively loads all four planning artifacts.
- All 64 product capabilities and 132 slice identities survive.
- Completion truth is exactly 37/27 capabilities, 8/5 native phases, and 83/49 imported slice records unless an independently evidenced correction is explicitly approved.
- OpenGSD recognizes eight real completed phase imports with passing verification; it does not mistake the 132 legacy slice records for executable PLAN files.
- No unimplemented item is marked complete.
- Historical product and implementation evidence remains reachable.
- No live legacy lifecycle entrypoint remains.
- `docs/v1/status.json` is deleted only after semantic equivalence passes.
- No committed migration script, state mirror, graph, or validator is added.
