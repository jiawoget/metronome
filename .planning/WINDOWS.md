---
schema_version: 1
open_count: 0
waived_count: 0
fixed_count: 2
total_count: 2
last_updated: 2026-08-01T05:53:05.945Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | deviation | .gitattributes |  | Generated Next environment declaration inherited root LF normalization so a successful Windows build no longer dirties the frozen candidate. | fixed |  | 2026-07-31T15:43:35.525Z | 2026-07-31T15:45:42.401Z |
| 2 | 02 | deviation | .planning/phases/02-release-assurance-workflow-closure/02-01-PLAN.md |  | Task 3 verification normalized native Phase 02 formatting and excluded the pre-executor Native STATE plan-preparation commit from the exact four-owner implementation range. | fixed |  | 2026-08-01T05:52:17.716Z | 2026-08-01T05:53:05.945Z |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "01",
    "file": ".gitattributes",
    "line": null,
    "description": "Generated Next environment declaration inherited root LF normalization so a successful Windows build no longer dirties the frozen candidate.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-07-31T15:43:35.525Z",
    "resolved_at": "2026-07-31T15:45:42.401Z"
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "02",
    "file": ".planning/phases/02-release-assurance-workflow-closure/02-01-PLAN.md",
    "line": null,
    "description": "Task 3 verification normalized native Phase 02 formatting and excluded the pre-executor Native STATE plan-preparation commit from the exact four-owner implementation range.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-01T05:52:17.716Z",
    "resolved_at": "2026-08-01T05:53:05.945Z"
  }
]
````
