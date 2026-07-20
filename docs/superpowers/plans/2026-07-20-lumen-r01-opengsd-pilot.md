# Lumen and Historical R-01 OpenGSD Pilot Plan (Superseded Historical Record)

> **Status — superseded; do not execute Tasks 2-7:** After the governance migration and pinned local Lumen provider were verified, the user replaced this disposable historical experiment with a real R01 executed from updated `main` through native OpenGSD. Task 1 provider evidence remains reusable. An independent repository was initialized at the historical base, but no foundation overlay or product edit was applied; its external files are diagnostic evidence only and never advance lifecycle state, push, or merge. The active path is governance PR/merge followed by `$gsd-new-milestone` for the real R01.

**Historical goal:** Prove the approved OpenGSD + single-policy architecture on the real pre-R-01 repository: local semantic recall works through pinned Ory Lumen, installed music/audio APIs and public OSS are researched, CAP decisions constrain the plan and diff, and the resulting refactor retires responsibility instead of moving it.

**Historical base:** `eb1730205784a88c0a5b6177d9c31b515071b069` (`Remove legacy refactor planning artifacts (#118)`).

**Immutable foundation commit:** `06e80276caa21c5d4058f1ffa2fb7086af3bc1d7`. Export only its allowlisted foundation diff into the history-isolated pilot as described below.

**Pins:** OpenGSD `1.7.0`; Ory Lumen `v0.0.41`, tag commit `d0dee0efcc8235bf514217ecb12cdac2ed5213fa`; Windows AMD64 asset SHA-256 `0012c4837b2cc22fbb6124a9ff133518d963c93510178e9060b6004e299ec44d`.

**Design source:** `docs/superpowers/specs/2026-07-20-opengsd-capability-discovery-design.md`.

## Task 1: Install and verify the local semantic provider

**Repository files:** none. All provider state lives outside the repository.

1. Confirm neither Ollama nor LM Studio is currently available. Use Ollama as Lumen's pinned local backend for this pilot.
2. Download the official Ollama `v0.32.0` Windows AMD64 portable archive from `https://github.com/ollama/ollama/releases/download/v0.32.0/ollama-windows-amd64.zip`, require SHA-256 `56561a8f0a904483303c610e61af61c5a7b6f5496ce3707e207d25d4ff67b89e`, and extract it under a fresh pilot-specific directory outside the repository. Do not use an unverified mirror or overwrite another installation. Define the executable and model paths explicitly; do not depend on `PATH`:

   ```powershell
   $providerRoot = "C:\tmp\metronome-opengsd-r01-l2-$runId-provider"
   $ollamaRoot = Join-Path $providerRoot 'ollama'
   $ollamaExe = Join-Path $ollamaRoot 'ollama.exe'
   $ollamaModels = Join-Path $providerRoot 'ollama-models'
   ```

3. Set `OLLAMA_HOST=127.0.0.1:11434` and `OLLAMA_MODELS=$ollamaModels`, then start `& $ollamaExe serve` in a hidden background process. Query `http://127.0.0.1:11434/api/version` directly and require version `0.32.0`.
4. Pull the exact embedding model through the same pinned executable and resolve its local digest through the same explicit host:

   ```powershell
   $env:OLLAMA_HOST = '127.0.0.1:11434'
   $env:OLLAMA_MODELS = $ollamaModels
   $ollamaProcess = Start-Process -FilePath $ollamaExe -ArgumentList 'serve' -WindowStyle Hidden -PassThru
   $ollamaVersion = $null
   for ($attempt = 0; $attempt -lt 60; $attempt++) {
     try {
       $versionResponse = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/version' -TimeoutSec 2
       if ($versionResponse.version -eq '0.32.0') {
         $ollamaVersion = $versionResponse.version
         break
       }
     } catch {
       # The pinned process can be healthy but not listening yet.
     }
     Start-Sleep -Milliseconds 500
   }
   if ($ollamaVersion -ne '0.32.0') {
     throw 'Pinned Ollama 0.32.0 did not become ready within 30 seconds.'
   }
   & $ollamaExe pull ordis/jina-embeddings-v2-base-code
   $tags = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags'
   ```

   Require `/api/tags` to report digest `080d707f4f4ab48ceafa7452ce70e7f44751c7c599fe4eaf4b3256d51008d667`; a changed mutable tag is a provider-version failure.
5. Install Lumen into `C:\Users\wsuto\.codex\lumen` from the official repository at tag `v0.0.41`, detached at commit `d0dee0efcc8235bf514217ecb12cdac2ed5213fa`. If the directory already exists, verify its origin, tag, and cleanliness; never overwrite an unrelated or dirty checkout.
6. Download `https://github.com/ory/lumen/releases/download/v0.0.41/lumen-0.0.41-windows-amd64.exe` to `C:\Users\wsuto\.codex\lumen\bin\lumen-windows-amd64.exe` and require SHA-256 `0012c4837b2cc22fbb6124a9ff133518d963c93510178e9060b6004e299ec44d` before execution. This prevents tagged `run.cmd` from falling back to a later release.
7. Create the official Codex skill junction `C:\Users\wsuto\.agents\skills\lumen -> C:\Users\wsuto\.codex\lumen\skills`. If that path exists with a different target, stop rather than overwrite it.
8. Resolve the working Codex CLI from the desktop configuration, prove no conflicting `lumen` MCP entry exists, and register the server:

   ```powershell
   & $codexCli mcp add lumen `
     --env LUMEN_BACKEND=ollama `
     --env LUMEN_EMBED_MODEL=ordis/jina-embeddings-v2-base-code `
     --env OLLAMA_HOST=http://127.0.0.1:11434 `
     --env XDG_DATA_HOME=<pilot-lumen-data> `
     -- "$env:USERPROFILE\.codex\lumen\scripts\run.cmd" stdio
   ```

9. Restart/reload the Codex MCP surface, then require:

   - binary `version` = `0.0.41`;
   - MCP `health_check` healthy with Ollama/model reachable;
   - no cloud backend;
   - index database path outside the repository.

Any failed hash, missing model, unhealthy backend, or unavailable MCP is a provider/tool failure and stops the pilot.

## Task 2: Create a history-isolated pilot repository

**Paths:** independent Git repository under a fresh `C:\tmp\metronome-opengsd-r01-l2-*` path; local pilot branch only.

1. Prove the historical base object exists and record its commit metadata.
2. Allocate a new explicit path. If it already exists, stop; do not delete, reuse, or mutate it.
3. With elevated Git permission, initialize an independent repository and fetch only the exact historical commit from the local source repository. Do not clone, use a worktree, configure alternates, or add a remote:

   ```powershell
   $baseline = 'eb1730205784a88c0a5b6177d9c31b515071b069'
   $postR01 = '5b18a0a8c1eecbe568c1d1f90be14a7fea9773aa'
   git -C $pilotRoot init
   git -C $pilotRoot -c protocol.file.allow=always fetch --no-tags 'C:\Users\wsuto\metronome' $baseline
   git -C $pilotRoot switch -c "codex/opengsd-r01-l2-$runId" FETCH_HEAD
   ```

4. Export the immutable foundation commit's allowlisted file diff from the primary repository and apply that diff to the pilot. Do not fetch or cherry-pick the foundation commit because that would import post-R-01 ancestry. Commit the applied governance overlay locally.
5. Verify:

   - production `src/**` equals the historical base;
   - the only inherited changes are governance foundation files;
   - the post-R-01 commit object is absent;
   - `.git\objects\info\alternates` is absent and `git remote` is empty;
   - the old `C:\tmp\metronome-opengsd-r01-019f7372` pilot remains untouched;
   - the pilot branch has no remote push target and will not enter the governance PR.

## Task 3: Seed native Phase 1 for R-01 only in the independent pilot repository

**Pilot files:** native `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, and one R-01 phase `CONTEXT.md` generated inside the pilot branch.

1. Use OpenGSD native artifacts to define one historical validation phase targeting `src/components/sheet-practice/controls/sheet-practice-controls.tsx`. The goal is to improve architecture and Code Health while preserving all observable behavior, materially reduce total production LOC and complexity, keep additions smaller than retired code, and reuse existing capabilities first. No predetermined helper/module/API is selected in context.
2. `CONTEXT.md` records only behavior, scope, historical CodeScene baseline, preservation boundaries, and the approved Level 2 discovery requirement.
3. Before any production edit, submit the exact historical target file/snapshot to the already-authorized CodeScene analysis path and record the returned file Code Health, findings, analysis identifier, commit, and timestamp as the immutable baseline. Do not substitute the remembered `6.22` score or an analysis from another branch.
4. Set a pilot-only `XDG_DATA_HOME` under a fresh `C:\tmp\...\lumen-data` directory so the disposable SQLite/sqlite-vec index remains outside the repository.
5. Run one explicit initial Lumen index:

   ```powershell
   $lumenExe = "$env:USERPROFILE\.codex\lumen\bin\lumen-windows-amd64.exe"
   & $lumenExe version
   & $lumenExe index --model ordis/jina-embeddings-v2-base-code --backend ollama $pilotRoot
   & $lumenExe search --path $pilotRoot --cwd $pilotRoot --model ordis/jina-embeddings-v2-base-code --backend ollama --n-results 20 --min-score -1 '<behavior-based query>'
   ```

6. Require MCP `health_check {}` and `index_status {path: $pilotRoot, cwd: $pilotRoot}` to report a healthy backend and valid index for the exact pilot path. Prove that an actual OpenGSD assumptions-analyzer or phase-researcher subagent can call `semantic_search`; root-session availability alone is insufficient. No result is not proof of absence; unhealthy or stale status blocks research. Do not build a bridge wrapper if the MCP is unavailable to subagents.

## Task 4: Run exactly one Level 2 research stage

Invoke native research-only mode once:

```text
$gsd-plan-phase --research-phase 1
```

The injected phase researcher must produce `RESEARCH.md` with Capability Admission. Acceptance requires:

- R-01 classified Level 2;
- normally three to seven behavior-based capability atoms;
- Lumen queries based on intent, inputs/outputs, invariants, side effects, lifecycle, and synonyms;
- every credible local result confirmed by exact source, types, call sites, and tests;
- exact installed-version API evidence for `wavesurfer.js`, `tone`, `@tonaljs/duration-value`, `@tonaljs/time-signature`, and applicable transitive `dequal`;
- locked-version evidence for `wavesurfer.js` `7.12.8`, `tone` `15.1.22`, `@tonaljs/duration-value` `4.9.0`, `@tonaljs/time-signature` `4.9.0`, transitive `dequal` `2.0.3`, and any applicable `fast-deep-equal` `3.1.3`;
- unresolved generic atoms searched through official platform/OSS sources with only abstract capability descriptions sent online;
- one allowed decision and Approved Surface for every CAP;
- concrete mismatch reasons for rejected candidates;
- no implementation prewrite or predetermined helper shape.

Independently review `RESEARCH.md` against the actual sources and official APIs. If any CAP is `NEEDS_SCOPE_DECISION`, multiple fitting candidates have a real trade-off, or a new dependency is proposed, stop for user approval. Otherwise present the CAP decisions for the required planning approval; do not silently run the planner.

## Task 5: Plan and check once after research approval

After explicit approval, invoke normal native planning once using the existing research:

```text
$gsd-plan-phase 1
```

Require the native plan checker to pass without auto-bounce or repeated replanning. Every production task must reference a CAP and exact approved symbol/API. The plan must include behavior characterization, smallest safe implementation steps, real retirement targets, CodeScene evidence, and full repository gates.

Stop if the plan:

- selects a different library or owner;
- adds a helper, hook, module, service, protocol, algorithm, or dependency outside Approved Surface;
- cannot identify code/responsibility to retire;
- treats an empty search as `LOCAL_NO_FIT`;
- relies on Markdown wording instead of executable behavior evidence.

## Task 6: Execute and verify once

1. Invoke native execute-phase once with `--no-transition`; do not let it automatically advance into another stage.
2. Executor deviations may fix mistakes only inside the approved CAP boundary. A new capability or surface returns the affected CAP to research and stops the stage.
3. Run the planned characterization and focused tests after each bounded change, then full repository gates.
4. Run native verifier/verify-work once and an independent read-only review against:

   - historical source;
   - `RESEARCH.md`;
   - all phase `PLAN.md` files;
   - exact diff;
   - installed/official API evidence;
   - tests and build;
   - CodeScene change-set and target-file evidence.

   Re-run CodeScene on the exact final pilot commit and compare it with the immutable Task 3 baseline. Record both analysis identifiers and the change-set result; do not compare against a remembered score or the abandoned pilot.

5. Report separately:

   - observable behavior result;
   - production LOC added/deleted/net;
   - exact retired functions/branches/surfaces;
   - new production surfaces and their CAP approvals;
   - target and added-file Code Health;
   - whole change-set quality gates.

The pilot fails if it merely moves complexity, adds more production code than it retires without approved necessity, misses a fitting local/dependency/OSS API, declines Code Health, or introduces unapproved coordination.

## Task 7: Apply the single-retry rule and preserve evidence

1. Every stage above runs once.
2. On failure classify exactly one primary cause: policy gap, provider/tool failure, requirement ambiguity, or agent-contract violation.
3. Stop and report the exact failed stage/CAP. Do not vary prompts, delete artifacts, relax policy, or rerun the full pipeline.
4. Only after explicit user approval may one affected CAP or stage be repaired and rerun once.
5. A repeated cause returns to architecture discussion; there is no “minimal fallback.”
6. Commit pilot artifacts and implementation only to the local pilot branch for audit. Never push or merge that branch into `main`.
7. Do not copy pilot `ROADMAP.md`, `STATE.md`, `REQUIREMENTS.md`, phase artifacts, implementation commits, or progress back to the primary repository; primary lifecycle authority remains between milestones throughout the proof.
7. Preserve the local branch as a verified Git bundle outside the project, record its SHA-256, and put only the compact pass/fail evidence plus immutable pilot commit/bundle hash in the governance PR body. Do not add a new repository status ledger.

## Acceptance criteria

- Lumen 0.0.41 and the embedding model are healthy, local-only, and pinned.
- The index is disposable and outside the repository.
- The pilot starts from the exact historical R-01 base plus only the foundation commit.
- R-01 is Phase 1 only in the independent pilot repository and never becomes a current phase in the primary repository.
- All six OpenGSD roles receive one policy source.
- Research covers local semantic duplicates, installed/transitive APIs, and official OSS/platform candidates.
- CAP decisions constrain every plan task and production surface.
- Execution and verification run once with no silent rerun.
- The result demonstrates real responsibility/code retirement, preserved behavior, and non-declining Code Health.
- Pilot code is not pushed or merged; only governance conclusions may inform a later explicitly authorized repository change after the pilot passes.
