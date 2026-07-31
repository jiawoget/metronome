---
schema_version: 1
open_count: 0
waived_count: 0
fixed_count: 1
total_count: 1
last_updated: 2026-07-31T15:45:42.401Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | deviation | .gitattributes |  | Generated Next environment declaration inherited root LF normalization so a successful Windows build no longer dirties the frozen candidate. | fixed |  | 2026-07-31T15:43:35.525Z | 2026-07-31T15:45:42.401Z |

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
  }
]
````
