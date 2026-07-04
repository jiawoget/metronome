# Pack F Final Verification And Status Closeout Plan

## Planning Status

Status: plan-only draft.

Branch: `codex/pack-f-final-verification-plan`

Starting point: clean `main` at PR #108 merge commit `c35a0a8f`.

Requested execution mode for the later verification/status PR: `gpt-5.5`,
extra-high reasoning, standard speed/no-fast path.

This plan PR must stay draft and unmerged. It must not edit product code, tests,
package manifests, lockfiles, dependencies, or `docs/v1/status.json`.

## Required Reads Completed

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md`
- `docs/v1/implementation-slices/plans/F7-boundary-hardening-viewer-closeout.md`
- `docs/v1/implementation-slices/plans/F7-3-final-scan-classification.md`
- `docs/v1/implementation-slices/rules/diagnostics-test-boundary.md`
- `docs/v1/implementation-slices/rules/external-library-first.md`

Additional focused evidence checked:

- `package.json` smoke script definition.
- F3-F6 plan verification command sections.
- Local merge history for Pack F implementation PRs.

## Current Status Snapshot

`docs/v1/status.json` currently records:

- `pack-f-audio-music-library-alignment`: `implementation_in_progress`
- `F1-library-first-rescan-plan`: `verified`
- `F2-external-library-first-guardrails`: `verified`
- `F3-tone-runtime-metronome-alignment`: `implementation_done`
- `F4-countdown-executor-unification`: `implementation_done`
- `F5-tonaljs-music-domain-policy`: `implementation_done`
- `F6-recording-waveform-analysis-alignment`: `implementation_done`
- `F7-boundary-hardening-viewer-closeout`: `implementation_done`

## Status Closeout Decision

The later final verification/status PR should update only
`docs/v1/status.json` if, and only if, the post-PR #108 verification gate below
passes on a fresh branch from `main`.

| Status entry | Later PR action | Condition |
| --- | --- | --- |
| `F3-tone-runtime-metronome-alignment` | Move `implementation_done` to `verified`. | Pack-level scans and full smoke pass after PR #108 merge. |
| `F4-countdown-executor-unification` | Move `implementation_done` to `verified`. | Same final gate; no unclassified timer/countdown hits. |
| `F5-tonaljs-music-domain-policy` | Move `implementation_done` to `verified`. | Same final gate; no unclassified music primitive hits. |
| `F6-recording-waveform-analysis-alignment` | Move `implementation_done` to `verified`. | Same final gate; decode, MediaRecorder, waveform, and recording hits remain approved boundaries. |
| `F7-boundary-hardening-viewer-closeout` | Move `implementation_done` to `verified`. | Same final gate; F7 final scans have no blocking hits. |
| `pack-f-audio-music-library-alignment` | Move `implementation_in_progress` to `verified`. | All F1-F7 slices are `verified` and no Pack F blocking scan or test failure remains. |

If any required command fails, any scan has a new unclassified or blocking hit,
or `status.json` cannot be parsed after editing, the later PR must not mark any
new Pack F status as `verified`.

## Evidence That Is Already Sufficient

Current merged evidence is sufficient to schedule a final status/verification
PR:

- `main` is clean at PR #108 merge commit `c35a0a8f`.
- F3-F7 implementation work is merged through PRs #96, #98, #100, #102, #104,
  #106, and #108.
- `F7-3-final-scan-classification.md` records a full Pack F closeout pass:
  targeted F7-3 unit tests, targeted E2E, lint, typecheck, full unit, build,
  full E2E, full smoke, and final source scans with no blocking hits.
- F7-3 explicitly says Pack F should remain `implementation_in_progress` until
  an independent verification/status gate marks the pack verified.

This evidence is not sufficient by itself to edit `status.json` in this plan PR
or to skip the final post-merge rerun. The final status PR needs fresh evidence
from the branch that performs the status update.

## Required Final Status PR

Create a new branch from latest `main`, not from this plan branch. Keep the repo
diff status-only unless a reviewer explicitly requires a separate evidence doc.

Allowed repo change:

```text
docs/v1/status.json
```

Expected `status.json` changes:

- F3, F4, F5, F6, and F7: `implementation_done` -> `verified`
- Pack F: `implementation_in_progress` -> `verified`
- F1 and F2 remain `verified`
- Existing `plan` pointers remain unchanged

Do not change product code, tests, package files, lockfiles, dependencies, or
plan PR files in the final status PR.

## Required Scans

Run these after the status edit on the final status branch. Attach the output or
a hit-by-hit classification to the PR.

```powershell
rg -n "@/infrastructure" src/components src/app src/hooks
```

Required result: no hits. Any hit is blocking unless a reviewer explicitly
approves a narrow exception before status closeout.

```powershell
rg -n "timeSignature\.split|noteNames|chord|scale|interval|setTimeout|decodeAudioData|MediaRecorder" src
```

Required result: every hit is either unchanged from
`F7-3-final-scan-classification.md` or newly classified as `resolved` or
`approved exception` with owner, reason, and closeout condition. Any
unclassified or blocking hit prevents Pack F verification.

```powershell
rg -n "eslint-disable|@ts-ignore|@ts-expect-error|TODO|FIXME" src tests
```

Required result: every hit is unchanged from the F7-3 classification or newly
classified as `resolved` or `approved exception`. Any new unexplained escape
hatch prevents Pack F verification.

## Required Verification Commands

Run from repo root after the `status.json` edit:

```powershell
git diff --check
Get-Content docs\v1\status.json -Raw | ConvertFrom-Json | Out-Null; Write-Output 'docs/v1/status.json parsed OK'
& .\scripts\npm-local.ps1 --% run smoke
```

`smoke` is the full verification command for the final status PR because
`package.json` defines it as:

```text
npm run lint && npm run typecheck && npm run test:unit && npm run build && npm run test:e2e
```

The final PR must report the smoke PASS plus the constituent lint, typecheck,
full unit, build, and full E2E PASS lines from the smoke output. Do not replace
smoke with only targeted tests.

If `smoke` fails, run the failing constituent command directly only to diagnose
the failure. Do not mark Pack F verified until the original smoke command passes
on the final status branch.

## Draft Plan PR Rule

This plan PR is a planning artifact and should remain draft/unmerged:

- Do not mark this PR ready for review as an implementation/status PR.
- Do not merge this branch before or after the final status PR.
- The final status PR should branch from `main`, cite this draft PR in its body,
  and carry its own verification evidence.
- After the final status PR merges, this plan PR can be closed unmerged or left
  as an archived draft, but it must not become the source of the status update.

## Failure Handling

If any final scan or smoke command fails:

- Leave F3-F7 and Pack F statuses unchanged.
- Record the exact failing command and first useful failure signal.
- If the failure is a real Pack F regression, open a focused implementation fix
  PR before any status closeout.
- If the failure is an environment blocker, record the blocker and get explicit
  owner approval for an equivalent verification gate before changing status.
