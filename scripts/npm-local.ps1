begin {
  $pipelineChunks = [System.Collections.Generic.List[string]]::new()
  $npmArgs = @($args)
}

process {
  if ($null -ne $_) {
    $pipelineChunks.Add([string]$_)
  }
}

end {
  $ErrorActionPreference = "Stop"

  if ($npmArgs.Count -gt 0 -and $npmArgs[0] -eq "--%") {
    $npmArgs = @($npmArgs | Select-Object -Skip 1)
  }

  if ($npmArgs.Count -eq 1 -and $npmArgs[0].Contains(" ")) {
    $parseErrors = $null
    $tokens = [System.Management.Automation.PSParser]::Tokenize($npmArgs[0], [ref]$parseErrors)
    $unsupportedTokens = @($tokens | Where-Object {
      $_.Type -notin @("Command", "CommandArgument", "Keyword", "Number", "String", "Variable") -and
      -not ($_.Type -eq "Operator" -and $_.Content -eq "--")
    })
    if ($parseErrors.Count -gt 0 -or $unsupportedTokens.Count -gt 0) {
      throw "Unable to safely parse stop-parsed npm arguments."
    }

    $npmArgs = @($tokens | Where-Object {
      $_.Type -in @("Command", "CommandArgument", "Keyword", "Number", "String", "Variable") -or
      ($_.Type -eq "Operator" -and $_.Content -eq "--")
    } | ForEach-Object {
      if ($_.Type -eq "Variable") { "`$$($_.Content)" } else { $_.Content }
    })
  }

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

  if ($pipelineChunks.Count -gt 0) {
    ($pipelineChunks -join [Environment]::NewLine) | & $corepack "npm@11.17.0" @npmArgs
  } else {
    & $corepack "npm@11.17.0" @npmArgs
  }

  exit $LASTEXITCODE
}
