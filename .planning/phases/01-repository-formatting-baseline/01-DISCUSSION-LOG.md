# Phase 1: Repository Formatting Baseline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30
**Phase:** 1-repository-formatting-baseline
**Areas discussed:** lifecycle reset, formatting scope, toolchain entrypoint, implementation history, enforcement, release boundary, agent runtime

---

## Lifecycle reset

| Option | Description | Selected |
|--------|-------------|----------|
| Repair the superseded R01 | Continue revising the repeatedly blocked lifecycle and its plans | |
| Import old R01 planning into a new branch | Reuse prior planning as current authority | |
| Deprecate old R01 and start a formatting milestone from current main | Quarantine old planning and create a fresh native lifecycle | ✓ |

**User's choice:** “废弃现有的R01，然后从改好的main重新来” and approval of the fresh formatting milestone.
**Notes:** Deprecated planning is not an input to current research, planning, execution, or evidence.

---

## Formatting scope

| Option | Description | Selected |
|--------|-------------|----------|
| Format only the initially identified files | Narrow cleanup of a few known mismatches | |
| Format source code only | Exclude tests, planning, scripts, and documentation | |
| Format every allowed supported repository text file | Include code, tests, config, scripts, active planning, current docs, and legacy docs | ✓ |

**User's choice:** “把当前所有文件（不光只是这三个旧文件）格式化正确”.
**Notes:** Binary, generated, dependency/output, and quarantined paths remain excluded and byte-untouched.

---

## Toolchain entrypoint

| Option | Description | Selected |
|--------|-------------|----------|
| Keep multiple Windows wrappers | Preserve repository-specific runtime entrypoints and fallbacks | |
| Add another formatter/controller command | Wrap Prettier with custom repository logic | |
| Use direct Node/npm/npx through user PATH | Keep only `format` and `format:check`, removing the fallback after proof | ✓ |

**User's choice:** “Windows找不到那么就在PATH里直接加上啊”.
**Notes:** Any PATH edit is one exact reversible append and must be proven from a newly launched shell before wrapper deletion.

---

## Implementation history

| Option | Description | Selected |
|--------|-------------|----------|
| Mix setup, formatting, and enforcement | One broad implementation diff | |
| Split the mechanical pass into many commits | Smaller but non-canonical formatting history | |
| Use exactly three implementation roles | Policy/tooling, one mechanical pass, then enforcement | ✓ |

**User's choice:** Lock the formatting implementation to three reviewable commits.
**Notes:** Native planning, SUMMARY, verification, review, and ship metadata do not count as implementation commits.

---

## Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Advisory formatting only | No fail-closed local or CI gate | |
| Enforce only in one environment | Local-only or CI-only drift detection | |
| Enforce before all existing gates locally and in Ubuntu CI | Same `format:check` precedes lint, typecheck, unit tests, and build | ✓ |

**User's choice:** A single formatter contract enforced in both environments.
**Notes:** Playwright and browser verification remain out of scope because product behavior is unchanged.

---

## Release boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Treat phase verification as release completion | Start R01 immediately after verifier success | |
| Preserve the old R01 as the next plan | Resume from deprecated lifecycle artifacts | |
| Require exact-final-head release exit | Ship, final-head CI/review, merge, sync clean main, then fresh R01 | ✓ |

**User's choice:** Fresh R01 only from the updated merged `main`.
**Notes:** PR and merge facts are outside Phase 1 requirements but remain mandatory before the milestone is reported complete.

---

## Agent runtime

| Option | Description | Selected |
|--------|-------------|----------|
| Use baked mixed models | Allow Luna, Terra, or tier defaults | |
| Use one effort level for every tier | Ignore native tier weight | |
| Use GPT-5.6 Sol with locked tier efforts | Light/standard xhigh; heavy ultra | ✓ |

**User's choice:** All agents use GPT-5.6 Sol; light and standard use Extra High, heavy uses Ultra.
**Notes:** Native resolution has been configured and verified for the installed agent catalog.

---

## the agent's Discretion

- Exact stable formatter/plugin versions and supported Tailwind v4 option syntax after official-source phase research.
- Exact safe CLI glob/ignore patterns that cover all approved files without consuming the quarantine.
- Exact tracked hook path and activation mechanics, while preserving direct npm use and the locked gate order.
- Exact evidence commands and implementation commit messages within the three fixed roles.

## Deferred Ideas

- Fresh R01 product/refactor planning after the formatting milestone's release exit.
- Product work, dormant capability seeds, and browser/product UAT.

---

*Phase: 01-repository-formatting-baseline*
*Discussion log generated: 2026-07-30*
