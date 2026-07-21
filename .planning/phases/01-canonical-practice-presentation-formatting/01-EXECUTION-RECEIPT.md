# Phase 01 Execution Receipt

This is the compact, execution-only projection of approved research. It does not replace `RESEARCH.md`, change a CAP decision, or authorize rediscovery.

## Identity

| Identity | Required value |
|---|---|
| Product fingerprint | `7a9b68f6726634f0cdeece9650926aabc152e80f94ecd664e0c6162b39136e31` |
| Dependency fingerprint | `85bfbf2991e0fdfa465745ff7e978901ada42f7e72c79f5ae0dd4ceaef93874e` |
| Search-config fingerprint | `aba243722906d8c733d0bcfdf953fea268901ef06c44bfaede34b4a0421b0d40` |
| Policy fingerprint | `3b92c418dadd8b411994802bbd38ddafee58c5000aaa96c892d07ab8edc9da87` |
| Baseline `src` tree | `a53cc5795216a48cbd89b79eccf5805b780c7c08` |
| `format.ts` blob | `04223323bd4559c86b1d54379804342e7ca6d1ab` |
| `session-comparison.ts` blob | `48effd4f8514c2f7f340788c2a67eeac9e3a1a25` |
| dashboard-hook blob | `25d5c2f0831f5c7471690f733aa03fb13fcef628` |
| Home blob | `95d0946c0796d5e3f5b577c551b7963337c7a647` |
| Lumen cache | 348 files / 2,905 chunks, `ordis/jina-embeddings-v2-base-code`, refreshed 2026-07-21T10:34:49Z, not stale |

## Execution amendment: Goals-first Home repair

The original receipt below is retained as historical proof. T1 and T2 completed at immutable formatter commit `ef98c28759a017d6c1a09ef4f1bd68a9488440bf`; the original T3 stopped after Home improved from `6.46` to `6.86`, below the unchanged `7.0` threshold. No original task, discovery query, dependency/OSS search, Lumen reindex, baseline capture, or CodeScene attempt is repeated.

| Amendment identity | Required value |
|---|---|
| Combined production baseline | `3370d2f93fd6740d96150d9ee69e31238b258c6a` |
| Preserved formatter commit | `ef98c28759a017d6c1a09ef4f1bd68a9488440bf` |
| Original blocked evidence | `.logs/gsd-observability/r01-formal-20260721-01/evidence/codescene-final.json` |
| Repair observability run | `r01-home-repair-20260721-01` |
| Repair task | `01-01-T4`, resume `r01-home-goals-repair`, cache `approved-home-goals-repair:v1` |
| Explicit evidence retry | `01-01-T5`, resume `r01-home-final-evidence-retry`, cache `immutable-home-repair-final:v1`, retry-of original `t3-final-evidence` |

T4 may modify only `src/components/home/home-dashboard.tsx`, `src/hooks/use-practice-session-dashboard.ts`, `tests/unit/home-dashboard.test.tsx`, and `tests/unit/architecture-boundaries.test.ts`, and may add only `src/components/home/practice-goals-panel.tsx` plus `src/components/home/practice-goal-editor.tsx`. It first records a failing architecture-boundary test, then restores behavior while making Home composition-only for Goals. It removes duplicate save/delete callback aliases and the empty-data reference sentinel only where the focused tests prove compatibility. No dependency, domain/service/schema/API replacement, persistence path, generic abstraction, or goal-ID algorithm change is admitted.

T5 accepts exactly those six repair paths relative to `ef98c28`. Across `3370d2f..reviewedProductionSha`, the source inventory is exactly four `M` rows (`format.ts`, `session-comparison.ts`, dashboard hook, Home) and two `A` rows (the Goals panel/editor). The normalized production total across those six paths must be strictly negative; relocation alone does not count. Existing changed files require no Code Health decline/new severe finding, both new files require attributable no-severe results, and Home must be at least `7.0`. T5 is the only permitted evidence retry. Interruption or failure stops without rediscovery, alternate targets, threshold reduction, or automatic replan.

The original 89-line verifier below is historical and must not be rerun unchanged because it assumes four modified-only source rows. T5 instead records a concise combined-range normalized verifier in the run evidence that handles both modified and added files, validates the exact `4M + 2A` source inventory, pins formatter inputs/tool versions, prints per-path and total added/deleted/net counts, and cleans its temporary files. The verifier itself remains runtime evidence under `.logs/`; it is not added to the product repository.

At T1, run `node scripts/gsd-observability-write.mjs fingerprint --repo .` and require exact equality. Planning/STATE commits may change HEAD but must leave the product fingerprint and `src` tree unchanged. Any product/search drift is `EVIDENCE_STALE`; record blocked and stop. Do not reindex or research from the executor.

## Approved capability decisions

- `CAP-01 USE_LOCAL`: add `formatPracticeUtcMinuteTimestamp(value: string | null, fallback = "Unknown time")` to existing `src/domain/practice/format.ts`. The accepted implementation uses the already-used ECMAScript `Date` UTC getters and string padding. Installed date/duration dependencies add no matching fixed UTC-minute contract.
- `CAP-02 USE_LOCAL`: add `formatPracticeMinuteDuration(value: number)` to that same existing owner. The accepted implementation uses `Number.isFinite`, `Math.floor`, and template strings. Installed `@tonaljs/duration-value`, the seconds-scale comparison formatter, and the sheet-library formatter have non-equivalent semantics.
- Add no dependency, module, barrel, wrapper, facade, adapter, feature flag, owner, service, repository, schema, or alternate path.

## Exact allowed changes

Tests first, then product:

1. `tests/unit/home-dashboard.test.tsx`
2. `tests/unit/session-comparison.test.ts`
3. `src/domain/practice/format.ts`
4. `src/domain/practice/session-comparison.ts`
5. `src/hooks/use-practice-session-dashboard.ts`
6. `src/components/home/home-dashboard.tsx`

The existing `src/domain/practice/index.ts` wildcard export remains unchanged. Retain seconds-scale `formatDuration`, `M:SS` `formatPracticeDuration`, and sheet-library formatting unchanged.

## Behavior lock

- General null, empty, or invalid timestamp -> `Unknown time`.
- Whitespace-only analytics timestamp -> suppress the entire updated suffix.
- Non-empty invalid analytics timestamp -> `Unknown update time`.
- Valid values -> zero-padded `YYYY-MM-DD HH:mm UTC`, converted with UTC getters and without seconds/milliseconds.
- `NaN`, infinities, negative, or zero milliseconds -> `0 min`.
- `1..59_999` -> `<1 min`; `60_000` -> `1 min`; `119_999` -> `1 min`; `3_599_999` -> `59 min`; `3_600_000` -> `1 hr`; `3_660_000` -> `1 hr 1 min`.
- Larger finite values remain uncapped `N hr` or `N hr M min`.
- Repeated/concurrent equal calls are pure and identical.

## Characterization cases

1. In `home-dashboard.test.tsx`, add `characterizes selected Home timestamp and minute-duration formatting` through injected `HomeDashboardData`; cover general null/empty/invalid, valid UTC conversion, analytics whitespace suppression/invalid fallback, and every duration boundary above.
2. In `home-dashboard.test.tsx`, add `characterizes dashboard-hook comparison timestamps, durations, and goal wording`; mock exactly three candidates covering invalid and offset timestamps plus `30_000`, `119_999`, and `3_660_000` durations in panel and goal rows.
3. In `session-comparison.test.ts`, add `characterizes UTC-minute session-comparison timestamps without changing seconds-scale duration`; cover offset/empty/invalid timestamps through `getSessionComparison` and retain `0s`, `<1s`, and `1m 5s` behavior.

Run the focused command before any source edit. Apply the four approved mutations one at a time, require the intended test to fail, restore immediately, and require all four working source hashes to equal the blobs above before T2.

## Historical formatter stop conditions

- Exact four-source staged allowlist before changed-file gates and safeguard; exact six-file commit allowlist after adding tests.
- The full pre-commit hook runs once and is never bypassed.
- All seven retired symbols/bodies are absent; all ten selected calls use the canonical owner; every hunk is in scope.
- `reviewedProductionSha` remains the named branch tip; formatter inputs are unchanged; final scope is clean.
- Exact final CodeScene: baseline/final pairs for every changed source, direct change-set analysis, no decline/new severe finding, Home >= 7.0. Missing or unattributable provider output blocks.
- Exact normalized production net is `< 0`; rollback passes only in a disposable verification context.
- Interruption records `interrupted` and stops. No automatic retry, alternative target, or return from final verification to broad research.

## Historical canonical 89-line LOC verifier

Replace only the three placeholders. The physical body below is exactly 89 lines.

```powershell
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) { $PSNativeCommandUseErrorActionPreference = $false }
$productionBaseSha = "<recorded-PRODUCTION_BASE_SHA>"; $reviewedProductionSha = "<recorded-reviewedProductionSha>"; $intendedBranch = "<recorded-IMPLEMENTATION_BRANCH>"
$approvedPaths = @("src/domain/practice/format.ts", "src/domain/practice/session-comparison.ts", "src/hooks/use-practice-session-dashboard.ts", "src/components/home/home-dashboard.tsx")
$formatterInputs = @("prettier.config.mjs", ".prettierignore", "package.json", "package-lock.json")
$cleanPaths = $approvedPaths + $formatterInputs
$nodeExe = (Resolve-Path -LiteralPath ".\.tools\node-v24.17.0-win-x64\node.exe").Path
$prettierCli = (Resolve-Path -LiteralPath ".\node_modules\prettier\bin\prettier.cjs").Path
$prettierConfig = (Resolve-Path -LiteralPath ".\prettier.config.mjs").Path
$utf8NoBom = [Text.UTF8Encoding]::new($false)
$previousOutputEncoding = $OutputEncoding
$previousConsoleEncoding = [Console]::OutputEncoding
$baseTemp = $null
$reviewedTemp = $null
$baseRef = @(& git rev-parse --verify ($productionBaseSha + "^{commit}") 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Invalid PRODUCTION_BASE_SHA: $($baseRef -join "`n")" }
$productionBaseSha = ($baseRef -join "").Trim()
$headRef = @(& git rev-parse --verify "HEAD^{commit}" 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Cannot resolve reviewed HEAD: $($headRef -join "`n")" }
$resolvedHeadSha = ($headRef -join "").Trim(); if ($resolvedHeadSha -ne $reviewedProductionSha) { throw "HEAD is not reviewedProductionSha." }
$branchRef = @(& git symbolic-ref -q --short HEAD 2>&1); if ($LASTEXITCODE -ne 0 -or ($branchRef -join "").Trim() -ne $intendedBranch) { throw "Detached or wrong implementation branch." }
$branchTip = @(& git rev-parse --verify ($intendedBranch + "^{commit}") 2>&1); if ($LASTEXITCODE -ne 0 -or ($branchTip -join "").Trim() -ne $reviewedProductionSha) { throw "Implementation branch tip is not reviewedProductionSha." }
& git merge-base --is-ancestor $productionBaseSha $reviewedProductionSha 2>&1
if ($LASTEXITCODE -ne 0) { throw "PRODUCTION_BASE_SHA is not an ancestor of reviewedProductionSha." }
$range = "$productionBaseSha..$reviewedProductionSha"
& git diff --quiet --no-ext-diff --no-textconv $range -- @formatterInputs
$configExit = $LASTEXITCODE
if ($configExit -eq 1) { throw "Formatter inputs changed in $range." }
if ($configExit -ne 0) { throw "Formatter-input immutability check failed with exit $configExit." }
$gitVersion = @(& git --version 2>&1); if ($LASTEXITCODE -ne 0 -or ($gitVersion -join "").Trim() -ne "git version 2.55.0.windows.3") { throw "Expected Git 2.55.0.windows.3, got $($gitVersion -join '')" }
$nodeVersion = @(& $nodeExe --version 2>&1); if ($LASTEXITCODE -ne 0 -or ($nodeVersion -join "").Trim() -ne "v24.17.0") { throw "Expected Node v24.17.0, got $($nodeVersion -join '')" }
$prettierVersion = @(& $nodeExe $prettierCli --version 2>&1); if ($LASTEXITCODE -ne 0 -or ($prettierVersion -join "").Trim() -ne "3.9.5") { throw "Expected Prettier 3.9.5, got $($prettierVersion -join '')" }
$pluginVersion = @(& $nodeExe -p "require('./node_modules/prettier-plugin-tailwindcss/package.json').version" 2>&1); if ($LASTEXITCODE -ne 0 -or ($pluginVersion -join "").Trim() -ne "0.8.0") { throw "Expected prettier-plugin-tailwindcss 0.8.0, got $($pluginVersion -join '')" }
$status = @(& git status --porcelain=v2 --branch --untracked-files=all -- @cleanPaths 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Scoped status failed: $($status -join "`n")" }
$headRows = @($status | Where-Object { $_ -like "# branch.head *" })
$oidRows = @($status | Where-Object { $_ -like "# branch.oid *" })
$dirtyRows = @($status | Where-Object { -not $_.StartsWith("# ") })
if ($headRows.Count -ne 1 -or $headRows[0] -ne "# branch.head $intendedBranch" -or $oidRows.Count -ne 1 -or $oidRows[0] -ne "# branch.oid $reviewedProductionSha" -or $dirtyRows.Count -ne 0) { throw "Scoped checkout is not clean on intended reviewed branch: $($status -join "`n")" }
$changedRows = @(& git diff --name-status --no-renames $range -- src 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Changed-source inventory failed: $($changedRows -join "`n")" }
$actualRows = @($changedRows | Sort-Object)
$expectedRows = @($approvedPaths | ForEach-Object { "M`t$_" } | Sort-Object)
if (($actualRows -join "`n") -ne ($expectedRows -join "`n")) { throw "Changed src rows are not the exact four M-only Approved Surface rows: $($changedRows -join "`n")" }
@("CHANGED_SOURCE_ROWS_BEGIN", ($changedRows -join "`n"), "CHANGED_SOURCE_ROWS_END") | Write-Output
$addedTotal, $deletedTotal = 0, 0
try {
  $OutputEncoding = $utf8NoBom
  [Console]::OutputEncoding = $utf8NoBom
  $baseTemp = New-TemporaryFile
  $reviewedTemp = New-TemporaryFile
  foreach ($path in $approvedPaths) {
    $blobPairs = @(@($productionBaseSha, $baseTemp.FullName), @($reviewedProductionSha, $reviewedTemp.FullName))
    foreach ($pair in $blobPairs) {
      $spec = "$($pair[0]):$path"
      $sourceLines = @(& git cat-file blob $spec 2>&1)
      if ($LASTEXITCODE -ne 0) { throw "git cat-file failed for $spec`: $($sourceLines -join "`n")" }
      $sourceText = ($sourceLines -join "`n") + "`n"
      $normalizedLines = @($sourceText | & $nodeExe $prettierCli --config $prettierConfig --no-editorconfig --ignore-path ".prettierignore" --stdin-filepath $path 2>&1)
      if ($LASTEXITCODE -ne 0) { throw "Prettier normalization failed for $spec`: $($normalizedLines -join "`n")" }
      [IO.File]::WriteAllText($pair[1], (($normalizedLines -join "`n") + "`n"), $utf8NoBom)
    }
    $normalizedDiff = @(& git -c core.autocrlf=false diff --no-index --numstat --patch --unified=0 --diff-algorithm=myers --no-indent-heuristic -- $baseTemp.FullName $reviewedTemp.FullName 2>&1)
    $diffExit = $LASTEXITCODE
    if ($diffExit -notin 0, 1) { throw "Normalized diff failed for $path`: $($normalizedDiff -join "`n")" }
    $numstatRows = @($normalizedDiff | Where-Object { $_ -match "^\d+`t\d+`t" })
    if (($diffExit -eq 0 -and $numstatRows.Count -ne 0) -or ($diffExit -eq 1 -and $numstatRows.Count -ne 1)) { throw "Unexpected normalized numstat for $path`: $($normalizedDiff -join "`n")" }
    $added = 0
    $deleted = 0
    if ($numstatRows.Count -eq 1) {
      $fields = $numstatRows[0] -split "`t"
      $added = [int]$fields[0]
      $deleted = [int]$fields[1]
    }
    $addedTotal += $added
    $deletedTotal += $deleted
    Write-Output ("NORMALIZED_NUMSTAT path={0} added={1} deleted={2} net={3}" -f $path, $added, $deleted, ($added - $deleted))
    @("NORMALIZED_DIFF_BEGIN path=$path", ($normalizedDiff -join "`n"), "NORMALIZED_DIFF_END path=$path") | Write-Output
  }
  $net = $addedTotal - $deletedTotal
  @("REVIEW_RANGE=$range", "NORMALIZED_ADDED=$addedTotal", "NORMALIZED_DELETED=$deletedTotal", "NORMALIZED_NET=$net") | Write-Output
  if ($net -ge 0) { throw "SLIM-01 failed: normalized production LOC is not strictly net-negative." }
}
finally {
  $OutputEncoding = $previousOutputEncoding
  [Console]::OutputEncoding = $previousConsoleEncoding
  if ($null -ne $baseTemp) { Remove-Item -LiteralPath $baseTemp.FullName -Force }
  if ($null -ne $reviewedTemp) { Remove-Item -LiteralPath $reviewedTemp.FullName -Force }
}
```
