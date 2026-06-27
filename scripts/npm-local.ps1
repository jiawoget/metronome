param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$nodeRoot = Join-Path $workspaceRoot ".tools\\node-v24.17.0-win-x64"
$corepackHome = Join-Path $workspaceRoot ".tools\\corepack"
$corepack = Join-Path $nodeRoot "corepack.cmd"

if (-not (Test-Path $corepack)) {
  throw "Local Node.js runtime is missing. Expected: $corepack"
}

New-Item -ItemType Directory -Force -Path $corepackHome | Out-Null

$env:COREPACK_HOME = $corepackHome
$env:PATH = "$nodeRoot;$env:PATH"

& $corepack "npm@11.17.0" @Args
exit $LASTEXITCODE
